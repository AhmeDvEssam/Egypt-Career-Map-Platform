# Dispatch Instructions: Milestone 1 Worker (Implementation)

## Identity
- Role: Milestone 1 Implementation Worker
- Archetype: teamwork_worker
- Working Directory: d:\Hire Q Project\.agents\teamwork\teamwork_worker_m1_1
- Parent Orchestrator: orchestrator (Conversation ID: 9fb895eb-cd95-4c72-b25c-179794097e37)

## MANDATORY INTEGRITY WARNING
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

## Mission
Implement Milestone 1: **Knowledge Base & Linguistic Lexicon Module** per `PROJECT.md`, `ORIGINAL_REQUEST.md`, and the specifications produced by the three M1 Explorers.

Inputs to Study First:
1. `d:\Hire Q Project\.agents\teamwork\ORIGINAL_REQUEST.md` (MANDATORY)
2. `d:\Hire Q Project\.agents\teamwork\orchestrator\PROJECT.md`
3. Explorer Findings:
   - `d:\Hire Q Project\.agents\teamwork\teamwork_explorer_m1_1\handoff.md` and `proposed_catalog.py`
   - `d:\Hire Q Project\.agents\teamwork\teamwork_explorer_m1_2\handoff.md`
   - `d:\Hire Q Project\.agents\teamwork\teamwork_explorer_m1_3\handoff.md`, `blueprint.md`, `proposed_config.py`, `proposed_init.py`, and `proposed_test_milestone1_lexicon.py`
4. Test Suites in `tests/`:
   - `tests/test_tier1_feature_coverage.py` (Feature 1, 2, 3 test classes)
   - `tests/run_all_tests.py`

## Exclusive File Ownership
The Milestone 1 Worker exclusively owns and must create/implement:
1. `d:\Hire Q Project\linguistic_intelligence\__init__.py`
2. `d:\Hire Q Project\linguistic_intelligence\config.py`
3. `d:\Hire Q Project\linguistic_intelligence\catalog.py`
4. `d:\Hire Q Project\linguistic_intelligence\proper_nouns.py`
5. `d:\Hire Q Project\tests\test_milestone1_lexicon.py`

## Implementation Details
1. `config.py`:
   - 14 Closed Domains, 61 Closed Subcategories, 6 approved match statuses.
   - Frozen 14-column and 11-column schemas.
   - `CANONICAL_SKILL_HOMES` dictionary ensuring Python -> Backend Development, SQL -> Data Engineering, Excel -> BI, Git -> DevOps, Jira -> Agile Management.
2. `catalog.py`:
   - Semicolon-delimited loading of `standard_skills_catalog.csv` (3,794 rows).
   - Priority-weighted deduplication using 2-tier resolution (Canonical Homes + multi-factor scoring).
   - Dataclasses: `StandardSkillEntry`, `AcronymEntry`, `LevelMatrixEntry`.
   - Methods: `get_exact_match`, `get_regex_match`, `get_acronym`, `get_level_entry`.
3. `proper_nouns.py`:
   - Pass 0 shielding for multi-word disciplines (`Lead Generation`, `Lead Time Reduction`), healthcare (`Senior Care`), security (`GitHub Advanced Security`), and 386 acronyms.
   - Guardrails to inhibit level stripping on internal keywords (`Lead`, `Senior`, `Advanced`, `Master`, `Solid`, `Deep`).
4. `tests/test_milestone1_lexicon.py`:
   - Comprehensive unit tests covering all M1 components.

## Verification Requirements
You MUST run:
1. `python -m unittest tests/test_milestone1_lexicon.py` (Must pass 100%)
2. `python tests/run_all_tests.py` (Features 1, 2, 3 must now unskip and pass 100%)

Document exact commands and test output in `handoff.md`.
Update `progress.md` as you work. When complete, write `handoff.md` and send message to orchestrator.

## 2026-11-03T15:13:24Z
[Message] timestamp=2026-11-03T15:13:24Z sender=9fb895eb-cd95-4c72-b25c-179794097e37 priority=MESSAGE_PRIORITY_HIGH content=You are teamwork_worker_m1_1, working in directory: d:\Hire Q Project\.agents\teamwork\teamwork_worker_m1_1
Your parent is orchestrator (Conversation ID: 9fb895eb-cd95-4c72-b25c-179794097e37).

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

MANDATORY INSTRUCTIONS:
1. Read d:\Hire Q Project\.agents\teamwork\ORIGINAL_REQUEST.md first.
2. Read d:\Hire Q Project\.agents\teamwork\orchestrator\PROJECT.md.
3. Read d:\Hire Q Project\.agents\teamwork\teamwork_worker_m1_1\DISPATCH.md.
4. Read Explorer deliverables:
   - `d:\Hire Q Project\.agents\teamwork\teamwork_explorer_m1_1\handoff.md` and `proposed_catalog.py`
   - `d:\Hire Q Project\.agents\teamwork\teamwork_explorer_m1_2\handoff.md`
   - `d:\Hire Q Project\.agents\teamwork\teamwork_explorer_m1_3\handoff.md`, `blueprint.md`, `proposed_config.py`, `proposed_init.py`, and `proposed_test_milestone1_lexicon.py`

Implement Milestone 1: Knowledge Base & Linguistic Lexicon Module.
Your exclusive file ownership:
- `linguistic_intelligence/__init__.py`
- `linguistic_intelligence/config.py`
- `linguistic_intelligence/catalog.py`
- `linguistic_intelligence/proper_nouns.py`
- `tests/test_milestone1_lexicon.py`

Verification commands to run:
1. `python -m unittest tests/test_milestone1_lexicon.py` (all tests must pass)
2. `python tests/run_all_tests.py` (M1 tests in Tier 1 unskip and pass)

Update progress.md as you work. When complete, write handoff.md and send message to orchestrator (Recipient: 9fb895eb-cd95-4c72-b25c-179794097e37).
