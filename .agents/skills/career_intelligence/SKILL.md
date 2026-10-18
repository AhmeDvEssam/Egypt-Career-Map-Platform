---
name: career_intelligence
description: Implements the 100-Point Egypt Career Intelligence Architecture, transforming raw PostgreSQL data into metrics, derived analytics, insights, and 3D geospatial visualizations.
---

# Egypt Career Intelligence Architecture

## 1. Goal of the Analysis Layer
The analysis layer is not just an API that returns job counts. It transforms raw data through 4 stages:
`Raw Data -> Clean/Normalize -> Metrics -> Derived Analytics -> Insights -> Visualization / AI Explanation`

God's Eye View (or any frontend) is strictly a **Consumer** of these results.
`PostgreSQL -> Analytics Engine -> Career Intelligence API -> God's Eye View`
No heavy calculations happen on the 3D Globe or frontend.

---

## 2. The 4 Core Tables
- **companies**: The Economic Entity (name, industry, size, city, neighborhood, latitude/longitude). Used for geography, clusters, hiring density.
- **jobs**: The Labor Demand (company, title, category, level, work_mode, salary, skills, posted_at, status). The most critical table.
- **candidates**: The Observed Labor Supply (predicted_category, experience, city, skills, status). *Must always be referred to as "Observed Candidate Supply", not a market census.*
- **applications**: Supply & Demand Interaction (match score, funnel, geography).

---

## 3. Data Normalization
Before analysis, titles, categories, levels, work modes, cities, and skills must be normalized (e.g. `canonical_title`, `canonical_category`).

## 4. Skills Architecture (Critical Recommendation)
Skills must NOT remain just a JSON array. They must be relational:
- `skills` (id, name, canonical_name, category)
- `job_skills` (job_id, skill_id)
- `candidate_skills` (candidate_id, skill_id)
This enables skill frequency, co-occurrence, gap analysis, and network graphing.

---

## Core Analytics Modules (The 100 Points Summary)

### Market Overview & Geography
- **Market Overview**: Snapshot of Total Jobs, Open Jobs, Companies, Cities, Candidates.
- **City Job Demand**: Jobs, Open Jobs, Companies grouped by City.
- **City Career Profile**: Full profile per city (Top categories, top skills, salary stats).
- **Job Density Layer**: City centroid + marker height = job count.
- **Company Density & Clusters**: Spatial clustering based on company exact coordinates to discover hot zones (e.g. New Cairo tech cluster).
- **Neighborhood Intelligence**: Drill down from City -> Neighborhood -> Companies.

### Skills Analytics
- **Category Demand**: Jobs by category (Software, Data, etc.) crossed with City.
- **Skill Demand Analysis & Rate**: Not just count, but % of relevant jobs (e.g., SQL is in 78% of Data jobs).
- **Skill Geography**: Skill demand rate mapped to cities (Heatmap).
- **Skill Co-occurrence & Network**: What skills appear together? (P(B|A)). Used to build the "Egyptian Job Skill Network" graph.
- **Skill Evolution**: Demand rate by month. Rising vs Declining skills (Descriptive trend, not prediction).

### Salary Intelligence
- **Salary Visibility**: % of jobs that expose salary data. (CRITICAL: Every salary insight MUST include sample size and visibility %).
- **Salary Representation**: Estimated Midpoint = (min+max)/2. Never invent a missing min or max.
- **Salary Cuts**: By City, by Category, by Level, by Work Mode.

### Work Mode & Timing
- **Work Mode Analysis**: On-site vs Hybrid vs Remote.
- **Remote Opportunity Geography**: Differentiate between Company Location and Job Performance Location.
- **Freshness & Temporal Analysis**: Jobs by age (0-7 days, 8-30 days). Flow of postings over time (Not historical active stock unless lifecycle timestamps exist).

### Company Intelligence
- **Company Hiring Activity**: Jobs, Top Categories, Top Skills per company.
- **Company Career Fingerprint**: Statistical profile of a company's hiring habits.
- **Company Concentration**: Market share of jobs by company / HHI index.

### Supply vs Demand (Candidate vs Job)
- **Candidate Supply**: Active candidates by City, Category, Skill.
- **Supply vs Demand (Skill Gap Index)**: Demand Rate - Supply Rate = Gap (e.g. +22 percentage points). Much more accurate than subtracting raw counts.
- **Candidate Opportunity Density**: Matching jobs within 5km/10km, remote matches, high-match counts.
- **Personal Career Globe**: Map transforms to "MY OPPORTUNITIES" based on a candidate's profile.
- **Match Score & Funnel**: Evaluate the Resume Matcher AI. Application flow (origin city -> destination city).
- **Unlockable Opportunities**: Simulating adding a missing skill to calculate incremental new job matches (must be calculated via DB query, not LLM hallucination).

### Geospatial Layers & Interaction
- **Career Hotspot**: A composite index (job density + company density + skill diversity + recent activity). UI must explain *why* it is a hotspot.
- **Spatial Levels (LOD)**: 
  - Zoom 1: Country -> City aggregates
  - Zoom 2: City -> Company clusters
  - Zoom 3: District -> Companies
  - Zoom 4: Company -> Jobs

### Data Quality & Rules
- **Data Quality Analysis**: % coverage for every column used in an insight.
- **LLM Rule**: The LLM must NEVER invent a conclusion (e.g. "Cairo is the best city for Data"). The Engine calculates the facts (Jobs, Companies, Demand Rate), and the LLM only explains the structured facts.
- **Insight Object Structure**: Standardized JSON output (`type`, `metrics`, `sample`, `confidence`) for every analysis so the frontend is dumb.

---

## Implementation Roadmap

### Phase 1: Core MVP (Current Focus)
1. Jobs by City
2. Companies by City
3. Job Density
4. Category Demand
5. Skill Demand
6. Skill Geography
7. Company Profiles
8. Work Mode
9. Career Level
10. Salary Coverage
11. Salary by City/Category
12. Posting Trends
13. Candidate Density
14. Candidate Supply
15. Skill Gap
16. Candidate -> Matching Jobs
17. Match Score
18. Basic Application Funnel

### Phase 2 & 3: Advanced
- Skill Co-occurrence, Industry Geography, Application Flows, Personalized Skill Gaps, NLP Queries, Voice Queries, Insight Stories.

## Important Note on Schema Additions
To achieve full capability, the following must be added to the schema:
1. `source`, `external_id`, `url` for deduplication.
2. `first_seen_at`, `last_seen_at`, `closed_at` for historical lifecycle.
3. `required_experience_min/max` in jobs for accurate supply vs demand matching.
4. Relational skills structure (currently completed/in progress).
