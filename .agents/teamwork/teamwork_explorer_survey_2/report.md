# Comprehensive Codebase & Prototype Exploration Report
**Subagent:** `teamwork_explorer_survey_2`  
**Working Directory:** `d:\Hire Q Project\.agents\teamwork\teamwork_explorer_survey_2`  
**Target System:** Atomic Skill Decomposition Engine (`scratch/atomic_decomposition_engine.py`)  
**Audited Reference:** `d:\Hire Q Project\.md\master_skill_level_governance_and_audit_specification_v3.md` & `d:\Hire Q Project\.agents\teamwork\ORIGINAL_REQUEST.md`  
**Execution Timestamp:** 2026-11-03T14:50:00Z  

---

## 1. Executive Summary

This investigation conducted a thorough structural, empirical, and behavioral audit of the existing codebase, prototype implementation (`scratch/atomic_decomposition_engine.py`), supporting scripts, PostgreSQL database schema (`egypt_jobs_db`), and external catalog files in `d:\Hire Q Project`.

### Core Findings
1. **Prototype Viability & Foundation:** `scratch/atomic_decomposition_engine.py` (519 lines) establishes a strong baseline concept with a 5-pass structure, protected compound substitution (`PROTECTED_COMPOUNDS`), parenthetical parsing, and basic noise filtering.
2. **Critical Architectural Divergences vs. v3 Specification:**
   - **Missing Two-Column Level Architecture:** The prototype completely lacks `extracted_skill_level` (verbatim substring preservation). It only outputs `skill_level`, mutating strings into title-case or assigning premature levels.
   - **False Level Stripping on Proper Nouns:** Legacy regexes in `LEVEL_PATTERNS` treat `lead` and `senior` as `Advanced` technical skill levels. Consequently, `"Lead Generation"` decomposes into `atomic_skill = 'Generation'` with `skill_level = 'Advanced'`, destroying proper business nouns.
   - **Parentheses Typology Gaps:** Language CEFR codes in parentheses like `"English (B2)"` are not recognized as levels; instead, `"B2"` is parsed as a sub-skill and rejected as noise, creating false rejection records.
   - **Complete Absence of Sidecar Metadata Engine:** The required 11-column sidecar metadata file (`egypt_skills_decomposition_metadata.csv`) is neither modeled nor generated anywhere in the existing prototype.
   - **Catalog Loading Collision & Domain Overwrite Bug:** When parsing `standard_skills_catalog.csv` (3,794 rows, 2,756 unique names), `load_catalog` loads entries into a flat dictionary where subsequent occurrences overwrite earlier ones without priority weighting. As a result, `"Python"` (which appears in 10 rows) is mapped to `"Human Resources / HR Operations & People Analytics"` because the HR row is parsed last.
   - **Schema Contract Discrepancy:** The main CSV output in existing runner scripts has only 13 columns (omitting `extracted_skill_level`), assigns `"REJECTED"` or the novel token to `matched_atomic_skill` instead of `NULL`, and leaves empty strings instead of `NULL` in `rejection_reason`.
3. **Execution Environment:** Python 3.14.0 is available with core data-engineering libraries (`pandas`, `psycopg2-binary`, `regex`, `rich`, `pydantic`, `SQLAlchemy`). Standard library `unittest` is ready for automated test suites. PostgreSQL database access is strictly read-only and operational.

---

## 2. Detailed Architecture of `scratch/atomic_decomposition_engine.py`

### 2.1 File Structure and In-Memory Data Structures

The prototype file `scratch/atomic_decomposition_engine.py` is a single monolithic script comprising 519 lines. It defines several module-level global data structures before declaring the class `AtomicDecompositionEngine`:

| Structure Name | Type | Size | Purpose & Implementation Details |
|---|---|---|---|
| `PROTECTED_COMPOUNDS` | `dict` | 26 pairs | Maps slashed/ampersand compounds (e.g. `'PL/SQL': 'PL_SQL'`, `'CI/CD': 'CI_CD'`, `'UI/UX': 'UI_UX'`, `'R&D': 'R_AND_D'`) to safe placeholder tokens before delimiter splitting. |
| `REVERSE_PROTECTED` | `dict` | 26 pairs | Reverse mapping dictionary `{v: k}` used to restore safe tokens back to their original forms after splitting. |
| `VALID_SHORT_TOKENS` | `set` | 36 tokens | Whitelist of 1-to-2 letter valid tokens (`'BI'`, `'AI'`, `'ML'`, `'QA'`, `'QC'`, `'R'`, `'C'`, `'2D'`, `'3D'`, `'OS'`, `'DB'`, etc.) protected from length-based noise rejection (`len(token) <= 2`). |
| `LANGUAGES` | `set` | 18 names | Lowercase language names (`'english'`, `'arabic'`, `'german'`, `'french'`, `'mandarin'`, etc.) used by `classify_skill_type`. |
| `SOFT_SKILLS` | `set` | 29 phrases | Common soft skill phrases (`'communication'`, `'leadership'`, `'problem solving'`, `'teamwork'`, `'negotiation'`, etc.). |
| `CERT_KEYWORDS` | `re.Pattern` | 1 pattern | Case-insensitive regex matching certification indicators (`certified`, `istqb`, `pmp`, `cpa`, `cfa`, `prince2`, `ccna`, `aws certified`, etc.). |
| `LEVEL_PATTERNS` | `list[tuple]` | 4 patterns | Compiled regexes mapping matched words to 4 level categories: `'Advanced'` (matches `advanced`, `expert`, `lead`, `principal`, `senior`, `sr.`), `'Intermediate'` (matches `intermediate`, `mid-level`), `'Beginner'` (matches `basic`, `beginner`, `entry-level`, `junior`), and `'Certified'`. |
| `PROTECTED_PROPER_NOUNS` | `dict` | 7 entries | Hardcoded map of 7 acronyms (`'adas'`, `'abap'`, `'apt'`, `'aes'`, `'acls'`, `'atls'`, `'apra'`) intended to prevent stripping of "Advanced". |
| `REDUNDANT_SUFFIXES` | `re.Pattern` | 1 pattern | Strips trailing filler suffixes: `\s+(skills?|tools?|technologies|knowledge|suite|concepts?|basics?|essentials?|fundamentals?|level)$`. |
| `NOISE_TOKENS` | `set` | 22 tokens | Tokens classified as `REJECTED_NOISE` if candidate matches (`'editions'`, `'levels'`, `'basics'`, `'functions'`, `'suite'`, `'etc'`, `'various'`, `'years'`, etc.). |

---

### 2.2 Catalog Ingestion (`load_catalog`)

Lines 111–143 define `load_catalog(catalog_path)`:
```python
def load_catalog(catalog_path):
    df = pd.read_csv(catalog_path, sep=';', encoding='utf-8-sig')
    compiled_patterns = []
    exact_catalog_map = {}
    for idx, r in df.iterrows():
        s_name = str(r['standard_skill_name']).strip()
        dom = str(r['domain']).strip()
        sub = str(r['sub_category']).strip()
        stype = str(r['skill_type']).strip()
        pat = str(r.get('initial_regex_pattern', '')).strip()
        aliases = str(r.get('known_aliases', '')).strip()
        
        info = {'name': s_name, 'domain': dom, 'sub_category': sub, 'skill_type': stype}
        exact_catalog_map[s_name.lower()] = info
        # ... alias ingestion ...
        # ... regex pattern compilation ...
```

#### The Flat-Dictionary Collision Flaw
- `standard_skills_catalog.csv` contains 3,794 rows, but only 2,756 unique `standard_skill_name` values. Cross-domain skills (e.g. `Python`, `SQL`, `Communication`, `English`, `Problem Solving`) appear up to 33 times across different domain/subcategory combinations.
- Because `load_catalog` iterates sequentially through the CSV and unconditionally assigns `exact_catalog_map[s_name.lower()] = info`, the **last row encountered in the file wins**.
- **Empirical Demonstration:**
  `Python` exists across 10 subcategories. The 10th row is Row 2439:
  `standard_skill_name = "Python"; domain = "Human Resources"; sub_category = "HR Operations & People Analytics"`
  Consequently, `exact_catalog_map['python']` stores `Human Resources` as the domain for Python. In every exact match across the entire system, `Python` is classified as an HR skill.
- The catalog file includes a `skill_priority` column (`Core`, `Foundational`, `Secondary`), but `scratch/atomic_decomposition_engine.py` completely ignores `skill_priority`.

---

### 2.3 The 5-Pass Decomposition Logic

The `AtomicDecompositionEngine.decompose(raw_input)` method executes a sequential pipeline:

```
Raw Input
   │
   ▼
[Pass 0: Protected Proper Noun Check] ──(Match)──> Emit 1 Row (Hardcoded Domain: Electrical & Electronics Eng)
   │ (No Match)
   ▼
[Pass 1: Whole-Skill Catalog Matching] ──(Match & No Delims)──> Emit 1 Catalog Matched Row
   │ (Delims / Parens / No Direct Match)
   ▼
[Pass 2: Parentheses Analysis]
   ├─► Case 2A: Level-only inside () ──> Emit 1 Row (Inherited Level)
   ├─► Case 2B: Acronym inside ()   ──> Emit 1 Row (Save Acronym in memory)
   └─► Case 2C: Specification inside () ──> Emit Parent Row + Inside Chunks
   │ (No Parens)
   ▼
[Pass 3: Protected Compound Substitution & Delimiter Splitting]
   ├─► Replace PROTECTED_COMPOUNDS with safe tokens
   └─► Split on delimiters: [/&,] | (\s+-\s+) | (\band\b)
   │
   ▼
[Pass 4: Atomic Piece Processing & Classification]
   ├─► Level extraction & suffix trimming
   ├─► Noise check (NOISE_TOKENS or len <= 2)
   ├─► Exact / Regex Catalog Matching
   └─► Novel Classification (UNMATCHED_NOVEL)
```

#### Detailed Pass Breakdown

1. **Pass 0 — Protected Proper Nouns (Lines 357–373):**
   - Matches if any key from `PROTECTED_PROPER_NOUNS` is found in `raw_skill.lower()` AND the string contains `'('` or `'advanced'`.
   - **Flaw:** If matched, it returns a hardcoded row with:
     `domain = 'Engineering & Construction'`, `sub_category = 'Electrical & Electronics Engineering'`.
     This means `ABAP` (SAP ERP programming), `APT` (Cybersecurity), and `ACLS` (Healthcare Cardiac Support) are all erroneously assigned to Electrical Engineering!
   - **Flaw:** Broad proper nouns specified in v3 (e.g., `Lead Generation`, `Lead Time Reduction`, `Senior Care`, `GitHub Advanced Security`) are missing from `PROTECTED_PROPER_NOUNS`.

2. **Pass 1 — Whole-Skill Catalog Matching (Lines 375–403):**
   - Checks if the entire raw skill (after level stripping and suffix removal) directly matches the catalog, provided no delimiters (`/`, `&`, `,`, ` - `) or parentheses exist.
   - **Flaw:** `extract_level` is called before matching, stripping valid prefixes like `Lead` or `Senior` from multi-word phrases.

3. **Pass 2 — Parentheses Analysis (Lines 405–482):**
   - Uses regex `^(.*?)\s*\((.*?)\)(.*)$` to partition text into `before`, `inside`, `after`.
   - **Case 2A (Level-only):** Matches `inside` against `LEVEL_PATTERNS`. If matched, strips parentheses and inherits level.
   - **Case 2B (Acronym):** Computes first-letter acronym heuristic from `before` vs `inside`. If match is found, stores in `self.acronym_dict` and decomposes `before`.
   - **Case 2C (Specification):** If neither level nor acronym, it treats `inside` as sub-skills, splits `inside` on delimiters, and emits both the parent token and each child token with `match_status = 'PARENTHESIS_SPECIFICATION'`.
   - **Flaw:** Does not distinguish between **Specification** (e.g. `(Cost & Tracking)`), **Industry Context** (e.g. `Sales (Real Estate)`), **Geographic Context** (e.g. `(Egypt)`), and **CEFR Language Code** (e.g. `(B2)`).

4. **Pass 3 — Protected Compounds & Delimiter Splitting (Lines 483–518):**
   - Replaces 26 compound tokens using `protect_compounds(raw_skill)`.
   - Splits on regex `r'[/&,]|(?:\s+-\s+)|(?:\band\b)'`.
   - Restores compounds using `restore_compounds`.
   - Computes `before_context` as `" ".join(restored_chunks[:idx])` and `after_context` as `" ".join(restored_chunks[idx+1:])`.
   - **Flaw:** Splitting on `\band\b` destroys valid multi-word skills like `"Research and Development"`, `"Health and Safety"`, or `"Strategy and Operations"` if not explicitly protected.

5. **Pass 4 — Atomic Processing & Classification (`process_single_atomic_piece`, Lines 271–350):**
   - Trims redundant suffixes (`REDUNDANT_SUFFIXES`) and boundary punctuation.
   - Checks `NOISE_TOKENS` and length threshold (`len <= 2`).
   - If not noise, queries `match_against_catalog`:
     1. Exact match against `exact_catalog_map`.
     2. Linear regex search against 3,794 `compiled_patterns` (`regex.fullmatch` or `regex.search`).
   - If matched, adopts catalog `domain`, `sub_category`, and `skill_type`.
   - If unmatched, invokes `classify_skill_type` (Hard Skill / Soft Skill / Language / Certification) and assigns `domain` via `get_standard_category_for_type`.
   - **Flaw:** `get_standard_category_for_type` assigns novel soft skills and languages to `'General Business & Soft Skills'`. The v3 specification strictly prohibits this: unmatched novel skills must have `domain = 'Unknown'` and `sub_category = 'Unknown'`.

---

## 3. Empirical Verification: 11 Benchmark Traces on Existing Prototype

To rigorously measure the prototype's adherence to the audited v3 specification, we executed all 11 specification traces from Section 10 of `master_skill_level_governance_and_audit_specification_v3.md` through `scratch/atomic_decomposition_engine.py`:

| # | Raw Input Skill | Expected Output (v3 Specification) | Actual Prototype Output | Evaluation | Root Cause in Prototype Code |
|---|---|---|---|---|---|
| 1 | `Mastery of Python` | `atomic: 'Python'`<br>`extracted_lvl: 'Mastery'`<br>`lvl: 'Advanced'`<br>`status: 'CATALOG_EXACT_MATCH'` | `atomic: 'Mastery of Python'`<br>`matched: 'Python'`<br>`lvl: 'Not Specified'`<br>`status: 'CATALOG_REGEX_MATCH'` | **FAIL** | Regex `(?<!\w)Python(?!\w)` matched the full string in Pass 1 regex search; `Mastery` was never isolated as a level modifier. |
| 2 | `Working knowledge of Docker` | `atomic: 'Docker'`<br>`extracted_lvl: 'Working knowledge'`<br>`lvl: 'Intermediate'`<br>`status: 'CATALOG_EXACT_MATCH'` | `atomic: 'Working knowledge of Docker'`<br>`matched: 'Docker'`<br>`lvl: 'Not Specified'`<br>`status: 'CATALOG_REGEX_MATCH'` | **FAIL** | Same as above: whole string matched Docker pattern in Pass 1; `"Working knowledge"` modifier was ignored. |
| 3 | `Solid understanding of Git` | `atomic: 'Git'`<br>`extracted_lvl: 'Solid'`<br>`lvl: 'Not Specified'`<br>`status: 'CATALOG_EXACT_MATCH'` | `atomic: 'Solid understanding of Git'`<br>`matched: 'Git'`<br>`lvl: 'Not Specified'`<br>`status: 'CATALOG_REGEX_MATCH'` | **FAIL** | Whole string absorbed by Git regex; modifier not parsed; `extracted_skill_level` missing. |
| 4 | `Strong communication skills` | `atomic: 'Communication'`<br>`extracted_lvl: 'Strong'`<br>`lvl: 'Not Specified'`<br>`status: 'CATALOG_EXACT_MATCH'` | `atomic: 'Strong communication'`<br>`matched: 'Communication'`<br>`lvl: 'Not Specified'`<br>`status: 'CATALOG_REGEX_MATCH'` | **FAIL** | Suffix `skills` stripped, but `"Strong"` retained inside `atomic_skill`. `extracted_skill_level` missing. |
| 5 | `Fluent English` | `atomic: 'English'`<br>`extracted_lvl: 'Fluent'`<br>`lvl: 'Not Specified'`<br>`status: 'CATALOG_EXACT_MATCH'` | `atomic: 'Fluent English'`<br>`matched: 'English'`<br>`lvl: 'Not Specified'`<br>`status: 'CATALOG_REGEX_MATCH'` | **FAIL** | Whole string matched regex for English; `"Fluent"` not extracted. |
| 6 | `English (B2)` | `atomic: 'English'`<br>`extracted_lvl: 'B2'`<br>`lvl: 'B2 (Upper Intermediate)'`<br>`status: 'CATALOG_EXACT_MATCH'` (1 row) | Row 1: `atomic: 'English'`<br>Row 2: `atomic: 'B2'`, `matched: 'REJECTED'`, `status: 'PARENTHESIS_SPECIFICATION'`, `type: 'Requirement'` | **FAIL** | `LEVEL_PATTERNS` does not include CEFR codes (`B2`). Treated as sub-skill and rejected as noise! Emitted 2 rows instead of 1. |
| 7 | `ISTQB Advanced Level` | `atomic: 'ISTQB'`<br>`extracted_lvl: 'Advanced'`<br>`lvl: 'Not Specified'`<br>`status: 'UNMATCHED_NOVEL'`<br>`sidecar track: 'Advanced Level'` | `atomic: 'ISTQB'`<br>`matched: 'ISTQB'`<br>`lvl: 'Advanced'`<br>`status: 'UNMATCHED_NOVEL'` | **FAIL** | Certification level violation: assigned `lvl: 'Advanced'`, violating the rule that certification levels reflect award status, not exam tracks. |
| 8 | `Lead Generation` | `atomic: 'Lead Generation'`<br>`extracted_lvl: 'Not Specified'`<br>`lvl: 'Not Specified'`<br>`status: 'PROTECTED_PROPER_NOUN'` | `atomic: 'Generation'`<br>`matched: 'Generation'`<br>`lvl: 'Advanced'`<br>`status: 'UNMATCHED_NOVEL'` | **CRITICAL FAIL** | `LEVEL_PATTERNS` stripped `"Lead"` as an `Advanced` level modifier! Truncated commercial skill to `"Generation"`. |
| 9 | `Lead Time Reduction` | `atomic: 'Lead Time Reduction'`<br>`extracted_lvl: 'Not Specified'`<br>`lvl: 'Not Specified'`<br>`status: 'PROTECTED_PROPER_NOUN'` | `atomic: 'Time Reduction'`<br>`matched: 'Time Reduction'`<br>`lvl: 'Advanced'`<br>`status: 'UNMATCHED_NOVEL'` | **CRITICAL FAIL** | Stripped `"Lead"` as `Advanced`; corrupted manufacturing discipline to `"Time Reduction"`. |
| 10 | `Google Tag Manager (GTM)` | `atomic: 'Google Tag Manager'`<br>`extracted_lvl: 'Not Specified'`<br>`lvl: 'Not Specified'`<br>`status: 'CATALOG_EXACT_MATCH'` | `atomic: 'Google Tag Manager'`<br>`matched: 'Google Tag Manager'`<br>`lvl: 'Not Specified'`<br>`status: 'CATALOG_EXACT_MATCH'` | **PASS** | Successfully matched acronym heuristic and extracted clean product name. |
| 11 | `Senior C++ Engineer` | `atomic: 'C++'`<br>`extracted_lvl: 'Not Specified'`<br>`lvl: 'Not Specified'`<br>`sidecar seniority: 'Senior Engineer'` | `atomic: 'C++ Engineer'`<br>`matched: 'C++'`<br>`lvl: 'Advanced'`<br>`status: 'CATALOG_REGEX_MATCH'` | **FAIL** | Treated `"Senior"` as `Advanced` skill level instead of isolating role seniority for sidecar. |

**Benchmark Score:** 1 PASS / 10 FAILURES (9.1% compliance on audited v3 benchmark cases).

---

## 4. Comprehensive Audit of Shortcomings, Gaps, and Discrepancies

### 4.1 Missing Two-Column Level Architecture
- **Requirement:** Section 2 of v3 specification mandates `extracted_skill_level` (pure verbatim substring preserving casing and internal whitespace, e.g. `"Working knowledge"`, `"Mastery"`, `"EXPERT"`, `"hands-on"`) alongside `skill_level` (governed 5-tier canonical normalized level: `Beginner`, `Intermediate`, `Advanced`, `Expert`, `Not Specified`).
- **Existing Code:** Only has a single column `skill_level`. It extracts via `.title()` or direct string assignment. Verbatim lexical evidence is lost.

### 4.2 Destruction of Proper Nouns via Aggressive Seniority Stripping
- **Requirement:** Section 3.2 and Section 7.1 of v3 specification require contextual shielding for role words (`Lead`, `Senior`, `Principal`, `Director`, `Manager`). `"Lead Generation"`, `"Lead Time Reduction"`, `"Senior Care"`, and `"GitHub Advanced Security"` must never be stripped.
- **Existing Code:** Line 79 of `scratch/atomic_decomposition_engine.py` compiles `r'\b(advanced|expert|lead|principal|senior|sr\.?)\b'`. Any occurrence of `lead` or `senior` immediately assigns `skill_level = 'Advanced'` and deletes the word from the skill token.

### 4.3 Missing Sidecar Metadata Generation
- **Requirement:** Section 5 of v3 specification and Section 7 of `ORIGINAL_REQUEST.md` define a frozen 11-column sidecar metadata dataset:
  1. `raw_skill`
  2. `job_count`
  3. `industry_context`
  4. `category_container`
  5. `parentheses_raw_content`
  6. `experience_duration`
  7. `intra_string_seniority`
  8. `credential_track_or_status`
  9. `posting_career_level_distribution`
  10. `top_associated_job_titles`
  11. `is_composite`
- **Existing Code:** Neither `scratch/atomic_decomposition_engine.py` nor `run_full_atomic_decomposition.py` creates this dataset or computes intra-string metadata fields.

### 4.4 Data Contract Incompatibilities in Main Output
- **Columns:** The main schema in `ORIGINAL_REQUEST.md` has exactly 14 columns. The prototype produces only 12 or 13 columns (lacking `extracted_skill_level`).
- **`matched_atomic_skill` Contract:** The contract specifies that if no catalog match exists, `matched_atomic_skill` must be `NULL`. In the prototype:
  - On `UNMATCHED_NOVEL`, it populates `matched_atomic_skill` with `candidate_clean` (the extracted token itself).
  - On `REJECTED_NOISE`, it populates `matched_atomic_skill` with `"REJECTED"`.
- **`rejection_reason` Contract:** Must be explicit string for rejected rows, and `NULL` for accepted rows. In the prototype, accepted rows receive an empty string `""` instead of `NULL`.
- **Match Status Enum:** Must strictly be one of the 6 permitted enum values:
  `CATALOG_EXACT_MATCH`, `CATALOG_REGEX_MATCH`, `PARENTHESIS_SPECIFICATION`, `PROTECTED_PROPER_NOUN`, `UNMATCHED_NOVEL`, `REJECTED_NOISE`.

### 4.5 Acronym Dictionary Underutilization
- **Requirement:** `skills_acronym_dictionary.json` in the project root contains 386 verified, domain-categorized acronyms (`UX`, `UI`, `CI/CD`, `ERP`, `CRM`, `BIM`, `CFA`, `PMP`, `GCP`, `AWS`, etc.).
- **Existing Code:** Line 150 initializes `self.acronym_dict = {}` and only populates it opportunistically when an acronym pattern is detected in parentheses during runtime. It completely fails to load the 386 verified dictionary entries.

### 4.6 Delimiter Splitting Collateral Damage
- In Pass 3, the engine splits on `r'[/&,]|(?:\s+-\s+)|(?:\band\b)'`.
- Common Egyptian labor market skills with the word `"and"` (e.g. `"Research and Development"`, `"Strategy and Operations"`, `"Health and Safety"`, `"Shipping and Receiving"`) are split into nonsensical fragments if they do not match the 26 entries in `PROTECTED_COMPOUNDS`.

### 4.7 SQL Aggregation Query Inaccuracy
- In `run_full_atomic_decomposition.py`:
  ```sql
  SELECT s.name, COUNT(js.job_id) as job_count
  FROM skills s
  LEFT JOIN job_skills js ON s.id = js.skill_id
  GROUP BY s.name;
  ```
- The specification explicitly requires `job_count = COUNT(DISTINCT job_id)` from `job_skills`.
- If a skill is associated multiple times with the same job (or across multiple postings under duplicate extraction records), `COUNT(js.job_id)` overcounts postings.

---

## 5. Modularity & Production-Grade Architectural Recommendations

The prototype demonstrates that procedural scripts with global state and hardcoded dictionaries are fragile and difficult to test. We recommend refactoring into a clean, decoupled production package: `linguistic_intelligence`.

### 5.1 Proposed Package Layout

```
d:\Hire Q Project\
├── linguistic_intelligence/
│   ├── __init__.py                        # Package root & public exports
│   ├── config.py                          # Read-only DB connection, file paths, frozen schemas
│   ├── vocabularies/                      # Governed external reference data (JSON/CSV)
│   │   ├── __init__.py
│   │   ├── protected_compounds.json       # Slur/compound whitelist (PL/SQL, CI/CD, UI/UX, etc.)
│   │   ├── protected_proper_nouns.json    # Business nouns (Lead Generation, Senior Care, etc.)
│   │   ├── valid_short_tokens.json       # BI, AI, ML, R, C, Go, etc.
│   │   ├── level_governance_matrix.json   # 5-tier mapping + verbatim pattern lookup
│   │   ├── industry_contexts.json        # Transportation & Logistics, Real Estate, etc.
│   │   ├── category_containers.json      # Programming Languages, AI Development Tools, etc.
│   │   └── noise_tokens.json             # editions, levels, basics, functions, etc.
│   ├── patterns/                          # Compiled regex engines with ReDoS safety
│   │   ├── __init__.py
│   │   ├── delimiters.py                 # Compound delimiter tokenizer
│   │   ├── level_extractor.py            # Two-pass verbatim & canonical level classifier
│   │   ├── parentheses_parser.py         # 5-way parenthetical typology engine
│   │   └── context_extractor.py          # Duration, seniority, category containers
│   ├── catalog/                           # Precedence-weighted catalog management
│   │   ├── __init__.py
│   │   ├── catalog_indexer.py            # Loads standard catalog with Core-first priority weighting
│   │   └── canonical_homes.py            # Canonical home resolution for cross-domain tools
│   ├── engine/                            # Core processing pipeline
│   │   ├── __init__.py
│   │   ├── atomic_decomposer.py          # Deterministic 5-pass decomposition engine
│   │   ├── sidecar_aggregator.py         # 11-column sidecar metadata builder
│   │   └── pipeline_runner.py            # Batch processor over all 28,824 raw skills
│   └── tests/                             # Comprehensive automated verification suite
│       ├── __init__.py
│       ├── test_adversarial_regex.py     # 5-gate regex validation protocol (ReDoS timeouts)
│       ├── test_benchmark_traces.py      # All 11 revalidated specification traces
│       ├── test_proper_noun_shielding.py # Positive & negative proper noun tests
│       └── test_catalog_precedence.py    # Priority-weighting & canonical homes tests
├── run_full_atomic_decomposition.py      # High-performance CLI production runner
└── run_verification_suite.py             # One-click test runner & audit reporter
```

### 5.2 Key Design Principles for Production Modules

1. **Precedence-Weighted Catalog Indexing:**
   - Instead of last-row overwrites, use `PRIORITY_WEIGHTS`:
     `{'Core': 3, 'Foundational': 2, 'Secondary': 1, '': 0}`.
   - For pervasive cross-domain tools (e.g. `Microsoft Excel`, `Docker`, `Git`, `Python`), maintain an explicit `CANONICAL_HOMES` lookup table ensuring deterministic domain assignments.
2. **Two-Pass Pure Verbatim Level Extraction:**
   - **Pass 1:** Isolate exact character slice from raw string, preserve verbatim casing and spacing into `extracted_skill_level`.
   - **Pass 2:** Normalize in temporary memory variable (`token.lower().strip()`) and map to canonical vocabulary via `level_governance_matrix.json`.
   - If ambiguous (`Strong`, `Solid`, `Hands-on`) or soft skill: canonical `skill_level = 'Not Specified'`.
3. **Five-Way Parentheses Typology Engine:**
   When analyzing `(...)`:
   - *Typology 1: Level Modifier* (e.g. `(Advanced)`, `(B2)`) -> Extract level, do not split.
   - *Typology 2: Acronym Definition* (e.g. `(AWS)`, `(GTM)`) -> Map to canonical name, do not split.
   - *Typology 3: Industry Context* (e.g. `(Real Estate)`, `(Healthcare)`) -> Export to sidecar `industry_context`, do not emit skill row.
   - *Typology 4: Category Container* (e.g. `(Pandas & NumPy)`) -> Emit parent + child specifications.
   - *Typology 5: Geographic / Regional* (e.g. `(Egypt)`, `(GCC)`) -> Filter to sidecar or discard.
4. **Adversarial Regex Safety (5-Gate Validation):**
   - Pre-compile all patterns once during engine initialization.
   - Wrap complex lookaheads with non-capturing syntax `(?:...)`.
   - Test every pattern against ReDoS payloads in isolated subprocesses with 50ms hard timeouts.

---

## 6. Benchmark Harnesses & Verification Test Capabilities

### 6.1 Existing Test Assets in the Workspace
- `scratch/run_test_decomposition.py`: Executes 24 user-defined cases + 75 complex cases from `skills.csv` (100 total raw skills) and exports `test_decomposed_100_skills.csv`.
- `scratch/test_regex_layer1.py`: Tests span-based non-overlapping regex matching.
- `scratch/test_standalone_words.py`: Evaluates all 3,794 catalog regexes against 21 common standalone words (`IT`, `HR`, `Services`, `Management`, etc.) to confirm 0 false-positive standalone matches.
- `scratch/test_complex_cases.py`: Prototype parser testing parentheses, acronym heuristics, and separators on 10 complex strings.

### 6.2 Recommended Verification Suite for Production

To guarantee 100% adherence to the audited v3 specification before running the full dataset, the following test harnesses should be deployed:

1. **Test Suite 1: Specification Traces Benchmark (`test_benchmark_traces.py`):**
   - Asserts exact expected output for all 11 revalidated traces from Section 10 of the v3 specification (including exact verbatim casing, canonical level mappings, and 6-status enum adherence).
2. **Test Suite 2: Contextual Proper Noun Protection (`test_proper_noun_shielding.py`):**
   - Positive tests: Asserts `"Lead"` is NOT stripped in `"Lead Generation"`, `"Lead Nurturing"`, `"Lead Time Reduction"`.
   - Positive tests: Asserts `"Senior"` is NOT stripped in `"Senior Care"`, `"Senior Living"`.
   - Positive tests: Asserts `"Advanced"` is NOT stripped in `"GitHub Advanced Security"`, `"Advanced Threat Protection"`.
   - Negative tests: Asserts `"Senior"` in `"Senior Python Developer"` or `"Lead Software Engineer"` is routed to `intra_string_seniority` without corrupting the technical skill.
3. **Test Suite 3: 5-Gate Adversarial Regex Protocol (`test_adversarial_regex.py`):**
   - Gate 1: Valid JSON escaping.
   - Gate 2: Python `re.compile` validity.
   - Gate 3: Catastrophic backtracking guard (subprocess with 50ms timeout on repeated-pattern adversarial payloads).
   - Gate 4: 30 generic dictionary words false-positive resistance.
   - Gate 5: Unicode and Arabic isolation (`[\u0600-\u06FF]`).
4. **Test Suite 4: Schema & Data Contract Linter (`test_schema_contract.py`):**
   - Asserts exactly 14 columns in `egypt_skills_decomposed_graph.csv` with exact column names.
   - Asserts exactly 11 columns in `egypt_skills_decomposition_metadata.csv` with exact column names.
   - Asserts zero nulls in non-nullable columns (`raw_skill`, `atomic_skill`, `match_status`, `skill_level`, `skill_type`).
   - Asserts `matched_atomic_skill` is strictly `NULL` for `UNMATCHED_NOVEL` and `REJECTED_NOISE`.
   - Asserts `rejection_reason` is strictly `NULL` for accepted rows.
   - Asserts strictly 6 permitted enum values in `match_status`.
   - Asserts `domain = 'Unknown'` and `sub_category = 'Unknown'` for novel and rejected rows.

---

## 7. Execution Readiness Assessment

| Dimension | Current State | Production Requirement | Action Required |
|---|---|---|---|
| **Python Version** | Python 3.14.0 | Python 3.10+ | Ready (Fully compatible). |
| **PostgreSQL DB** | `localhost:5432/egypt_jobs_db` operational, 464,397 `job_skills` rows | Strictly Read-Only access | Ready (Read-only queries verified). |
| **Input Data** | `skills.csv` (28,824 unique raw skills) verified | Process each skill exactly once | Ready. |
| **Catalog Data** | `standard_skills_catalog.csv` (3,794 rows) | Priority-weighted ingestion | Priority weighting & canonical homes needed. |
| **Acronym Data** | `skills_acronym_dictionary.json` (386 entries) | Load into engine | Engine integration needed. |
| **Level Governance** | Monolithic `LEVEL_PATTERNS` in prototype | Two-column verbatim + 5-tier canonical matrix | Implementation of `extracted_skill_level` needed. |
| **Sidecar Output** | Missing | 11-column sidecar metadata dataset | Sidecar aggregation module needed. |
| **Automated Tests** | Ad-hoc scratch scripts | Automated test suite via `unittest` | Formal test package needed. |

---

## 8. Summary Conclusion

The prototype `scratch/atomic_decomposition_engine.py` provides valuable initial heuristics, but cannot be directly deployed for production execution due to critical architectural flaws (false level stripping on proper nouns like `Lead Generation`, absence of the 2-column level architecture, catalog collision bugs, lack of sidecar metadata generation, and non-compliance with the frozen 14-column contract). 

Refactoring the engine into a modular `linguistic_intelligence` architecture with explicit priority weighting, two-pass verbatim level extraction, five-way parenthetical typology, and comprehensive test harnesses will ensure 100% deterministic, audit-compliant execution across all 28,824 raw skills.
