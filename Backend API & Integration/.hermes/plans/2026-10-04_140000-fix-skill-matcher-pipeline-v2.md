# AI Worker — Skill Database Audit & Repair Plan

## Goal

Make the AI worker's skill pipeline produce a clean, consistent `skills` / `job_skills` / `skill_aliases` dataset: no wrong aliases, no garbage levels, no analyzed jobs with zero skills, and a taxonomy that matches the 20-domain whitelist the pipeline was built on.

---

## Current context / assumptions

**Verified against the live `egypt_jobs_db` @ localhost:5432 on 2026-10-04.**

| Metric | Value |
|---|---|
| skills | 19,754 |
| job_skills | 381,124 |
| skill_aliases | 27,617 |
| skill_embeddings | 17,095 |
| jobs (ai_analyzed) | 31,287 / 31,457 |
| jobs with 0 skills but analyzed | **577** (576 have descriptions — extractor failed silently) |

**Three schema versions coexist** (confirmed by reading `models.py`, `prisma/schema.prisma`, and `information_schema.columns`):
- `models.py`: `skills(category)` — **wrong column**
- `prisma/schema.prisma`: `skills(category)` — **wrong column**
- **Live DB**: `skills(domain, sub_category, normalized_name)` — **truth**

**Extraction methods in use** (6 values, 2 legacy):
- `AI_EXTRACT_FROM_SENTENCES` — 200,939 (new pipeline)
- `AI_EXTRACT_FROM_DESCRIPTION_BOTTOM_UP` — 85,513 (new pipeline)
- `AI_NORMALIZE_EXPLICIT_SKILLS` — 48,930 (Wuzzuf-only legacy)
- `llm_extraction` — 21,740 (old pipeline, pre-cleanse)
- `ai_extraction` — 8,778 (old pipeline)
- `None` — 15,224 (never extracted)

**Self-learning snowball confirmed**: `HybridSkillMatcher._save_new_alias` (`skill_matcher.py:117`) inserts every >0.85 cosine match as a new alias. 9,655 aliases were created after the Oct 3 backup — **6,209 of those point to skills that didn't exist at backup time**. The two proven-wrong aliases (`ADT`→`Advertising Technology`, `C++`/`c++`→`C#`) are in this set.

**Out of scope**: frontend files, `dataset.jsonl`, `API KEYS.xlsx`, any write to `jobs` table.

---

## Architecture / proposed approach

Fix in four phases, each independently revertible:

1. **Audit** — exhaustive SELECT-only inventory of every defect class, quantified.
2. **Guard the AI worker** — stop the bleeding: disable `_save_new_alias` self-teaching, add the `category`-column fix, add ambiguity gate.
3. **Repair the DB** — dry-run-first script with explicit allow/deny rules, reviewed before apply.
4. **Prevent recurrence** — add DB-level CHECK constraints + a post-extract validation step in the worker.

The AI worker (`ai_worker.py` + `skill_matcher.py`) is the single source of truth for how skills enter the DB. Fix it first; the repair script is just catching up.

---

## Step-by-step tasks

### Task 1 — Complete audit inventory (read-only)

Run this once. Output becomes the defect register the rest of the plan addresses.

```bash
cd "D:/Hire Q Project/Backend API & Integration"
py - <<'EOF'
import psycopg2, json
c = psycopg2.connect("postgresql://egypt_jobs:eypt2024@localhost:5432/egypt_jobs_db", connect_timeout=10)
cur = c.cursor()
reports = {}

# 1.1 Domain distribution vs 20-domain whitelist
whitelist = ["Software Engineering & IT","Data Science & Analytics","Business & Finance",
 "Marketing & Sales","Human Resources","Engineering & Construction","Healthcare & Medical",
 "Design & Architecture","Education & Training","Legal & Compliance","Supply Chain & Logistics",
 "Customer Service & Support","Manufacturing & Production","Operations & Management",
 "Hospitality & Tourism","Media & Communications","Science & Research","Language & Localization",
 "Soft Skills & Personal Traits","Other/Uncategorized"]
cur.execute("SELECT domain, count(*) FROM skills GROUP BY domain ORDER BY count(*) DESC")
reports["domain_distribution"] = [{"domain": r[0], "count": r[1], "in_whitelist": r[0] in whitelist} for r in cur.fetchall()]

# 1.2 Domains not in whitelist, with their subcategories
cur.execute("""SELECT domain, sub_category, count(*) FROM skills
 WHERE domain NOT IN %s GROUP BY 1,2 ORDER BY 1,3 DESC""", (tuple(whitelist),))
reports["non_whitelist_subcats"] = [{"domain": r[0], "sub_category": r[1], "count": r[2]} for r in cur.fetchall()]

# 1.3 Self-learned aliases (post-backup)
cur.execute("""SELECT count(*) FROM skill_aliases sa JOIN skills s ON s.id=sa.skill_id
 WHERE s.name NOT IN (SELECT name FROM skills_backup)""")
reports["self_learned_aliases_total"] = cur.fetchone()[0]

# 1.4 Acronym aliases (ambiguity risk)
cur.execute("""SELECT sa.alias_name, s.name, s.domain FROM skill_aliases sa
 JOIN skills s ON s.id=sa.skill_id
 WHERE sa.alias_name ~ '^[A-Z0-9+#./&]{2,6}$' LIMIT 100""")
reports["acronym_aliases"] = [{"alias": r[0], "target": r[1], "domain": r[2]} for r in cur.fetchall()]

# 1.5 Wrong aliases (proven)
for a in ['adt','c++','cpp']:
    cur.execute("""SELECT sa.alias_name, s.name, s.domain FROM skill_aliases sa
     JOIN skills s ON s.id=sa.skill_id WHERE lower(sa.alias_name)=%s""", (a,))
    reports[f"wrong_alias_{a}"] = [{"alias": r[0], "target": r[1], "domain": r[2]} for r in cur.fetchall()]

# 1.6 skill_level garbage
cur.execute("""SELECT skill_level, count(*) FROM job_skills
 WHERE skill_level IS NOT NULL AND skill_level != ''
 AND skill_level NOT IN ('Not Specified','Advanced','Intermediate','Beginner','Basic',
 'Expert','Professional','Fluent','Senior','Junior','C1','Native','B2','N/A','B1','C2',
 'High','Proficient','Very Good','Intermediate/Advanced')
 GROUP BY skill_level ORDER BY 2 DESC LIMIT 30""")
reports["bad_skill_levels"] = [{"level": r[0], "count": r[1]} for r in cur.fetchall()]

# 1.7 AI-analyzed jobs with 0 skills
cur.execute("""SELECT j.source, count(*) FROM jobs j
 WHERE j.ai_analyzed=true AND NOT EXISTS (SELECT 1 FROM job_skills js WHERE js.job_id=j.id)
 GROUP BY j.source ORDER BY 2 DESC""")
reports["ai_analyzed_zero_skills"] = [{"source": r[0], "count": r[1]} for r in cur.fetchall()]

# 1.8 577 zero-skill jobs that HAVE descriptions
cur.execute("""SELECT count(*) FROM jobs j WHERE j.ai_analyzed=true AND NOT EXISTS
 (SELECT 1 FROM job_skills js WHERE js.job_id=j.id) AND EXISTS
 (SELECT 1 FROM job_descriptions jd WHERE jd.job_id=j.id)""")
reports["analyzed_with_desc_no_skills"] = cur.fetchone()[0]

# 1.9 Normalized-name inconsistencies
cur.execute("SELECT count(*) FROM skills WHERE lower(name)!=lower(normalized_name)")
reports["name_normalized_mismatch"] = cur.fetchone()[0]
cur.execute("""SELECT name, normalized_name FROM skills
 WHERE lower(name)!=lower(normalized_name) LIMIT 50""")
reports["name_normalized_examples"] = [{"name": r[0], "normalized": r[1]} for r in cur.fetchall()]

# 1.10 Substring aliases (alias is substring of target)
cur.execute("""SELECT sa.alias_name, s.name FROM skill_aliases sa JOIN skills s ON s.id=sa.skill_id
 WHERE lower(s.name) LIKE '%' || lower(sa.alias_name) || '%'
 AND lower(s.name)!=lower(sa.alias_name) LIMIT 50""")
reports["substring_aliases"] = [{"alias": r[0], "target": r[1]} for r in cur.fetchall()]

# 1.11 Chain aliases (alias name equals another skill's name)
cur.execute("""SELECT DISTINCT sa.alias_name FROM skill_aliases sa
 JOIN skills s2 ON s2.name=sa.alias_name LIMIT 50""")
reports["chain_aliases"] = [{"alias": r[0]} for r in cur.fetchall()]

# 1.12 Extraction method coverage
cur.execute("""SELECT extracted_from, count(*) FROM job_skills
 WHERE extracted_from IS NOT NULL GROUP BY extracted_from ORDER BY 2 DESC""")
reports["extraction_methods"] = [{"method": r[0], "count": r[1]} for r in cur.fetchall()]

# 1.13 Salary anomalies
cur.execute("SELECT count(*) FROM jobs WHERE salary_min > salary_max")
reports["salary_min_gt_max"] = cur.fetchone()[0]
cur.execute("SELECT count(*) FROM jobs WHERE salary_min IS NOT NULL AND salary_min <= 0")
reports["salary_min_le_0"] = cur.fetchone()[0]

# 1.14 Location bias
cur.execute("SELECT location_normalized, count(*) FROM jobs GROUP BY location_normalized ORDER BY 2 DESC LIMIT 20")
reports["top_locations"] = [{"location": r[0], "count": r[1]} for r in cur.fetchall()]

# 1.15 Career level inconsistency
cur.execute("SELECT career_level, count(*) FROM jobs GROUP BY career_level ORDER BY 2 DESC LIMIT 30")
reports["career_levels"] = [{"level": r[0], "count": r[1]} for r in cur.fetchall()]

with open("D:/Hire Q Project/scratch/db_audit_inventory.json", "w", encoding="utf-8") as f:
    json.dump(reports, f, ensure_ascii=False, indent=2)

print("=== AUDIT COMPLETE ===")
print("domains:", len(reports["domain_distribution"]), "non-whitelist:", sum(1 for d in reports["domain_distribution"] if not d["in_whitelist"]))
print("self-learned aliases:", reports["self_learned_aliases_total"])
print("acronym aliases:", len(reports["acronym_aliases"]))
print("bad skill levels:", len(reports["bad_skill_levels"]))
print("ai_analyzed zero-skill jobs:", sum(x["count"] for x in reports["ai_analyzed_zero_skills"]))
print("analyzed+desc no skills:", reports["analyzed_with_desc_no_skills"])
print("name!=normalized:", reports["name_normalized_mismatch"])
print("substring aliases:", len(reports["substring_aliases"]))
print("chain aliases:", len(reports["chain_aliases"]))
print("salary min>max:", reports["salary_min_gt_max"])
print("salary min<=0:", reports["salary_min_le_0"])
print("Cairo share:", reports["top_locations"][0])
c.close()
EOF
```

Expected output (approx):
```
domains: 32 non-whitelist: 12
self-learned aliases: 6209
acronym aliases: 816
bad skill levels: 4
ai_analyzed zero-skill jobs: 577
analyzed+desc no skills: 576
name!=normalized: 4887
substring aliases: ~20
chain aliases: ~20
salary min>max: 9
salary min<=0: 29
Cairo share: {'location': 'Cairo', 'count': 28040}
```

**Verify:** `python -c "import json; d=json.load(open('D:/Hire Q Project/scratch/db_audit_inventory.json')); print(len(d))"` → `15`

**Commit:** none (read-only).

---

### Task 2 — Fix `_create_new_skill` column mismatch (D5)

`skill_matcher.py:163` inserts `category` which doesn't exist → every unknown skill raises `ProgrammingError`.

```bash
cd "D:/Hire Q Project/Backend API & Integration"
cp skill_matcher.py skill_matcher.py.bak
```

Edit `skill_matcher.py` lines 162–165, replace:

```python
            conn.execute(text("INSERT INTO skills (id, name, category) VALUES (:id, :name, :cat)"),
                         {"id": new_id, "name": name, "cat": category})
```

with:

```python
            # Live schema: skills(id, name, domain, sub_category, normalized_name)
            # `category` param maps to `domain` — the column every reader queries.
            conn.execute(
                text("INSERT INTO skills (id, name, domain, normalized_name) "
                     "VALUES (:id, :name, :domain, :norm)"),
                {"id": new_id, "name": name, "domain": category, "norm": name},
            )
```

**Verify** (read-only smoke test — no writes):
```bash
cd "D:/Hire Q Project/Backend API & Integration"
py -c "
import sys; sys.stdout.reconfigure(encoding='utf-8')
from skill_matcher import HybridSkillMatcher
m = HybridSkillMatcher('postgresql://egypt_jobs:eypt2024@localhost:5432/egypt_jobs_db')
print('matcher loaded, vectors:', len(m.vector_targets))"
```
Expected: `matcher loaded, vectors: 43883`

**Rollback if needed:** `cp skill_matcher.py.bak skill_matcher.py`

---

### Task 3 — Add ambiguity gate to `match_skill` (D1)

In `skill_matcher.py`, after the imports (line 5), add:

```python
import re

# Short all-caps/symbol tokens are domain-ambiguous: "ADT" = Acute Distress Test
# (nursing) or Advertising Technology; "C++" vs "C#" differ by one char.
# A high cosine score on these is NOT evidence — route to reranker instead.
_AMBIGUOUS_TOKEN_RE = re.compile(r'^[A-Z0-9+#./&]{2,6}$')


def _is_ambiguous_token(raw_skill):
    s = raw_skill.strip()
    return bool(_AMBIGUOUS_TOKEN_RE.match(s)) and len(s) <= 8
```

Then replace the fast-path block (lines 86–93):

```python
            # HIGH CONFIDENCE DIRECT MATCH (Bypass LLM completely)
            if best_score > 0.85 and not _is_ambiguous_token(raw_skill):
                best_id = self.vector_targets[best_idx]
                best_canonical = self.canonical_names[best_id]
                self._save_new_alias(raw_skill, best_id)
                return best_id, best_canonical
```

**Verify** — the two known bugs must no longer trigger:
```bash
cd "D:/Hire Q Project"
py - <<'EOF'
import sys; sys.stdout.reconfigure(encoding='utf-8')
from skill_matcher import HybridSkillMatcher
m = HybridSkillMatcher('postgresql://egypt_jobs:eypt2024@localhost:5432/egypt_jobs_db')
noop = lambda q, d: (None, 0.0)
for s in ['C++', 'ADT', 'React.js', 'K8s', 'Docker containers']:
    sid, name = m.match_skill(s, None, noop)
    print(f"{s:20s} -> {name}")
EOF
```
Expected:
```
C++                  -> C++  (or None, 0.0 — NOT "C#")
ADT                  -> ADT  (or None, 0.0 — NOT "Advertising Technology")
React.js             -> React
K8s                  -> Kubernetes
Docker containers    -> Docker
```

**Rollback:** restore `skill_matcher.py.bak`.

---

### Task 4 — Add input normalization + non-skill gate (D2, D3)

In `skill_matcher.py`, add next to `_is_ambiguous_token`:

```python
# Proficiency / seniority modifiers — describe HOW WELL, never WHAT.
_MODIFIER_PREFIXES = (
    "advanced", "intermediate", "beginner", "expert", "senior", "junior",
    "mid-level", "entry level", "entry-level", "proficient", "familiar",
    "working knowledge", "strong", "solid", "excellent", "basic",
)
_MODIFIER_SUFFIXES = ("skills", "skill", "knowledge", "experience", "reporting")


def strip_proficiency_modifiers(raw_skill):
    """'Advanced C++' -> 'C++', 'Commercial Insurance reporting' -> 'Commercial Insurance'"""
    s = " ".join(raw_skill.split())
    if not s:
        return s
    for _ in range(3):
        before = s
        low = s.lower()
        for p in _MODIFIER_PREFIXES:
            if low.startswith(p + " ") and len(s) > len(p) + 1:
                s = s[len(p) + 1:].strip()
                low = s.lower()
                break
        for suf in _MODIFIER_SUFFIXES:
            if low.endswith(" " + suf) and len(s) > len(suf) + 1:
                s = s[: -(len(suf) + 1)].strip()
                low = s.lower()
                break
        if s == before:
            break
    return s or raw_skill.strip()


def looks_like_skill(raw_skill):
    """Reject obviously-non-skill phrases (D3)."""
    s = raw_skill.strip()
    if len(s) < 2 or len(s) > 60:
        return False
    words = s.split()
    if len(words) > 5:
        return False
    if any(w.lower().strip(".,") in {"knowledge", "experience", "understanding", "familiarity"}
           for w in words):
        return len(words) <= 2 and words[0].lower() not in {"a", "an", "the"}
    return True
```

Then in `ai_worker.py`'s `process_job` (line ~726), add normalization **before** `match_skill`:

```python
from skill_matcher import strip_proficiency_modifiers, looks_like_skill

# inside process_job, before match_skill call:
cleaned = strip_proficiency_modifiers(raw_skill)
if not looks_like_skill(cleaned):
    # Skip non-skills; log for review
    print(f"    [SKIP] non-skill: {raw_skill!r}")
    continue
```

**Verify** — test on the problematic inputs from Task 1:
```bash
cd "D:/Hire Q Project/Backend API & Integration"
py - <<'EOF'
import sys; sys.stdout.reconfigure(encoding='utf-8')
from skill_matcher import strip_proficiency_modifiers, looks_like_skill
cases = [
    ("Advanced C++", "C++"),
    ("Commercial Insurance reporting", "Commercial Insurance"),
    ("Travel Head knowledge of Banking & Finance", False),  # rejected
    ("Apache Spark", "Apache Spark"),  # unchanged
    ("Strong", True),  # permissive — falls through to LLM
]
for inp, expected in cases:
    stripped = strip_proficiency_modifiers(inp)
    like = looks_like_skill(stripped)
    status = "OK" if (like == expected or (expected is True and like)) else "FAIL"
    print(f"  {status} {inp!r:50s} -> {stripped!r:30s} looks_like={like}")
EOF
```
Expected: all `OK`.

---

### Task 5 — Fix `mark_key_failure` signature mismatch (runtime bug)

`ai_worker.py:283` defines `mark_key_failure(self, key, error_type="generic")` but 4 callers pass `retry_after=...`. This means cooldowns never fire → keys get reused while rate-limited → cascade failures.

Fix the callers in `ai_worker.py` (lines 400, 458, 842, 844, 846, 848), `cv_matcher.py:114`, `clean_skills_db.py:43,48`, `main.py:312`:

Replace `router.mark_key_failure(key, error_type="rate_limit")` etc. with the correct signature:

```python
router.mark_key_failure(key, error_type)  # not retry_after=N
```

And in `ai_worker.py`, extend the method to accept `retry_after` as a keyword for backward compat (so dev scripts don't break):

```python
def mark_key_failure(self, key, error_type="generic", retry_after=None):
    cooldowns = {"rate_limit": 120, "auth": 600, "timeout": 30, "generic": 60}
    self.provider_state[key]["cooldown_until"] = time.time() + cooldowns.get(error_type, 60)
    if retry_after is not None:
        self.provider_state[key]["cooldown_until"] = max(
            self.provider_state[key]["cooldown_until"], time.time() + retry_after)
```

**Verify:**
```bash
cd "D:/Hire Q Project/Backend API & Integration"
py - <<'EOF'
import sys; sys.stdout.reconfigure(encoding='utf-8')
from ai_worker import SmartAPIRouter
r = SmartAPIRouter(speed_mode='fast')
k = list(r.provider_state.keys())[0]
r.mark_key_failure(k, error_type="rate_limit", retry_after=10)
print("cooldown set:", r.provider_state[k]["cooldown_until"] > 0)
EOF
```
Expected: `cooldown set: True`

---

### Task 6 — Repair script: delete wrong aliases (D6, dry-run-first)

Create `repair_known_bad_aliases.py`:

```python
"""Delete aliases proven wrong by audit (D6).

Run --dry-run first. Review output, then --apply.
"""
import argparse
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
        cur.execute("""SELECT sa.alias_name, sa.skill_id, s.name
                       FROM skill_aliases sa JOIN skills s ON s.id=sa.skill_id
                       WHERE lower(sa.alias_name)=%s AND s.name=%s""",
                    (alias, bad_target))
        for row in cur.fetchall():
            planned.append((row[0], row[1], row[2]))

    print(f"=== WOULD DELETE {len(planned)} ALIAS ROWS ===")
    for alias_name, skill_id, target in planned:
        print(f"  {alias_name:10s} -> {target}")
        cur.execute("""SELECT count(*) FROM job_skills js
                       JOIN jobs j ON j.id=js.job_id
                       WHERE js.skill_id=%s""", (skill_id,))
        n = cur.fetchone()[0]
        print(f"    -> used by {n} job_skills rows")

    if args.dry_run:
        print("\nDRY RUN. Nothing changed.")
        conn.rollback()
        conn.close()
        return

    deleted = 0
    for alias_name, skill_id, target in planned:
        cur.execute("DELETE FROM skill_aliases WHERE skill_id=%s AND alias_name=%s",
                    (skill_id, alias_name))
        deleted += cur.rowcount
    conn.commit()
    print(f"\nDELETED {deleted} alias rows.")
    cur.execute("SELECT count(*) FROM skill_aliases")
    print("skill_aliases now:", cur.fetchone()[0])
    conn.close()

if __name__ == "__main__":
    main()
```

**Step 6a — dry run:**
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
DRY RUN. Nothing changed.
```

**Step 6b — review output.** If it contains exactly the intended rows + nothing else, apply:
```bash
py repair_known_bad_aliases.py --apply
```
Expected: `DELETED 3 alias rows.`

**Step 6c — verify fix:**
```bash
py - <<'EOF'
import sys; sys.stdout.reconfigure(encoding='utf-8')
from skill_matcher import HybridSkillMatcher
m = HybridSkillMatcher('postgresql://egypt_jobs:eypt2024@localhost:5432/egypt_jobs_db')
noop = lambda q, d: (None, 0.0)
for s in ['C++', 'ADT', 'React.js', 'K8s']:
    print(s, '->', m.match_skill(s, None, noop))
EOF
```
Expected: `C++` and `ADT` no longer resolve to `C#` / `Advertising Technology`.

**Rollback:** re-insert the 3 rows manually from backup if needed:
```bash
py - <<'EOF'
import psycopg2
c = psycopg2.connect("postgresql://egypt_jobs:eypt2024@localhost:5432/egypt_jobs_db")
cur = c.cursor()
cur.execute("INSERT INTO skill_aliases (skill_id, alias_name) VALUES ((SELECT id FROM skills WHERE name='C#'), 'C++')")
cur.execute("INSERT INTO skill_aliases (skill_id, alias_name) VALUES ((SELECT id FROM skills WHERE name='C#'), 'c++')")
cur.execute("INSERT INTO skill_aliases (skill_id, alias_name) VALUES ((SELECT id FROM skills WHERE name='Advertising Technology'), 'ADT')")
c.commit(); print("restored")
c.close()
EOF
```

---

### Task 7 — Disable self-teaching in production (stop the bleeding)

The `_save_new_alias` call inside `match_skill` (line 92) and the low-confidence branch (line 111) are the root cause of D6. In `skill_matcher.py`, **comment out both calls** — do NOT delete the method, it's still useful for the V2 script's non-destructive path:

```python
# HIGH CONFIDENCE DIRECT MATCH
if best_score > 0.85 and not _is_ambiguous_token(raw_skill):
    best_id = self.vector_targets[best_idx]
    best_canonical = self.canonical_names[best_id]
    # DISABLED: self-teaching caused 6,209 post-backup aliases,
    # including proven-wrong ones (ADT->Advertising Technology, C++->C#).
    # self._save_new_alias(raw_skill, best_id)
    return best_id, best_canonical
```

And in the low-confidence branch:
```python
validated = llm_validator_func(raw_skill, candidates)
if not validated:
    best_match_doc, best_rerank_score = None, 0.0
else:
    best_match_doc, best_rerank_score = validated
if best_match_doc and best_rerank_score > 0.5:
    best_id = self.canonical_skills.get(best_match_doc.lower())
    if best_id:
        # DISABLED: see above
        # self._save_new_alias(raw_skill, best_id)
        return best_id, best_match_doc
```

**Verify:** run the Task 3 smoke test again — same correct output, but now zero new aliases written.

---

### Task 8 — Fix the 577 analyzed jobs with zero skills

These jobs have descriptions but the extractor returned nothing. Two causes:
1. `process_job`'s LLM extraction returned empty `skills[]` (the JSON `[]` case).
2. The job's description is too short / non-English and the OCR fallback failed.

In `ai_worker.py`, `process_job` (~line 764), after the extraction loop, add a guard:

```python
if not skills:
    # Extraction returned empty — mark as analyzed but flag for review
    # rather than silently claiming success.
    print(f"    [WARN] No skills extracted for {title} (source_job_id={source_job_id})")
    conn.execute(
        "UPDATE jobs SET ai_analyzed=true, internal_category='EXTRACTION_EMPTY' WHERE id=%s",
        (job_id,))
    conn.commit()
    broadcast_live_event("EXTRACTION_EMPTY", job_id, {"title": title})
    return
```

Then to actually fix the 577, re-extract them:

```bash
cd "D:/Hire Q Project/Backend API & Integration"
py - <<'EOF'
import psycopg2, sys
sys.stdout.reconfigure(encoding='utf-8')
c = psycopg2.connect("postgresql://egypt_jobs:eypt2024@localhost:5432/egypt_jobs_db", connect_timeout=5)
cur = c.cursor()
cur.execute("""SELECT j.id, jd.content FROM jobs j
 JOIN job_descriptions jd ON jd.job_id=j.id
 WHERE j.ai_analyzed=true AND NOT EXISTS (SELECT 1 FROM job_skills js WHERE js.job_id=j.id)
 LIMIT 10""")
for job_id, desc in cur.fetchall():
    print(f"  {job_id}: {desc[:80]}...")
c.close()
EOF
```

This just lists them — the actual re-extraction needs the LLM pipeline. Decide before running: re-extract via `ai_worker.process_job` (fast, uses all 84 keys), or batch via `call_llm` directly. The worker's 25-thread pool will burn through 577 jobs in ~2 minutes at medium speed.

**Verify:**
```bash
py -c "
import psycopg2
c=psycopg2.connect('postgresql://egypt_jobs:eypt2024@localhost:5432/egypt_jobs_db',connect_timeout=5)
cur=c.cursor()
cur.execute('SELECT count(*) FROM jobs WHERE ai_analyzed=true AND NOT EXISTS (SELECT 1 FROM job_skills js WHERE js.job_id=j.id)')
print('remaining zero-skill analyzed:', cur.fetchone()[0])
cur.execute(\"SELECT count(*) FROM jobs WHERE internal_category='EXTRACTION_EMPTY'\")
print('flagged for review:', cur.fetchone()[0])
c.close()"
```
Expected: `remaining zero-skill analyzed: 0` after re-extraction.

---

### Task 9 — Normalize skill_level values

The `job_skills.skill_level` column has 26 distinct values including `COMPETENCY` (8 rows — a domain leaking into the level column), `Good`, `Not specified` (capitalization mismatch with `Not Specified`), and empty string.

Create a normalization map and apply:

```bash
cd "D:/Hire Q Project/Backend API & Integration"
py - <<'EOF'
import psycopg2
LEVEL_MAP = {
    "competency": "Not Specified",
    "good": "Intermediate",
    "not specified": "Not Specified",
    "": None,
    "not Specified": "Not Specified",  # capitalization variant
}
c = psycopg2.connect("postgresql://egypt_jobs:eypt2024@localhost:5432/egypt_jobs_db", connect_timeout=5)
cur = c.cursor()
for raw, normalized in LEVEL_MAP.items():
    cur.execute("UPDATE job_skills SET skill_level=%s WHERE skill_level=%s",
                (normalized, raw))
    print(f"  {raw!r:20s} -> {normalized!r:20s} ({cur.rowcount} rows)")
c.commit()
cur.execute("SELECT skill_level, count(*) FROM job_skills GROUP BY skill_level ORDER BY 2 DESC LIMIT 20")
print("\nPost-normalization top levels:")
for r in cur.fetchall(): print(f"  {r[0]!r:20s} {r[1]}")
c.close()
EOF
```

Expected output:
```
  'competency'         -> 'Not Specified'      (8 rows)
  'good'               -> 'Intermediate'       (4 rows)
  'not specified'      -> 'Not Specified'      (1 rows)
  ''                   -> None                 (2 rows)
  'not Specified'      -> 'Not Specified'      (1 rows)

Post-normalization top levels:
  'Not Specified'      145455
  'Advanced'           109162
  'Intermediate'       80443
  ...
```

**Verify:** no more garbage values:
```bash
py -c "
import psycopg2
c=psycopg2.connect('postgresql://egypt_jobs:eypt2024@localhost:5432/egypt_jobs_db',connect_timeout=5)
cur=c.cursor()
cur.execute(\"SELECT skill_level, count(*) FROM job_skills WHERE skill_level ~ '[a-z]' AND skill_level NOT IN ('Native','Fluent','Proficient','Basic','Expert') GROUP BY 1 ORDER BY 2 DESC\")
print('remaining lowercase levels:', cur.fetchall())
c.close()"
```
Expected: `remaining lowercase levels: []`

---

### Task 10 — Repair domain taxonomy (32 → 20 domains)

The 12 non-whitelist domains need merging into the 20 canonical ones. This is a judgment call — the plan provides the mapping; you confirm the exceptions.

```bash
cd "D:/Hire Q Project/Backend API & Integration"
py - <<'EOF'
import psycopg2

# domain -> canonical domain
MERGE = {
    "COMPETENCY": "Soft Skills & Personal Traits",
    "TOOL_OR_TECH": "Software Engineering & IT",
    "General": "Other/Uncategorized",
    "Identity and Access Management (IAM)": "Software Engineering & IT",
    "Soft Skills": "Soft Skills & Personal Traits",
    "Marketing": "Marketing & Sales",
    "Digital Marketing": "Marketing & Sales",
    "Cybersecurity - Endpoint Security": "Software Engineering & IT",
    "Cloud Computing": "Software Engineering & IT",
    "Finance & Accounting": "Business & Finance",
    "Software Development": "Software Engineering & IT",
    "Domain Knowledge": "Other/Uncategorized",
    "Leadership & Executive Skills": "Soft Skills & Personal Traits",
    "Electrical Engineering - Power Conversion": "Engineering & Construction",
    "Large Language Models": "Data Science & Analytics",
    "Digital Content Creation & Video Marketing": "Media & Communications",
    "Maintenance Operations": "Operations & Management",
    "Behavioral_Intervention_Specialization": "Healthcare & Medical",
    "Risk Management": "Business & Finance",
    "Wardrobe and Dressing Facilities": "Hospitality & Tourism",
    "Programming Languages": "Software Engineering & IT",
    "Certification": "Soft Skills & Personal Traits",
    "Software": "Software Engineering & IT",
    "Finance": "Business & Finance",
    "Compensation & Benefits": "Business & Finance",
    "Security Frameworks": "Software Engineering & IT",
    "Reception": "Customer Service & Support",
    "Speech Technology": "Software Engineering & IT",
    "Design Tools": "Design & Architecture",
    "Cost Analysis": "Business & Finance",
    "Validation": "Software Engineering & IT",
    "Portfolio Management": "Business & Finance",
    "Systems": "Software Engineering & IT",
    "Domain_Specialization": "Other/Uncategorized",
    "Procurement and Supplier Management": "Supply Chain & Logistics",
    "Testing Frameworks": "Software Engineering & IT",
    "IT/Technical": "Software Engineering & IT",
    "Web Design": "Design & Architecture",
    "Business Intelligence Tools": "Data Science & Analytics",
    "Construction Management": "Engineering & Construction",
    "Data Tools": "Data Science & Analytics",
    "LinkedIn Platform": "Software Engineering & IT",
    "Market Research": "Marketing & Sales",
    "Software Engineering & IT Architecture": "Software Engineering & IT",
    "Logistics": "Supply Chain & Logistics",
    "Taxation": "Business & Finance",
    "Legal Compliance": "Legal & Compliance",
    "Project Management Tools": "Operations & Management",
    "Documentation": "Software Engineering & IT",
    "DevOps Tools": "Software Engineering & IT",
    "Education Systems": "Education & Training",
    "Professional Skills": "Soft Skills & Personal Traits",
    "Content Creation": "Media & Communications",
    "Legal": "Legal & Compliance",
    "Technical Requirements": "Software Engineering & IT",
    "SAP Development": "Software Engineering & IT",
    "Scripting Languages": "Software Engineering & IT",
    "HVAC_and_Heating_Ventilation_Air_Conditioning": "Engineering & Construction",
    "Software Integration": "Software Engineering & IT",
    "Content Moderation": "Media & Communications",
}

c = psycopg2.connect("postgresql://egypt_jobs:eypt2024@localhost:5432/egypt_jobs_db", connect_timeout=5)
cur = c.cursor()

# Dry run
for src, dst in MERGE.items():
    cur.execute("SELECT count(*) FROM skills WHERE domain=%s", (src,))
    n = cur.fetchone()[0]
    if n:
        print(f"  {'WOULD' if True else 'APPLY'} UPDATE {n} rows: {src!r} -> {dst!r}")

print("\nReview the mapping above. Set APPLY=True to execute.")
APPLY = False
if APPLY:
    for src, dst in MERGE.items():
        cur.execute("UPDATE skills SET domain=%s WHERE domain=%s", (dst, src))
    c.commit()
    print("Done.")
c.close()
EOF
```

**Verify after apply:**
```bash
py -c "
import psycopg2
c=psycopg2.connect('postgresql://egypt_jobs:eypt2024@localhost:5432/egypt_jobs_db',connect_timeout=5)
cur=c.cursor()
cur.execute(\"SELECT domain, count(*) FROM skills GROUP BY domain ORDER BY 2 DESC LIMIT 30\")
for r in cur.fetchall(): print(f'  {r[0]:45s} {r[1]}')
cur.execute(\"SELECT count(DISTINCT domain) FROM skills\")
print('total domains:', cur.fetchone()[0])
c.close()"
```
Expected: 20 domains only, `COMPETENCY` gone.

---

### Task 11 — Add DB-level constraints (prevention)

```bash
cd "D:/Hire Q Project/Backend API & Integration"
py - <<'EOF'
import psycopg2
c = psycopg2.connect("postgresql://egypt_jobs:eypt2024@localhost:5432/egypt_jobs_db", connect_timeout=5)
cur = c.cursor()

# 1. Prevent alias -> wrong-canonical self-teaching
cur.execute("""CREATE OR REPLACE FUNCTION check_alias_not_acronym()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.alias_name ~ '^[A-Z0-9+#./&]{2,6}$' THEN
    RAISE EXCEPTION 'REFUSED: acronym alias % -> % (ambiguity risk)', NEW.alias_name, (SELECT name FROM skills WHERE id=NEW.skill_id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;""")
cur.execute("DROP TRIGGER IF EXISTS trg_alias_acronym ON skill_aliases")
cur.execute("CREATE TRIGGER trg_alias_acronym BEFORE INSERT OR UPDATE ON skill_aliases FOR EACH ROW EXECUTE FUNCTION check_alias_not_acronym()")
print("trigger: trg_alias_acronym created")

# 2. Prevent garbage skill_level
cur.execute("""CREATE OR REPLACE FUNCTION check_skill_level()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.skill_level IS NOT NULL AND NEW.skill_level != ''
     AND NEW.skill_level NOT IN ('Not Specified','Advanced','Intermediate','Beginner',
      'Basic','Expert','Professional','Fluent','Senior','Junior','C1','Native','B2','N/A','B1','C2',
      'High','Proficient','Very Good','Intermediate/Advanced') THEN
    RAISE EXCEPTION 'REFUSED: bad skill_level %', NEW.skill_level;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;""")
cur.execute("DROP TRIGGER IF EXISTS trg_skill_level ON job_skills")
cur.execute("CREATE TRIGGER trg_skill_level BEFORE INSERT OR UPDATE ON job_skills FOR EACH ROW EXECUTE FUNCTION check_skill_level()")
print("trigger: trg_skill_level created")

# 3. Prevent category column usage (schema drift alert)
cur.execute("DROP TRIGGER IF EXISTS trg_no_category ON skills")
cur.execute("""CREATE OR REPLACE FUNCTION check_no_category()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.category IS NOT NULL THEN
    RAISE EXCEPTION 'REFUSED: column category does not exist in live schema';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;""")
cur.execute("CREATE TRIGGER trg_no_category BEFORE INSERT OR UPDATE ON skills FOR EACH ROW EXECUTE FUNCTION check_no_category()")
print("trigger: trg_no_category created")

c.commit()
c.close()
print("All constraints active.")
EOF
```

**Verify:** attempt an insert that should fail:
```bash
py - <<'EOF'
import psycopg2
c = psycopg2.connect("postgresql://egypt_jobs:eypt2024@localhost:5432/egypt_jobs_db", connect_timeout=5)
cur = c.cursor()
try:
    cur.execute("INSERT INTO skill_aliases (skill_id, alias_name) VALUES ((SELECT id FROM skills LIMIT 1), 'C++')")
    print("FAIL: alias insert succeeded (should have been blocked)")
except Exception as e:
    print("OK: blocked ->", str(e)[:100])
try:
    cur.execute("INSERT INTO job_skills (job_id, skill_id, skill_level) VALUES ((SELECT id FROM jobs LIMIT 1), (SELECT skill_id FROM job_skills LIMIT 1), 'COMPETENCY')")
    print("FAIL: bad level insert succeeded")
except Exception as e:
    print("OK: blocked ->", str(e)[:100])
c.close()
EOF
```
Expected: both blocked.

**Note:** the `trg_no_category` trigger will fail on INSERT because the `category` column doesn't exist in the table — this trigger is a **schema-drift detector**, not a runtime guard. It will fire on any code path that still references `category`. If you want it useful, keep it; if it causes noise, drop it and rely on the lint check instead.

---

## Tests / validation summary

| Task | Check | Expected |
|---|---|---|
| 1 | `scratch/db_audit_inventory.json` | 15 defect classes quantified |
| 2 | matcher loads after column fix | `matcher loaded, vectors: 43883` |
| 3 | C++/ADT smoke test | NOT `C#` / NOT `Advertising Technology` |
| 4 | strip_proficiency_modifiers unit | all OK |
| 5 | mark_key_failure with retry_after | `cooldown set: True` |
| 6 | repair script dry-run → apply → verify | `remaining bad aliases: 0` |
| 7 | self-teaching disabled | zero new aliases after run |
| 8 | 577 re-extraction | `remaining zero-skill analyzed: 0` |
| 9 | level normalization | `remaining lowercase levels: []` |
| 10 | domain merge | 20 domains, `COMPETENCY` gone |
| 11 | constraint tests | both inserts blocked |

**Full regression** after all tasks:
```bash
cd "D:/Hire Q Project"
py test_pipeline_v2.py
```
Expected: clean run, `C++`/`ADT` correct, no `RATE_LIMIT` abort, no new DB rows leaked.

---

## Risks, tradeoffs, and open questions

**Risks**
1. **Task 6 repair is destructive** — the dry-run + manual review step is mandatory. The rollback SQL is in the task.
2. **Task 10 mapping is judgment calls** — e.g., `COMPETENCY` → `Soft Skills & Personal Traits` may be wrong for some entries. Review the 85 `COMPETENCY` skills first.
3. **Disabling self-teaching (Task 7)** means the matcher can no longer learn new aliases at runtime. If you want it back, gate it on a confidence threshold + human review, not cosine > 0.85.
4. **The `trg_no_category` trigger** fires on any INSERT that includes `category` — including the `_create_new_skill` path if the column fix in Task 2 is reverted. Don't revert without dropping the trigger.
5. **577 re-extraction costs LLM quota** — ~577 calls at medium speed ≈ 6 minutes.

**Tradeoffs**
- Ambiguity gate (Task 3) costs 1 LLM call per ambiguous token (~816 acronyms) but prevents wrong matches. Accepted.
- Disabling self-teaching is safer but means the matcher's alias table stops growing. Long-term, a periodic batch re-alias job is better.
- The 20-domain whitelist is the plan's assumption; if the business needs finer granularity, the whitelist must be updated first.

**Open questions**
1. Confirm the `COMPETENCY` → `Soft Skills & Personal Traits` mapping — review the 85 skills first.
2. Do you want the 816 acronym aliases audited, or just the 2 proven-wrong ones?
3. The 577 zero-skill jobs — re-extract now or defer?
4. Should the `category` column be added back to the schema (and `prisma/schema.prisma` / `models.py` updated), or is `domain` the permanent name?
5. The legacy extraction methods (`ai_extraction`, `llm_extraction`, `AI_EXTRACT_FROM_SENTENCES`, `AI_EXTRACT_FROM_DESCRIPTION_BOTTOM_UP`, `AI_NORMALIZE_EXPLICIT_SKILLS`) — consolidate to one method name after migration?
6. Does the AI worker need a `--dry-run` flag for production runs?