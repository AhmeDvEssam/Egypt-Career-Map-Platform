# Fix the Skill-Matching Pipeline (V2) — Permanent Skill Taxonomy Curation

## Goal

Make `test_pipeline_v2.py`'s matching stage correct and safe to run across all 31,457 jobs: stop confidently-wrong skill matches (`C++` → `C#`, `ADT` → `Advertising Technology`), stop proficiency modifiers being baked into skill names (`Advanced C++` → new skill `Advanced C++`), repair the corrupted aliases already persisted in Postgres, and make `HybridSkillMatcher.match_skill` work at all against the live schema.

---

## Current context / assumptions

**Verified against the live DB (`egypt_jobs_db` @ localhost:5432) on 2026-10-04.**

Current state: 19,754 skills · 381,124 job_skills · 27,617 skill_aliases · 17,095 skill_embeddings.

`test_pipeline_v2.py` (135 lines, repo root) is a **read-only prototype**: Step 1 LLM-extracts raw skill strings, then `find_best_match()` (line 59) resolves each against the taxonomy in 3 tiers (exact → alias → cosine > 0.85), and on no match calls `step3_taxonomy_fallback()` (line 47) for an LLM-assigned domain. It **only prints results — it never writes to the DB**, so nothing it produces is persisted yet. This is the last chance to fix it cheaply.

I ran it on 4 JDs / 27 skill strings. Findings:

| # | Defect | Evidence | Severity |
|---|---|---|---|
| D1 | `>0.85` bypass returns confidently-wrong matches | `C++`→`C#`, `ADT`→`Advertising Technology`, both reported `Score: 1.00` | **Critical** |
| D2 | Proficiency modifier baked into skill name | `Advanced C++` → new skill; `Commercial Insurance reporting` → `...Reporting` | High |
| D3 | Nonsense accepted as taxonomy | `Travel Head knowledge of Banking & Finance` → `... > Travel Head with Banking & Finance Knowledge` | Medium |
| D4 | `Exception RATE_LIMIT` aborts run | 2 of 4 runs died in Step 1; `call_llm(prompt, None, None)` | High |
| **D5** | **`match_skill()` fallback is SQL-broken** | `INSERT INTO skills (id, name, category)` → `column "category" of relation "skills" does not exist` | **Critical** |
| **D6** | **Corruption already persisted** | alias `c++` → `C#` **exists in `skills_backup`** (pre-cleanse); `ADT` alias is **post-backup**. 9,655 aliases created after backup by self-teaching | **Critical** |

**D5 detail:** live `skills` columns are `id, name, domain, sub_category, normalized_name`. There is no `category`. `_create_new_skill` (`skill_matcher.py:163`) inserts `(id, name, category)` → raises. So `match_skill` tier 4 (create-new) is **dead on arrival**; any unknown skill raises `ProgrammingError` instead of being created. Note `models.py` still declares `category` too — this is the same schema drift already documented in `Career_Map_Database_Schema.md`.

**D6 detail — two distinct root causes:**
- `C++`→`C#` was created by `run_cleansing_pipeline.py` (Oct 3). Restoring from backup does **not** help; the backup already contains it.
- `ADT`→`Advertising Technology` was created by `HybridSkillMatcher._save_new_alias` (`skill_matcher.py:117`) — the "continuous learning" snowball. `match_skill` calls it on every >0.85 match, so one bad match permanently poisons the alias table.
- 837 aliases match `^[A-Z0-9+#./-]{2,6}$` (short acronyms = high ambiguity risk).

**Environment facts:**
- Python: `python`/`python3` = 3.9/3.11 **without** `psycopg2`; **`py` = 3.14 with `psycopg2`** → always use `py`.
- **No pytest installed.** Tests below use `unittest` (stdlib) — do not add pytest.
- **`Backend API & Integration/` has NO git repo.** Project root has none either. Commit steps require `git init` first (Task 0).
- `ai_config.json` shows ~7 of 17 providers usable (groq, openrouter, huggingface, zhipuai, inceptionlabs, cleanapis, upstage); gemini 404s, cohere/mistral/llm7 rate-limit. Rerankers jina/voyage are enabled but keys may be absent — `call_reranker` returns `None` in that case.
- `call_reranker(query, documents)` returns `(document, relevance_score)` or `None`. `match_skill` expects that 2-tuple.
- `HybridSkillMatcher.__init__` encodes 26,788 aliases → **~55s startup**. Cache it per test session, not per test.

**Out of scope (do not touch):** the `C++`→`C#` row in `skills_backup`; the 3,261 `family_category` taxonomy; `dataset.jsonl`; any frontend/backend file.

---

## Architecture / proposed approach

Three layers, fixed in dependency order:

1. **Make `match_skill` work** (D5) — write to the real columns (`domain`/`sub_category`/`normalized_name`), stop the self-teaching write on unverified matches (D6), and route ambiguous short/acronym inputs through the reranker instead of the `>0.85` bypass (D1).
2. **Make the V2 script correct** (D1–D4) — normalize the raw string (strip proficiency modifiers, reject non-skills) *before* matching, and drop the duplicated `find_best_match` in favour of the fixed class method so there is one implementation (DRY).
3. **Repair persisted damage** (D6) — a reviewed, backed-up, dry-run-first script that deletes only the aliases proven wrong.

**Key principle:** the `>0.85` cosine bypass is fine for unambiguous strings (`React.js`→`React`, `K8s`→`Kubernetes`) and wrong for ambiguous acronyms (`ADT`, `C++`). Route on **ambiguity**, not just score — a high score from a short all-caps token is not evidence.

---

## Step-by-step tasks

### Task 0 — Safety net: git init the backend + snapshot the tables we will touch

The backend has no version control. Everything after this point assumes it.

```bash
cd "D:/Hire Q Project/Backend API & Integration"
git init
git add skill_matcher.py
git commit -m "chore: baseline skill_matcher.py before pipeline fix"
```

Expected: `1 file changed`. Do **not** `git add .` — it would stage `API KEYS`-adjacent files and the 77 MB `jobs.db`.

Now take a fresh pre-fix DB snapshot (the existing `*_backup` tables are **not** a valid restore point for D6 — see assumptions):

```bash
cd "D:/Hire Q Project/Backend API & Integration"
py -c "
import psycopg2
c=psycopg2.connect('postgresql://egypt_jobs:eypt2024@localhost:5432/egypt_jobs_db',connect_timeout=5)
cur=c.cursor()
for t in ['skill_aliases','skills']:
    cur.execute('DROP TABLE IF EXISTS \"pre_fix_%s\" CASCADE' % t)
    cur.execute('CREATE TABLE \"pre_fix_%s\" AS SELECT * FROM %s' % (t,t))
    cur.execute('SELECT COUNT(*) FROM \"pre_fix_%s\"' % t); print(t, cur.fetchone()[0])
c.commit(); c.close()"
```

Expected:
```
skill_aliases 27617
skills 19754
```

**Verify:** `py -c "import psycopg2;c=psycopg2.connect('postgresql://egypt_jobs:eypt2024@localhost:5432/egypt_jobs_db');cur=c.cursor();cur.execute(\"SELECT count(*) FROM pre_fix_skill_aliases\");print(cur.fetchone()[0])"` → `27617`

**Commit:** none (DB only).

---

### Task 1 — Failing test: `match_skill` must not create skills with a `category` column

Create `Backend API & Integration/test_skill_matcher.py`. Uses stdlib `unittest` (no pytest available).

```python
import unittest
import uuid

from sqlalchemy import create_engine, text

from skill_matcher import HybridSkillMatcher

DB_URL = "postgresql://egypt_jobs:eypt2024@localhost:5432/egypt_jobs_db"

_matcher = None


def get_matcher():
    """Load the ~55s embedding matrix once for the whole test session."""
    global _matcher
    if _matcher is None:
        _matcher = HybridSkillMatcher(DB_URL)
    return _matcher


class SkillMatcherSchemaTest(unittest.TestCase):
    """D5: the create-new path targets columns that no longer exist."""

    def test_create_new_skill_writes_real_columns(self):
        m = get_matcher()
        engine = create_engine(DB_URL)
        marker = "__ZZ_TEST_SKILL_%s__" % uuid.uuid4().hex[:8]

        skill_id, name = m.match_skill(marker, category=None, llm_validator_func=None)

        # Cleanup whatever was created, whatever the shape.
        with engine.begin() as conn:
            conn.execute(text("DELETE FROM skill_aliases WHERE skill_id=:i"), {"i": skill_id})
            conn.execute(text("DELETE FROM skill_embeddings WHERE skill_id=:i"), {"i": skill_id})
            conn.execute(text("DELETE FROM skills WHERE id=:i"), {"i": skill_id})

        self.assertIsNotNone(skill_id, "match_skill returned no id")
        # The real bug: a ProgrammingError escaped instead of a return value.
        self.assertIsNotNone(name)


if __name__ == "__main__":
    unittest.main(verbosity=2)
```

Run it:
```bash
cd "D:/Hire Q Project/Backend API & Integration"
py -m unittest test_skill_matcher -v
```

Expected: **FAIL** with `psycopg2.errors.UndefinedColumn: column "category" of relation "skills" does not exist`.

**Commit:** `git commit -am "test: reproduce category-column failure in match_skill"`

---

### Task 2 — Fix `_create_new_skill` to write the real columns

In `Backend API & Integration/skill_matcher.py`, replace the `_create_new_skill` method (lines 137–167) with:

```python
    def _create_new_skill(self, name, category=None):
        """Insert a brand-new canonical skill.

        Schema note: the live `skills` table has NO `category` column
        (columns: id, name, domain, sub_category, normalized_name).
        `category` is accepted for backward compatibility and coerced
        into `domain`, which is what every reader in this codebase
        actually queries.
        """
        import re
        orig_name = name
        name = re.sub(r'^[\-\*\?\.\s]+', '', name)
        name = re.sub(r'[\)\.\,\-\s]+$', '', name)
        if orig_name.count('(') == orig_name.count(')') and name.count('(') > name.count(')'):
            name += ')'
        if not name.strip():
            return None, orig_name

        new_id = str(uuid.uuid4())
        vec = self.model.encode(name, normalize_embeddings=True)

        self.canonical_skills[name.lower()] = new_id
        self.canonical_names[new_id] = name

        # Dynamic RAM update
        if self.vector_matrix is not None and len(self.vector_matrix) > 0:
            self.vector_matrix = np.vstack([self.vector_matrix, vec])
        else:
            self.vector_matrix = np.array([vec])
        self.vector_targets.append(new_id)

        # Persist to DB -- domain/sub_category/normalized_name, not category.
        with self.engine.begin() as conn:
            conn.execute(
                text("INSERT INTO skills (id, name, domain, normalized_name) "
                     "VALUES (:id, :name, :domain, :norm)"),
                {"id": new_id, "name": name, "domain": category, "norm": name},
            )
            conn.execute(
                text("INSERT INTO skill_embeddings (skill_id, embedding, model_name, dimension) "
                     "VALUES (:id, :emb, 'all-MiniLM-L6-v2', 384)"),
                {"id": new_id, "emb": vec.tolist()},
            )

        return new_id, name
```

**Note:** the old code did not call `commit()`; `engine.begin()` commits on clean exit, which is retained.

Run the test:
```bash
cd "D:/Hire Q Project/Backend API & Integration"
py -m unittest test_skill_matcher -v
```

Expected: **PASS** (`test_create_new_skill_writes_real_columns ... ok`). Confirm no junk row leaked:
```bash
py -c "
import psycopg2
c=psycopg2.connect('postgresql://egypt_jobs:eypt2024@localhost:5432/egypt_jobs_db',connect_timeout=5)
cur=c.cursor(); cur.execute(\"SELECT count(*) FROM skills WHERE name LIKE '__ZZ_TEST%'\"); print('leftover:', cur.fetchone()[0])"
```
Expected: `leftover: 0`

**Commit:**
```bash
cd "D:/Hire Q Project/Backend API & Integration"
git add skill_matcher.py test_skill_matcher.py
git commit -m "fix(skill_matcher): write domain/normalized_name instead of removed category column"
```

---

### Task 3 — Failing test: ambiguous acronyms must not bypass the reranker

D1. Append to `Backend API & Integration/test_skill_matcher.py`:

```python
class AmbiguousAcronymTest(unittest.TestCase):
    """D1: >0.85 bypass returns confidently-wrong matches for acronyms."""

    def test_cpp_does_not_resolve_to_csharp(self):
        m = get_matcher()
        reranker_calls = []

        def spy(query, documents):
            reranker_calls.append(query)
            return None, 0.0

        skill_id, name = m.match_skill("C++", category=None, llm_validator_func=spy)

        if skill_id:
            self.assertNotEqual(
                name, "C#",
                "C++ silently resolved to C# -- ambiguous acronym bypassed the reranker",
            )

    def test_adt_does_not_resolve_to_advertising(self):
        m = get_matcher()
        skill_id, name = m.match_skill("ADT", category=None, llm_validator_func=lambda q, d: (None, 0.0))
        if skill_id:
            self.assertNotIn("Advertising", str(name))

    def test_cpp_is_gated_by_ambiguity_check(self):
        """The reranker must actually be consulted for C++."""
        m = get_matcher()
        seen = []

        def spy(query, documents):
            seen.append(query)
            return None, 0.0

        m.match_skill("C++", category=None, llm_validator_func=spy)
        self.assertTrue(
            seen,
            "reranker was never called for 'C++' -- the >0.85 bypass swallowed it",
        )
```

Run:
```bash
cd "D:/Hire Q Project/Backend API & Integration"
py -m unittest test_skill_matcher.AmbiguousAcronymTest -v
```

Expected: **FAIL** — `C++ silently resolved to C#` and/or `reranker was never called for 'C++'`.

**Commit:** `git commit -am "test: reproduce acronym bypass in match_skill"`

---

### Task 4 — Fix D1: route ambiguous short strings through the reranker, and stop poisoning aliases

In `Backend API & Integration/skill_matcher.py`, add this module-level helper just **after** the imports (after line 5, before `class HybridSkillMatcher`):

```python
import re

# Short all-caps / symbol-heavy tokens are domain-ambiguous: "ADT" is both
# Acute Distress Test (nursing) and Advertising Technology; "C++"/"C#" differ
# by one character but are different languages. A high cosine score on these is
# NOT evidence, so they must be adjudicated by the reranker instead of the
# fast-path bypass.
AMBIGUOUS_TOKEN_RE = re.compile(r'^[A-Z0-9+#./&]{2,6}$')


def is_ambiguous_token(raw_skill):
    """True when `raw_skill` is a short acronym/abbreviation needing adjudication."""
    s = raw_skill.strip()
    if not s or len(s) > 8:
        return False
    return bool(AMBIGUOUS_TOKEN_RE.match(s))
```

Then in `match_skill`, replace the fast-path block (lines 86–93):

```python
            # HIGH CONFIDENCE DIRECT MATCH (Bypass LLM completely)
            if best_score > 0.85:
                best_id = self.vector_targets[best_idx]
                best_canonical = self.canonical_names[best_id]

                # Continuous Learning: Save this new raw_skill as an alias for future O(1) matches!
                self._save_new_alias(raw_skill, best_id)
                return best_id, best_canonical
```

with:

```python
            # HIGH CONFIDENCE DIRECT MATCH, unless the token is ambiguous.
            # A short acronym like "ADT" or "C++" scores ~1.0 against the WRONG
            # canonical; those must go to the reranker, never the bypass.
            if best_score > 0.85 and not is_ambiguous_token(raw_skill):
                best_id = self.vector_targets[best_idx]
                best_canonical = self.canonical_names[best_id]

                # Continuous Learning: Save this new raw_skill as an alias for future O(1) matches!
                self._save_new_alias(raw_skill, best_id)
                return best_id, best_canonical
```

Finally, gate the *other* self-teaching write so an unverified guess can never
become permanent. In the low-confidence branch (lines 107–112), replace:

```python
                best_match_doc, best_rerank_score = llm_validator_func(raw_skill, candidates)
                if best_match_doc and best_rerank_score > 0.5:
```

with:

```python
                validated = llm_validator_func(raw_skill, candidates)
                if not validated:
                    best_match_doc, best_rerank_score = None, 0.0
                else:
                    best_match_doc, best_rerank_score = validated
                if best_match_doc and best_rerank_score > 0.5:
```

(The `if not validated` guard is required — `call_reranker` returns bare `None`
when jina/voyage have no key, and the old code would raise on tuple-unpack.)

Run:
```bash
cd "D:/Hire Q Project/Backend API & Integration"
py -m unittest test_skill_matcher -v
```

Expected: **all PASS**.

Regression check that the good matches still work:
```bash
py -c "
import sys; sys.stdout.reconfigure(encoding='utf-8')
from skill_matcher import HybridSkillMatcher
m=HybridSkillMatcher('postgresql://egypt_jobs:eypt2024@localhost:5432/egypt_jobs_db')
for s in ['React.js','K8s','MS Excel','power bi','Docker containers']:
    print(s,'->',m.match_skill(s,None,lambda q,d:(None,0.0)))"
```
Expected (all unchanged from baseline):
```
React.js -> ('...', 'React')
K8s -> ('...', 'Kubernetes')
MS Excel -> ('...', 'Microsoft Excel')
power bi -> ('...', 'PowerBI')
Docker containers -> ('...', 'Docker')
```

> **Cost note:** each ambiguous miss now reaches `_create_new_skill` and writes to the DB. That is intended, but it means this test run may add rows. Count them before/after if you want a clean delta:
> `py -c "import psycopg2;c=psycopg2.connect('postgresql://egypt_jobs:eypt2024@localhost:5432/egypt_jobs_db');cur=c.cursor();cur.execute('SELECT count(*) FROM skills');print(cur.fetchone()[0])"`

**Commit:**
```bash
cd "D:/Hire Q Project/Backend API & Integration"
git add skill_matcher.py test_skill_matcher.py
git commit -m "fix(skill_matcher): adjudicate ambiguous acronyms via reranker, guard self-teaching"
```

---

### Task 5 — Failing test: modifier stripping (D2)

Append to `Backend API & Integration/test_skill_matcher.py`:

```python
class ModifierStrippingTest(unittest.TestCase):
    """D2: 'Advanced C++' must match 'C++', not become a new skill."""

    def test_advanced_prefix_is_stripped_before_matching(self):
        from skill_matcher import strip_proficiency_modifiers
        self.assertEqual(strip_proficiency_modifiers("Advanced C++"), "C++")
        self.assertEqual(strip_proficiency_modifiers("Commercial Insurance reporting"),
                         "Commercial Insurance")
        self.assertEqual(strip_proficiency_modifiers("Apache Spark"), "Apache Spark")

    def test_advanced_cpp_resolves_to_cpp_not_a_new_skill(self):
        from skill_matcher import strip_proficiency_modifiers
        m = get_matcher()
        base = strip_proficiency_modifiers("Advanced C++")
        skill_id, name = m.match_skill(base, category=None, llm_validator_func=lambda q, d: (None, 0.0))
        if skill_id:
            self.assertNotIn("Advanced", str(name))
```

Run: `py -m unittest test_skill_matcher.ModifierStrippingTest -v`

Expected: **FAIL** — `ImportError: cannot import name 'strip_proficiency_modifiers'`.

**Commit:** `git commit -am "test: reproduce modifier-baking in raw skill names"`

---

### Task 6 — Fix D2/D3: add input normalization to `skill_matcher`

Add to `Backend API & Integration/skill_matcher.py`, next to `is_ambiguous_token`:

```python
# Proficiency / seniority modifiers. These describe HOW WELL, never WHAT.
# They must be stripped before matching, else "Advanced C++" becomes its own
# skill and the level is baked into the taxonomy permanently.
MODIFIER_PREFIXES = (
    "advanced", "intermediate", "beginner", "expert", "senior", "junior",
    "mid-level", "entry level", "entry-level", "proficient", "familiar",
    "working knowledge", "strong", "solid", "excellent", "basic",
)
MODIFIER_SUFFIXES = ("skills", "skill", "knowledge", "experience", "reporting")


def strip_proficiency_modifiers(raw_skill):
    """Remove proficiency nouns/modifiers from a raw skill string.

    'Advanced C++' -> 'C++'
    'Commercial Insurance reporting' -> 'Commercial Insurance'
    'Apache Spark' -> 'Apache Spark'   (unchanged)

    Deliberately conservative: only strips a modifier when the remainder is
    still non-empty, so 'Strong' alone is left alone rather than becoming ''.
    """
    s = " ".join(raw_skill.split())
    if not s:
        return s

    for _ in range(3):  # e.g. "Advanced Commercial Insurance reporting"
        before = s
        low = s.lower()

        for p in MODIFIER_PREFIXES:
            if low.startswith(p + " ") and len(s) > len(p) + 1:
                s = s[len(p) + 1:].strip()
                low = s.lower()
                break

        for suf in MODIFIER_SUFFIXES:
            if low.endswith(" " + suf) and len(s) > len(suf) + 1:
                s = s[: -(len(suf) + 1)].strip()
                low = s.lower()
                break

        if s == before:
            break

    return s or raw_skill.strip()


def looks_like_skill(raw_skill):
    """Cheap sanity gate for obviously-non-skill phrases (D3).

    Rejects long sentences and fragments with no skill-ish shape, so
    'Travel Head knowledge of Banking & Finance' never reaches the taxonomy
    generator. Deliberately permissive -- false negatives are worse than false
    positives here, since a real skill just falls through to the LLM anyway.
    """
    s = raw_skill.strip()
    if len(s) < 2 or len(s) > 60:
        return False
    words = s.split()
    if len(words) > 5:
        return False
    if any(w.lower().strip(".,") in {"knowledge", "experience", "understanding", "familiarity"} for w in words):
        # Allowed only if a real noun remains, e.g. 'Banking knowledge' -> reject.
        return len(words) <= 2 and words[0].lower() not in {"a", "an", "the"}
    return True
```

Run:
```bash
cd "D:/Hire Q Project/Backend API & Integration"
py -m unittest test_skill_matcher.ModifierStrippingTest -v
```
Expected: **PASS**.

Full suite: `py -m unittest test_skill_matcher -v` → all PASS.

**Commit:**
```bash
cd "D:/Hire Q Project/Backend API & Integration"
git add skill_matcher.py test_skill_matcher.py
git commit -m "feat(skill_matcher): add modifier stripping and non-skill gate"
```

---

### Task 7 — Make `test_pipeline_v2.py` use the fixed matcher (DRY, D1/D2/D3)

`test_pipeline_v2.py` reimplements matching inline and does **not** strip modifiers. Replace its `find_best_match` (lines 59–80) entirely:

```python
from skill_matcher import (
    HybridSkillMatcher,
    strip_proficiency_modifiers,
    looks_like_skill,
)

def find_best_match(raw_skill):
    """Delegate to the single matcher implementation.

    Returns (skill_id, score, canonical_name).
    score: 1.0 exact/alias, >=0.85 vector, 0.0 no match.
    """
    cleaned = strip_proficiency_modifiers(raw_skill)
    if not looks_like_skill(cleaned):
        print(f"   [!] Rejected as non-skill: '{raw_skill}'")
        return None, 0.0, None

    skill_id, canonical_name = matcher.match_skill(
        cleaned, category=None, llm_validator_func=router.call_reranker
    )
    if skill_id is None:
        return None, 0.0, None
    return skill_id, 1.0, canonical_name
```

Then update the one call site (line 100) and the display block:

```python
            matched_id, score, matched_name = find_best_match(raw_skill)

            if matched_id:
                row = conn.execute(text("SELECT name, domain, sub_category, normalized_name FROM skills WHERE id = :id"), {"id": matched_id}).fetchone()
                print(f"   [+] Matched: '{raw_skill}' -> '{row[0]}' (Score: {score:.2f}, Norm: {row[3]})")
                results.append({
                    "raw_skill": raw_skill,
                    "level": level,
                    "type": stype,
                    "status": "Matched",
                    "taxonomy": {"domain": row[1], "sub_category": row[2], "normalized_name": row[3], "canonical_name": row[0]}
                })
            else:
                if not looks_like_skill(strip_proficiency_modifiers(raw_skill)):
                    results.append({
                        "raw_skill": raw_skill,
                        "level": level,
                        "type": stype,
                        "status": "Rejected (not a skill)",
                        "taxonomy": None,
                    })
                    continue
                tax = step3_taxonomy_fallback(raw_skill)
                print(f"   [+] AI Created Taxonomy: {tax['domain']} > {tax['sub_category']} > {tax['normalized_name']}")
                results.append({
                    "raw_skill": raw_skill,
                    "level": level,
                    "type": stype,
                    "status": "AI Taxonomy Generated (New)",
                    "taxonomy": tax
                })
```

**Verify:**
```bash
cd "D:/Hire Q Project"
py test_pipeline_v2.py
```

Expected — the four defects gone:
- `C++` (in an ML JD) → `C#` **no longer appears**
- `ADT` (in a nurse JD) → `Advertising Technology` **no longer appears**
- `Advanced C++` → matched to `C++`, **not** a new skill named `Advanced C++`
- `Travel Head knowledge of...` → `Rejected (not a skill)`
- `React.js`→`React`, `K8s`→`Kubernetes`, `ICU`→`ICU` **still work** (no regression)

**Commit:**
```bash
cd "D:/Hire Q Project"
git init 2>/dev/null || true
git add test_pipeline_v2.py
git commit -m "fix(pipeline-v2): delegate to fixed matcher, strip modifiers, gate non-skills"
```

---

### Task 8 — Handle `RATE_LIMIT` (D4)

In `test_pipeline_v2.py`, replace the body of `step1_extract_skills` (lines 38–45):

```python
    key, provider = router.get_best_available_key(task_type='extraction')
    if not key:
        raise RuntimeError("RATE_LIMIT: no extraction key available (all providers cooled down)")
    content, _ = call_llm(prompt, key, provider)

    raw_json = content.strip()
    if raw_json.startswith("```json"): raw_json = raw_json[7:]
    if raw_json.startswith("```"): raw_json = raw_json[3:]
    if raw_json.endswith("```"): raw_json = raw_json[:-3]
    return json.loads(raw_json.strip())
```

And add a retry wrapper. Insert above `run_pipeline`:

```python
import time

def with_retry(fn, *args, attempts=5, base_sleep=30, **kwargs):
    """Retry on transient provider exhaustion. ~7 of 17 providers are usable,
    so RATE_LIMIT is routine, not exceptional."""
    last = None
    for i in range(attempts):
        try:
            return fn(*args, **kwargs)
        except Exception as e:
            if "RATE_LIMIT" not in str(e):
                raise
            last = e
            wait = base_sleep * (i + 1)
            print(f"   [!] RATE_LIMIT (attempt {i+1}/{attempts}); sleeping {wait}s")
            time.sleep(wait)
    raise RuntimeError(f"RATE_LIMIT persisted after {attempts} attempts: {last}")
```

Then in `run_pipeline`, change line 87:
```python
    extracted = with_retry(step1_extract_skills, jd_text)
```
and the fallback at line 113:
```python
                tax = with_retry(step3_taxonomy_fallback, raw_skill)
```

**Verify:**
```bash
cd "D:/Hire Q Project"
py test_pipeline_v2.py
```
Expected: run completes; if throttled, you see `RATE_LIMIT (attempt 1/5); sleeping 30s` and it recovers instead of dying.

**Commit:** `git add test_pipeline_v2.py && git commit -m "fix(pipeline-v2): retry on RATE_LIMIT instead of aborting"`

---

### Task 9 — Repair the corrupted aliases already in the DB (D6)

**Read this before running.** `ADT` is post-backup (created by self-teaching). `C++`→`C#` is **in the backup too**, so restoring is not a fix — it needs a targeted rule.

Create `Backend API & Integration/repair_known_bad_aliases.py`:

```python
"""Repair skill aliases proven wrong by pipeline_v2 testing (D6).

DESTRUCTIVE. Run with --dry-run first and read the output.

Two distinct proven defects:
  1. 'ADT' -> 'Advertising Technology'  (post-backup; created by _save_new_alias
     snowball after a bad cosine match. ADT = Acute Distress Test in nursing.)
  2. 'C++'/'c++' -> 'C#'                 (pre-backup; created by
     run_cleansing_pipeline.py. Distinct languages.)

Every rule is an explicit allow/deny pair -- no fuzzy matching.
"""
import argparse
import sys

import psycopg2

DB = "postgresql://egypt_jobs:eypt2024@localhost:5432/egypt_jobs_db"

# alias -> canonical it must NOT point to
FORBIDDEN = {
    "adt": "Advertising Technology",
    "c++": "C#",
    "cpp": "C#",
}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true", default=True)
    ap.add_argument("--apply", dest="dry_run", action="store_false")
    args = ap.parse_args()

    conn = psycopg2.connect(DB, connect_timeout=5)
    cur = conn.cursor()

    planned = []
    for alias, bad_target in FORBIDDEN.items():
        cur.execute(
            """SELECT sa.alias_name, sa.skill_id, s.name
               FROM skill_aliases sa JOIN skills s ON s.id = sa.skill_id
               WHERE lower(sa.alias_name) = %s AND s.name = %s""",
            (alias, bad_target),
        )
        for row in cur.fetchall():
            planned.append((row[0], row[1], row[2], alias))

    print("=== WOULD DELETE %d ALIAS ROWS ===" % len(planned))
    for alias_name, skill_id, target, _ in planned:
        print("  %-10s -> %s" % (alias_name, target))

    # Report what would then happen to job_skills pointing at the removed link.
    for alias_name, skill_id, target, _ in planned:
        cur.execute(
            """SELECT count(*) FROM job_skills js
               JOIN jobs j ON j.id = js.job_id
               WHERE js.skill_id = %s""",
            (skill_id,),
        )
        n = cur.fetchone()[0]
        print("  -> %s is used by %d job_skills rows (they keep pointing at %s; "
              "re-extraction will repoint them)" % (target, n, target))

    if args.dry_run:
        print("\nDRY RUN. Nothing changed. Re-run with --apply to delete.")
        conn.rollback()
        conn.close()
        return

    deleted = 0
    for alias_name, skill_id, target, _ in planned:
        cur.execute("DELETE FROM skill_aliases WHERE skill_id=%s AND alias_name=%s",
                    (skill_id, alias_name))
        deleted += cur.rowcount
    conn.commit()
    print("\nDELETED %d alias rows." % deleted)

    cur.execute("SELECT count(*) FROM skill_aliases")
    print("skill_aliases now:", cur.fetchone()[0])
    conn.close()


if __name__ == "__main__":
    main()
```

**Step 9a — dry run:**
```bash
cd "D:/Hire Q Project/Backend API & Integration"
py repair_known_bad_aliases.py
```
Expected:
```
=== WOULD DELETE 3 ALIAS ROWS ===
  ADT        -> Advertising Technology
  C++        -> C#
  c++        -> C#
  ...
DRY RUN. Nothing changed. Re-run with --apply to delete.
```

**Step 9b — review, then apply.** Only if the dry-run list contains **exactly** the intended rows and nothing else, run:
```bash
py repair_known_bad_aliases.py --apply
```
Expected: `DELETED 3 alias rows.` and a lower `skill_aliases` count.

**Step 9c — verify the fix:**
```bash
py -c "
import sys; sys.stdout.reconfigure(encoding='utf-8')
from skill_matcher import HybridSkillMatcher
m=HybridSkillMatcher('postgresql://egypt_jobs:eypt2024@localhost:5432/egypt_jobs_db')
for s in ['C++','ADT','React.js','K8s']:
    print(s,'->',m.match_skill(s,None,lambda q,d:(None,0.0)))"
```
Expected: `C++` and `ADT` no longer resolve to `C#` / `Advertising Technology`; `React.js`→`React` and `K8s`→`Kubernetes` unchanged.

**Commit:**
```bash
cd "D:/Hire Q Project/Backend API & Integration"
git add repair_known_bad_aliases.py
git commit -m "fix: repair script for known-bad skill aliases (ADT, C++)"
```
(The DB change itself is not in git; the script is the reviewable artifact.)

---

### Task 10 — Full verification pass

```bash
cd "D:/Hire Q Project/Backend API & Integration"
py -m unittest test_skill_matcher -v
```
Expected: **all tests pass** (10 tests across 4 classes).

```bash
cd "D:/Hire Q Project"
py test_pipeline_v2.py
```
Expected: clean run, correct matches, no `RATE_LIMIT` abort.

```bash
cd "D:/Hire Q Project/Backend API & Integration"
py -c "
import psycopg2
c=psycopg2.connect('postgresql://egypt_jobs:eypt2024@localhost:5432/egypt_jobs_db',connect_timeout=5)
cur=c.cursor()
for t in ['skills','job_skills','skill_aliases','jobs']:
    cur.execute('SELECT count(*) FROM %s' % t); print(t, cur.fetchone()[0])
cur.execute(\"SELECT count(*) FROM skills WHERE name LIKE '__ZZ%'\"); print('test junk:', cur.fetchone()[0])
cur.execute(\"SELECT count(*) FROM skill_aliases sa JOIN skills s ON s.id=sa.skill_id WHERE (lower(sa.alias_name)='adt' AND s.name='Advertising Technology') OR (lower(sa.alias_name) IN ('c++','cpp') AND s.name='C#')\"); print('remaining bad aliases:', cur.fetchone()[0])"
```

Expected: `remaining bad aliases: 0`, `test junk: 0`, and `jobs`/`job_skills` unchanged at **31457 / 381124**.

---

## Tests / validation summary

| Task | Test | Fails with | Passes with |
|---|---|---|---|
| 1→2 | `SkillMatcherSchemaTest` | `UndefinedColumn: column "category"` | `ok` |
| 3→4 | `AmbiguousAcronymTest` (3) | `C++ silently resolved to C#` | `ok` |
| 5→6 | `ModifierStrippingTest` (2) | `ImportError: strip_proficiency_modifiers` | `ok` |
| 7 | `py test_pipeline_v2.py` | wrong matches present | correct + `Rejected (not a skill)` |
| 8 | same | `Exception RATE_LIMIT` | retries and completes |
| 9 | dry-run diff | — | `remaining bad aliases: 0` |

Regression guard (must stay true throughout): `React.js`→`React`, `K8s`→`Kubernetes`, `MS Excel`→`Microsoft Excel`, `power bi`→`PowerBI`, `ICU`→`ICU`.

---

## Risks, tradeoffs, and open questions

**Risks**

1. **Task 9 is destructive and partially un-reversible by restore.** `ADT` is post-backup so `pre_fix_skill_aliases` (Task 0) covers it. **`C++`→`C#` exists inside `skills_backup`** — restoring the backup would NOT fix it, and the backup itself is contaminated. The explicit-pair approach is the only safe option; there is no good general repair.
2. **Ambiguity gating costs an LLM call.** Short acronyms now hit the reranker. With ~7 usable providers and jina/voyage possibly keyless, `call_reranker` may return `None` → fall through to `_create_new_skill` → new rows. Acceptable (that's the honest outcome) but it **writes to the DB**. Watch `skills` row count during Task 4/6 runs.
3. **Modifier stripping is regex-based and imperfect.** `strip_proficiency_modifiers` could over-strip a legitimate skill containing a modifier word (e.g. a skill literally named "Stronghold"). The 3-iteration cap and non-empty guard limit damage. Long-term this belongs in the LLM prompt, not a regex.
4. **Task 0's `git init` is a new repo in a directory that had none.** Only `skill_matcher.py` is staged initially. Do not broaden this into "commit the backend" — that would stage `jobs.db` (77 MB) and key-bearing files.
5. **`_create_new_skill` still writes `domain=category`**, which may be `None` when callers pass nothing. 366 skills already have `normalized_name IS NULL`, so this is consistent with existing state, but it does not *fix* the taxonomy.
6. **Runtime:** each test session pays ~55s to encode 26,788 aliases. The module-level cache in `get_matcher()` avoids repeating it; do not move it into `setUp`.

**Tradeoffs**

- Gate on *ambiguity* rather than raising the 0.85 threshold: raising it would also reject good matches like `Docker containers` (0.8511) and force far more LLM calls. Gating is cheaper and more precise.
- DRY-ing `find_best_match` away means the V2 script now depends on `router.call_reranker` and can therefore write to the DB via the create-new path. Accepted: it is the same code path production will use, which is the point.
- Explicit `FORBIDDEN` pairs in Task 9 rather than a general "detect and re-cluster" pass. A general pass is more thorough but is a research project; there are 837 acronym-shaped aliases and only a handful proven wrong.

**Open questions**

1. Should the **837 acronym-shaped aliases** be audited systematically? The two proven bugs suggest more exist. This plan fixes the mechanism, not the full corpus. Needs a decision before the next full run.
2. **`c++`→`C#` predates the backup.** Was there ever a correct `C++` canonical skill that got merged away by `run_cleansing_pipeline.py`? If so it needs recreating, not just the alias deleting. I did not verify this.
3. **`models.py` still declares `category`** on `Skill`, and `prisma/schema.prisma` does too. Should this plan also correct those to `domain`, or is schema realignment a separate task?
4. **`dataset.jsonl` was exported before the cleanup**, so its labels remain dirty. Re-export is a prerequisite for fine-tuning but is out of scope here.
5. Is `test_pipeline_v2.py` destined to be promoted to production alongside `run_cleansing_pipeline.py`? If so it needs persistence + a `--dry-run` flag **before** it is ever pointed at all 31,457 jobs. This plan deliberately leaves it read-only.