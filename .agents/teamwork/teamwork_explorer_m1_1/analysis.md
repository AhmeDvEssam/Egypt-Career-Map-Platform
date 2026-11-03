# Technical Analysis: Reference Catalog Ingestion & Priority Resolution (Feature 1)

**Agent:** `teamwork_explorer_m1_1`  
**Milestone:** M1 — Architectural Foundation & Reference Catalog Engine  
**Target Module:** `linguistic_intelligence/catalog.py`  
**Audited Assets:**
- `standard_skills_catalog.csv` (1,736,971 bytes, 3,794 rows, semicolon-delimited, UTF-8-sig)
- `skills_acronym_dictionary.json` (127,952 bytes, 386 verified entries)
- `standard_skill_levels_matrix.csv` (3,796 bytes, 23 canonical rows, semicolon-delimited)
- `skills.csv` (5,586,089 bytes, 28,824 rows)

---

## 1. Catalog Empirical Profile

### 1.1 Structural Metrics
- **Total Records:** Exactly 3,794 rows across 8 columns.
- **Delimiter:** Semicolon (`;`), UTF-8-sig encoded.
- **Unique Standard Skill Names:** Exactly 2,756 unique names.
- **Duplicate Skill Names:** Exactly 281 unique names recur across multiple rows, representing 1,319 total rows (34.77% of catalog).
- **Taxonomy:** Exactly 14 Domains and 61 Subcategories. Closed taxonomy. Zero nulls in domain, subcategory, skill_type, or skill_priority.
- **Precompiled Regex Integrity:** All 3,794 initial regex patterns compile cleanly under Python `re.compile(pat, re.IGNORECASE)` with zero syntax errors.
- **Aliases:** 5,609 total parsed alias strings; 173 cross-skill alias collisions detected (e.g. `ms sql`, `eda`, `ci/cd`).

### 1.2 Breakdown of 281 Duplicate Skill Names by Skill Type
| Skill Type | Unique Names | Total Rows | Nature of Overlap |
|---|---|---|---|
| `Tool / Software` | 141 | 518 | Cross-domain tools (Python, SQL, Excel, Git, Jira, Docker, AWS, etc.) inserted into functional departments (HR, Sales, Operations). |
| `Hard Skill` | 78 | 241 | Cross-discipline technical concepts (Computer Science, Clean Code, CI/CD, Algorithms, Data Modeling). |
| `Soft Skill` | 36 | 402 | Universal soft skills (Problem Solving, Communication, Teamwork, Time Management) duplicated across up to 8 domains. |
| `Certification` | 22 | 70 | Industry certifications (ACCA, CFA, CIPD, CMA, PMP, SHRM-CP) duplicated across subcategories within the same domain. |
| `Language` | 4 | 78 | Pervasive spoken languages (English, Arabic, French, German) duplicated across 7 business domains. |
| `Requirement` | 2 | 7 | Non-standard prerequisites (Driver's License, Work Permit). |
| `Methodology` / Cross-type | 5 | 10 | 5 skills with conflicting types (`5S Methodology`, `Change Management`, `Confidentiality`, `Kaizen Continuous Improvement`, `Lean Manufacturing`). |

---

## 2. Root-Cause Analysis: The Flat-Dictionary Overwrite Bug

### 2.1 The Mechanism
In legacy prototype code (`scratch/atomic_decomposition_engine.py`, lines 118–134) and initial scraper generation scripts:
```python
exact_catalog_map = {}
for idx, r in df.iterrows():
    s_name = str(r['standard_skill_name']).strip()
    info = {'name': s_name, 'domain': dom, 'sub_category': sub, 'skill_type': stype}
    exact_catalog_map[s_name.lower()] = info
```
Because dictionary assignment is unconditional and processes the CSV sequentially from top to bottom, **the last row in the CSV file always wins**.

### 2.2 Why Python Became Human Resources
In `standard_skills_catalog.csv`, domains appear in strict vertical blocks:
- Rows 0–571: `Data Science & Analytics`
- Rows 572–1261: `Software Engineering & IT`
- Rows 1262–1652: `Business & Finance`
- Rows 1653–2017: `Marketing & Sales`
- Rows 2018–2505: `Human Resources`
- Rows 2857–3239: `Operations & Project Management`
- Rows 3240–3370: `Engineering & Construction`

`Python` appears 10 times in the catalog:
1. Row 6: `Data Science & Analytics` / `Business Intelligence & Data Analytics` (`Core`)
2. Row 117: `Data Science & Analytics` / `Data Engineering` (`Core`)
3. Row 231: `Data Science & Analytics` / `Machine Learning & Data Science` (`Core`)
4. Row 345: `Data Science & Analytics` / `Artificial Intelligence & Deep Learning` (`Core`)
5. Row 473: `Data Science & Analytics` / `Data Governance, Quality & Architecture` (`Core`)
6. Row 585: `Software Engineering & IT` / `Backend Development` (`Core`)
7. Row 922: `Software Engineering & IT` / `DevOps & Cloud Infrastructure` (`Core`)
8. Row 1051: `Software Engineering & IT` / `Quality Assurance & Testing` (`Core`)
9. Row 1162: `Software Engineering & IT` / `Cybersecurity & Information Security` (`Core`)
10. **Row 2439: `Human Resources` / `HR Operations & People Analytics` (`Core`)**

Because Row 2439 is the **10th and final occurrence**, `exact_catalog_map['python']` was overwritten by `Human Resources`!
Furthermore, because EVERY ONE of the 10 rows has `skill_priority == 'Core'`, sorting by `skill_priority` alone fails to break ties.

### 2.3 Other Catastrophic Overwrites in Existing Database
The same bug infected the live PostgreSQL `public.skills` table and `skills.csv`:
- `SQL` (Row 2438, HR) -> Overwritten to `Human Resources / HR Operations & People Analytics`
- `Microsoft Excel` (Row 3157, Operations) -> Overwritten to `Operations & Project Management / Office & Administrative Management`
- `Git` (Row 2961, Operations) -> Overwritten to `Operations & Project Management / Project & Agile Management (PMP, Agile, Scrum)`
- `Jira` (Row 3083, Operations) -> Overwritten to `Operations & Project Management / Customer Service & Support Operations`
- `Communication`, `Problem Solving`, `Teamwork` -> Overwritten to `Engineering & Construction / Civil & Structural Engineering` (Row 3270+)

---

## 3. Two-Tier Priority Resolution Architecture

To eliminate this flaw deterministically, the `CatalogLoader` implements a 2-Tier Resolution Engine:

```
Catalog Ingestion (3,794 rows)
     │
     ▼
Group rows by lower(standard_skill_name)
     │
     ├─► [Group Size == 1]: Direct unique assignment
     │
     └─► [Group Size > 1]: Duplicate Resolution (281 unique skills)
           │
           ├── Tier 1: Explicit Canonical Homes Table (CANONICAL_HOMES)
           │     Check if normalized skill exists in curated dictionary.
           │     If found, extract row matching (canonical_domain, canonical_sub_category).
           │
           └── Tier 2: Algorithmic Multi-Factor Scoring Engine
                 If not in Tier 1, compute composite score:
                 Score = Priority_Weight + Domain_Affinity_Score + Position_Tiebreaker
                 Where:
                 - Priority_Weight: Core=100, Foundational=50, Secondary=10
                 - Domain_Affinity_Score: Skill-type specific domain affinity
                 - Position_Tiebreaker: First occurrence in catalog preferred
```

### 3.1 Tier 1: Curated Canonical Homes (`CANONICAL_HOMES`)
For industry-standard tools, programming languages, and frameworks with established primary homes, explicit mappings guarantee 100% deterministic precision:

```python
CANONICAL_HOMES = {
    # Programming Languages & Backend
    'python': ('Software Engineering & IT', 'Backend Development'),
    'c++': ('Software Engineering & IT', 'Backend Development'),
    'c#': ('Software Engineering & IT', 'Backend Development'),
    'java': ('Software Engineering & IT', 'Backend Development'),
    'node.js': ('Software Engineering & IT', 'Backend Development'),
    'php': ('Software Engineering & IT', 'Backend Development'),
    'go': ('Software Engineering & IT', 'Backend Development'),
    'rust': ('Software Engineering & IT', 'Backend Development'),
    'postgresql': ('Software Engineering & IT', 'Backend Development'),
    'mongodb': ('Software Engineering & IT', 'Backend Development'),
    'redis': ('Software Engineering & IT', 'Backend Development'),

    # Data Engineering & Warehousing
    'sql': ('Data Science & Analytics', 'Data Engineering'),
    'apache spark': ('Data Science & Analytics', 'Data Engineering'),
    'apache kafka': ('Data Science & Analytics', 'Data Engineering'),
    'snowflake': ('Data Science & Analytics', 'Data Engineering'),
    'dbt': ('Data Science & Analytics', 'Data Engineering'),

    # Business Intelligence & Analytics Tools
    'microsoft excel': ('Data Science & Analytics', 'Business Intelligence & Data Analytics'),
    'power bi': ('Data Science & Analytics', 'Business Intelligence & Data Analytics'),
    'tableau': ('Data Science & Analytics', 'Business Intelligence & Data Analytics'),

    # Cloud, DevOps & Infrastructure
    'git': ('Software Engineering & IT', 'DevOps & Cloud Infrastructure'),
    'docker': ('Software Engineering & IT', 'DevOps & Cloud Infrastructure'),
    'kubernetes': ('Software Engineering & IT', 'DevOps & Cloud Infrastructure'),
    'linux': ('Software Engineering & IT', 'DevOps & Cloud Infrastructure'),
    'bash': ('Software Engineering & IT', 'DevOps & Cloud Infrastructure'),
    'aws': ('Software Engineering & IT', 'DevOps & Cloud Infrastructure'),
    'azure devops': ('Software Engineering & IT', 'DevOps & Cloud Infrastructure'),
    'terraform': ('Software Engineering & IT', 'DevOps & Cloud Infrastructure'),
    'ci/cd': ('Software Engineering & IT', 'DevOps & Cloud Infrastructure'),

    # Project & Agile Management Tools
    'jira': ('Operations & Project Management', 'Project & Agile Management (PMP, Agile, Scrum)'),
    'confluence': ('Operations & Project Management', 'Project & Agile Management (PMP, Agile, Scrum)'),
    'asana': ('Operations & Project Management', 'Project & Agile Management (PMP, Agile, Scrum)'),
    'trello': ('Operations & Project Management', 'Project & Agile Management (PMP, Agile, Scrum)'),

    # Frontend Development
    'typescript': ('Software Engineering & IT', 'Frontend Development'),
    'javascript': ('Software Engineering & IT', 'Frontend Development'),
    'html': ('Software Engineering & IT', 'Frontend Development'),
    'css': ('Software Engineering & IT', 'Frontend Development'),
    'react': ('Software Engineering & IT', 'Frontend Development'),
    'angular': ('Software Engineering & IT', 'Frontend Development'),
    'vue.js': ('Software Engineering & IT', 'Frontend Development'),
    'figma': ('Software Engineering & IT', 'Frontend Development'),

    # QA & Testing
    'postman': ('Software Engineering & IT', 'Quality Assurance & Testing'),
    'selenium': ('Software Engineering & IT', 'Quality Assurance & Testing'),
    'cypress': ('Software Engineering & IT', 'Quality Assurance & Testing'),
    'jmeter': ('Software Engineering & IT', 'Quality Assurance & Testing'),

    # Spoken Languages
    'english': ('Operations & Project Management', 'Customer Service & Support Operations'),
    'arabic': ('Operations & Project Management', 'Customer Service & Support Operations'),
    'french': ('Operations & Project Management', 'Customer Service & Support Operations'),
    'german': ('Operations & Project Management', 'Customer Service & Support Operations'),
}
```

### 3.2 Tier 2: Multi-Factor Scoring Formula
For all other duplicate skills (e.g. newly added tools, soft skills, general technical terms):
$$\text{Score} = W_{\text{priority}} + A_{\text{domain}}(\text{skill\_type}, \text{domain}) + \left(1 - \frac{\text{row\_index}}{10000}\right)$$

Where:
- $W_{\text{priority}}$:
  - `Core` = 100
  - `Foundational` = 50
  - `Secondary` = 10
  - Missing = 0
- $A_{\text{domain}}(\text{skill\_type}, \text{domain})$:
  - If `Tool / Software`:
    - `Software Engineering & IT`: +40
    - `Data Science & Analytics`: +35
    - `Engineering & Construction`: +25
    - `Manufacturing & Industrial Production`: +20
    - `Operations & Project Management`: +15
    - `Business & Finance`: +10
    - `Marketing & Sales`: +5
    - `Human Resources`: +0
  - If `Soft Skill`:
    - `Operations & Project Management`: +30
    - `Human Resources`: +25
    - `Business & Finance`: +20
    - `Marketing & Sales`: +15
    - `Data Science & Analytics`: +10
    - `Software Engineering & IT`: +10
    - `Engineering & Construction`: +0
  - If `Language`:
    - `Operations & Project Management`: +30
    - Others: +10
- Position tiebreaker: earlier catalog index wins.

### 3.3 Context-Aware Query Support
The `CatalogLoader` supports optional `context_domain` parameters:
```python
def get_exact_match(self, text: str, context_domain: Optional[str] = None) -> Optional[StandardSkillEntry]:
```
If an atomic skill was extracted from a raw skill or job context known to belong to a specific domain (e.g. `Human Resources`), the loader first checks whether the skill exists within that domain. If not, or if `context_domain is None`, it seamlessly returns the priority-resolved canonical entry.

---

## 4. Frozen Data Contracts & Dataclass Structures

### 4.1 StandardSkillEntry
```python
@dataclass(frozen=True)
class StandardSkillEntry:
    standard_skill_name: str
    domain: str
    sub_category: str
    skill_type: str
    applicable_level_category: str
    skill_priority: str
    known_aliases: Tuple[str, ...]
    initial_regex_pattern: str
    source_row_index: int
    compiled_regex: Optional[re.Pattern] = None
```

### 4.2 AcronymEntry
```python
@dataclass(frozen=True)
class AcronymEntry:
    acronym: str
    full_name: str
    canonical_skill_name: str
    domain: str
    sub_category: str
    skill_type: str
    source: str
```

### 4.3 LevelMatrixEntry
```python
@dataclass(frozen=True)
class LevelMatrixEntry:
    skill_type: str
    level_category: str
    standard_level: str
    rank_order: int
    regex_patterns: str
    arabic_patterns: str
    example_usage: str
    compiled_regex: Optional[re.Pattern] = None
    compiled_arabic_regex: Optional[re.Pattern] = None
```

---

## 5. Verification Results

Empirical verification of the prototype `CatalogLoader`:
1. **Catalog Rows:** 3,794 rows loaded from `standard_skills_catalog.csv` in 0.12 seconds.
2. **Canonical Index Size:** Exactly 2,756 unique entries.
3. **Alias Index Size:** Exactly 5,065 unique alias keys.
4. **Acronym Index Size:** Exactly 386 verified acronyms loaded from `skills_acronym_dictionary.json`.
5. **Exact Match Test:**
   - `Python` -> `Software Engineering & IT / Backend Development` (PASS)
   - `SQL` -> `Data Science & Analytics / Data Engineering` (PASS)
   - `Microsoft Excel` -> `Data Science & Analytics / Business Intelligence & Data Analytics` (PASS)
   - `Excel` (alias) -> `Data Science & Analytics / Business Intelligence & Data Analytics` (PASS)
   - `Git` -> `Software Engineering & IT / DevOps & Cloud Infrastructure` (PASS)
   - `Jira` -> `Operations & Project Management / Project & Agile Management (PMP, Agile, Scrum)` (PASS)
   - `Power BI` -> `Data Science & Analytics / Business Intelligence & Data Analytics` (PASS)
   - `PBI` (alias) -> `Data Science & Analytics / Business Intelligence & Data Analytics` (PASS)
   - `Docker` -> `Software Engineering & IT / DevOps & Cloud Infrastructure` (PASS)
6. **Proper Noun Checks:**
   - `is_protected_proper_noun("Lead Generation")` -> `True`
   - `is_protected_proper_noun("GitHub Advanced Security")` -> `True`
7. **Compound Checks:**
   - `is_protected_compound("PL/SQL")` -> `True`
   - `is_protected_compound("CI/CD")` -> `True`
8. **Regex Scan Speed:** 8 queries executed across 2,756 precompiled regex patterns in 0.0153 seconds (average: 1.91 ms per search).
