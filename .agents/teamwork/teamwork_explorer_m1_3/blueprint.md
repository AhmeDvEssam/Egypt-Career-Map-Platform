# Milestone 1 Worker Implementation Blueprint

**Milestone:** M1 — Knowledge Base & Linguistic Lexicon Module  
**Author:** `teamwork_explorer_m1_3`  
**Target Consumer:** Milestone 1 Worker  
**Governing Specifications:**  
- `d:\Hire Q Project\.md\master_skill_level_governance_and_audit_specification_v3.md`
- `d:\Hire Q Project\.agents\teamwork\orchestrator\PROJECT.md`
- `d:\Hire Q Project\.agents\teamwork\ORIGINAL_REQUEST.md`

---

## 1. Executive Summary & Objective

The objective of Milestone 1 is to build the deterministic, high-performance **Knowledge Base & Linguistic Lexicon Module** under `linguistic_intelligence/`. This module forms the foundation of the 5-pass atomic skill decomposition pipeline by providing:
1. High-speed, priority-weighted reference catalog ingestion from `standard_skills_catalog.csv` (3,794 rows, semicolon delimited, UTF-8 BOM).
2. Priority deduplication resolving the 281 duplicate skill names across multiple domains (specifically guaranteeing `Python` -> `Backend Development` rather than `Human Resources`).
3. Curated acronym resolution for all 386 verified entries in `skills_acronym_dictionary.json`.
4. Level matrix ingestion (23 rows, 5 skill types) from `standard_skill_levels_matrix.csv`.
5. Pass 0 Proper Noun & Discipline Shielding for terms containing title/level keywords (`Lead Generation`, `Lead Time Reduction`, `Senior Care`, `Advanced Threat Protection`, `GitHub Advanced Security`, `Master Data Management`, `Scrum Master`).
6. A comprehensive unit test suite in `tests/test_milestone1_lexicon.py` establishing 100% test pass.

---

## 2. Target File Structure & Layout

The Milestone 1 Worker will construct the following production code layout:

```
d:\Hire Q Project\
├── linguistic_intelligence/
│   ├── __init__.py           # Clean package exports of classes and constants
│   ├── config.py             # Frozen 14/61 taxonomy, 6 match statuses, 14/11 schemas, paths
│   ├── catalog.py            # Priority-weighted CatalogLoader & dataclasses
│   └── proper_nouns.py       # Pass 0 ProperNounShield & AcronymResolver
└── tests/
    ├── __init__.py
    └── test_milestone1_lexicon.py  # Unit test suite verifying all M1 components
```

---

## 3. Detailed Component Specifications

### 3.1 `linguistic_intelligence/config.py`
Use the reference implementation in:  
`d:\Hire Q Project\.agents\teamwork\teamwork_explorer_m1_3\proposed_config.py`

**Key Constants Required:**
1. **File Paths:**
   - `PROJECT_ROOT`, `DEFAULT_CATALOG_PATH`, `DEFAULT_ACRONYMS_PATH`, `DEFAULT_LEVELS_PATH`, `DEFAULT_RAW_SKILLS_PATH`, `DEFAULT_MAIN_OUTPUT_PATH`, `DEFAULT_SIDECAR_OUTPUT_PATH`.
   - `CSV_DELIMITER = ";"`
   - `CSV_ENCODING = "utf-8-sig"` (CRITICAL: Prevents `\ufeffstandard_skill_name` BOM corruption).
2. **Taxonomy (14 Domains / 61 Subcategories):**
   - `CLOSED_DOMAINS` (Tuple of 14 approved domains).
   - `DOMAIN_TO_SUBCATEGORIES` (Dict of 14 domains to their approved subcategories).
   - `CLOSED_SUBCATEGORIES` (Tuple of 61 approved subcategories).
   - `CLOSED_DOMAINS_SET` and `CLOSED_SUBCATEGORIES_SET` (FrozenSets for O(1) membership checks).
   - `UNKNOWN_DOMAIN = "Unknown"`, `UNKNOWN_SUBCATEGORY = "Unknown"`.
3. **Exact 6 Match Statuses (Spec v3 §9.2):**
   - `CATALOG_EXACT_MATCH = "CATALOG_EXACT_MATCH"`
   - `CATALOG_REGEX_MATCH = "CATALOG_REGEX_MATCH"`
   - `PARENTHESIS_SPECIFICATION = "PARENTHESIS_SPECIFICATION"`
   - `PROTECTED_PROPER_NOUN = "PROTECTED_PROPER_NOUN"`
   - `UNMATCHED_NOVEL = "UNMATCHED_NOVEL"`
   - `REJECTED_NOISE = "REJECTED_NOISE"`
   - `VALID_MATCH_STATUSES = frozenset({...})`
   - *CRITICAL RULE:* `PROTECTED_COMPOUND` is NOT a permitted match status.
4. **Frozen Schemas:**
   - `MAIN_OUTPUT_COLUMNS` (14 columns).
   - `SIDECAR_OUTPUT_COLUMNS` (11 columns).
5. **Canonical Homes & Priority Ranks:**
   - `CANONICAL_SKILL_HOMES`: Dict mapping cross-domain tools to primary home (e.g. `Python` -> `("Software Engineering & IT", "Backend Development", "Tool / Software")`).
   - `PRIORITY_RANKS = {"Core": 3, "Foundational": 2, "Secondary": 1}`.

---

### 3.2 `linguistic_intelligence/catalog.py`

**Required Data Structures:**
```python
from dataclasses import dataclass
from typing import Optional, Tuple, Dict, List, Set
import re

@dataclass(frozen=True)
class StandardSkillEntry:
    standard_skill_name: str
    domain: str
    sub_category: str
    skill_type: str
    applicable_level_category: str
    initial_regex_pattern: str
    known_aliases: Tuple[str, ...]
    skill_priority: str
    compiled_regex: Optional[re.Pattern] = None

@dataclass(frozen=True)
class AcronymEntry:
    acronym: str
    full_name: str
    canonical_skill_name: str
    domain: str
    sub_category: str
    skill_type: str
    source: str

@dataclass(frozen=True)
class LevelMatrixEntry:
    skill_type: str
    level_category: str
    standard_level: str
    rank_order: int
    regex_patterns: str
    arabic_patterns: str
    example_usage: str
    compiled_pattern: Optional[re.Pattern] = None
```

**Required Class: `CatalogLoader`**
```python
class CatalogLoader:
    def __init__(self, catalog_path: str, acronyms_path: str, levels_path: str):
        self.catalog_path = Path(catalog_path)
        self.acronyms_path = Path(acronyms_path)
        self.levels_path = Path(levels_path)
        
        self.all_entries: List[StandardSkillEntry] = []
        self.unique_standard_skills: Set[str] = set()
        self.exact_match_map: Dict[str, StandardSkillEntry] = {}
        self.compiled_regex_patterns: List[Tuple[str, re.Pattern, str, str, str]] = []
        self.level_matrix_entries: List[LevelMatrixEntry] = []
        self.raw_row_count: int = 0
        
        self._load_catalog()
        self._load_levels_matrix()

    def _load_catalog(self) -> None:
        """
        Loads standard_skills_catalog.csv using delimiter=';' and encoding='utf-8-sig'.
        Applies Priority Deduplication:
        1. If skill has an entry in CANONICAL_SKILL_HOMES, adopt canonical domain/subcat.
        2. Otherwise compare skill_priority: Core (3) > Foundational (2) > Secondary (1).
        3. Index canonical standard_skill_name.lower() and all known_aliases.lower().
        4. Compile initial_regex_pattern with re.IGNORECASE.
        """

    def _load_levels_matrix(self) -> None:
        """Loads standard_skill_levels_matrix.csv (23 rows) and pre-compiles regex patterns."""

    def get_exact_match(self, token: str) -> Optional[StandardSkillEntry]:
        """Case-insensitive exact match against standard skill names and aliases."""
        return self.exact_match_map.get(token.strip().lower())

    def get_regex_match(self, text: str) -> Optional[StandardSkillEntry]:
        """Iterates precompiled regex patterns to find catalog match."""
        for name, pattern, dom, subcat, stype in self.compiled_regex_patterns:
            if pattern.search(text):
                return self.get_exact_match(name)
        return None
```

**Priority Deduplication Logic in `_load_catalog`:**
```python
# When encountering duplicate standard_skill_name:
name_key = s_name.lower()
if s_name in CANONICAL_SKILL_HOMES:
    can_dom, can_sub, can_type = CANONICAL_SKILL_HOMES[s_name]
    if dom == can_dom and sub == can_sub:
        # Preferred canonical home wins
        exact_match_map[name_key] = entry
elif name_key in exact_match_map:
    existing = exact_match_map[name_key]
    existing_rank = PRIORITY_RANKS.get(existing.skill_priority, 0)
    current_rank = PRIORITY_RANKS.get(prio, 0)
    if current_rank > existing_rank:
        exact_match_map[name_key] = entry
else:
    exact_match_map[name_key] = entry
```

---

### 3.3 `linguistic_intelligence/proper_nouns.py`

**Required Classes:**

1. **`ProperNounShield` (Pass 0 Shielding):**
   - Maintains a set of verified multi-word proper nouns, business disciplines, software products, and healthcare disciplines that contain title/level keywords (`Lead`, `Senior`, `Master`, `Advanced`, `Basic`, `Expert`).
   - Words like `Lead Generation`, `Lead Time Reduction`, `Senior Care`, `Advanced Threat Protection`, `GitHub Advanced Security`, `Master Data Management`, `Scrum Master`, `Visual Basic`, `Expert Systems`, `Deep Learning`, `Solid Mechanics` must NEVER have level words stripped or be classified as job roles.
   - Method:
     ```python
     def is_protected_proper_noun(self, text: str) -> bool:
         """Returns True if the phrase is a protected proper noun or discipline."""
     ```

2. **`AcronymResolver` (Acronym Dictionary Ingestion):**
   - Ingests `skills_acronym_dictionary.json` (386 entries).
   - Case-insensitive lookup mapping acronym token (e.g. `UX`, `GTM`, `KPI`, `PBI`, `AWS`) to `AcronymEntry`.
   - Method:
     ```python
     def get_acronym(self, token: str) -> Optional[AcronymEntry]:
         """Returns verified acronym mapping."""
     ```

---

### 3.4 `linguistic_intelligence/__init__.py`
Use the reference implementation in:  
`d:\Hire Q Project\.agents\teamwork\teamwork_explorer_m1_3\proposed_init.py`

Exposes:
- `CatalogLoader`, `StandardSkillEntry`, `AcronymEntry`, `LevelMatrixEntry`
- `ProperNounShield`, `AcronymResolver`
- Frozen schema and taxonomy constants

---

### 3.5 `tests/test_milestone1_lexicon.py`
Use the reference implementation in:  
`d:\Hire Q Project\.agents\teamwork\teamwork_explorer_m1_3\proposed_test_milestone1_lexicon.py`

Covers 6 test suites with 20+ comprehensive assertions:
1. `TestConfigurationAndSchemaContracts`
2. `TestCatalogIngestion`
3. `TestPriorityResolutionAndDeduplication` (Python -> Backend Development)
4. `TestAcronymResolver` (386 entries)
5. `TestPass0ProperNounShielding` (Lead Generation, Senior Care, etc.)
6. `TestStandardSkillLevelsMatrix` (23 rows, 5 skill types)

---

## 4. Step-by-Step Implementation Sequence for Worker

1. **Step 1: Create directory `linguistic_intelligence/` and `tests/`** (if not already existing).
2. **Step 2: Implement `linguistic_intelligence/config.py`** by writing `proposed_config.py`.
3. **Step 3: Implement `linguistic_intelligence/catalog.py`** implementing `CatalogLoader`, `StandardSkillEntry`, `AcronymEntry`, `LevelMatrixEntry` with priority deduplication.
4. **Step 4: Implement `linguistic_intelligence/proper_nouns.py`** implementing `ProperNounShield` and `AcronymResolver`.
5. **Step 5: Implement `linguistic_intelligence/__init__.py`** by writing `proposed_init.py`.
6. **Step 6: Deploy `tests/test_milestone1_lexicon.py`** from `proposed_test_milestone1_lexicon.py`.
7. **Step 7: Run test execution commands** (see below) and verify 100% test pass.

---

## 5. Verification Commands

The Milestone 1 Worker must execute the following commands to confirm milestone completion:

```powershell
# 1. Run the Milestone 1 Lexicon Unit Test Suite
python -m unittest tests/test_milestone1_lexicon.py -v

# 2. Verify Python domain resolution explicitly in Python REPL/one-liner
python -c "from linguistic_intelligence.catalog import CatalogLoader; c = CatalogLoader('standard_skills_catalog.csv', 'skills_acronym_dictionary.json', 'standard_skill_levels_matrix.csv'); entry = c.get_exact_match('Python'); print(f'Python resolved to: domain={entry.domain}, subcat={entry.sub_category}, type={entry.skill_type}')"
# Expected output: Python resolved to: domain=Software Engineering & IT, subcat=Backend Development, type=Tool / Software

# 3. Verify Pass 0 Proper Noun Shielding
python -c "from linguistic_intelligence.proper_nouns import ProperNounShield; s = ProperNounShield(); print('Lead Generation shielded:', s.is_protected_proper_noun('Lead Generation')); print('Senior Care shielded:', s.is_protected_proper_noun('Senior Care'))"
# Expected output: Lead Generation shielded: True; Senior Care shielded: True

# 4. Verify Acronym Resolver
python -c "from linguistic_intelligence.proper_nouns import AcronymResolver; a = AcronymResolver('skills_acronym_dictionary.json'); print('UX acronym full name:', a.get_acronym('UX').full_name)"
# Expected output: UX acronym full name: User Experience
```

---

## 6. Common Pitfalls & Guardrails

| Pitfall | Root Cause | Mandatory Guardrail |
|---|---|---|
| Column parsing error | `standard_skills_catalog.csv` uses `;` not `,` | Use `csv.reader(..., delimiter=';')` or `pd.read_csv(..., sep=';')`. |
| `KeyError: 'standard_skill_name'` | CSV file has UTF-8 BOM (`\ufeff`) | Always open with `encoding='utf-8-sig'`. |
| Python assigned to HR | Flat dictionary iteration overwrites with row 2439 | Apply `CANONICAL_SKILL_HOMES` and `PRIORITY_RANKS` in `_load_catalog`. |
| Proper nouns corrupted | Level stripping runs before checking proper nouns | Execute Pass 0 `ProperNounShield` check BEFORE any level stripping regex. |
| Forbidden match status | Using `PROTECTED_COMPOUND` as match status | Use ONLY the 6 approved match statuses from `VALID_MATCH_STATUSES`. |
| Database writes | Modifying tables in `egypt_jobs_db` | Strictly READ-ONLY. Zero INSERT, UPDATE, ALTER, CREATE commands. |
