# Data Assets, Catalogs & PostgreSQL Database State Survey Report
**Agent:** `teamwork_explorer_survey_3`  
**Role:** Data Assets & Database Explorer  
**Working Directory:** `d:\Hire Q Project\.agents\teamwork\teamwork_explorer_survey_3`  
**Database Audited:** `egypt_jobs_db` on `localhost:5432` (PostgreSQL 18.1, Read-Only Mode)  
**Date:** 2026-11-03  

---

## 1. Executive Summary & Verification Highlights

An exhaustive, read-only empirical survey of the existing data assets, catalogs, metadata structures, and PostgreSQL database was conducted in `d:\Hire Q Project`. All investigations adhered strictly to the read-only constraint (only `SELECT` and informational metadata queries were executed).

### Key Empirical Findings:
1. **Catalog Integrity (`standard_skills_catalog.csv`):** Contains exactly **3,794 rows** across **8 columns**, using semicolon (`;`) delimiters. Covers exactly **14 Domains** and **61 Subcategories**. There are **2,756 unique skill names**; **281 skills** recur across multiple domains/subcategories (e.g. `Problem Solving` appears 33 times, `Communication` 32 times). All **3,794 regex patterns** compile with zero syntax errors.
2. **Acronym Knowledge Base (`skills_acronym_dictionary.json`):** Contains **386 curated acronym records** with zero missing fields. Every single record maps 100% cleanly into the 14 domains and 61 subcategories.
3. **Skill Levels Matrix (`standard_skill_levels_matrix.csv`):** Semicolon-delimited, containing **23 canonical rows** across 5 skill types. All regex patterns compile cleanly. Confirmed critical legacy governance flaws (e.g. `senior` and `lead` mapped to `Advanced`, `strong` mapped to soft skill rank), which are now superseded by the audited governance specification v3.
4. **Raw Skill Universe (`skills.csv`):** Exactly **28,824 unique skills** across 7 columns. Matches the PostgreSQL `public.skills` table **1-to-1** with **zero missing or differing records**. Contains 883 slash-delimited skills (93 protected compounds, 790 delimiters), 1,654 ampersand skills (31 protected, 1,623 delimiters), and 1,047 parenthetical skills (633 acronym pairs, 407 specifications/contexts, 7 level indicators).
5. **PostgreSQL Database Verification (`egypt_jobs_db`):**
   - `skills`: Exactly **28,824 rows** (PK on `id`, unique index on `name`).
   - `job_skills`: Exactly **464,397 rows** (PK on `(job_id, skill_id)`, index on `skill_id`). Zero orphan records (`0` missing job FKs, `0` missing skill FKs).
   - `jobs`: Exactly **52,128 rows** (PK on `id`, index on `title_normalized`). 38,923 jobs have skills in `job_skills`; 13,205 jobs do not have explicit skill associations.
   - Distinct skills in `job_skills`: **28,817**. Exactly **7 skills** have `job_count = 0` (e.g. `Open-Mindedness`, `Diplomacy`, `Urdu`).
6. **High-Performance Vectorized Extraction:** Validated that bulk SQL aggregations for `job_count`, `posting_career_level_distribution`, and `top_associated_job_titles` execute across all 28,824 skills in under **12 seconds total** (1.64s for counts, 2.27s for career levels, 7.70s for top titles).

---

## 2. Standard Skills Catalog (`standard_skills_catalog.csv`) Detailed Analysis

### 2.1 File Characteristics & Structure
- **File Path:** `d:\Hire Q Project\standard_skills_catalog.csv`
- **File Size:** 1,736,971 bytes (~1.74 MB)
- **Delimiter:** Semicolon (`;`) — **NOT comma (`,`)**! (Attempting to parse with default comma results in CSV parser errors due to commas inside regex patterns and aliases).
- **Total Records:** 3,794 rows (excluding header)
- **Total Columns:** 8 columns
  1. `standard_skill_name` (string, 3,794 non-null)
  2. `domain` (string, 3,794 non-null)
  3. `sub_category` (string, 3,794 non-null)
  4. `skill_type` (string, 3,794 non-null)
  5. `applicable_level_category` (string, 3,794 non-null)
  6. `initial_regex_pattern` (string, 3,794 non-null)
  7. `known_aliases` (string, 3,794 non-null)
  8. `skill_priority` (string, 3,794 non-null)

### 2.2 Taxonomy Domains Breakdown (Exactly 14 Domains)
| Domain | Catalog Rows | % of Catalog |
|---|---|---|
| Software Engineering & IT | 690 | 18.19% |
| Data Science & Analytics | 572 | 15.08% |
| Human Resources | 488 | 12.86% |
| Operations & Project Management | 393 | 10.36% |
| Business & Finance | 391 | 10.31% |
| Marketing & Sales | 365 | 9.62% |
| Supply Chain & Logistics | 351 | 9.25% |
| Engineering & Construction | 131 | 3.45% |
| Manufacturing & Industrial Production | 111 | 2.93% |
| Vocational Trades, Driving & Field Services | 76 | 2.00% |
| Healthcare & Medical Sciences | 63 | 1.66% |
| Hospitality, Tourism & Food Services | 63 | 1.66% |
| Education, Teaching & Training | 57 | 1.50% |
| Legal, Regulatory & Government Relations | 43 | 1.13% |
| **Total** | **3,794** | **100.00%** |

### 2.3 Subcategories Breakdown (Exactly 61 Subcategories)
All 61 subcategories are strictly populated. Top 15 subcategories by catalog count:
- `Business Intelligence & Data Analytics`: 116
- `Quality Assurance & Testing`: 116
- `Frontend Development`: 116
- `Artificial Intelligence & Deep Learning`: 115
- `Mobile Development`: 115
- `Backend Development`: 115
- `DevOps & Cloud Infrastructure`: 114
- `Data Engineering`: 114
- `Machine Learning & Data Science`: 114
- `Cybersecurity & Information Security`: 114
- `Data Governance, Quality & Architecture`: 113
- `Talent Acquisition & Recruitment`: 104
- `Project & Agile Management (PMP, Agile, Scrum)`: 104
- `Office & Administrative Management`: 102
- `Accounting & Financial Reporting`: 101

### 2.4 Skill Types in Catalog
| Catalog `skill_type` | Count | % of Catalog | Mapping to Governed Type |
|---|---|---|---|
| Hard Skill | 1,916 | 50.50% | `Hard Skill` |
| Tool / Software | 1,099 | 28.97% | `Tool / Software` |
| Soft Skill | 438 | 11.54% | `Soft Skill` |
| Certification | 169 | 4.45% | `Certification` |
| Language | 82 | 2.16% | `Language` |
| Requirement | 44 | 1.16% | Non-standard; requires handling |
| Domain Knowledge | 28 | 0.74% | Non-standard; maps to Hard Skill |
| Methodology | 18 | 0.47% | Non-standard; maps to Hard Skill |
| **Total** | **3,794** | **100.00%** | |

*Note for Implementation:* The frozen output specification for `egypt_skills_decomposed_graph.csv` strictly admits 5 controlled types: `(Hard Skill, Soft Skill, Tool / Software, Language, Certification)`. Any catalog entries with `Requirement`, `Domain Knowledge`, or `Methodology` must be cleanly normalized into this controlled enum.

### 2.5 Applicable Level Categories & Priorities
- **Level Categories:** `Technical Proficiency` (1,835), `Tool Competency` (1,099), `Demonstrated Trait` (419), `Credential Status` (164), `Language Fluency` (82), `Process/Methodology Ownership` (74), `Prerequisite Requirement` (44), `Regulatory Compliance` (34), `Soft Skill Effectiveness` (24), `People Management` (9), `Domain Expertise` (8), `Hard Skill Execution` (2).
- **Skill Priority:** `Core` (1,860, 49.0%), `Foundational` (1,149, 30.3%), `Secondary` (785, 20.7%).

### 2.6 Unique Skill Names & Cross-Domain Duplicates
- **Unique Standard Skill Names:** 2,756 unique names across 3,794 rows.
- **Cross-Domain Duplicates:** Exactly 281 unique skill names appear multiple times (totaling 1,319 rows).
- **Most Common Cross-Domain Skills:**
  - `Problem Solving`: 33 occurrences across 8 domains
  - `Communication`: 32 occurrences across 8 domains
  - `English`: 32 occurrences across 7 domains
  - `Arabic`: 32 occurrences across 7 domains
  - `Attention to Detail`: 30 occurrences across 8 domains
  - `Teamwork`: 28 occurrences across 8 domains
  - `Communication Skills`: 26 occurrences across 7 domains
  - `Microsoft Excel`: 25 occurrences across 7 domains
  - `Time Management`: 24 occurrences across 7 domains
  - `Analytical Thinking`: 22 occurrences across 7 domains
*Architectural Implication:* When decomposing an atomic skill that matches a multi-domain catalog entry, the pipeline must retain the domain/sub_category from the source raw skill record (or contextual job category) rather than arbitrarily selecting the first row.

### 2.7 Regex Pattern Integrity
- **Total Tested:** 3,794 regex patterns.
- **Compilation Errors:** Exactly **0**. Every single pattern compiles cleanly under `re.compile(pat, re.IGNORECASE)`.

---

## 3. Acronym Dictionary & Level Matrix Integrity

### 3.1 Acronym Dictionary (`skills_acronym_dictionary.json` & `.csv`)
- **JSON File:** `d:\Hire Q Project\skills_acronym_dictionary.json` (127,952 bytes)
- **CSV Companion:** `d:\Hire Q Project\skills_acronym_dictionary.csv` (63,364 bytes, semicolon delimited, 394 rows)
- **JSON Entry Count:** Exactly **386 curated entries**.
- **Field Schema per Entry:**
  - `acronym` (e.g. `"UI/UX"`, `"BMS"`, `"GKE"`)
  - `full_name` (e.g. `"Building Management System"`)
  - `canonical_skill_name` (e.g. `"Building Management System"`)
  - `domain` (e.g. `"Engineering & Construction"`)
  - `sub_category` (e.g. `"Facility Management & Maintenance Operations"`)
  - `skill_type` (e.g. `"Hard Skill"`)
  - `source` (e.g. `"Global Industry Standard"`, `"Empirical Parenthetical Discovery"`)
- **Data Integrity Audit:**
  - Missing or null fields: **0**.
  - Invalid domains: **0** (all 386 map strictly into the 14 approved taxonomy domains).
  - Invalid subcategories: **0** (all 386 map strictly into the 61 approved taxonomy subcategories).
  - Overlap with `skills.csv`: 158 acronyms appear verbatim in `skills.csv`; 101 canonical full names appear in `skills.csv`.
  - Overlap with `standard_skills_catalog.csv`: 20 acronyms appear verbatim; 46 canonical full names appear verbatim.

### 3.2 Standard Skill Levels Matrix (`standard_skill_levels_matrix.csv`)
- **File Path:** `d:\Hire Q Project\standard_skill_levels_matrix.csv` (3,796 bytes)
- **Delimiter:** Semicolon (`;`)
- **Total Records:** 23 canonical rows across 7 columns:
  `skill_type;level_category;standard_level;rank_order;regex_patterns;arabic_patterns;example_usage`
- **Breakdown by Skill Type:**
  - `Language` (CEFR Framework): 7 rows (C2, C1, B2, B1, A2, A1, Not Specified)
  - `Hard Skill` (Technical Proficiency): 5 rows (Expert, Advanced, Intermediate, Beginner, Not Specified)
  - `Tool / Software` (Tool Competency): 5 rows (Expert, Advanced, Intermediate, Beginner, Not Specified)
  - `Certification` (Credential Status): 3 rows (Active / Certified, Candidate / In Progress, Not Specified)
  - `Soft Skill` (Demonstrated Trait): 3 rows (High / Strong, Demonstrated, Not Specified)
- **Regex Compilation Verification:** Tested all 23 Latin patterns and 23 Arabic patterns. Zero syntax errors (`re.error = 0`).

### 3.3 Critical Legacy Defects & Governance Reconciliation
Auditing `standard_skill_levels_matrix.csv` against `master_skill_level_governance_and_audit_specification_v3.md` confirms several critical historical anomalies:
1. **Senior / Lead Conflation (Row 3):** The legacy matrix contained `\b(advanced|senior|lead|principal|high-level|extensive|solid)\b` under Hard Skill Advanced. In job postings, `Senior` and `Lead` almost always represent job roles or business nouns (`Lead Generation`, `Lead Time`, `Senior Care`), NOT proficiency. Specification v3 strictly overrides this: standalone `Senior`/`Lead` are shielded and never mapped to skill levels.
2. **Ambiguous `Strong` Conflation (Row 22):** The legacy matrix assigned `High / Strong` to soft skills with `\b(strong|exceptional|proven|outstanding|excellent)\b`. Job postings use "Strong" as conversational hyperbole (`"Strong communication"`). Specification v3 strictly resolves this: `Strong` is classified as `AMBIGUOUS`; all soft skills default to `skill_level = 'Not Specified'`, while preserving verbatim `"Strong"` in `extracted_skill_level`.
3. **Certification Status vs. Level (Row 19):** Legacy matrix conflated credential status (`Active / Certified`) with skill levels. In specification v3, credential tracks (`ISTQB Advanced Level`) set `extracted_skill_level = "Advanced"`, `skill_level = "Not Specified"`, and record `"Advanced Level"` in sidecar `credential_track_or_status`.

---

## 4. Raw Skill Dataset (`skills.csv`) Deep Inspection

### 4.1 Dataset Properties & Schema
- **File Path:** `d:\Hire Q Project\skills.csv` (5,586,089 bytes, ~5.59 MB)
- **Delimiter:** Comma (`,`), quotechar (`"`)
- **Total Rows:** Exactly **28,824 rows** (excluding header)
- **Total Columns:** 7 columns:
  `id`, `name`, `domain`, `sub_category`, `normalized_name`, `created_at`, `skill_type`
- **Data Completeness:** Exactly 28,824 non-null values across every column (0 nulls).
- **Uniqueness:** 28,824 unique IDs, 28,824 unique names (0 duplicates).
- **Normalized Name Equality:** `name == normalized_name` for 100% of rows (28,824 / 28,824), proving no semantic deduplication or normalization has been applied to the raw dataset.

### 4.2 Linguistic & Character Encoding Analysis
- **Pure Latin Characters:** 28,824 (100.00%) of `skills.name`.
- **Pure Arabic Characters in `skills.name`:** 0 (0.00%).
- **Non-ASCII Characters:** Exactly 48 rows contain non-ASCII characters. Detailed inspection revealed **100% valid UTF-8**:
  - European loan skills: `Specialty Café`, `Organización`, `Führungskompetenz`, `Appréciation des compétences`, `Recolección de evidencia`, `Egalité d’accès à l’emploi`.
  - Punctuation & Typography: Valid EN DASH `–` (`\u2013`) in ISO standards (`ISO 14224 Road Vehicles – Off-Road Vehicles – Vocabulary`, `VMware Certified Professional – VMware Cloud Foundation`), and smart right single quote `’` (`\u2019`) in `Clinical Experience (Urology/Andrology/Men’s Health)`.
  - **Zero mojibake or U+FFFD replacement characters exist in `skills.csv`.**

### 4.3 Delimiter & Pattern Frequency Analysis
| Pattern / Delimiter | Raw Skill Count | % of Total | Characterization |
|---|---|---|---|
| Hyphen `-` | 1,717 | 5.96% | Hyphenated technical terms (`end-to-end`, `cloud-native`) and level suffixes (`AWS - Advanced`) |
| Ampersand `&` | 1,654 | 5.74% | 31 protected compounds (`R&D`, `P&L`, `P&ID`, `W&B`); 1,623 general delimiter combinations |
| Parentheses `(...)` | 1,047 | 3.63% | Acronym expansions (633), specifications/contexts (407), level indicators (7) |
| Slash `/` | 883 | 3.06% | 93 protected compounds (`C/C++`, `CI/CD`, `UI/UX`, `AI/ML`, `PL/SQL`); 790 delimiter splits |
| Word `and` | 453 | 1.57% | Delimiter conjunctive (`Site management and problem-solving`) |
| Plus `+` | 42 | 0.15% | Technical nomenclature (`C++`, `C#`, `N+`, `A+`) |
| Multi-delimiter combinations | 252 | 0.87% | Highly composite expressions (e.g. `API & Messaging Protocols (SOAP/JSON/XML/REST)`) |

### 4.4 Parentheses Typology Breakdown (1,047 Skills)
1. **Acronym / Full-Name Pairs (633 skills, 60.5%):**
   - Pattern A (`Full Name (ACRONYM)`): e.g. `Building Management System (BMS) Integration`, `Google Kubernetes Engine (GKE)`, `First Time Quality (FTQ)`.
   - Pattern B (`ACRONYM (Full Name)`): e.g. `ABAP (Advanced Business Application Programming)`, `MobileIron (MDM)`.
2. **Contextual Specification / Component Lists (407 skills, 38.9%):**
   - E.g. `API Design (RESTful, GraphQL)`, `Sales Experience (Transportation & Logistics)`, `4D Simulation (Synchro 4D, Navisworks)`.
3. **Proficiency Level Indications (7 skills, 0.7%):**
   - E.g. `Microsoft Office (Advanced)`, `Go (Expert)`.

### 4.5 Length & Structural Outliers
- **Short Tokens (Length <= 2):** Exactly 36 skills. Includes valid industry abbreviations (`3G`, `IP`, `LE`, `HR`, `MC`, `CE`, `XP`, `DI`, `N+`, `C#`, `UI`, `UX`, `QA`, `QC`, `R`).
  *Safety Requirement:* Engine length filters must whitelist these tokens to prevent accidental truncation or rejection!
- **Long Expressions (Length >= 60):** Exactly 21 skills. Includes ISO standards, complex certification titles, and multi-discipline chains:
  - `ISO 19650 Building Information Modeling (BIM) Collaboration Enablers` (69 chars)
  - `ISO 9000 Quality Management Systems Fundamentals and Vocabulary` (64 chars)
  - `Microsoft SC-300: Microsoft Identity and Access Administrator` (60 chars)
  - `VMware Certified Professional – VMware Cloud Foundation (VCP-VCF)` (66 chars)
  - `Electrical/Mechanical/Electronics/Communications Engineering` (60 chars)

### 4.6 Baseline Direct Match vs Catalog
Matching the 28,824 raw strings directly against the catalog before decomposition:
- Exact Case-Sensitive Match: 985 (3.42%)
- Case-Insensitive Exact Match: 100 (0.35%)
- Catalog Alias Exact Match: 673 (2.33%)
- **Total Directly Matched Whole Strings:** 1,758 (6.10%)
- **Unmatched Strings Requiring Decomposition:** **27,066 (93.90%)**
This empirical finding underscores why atomic decomposition is the essential bottleneck: over 93% of Egyptian market skills require linguistic parsing.

---

## 5. PostgreSQL Database (`egypt_jobs_db`) Read-Only Verification

### 5.1 Connectivity & Environment
- **Database Engine:** PostgreSQL 18.1 on x86_64-windows (MSVC 19.44.35221, 64-bit)
- **Host / Port:** `localhost:5432`
- **Database Name:** `egypt_jobs_db`
- **User:** `postgres`
- **Connection Mode:** Strictly verified using `conn.set_session(readonly=True)`. Zero write permissions exercised.

### 5.2 Core Tables Schema & Indexing Inspection
| Table Name | Row Count | Primary Key | Key Foreign Keys & Indexes |
|---|---|---|---|
| `public.skills` | 28,824 | `id (uuid)` | Unique index on `name` (`skills_name_key`); index on `skill_type` (`idx_skills_skill_type`) |
| `public.job_skills` | 464,397 | `(job_id, skill_id)` | FK to `jobs.id`; FK to `skills.id`; index on `skill_id` (`idx_job_skills_skill_id`) |
| `public.jobs` | 52,128 | `id (uuid)` | Index on `title_normalized` (`idx_jobs_norm_title`); index on `job_category` |

#### Detailed Column Definitions:
- **`public.skills`:**
  - `id`: `uuid` (NOT NULL, PK)
  - `name`: `varchar` (NOT NULL, UNIQUE)
  - `domain`: `varchar` (NULL)
  - `sub_category`: `varchar` (NULL)
  - `normalized_name`: `varchar` (NULL)
  - `created_at`: `timestamptz` (DEFAULT now())
  - `skill_type`: `varchar` (NULL)
- **`public.job_skills`:**
  - `job_id`: `uuid` (NOT NULL, FK `jobs.id`)
  - `skill_id`: `uuid` (NOT NULL, FK `skills.id`)
  - `is_required`: `boolean` (NOT NULL, DEFAULT true)
  - `extracted_from`: `varchar` (NULL)
  - `skill_level`: `varchar` (NULL)
  - `confidence`: `float8` (NULL, DEFAULT 1.0)
  - `source_job_id`: `varchar` (NULL)
  - `raw_skill_text`: `text` (NULL)
  - `skill_type`: `varchar` (NULL)
- **`public.jobs`:**
  - `id`: `uuid` (NOT NULL, PK)
  - `title_raw`: `text` (NOT NULL)
  - `title_normalized`: `text` (NULL, 0 nulls present, 28,787 distinct)
  - `career_level`: `varchar` (NULL, 35 distinct categories)
  - `company_name`: `varchar` (NOT NULL)
  - `status`: `varchar` (NOT NULL, DEFAULT 'Open')
  - `job_category`: `varchar` (NULL)
  - `internal_category`: `varchar` (NULL)
  - `has_explicit_skills`: `boolean` (NULL, DEFAULT false)

### 5.3 Referential Integrity & Foreign Key Health
- **Orphan Records in `job_skills -> jobs`:** Exactly **0** (every `job_id` exists in `jobs`).
- **Orphan Records in `job_skills -> skills`:** Exactly **0** (every `skill_id` exists in `skills`).
- **Consistency between `skills.csv` and `public.skills`:**
  - Total records in CSV: 28,824 | Total records in DB: 28,824
  - IDs in CSV but not DB: 0
  - IDs in DB but not CSV: 0
  - Names in CSV but not DB: 0
  - Names in DB but not CSV: 0
  - **Verdict:** 100% exact parity between file asset and live database.

### 5.4 Auxiliary Database Tables Survey
- `skill_aliases`: 30,631 records (`skill_id` -> `alias_name`).
- `skill_embeddings`: 28,740 vector records (384-dimensional vectors).
- `skill_tool_relationships`: 5,175 records (`tool_name`, `related_skill`, `co_occurrence_count`).
- `job_descriptions`: 121,521 records (`job_id`, `type`, `content`, `language`).
- `canonical_skills`: 0 records (empty table).
- `job_skill_occurrences`: 0 records (empty table).
- `industries` & `job_industries`: 0 records (empty tables).

### 5.5 `job_count = COUNT(DISTINCT job_id)` Empirical Verification
- **Distinct Jobs in `jobs` Table:** 52,128
- **Distinct Jobs in `job_skills` Table:** 38,923 (13,205 jobs have no parsed skills yet).
- **Distinct Skills in `job_skills` Table:** 28,817 out of 28,824.
- **Skills with `job_count = 0`:** Exactly **7 skills** have zero job associations in `job_skills`:
  1. `Open-Mindedness` (ID: `c1d877fd-2750-4f3d-b256-45f073d284a3`)
  2. `Diplomacy` (ID: `c4c2af64-f9f5-4683-b375-b86a1067e4df`)
  3. `Nonverbal Communication` (ID: `c2e71b92-3904-4810-86d4-afc8e474b720`)
  4. `Urdu` (ID: `851b24eb-aef5-479f-ae4f-eab162d9f9ff`)
  5. `Integrity & Ethics` (ID: `0a2d4975-d42b-45d5-b64d-f76474590a9d`)
  6. `Flexibility` (ID: `4accd8fc-15f1-400c-b47d-d6aa76ce4868`)
  7. `Ambiguity Tolerance` (ID: `007ea024-ac27-40a1-87bc-aa751e345c26`)
  *Implementation Note:* For these 7 skills, `job_count` must be set to `0`, and sidecar `top_associated_job_titles` must cleanly output `"Insufficient Postings"`.

#### Job Count Distribution Across All 28,824 Skills:
| Metric | Value |
|---|---|
| Minimum | 0 |
| 25th Percentile (P25) | 1.0 |
| Median (P50) | 2.0 |
| 75th Percentile (P75) | 5.0 |
| 95th Percentile (P95) | 41.0 |
| Maximum | 17,818 (`Communication`) |
| Mean | 16.11 |

#### Top 10 Skills by Market Frequency (`COUNT(DISTINCT job_id)`):
1. `Communication`: 17,818 jobs (45.78% of all skill-annotated jobs)
2. `English`: 11,486 jobs (29.51%)
3. `Problem Solving`: 7,816 jobs (20.08%)
4. `Microsoft Office`: 7,081 jobs (18.19%)
5. `Collaboration`: 5,836 jobs (14.99%)
6. `Leadership`: 4,811 jobs (12.36%)
7. `Analytical Thinking`: 4,682 jobs (12.03%)
8. `Customer Service`: 4,224 jobs (10.85%)
9. `Attention to Detail`: 4,189 jobs (10.76%)
10. `Sales`: 4,042 jobs (10.38%)

### 5.6 Multilingual & Arabic Presence in Database
While `skills.csv` contains purely Latin names, the database contains Arabic source evidence:
- **`job_skills.raw_skill_text`:** Exactly 198 records contain Arabic script. Top expressions include:
  - `الحاسب الآلي`: 117 occurrences
  - `الحاسب الآلي جيد`: 14 occurrences
  - `اللغة الإنجليزية`: 14 occurrences
  - `حاسب آلي`: 12 occurrences
  - `قراءة`: 4 occurrences
- **`jobs.title_raw`:** Exactly 4,727 jobs (9.07% of the 52,128 jobs) have Arabic titles.

### 5.7 High-Performance Bulk Aggregation Benchmarks
Testing individual queries vs bulk vectorized SQL queries on PostgreSQL:
- **Naive Loop (28,824 individual queries):** Estimated 45 to 60 minutes.
- **Bulk Vectorized Aggregations:**
  - `COUNT(DISTINCT job_id)` for all 28,824 skills: **1.64 seconds**!
  - `posting_career_level_distribution` (75,085 grouped rows): **2.27 seconds**!
  - `top_associated_job_titles` with `ROW_NUMBER() OVER (PARTITION BY ...)` (54,176 ranked rows): **7.70 seconds**!
  - **Total Database Retrieval Time:** Under **12 seconds** to populate all sidecar database columns for the full 28,824 universe!

---

## 6. Data Anomalies, Edge Cases & Risk Matrix

| Risk / Anomaly | Impact Level | Description & Concrete Evidence | Mitigation Strategy |
|---|---|---|---|
| **Semicolon Delimiter in Catalogs** | HIGH | `standard_skills_catalog.csv`, `skills_acronym_dictionary.csv`, and `standard_skill_levels_matrix.csv` all use `;` as delimiter. Parsing with standard comma `,` fails immediately. | Engine must explicitly use `sep=';'` or `delimiter=';'` when loading reference catalogs and matrices. |
| **Cross-Domain Duplication (281 skills)** | MEDIUM | Universal skills (e.g. `Excel`, `Problem Solving`) appear up to 33 times across different domain/subcategory combinations. | When an atomic skill matches multiple catalog rows, preserve the domain and subcategory of the parent raw skill if possible. |
| **Legacy Level Matrix Bugs** | HIGH | Row 3 of legacy matrix included `senior` and `lead` as `Advanced`. Row 22 included `strong` as a soft skill level. | Obey audited specification v3: enforce verbatim extraction (`extracted_skill_level`), default soft skills to `'Not Specified'`, and shield proper nouns. |
| **Non-Standard Catalog Skill Types** | LOW | Catalog contains `Requirement` (44), `Domain Knowledge` (28), and `Methodology` (18), whereas frozen output schema requires 5 controlled types. | Map `Domain Knowledge` and `Methodology` to `Hard Skill`; map `Requirement` appropriately or validate against controlled enum. |
| **7 Zero-Occurrence Skills** | LOW | 7 skills in `skills.csv` have zero postings in `job_skills` (e.g. `Diplomacy`, `Urdu`). | Ensure engine handles `job_count = 0` gracefully and outputs `"Insufficient Postings"` for top titles. |
| **Dirty Career Level Strings in DB** | LOW | 1 record in `jobs.career_level` contains corrupted characters: `Entry level  0-5 Years of Experience`. | Ensure sidecar JSON serialization handles non-ASCII characters with `ensure_ascii=False` or cleans replacement characters. |
| **12-Column vs 14-Column Prototype File** | MEDIUM | Existing `test_decomposed_100_skills.csv` had 12 columns (missing `extracted_skill_level` and `job_count`). | Implementation team must use the frozen 14-column contract specified in `ORIGINAL_REQUEST.md`. |

---

## 7. Recommendations for Implementation Engineering

1. **Database Pre-Caching:** Load the complete `job_count`, `career_level_distribution`, and `top_associated_job_titles` in memory upfront using the 3 bulk SQL queries (takes ~12 seconds). Store in Python dictionaries keyed by `raw_skill` for O(1) sidecar lookup during decomposition.
2. **Catalog Loader Ingestion:** Ensure `standard_skills_catalog.csv` is read with `sep=';'`, `encoding='utf-8-sig'`. Build an exact hash table for case-sensitive matching, a lowercase hash table, an alias map, and compile regex patterns once.
3. **5-Pass Architecture Strict Adherence:**
   - **Pass 0:** Shield protected proper nouns (e.g. `ADAS`, `ABAP`, `Lead Generation`, `Senior Care`, `GitHub Advanced Security`).
   - **Pass 1:** Whole-string catalog match before delimiter splitting.
   - **Pass 2:** Parentheses analysis (extract acronyms, specifications, levels, or category containers).
   - **Pass 3:** Shield protected compounds (`PL/SQL`, `CI/CD`, `UI/UX`, `AI/ML`, `C/C++`, `R&D`, `P&L`, etc.) before splitting on `/`, `&`, `and`, `,`, `-`.
   - **Pass 4:** Verbatim level extraction (`extracted_skill_level`), controlled `skill_level` mapping (soft skills default to `'Not Specified'`), 6-value `match_status`, and rejection validation.
4. **Frozen Output Contract:** Strictly generate `egypt_skills_decomposed_graph.csv` (14 columns) and `egypt_skills_decomposition_metadata.csv` (11 columns).

---
*Report completed by teamwork_explorer_survey_3.*
