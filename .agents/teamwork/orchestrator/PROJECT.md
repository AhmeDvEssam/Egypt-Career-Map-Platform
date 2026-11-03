# Project: Egypt Career Map — Atomic Skill Decomposition Engine

## Architecture

The Atomic Skill Decomposition Engine transforms raw skill expressions from Egyptian job postings into atomic, context-preserved skill components mapped against a reference catalog without premature normalization, vector embeddings, or database mutations.

### High-Level Data Flow:
```
raw_skills (skills.csv / egypt_jobs_db)
    │
    ▼
[Pass 0: Proper Noun & Acronym Shield]
    │
    ▼
[Pass 1: Whole-Skill Reference Catalog Match]
    │
    ▼
[Pass 2: Parentheses Typology Engine]
    ├── Case 1: Level-only (e.g. '(Advanced)') -> extracted_skill_level
    ├── Case 2: Acronym/Full-name (e.g. 'AWS (Amazon Web Services)') -> dual tokens
    ├── Case 3: Category Container (e.g. 'Tools (Jira, Git)') -> sidecar + inner tokens
    ├── Case 4: Industry Context (e.g. 'Sales (Real Estate)') -> sidecar + core skill
    └── Case 5: Sub-skill Specification (e.g. 'Data Analysis (SQL)') -> PARENTHESIS_SPECIFICATION
    │
    ▼
[Pass 3: Protected Compound Masking & Hierarchical Delimiter Split]
    ├── Compound Shield (PL/SQL, CI/CD, UI/UX, AI/ML, C/C++, R&D, etc.)
    └── Delimiters: &, /, ,, -, and
    │
    ▼
[Pass 4: Atomic Processing, Level Governance & Taxonomy Tagging]
    ├── Two-Column Level Engine: extracted_skill_level (verbatim) vs skill_level (canonical)
    ├── Controlled Level Rules: Ambiguous ('Strong') -> Not Specified; Soft Skills -> Not Specified
    ├── Credential Track Separation (ISTQB Advanced -> extracted='Advanced', sidecar='Advanced Level')
    ├── Spoken Language CEFR Codes (explicit only)
    ├── Suffix / Prefix Stripping & Noise Rejection (REJECTED_NOISE + reason)
    └── Novel Skill Retention (UNMATCHED_NOVEL, domain='Unknown', sub_category='Unknown')
    │
    ▼
[Outputs]
    ├── 14-Column Main Dataset: egypt_skills_decomposed_graph.csv
    └── 11-Column Sidecar Metadata: egypt_skills_decomposition_metadata.csv (PostgreSQL bulk enrichment)
```

---

## Feature Inventory

Every feature discovered in the Survey phase is mapped to its assigned milestone:

| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Reference Catalog Ingestion (Semicolon & Priority) | Ingest `standard_skills_catalog.csv` (3,794 rows, 14 domains, 61 subcategories) using `;` delimiter; priority-weighted deduplication preventing domain overwrites (e.g. Python -> Backend). | M1 | Survey Agent 2 & 3 |
| 2 | Acronym & Level Matrix Loading | Ingest `skills_acronym_dictionary.json` (386 entries) and `standard_skill_levels_matrix.csv` (23 rows); clean legacy conflations. | M1 | Survey Agent 1 & 3 |
| 3 | Proper Noun & Acronym Shielding (Pass 0) | Contextual shield for multi-word disciplines (`Lead Generation`), healthcare roles (`Senior Care`), security tools (`GitHub Advanced Security`), and 386 acronyms. | M1 | Survey Agent 1 & 2 |
| 4 | Whole-Skill Catalog Matching (Pass 1) | Match full raw skill string against catalog before any splitting (exact match first -> regex match second). | M2 | Survey Agent 1 & 2 |
| 5 | Parentheses Typology Engine (Pass 2) | 5-way classification: Level-only, Acronym/Full-name, Category Container, Industry Context, Sub-skill Specification. | M2 | Survey Agent 1 & 2 |
| 6 | Protected Compound Masking (Pass 3) | Shield 93 slash compounds (`PL/SQL`, `CI/CD`, `UI/UX`, `AI/ML`, `C/C++`) and 31 ampersand compounds (`R&D`, `P&L`, `P&ID`). | M2 | Survey Agent 1, 2, 3 |
| 7 | Hierarchical Delimiter Splitting (Pass 3) | Split unshielded tokens across `&`, `/`, `,`, `-`, and `and`; preserve `separated_by`, `separated_from_before`, `separated_from_after`. | M2 | Survey Agent 1 |
| 8 | Two-Column Level Governance (Pass 4) | Verbatim extraction in `extracted_skill_level` (preserving casing/spacing); canonical normalized level in `skill_level`. | M3 | Survey Agent 1 & 2 |
| 9 | Ambiguous & Special Level Rules (Pass 4) | "Strong" / "Solid" -> `Not Specified`; Soft Skills -> `Not Specified`; Seniority modifiers (`Senior`, `Lead`) -> sidecar; Certifications -> exam tier vs award status; CEFR -> language only. | M3 | Survey Agent 1 & 2 |
| 10 | Suffix / Prefix Stripping & Noise Rejection (Pass 4) | Strip level/filler words cleanly; filter non-skills with explicit `rejection_reason` (length < 2, stopwords, job titles, requirements). | M3 | Survey Agent 1 & 2 |
| 11 | Catalog Reference Matching & Novel Retention (Pass 4) | Assign approved catalog metadata; retain unmatched novel skills with `match_status = 'UNMATCHED_NOVEL'`, `matched_atomic_skill = NULL`, `domain = 'Unknown'`, `sub_category = 'Unknown'`. | M3 | Survey Agent 1 |
| 12 | Read-Only PostgreSQL Bulk Metadata Querying | Execute 3 bulk queries on `egypt_jobs_db` (`COUNT(DISTINCT job_id)`, career level distributions, top job titles) in < 12 seconds; zero writes. | M4 | Survey Agent 3 |
| 13 | Sidecar Linguistic Context Extraction | Extract `industry_context`, `category_container`, `parentheses_raw_content`, `experience_duration`, `intra_string_seniority`, `credential_track_or_status`, `is_composite`. | M4 | Survey Agent 1 & 3 |
| 14 | Sidecar 11-Column CSV Serialization | Emit `egypt_skills_decomposition_metadata.csv` (exactly 11 columns, exactly 28,824 rows, 1-to-1 with raw skills). | M4 | Survey Agent 1 |
| 15 | 14-Column Main Decomposition Serialization | Emit `egypt_skills_decomposed_graph.csv` (exactly 14 columns, frozen schema, exactly 6 permitted match statuses). | M5 | Survey Agent 1 |
| 16 | End-to-End Pipeline Integration & Batch Execution | Connect all passes into a deterministic production pipeline; execute across all 28,824 raw skills; emit run metrics and data quality logs. | M5 | Survey Agent 2 & 3 |
| 17 | E2E Testing Framework & 4-Tier Test Cases | Design requirement-driven opaque-box test suite: Tier 1 (Feature Coverage), Tier 2 (Boundary & Corner Cases), Tier 3 (Cross-Feature Combinations), Tier 4 (Real-World Egyptian Workloads). Publish `TEST_READY.md`. | Test Track | Survey Agent 1 & 2 |
| 18 | Adversarial Hardening & Forensic Integrity Audit | Execute Tier 5 white-box coverage hardening and forensic audit verification; ensure zero hardcoded shortcuts or cheating. | M6 | Survey Agent 1 |

---

## Milestones

| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| Test Track | E2E Testing Track | Independent requirement-driven test suite (Tiers 1-4), validation runner, and `TEST_READY.md`. | none | DONE |
| M1 | Knowledge Base & Linguistic Lexicon Module | Catalog loader (semicolon, priority deduplication), acronym dictionary, protected compounds, proper nouns lexicon, level matrix. | none | DONE |
| M2 | Pre-processing, Parentheses Typology & Delimiters | 5-way parenthetical classifier, compound masking, hierarchical delimiter splitting, separation context tracking. | M1 | ON_HOLD (User Pause Directive) |
| M3 | Level Governance, Suffix Stripper & Atomic Classifier | Two-column level governance, ambiguous/soft skill/CEFR/cert rules, noise filter with reasons, novel skill preservation. | M1, M2 | PLANNED |
| M4 | Sidecar Metadata DB Extractor & Aggregator | Read-only PostgreSQL bulk query engine, linguistic metadata aggregation, 11-column sidecar generation. | M1, M2, M3 | PLANNED |
| M5 | Pipeline Integration & Full Dataset Execution | Connect full 5-pass pipeline, process all 28,824 raw skills, generate 14-column main CSV and run reports. | M1, M2, M3, M4 | PLANNED |
| M6 | Final Verification, Quality Gate & Adversarial Hardening | Phase 1: 100% E2E test pass (Tiers 1-4). Phase 2: Tier 5 adversarial hardening, forensic audit verification. | M5, Test Track | PLANNED |

---

## Interface Contracts

### 1. CatalogLoader (`linguistic_intelligence.catalog`)
```python
class CatalogLoader:
    def __init__(self, catalog_path: str, acronyms_path: str, levels_path: str):
        ...
    def get_exact_match(self, text: str) -> Optional[StandardSkillEntry]:
        """Returns standard skill entry with priority-weighted domain resolution."""
    def get_regex_match(self, text: str) -> Optional[StandardSkillEntry]:
        """Returns matched standard skill entry using precompiled regex patterns."""
    def get_acronym(self, token: str) -> Optional[AcronymEntry]:
        """Returns verified acronym mapping."""
    def is_protected_proper_noun(self, text: str) -> bool:
        """Checks whether multi-word term must be shielded from level stripping."""
    def is_protected_compound(self, text: str) -> bool:
        """Checks whether slash/ampersand term is a protected compound."""
```

### 2. Parentheses & Delimiter Splitter (`linguistic_intelligence.preprocessor`)
```python
class ParenthesesTypologyEngine:
    def analyze(self, raw_skill: str) -> ParenthesesAnalysisResult:
        """
        Returns:
            clean_text: str (text with structural parentheses handled)
            parentheses_raw: Optional[str]
            category_container: Optional[str]
            industry_context: Optional[str]
            extracted_level: Optional[str]
            sub_skills: List[str] (e.g. from container or specification)
        """

class HierarchicalDelimiterSplitter:
    def split(self, text: str) -> List[DecomposedComponent]:
        """
        Splits on unshielded &, /, ,, -, and while protecting compounds.
        Preserves separated_by, separated_from_before, separated_from_after.
        """
```

### 3. Level Governance & Classifier (`linguistic_intelligence.classifier`)
```python
class SkillLevelGovernor:
    def evaluate(self, token: str, skill_type: Optional[str]) -> Tuple[str, Optional[str], Optional[str], Optional[str]]:
        """
        Returns:
            cleaned_token: str (token with level/seniority words stripped if applicable)
            extracted_skill_level: Optional[str] (verbatim substring, original casing/spacing)
            skill_level: str ('Not Specified', 'Beginner', 'Intermediate', 'Advanced', 'Expert')
            intra_string_seniority: Optional[str] ('Senior', 'Lead', 'Junior', etc.)
            credential_track_or_status: Optional[str]
        """
```

### 4. Sidecar Metadata Engine (`linguistic_intelligence.sidecar`)
```python
class SidecarMetadataEngine:
    def __init__(self, db_connection_url: str):
        ...
    def load_bulk_database_stats(self) -> None:
        """Executes read-only bulk queries for job_count, career_levels, and job_titles."""
    def build_metadata_row(self, raw_skill: str, linguistic_context: LinguisticContext) -> SidecarRow:
        """Emits the 11-column sidecar metadata record."""
```

### 5. Final Output Data Contracts
- `egypt_skills_decomposed_graph.csv` (14 columns):
  1. `raw_skill` (str)
  2. `atomic_skill` (str)
  3. `matched_atomic_skill` (str or NULL)
  4. `separated_by` (str or NULL)
  5. `separated_from_before` (str or NULL)
  6. `separated_from_after` (str or NULL)
  7. `extracted_skill_level` (str or NULL, verbatim)
  8. `skill_level` (str, canonical controlled)
  9. `skill_type` (str)
  10. `domain` (str)
  11. `sub_category` (str)
  12. `job_count` (int)
  13. `match_status` (str, 6 permitted values)
  14. `rejection_reason` (str or NULL)

- `egypt_skills_decomposition_metadata.csv` (11 columns):
  1. `raw_skill` (str)
  2. `job_count` (int)
  3. `industry_context` (str or NULL)
  4. `category_container` (str or NULL)
  5. `parentheses_raw_content` (str or NULL)
  6. `experience_duration` (str or NULL)
  7. `intra_string_seniority` (str or NULL)
  8. `credential_track_or_status` (str or NULL)
  9. `posting_career_level_distribution` (JSON str or NULL)
  10. `top_associated_job_titles` (JSON array str or NULL)
  11. `is_composite` (bool)

---

## Code Layout

Production code will be housed cleanly under:
```
d:\Hire Q Project\
├── linguistic_intelligence/
│   ├── __init__.py
│   ├── config.py                  # Taxonomy constants, paths, frozen schemas
│   ├── catalog.py                 # Priority-weighted catalog & acronym loaders
│   ├── proper_nouns.py            # Pass 0 proper nouns & acronym shielding
│   ├── parentheses.py             # Pass 2 5-way typology engine
│   ├── delimiters.py              # Pass 3 compound shield & delimiter splitter
│   ├── level_governor.py          # Pass 4 2-column level extraction & governance
│   ├── classifier.py              # Pass 4 atomic matching & noise rejection
│   ├── sidecar.py                 # Sidecar metadata bulk query & builder
│   └── engine.py                  # 5-pass unified pipeline orchestrator
├── run_atomic_decomposition_pipeline.py  # Production batch runner for 28,824 skills
├── tests/
│   ├── __init__.py
│   ├── test_tier1_feature_coverage.py
│   ├── test_tier2_boundary_corner.py
│   ├── test_tier3_pairwise_combinations.py
│   ├── test_tier4_real_world_workloads.py
│   ├── test_tier5_adversarial_hardening.py
│   └── test_benchmark_spec_traces.py
```
