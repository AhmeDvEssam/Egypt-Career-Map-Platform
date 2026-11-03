# Dispatch Instructions: E2E Test Writer (Dual Track)

## Identity
- Role: E2E Test Writer
- Archetype: teamwork_test_writer
- Working Directory: d:\Hire Q Project\.agents\teamwork\teamwork_test_writer_e2e_1
- Parent Orchestrator: orchestrator (Conversation ID: 9fb895eb-cd95-4c72-b25c-179794097e37)

## Mission
Design and implement the complete, requirement-driven, opaque-box E2E Test Suite for the Egypt Career Map Atomic Skill Decomposition Engine per `PROJECT.md` and `ORIGINAL_REQUEST.md`.

MANDATORY INSTRUCTIONS:
1. Read `d:\Hire Q Project\.agents\teamwork\ORIGINAL_REQUEST.md` first.
2. Read `d:\Hire Q Project\.agents\teamwork\orchestrator\PROJECT.md`.
3. Read `d:\Hire Q Project\.md\master_skill_level_governance_and_audit_specification_v3.md`.
4. Read Survey reports in:
   - `d:\Hire Q Project\.agents\teamwork\teamwork_spec_miner_survey_1\report.md`
   - `d:\Hire Q Project\.agents\teamwork\teamwork_explorer_survey_2\report.md`
   - `d:\Hire Q Project\.agents\teamwork\teamwork_explorer_survey_3\report.md`

## Architecture & Deliverables
Create the test suite in `d:\Hire Q Project\tests/` using Python's standard `unittest` framework:
1. `TEST_INFRA.md` at `d:\Hire Q Project\TEST_INFRA.md` documenting test architecture, methodology, and coverage metrics.
2. `tests/test_benchmark_spec_traces.py`: Test the 11 audited traces from Section 10 of v3 specification (including `Lead Generation`, `English (B2)`, `ISTQB Advanced Level`, `Mastery of Python`, `PL/SQL`, `CI/CD`).
3. `tests/test_tier1_feature_coverage.py`: Opaque-box tests covering all 18 features from `PROJECT.md § Feature Inventory` (>=5 test cases per feature).
4. `tests/test_tier2_boundary_corner.py`: Boundary and corner cases (empty strings, extreme lengths, non-ASCII characters, rare delimiters, nested parentheses, uppercase/lowercase/mixed case).
5. `tests/test_tier3_pairwise_combinations.py`: Cross-feature combinations (e.g., compound + level + parenthesis: `Senior PL/SQL (Advanced)`, container + delimiter: `Languages (Python / C++)`).
6. `tests/test_tier4_real_world_workloads.py`: Realistic skill phrases sampled from Egyptian job postings (from `skills.csv`).
7. `tests/run_all_tests.py`: Master test runner with formatted reporting.
8. When tests are written, publish `d:\Hire Q Project\TEST_READY.md`.

CRITICAL CONSTRAINTS:
- Tests must be requirement-driven and opaque-box. Verify input -> expected output without assuming internal implementation details.
- Database is strictly READ-ONLY.
- Update progress.md regularly. Write handoff.md when complete and notify orchestrator.

## 2026-11-03T14:50:59Z
You are teamwork_test_writer_e2e_1, working in directory: d:\Hire Q Project\.agents\teamwork\teamwork_test_writer_e2e_1
Your parent is orchestrator (Conversation ID: 9fb895eb-cd95-4c72-b25c-179794097e37).

MANDATORY INSTRUCTIONS:
1. Read d:\Hire Q Project\.agents\teamwork\ORIGINAL_REQUEST.md first.
2. Read d:\Hire Q Project\.agents\teamwork\orchestrator\PROJECT.md.
3. Read d:\Hire Q Project\.agents\teamwork\teamwork_test_writer_e2e_1\DISPATCH.md.

Execute the E2E Testing Track:
- Design opaque-box test infrastructure in `tests/`.
- Create `TEST_INFRA.md` at `d:\Hire Q Project\TEST_INFRA.md`.
- Implement test suites:
  - `tests/test_benchmark_spec_traces.py` (audited traces from v3 spec)
  - `tests/test_tier1_feature_coverage.py` (>=5 test cases per feature across all 18 features in Feature Inventory)
  - `tests/test_tier2_boundary_corner.py` (boundary/corner cases)
  - `tests/test_tier3_pairwise_combinations.py` (cross-feature interactions)
  - `tests/test_tier4_real_world_workloads.py` (real Egyptian posting phrases)
  - `tests/run_all_tests.py` (master test runner)
- Once tests are written, publish `d:\Hire Q Project\TEST_READY.md`.

Update progress.md as you work. When complete, write handoff.md and send a message to orchestrator (Recipient: 9fb895eb-cd95-4c72-b25c-179794097e37).

