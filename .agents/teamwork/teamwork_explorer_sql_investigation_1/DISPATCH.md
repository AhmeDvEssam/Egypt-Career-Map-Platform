# Dispatch: SQL Cross-Domain Representation & Milestone 1 Technical Investigation

**Agent:** `teamwork_explorer_sql_investigation_1`  
**Role:** Technical Explorer (SQL & Domain Architecture)  
**Working Directory:** `d:\Hire Q Project\.agents\teamwork\teamwork_explorer_sql_investigation_1`  
**Parent Orchestrator:** `orchestrator` (`9fb895eb-cd95-4c72-b25c-179794097e37`)  
**Parent Conversation ID:** `9fb895eb-cd95-4c72-b25c-179794097e37`  
**Target Codebase:** `d:\Hire Q Project`  
**Original User Request:** `d:\Hire Q Project\.agents\teamwork\ORIGINAL_REQUEST.md`  

---

## Mission Objectives

Conduct an exhaustive, empirical investigation of how 'SQL' is represented across domains in:
1. `standard_skills_catalog.csv` (Reference Catalog).
2. The read-only PostgreSQL database `egypt_jobs_db` (`skills`, `job_skills`, `jobs`).
3. The Milestone 1 Knowledge Base & Linguistic Lexicon module (`linguistic_intelligence/`).

---

## Detailed Investigation Plan

### 1. Milestone 1 Architecture Review for SQL
- Document how `linguistic_intelligence` handles `"SQL"`.
- Verify `CANONICAL_SKILL_HOMES["SQL"]`: Domain = `"Data Science & Analytics"`, Subcategory = `"Data Engineering"`, Skill Type = `"Tool / Software"`.
- Explain how `CatalogLoader._resolve_duplicate_entries` breaks ties when multiple rows have identical priority.

### 2. Deep-Dive: SQL in `standard_skills_catalog.csv`
- Semicolon-delimited, utf-8-sig.
- Enumerate ALL rows where `standard_skill_name == 'SQL'`. Report: Domain, Subcategory, Skill Type, Priority, and Aliases for each row.
- Enumerate ALL standard skills containing `'SQL'` (e.g. `PL/SQL`, `PostgreSQL`, `MySQL`, `T-SQL`, `NoSQL`, `SQL Server`, `SQLite`, `Oracle SQL`, `Spark SQL`, `Transact-SQL`, `Cloud SQL`, `Azure SQL`, `SQLAlchemy`, etc.). Group by domain and subcategory.
- Enumerate skills where `'SQL'` appears in `skill_aliases`.

### 3. Deep-Dive: SQL in PostgreSQL Database (`egypt_jobs_db`)
- **Connection Details:** `localhost:5432`, db: `egypt_jobs_db`, user: `postgres`, password: `postgres`.
- **Database Safety:** STRICTLY READ-ONLY. Run `SET SESSION CHARACTERISTICS AS TRANSACTION READ ONLY;`. No INSERT, UPDATE, DELETE, ALTER, CREATE, DROP.
- **SQL Skill Volume:**
  - Find all rows in `skills` table where `name ILIKE '%sql%'` or `raw_skill ILIKE '%sql%'`.
  - Count of unique raw skill expressions mentioning SQL.
- **Job Count & Market Demand:**
  - Calculate `COUNT(DISTINCT job_id)` from `job_skills` for exact `'SQL'`.
  - Retrieve the top 20 most frequent SQL variants/compounds in Egyptian job postings by job count.
- **Domain & Job Title Distribution:**
  - In `jobs` table, examine the distribution of postings requiring SQL across job titles, job categories/industries, and career levels.
  - What are the top 15 job titles requiring SQL in Egypt?
  - What percentage of SQL jobs fall under:
    * Data Science / Data Analytics / BI / Data Engineering
    * Software Engineering / Web / Backend Development
    * IT / Database Administration / Sysadmin
    * Business / Finance / Marketing / Non-Tech
- **Skill Co-Occurrence:**
  - Query `job_skills` for skills that most frequently co-occur with SQL in the same `job_id`.
  - Report the top 20 co-occurring skills and their relative frequencies.

---

## Deliverables
Write a comprehensive, data-rich report in:
`d:\Hire Q Project\.agents\teamwork\teamwork_explorer_sql_investigation_1\handoff.md`

Notify the orchestrator via `send_message` when done.
