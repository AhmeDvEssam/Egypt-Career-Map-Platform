# Dispatch Instructions: Survey Codebase Explorer (Agent 2)

## Identity
- Role: Codebase & Prototype Explorer
- Archetype: teamwork_explorer
- Working Directory: d:\Hire Q Project\.agents\teamwork\teamwork_explorer_survey_2
- Parent Orchestrator: orchestrator (Conversation ID: 9fb895eb-cd95-4c72-b25c-179794097e37)

## Mission
Investigate the existing code, prototype implementations, and testing scripts in `d:\Hire Q Project`.
Authoritative source files to inspect:
1. `d:\Hire Q Project\.agents\teamwork\ORIGINAL_REQUEST.md` (MANDATORY: read this first!)
2. `d:\Hire Q Project\scratch\atomic_decomposition_engine.py`
3. Any scripts, test suites, or prototypes in `scratch/`, `tests/`, or project root.
4. Python environment, dependencies, and execution capabilities.

## Required Deliverables
Produce an in-depth codebase analysis report in `d:\Hire Q Project\.agents\teamwork\teamwork_explorer_survey_2/report.md` covering:
1. Current architecture of `scratch/atomic_decomposition_engine.py`:
   - How it implements Pass 0 through Pass 4.
   - What regex patterns, dictionaries, and classes are already present.
   - What benchmark traces exist and what tests pass/fail.
2. Shortcomings, gaps, or discrepancies between existing code and the v3 specification.
3. Code organization, modularity, and opportunities for clean decomposition into production-grade modules.
4. Recommendations for test harnesses, benchmarking scripts, and verification tools.

When complete, write `handoff.md` and send a message to orchestrator (ID: 9fb895eb-cd95-4c72-b25c-179794097e37).


## 2026-11-03T14:29:22Z
You are teamwork_explorer_survey_2, working in directory: d:\Hire Q Project\.agents\teamwork\teamwork_explorer_survey_2
Your parent is orchestrator (Conversation ID: 9fb895eb-cd95-4c72-b25c-179794097e37).

MANDATORY INSTRUCTION: Read d:\Hire Q Project\.agents\teamwork\ORIGINAL_REQUEST.md first.
Also read d:\Hire Q Project\.agents\teamwork\teamwork_explorer_survey_2\DISPATCH.md.

Investigate the existing code, prototype implementations, and testing scripts in `d:\Hire Q Project`:
- `d:\Hire Q Project\scratch\atomic_decomposition_engine.py`
- Any scripts, tests, or prototypes in `scratch/`, `tests/`, or project root.
- Python environment, libraries, and execution setup.

Produce a detailed codebase exploration report in `d:\Hire Q Project\.agents\teamwork\teamwork_explorer_survey_2\report.md` covering:
1. Current architecture of `scratch/atomic_decomposition_engine.py` and its Pass 0-4 implementation.
2. Shortcomings, gaps, or discrepancies vs the audited requirements.
3. Code modularity and design recommendations for production-grade modules.
4. Benchmark harnesses and verification test capabilities.

Update progress.md as you work. When complete, write handoff.md and send a message with send_message to orchestrator (Recipient: 9fb895eb-cd95-4c72-b25c-179794097e37).
