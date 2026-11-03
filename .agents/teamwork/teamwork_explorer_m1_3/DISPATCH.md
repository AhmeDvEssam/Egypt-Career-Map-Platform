# Dispatch Instructions: M1 Explorer 3 (Module Architecture, Config & Unit Tests)

## Identity
- Role: Module Architecture & Unit Test Specification Explorer
- Archetype: teamwork_explorer
- Working Directory: d:\Hire Q Project\.agents\teamwork\teamwork_explorer_m1_3
- Parent Orchestrator: orchestrator (Conversation ID: 9fb895eb-cd95-4c72-b25c-179794097e37)

## Mission
Investigate and design the module layout, package configuration, interface types, and unit test suite for Milestone 1 (`Knowledge Base & Linguistic Lexicon Module`).

MANDATORY INSTRUCTIONS:
1. Read `d:\Hire Q Project\.agents\teamwork\ORIGINAL_REQUEST.md`.
2. Read `d:\Hire Q Project\.agents\teamwork\orchestrator\PROJECT.md`.
3. Read `d:\Hire Q Project\.md\master_skill_level_governance_and_audit_specification_v3.md`.

## Analysis Requirements
1. Design `linguistic_intelligence/config.py`:
   - Exact frozen taxonomy lists (14 Closed Domains, 61 Closed Subcategories).
   - Frozen match status enum / set (`CATALOG_EXACT_MATCH`, `CATALOG_REGEX_MATCH`, `PARENTHESIS_SPECIFICATION`, `PROTECTED_PROPER_NOUN`, `UNMATCHED_NOVEL`, `REJECTED_NOISE`).
   - Frozen 14-column and 11-column headers.
   - File paths and default constants.
2. Design package initialization `linguistic_intelligence/__init__.py`.
3. Design complete unit test suite `tests/test_milestone1_lexicon.py` verifying:
   - Semicolon loading, 3,794 catalog rows, 14 domains, 61 subcategories.
   - Priority resolution ensuring Python -> Backend Development.
   - Acronym lookup for all 386 verified entries.
   - Pass 0 proper noun shielding for `Lead Generation`, `Senior Care`, `Advanced Threat Protection`.
   - Level matrix loading with 23 rows.
4. Prepare implementation blueprint and test execution commands for the Milestone 1 Worker.

Update progress.md. Write handoff.md with verified recommendations and notify orchestrator.


## 2026-11-03T14:51:50Z
You are teamwork_explorer_m1_3, working in directory: d:\Hire Q Project\.agents\teamwork\teamwork_explorer_m1_3
Your parent is orchestrator (Conversation ID: 9fb895eb-cd95-4c72-b25c-179794097e37).

MANDATORY INSTRUCTIONS:
1. Read d:\Hire Q Project\.agents\teamwork\ORIGINAL_REQUEST.md first.
2. Read d:\Hire Q Project\.agents\teamwork\orchestrator\PROJECT.md.
3. Read d:\Hire Q Project\.agents\teamwork\teamwork_explorer_m1_3\DISPATCH.md.

Investigate Module Architecture, Config, and Unit Test Suite for Milestone 1:
- Design `linguistic_intelligence/config.py` (taxonomy constants, frozen match statuses, schemas, paths).
- Design `linguistic_intelligence/__init__.py`.
- Design unit test suite `tests/test_milestone1_lexicon.py` covering catalog loading, priority deduplication, acronyms, proper noun shielding, and level matrix.
- Prepare implementation blueprint for the Milestone 1 Worker.

Update progress.md as you work. When complete, write handoff.md and send a message to orchestrator (Recipient: 9fb895eb-cd95-4c72-b25c-179794097e37).
