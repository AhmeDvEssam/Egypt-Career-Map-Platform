# TEST_INFRA — Egypt Career Map Atomic Skill Decomposition Engine

**Version:** 1.0.0  
**Status:** FROZEN / READY  
**Framework:** Python Standard Library `unittest`  
**Execution Root:** `d:\Hire Q Project\`  

---

## 1. Architectural Philosophy & Principles

The testing framework for the Egypt Career Map Atomic Skill Decomposition Engine enforces five architectural imperatives:

1. **Requirement-Driven & Opaque-Box Execution:**
   - Tests evaluate observable inputs and outputs against the authoritative contracts defined in `master_skill_level_governance_and_audit_specification_v3.md` and `PROJECT.md`.
   - Tests do not assume or probe private internal state, function names, or mutable variables. All interactions proceed via the standardized public interface adapter in `tests/test_helpers.py`.

2. **Progressive Testability & Decoupled Milestones:**
   - The test suite is designed for dual-track development.
   - Milestone components (`M1: catalog/proper_nouns`, `M2: parentheses/delimiters`, `M3: level_governor/classifier`, `M4: sidecar`, `M5: engine`) can be verified progressively as they are implemented.
   - Unimplemented milestone modules raise graceful `unittest.SkipTest` in exploratory mode or strict assertion failures in strict mode (`--strict` / `SKIP_IF_UNIMPLEMENTED=0`).

3. **Strict Database Read-Only Invariance:**
   - Testing verifies zero database mutations.
   - Any query executed during tests or pipeline runs is strictly `SELECT`.

4. **Frozen Schema Enforcement:**
   - The Main Graph dataset is strictly validated against the **Frozen 14-Column Contract** (`egypt_skills_decomposed_graph.csv`).
   - The Sidecar dataset is strictly validated against the **Frozen 11-Column Contract** (`egypt_skills_decomposition_metadata.csv`).
   - Permitted `match_status` values are strictly restricted to the 6 approved enum literals.

5. **Adversarial & ReDoS Guarding:**
   - All modifier and extraction regexes are audited against tailored adversarial payloads with strict execution timeouts to guarantee resistance against catastrophic backtracking.

---

## 2. Test Suite Structure & Layout

The test suite resides entirely within `tests/` at the project root:

```
d:\Hire Q Project\tests\
├── __init__.py                           # Test package initialization
├── test_helpers.py                       # Opaque-box test adapter, fixtures, frozen schema contracts
├── test_benchmark_spec_traces.py         # Audited traces 1-11 from v3 Spec §10 + spec-mandated benchmarks
├── test_tier1_feature_coverage.py        # All 18 features from Feature Inventory (>=5 tests per feature)
├── test_tier2_boundary_corner.py         # Boundaries, empty strings, Unicode, Arabic, nested parentheses
├── test_tier3_pairwise_combinations.py   # Multi-feature combinations (compound + level + parens, etc.)
├── test_tier4_real_world_workloads.py    # Authentic Egyptian job posting phrases from skills.csv
└── run_all_tests.py                      # Master test runner with formatted reporting
```

---

## 3. Four-Tier Test Taxonomy + Benchmark Traces

| Tier / Suite | Target Scope | Test Count | Key Invariants Tested |
|---|---|---|---|
| **Benchmark Traces** | Section 10 of v3 Master Specification | 16 | Verbatim level casing, proper noun shielding, soft skill neutralization, CEFR codes, exam tracks. |
| **Tier 1: Feature Coverage** | Features 1–18 in `PROJECT.md` | 98 | Exhaustive coverage (>=5 tests per feature) across catalog loading, parentheses, delimiters, levels, sidecar, serialization, runner. |
| **Tier 2: Boundary & Corner** | Stress, syntax, boundaries | 24 | Empty strings, 500+ char strings, clustered delimiters (`///`, `&&&`), malformed parentheses, Unicode, Arabic script. |
| **Tier 3: Pairwise Interactions** | Cross-feature combinations | 21 | Compound + Level + Parens (`Senior PL/SQL (Advanced)`), Container + Delimiter (`Languages (Python / C++)`), dual parens. |
| **Tier 4: Real-World Workloads** | Sampled from `skills.csv` | 15 | Egyptian customs (`CargoX/ACID/Form 4`), civil BOQ, telecom generation stacks (`2G/3G/4G/5G`), financial IFRS/IAS. |
| **Total Test Cases** | Complete Suite | **174** | Full end-to-end requirement validation. |

---

## 4. Feature Coverage Matrix (Tier 1 Mapping)

Every feature in `PROJECT.md § Feature Inventory` is mapped to an isolated test class in `test_tier1_feature_coverage.py`:

| Feature # | Feature Name | Test Class | Test Count | Target Milestone |
|---|---|---|---|---|
| 1 | Reference Catalog Ingestion (Semicolon & Priority) | `TestFeature01CatalogIngestion` | 5 | M1 |
| 2 | Acronym & Level Matrix Loading | `TestFeature02AcronymAndLevelMatrix` | 5 | M1 |
| 3 | Proper Noun & Acronym Shielding (Pass 0) | `TestFeature03ProperNounShield` | 5 | M1 |
| 4 | Whole-Skill Catalog Matching (Pass 1) | `TestFeature04WholeSkillMatching` | 5 | M2 |
| 5 | Parentheses Typology Engine (Pass 2) | `TestFeature05ParenthesesTypology` | 6 | M2 |
| 6 | Protected Compound Masking (Pass 3) | `TestFeature06ProtectedCompounds` | 6 | M2 |
| 7 | Hierarchical Delimiter Splitting (Pass 3) | `TestFeature07HierarchicalDelimiterSplitting` | 6 | M2 |
| 8 | Two-Column Level Governance (Pass 4) | `TestFeature08TwoColumnLevelGovernance` | 6 | M3 |
| 9 | Ambiguous & Special Level Rules (Pass 4) | `TestFeature09AmbiguousAndSpecialLevels` | 6 | M3 |
| 10 | Suffix / Prefix Stripping & Noise Rejection (Pass 4) | `TestFeature10SuffixStrippingAndNoiseRejection` | 6 | M3 |
| 11 | Catalog Reference Matching & Novel Retention (Pass 4) | `TestFeature11CatalogMatchingAndNovelRetention` | 6 | M3 |
| 12 | Read-Only PostgreSQL Bulk Metadata Querying | `TestFeature12ReadOnlyPostgreSQLMetadata` | 5 | M4 |
| 13 | Sidecar Linguistic Context Extraction | `TestFeature13SidecarLinguisticContext` | 6 | M4 |
| 14 | Sidecar 11-Column CSV Serialization | `TestFeature14SidecarSerialization` | 5 | M4 |
| 15 | 14-Column Main Decomposition Serialization | `TestFeature15MainGraphSerialization` | 5 | M5 |
| 16 | End-to-End Pipeline Integration & Batch Execution | `TestFeature16PipelineIntegration` | 5 | M5 |
| 17 | E2E Testing Framework & 4-Tier Test Cases | `TestFeature17E2ETestingFramework` | 5 | Test Track |
| 18 | Adversarial Hardening & Forensic Integrity Audit | `TestFeature18AdversarialHardening` | 5 | M6 |

---

## 5. Execution Instructions

### Running the Entire Suite
```powershell
python tests/run_all_tests.py
```

### Running with Verbose Output
```powershell
python tests/run_all_tests.py -v
```

### Running a Specific Suite
```powershell
python tests/run_all_tests.py --suite benchmark
python tests/run_all_tests.py --suite tier1
python tests/run_all_tests.py --suite tier2
python tests/run_all_tests.py --suite tier3
python tests/run_all_tests.py --suite tier4
```

### Running in Strict Implementation Mode (No Graceful Skips)
```powershell
python tests/run_all_tests.py --strict
```

### Running via Standard `unittest` Discovery
```powershell
python -m unittest discover -s tests -p "test_*.py"
```

---

## 6. Verification and Acceptance Criteria

1. **Zero Facade Tests:** Every test case has an explicit authoritative assertion source derived from the v3 specification, database schema, or frozen CSV catalogs.
2. **Schema Invariance:** Emitted records strictly match `MAIN_14_COLUMNS` and `SIDECAR_11_COLUMNS`.
3. **No Database Writes:** Testing environment requires strictly read-only DB permissions.
4. **Milestone Progressive Readiness:** Implementation agents can execute the master runner after each milestone to measure exact milestone progress.
