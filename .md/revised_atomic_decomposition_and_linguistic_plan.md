# Implementation Plan: Atomic Skill Decomposition & Linguistic Intelligence Engine (Revised)

## Goal Description
Transform all 28,824 raw, multi-phrased skills from the Egyptian job market (`skills.csv` / `job_skills` in PostgreSQL `localhost:5432/egypt_jobs_db`) into an **Atomic Decomposed Relational Context Graph**, mapped strictly to the closed **14 Domains and 61 Subcategories** of `standard_skills_catalog.csv`.

### Core Scope Boundaries (Strict Mandate)
- **Phase Scope:** Pure atomic decomposition, delimiter resolution, level extraction, and structural context preservation.
- **Zero Semantic Normalization:** Do NOT merge semantically similar skills, do NOT calculate vector embeddings, do NOT call LLMs in this phase.
- **Preserve All Occurrences:** Every single raw skill must be preserved; duplicates across postings remain distinct instances.
- **Zero Live Database Writes:** The local PostgreSQL database `egypt_jobs_db` remains 100% READ-ONLY. All outputs are exported to CSV files in the workspace.
- **Frozen 13-Column Schema:** The main output schema is strictly frozen at 13 columns. Additional metadata (industry restrictions, experience duration, category containers) is preserved in an external sidecar metadata file.

---

## User Review Required

> [!IMPORTANT]
> ### Review of User Decisions & Implementation Rules
> 1. **Decision 1 — Category Containers (Option B with Condition):**
>    - When a raw skill contains a category header (e.g., `AI Development Tools (Claude Code, Codex)`):
>      - The concrete child skills (`Claude Code`, `Codex`) are extracted as atomic rows.
>      - The header (`AI Development Tools`) is emitted as a parent row **ONLY** if it is independently meaningful or recognized by `standard_skills_catalog.csv`.
>      - The header context is always linked in the sidecar metadata export (`category_container = 'AI Development Tools'`) and in `separated_from_before`.
> 2. **Decision 2 — Industry Context Restrictions (Option B):**
>    - When parentheses contain an industry restriction (e.g., `Sales Experience (Transportation & Logistics)` or `Accounting Experience (Hospitality/Leisure)`):
>      - The core skill is cleaned: `Sales Experience` -> `Sales`, `Accounting Experience` -> `Accounting`.
>      - The industry restriction (`Transportation & Logistics`, `Hospitality/Leisure`) is **NOT** emitted as a skill row.
>      - It is exported to the sidecar metadata file: `industry_context = 'Transportation & Logistics'`.
> 3. **Decision 3 — Civil/Structural Engineering (Option B):**
>    - "Civil/Structural Engineering" is mapped to "Civil & Structural Engineering" **ONLY** if explicitly verified in the catalog.
>    - Audit finding: `Civil & Structural Engineering` exists as a **Subcategory**, but NOT as an individual skill name in `standard_skills_catalog.csv`. Therefore, it cleanly decomposes into two atomic skills: `Civil Engineering` and `Structural Engineering`, linked via `/` and both belonging to Subcategory `Civil & Structural Engineering`.
>    - This does NOT generalize to arbitrary slashes (`Python/Bash/Go` strictly yields 3 distinct skills).
> 4. **Decision 4 — GitHub Advanced Security (Option A):**
>    - "Advanced" is verified as part of the proper product name.
>    - `GitHub Actions/GitHub Advanced Security` produces:
>      - Row 1: `atomic_skill = 'GitHub Actions'`, `skill_level = 'Not Specified'`.
>      - Row 2: `atomic_skill = 'GitHub Advanced Security'`, `skill_level = 'Not Specified'` (Level is NOT stripped).

> [!WARNING]
> ### Revalidated Questionable Benchmark Expectations
> We audited the catalog and confirmed the following corrections:
> 1. **`PL/SQL`:** Must **NOT** be forced into `Oracle Database`. `PL/SQL` is an independent procedural language. In `standard_skills_catalog.csv`, `Oracle Database` had an overly greedy regex alias. Under pure decomposition, `PL/SQL` is preserved as `PL/SQL`.
> 2. **`ISTQB Advanced Level`:** `ISTQB` is the atomic certification, `Advanced` is the level modifier, `Level` is redundant suffix. Output: `atomic_skill = 'ISTQB'`, `skill_level = 'Advanced'`, `skill_type = 'Certification'`, `match_status = 'UNMATCHED_NOVEL'`. It is NOT forced into `ISTQB Certified Tester Foundation Level`.
> 3. **`Advanced Editions`:** Correctly isolates `Editions` and marks as `match_status = 'REJECTED_NOISE'`, `rejection_reason = "Incomplete or meaningless fragment: 'Editions'"`.

---

## Output Schema Specifications

### 1. Main Frozen Relational Graph Schema (`egypt_skills_decomposed_graph.csv` - 13 Columns)

| # | Column Name | Type | Description |
|---|---|---|---|
| 1 | `raw_skill` | `TEXT` | Exact unedited input string from job postings. |
| 2 | `atomic_skill` | `TEXT` | Exact extracted atomic skill piece. |
| 3 | `matched_atomic_skill` | `TEXT` | Standard catalog name (or novel name, or 'REJECTED'). |
| 4 | `separated_by` | `VARCHAR(16)` | Delimiter joining this piece: `()`, `&`, `/`, `,`, `-`, `space`, `None`. |
| 5 | `separated_from_before` | `TEXT` | Preceding textual context in the raw skill. |
| 6 | `separated_from_after` | `TEXT` | Succeeding textual context in the raw skill. |
| 7 | `skill_level` | `VARCHAR(32)` | Extracted level: `Advanced`, `Intermediate`, `Beginner`, `Certified`, `Not Specified`. |
| 8 | `skill_type` | `VARCHAR(32)` | `Tool / Software`, `Hard Skill`, `Soft Skill`, `Certification`, `Language`, `Requirement`. |
| 9 | `domain` | `VARCHAR(64)` | Strictly one of the 14 Closed Domains. |
| 10 | `sub_category` | `VARCHAR(64)` | Strictly one of the 61 Closed Subcategories. |
| 11 | `job_count` | `INTEGER` | Empirical postings count from PostgreSQL `job_skills`. |
| 12 | `match_status` | `VARCHAR(32)` | `CATALOG_EXACT_MATCH`, `CATALOG_REGEX_MATCH`, `PARENTHESIS_SPECIFICATION`, `PROTECTED_PROPER_NOUN`, `UNMATCHED_NOVEL`, `REJECTED_NOISE`. |
| 13 | `rejection_reason` | `TEXT` | Reason if rejected (e.g. `Incomplete fragment: 'Editions'`). |

### 2. Sidecar Context Metadata Schema (`egypt_skills_decomposition_metadata.csv` - 8 Columns)

Preserves non-schema information without modifying the 13-column standard schema:

| # | Column Name | Type | Description |
|---|---|---|---|
| 1 | `raw_skill` | `TEXT` | Primary key linking back to `egypt_skills_decomposed_graph.csv`. |
| 2 | `category_container` | `TEXT` | Header wrapper (e.g. `AI Development Tools`, `Caching`). |
| 3 | `industry_context` | `TEXT` | Sector restriction (e.g. `Transportation & Logistics`, `Hospitality/Leisure`). |
| 4 | `experience_duration` | `TEXT` | Extracted duration (e.g. `5+ years`, `3-5 years`). |
| 5 | `parentheses_raw_content`| `TEXT` | Full original text inside parentheses. |
| 6 | `is_composite` | `BOOLEAN` | Whether raw skill decomposed into multiple atomic rows. |
| 7 | `atomic_row_count` | `INTEGER` | Number of child rows produced. |
| 8 | `contains_noise` | `BOOLEAN` | Whether any fragment was rejected as noise. |

---

## Proposed Changes: Modular Component Architecture

The monolithic prototype will be cleanly organized into the `linguistic_intelligence` package:

```
d:\Hire Q Project\
├── linguistic_intelligence/
│   ├── __init__.py
│   ├── config.py                          # Paths, constants, thresholds (READ-ONLY DB conn)
│   ├── vocabularies/
│   │   ├── __init__.py
│   │   ├── protected_compounds.json        # PL/SQL, CI/CD, UI/UX, C/C++, R&D, etc.
│   │   ├── protected_proper_nouns.json     # ADAS, ABAP, Lead Generation, Senior Care, etc.
│   │   ├── valid_short_tokens.json        # 2G, 3G, BI, AI, ML, R, C, Go, etc.
│   │   ├── acronym_dictionary.json        # 386 verified global & Egyptian acronyms
│   │   ├── redundant_suffixes.json        # skills, tools, technologies, suite, level
│   │   ├── noise_tokens.json              # editions, levels, basics, functions, etc.
│   │   ├── languages_catalog.json         # 30+ languages
│   │   ├── soft_skills_catalog.json       # 50+ soft skills
│   │   ├── certifications_catalog.json    # PMP, ISTQB, CFA, CPA, etc.
│   │   └── industry_contexts.json         # Transportation & Logistics, Hospitality, etc.
│   ├── patterns/
│   │   ├── __init__.py
│   │   ├── delimiters.py                  # Delimiter regex engine (/, &, ,, -, and)
│   │   ├── levels.py                      # Level extraction with negative lookaheads
│   │   ├── parentheses.py                 # Typology engine (Level vs Acronym vs Spec vs Industry)
│   │   └── containers.py                  # Container header detector
│   ├── engine/
│   │   ├── __init__.py
│   │   ├── catalog_matcher.py             # Standard catalog exact & regex matcher
│   │   ├── atomic_decomposer.py           # Core 5-pass decomposition engine
│   │   └── metadata_extractor.py          # Sidecar metadata generator
│   └── tests/
│       ├── __init__.py
│       ├── test_benchmark_suite.py        # 12 revalidated benchmark cases
│       ├── test_proper_nouns_suite.py     # Positive & negative level protection tests
│       └── quality_audit_reporter.py      # Full dataset statistical audit generator
├── run_full_atomic_decomposition.py       # Main production runner (Exports both CSVs)
└── .md/                                   # Documentation & Plans
```

---

## Proper Noun Contextual Protection Suite (Positive & Negative Tests)

To eliminate false level extraction while preserving true levels, the level engine implements strict contextual lookaheads:

```python
# Contextual Proper Noun Patterns (LEVEL MUST NOT BE STRIPPED):
PROTECTED_PROPER_NOUN_PATTERNS = [
    # "Lead" as sales prospect, NOT job level:
    re.compile(r'\blead\s+(?:generation|nurturing|management|scoring|acquisition|conversion|tracking)\b', re.I),
    # "Senior" as geriatric/elderly, NOT job seniority:
    re.compile(r'\bsenior\s+(?:care|living|housing|citizens?|services?)\b', re.I),
    # "Advanced" as specific product/threat terminology:
    re.compile(r'\badvanced\s+(?:threat\s+protection|persistent\s+threat|security|analytics|encryption|robotics)\b', re.I),
    re.compile(r'\bgithub\s+advanced\s+security\b', re.I),
    # Proper acronyms:
    re.compile(r'\b(adas|abap|apt|aes|acls|atls|aprn)\b', re.I)
]
```

### Test Assertions Table

| Category | Input Skill | Expected Atomic Skill | Expected Level | Assertion |
|---|---|---|---|---|
| **Positive Test 1** | `Lead Generation` | `Lead Generation` | `Not Specified` | `Lead` NOT stripped |
| **Positive Test 2** | `Lead Management` | `Lead Management` | `Not Specified` | `Lead` NOT stripped |
| **Positive Test 3** | `Senior Care` | `Senior Care` | `Not Specified` | `Senior` NOT stripped |
| **Positive Test 4** | `Senior Living` | `Senior Living` | `Not Specified` | `Senior` NOT stripped |
| **Positive Test 5** | `Advanced Threat Protection` | `Advanced Threat Protection` | `Not Specified` | `Advanced` NOT stripped |
| **Positive Test 6** | `GitHub Advanced Security` | `GitHub Advanced Security` | `Not Specified` | `Advanced` NOT stripped |
| **Negative Test 1** | `Lead Software Engineer` | `Software Engineer` | `Advanced` (or `Lead`) | `Lead` stripped to level |
| **Negative Test 2** | `Senior Python Developer` | `Python Developer` | `Advanced` (or `Senior`) | `Senior` stripped to level |
| **Negative Test 3** | `Advanced Excel` | `Microsoft Excel` (or `Excel`)| `Advanced` | `Advanced` stripped to level |
| **Negative Test 4** | `Advanced Financial Modeling` | `Financial Modeling` | `Advanced` | `Advanced` stripped to level |

---

## Revalidated Benchmark Test Suite (12 Core Cases)

| # | Raw Input Skill | Expected Atomic Rows | Separated By | Skill Level | Skill Type | Status |
|---|---|---|---|---|---|---|
| 1 | `Advanced Excel (Cost & Quantity Tracking)` | `Excel`<br>`Cost`<br>`Quantity Tracking` | `()`<br>`&`<br>`&` | `Advanced`<br>`Not Specified`<br>`Not Specified` | `Tool / Software`<br>`Hard Skill`<br>`Hard Skill` | `CATALOG_EXACT_MATCH`<br>`PARENTHESIS_SPECIFICATION`<br>`PARENTHESIS_SPECIFICATION` |
| 2 | `Advanced Excel skills` | `Excel` | `None` | `Advanced` | `Tool / Software` | `CATALOG_EXACT_MATCH` |
| 3 | `ERP & Advanced Excel` | `ERP Systems`<br>`Microsoft Excel` | `&`<br>`&` | `Not Specified`<br>`Advanced` | `Tool / Software`<br>`Tool / Software` | `CATALOG_EXACT_MATCH`<br>`CATALOG_EXACT_MATCH` (ERP is NOT Advanced!) |
| 4 | `Microsoft Office Suite Advanced` | `Microsoft Office` | `None` | `Advanced` | `Tool / Software` | `CATALOG_EXACT_MATCH` |
| 5 | `ISTQB Advanced Level` | `ISTQB` | `space` | `Advanced` | `Certification` | `UNMATCHED_NOVEL` (Not forced into Foundation level) |
| 6 | `Advanced Editions` | `Editions` | `None` | `Advanced` | `Requirement` | `REJECTED_NOISE` (`Incomplete fragment: Editions`) |
| 7 | `Microsoft Office (Advanced)` | `Microsoft Office` | `()` | `Advanced` | `Tool / Software` | `CATALOG_EXACT_MATCH` (0 duplicate rows) |
| 8 | `Amazon Web Services (AWS) - Advanced` | `AWS` | `()` | `Advanced` | `Tool / Software` | `CATALOG_EXACT_MATCH` (0 duplicate rows) |
| 9 | `PL/SQL (Advanced Development & Performance Tuning)` | `PL/SQL`<br>`Development`<br>`Performance Tuning` | `()`<br>`&`<br>`&` | `Not Specified`<br>`Advanced`<br>`Not Specified` | `Hard Skill`<br>`Hard Skill`<br>`Hard Skill` | `PROTECTED_COMPOUND`<br>`PARENTHESIS_SPECIFICATION`<br>`PARENTHESIS_SPECIFICATION` (PL/SQL NOT forced into Oracle DB!) |
| 10 | `GitHub Actions/GitHub Advanced Security` | `GitHub Actions`<br>`GitHub Advanced Security` | `/`<br>`/` | `Not Specified`<br>`Not Specified` | `Tool / Software`<br>`Tool / Software` | `CATALOG_EXACT_MATCH`<br>`UNMATCHED_NOVEL` (Advanced Security preserved intact!) |
| 11 | `Data Analysis` | `Data Analysis` | `None` | `Not Specified` | `Hard Skill` | `CATALOG_EXACT_MATCH` (Never split on space) |
| 12 | `Python/Bash/Go` | `Python`<br>`Bash`<br>`Go` | `/`<br>`/`<br>`/` | `Not Specified`<br>`Not Specified`<br>`Not Specified` | `Tool / Software`<br>`Tool / Software`<br>`Tool / Software` | `CATALOG_EXACT_MATCH` (Go never rejected by length) |

---

## Full Dataset Quality Audit Reporting

Upon processing all 28,824 skills, the automated reporter will generate `d:\Hire Q Project\decomposition_quality_report.md` containing:
1. **Volume & Decomposition Breakdown:**
   - Total raw input skills (28,824).
   - Unchanged atomic skills vs decomposed composite skills.
   - Total decomposed atomic rows generated.
2. **Taxonomy & Match Status Distribution:**
   - Catalog Exact Matches vs Catalog Regex Matches.
   - Parenthesis Specifications count.
   - Protected Proper Nouns count.
   - Unmatched Novel Skills count.
   - Rejected Noise count & breakdown of top rejection reasons.
3. **Context & Information Preservation Stats:**
   - Records with industry context preserved in sidecar.
   - Records with category containers preserved.
   - Records with duration/experience preserved.
4. **Representative Category Examples:**
   - 10 sample decompositions from Software, Data, Engineering, Finance, Healthcare, and Operations.

---

## Controlled Phased Execution Strategy

- [ ] **Phase 1: Vocabulary & Pattern Decoupling**
  - Export audited JSON lexicons (`protected_compounds.json`, `protected_proper_nouns.json`, `valid_short_tokens.json`, `noise_tokens.json`, `acronym_dictionary.json`).
  - Implement contextual proper noun lookaheads in `linguistic_intelligence/patterns/levels.py`.
- [ ] **Phase 2: Core Engine Refactoring**
  - Implement `atomic_decomposer.py` respecting Decision 1 (Category containers condition), Decision 2 (Industry context to sidecar), Decision 3 (Civil/Structural verified mapping), and Decision 4 (GitHub Advanced Security).
  - Implement `metadata_extractor.py` for the 8-column sidecar file.
- [ ] **Phase 3: Automated Test Verification**
  - Run `test_proper_nouns_suite.py` (positive & negative assertions).
  - Run `test_benchmark_suite.py` (12 revalidated cases).
  - Verify zero regex bleed.
- [ ] **Phase 4: Full Dataset Production Run (Read-Only DB)**
  - Execute `run_full_atomic_decomposition.py` across all 28,824 skills.
  - Export `egypt_skills_decomposed_graph.csv` (13 columns).
  - Export `egypt_skills_decomposition_metadata.csv` (8 columns).
  - Generate `decomposition_quality_report.md`.
- [ ] **Phase 5: User Review & Quality Sign-Off**
  - Present final metrics and representative examples for user inspection.
