# Original User Request

## Initial Request — 2026-11-03T14:23:48Z

EGYPT CAREER MAP
MASTER IMPLEMENTATION SPECIFICATION
Atomic Skill Decomposition, Linguistic Intelligence & Context-Preserving Skill Graph Dataset
ROLE: Senior Python Engineer, Data Engineer, Data Quality Architect, and Linguistic Processing Systems Engineer.
MODE: AUDIT → CONTROLLED IMPLEMENTATION → VALIDATION → FULL EXECUTION.
IMPLEMENTATION STATUS: AUTHORIZED.

0. PRIMARY MISSION
You are responsible for inspecting, improving, and implementing the existing Atomic Skill Decomposition & Skill Graph Engine inside the current Egypt Career Map project.
Your task is to build a reliable, deterministic, extensible, testable, and production-oriented pipeline that processes raw skill expressions extracted from Egyptian job postings.
The system must transform raw skill expressions into atomic skill components while preserving their original linguistic, structural, and contextual information.
This is a foundational data-engineering component.
Its output will be used in future stages of the Egypt Career Map platform, including:
Skill normalization.
Skill entity resolution.
Data-driven skill catalog construction.
Skill taxonomy improvement.
Skill relationship discovery.
Labor-market skill analysis.
Skill demand and career intelligence.
However, these future capabilities must not be implemented prematurely.
The current task is specifically about:
Raw Skill → Linguistic Analysis → Atomic Skill Decomposition → Context Preservation → Catalog Reference Matching → Validated Output Datasets.
Your objective is not to maximize the number of extracted skills.
Your objective is to maximize reliable information extraction while minimizing false positives, information loss, incorrect classifications, and unsupported assumptions.

1. PROJECT CONTEXT
Egypt Career Map is an Egyptian Labor Market Intelligence Platform.
The existing PostgreSQL database contains job postings, extracted skills, and relationships between skills and job postings.
The project includes existing resources such as:
skills
job_skills
jobs
standard_skills_catalog.csv
Existing skill aliases.
Existing taxonomy definitions.
Existing protected terms and compound dictionaries.
Existing extraction and decomposition code.
Existing regex patterns.
Existing output files.
Existing documentation and tests.
The exact repository structure, schema, and data distribution must be inspected before implementation.
Do not assume that previously reported database statistics are correct.
Do not invent counts, catalog entries, or processing results.
Use the actual project files and read-only database queries to establish the current state.

1.1 Existing Catalog Role
The existing standard_skills_catalog.csv is an AI-generated reference catalog.
It is NOT:
The final unified skill catalog.
A complete representation of the Egyptian labor market.
An automatic semantic normalization engine.
An authoritative source for every possible skill.
Permission to merge similar but distinct expressions.
Use it as a reference for identifying known atomic skills, approved names, aliases, types, and taxonomy classifications.
An atomic skill that is not present in the catalog must remain identifiable as an unmatched novel skill.
Do not automatically merge it with another skill because the names look similar.

2. FUNDAMENTAL ARCHITECTURAL DISTINCTION
You must strictly distinguish between two different problems.
2.1 Atomic Decomposition
Atomic decomposition answers:
"What independent skill components exist inside this original raw skill expression?"
Example:
Python / SQL / Power BI
Possible decomposition:
Python
SQL
Power BI
The original expression and separation context must be preserved.
2.2 Skill Normalization
Skill normalization answers:
"Which different skill expressions refer to the same underlying skill?"
Examples:
Golang vs Go.
Java Script vs JavaScript.
MS Excel vs Microsoft Excel.
Data Analytics vs Data Analysis.
This is a separate future phase.
2.3 Non-Negotiable Rule
This implementation must solve atomic decomposition, not final normalization.
You MUST NOT implement:
Semantic deduplication between different atomic skill names.
Embedding-based similarity matching.
Sentence Transformer matching.
Vector database integration.
pgvector integration.
Semantic entity resolution.
Automatic merging of similar skills.
Final canonical skill catalog generation.
Automatic taxonomy expansion.
Full semantic knowledge graph construction.
Do not introduce features outside this scope.

3. DATABASE SAFETY AND DATA ACCESS
The PostgreSQL database is:
egypt_jobs_db (localhost:5432, user: postgres, password: postgres)
The database MUST remain strictly READ-ONLY throughout the entire task.
3.1 Permitted Operations: Only SELECT, read-only transactions, metadata queries.
3.2 Prohibited Operations: INSERT, UPDATE, DELETE, ALTER, DROP, CREATE, TRUNCATE.
All generated knowledge, intermediate results, logs, reports, and final outputs must be stored as project files in `d:\Hire Q Project`.
3.3 Credentials: Use environment variables or existing configuration. Never hardcode credentials.
3.4 Raw Skill Processing: Process each unique raw_skill exactly once. Calculate `job_count = COUNT(DISTINCT job_id)` from `job_skills`.

5. AUTHORITATIVE SPECIFICATION AND CONFLICT RESOLUTION
The final output consists of:
- One 14-column main decomposition CSV: `egypt_skills_decomposed_graph.csv`
- One 11-column sidecar metadata CSV: `egypt_skills_decomposition_metadata.csv`
Both schemas are frozen.

6. FINAL OUTPUT DATA CONTRACT
6.1 MAIN OUTPUT: `egypt_skills_decomposed_graph.csv` (Exactly 14 columns):
1. raw_skill: The original raw skill expression exactly as received from source (preserve casing, spelling, punctuation).
2. atomic_skill: The individual atomic expression extracted from raw skill.
3. matched_atomic_skill: Standard skill name from catalog if match exists; otherwise NULL.
4. separated_by: Delimiter or mechanism (/ , & , and , - , PARENTHESES, CATEGORY_CONTAINER, NULL).
5. separated_from_before: Immediate neighboring component or relevant original context.
6. separated_from_after: Immediate neighboring component or relevant original context.
7. extracted_skill_level: Verbatim original level expression preserving casing and spacing (e.g. "Working knowledge", "Advanced", "B2"). If none, NULL.
8. skill_level: Controlled general skill proficiency (Not Specified, Beginner, Intermediate, Advanced, Expert). Soft skills default to Not Specified. Ambiguous/seniority modifiers default to Not Specified.
9. skill_type: Controlled type (Hard Skill, Soft Skill, Tool / Software, Language, Certification).
10. domain: Approved taxonomy domain (or "Unknown" for novel/rejected).
11. sub_category: Approved taxonomy subcategory (or "Unknown" for novel/rejected).
12. job_count: COUNT(DISTINCT job_id) for original raw_skill.
13. match_status: Exactly 6 permitted statuses:
    - CATALOG_EXACT_MATCH
    - CATALOG_REGEX_MATCH
    - PARENTHESIS_SPECIFICATION
    - PROTECTED_PROPER_NOUN
    - UNMATCHED_NOVEL
    - REJECTED_NOISE
14. rejection_reason: Explicit reason for rejected components; NULL for accepted.

7. SIDECAR METADATA OUTPUT: `egypt_skills_decomposition_metadata.csv` (Exactly 11 columns, 1 row per unique raw_skill):
1. raw_skill
2. job_count
3. industry_context
4. category_container
5. parentheses_raw_content
6. experience_duration
7. intra_string_seniority
8. credential_track_or_status
9. posting_career_level_distribution
10. top_associated_job_titles
11. is_composite

8. SKILL-LEVEL GOVERNANCE
- Two-Column Architecture: extracted_skill_level (verbatim) vs skill_level (canonical controlled).
- "Strong" is AMBIGUOUS -> skill_level = 'Not Specified'.
- "Senior", "Lead" -> NOT proficiency levels. intra_string_seniority preserved in sidecar.
- Soft Skills -> default skill_level = 'Not Specified'.
- Credential Track (e.g. "ISTQB Advanced Level") -> extracted_skill_level = "Advanced", skill_level = "Not Specified", credential_track_or_status = "Advanced Level".
- CEFR Language Levels (A1-C2) -> only applied to spoken languages.

9. FIVE-PASS ATOMIC DECOMPOSITION ARCHITECTURE
- PASS 0: Protected Proper Nouns (ADAS, ABAP, Lead Generation, Lead Time Reduction, Senior Care, GitHub Advanced Security, etc.).
- PASS 1: Whole-Skill Catalog Matching (Exact before regex).
- PASS 2: Parentheses Analysis (Level-only, Acronym/Full-name, Specification, Category Container, Industry Context).
- PASS 3: Protected Compounds (PL/SQL, CI/CD, UI/UX, AI/ML, C/C++, etc.) & Delimiter Splitting (&, /, ,, -, and).
- PASS 4: Atomic Processing, Level Extraction, Classification, and Validation.

QUOTED RELEVANT PRIOR CONTEXT:
The comprehensive audited specification resolving all 7 critiques is already prepared and saved at:
`d:\Hire Q Project\.md\master_skill_level_governance_and_audit_specification_v3.md`
Existing files in `d:\Hire Q Project`:
- `skills.csv`: 28,824 unique raw skills
- `standard_skills_catalog.csv`: 3,794 standard skills across 14 Domains and 61 Subcategories
- `standard_skill_levels_matrix.csv`: 23 rows of canonical level definitions
- `skills_acronym_dictionary.json`: 386 verified acronym entries
- `scratch/atomic_decomposition_engine.py`: Prototype engine that passed initial 100 benchmark traces.

Execute all phases: Audit -> Knowledge Base -> Linguistic Libraries -> Engine -> Validation -> Full Dataset Execution across all 28,824 raw skills -> Output CSVs and Reports.
PostgreSQL remains 100% read-only.

## Follow-up — 2026-11-03T14:25:11Z

[skip-interview] Please jump straight to execution. The task prompt provided is complete, fully specified, and already audited and authorized by the user. All requirements, database connection parameters, schemas (14-column main, 11-column sidecar), test cases, and governance rules are finalized in d:\Hire Q Project\.md\master_skill_level_governance_and_audit_specification_v3.md. Please begin execution immediately.


## Follow-up — 2026-11-03T16:51:48Z

PAUSE / HOLD: Do NOT proceed to Milestone 2. The user has explicitly requested to pause before M2 to conduct a comprehensive review of Milestone 1 and investigate how SQL is represented across domains in the catalog and database. Await further instructions.


## Follow-up — 2026-11-03T20:03:12Z

Please enter silent standby mode. Suspend periodic status heartbeats until explicitly messaged. Milestone 2 remains strictly on hold. Remain standing by silently.
