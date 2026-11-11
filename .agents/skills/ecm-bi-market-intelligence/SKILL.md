---
name: ecm-bi-market-intelligence
description: Business intelligence, Egyptian labor market analytics, salary distribution estimation, skill demand trending, geographic segmentation, and analytical reporting standards for Egypt Career Map.
---

# ECM Labor Market Business Intelligence & Analytical Standards

## 1. Domain Scope & Objectives
Governs statistical methodology, metric definitions, labor market intelligence, salary modeling, and analytical reporting derived from Egyptian and regional job postings. Complements the installed `career_intelligence` skill.

### In-Scope
- Skill Demand Trends: frequency calculation using deduplicated job posting counts (`COUNT(DISTINCT job_id)`), period-over-period velocity, and market share.
- Salary Distribution Modeling: median ($p50$), interquartile range ($IQR = p75 - p25$), and confidence intervals adjusted for currency (EGP vs USD vs SAR).
- Geographic & Work-Mode Segmentation: Greater Cairo, Alexandria, Delta, Upper Egypt, Remote (Egypt), Remote (Regional / Gulf).
- Occupational Co-occurrence: pairwise skill affinity with job posting boundary deduplication.
- Novel Skill Funnel Analytics: monitoring discovery rates, quarantine volume, and taxonomy acceptance/rejection ratios.
- Analytical reporting standards: executive dashboards, labor market trends, student skill roadmaps.

### Non-Goals
- Raw dimensional schema DDL (governed by `ecm-analytics-data-modeling`).
- Web scraping extraction (governed by `ecm-web-ingestion-resilience`).

---

## 2. Technical Contracts & Core Analytical Formulations

### Standard PostgreSQL Metric Calculations

#### A. Skill Demand Share ($S_d$) & Frequency
Never compute raw occurrence counts of skills across paragraphs; doing so allows a single repetitive job posting to bias the entire market index.
All skill frequencies MUST be computed using distinct job postings:

$$\text{Skill Frequency}(s, t) = \text{COUNT}(\text{DISTINCT } \text{job\_id}) \quad \text{where skill } s \text{ is present in period } t$$

$$\text{Demand Share } S_d(s, t) = \frac{\text{COUNT}(\text{DISTINCT } \text{job\_id with skill } s \text{ in period } t)}{\text{COUNT}(\text{DISTINCT } \text{job\_id in period } t)}$$

```sql
-- Standard Skill Demand Share Query
SELECT 
    s.skill_id,
    s.canonical_name,
    COUNT(DISTINCT js.job_id) AS distinct_job_postings,
    ROUND(
        COUNT(DISTINCT js.job_id)::NUMERIC / 
        NULLIF(total_jobs.total_count, 0) * 100, 
        2
    ) AS demand_share_percentage
FROM job_skills js
JOIN skills s ON js.skill_id = s.skill_id
JOIN jobs j ON js.job_id = j.id
CROSS JOIN (
    SELECT COUNT(DISTINCT id) AS total_count 
    FROM jobs 
    WHERE posted_at >= :start_date AND posted_at < :end_date
) total_jobs
WHERE j.posted_at >= :start_date AND j.posted_at < :end_date
GROUP BY s.skill_id, s.canonical_name, total_jobs.total_count
ORDER BY distinct_job_postings DESC;
```

#### B. Skill Demand Velocity & Growth Trend ($\Delta S_d$)
To track rising or declining skills between observation window $t_1$ and baseline window $t_0$ (e.g. trailing 30 days vs preceding 30 days):

$$\text{Growth Trend}(s) = \frac{S_d(s, t_1) - S_d(s, t_0)}{S_d(s, t_0)} \times 100\%$$

*Minimum Sample Guard:* Suppress percentage trend reporting if distinct postings in $t_0 < 25$ to prevent wild percentage swings on sparse data.

#### C. Deduplicated Pairwise Skill Co-occurrence
Pairwise skill affinity measures which technologies are sought together on the same vacancy. Counts MUST be deduplicated by `job_id`:

$$\text{Co-occurrence}(s_1, s_2) = \text{COUNT}(\text{DISTINCT } \text{job\_id where both } s_1 \text{ and } s_2 \text{ appear})$$

$$\text{Jaccard Affinity}(s_1, s_2) = \frac{\text{Co-occurrence}(s_1, s_2)}{\text{COUNT}(\text{DISTINCT } \text{job\_id where } s_1 \text{ OR } s_2 \text{ appears})}$$

#### D. Novel Skill Funnel Metrics
To audit the health and coverage of the extraction taxonomy:
- **Novel Skill Discovery Rate:** $\frac{\text{Postings with } \ge 1 \text{ Quarantined Novel Skill}}{\text{Total Distinct Postings}}$.
- **Taxonomy Conversion Rate:** $\frac{\text{Quarantined Skills Promoted to Taxonomy}}{\text{Total Quarantined Candidate Proposals}}$.

---

## 3. Step-by-Step BI Analysis Workflow

1. **Cohort & Window Specification:**
   - Define exact observation window (e.g., trailing 90 days), geographic filter, and job role domain.
2. **Postgres Materialization:**
   - Query curated analytical tables (`fact_job_postings`, `dim_skills`) using `COUNT(DISTINCT job_id)`.
3. **Outlier Filtering & Salary Stratification:**
   - Suppress salary statistics when sample size $N < 30$.
   - Compute Median ($p50$) and IQR ($p75 - p25$); separate EGP, USD, and SAR currencies.
4. **Co-occurrence Graph Generation:**
   - Generate top-5 affinity pairs for each major technical skill.
5. **Dashboard Export:**
   - Export structured JSON containing metric values, sample sizes ($N$), date boundaries, and confidence indicators.

---

## 4. Failure Modes & Mitigations

| Failure Mode | Root Cause | Mitigation Strategy |
|---|---|---|
| **Posting Frequency Inflation** | Repetitive skill mentions in a single job posting inflate count. | Enforce `COUNT(DISTINCT job_id)` in all SQL queries and aggregation pipelines. |
| **Denominator Drift** | Calculating trends across periods with unequal scrape completeness. | Use percentage share ($S_d$) rather than raw posting volume to normalize for ingestion variance. |
| **Misleading Salary Averages** | Outlier high USD remote salaries distort Egyptian local averages. | Isolate currency dimensions; present EGP and USD distributions separately. |
| **Small-Sample Spikes** | A rare skill jumping from 1 to 3 postings reported as 200% growth. | Require minimum absolute volume threshold ($N \ge 25$) before reporting growth percentages. |

---

## 5. Verification Checklist

- [ ] All skill demand queries use `COUNT(DISTINCT job_id)`.
- [ ] Percentage share trends normalize against total unique vacancies in respective periods.
- [ ] Co-occurrence calculations deduplicate at the `job_id` boundary.
- [ ] Salary metrics report median and IQR ($p25$, $p75$) with tagged currencies.
- [ ] Novel skill funnel metrics tracked for taxonomy governance.

---

## 6. Primary References
- **ILO (International Labour Organization) Labor Market Indicators**: https://ilostat.ilo.org/
- **World Economic Forum (Future of Jobs Report)**: WEF Research.
- **PostgreSQL Window Functions Documentation**: https://www.postgresql.org/docs/current/tutorial-window.html
