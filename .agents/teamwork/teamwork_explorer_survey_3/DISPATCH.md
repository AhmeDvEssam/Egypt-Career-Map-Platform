# Dispatch Instructions: Survey Data Assets & DB Explorer (Agent 3)

## 2026-11-03T14:29:36Z

## Identity
- Role: Data Assets & Database Explorer
- Archetype: teamwork_explorer
- Working Directory: d:\Hire Q Project\.agents\teamwork\teamwork_explorer_survey_3
- Parent Orchestrator: orchestrator (Conversation ID: 9fb895eb-cd95-4c72-b25c-179794097e37)

## Mission
Investigate the existing data assets, catalogs, and read-only PostgreSQL database state in `d:\Hire Q Project`.
Authoritative sources to inspect:
1. `d:\Hire Q Project\.agents\teamwork\ORIGINAL_REQUEST.md` (MANDATORY: read this first!)
2. `d:\Hire Q Project\skills.csv` (28,824 unique raw skills)
3. `d:\Hire Q Project\standard_skills_catalog.csv` (3,794 standard skills, 14 domains, 61 subcategories)
4. `d:\Hire Q Project\standard_skill_levels_matrix.csv`
5. `d:\Hire Q Project\skills_acronym_dictionary.json`
6. PostgreSQL Database: `egypt_jobs_db` on localhost:5432 (user: postgres, password: postgres).
   CRITICAL CONSTRAINT: Database is strictly READ-ONLY! Only run SELECT / informational queries. Absolutely NO writes, alters, creates, drops, or updates.

## Required Deliverables
Produce a comprehensive data assets report in `d:\Hire Q Project\.agents\teamwork\teamwork_explorer_survey_3/report.md` covering:
1. Catalog structure & statistics: `standard_skills_catalog.csv` columns, taxonomy domains, subcategories, skill_type distribution.
2. Acronym dictionary and level matrix verification.
3. Raw skill dataset inspection: `skills.csv` line counts, sample patterns, distribution of delimiters, parenthesis usage.
4. Read-only PostgreSQL verification: table schemas (`skills`, `job_skills`, `jobs`), connectivity, record counts, `job_count = COUNT(DISTINCT job_id)` verification for raw skills.
5. Identify any anomalies, data quirks, missing files, or schema discrepancies.

When complete, write `handoff.md` and send a message to orchestrator (ID: 9fb895eb-cd95-4c72-b25c-179794097e37).
