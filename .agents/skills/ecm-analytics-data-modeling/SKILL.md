---
name: ecm-analytics-data-modeling
description: Dimensional data modeling, star schemas, fact and dimension design, slowly changing dimensions (SCD), and semantic analytical layers for Egypt Career Map.
---

# ECM Analytical Data Modeling & Dimensional Architecture

## 1. Domain Scope & Objectives
Governs the design, implementation, and optimization of analytical star schemas, fact tables, dimensional models, and semantic layers supporting BI dashboards, reporting, and labor intelligence queries.

### In-Scope
- Dimensional modeling methodology (Kimball star schema and snowflake schema patterns).
- Fact table design: Transaction facts (job posting events), Periodic snapshot facts (monthly skill demand summaries), Accumulating snapshot facts (job posting lifecycle).
- Dimension table design: Conformed dimensions (Dim_Job_Role, Dim_Skill, Dim_Company, Dim_Location, Dim_Date).
- Slowly Changing Dimensions (SCD Type 1 overwrite vs SCD Type 2 history tracking).
- Declarative grain specification for every analytical entity.
- Semantic layer definitions: standard metric aggregations, business calculation logic.

### Non-Goals
- OLTP transaction isolation and row-level locking (see `ecm-postgresql-architecture`).
- BI statistical interpretation (see `ecm-bi-market-intelligence`).

---

## 2. Technical Contracts & Standards

### The Kimball Dimensional Modeling Rules
1. **Declare the Grain First:**
   - Every fact table must begin with an explicit, unambiguous grain declaration.
   - Example (`Fact_Job_Skill_Bridge`): *One row represents the occurrence of one canonical skill extracted from one unique job posting vacancy.*
2. **Conformed Dimensions:**
   - Shared dimensions must have consistent surrogate keys and attributes across all marts:
     * `Dim_Date`: Standard integer date surrogate `date_key = YYYYMMDD` (e.g., `20261111`).
     * `Dim_Skill`: Canonical `skill_id`, `canonical_name`, `skill_category`, `subcategory`.
     * `Dim_Location`: `location_id`, `governorate`, `city`, `region_tier`, `is_greater_cairo`.
3. **Surrogate Keys vs Natural Keys:**
   - Fact tables must reference integer/UUID surrogate keys from dimension tables, never volatile natural business keys.
4. **Additive, Semi-Additive & Non-Additive Measures:**
   - Clearly document measure additivity. (e.g., `vacancy_count` is fully additive across all dimensions; `median_salary` is non-additive and must not be summed).

---

## 3. Step-by-Step Dimensional Design Workflow

1. **Identify the Business Process:**
   - Example: Labor market vacancy publication and skill demand tracking.
2. **Declare the Grain:**
   - Document grain in table comment and schema definition:
     `-- Grain: One row per unique job vacancy per scraping ingestion run.`
3. **Identify Dimensions:**
   - Date, Employer/Company, Job Role/Family, Geographic Location, Industry, Seniority Level.
4. **Identify Facts & Measures:**
   - Numeric measures: `min_salary`, `max_salary`, `experience_years_required`, `days_open`.
   - Count flags: `is_remote_flag`, `is_tech_sector_flag`.
5. **Construct Schema DDL:**
   - Create tables with foreign key constraints to conformed dimensions.
   - Partition large fact tables by date range (e.g., monthly partitions) if row counts exceed 5 million rows.
6. **Semantic Metric Layer Mapping:**
   - Document canonical SQL metric formulas in `registry.yaml` or semantic catalog.

---

## 4. Failure Modes & Mitigations

| Failure Mode | Root Cause | Mitigation Strategy |
|---|---|---|
| **Fact Table Fan-Out / Double Counting** | Joining bridge tables with 1-to-many relationships without grouping at proper grain. | Aggregate bridge table facts before joining to summary queries; document non-additive metrics. |
| **Volatile Dimensions Overwriting History** | Modifying company location using SCD Type 1 changes historical vacancy geographic distribution. | Use SCD Type 2 (`valid_from`, `valid_to`, `is_current`) when dimensional history tracking is required. |
| **Missing Dim_Date Records** | Missing dates cause inner joins to drop facts from dashboards. | Pre-populate `Dim_Date` with 20 years of consecutive calendar days, holidays, and fiscal periods. |
| **Fact Grain Ambiguity** | Developer assumes fact table is daily snapshot, but it contains raw transactional events. | Enforce mandatory comment `-- Grain: ...` at the top of every fact table migration file. |

---

## 5. Verification Checklist

- [ ] Every fact table declares its exact grain in an explicit comment.
- [ ] Dimension tables utilize surrogate primary keys.
- [ ] Conformed dimensions (`Dim_Date`, `Dim_Location`, `Dim_Skill`) shared across analytical marts.
- [ ] Non-additive measures (medians, averages, rates) flagged to prevent invalid `SUM()` aggregation.
- [ ] Date dimension pre-populated with consecutive calendar records.

---

## 6. Primary References
- **The Data Warehouse Toolkit (Ralph Kimball & Margy Ross)**: 3rd Edition, Wiley.
- **dbt Dimensional Modeling Design Patterns**: https://docs.getdbt.com/guides/dimensional-modeling
- **Star Schema: The Complete Reference (Christopher Adamson)**: McGraw-Hill.
