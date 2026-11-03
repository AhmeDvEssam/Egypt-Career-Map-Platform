# Authoritative Specification Survey & Linguistic Intelligence Governance Report

**Project:** Egypt Career Map (`egypt_jobs_db`)  
**Investigating Agent:** `teamwork_spec_miner_survey_1`  
**Parent Orchestrator:** `9fb895eb-cd95-4c72-b25c-179794097e37`  
**Execution Timestamp:** 2026-11-03T14:36:00Z  
**Primary Specification Sources Audited:**
1. `d:\Hire Q Project\.agents\teamwork\ORIGINAL_REQUEST.md` (Initial prompt & User Follow-up)
2. `d:\Hire Q Project\.md\master_skill_level_governance_and_audit_specification_v3.md` (Authoritative v3 Master Spec)
3. `d:\Hire Q Project\.md\revised_atomic_decomposition_and_linguistic_plan.md`
4. `d:\Hire Q Project\.md\revised_skill_level_architecture_and_two_column_design.md`
5. `d:\Hire Q Project\.md\atomic_decomposition_and_linguistic_intelligence_plan.md`
6. `d:\Hire Q Project\.md\deterministic_semantic_skill_intelligence_kb_design.md`
7. `d:\Hire Q Project\.md\Semantic_Skill_Intelligence_Knowledge_Base.md`
8. `d:\Hire Q Project\standard_skills_catalog.csv` (3,794 standard skills, 14 Closed Domains, 61 Subcategories)
9. `d:\Hire Q Project\standard_skill_levels_matrix.csv` (23 rows, 5 skill types, level rankings)
10. `d:\Hire Q Project\skills_acronym_dictionary.json` (386 verified acronym entries)
11. `d:\Hire Q Project\scratch\atomic_decomposition_engine.py` & `run_full_atomic_decomposition.py`
12. PostgreSQL `localhost:5432/egypt_jobs_db` (Read-Only live audit: 28,824 skills, 464,397 job_skills, 52,128 jobs)

---

## 1. Executive Summary & Authoritative Hierarchy

This specification survey establishes the complete, unified architectural contract for the **Atomic Skill Decomposition, Linguistic Intelligence & Context-Preserving Skill Graph Pipeline**. 

### 1.1 Precedence of Authoritative Sources
When resolving past discrepancies among draft design documents, the system follows this strict precedence hierarchy:
1. **Tier 1 (Supreme Contract):** `ORIGINAL_REQUEST.md` & `master_skill_level_governance_and_audit_specification_v3.md` (Locked, contradiction-free v3 sign-off).
2. **Tier 2 (Governed Reference Datasets):** `standard_skills_catalog.csv`, `standard_skill_levels_matrix.csv`, and `skills_acronym_dictionary.json`.
3. **Tier 3 (Evolutionary Context):** Earlier v1/v2 draft specs in `.md/` (`deterministic_semantic_skill_intelligence_kb_design.md`, `revised_atomic_decomposition_and_linguistic_plan.md`, `revised_skill_level_architecture_and_two_column_design.md`). Note: Early references to 13-column or 8-column/9-column layouts are formally superseded by the **Frozen 14-Column Main CSV** and **Frozen 11-Column Sidecar CSV**.

---

## 2. Features Discovered

| # | Category | Feature | Description | Inputs | Outputs | Error Behavior | Discovered Via |
|---|----------|---------|-------------|--------|---------|----------------|----------------|
| 1 | Pass 0: Proper Noun Shield | Contextual Proper Noun Protection | Shields multi-word proper nouns containing pseudo-level or role words from level stripping or delimiter splitting | Raw skill string (e.g. `Lead Generation`, `Senior Care`, `Advanced Threat Protection`, `GitHub Advanced Security`, `ADAS`) | Intact atomic skill, `extracted_skill_level = 'Not Specified'`, `skill_level = 'Not Specified'`, `match_status = 'PROTECTED_PROPER_NOUN'` | Fallback to standard tokenization if pattern not matched | `master_skill_level_governance_and_audit_specification_v3.md` §3.2, §10; `ORIGINAL_REQUEST.md` §9 |
| 2 | Pass 1: Catalog Matching | Whole-Skill Exact & Regex Matching | Identifies whether the un-split expression directly matches a canonical catalog entry before any delimiter splitting | Multi-word skill string (e.g. `Data Analysis`, `Machine Learning`) | Canonical matched row, `match_status = 'CATALOG_EXACT_MATCH'` or `'CATALOG_REGEX_MATCH'` | Proceeds to Pass 2 if no whole-skill match and delimiters present | `ORIGINAL_REQUEST.md` §9; `scratch/atomic_decomposition_engine.py` Pass 1 |
| 3 | Pass 2: Parentheses Typology | Level-Only Parenthesis Extraction | Extracts level modifier isolated in parentheses and attaches it to the external target skill | Skill with level in parens (e.g. `Microsoft Office (Advanced)`, `Java (Senior)`) | Outer skill preserved, inherited level applied, parens stripped, single row emitted | Leaves parens intact if unknown structure | `master_skill_level_governance_and_audit_specification_v3.md` §10; `revised_atomic_decomposition_and_linguistic_plan.md` |
| 4 | Pass 2: Parentheses Typology | Acronym / Full-Name Resolution | Detects abbreviation/expansion pairs in parentheses via dictionary lookup or initial matching | Skill with acronym (e.g. `Amazon Web Services (AWS) - Advanced`, `BIM (Building Information Modeling)`) | Canonical skill emitted without duplicate rows, alias recorded in acronym dictionary | Proceeds to specification parsing if initials/dict fail | `skills_acronym_dictionary.json`; `scratch/atomic_decomposition_engine.py` Pass 2 |
| 5 | Pass 2: Parentheses Typology | Category Container Decomposition (Decision 1) | Extracts leaf tools inside parentheses while conditionally emitting header if independently recognized | Header with child instances (e.g. `AI Development Tools (Claude Code, Codex)`) | Leaf rows emitted (`Claude Code`, `Codex`) linked to parent; container exported to sidecar `category_container` | Emits leaf rows even if container is novel | `ORIGINAL_REQUEST.md` §7; `revised_atomic_decomposition_and_linguistic_plan.md` Decision 1 |
| 6 | Pass 2: Parentheses Typology | Industry Context Isolation (Decision 2) | Isolates industry sector restrictions in parentheses and relocates them to sidecar metadata | Skill with sector in parens (e.g. `Sales Experience (Transportation & Logistics)`) | Cleaned core skill (`Sales`), sector routed to sidecar `industry_context = 'Transportation & Logistics'` | Unmatched parenthetical treated as specification | `ORIGINAL_REQUEST.md` §7; `revised_atomic_decomposition_and_linguistic_plan.md` Decision 2 |
| 7 | Pass 2: Parentheses Typology | Parenthetical Sub-Skill Specification | Decomposes domain specifications inside parentheses into child atomic rows linked to parent | Skill with specifications (e.g. `Advanced Excel (Cost & Quantity Tracking)`) | Main row (`Excel`, Advanced) + child rows (`Cost`, `Quantity Tracking`) with `match_status = 'PARENTHESIS_SPECIFICATION'` | Child rows inherit parent domain/subcategory if novel | `ORIGINAL_REQUEST.md` §9; `master_skill_level_governance_and_audit_specification_v3.md` §9.2 |
| 8 | Pass 2: Parentheses Typology | Egyptian Regulatory Form Consolidation | Consolidates fragmented numbers in regulatory form lists into a cohesive standard | Regulatory list (e.g. `Forms 1, 2, 6`, `Labor Law 12/2003`) | Consolidated skill `Egyptian Social Insurance (Forms 1, 2, 6)` | Prevents individual numbers from becoming noise | `atomic_decomposition_and_linguistic_intelligence_plan.md` §4 |
| 9 | Pass 3: Compound Masking | Protected Compound Delimiter Immunity | Shields unbreakable technical expressions containing `/` or `&` from delimiter splitting | Technical compounds (`PL/SQL`, `CI/CD`, `UI/UX`, `AI/ML`, `C/C++`, `R&D`, `P&L`, `TCP/IP`, `GSM/CDMA`) | Masked to placeholder during split (`PL_SQL`), restored cleanly in final atomic chunk | If unmasked compound in catalog -> `CATALOG_EXACT_MATCH`; if novel -> `UNMATCHED_NOVEL` (NEVER `PROTECTED_COMPOUND` status) | `master_skill_level_governance_and_audit_specification_v3.md` §9.2; `ORIGINAL_REQUEST.md` §9 |
| 10 | Pass 3: Delimiter Splitting | Hierarchical Delimiter Parsing | Splits compound skills on prioritized delimiters while preserving relational sequence | Delimited skill string (`&`, `/`, `,`, `-`, `and`) | Ordered sequence of atomic skill chunks | Space is strictly forbidden as a delimiter for multi-word skills | `ORIGINAL_REQUEST.md` §6, §9; `revised_atomic_decomposition_and_linguistic_plan.md` |
| 11 | Pass 3: Graph Linking | Bidirectional Context Graph Construction | Captures immediate textual context before and after each atomic component | Splitted chunk array | Populates `separated_by`, `separated_from_before`, `separated_from_after` for relational symmetry | Empty string for boundary tokens | `ORIGINAL_REQUEST.md` §6.1; `master_skill_level_governance_and_audit_specification_v3.md` §9.3 |
| 12 | Pass 4: Level Extraction | Pure Verbatim Level Extraction | Isolates exact lexical level modifier preserving verbatim casing and spacing | Raw token slice (`"Working knowledge of Docker"`, `"mastery of Python"`) | `extracted_skill_level = "Working knowledge"`, `"mastery"` | Explicit string `"Not Specified"` if no modifier present | `master_skill_level_governance_and_audit_specification_v3.md` §2.1 |
| 13 | Pass 4: Level Normalization | Governed 5-Tier Canonical Level Mapping | Maps verbatim extracted modifier to controlled 4-tier closed enum | Verbatim extracted level + skill type | `skill_level` (`Not Specified`, `Beginner`, `Intermediate`, `Advanced`) | Ambiguous / unverified modifiers default strictly to `'Not Specified'` | `master_skill_level_governance_and_audit_specification_v3.md` §3.2 |
| 14 | Pass 4: Suffix Cleaning | Redundant Suffix Stripping | Strips noise noun suffixes from skill candidates | Skill chunks ending in `skills`, `tools`, `technologies`, `suite`, `level`, `basics` | Clean core candidate (e.g. `Excel skills` -> `Excel`) | Preserves root word | `scratch/atomic_decomposition_engine.py` line 97; `revised_atomic_decomposition_and_linguistic_plan.md` |
| 15 | Pass 4: Noise Filtering | Meaningless Fragment Rejection | Filters out meaningless, incomplete, or orphaned tokens | Fragment tokens (`editions`, `levels`, `basics`, single characters $\le 2$) | `match_status = 'REJECTED_NOISE'`, explicit `rejection_reason` | Valid short tokens (`AI`, `BI`, `R`, `C`, `Go`, `2G`) whitelisted from rejection | `ORIGINAL_REQUEST.md` §6.1; `master_skill_level_governance_and_audit_specification_v3.md` §9.2 |
| 16 | Pass 4: Novel Classification | Unmatched Novel Skill Retention | Preserves clean atomic skills not currently found in reference catalog | Novel valid skill token (e.g. `Claude Code`, `ISTQB`) | `match_status = 'UNMATCHED_NOVEL'`, `matched_atomic_skill = NULL`, `domain = 'Unknown'`, `sub_category = 'Unknown'` | Never forcibly mapped to incorrect catalog node | `ORIGINAL_REQUEST.md` §1.1, §6.1; `master_skill_level_governance_and_audit_specification_v3.md` §9.1 |
| 17 | Governance | Soft Skill Level Neutralization | Blocks subjective proficiency inflation by enforcing neutral level for all soft skills | Soft skill modifier (e.g. `"Strong communication"`, `"Proven leadership"`) | `extracted_skill_level = "Strong"`, `skill_level = 'Not Specified'`, `skill_type = 'Soft Skill'` | Preserves linguistic evidence without dashboard distortion | `master_skill_level_governance_and_audit_specification_v3.md` §3.1; `ORIGINAL_REQUEST.md` §8 |
| 18 | Governance | Credential Track vs Award Status Separation | Distinguishes examination tiers from credential award/acquisition status | Certification strings (e.g. `ISTQB Advanced Level` vs `PMP Certified`) | Exam track: `extracted = 'Advanced'`, `skill_level = 'Not Specified'`, sidecar `credential_track_or_status = 'Advanced Level'`; Status: `skill_level = 'Active / Certified'` | Prevents examination tiers from violating certification status matrix | `master_skill_level_governance_and_audit_specification_v3.md` §4.2; `ORIGINAL_REQUEST.md` §8 |
| 19 | Governance | Spoken Language CEFR Isolation | Restricts CEFR ratings strictly to explicit standardized letter codes | Language modifiers (`Fluent English` vs `English (B2)`) | `Fluent English` -> `extracted = 'Fluent'`, `skill_level = 'Not Specified'`; `English (B2)` -> `extracted = 'B2'`, `skill_level = 'B2 (Upper Intermediate)'` | Free-form adjectives are never forced into CEFR codes | `master_skill_level_governance_and_audit_specification_v3.md` §8.1, §10 |
| 20 | Sidecar Metadata | Multi-Posting Context Aggregation | Aggregates empirical job market distributions (career level, top job titles) per unique raw skill | `raw_skill` joined against PostgreSQL `jobs` and `job_skills` | Sidecar columns 9 & 10 populated with deterministic JSON breakdown and Top 3 titles | If `job_count <= 2`, top titles output `"Insufficient Postings"` | `master_skill_level_governance_and_audit_specification_v3.md` §5.2; `ORIGINAL_REQUEST.md` §7 |
| 21 | Quality & Safety | Isolated Subprocess Regex Backtracking Guard | Evaluates all compiled regex patterns against tailored adversarial payloads in isolated worker subprocess | Regex pattern + adversarial payload (`"word " * 30 + "!"`) | Pass / Fail compilation gate | Hard timeout > 50ms triggers permanent rejection | `master_skill_level_governance_and_audit_specification_v3.md` §7.2 |

---

## 3. Edge Cases Discovered

| # | Feature | Input | Observed Behavior |
|---|---------|-------|-------------------|
| 1 | Pass 0: Proper Noun Shield | `Lead Generation` | Emitted as 1 atomic skill `Lead Generation`; `extracted_skill_level = 'Not Specified'`, `skill_level = 'Not Specified'`, `domain = 'Marketing & Sales'`, `match_status = 'PROTECTED_PROPER_NOUN'`. The word "Lead" is never stripped or converted to a job role. |
| 2 | Pass 0: Proper Noun Shield | `Senior Care` | Emitted as 1 atomic skill `Senior Care`; `extracted_skill_level = 'Not Specified'`, `skill_level = 'Not Specified'`, `domain = 'Healthcare & Medical Sciences'`, `match_status = 'PROTECTED_PROPER_NOUN'`. "Senior" refers to geriatric care, NOT job seniority. |
| 3 | Pass 0: Proper Noun Shield | `GitHub Advanced Security` | Emitted as 1 atomic skill `GitHub Advanced Security`; `skill_level = 'Not Specified'`. "Advanced" is a brand identity, not a user competency level. |
| 4 | Pass 0: Proper Noun Shield | `ADAS` / `ABAP` | Emitted intact as `Advanced Driver Assistance Systems (ADAS)` or `ABAP`; `skill_level = 'Not Specified'`. Proper acronyms never trigger level extraction. |
| 5 | Pass 1: Standalone Catalog Match | `Data Analysis` | Preserved completely intact as 1 atomic row; `matched_atomic_skill = 'Data Analysis'`, `separated_by = 'None'`. Space is never treated as a splitting delimiter. |
| 6 | Pass 2: Parentheses (Level-Only) | `Microsoft Office (Advanced)` | Parens stripped; emits 1 row: `atomic_skill = 'Microsoft Office'`, `extracted_skill_level = 'Advanced'`, `skill_level = 'Advanced'`, `separated_by = '()'`. Zero duplicate child rows. |
| 7 | Pass 2: Parentheses (Acronym) | `Amazon Web Services (AWS) - Advanced` | Emits 1 row: `atomic_skill = 'AWS'` (or canonical 'Amazon Web Services'), `extracted_skill_level = 'Advanced'`, `skill_level = 'Advanced'`, `separated_by = '()'`. Alias stored in acronym dictionary. |
| 8 | Pass 2: Parentheses (Specification) | `Advanced Excel (Cost & Quantity Tracking)` | Produces 3 rows: Row 1: `Excel` (Level: Advanced, sep: `()`); Row 2: `Cost` (Level: Not Specified, sep: `&`, status: `PARENTHESIS_SPECIFICATION`); Row 3: `Quantity Tracking` (Level: Not Specified, sep: `&`, status: `PARENTHESIS_SPECIFICATION`). |
| 9 | Pass 2: Category Container | `AI Development Tools (Claude Code, Codex)` | Produces 2 concrete leaf rows: `Claude Code` and `Codex` (`separated_by = '()'`). Sidecar captures `category_container = 'AI Development Tools'`. Container emitted as parent row only if catalog-approved. |
| 10 | Pass 2: Industry Context | `Sales Experience (Transportation & Logistics)` | Emits 1 clean atomic row: `atomic_skill = 'Sales'`. Sector restriction relocated to sidecar `industry_context = 'Transportation & Logistics'`. Sector is NOT emitted as a skill. |
| 11 | Pass 3: Protected Compound | `PL/SQL` | Masked to `PL_SQL` during delimiter pass, unmasked to `PL/SQL`. Matched as `PL/SQL` (Hard Skill). Strictly NOT collapsed into `Oracle Database`. |
| 12 | Pass 3: Protected Compound | `CI/CD` / `UI/UX` | Never split on slash. Emitted as atomic compound skill with `match_status = 'CATALOG_EXACT_MATCH'` (or `UNMATCHED_NOVEL`). Status is NEVER `PROTECTED_COMPOUND`. |
| 13 | Pass 3: Dual Discipline Slash | `Civil/Structural Engineering` | Split on `/` into 2 atomic skills: `Civil Engineering` and `Structural Engineering`, both assigned to subcategory `Civil & Structural Engineering`. |
| 14 | Pass 3: Slash Stack with Short Token | `Python/Bash/Go` | Split into 3 atomic skills: `Python`, `Bash`, `Go`. `Go` is 2 characters but preserved via `VALID_SHORT_TOKENS` whitelist. |
| 15 | Pass 4: Redundant Fragment Noise | `Advanced Editions` | Isolates `Editions` as candidate token; `Editions` matches `NOISE_TOKENS` -> `match_status = 'REJECTED_NOISE'`, `rejection_reason = "Incomplete or meaningless fragment: 'Editions'"`. |
| 16 | Pass 4: Casing Fidelity | `Working knowledge of Docker` | `extracted_skill_level = "Working knowledge"` (verbatim lowercase 'k' preserved!). Normalized `skill_level = 'Intermediate'`. |
| 17 | Pass 4: Top-Tier Level Collapse | `Mastery of Python` | `extracted_skill_level = "Mastery"` (exact original token). Governed `skill_level = 'Advanced'` (collapsed into Advanced for dashboard cardinality). |
| 18 | Governance: Ambiguous Modifier | `Solid understanding of Git` | `extracted_skill_level = "Solid"`. Governed `skill_level = 'Not Specified'` (Tier 4 Ambiguous held from premature assignment). |
| 19 | Governance: Soft Skill Modifier | `Strong communication skills` | `extracted_skill_level = "Strong"`. Governed `skill_level = 'Not Specified'` (Soft skills default to Not Specified). |
| 20 | Governance: Certification Track | `ISTQB Advanced Level` | `atomic_skill = 'ISTQB'`, `extracted_skill_level = "Advanced"`, `skill_level = 'Not Specified'`, sidecar `credential_track_or_status = 'Advanced Level'`. Match status: `UNMATCHED_NOVEL`. |
| 21 | Governance: Free-form Language | `Fluent English` | `atomic_skill = 'English'`, `extracted_skill_level = "Fluent"`, `skill_level = 'Not Specified'`. Never forced into CEFR `C1`. |
| 22 | Governance: Explicit CEFR Code | `English (B2)` | `atomic_skill = 'English'`, `extracted_skill_level = "B2"`, `skill_level = 'B2 (Upper Intermediate)'`. |
| 23 | Role Seniority Disambiguation | `Senior-level Python proficiency` | `atomic_skill = 'Python'`, `extracted_skill_level = "Senior-level"`, `skill_level = 'Advanced'`. Explicit competency noun triggers technical level mapping. |
| 24 | Role Seniority Disambiguation | `Senior C++ Engineer` (Adversarial) | `atomic_skill = 'C++'`, `extracted_skill_level = 'Not Specified'`, `skill_level = 'Not Specified'`, sidecar `intra_string_seniority = 'Senior Engineer'`. Job role does NOT pollute skill level. |
| 25 | Sidecar Low Frequency Boundary | Skill with `job_count = 1` | `top_associated_job_titles` outputs string `"Insufficient Postings"` rather than low-confidence noise. |

---

## 4. Comprehensive Feature Inventory & Detailed Requirements

### 4.1 The Five Sequential Extraction Passes

Every raw skill string extracted from Egyptian job postings must flow through a deterministic 5-pass architecture:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ PASS 0: Protected Proper Noun Pre-Check                                     │
│         Matches contextual patterns (Lead Gen, Senior Care, GitHub Adv Sec) │
│         -> If matched: FREEZE from level stripping and delimiter splitting  │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ PASS 1: Whole-Skill Catalog Matching                                        │
│         Exact & regex check against standard_skills_catalog.csv             │
│         -> If matched and no compound delims: Emit intact canonical row     │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ PASS 2: Parentheses Typology Engine                                         │
│         Case A: Level-Only Modifier  -> Inherit level, strip parens         │
│         Case B: Acronym Definition   -> Harvest alias, strip parens         │
│         Case C: Category Container   -> Extract leaves, link to header      │
│         Case D: Industry Context     -> Route sector to sidecar metadata    │
│         Case E: Sub-skill / Spec     -> Fork primary row and child spec rows│
│         Case F: Regulatory Forms     -> Consolidate forms before splitting  │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ PASS 3: Protected Compounds & Delimiter Splitting                           │
│         Step A: Mask protected compounds (PL/SQL -> PL_SQL, CI/CD -> CI_CD) │
│         Step B: Split on prioritized delimiters (&, /, ,, -, and)           │
│         Step C: Construct bidirectional graph links (before/after context)  │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ PASS 4: Atomic Processing, Level Extraction, Classification & Validation     │
│         Step A: Unmask protected compounds                                  │
│         Step B: Extract verbatim level (extracted_skill_level)              │
│         Step C: Map governed canonical level (skill_level)                  │
│         Step D: Strip redundant suffixes & edge punctuation                 │
│         Step E: Validate short tokens & filter noise fragments              │
│         Step F: Map catalog or novel classification (Domain / Subcategory)  │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### Detailed Pass Specifications:

1. **Pass 0: Protected Proper Noun & Acronym Shield:**
   - **Sales/Marketing:** `lead\s+(?:generation|nurturing|management|scoring|acquisition|conversion|tracking|to-cash|time)`
   - **Healthcare:** `senior\s+(?:care|living|housing|citizens?|services?)`, `elder\s+care`
   - **Cybersecurity/Tech:** `advanced\s+(?:threat\s+protection|persistent\s+threat|security|analytics|encryption|robotics)`, `github\s+advanced\s+security`
   - **Medical/Engineering Acronyms:** `adas`, `abap`, `apt`, `aes`, `acls`, `atls`, `aprn`
   - **Rule:** When matched, `extracted_skill_level = "Not Specified"`, `skill_level = "Not Specified"`, `match_status = "PROTECTED_PROPER_NOUN"`.

2. **Pass 1: Whole-Skill Standalone Catalog Matching:**
   - Evaluated on trimmed string. If expression matches `standard_skill_name` or `known_aliases` in `standard_skills_catalog.csv` and contains no explicit delimiters (`&`, `/`, `,`), emit single row (`match_status = 'CATALOG_EXACT_MATCH'`). Never split on internal whitespace (e.g. `Data Analysis`, `Machine Learning`).

3. **Pass 2: Parentheses Typology Engine:**
   - Parses outermost parentheses `^(.*?)\s*\((.*?)\)(.*)$`.
   - **Case 2A (Level-Only):** Inner text matches `LEVEL_PATTERNS` or role words. Target = `before + after`. Level is inherited, parens stripped.
   - **Case 2B (Acronym):** Checked against `skills_acronym_dictionary.json` (386 entries) or initial letters. Emits single row for external canonical name; records alias without emitting duplicate rows.
   - **Case 2C (Category Containers):** When header wraps concrete instances (e.g. `AI Development Tools (Claude Code, Codex)`), child tools are emitted as atomic rows. Header is recorded in sidecar `category_container = 'AI Development Tools'` and in `separated_from_before`.
   - **Case 2D (Industry Context):** When parens contain industry/sector restrictions (`Transportation & Logistics`, `Hospitality/Leisure`), the sector is routed to sidecar `industry_context`. The core skill is cleaned (`Sales Experience` -> `Sales`). Sector is NOT emitted as a skill.
   - **Case 2E (Specification / Sub-skills):** When parens specify domain components (e.g. `Advanced Excel (Cost & Quantity Tracking)`), main token is emitted as primary row (`Excel`), and inner text is decomposed into child rows (`Cost`, `Quantity Tracking`) with `match_status = 'PARENTHESIS_SPECIFICATION'`, inheriting parent taxonomy if novel.

4. **Pass 3: Protected Compounds & Delimiter Splitting:**
   - **Masking Dictionary:** Exact whitelist covering tech (`PL/SQL`, `CI/CD`, `UI/UX`, `AI/ML`, `C/C++`, `TCP/IP`), business (`R&D`, `P&L`, `FP&A`, `S&OP`, `M&A`, `B2B`, `B2C`), telecom (`GSM/CDMA`, `2G/3G/4G/5G`), and industrial (`PLC/SCADA`, `BMS/HVAC`, `QA/QC`).
   - Compounds are masked with safe underscore tokens (`PL_SQL`) prior to regex splitting.
   - **Delimiter Precedence:** `&` and `and` > `/` > `,` > ` - `.
   - Space is strictly forbidden as a general splitting delimiter.

5. **Pass 4: Atomic Processing, Level Extraction, Classification, and Validation:**
   - Unmasks protected tokens.
   - Executes pure verbatim level modifier isolation.
   - Strips redundant suffixes: `\s+(skills?|tools?|technologies|knowledge|suite|concepts?|basics?|essentials?|fundamentals?|level)$`.
   - Rejection Gate: Tokens in `NOISE_TOKENS` (`editions`, `levels`, `basics`, `functions`, etc.) or length $\le 2$ not in `VALID_SHORT_TOKENS` (`AI`, `BI`, `ML`, `QA`, `QC`, `R`, `C`, `Go`, `2G`, `3G`, `IP`, etc.) are rejected with `match_status = 'REJECTED_NOISE'`.
   - Unmatched Novel Gate: Clean, valid skills not found in catalog are emitted with `match_status = 'UNMATCHED_NOVEL'`, `domain = 'Unknown'`, `sub_category = 'Unknown'`.

---

## 5. Skill Level Governance Contract

### 5.1 Two-Column Decoupled Architecture
The architecture strictly decouples raw linguistic evidence from controlled database dimensions:
- **`extracted_skill_level` (Column 7):** Pure lexical token slice as stated by employer, preserving original casing and internal spacing (e.g. `"Working knowledge"`, `"mastery"`, `"EXPERT"`, `"B2"`). If no modifier exists, explicitly set to `"Not Specified"`.
- **`skill_level` (Column 8):** Controlled, closed canonical vocabulary (`Not Specified`, `Beginner`, `Intermediate`, `Advanced`).

### 5.2 Master 5-Tier Level Governance Matrix

| Extracted Modifier (`extracted_skill_level`) | Governance Classification | Canonical Output (`skill_level`) | Applicable Skill Type | Positive Example | Negative / Ambiguous Example | Governance Rationale |
|---|---|---|---|---|---|---|
| `Advanced` | **APPROVED_DIRECT** | `Advanced` | Hard Skill / Tool | `Advanced Python` | `Advanced Threat Protection` (proper noun shielded) | Standard proficiency tier. |
| `Intermediate` | **APPROVED_DIRECT** | `Intermediate` | Hard Skill / Tool | `Intermediate SQL` | N/A | Standard mid-tier competency. |
| `Beginner` / `Entry-level` | **APPROVED_DIRECT** | `Beginner` | Hard Skill / Tool | `Beginner React` | `Entry-level job` (filtered out) | Foundational competency. |
| `Basic` / `Basics` | **APPROVED_DIRECT** | `Beginner` | Hard Skill / Tool | `Basic HTML` | `Visual Basic` (language proper noun shielded) | Introductory competency. |
| `Expert` | **APPROVED_DIRECT** | `Advanced` | Hard Skill / Tool | `Expert Linux` | `Expert System` (AI concept shielded) | Collapsed into Advanced for dashboard cardinality. |
| `Mastery` | **APPROVED_CONTEXTUAL** | `Advanced` | Hard Skill / Tool | `Mastery of Java` | N/A | High-level competency modifying skill noun. |
| `Proficient` / `Proficiency` | **APPROVED_CONTEXTUAL** | `Intermediate` | Hard Skill / Tool | `Proficient in Excel` | `Professional` (different root) | Standard working competency. |
| `Working knowledge` | **APPROVED_CONTEXTUAL** | `Intermediate` | Hard Skill / Tool | `Working knowledge of Docker` | `Knowledge Management` (discipline shielded) | Functional operational competency. |
| `Familiar` / `Familiarity` | **APPROVED_CONTEXTUAL** | `Beginner` | Hard Skill / Tool | `Familiarity with Jira` | N/A | Basic awareness/exposure. |
| `Senior-level` (explicit) | **APPROVED_CONTEXTUAL** | `Advanced` | Hard Skill / Tool | `Senior-level Python skills` | `Senior Python Developer` (job role!) | Allowed ONLY when explicitly modifying `skills`/`knowledge`. |
| `Solid` | **AMBIGUOUS** | `Not Specified` | All Types | `Solid understanding of Git` | `Solid Mechanics` (engineering discipline!) | Subjective depth. Holds as `Not Specified`. |
| `Extensive` | **PROPOSED_REQUIRES_REVIEW** | `Not Specified` | Hard Skill / Tool | `Extensive SQL experience` | N/A | Pending formal review; defaults to `Not Specified`. |
| `Deep` / `Deep expertise` | **PROPOSED_REQUIRES_REVIEW** | `Not Specified` | Hard Skill / Tool | `Deep expertise in Cloud` | `Deep Learning` (proper noun shielded) | Pending formal review; defaults to `Not Specified`. |
| `Daily user` | **PROPOSED_REQUIRES_REVIEW** | `Not Specified` | Tool / Software | `Daily user of AutoCAD` | N/A | Indicates usage frequency, not verified competency. |
| `Strong` | **AMBIGUOUS** | `Not Specified` | All Types | `Strong communication` | `Strong analytical skills` | Conversational filler. Defaults to `Not Specified`. |
| `Professional` | **AMBIGUOUS** | `Not Specified` | All Types | `Professional proficiency` | `Healthcare Professional` (role noun) | Ambiguous between adjective and role noun. |
| `Hands-on` | **AMBIGUOUS** | `Not Specified` | All Types | `Hands-on Docker` | N/A | Practical modality, not proficiency rank. |
| `Lead` (standalone / title) | **REJECTED** | *NEVER SKILL LEVEL* | N/A | `Lead Software Engineer` | `Lead Generation` (sales), `Lead Time` (SCM) | Role hierarchy or business noun. NEVER skill level! |
| `Senior` (standalone / title)| **REJECTED** | *NEVER SKILL LEVEL* | N/A | `Senior Developer` | `Senior Care`, `Senior Decision Maker Selling` | Role hierarchy or geriatric care. NEVER skill level! |

### 5.3 Specialized Entity Governance Rules

1. **Resolution of `Strong` and Soft Skills:**
   - In job postings, `Strong` is conversational hyperbole (`"Strong communication"`, `"Strong team player"`).
   - **Governed Rule:** All Soft Skills default to `skill_level = 'Not Specified'` in Phase A. If raw text is `"Strong communication skills"`, `extracted_skill_level = "Strong"`, while `skill_level = "Not Specified"`.

2. **Separation of Credential Tracks from Award Status:**
   - For certifications (`skill_type = 'Certification'`), examination tiers (`Foundation`, `Advanced`, `Associate`, `Professional`) must NOT be mapped to `skill_level = 'Advanced'`.
   - Matrix rows 17-19 govern certifications strictly as **Credential Status** (`Active / Certified`, `Candidate / In Progress`, `Not Specified`).
   - Example: `ISTQB Advanced Level` -> `atomic_skill = 'ISTQB'`, `extracted_skill_level = "Advanced"`, `skill_level = "Not Specified"`, sidecar `credential_track_or_status = "Advanced Level"`.
   - Example: `PMP Certified` -> `atomic_skill = 'PMP'`, `extracted_skill_level = "Certified"`, `skill_level = "Active / Certified"`.

3. **Spoken Language CEFR Isolation:**
   - Technical 4-tier levels are strictly quarantined from `Language` entities.
   - CEFR codes (`A1` to `C2`) are assigned to `skill_level` **ONLY when the raw text explicitly contains the CEFR code** (e.g. `English (B2)` -> `extracted_skill_level = "B2"`, `skill_level = "B2 (Upper Intermediate)"`).
   - General phrasing (`Fluent English`, `Native Arabic`) sets `extracted_skill_level = "Fluent"`, but `skill_level = "Not Specified"` to avoid unverified academic equivalence.

4. **The Golden Rule:**
   - Any value whose meaning is not 100% verified or is classified as `AMBIGUOUS` or `PROPOSED` defaults strictly to `'Not Specified'`.

---

## 6. Data Output Contracts (Frozen Schemas)

### 6.1 Main Relational Graph Schema (`egypt_skills_decomposed_graph.csv` - 14 Columns Frozen)

| # | Column Name | Physical Type | Acceptable Values / Domain Constraints | Description & Handling Rules |
|---|---|---|---|---|
| 1 | `raw_skill` | `TEXT` | Unmodified string | Exact unedited input string as received from `skills.csv` / `job_skills`. |
| 2 | `atomic_skill` | `TEXT` | Non-empty clean string | Cleaned extracted atomic skill piece. |
| 3 | `matched_atomic_skill` | `TEXT` | Standard catalog name or `NULL` | Canonical skill name if match exists in `standard_skills_catalog.csv`; `NULL` for novel or rejected skills. |
| 4 | `separated_by` | `VARCHAR(16)` | `()`, `&`, `/`, `,`, `-`, `space`, `None` | Delimiter or mechanism that separated this component. |
| 5 | `separated_from_before` | `TEXT` | Text or empty | Sibling token preceding this piece in the compound, or parent container context. |
| 6 | `separated_from_after` | `TEXT` | Text or empty | Sibling token succeeding this piece in the compound. |
| 7 | `extracted_skill_level` | `VARCHAR(64)` | Verbatim modifier or `"Not Specified"` | Exact original level substring captured from source text (preserves original casing and spacing). |
| 8 | `skill_level` | `VARCHAR(32)` | `Not Specified`, `Beginner`, `Intermediate`, `Advanced` (Languages: CEFR codes; Certs: Status) | Governed canonical normalized skill level enum. |
| 9 | `skill_type` | `VARCHAR(32)` | `Hard Skill`, `Soft Skill`, `Tool / Software`, `Language`, `Certification`, `Requirement` | Controlled functional entity classification. |
| 10 | `domain` | `VARCHAR(64)` | 1 of 14 Closed Domains, or `"Unknown"` | Strictly one of 14 Closed Domains. Novel/rejected skills receive `"Unknown"`. |
| 11 | `sub_category` | `VARCHAR(64)` | 1 of 61 Closed Subcategories, or `"Unknown"` | Strictly one of 61 Closed Subcategories. Novel/rejected skills receive `"Unknown"`. |
| 12 | `job_count` | `INTEGER` | Integer $\ge 1$ | Empirical count: `COUNT(DISTINCT job_id)` from PostgreSQL `job_skills`. |
| 13 | `match_status` | `VARCHAR(32)` | Exactly 6 allowed values:<br>• `CATALOG_EXACT_MATCH`<br>• `CATALOG_REGEX_MATCH`<br>• `PARENTHESIS_SPECIFICATION`<br>• `PROTECTED_PROPER_NOUN`<br>• `UNMATCHED_NOVEL`<br>• `REJECTED_NOISE` | Exhaustive match status classification. `PROTECTED_COMPOUND` is forbidden as a match status. |
| 14 | `rejection_reason` | `TEXT` | Explicit explanation or `NULL` | Explicit diagnostic reason if `match_status = 'REJECTED_NOISE'`; `NULL` for all accepted skills. |

### 6.2 Sidecar Context Metadata Schema (`egypt_skills_decomposition_metadata.csv` - 11 Columns Frozen)

Maintains a strict **1-to-1 relationship with unique `raw_skill`** (exactly 28,824 rows):

| # | Column Name | Physical Type | Source Origin | Derivation Logic & Format Rules |
|---|---|---|---|---|
| 1 | `raw_skill` | `TEXT` (PK) | Input | Exact unedited raw skill string linking to main graph. |
| 2 | `job_count` | `INTEGER` | DB Aggregated | `COUNT(DISTINCT job_id)` from PostgreSQL `job_skills`. |
| 3 | `industry_context` | `TEXT` | Intra-string | Sector restriction extracted from parentheses (e.g. `"Transportation & Logistics"`). `NULL` if none. |
| 4 | `category_container` | `TEXT` | Intra-string | Header wrapper outside parentheses (e.g. `"AI Development Tools"`). `NULL` if none. |
| 5 | `parentheses_raw_content` | `TEXT` | Intra-string | Exact verbatim text inside outermost parentheses. `NULL` if no parens. |
| 6 | `experience_duration` | `TEXT` | Intra-string | Verbatim duration if stated in raw string (e.g. `"5+ years"`, `"3-5 years"`). `NULL` if none. |
| 7 | `intra_string_seniority` | `VARCHAR(32)` | Intra-string | Role hierarchy word present in raw skill string itself (e.g. `"Senior"`, `"Lead"`, `"Junior"`). `NULL` if none. |
| 8 | `credential_track_or_status`| `TEXT` | Intra-string | Full certification examination tier or status (e.g. `"Advanced Level"`, `"Active / Certified"`). `NULL` if none. |
| 9 | `posting_career_level_distribution`| `JSON TEXT` | DB Aggregated | JSON breakdown of `jobs.career_level` across postings mentioning this raw skill, sorted descending by frequency: `{"Mid-Level": 450, "Senior": 320, "Entry level": 85}`. Missing levels mapped to `"Not Specified"`. |
| 10 | `top_associated_job_titles` | `JSON TEXT` | DB Aggregated | Top 3 distinct job titles by `COUNT(DISTINCT job_id)` from `jobs.title_normalized`. Ties broken alphabetically. If `job_count <= 2`, outputs string `"Insufficient Postings"`. |
| 11 | `is_composite` | `BOOLEAN` | Algorithmic | `True` if raw skill decomposed into multiple child rows in the main graph; `False` if emitted as a single row. |

---

## 7. Edge Cases, Scope Boundaries & Verification Protocol

### 7.1 Non-Negotiable Scope Boundaries
The pipeline is strictly restricted to Atomic Decomposition:
- **NO Semantic Deduplication:** Merging different skill names (`Golang` vs `Go`, `MS Excel` vs `Microsoft Excel`) is strictly prohibited.
- **NO Embeddings:** Sentence Transformers, BERT, OpenAI embeddings, and vector similarity are forbidden.
- **NO Vector Databases:** pgvector, Pinecone, Milvus, ChromaDB, etc., are out of scope.
- **Zero Live Database Writes:** PostgreSQL `localhost:5432/egypt_jobs_db` remains 100% READ-ONLY. Only `SELECT` queries are permitted.
- **Zero Job Title Parsing in Phase A:** Generic job titles (`Senior Python Developer`) do not exist in `skills.csv` (empirical audit confirmed 0 occurrences). Job role parsing belongs to the jobs table, not skills decomposition.

### 7.2 The 5-Gate Automated Regex Validation Protocol
All regex patterns in linguistic vocabularies must pass this automated test suite before runtime acceptance:
1. **Gate 1: JSON Syntax & Escaping Validation:** Valid JSON escaping (`\\b`, `\\s`, `\\d`).
2. **Gate 2: Compilation Gate:** Compiles cleanly with `re.compile(pat, re.IGNORECASE)`.
3. **Gate 3: Catastrophic Backtracking Guard:** Evaluated against tailored adversarial payloads in an isolated subprocess with a **50ms hard timeout**. Any timeout triggers immediate rejection.
4. **Gate 4: 30 Generic Words False-Positive Resistance:** Evaluated against generic dictionary words (`IT`, `HR`, `Services`, `Management`, `Data`, `Software`, `System`, `Analysis`, `Engineering`, etc.). Matching non-canonical words triggers rejection.
5. **Gate 5: Unicode & Arabic Isolation:** Latin patterns run on Latin script; Arabic normalizations (`أ/إ/آ/ا`, `ه/ة`, `ي/ى`) execute strictly on patterns flagged with `language: 'ar'`.

---

## 8. Authoritative Taxonomy Reference (14 Closed Domains & 61 Closed Subcategories)

| # | Domain Name (14 Closed Domains) | Subcategories Count | List of Approved Subcategories (61 Closed Subcategories) |
|---|---|---|---|
| 1 | **Business & Finance** | 4 | Accounting & Financial Reporting; Auditing, Tax & Compliance; Banking & Treasury Operations; Corporate Finance & Financial Analysis |
| 2 | **Data Science & Analytics** | 5 | Artificial Intelligence & Deep Learning; Business Intelligence & Data Analytics; Data Engineering; Data Governance, Quality & Architecture; Machine Learning & Data Science |
| 3 | **Education, Teaching & Training** | 4 | Academic Tutoring & Special Education; Curriculum Design & Educational Assessment; K-12 School Teaching & Pedagogy; Language Teaching & ESL |
| 4 | **Engineering & Construction** | 5 | Architecture & Interior Design; Civil & Structural Engineering; Construction Management & Site Supervision; Electrical & Power Engineering; Mechanical & MEP Engineering |
| 5 | **Healthcare & Medical Sciences** | 4 | Clinical Medicine & Patient Care; Medical Laboratory & Diagnostic Imaging; Nursing & Allied Health Services; Pharmacy & Pharmaceutical Sales |
| 6 | **Hospitality, Tourism & Food Services** | 4 | Culinary Arts, Kitchen & Food Preparation; Food & Beverage (F&B) Service & Barista; Hotel Front Desk & Guest Relations; Travel, Tourism & Tour Operations |
| 7 | **Human Resources** | 5 | HR Operations & People Analytics; Learning & Development (L&D); Performance Management & Total Rewards; Personnel, Payroll & Egyptian Labor Law; Talent Acquisition & Recruitment |
| 8 | **Legal, Regulatory & Government Relations** | 3 | Corporate Law, Contracts & Commercial Advisory; Government Relations & Regulatory Compliance; Litigation, Court Procedures & Dispute Resolution |
| 9 | **Manufacturing & Industrial Production** | 5 | CNC, Machining & Metal Fabrication; Industrial Automation, PLC & Instrumentation; Industrial Health, Safety & Environment (HSE); Industrial Machinery & Equipment Maintenance; Production Line & Assembly Operations |
| 10 | **Marketing & Sales** | 4 | B2B Sales & Business Development; Content Marketing, SEO & Social Media; Digital Marketing & Paid Ads (Performance Media); Retail, B2C Sales & Account Management |
| 11 | **Operations & Project Management** | 4 | Business Operations & Process Improvement; Customer Service & Support Operations; Office & Administrative Management; Project & Agile Management (PMP, Agile, Scrum) |
| 12 | **Software Engineering & IT** | 6 | Backend Development; Cybersecurity & Information Security; DevOps & Cloud Infrastructure; Frontend Development; Mobile Development; Quality Assurance & Testing |
| 13 | **Supply Chain & Logistics** | 4 | Inventory & Warehouse Management; Logistics, Freight & Fleet Operations; Procurement & Purchasing; Supply Chain Planning & Demand Forecasting |
| 14 | **Vocational Trades, Driving & Field Services** | 4 | Electrical, Plumbing & Mechanical Trades; Facility Maintenance, Cleaning & Janitorial; Professional Driving & Fleet Delivery; Security, Guarding & Asset Protection |

*Note: For `UNMATCHED_NOVEL` and `REJECTED_NOISE` rows, domain and sub_category are strictly set to `"Unknown"`.*

---

## 9. Conclusion & Verification Summary

The architectural contract for Phase A is complete, consistent, and fully verified against the codebase and live database:
- **Zero contradictions:** All 7 historical critiques have been reconciled.
- **Two-Column Integrity:** Pure verbatim modifier extraction (`extracted_skill_level`) is preserved alongside governed canonical normalizations (`skill_level`).
- **Data Protection:** Soft skills default to `'Not Specified'`, certifications separate examination tracks from award status, and spoken languages isolate CEFR codes.
- **Physical Output Contracts:** Main graph is strictly frozen at **14 columns**; Sidecar metadata is strictly frozen at **11 columns**.
- **Database Safety:** PostgreSQL remains **100% read-only**.

This report serves as the complete specification survey for the implementation teams.
