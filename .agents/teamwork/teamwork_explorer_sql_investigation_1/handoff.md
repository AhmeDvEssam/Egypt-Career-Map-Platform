# Technical Investigation Report: Cross-Domain Representation & Architecture of 'SQL'

**Agent:** `teamwork_explorer_sql_investigation_1`  
**Role:** Technical Explorer (SQL & Domain Architecture)  
**Date:** 2026-11-03  
**Status:** Complete  
**Scope:** `standard_skills_catalog.csv`, PostgreSQL `egypt_jobs_db` (read-only), `linguistic_intelligence/` (Milestone 1)

---

## 1. Observation

### 1.1 Milestone 1 Linguistic Intelligence Architecture (`linguistic_intelligence/`)

1. **Explicit Canonical Home Configuration**:
   - In `linguistic_intelligence/config.py` (lines 256–276):
     ```python
     CANONICAL_SKILL_HOMES: Dict[str, Tuple[str, str, str]] = {
         "SQL": ("Data Science & Analytics", "Data Engineering", "Tool / Software"),
         ...
     }
     ```
   - Confirmed: Domain = `"Data Science & Analytics"`, Subcategory = `"Data Engineering"`, Skill Type = `"Tool / Software"`.

2. **Deduplication & Tiebreaker Mechanism**:
   - In `linguistic_intelligence/catalog.py` (lines 270–304), `CatalogLoader._resolve_duplicate_entries`:
     * **Tier 1 (Curated Override)**: Directly checks `CANONICAL_SKILL_HOMES`. If skill name matches (case-insensitive), returns the entry matching target domain and subcategory.
     * **Tier 2 (Multi-Factor Scoring Formula)**:
       $$\text{Score} = \text{Priority Weight} + \text{Domain Affinity} + \text{Tiebreaker}$$
       Where:
       * $\text{Priority Weight} \in \{100 \text{ ('Core')}, 50 \text{ ('Foundational')}, 10 \text{ ('Secondary')}\}$.
       * For `Tool / Software`: `Software Engineering & IT` = 40, `Data Science & Analytics` = 35, `Engineering & Construction` = 25, `Manufacturing & Industrial Production` = 20, `Operations & Project Management` = 15, `Business & Finance` = 10, `Marketing & Sales` = 5, `Human Resources` = 0.
       * $\text{Tiebreaker} = 1.0 - \left(\frac{\text{source\_row\_index}}{10000.0}\right)$. Earlier rows in CSV win ties.
   - **Empirical Scoring Simulation across the 8 SQL catalog rows**:
     * Row 572 (`Software Engineering & IT -> Backend Development`): $100 + 40 + 0.94280 = \mathbf{140.94280}$
     * Row 1048 (`Software Engineering & IT -> Quality Assurance & Testing`): $100 + 40 + 0.89520 = 140.89520$
     * Row 0 (`Data Science & Analytics -> Business Intelligence & Data Analytics`): $100 + 35 + 1.00000 = 136.00000$
     * Row 116 (`Data Science & Analytics -> Data Engineering`): $100 + 35 + 0.98840 = 135.98840$
     * Row 233 (`Data Science & Analytics -> Machine Learning & Data Science`): $100 + 35 + 0.97670 = 135.97670$
     * Row 356 (`Data Science & Analytics -> Artificial Intelligence & Deep Learning`): $100 + 35 + 0.96440 = 135.96440$
     * Row 465 (`Data Science & Analytics -> Data Governance, Quality & Architecture`): $100 + 35 + 0.95350 = 135.95350$
     * Row 2438 (`Human Resources -> HR Operations & People Analytics`): $100 + 0 + 0.75620 = 100.75620$
   - *Observation*: Without Tier 1, algorithmic scoring would select Row 572 (`Software Engineering & IT -> Backend Development`) due to higher tool affinity (40 vs 35). Tier 1 explicitly pins SQL to Row 116 (`Data Science & Analytics -> Data Engineering`).

3. **Compound Shielding & Acronym Resolver**:
   - In `linguistic_intelligence/proper_nouns.py` (line 189), `'pl/sql'` is explicitly registered in `ProperNounShield.PROTECTED_COMPOUNDS`. Slash decomposition (`/`) never splits `PL/SQL` into `PL` and `SQL`.
   - In `skills_acronym_dictionary.json`, SQL-related acronyms include `SSIS`, `SSRS`, `SSAS`, `T-SQL`. `SQL` itself is NOT in `skills_acronym_dictionary.json` as an acronym; it is treated as a canonical atomic skill.

---

### 1.2 Catalog Reference Deep-Dive (`standard_skills_catalog.csv`)

- Total catalog rows: 3,794. Delimiter: `;`. Encoding: `utf-8-sig`.

#### A. Enumeration of Exact `standard_skill_name == 'SQL'` (8 Rows)
| Row Index | Domain | Subcategory | Skill Type | Priority | Known Aliases |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **0** | Data Science & Analytics | Business Intelligence & Data Analytics | Tool / Software | Core | `Ms SQL, ANSI SQL, Oracle SQL, SQL Queries, Advanced SQL, SQL Querying, Microsoft SQL, SQL Optimization, SQL Administration, لغة الاستعلامات الهيكليه, Structured Query Language` |
| **116** | Data Science & Analytics | Data Engineering | Tool / Software | Core | `Ms SQL, Oracle SQL, SQL Queries, Advanced SQL, SQL Querying, Microsoft SQL, SQL Optimization, SQL Administration, Structured Query Language` |
| **233** | Data Science & Analytics | Machine Learning & Data Science | Tool / Software | Core | `Ms SQL, Oracle SQL, SQL Queries, Advanced SQL, SQL Querying, Microsoft SQL, SQL Optimization, SQL Administration, Structured Query Language` |
| **356** | Data Science & Analytics | Artificial Intelligence & Deep Learning | Tool / Software | Core | `Ms SQL, Oracle SQL, SQL Queries, Advanced SQL, SQL Querying, Microsoft SQL, SQL Optimization, SQL Administration, Structured Query Language` |
| **465** | Data Science & Analytics | Data Governance, Quality & Architecture | Tool / Software | Core | `Ms SQL, Oracle SQL, SQL Queries, Advanced SQL, SQL Querying, Microsoft SQL, SQL Optimization, SQL Administration, Structured Query Language` |
| **572** | Software Engineering & IT | Backend Development | Tool / Software | Core | `Ms SQL, Oracle SQL, SQL Queries, Advanced SQL, SQL Querying, Microsoft SQL, SQL Optimization, SQL Administration, Structured Query Language` |
| **1048** | Software Engineering & IT | Quality Assurance & Testing | Tool / Software | Core | `Ms SQL, Oracle SQL, SQL Queries, Advanced SQL, SQL Querying, Microsoft SQL, Database Queries, SQL Optimization, SQL Administration` |
| **2438** | Human Resources | HR Operations & People Analytics | Tool / Software | Core | `Ms SQL, Oracle SQL, SQL Queries, Advanced SQL, SQL Querying, Microsoft SQL, SQL Optimization, SQL Administration, HR Database Queries` |

#### B. All Standard Skills Containing 'SQL' in Name (9 Unique Skills, 25 Rows)
1. **SQL** (8 rows: Data Science & Analytics [5], Software Engineering & IT [2], Human Resources [1]) — All `Core`, `Tool / Software`.
2. **PostgreSQL** (6 rows: Data Science & Analytics [4], Software Engineering & IT [2]) — `Core` & `Foundational`, `Tool / Software`.
3. **Microsoft SQL Server** (3 rows: Data Science & Analytics [2], Software Engineering & IT [1]) — All `Core`, `Tool / Software`.
4. **MySQL** (3 rows: Data Science & Analytics [2], Software Engineering & IT [1]) — All `Core`, `Tool / Software`.
5. **SQL Server Analysis Services** (Row 35: Data Science & Analytics -> Business Intelligence & Data Analytics) — `Core`, `Tool / Software`.
6. **SQL Server Integration Services** (Row 164: Data Science & Analytics -> Data Engineering) — `Core`, `Tool / Software`.
7. **SQL Server Reporting Services** (Row 70: Data Science & Analytics -> Business Intelligence & Data Analytics) — `Foundational`, `Tool / Software`.
8. **SQLAlchemy** (Row 667: Software Engineering & IT -> Backend Development) — `Foundational`, `Tool / Software`.
9. **SQLite** (Row 869: Software Engineering & IT -> Mobile Development) — `Foundational`, `Tool / Software`.

#### C. Related Skills with SQL in Aliases / Compounds (10 Extended Skills)
- `Oracle Database` (Row 663): Contains alias `PL/SQL`.
- `SSAS` (Row 37): Contains alias `SQL Server Analysis Services`.
- `Trino` (Row 169): Contains alias `Trino SQL`.
- `pgvector` (Row 378): Contains alias `PostgreSQL Vector`.
- `Azure Synapse Analytics` (Rows 150, 569): Contains alias `Azure SQL Data Warehouse`.
- `Query Optimization` (Rows 161, 630): Contains aliases `SQL Performance Tuning`, `SQL Tuning`.
- `MongoDB` (Row 595): Contains alias `Mongo NoSQL`.
- `Apache Cassandra` (Row 206): Contains alias `Cassandra NoSQL`.
- `Web Application Security` (Row 1209): Contains alias `SQLi` (SQL Injection).
- `Lead Qualification` (Row 1859): Contains alias `SQL/MQL Qualification` (*Sales Qualified Lead* — critical homonym).

---

### 1.3 PostgreSQL Database Investigation (`egypt_jobs_db`)

- **Connection**: `localhost:5432`, `egypt_jobs_db`, user: `postgres`, password: `postgres`.
- **Database Safety Verification**: Verified `SET SESSION CHARACTERISTICS AS TRANSACTION READ ONLY;` executed. 0 mutations, 0 table creates, 0 alters performed.

#### A. Table Sizing & Baseline Statistics
- `jobs`: 52,768 rows
- `skills`: 28,824 rows
- `job_skills`: 464,397 rows
- `skill_aliases`: 30,631 rows
- `canonical_skills`: 0 rows

#### B. The Exact 'SQL' Entity in PostgreSQL
- In table `skills`:
  * `id`: `ff5bfa9b-b023-4414-816c-909819c6b5b9`
  * `name`: `'SQL'`
  * `domain`: `'Human Resources'`
  * `sub_category`: `'HR Operations & People Analytics'`
  * `skill_type`: `'Tool / Software'`
- *Key Finding*: Exact SQL in the existing database was loaded with Domain `'Human Resources'` because Row 2438 was the last row in `standard_skills_catalog.csv` and overwritten via unkeyed upsert during initial database ingestion.

#### C. Volume & Market Demand
- **Exact 'SQL' Demand**: `COUNT(DISTINCT job_id)` linked to `ff5bfa9b-b023-4414-816c-909819c6b5b9` = **1,546 distinct jobs**.
- **All SQL Variants**: Total distinct jobs requiring ANY skill matching `name ILIKE '%sql%'` = **1,856 distinct jobs**.
- **Unique Raw Expressions**: 67 unique `raw_skill_text` expressions in `job_skills` mention `'sql'`. Total occurrences = 2,806 across 1,856 jobs.

#### D. Top 20 SQL Variants in Egyptian Job Postings by Job Count
| Rank | Skill Name in `skills` | Distinct Job Count | Domain in DB | Subcategory in DB |
| :---: | :--- | :---: | :--- | :--- |
| 1 | **SQL** | **1,546** | Human Resources | HR Operations & People Analytics |
| 2 | **PostgreSQL** | **328** | Software Engineering & IT | DevOps & Cloud Infrastructure |
| 3 | **Microsoft SQL Server** | **269** | Software Engineering & IT | Backend Development |
| 4 | **MySQL** | **223** | Software Engineering & IT | Backend Development |
| 5 | **NoSQL** | **153** | Software Engineering & IT | Frontend Development |
| 6 | **PL/SQL** | **81** | Software Engineering & IT | Backend Development |
| 7 | **NoSQL databases** | **24** | Data Science & Analytics | Data Engineering |
| 8 | **SQL Querying** | **23** | Data Science & Analytics | Business Intelligence & Data Analytics |
| 9 | **Azure SQL Database** | **20** | Software Engineering & IT | DevOps & Cloud Infrastructure |
| 10 | **T-SQL** | **19** | Data Science & Analytics | Business Intelligence & Data Analytics |
| 11 | **SQLite** | **11** | Software Engineering & IT | Mobile Development |
| 12 | **SQL Server Management Studio** | **9** | Software Engineering & IT | Frontend Development |
| 13 | **Oracle SQL** | **7** | Data Science & Analytics | Business Intelligence & Data Analytics |
| 14 | **SQL Database Administration** | **7** | Software Engineering & IT | Frontend Development |
| 15 | **Cloud SQL** | **5** | Software Engineering & IT | DevOps & Cloud Infrastructure |
| 16 | **MySQL Database Systems** | **5** | Software Engineering & IT | Frontend Development |
| 17 | **Oracle PL/SQL** | **5** | Software Engineering & IT | Frontend Development |
| 18 | **SQLAlchemy** | **5** | Software Engineering & IT | Backend Development |
| 19 | **Microsoft SQL Server Clustering**| **4** | Software Engineering & IT | Frontend Development |
| 20 | **SQL Server / PostgreSQL** | **3** | Software Engineering & IT | Frontend Development |

#### E. Career Level Distribution for SQL Jobs (1,546 Postings)
| Career Level | Job Postings | Percentage | Cumulative |
| :--- | :---: | :---: | :---: |
| **Senior** | 517 | 33.44% | 33.44% |
| **Mid-Level** | 449 | 29.04% | 62.48% |
| **Mid-Senior level** | 206 | 13.32% | 75.80% |
| **Manager** | 93 | 6.02% | 81.82% |
| **Experienced** | 90 | 5.82% | 87.64% |
| **Junior / Entry level** | 74 | 4.78% | 92.42% |
| **Associate** | 28 | 1.81% | 94.23% |
| **Entry Level** | 25 | 1.62% | 95.85% |
| **Executive / Director** | 21 | 1.36% | 97.21% |
| **Internship** | 12 | 0.78% | 97.99% |
| **Not Applicable / Unspecified**| 31 | 2.01% | 100.00% |

*Insight*: 87.64% of all Egyptian SQL jobs target Mid-Level, Senior, or Leadership personnel.

#### F. Top 15 Job Titles Requiring SQL in Egypt
| Rank | Normalized Title | Count | % of SQL Jobs | Primary Functional Domain |
| :---: | :--- | :---: | :---: | :--- |
| 1 | **Senior Data Engineer** | 28 | 1.81% | Data Engineering |
| 2 | **Data Engineer** | 22 | 1.42% | Data Engineering |
| 3 | **Senior Data Scientist** | 18 | 1.16% | Data Science |
| 4 | **Data Analyst** | 18 | 1.16% | Data Analytics |
| 5 | **Full Stack Developer** | 17 | 1.10% | Software Engineering |
| 6 | **Data Scientist** | 14 | 0.91% | Data Science |
| 7 | **Senior Backend Engineer** | 10 | 0.65% | Software Engineering |
| 8 | **Senior Software Engineer** | 9 | 0.58% | Software Engineering |
| 9 | **Senior Data Analyst** | 9 | 0.58% | Data Analytics |
| 10 | **Software Engineer** | 9 | 0.58% | Software Engineering |
| 11 | **Senior Full Stack Developer** | 8 | 0.52% | Software Engineering |
| 12 | **Business Analyst** | 8 | 0.52% | Business Intelligence / Analytics |
| 13 | **Business Intelligence Developer**| 7 | 0.45% | Business Intelligence |
| 14 | **Business Intelligence Analyst** | 6 | 0.39% | Business Intelligence |
| 15 | **Technical Lead** | 6 | 0.39% | Software Engineering / Leadership |

*(Additional frequent titles: Senior Java Software Engineer: 6, Back End Developer: 6, Test Lead: 6)*.

#### G. Functional Domain Distribution of SQL Jobs (The 4-Domain Breakdown)
Cross-referencing title semantics, job requirements, and industry context across all 1,546 SQL jobs reveals:
| Functional Domain | Job Count | Percentage | Key Titles |
| :--- | :---: | :---: | :--- |
| **Software Engineering / Web / Backend Development** | **797** | **51.55%** | Full Stack Developer, Backend Engineer, Java Developer, .NET Developer, QA Automation, Tech Lead |
| **Data Science / Data Analytics / BI / Data Engineering** | **331** | **21.41%** | Data Engineer, Data Analyst, Data Scientist, BI Developer, Analytics Engineer, ML Engineer |
| **Business / Finance / Marketing / Non-Tech** | **304** | **19.66%** | Business Analyst, Operations Analyst, Financial Analyst, Growth Manager, TechOps, Supply Chain |
| **IT / Database Administration / Sysadmin** | **78** | **5.05%** | Database Administrator (DBA), Database Engineer, SRE, DevOps, Systems Administrator |
| **Other / Unclassified** | **36** | **2.33%** | Specialized Trainees, CRM Consultants, Radio/Telecom Performance Engineers |
| **Total** | **1,546** | **100.00%** | |

*Notice*: While SQL is canonically assigned to Data Science & Analytics, **51.55% of actual Egyptian hiring demand originates in Software Engineering & Backend Development**, and **19.66% in Business & Operational Analytics**.

#### H. Top 20 Co-Occurring Skills with SQL (in 1,546 Jobs)
| Rank | Skill Name | Co-Occurrence Count | Co-Occurrence Frequency (%) | Skill Type | Domain in Database |
| :---: | :--- | :---: | :---: | :--- | :--- |
| 1 | **Communication** | 748 | 48.38% | Soft Skill | Engineering & Construction |
| 2 | **Python** | 606 | 39.20% | Tool / Software | Human Resources |
| 3 | **Problem Solving** | 601 | 38.87% | Soft Skill | Engineering & Construction |
| 4 | **Git** | 497 | 32.15% | Tool / Software | Operations & Project Management |
| 5 | **Collaboration** | 406 | 26.26% | Soft Skill | Software Engineering & IT |
| 6 | **Analytical Thinking** | 390 | 25.23% | Soft Skill | Operations & Project Management |
| 7 | **JAVA** | 382 | 24.71% | Tool / Software | Software Engineering & IT |
| 8 | **Agile** | 317 | 20.50% | Hard Skill | Operations & Project Management |
| 9 | **Scrum** | 305 | 19.73% | Hard Skill | Operations & Project Management |
| 10 | **AWS** | 297 | 19.21% | Tool / Software | Software Engineering & IT |
| 11 | **English** | 287 | 18.56% | Language | Operations & Project Management |
| 12 | **Docker** | 255 | 16.49% | Tool / Software | Software Engineering & IT |
| 13 | **JavaScript** | 249 | 16.11% | Tool / Software | Software Engineering & IT |
| 14 | **CI/CD** | 239 | 15.46% | Hard Skill | Data Science & Analytics |
| 15 | **Troubleshooting** | 228 | 14.75% | Hard Skill | Software Engineering & IT |
| 16 | **PowerBI** | 222 | 14.36% | Tool / Software | Data Science & Analytics |
| 17 | **RESTful API** | 214 | 13.84% | Hard Skill | Software Engineering & IT |
| 18 | **Data Analysis** | 211 | 13.65% | Hard Skill | Data Science & Analytics |
| 19 | **Microsoft Azure** | 198 | 12.81% | Tool / Software | Software Engineering & IT |
| 20 | **Kubernetes** | 197 | 12.74% | Tool / Software | Software Engineering & IT |

#### I. Top 15 Technical Tools Co-Occurring with SQL
Filtering out soft skills, methodologies, and general competencies:
1. **Python**: 606 (39.20%)
2. **Git**: 497 (32.15%)
3. **JAVA**: 382 (24.71%)
4. **AWS**: 297 (19.21%)
5. **Docker**: 255 (16.49%)
6. **JavaScript**: 249 (16.11%)
7. **PowerBI**: 222 (14.36%)
8. **Microsoft Azure**: 198 (12.81%)
9. **Kubernetes**: 197 (12.74%)
10. **PostgreSQL**: 191 (12.35%)
11. **Microsoft Excel**: 186 (12.03%)
12. **Microsoft SQL Server**: 167 (10.80%)
13. **C#**: 165 (10.67%)
14. **React**: 164 (10.61%)
15. **NoSQL**: 140 (9.06%) / **MySQL**: 140 (9.06%)

---

## 2. Logic Chain

1. **Premise 1 (Data-Structure Divergence)**:
   In `standard_skills_catalog.csv`, `SQL` is duplicated across 8 distinct domain/subcategory combinations. Each row is identical in priority (`Core`) and type (`Tool / Software`).
   *(Reference: Section 1.2.A)*.

2. **Premise 2 (Legacy Ingestion Defect)**:
   When `skills` was originally populated in PostgreSQL, rows were ingested sequentially. Row 2438 (`Human Resources -> HR Operations & People Analytics`) was processed last, causing `skills.domain` for exact SQL to be permanently corrupted as `'Human Resources'` in the database.
   *(Reference: Section 1.3.B)*.

3. **Premise 3 (Linguistic Intelligence Resolution)**:
   In Milestone 1, `linguistic_intelligence` introduced `CANONICAL_SKILL_HOMES` and `CatalogLoader._resolve_duplicate_entries`.
   - If resolved solely by Tier 2 scoring, Row 572 (`Software Engineering & IT -> Backend Development`) would win with Score 140.94280 because `Software Engineering & IT` has a higher tool affinity (40) than `Data Science & Analytics` (35).
   - However, Tier 1 explicitly overrides this with:
     `CANONICAL_SKILL_HOMES["SQL"] = ("Data Science & Analytics", "Data Engineering", "Tool / Software")`.
   *(Reference: Section 1.1.2)*.

4. **Premise 4 (Empirical Labor-Market Reality)**:
   Analysis of 1,546 Egyptian job postings requiring SQL demonstrates that:
   - 51.55% of SQL jobs are Software Engineering / Backend roles.
   - 21.41% are Data Science / Data Analytics / Data Engineering roles.
   - 19.66% are Business & Financial Analytics roles.
   - 5.05% are Database Administration & Infrastructure roles.
   *(Reference: Section 1.3.G)*.

5. **Deduction (Architectural Dual-Citizenship of SQL)**:
   SQL is fundamentally a **horizontal foundational skill**. In the Egyptian market:
   - When required alongside Java, Git, Docker, RESTful APIs, Spring Boot, or C#, SQL represents relational database persistence for software applications.
   - When required alongside Python, Power BI, Excel, Data Analysis, and Data Modeling, SQL represents analytical querying, ETL transformation, and pipeline engineering.
   - Assigning SQL exclusively to `"Data Science & Analytics -> Data Engineering"` in Tier 1 of Milestone 1 provides a clean, deterministic primary canonical home for catalog matching, but **Milestone 2 and downstream skill graph modeling must maintain multi-domain context preservation** so that software developer postings are not erroneously classified as data engineering jobs.

---

## 3. Caveats

1. **Read-Only Database Guarantee**:
   All database queries were executed under `SET SESSION CHARACTERISTICS AS TRANSACTION READ ONLY;`. No database records or schemas were modified.
2. **Category vs Industry Fields**:
   Tables `industries` and `job_industries` in `egypt_jobs_db` currently contain 0 rows. Industry analysis was derived from `jobs.job_category`, `jobs.internal_category`, and verified via raw title keyword parsing.
3. **Homonym Risk in Marketing Skills**:
   The catalog entry `Lead Qualification` (Row 1859) includes alias `SQL/MQL Qualification` where "SQL" refers to *Sales Qualified Lead*. Naive token matching without compound shielding will cause false positives in sales postings.
4. **Acronym Non-Expansion**:
   `SQL` is intentionally preserved as atomic `"SQL"` rather than expanded to `"Structured Query Language"`. `Structured Query Language` is correctly ingested as a known alias pointing to `"SQL"`.

---

## 4. Conclusion

1. **Resolution Mechanism Verified**:
   Milestone 1's `linguistic_intelligence` robustly solves the catalog deduplication problem. `CANONICAL_SKILL_HOMES` successfully anchors `SQL` to `"Data Science & Analytics -> Data Engineering"`, preventing the legacy database bug where SQL inherited `"Human Resources"`.
2. **Market Distribution Established**:
   SQL is the single most demanded database technology in Egypt (1,546 distinct jobs), outranking PostgreSQL (328), Microsoft SQL Server (269), MySQL (223), and NoSQL (153).
3. **Cross-Domain Reality**:
   More than half of Egyptian postings demanding SQL (51.55%) are Backend & Full Stack Engineering roles. Downstream pipelines (Milestone 2 Decomposition and Milestone 3 Graph Construction) must preserve the contextual separation between SQL as a backend development persistence layer versus SQL as an analytical querying engine.

---

## 5. Verification Method

To independently verify all observations and data points in this report, execute the following commands in powershell from the project root:

1. **Verify Milestone 1 CatalogLoader SQL Resolution**:
   ```powershell
   @'
   from linguistic_intelligence.catalog import CatalogLoader
   loader = CatalogLoader()
   entry = loader.exact_match_map["sql"]
   print(f"Canonical SQL: Domain={entry.domain}, Sub={entry.sub_category}, Priority={entry.skill_priority}")
   assert entry.domain == "Data Science & Analytics"
   assert entry.sub_category == "Data Engineering"
   assert entry.source_row_index == 116
   print("CatalogLoader SQL test passed successfully.")
   '@ | python -
   ```

2. **Verify Database Exact SQL Count (1,546 Jobs)**:
   ```powershell
   @'
   import psycopg2
   conn = psycopg2.connect(dbname="egypt_jobs_db", user="postgres", password="postgres", host="localhost", port=5432)
   cur = conn.cursor()
   cur.execute("SET SESSION CHARACTERISTICS AS TRANSACTION READ ONLY;")
   cur.execute("SELECT COUNT(DISTINCT job_id) FROM job_skills WHERE skill_id = 'ff5bfa9b-b023-4414-816c-909819c6b5b9';")
   cnt = cur.fetchone()[0]
   print(f"Distinct SQL Jobs in DB: {cnt}")
   assert cnt == 1546
   cur.close()
   conn.close()
   print("Database SQL count verified.")
   '@ | python -
   ```

3. **Verify Protected Compound Shielding**:
   ```powershell
   @'
   from linguistic_intelligence.proper_nouns import is_protected_compound
   assert is_protected_compound("pl/sql") is True
   print("PL/SQL compound shielding verified.")
   '@ | python -
   ```

4. **Run Milestone 1 Test Suite**:
   ```powershell
   python tests/run_all_tests.py
   ```
