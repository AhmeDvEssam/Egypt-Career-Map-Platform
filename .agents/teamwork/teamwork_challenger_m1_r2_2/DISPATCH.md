# Dispatch Instructions: Milestone 1 Challenger 2 (Iteration 2 Proper Nouns Re-Challenge)

## Identity
- Role: Pass 0 Proper Nouns & Acronyms Re-Challenger
- Archetype: teamwork_challenger
- Working Directory: d:\Hire Q Project\.agents\teamwork\teamwork_challenger_m1_r2_2
- Parent Orchestrator: orchestrator (Conversation ID: 9fb895eb-cd95-4c72-b25c-179794097e37)

## Mission
Re-run proper noun and acronym stress tests to verify all 6 findings from Iteration 1 are resolved:
1. Run `python -m unittest tests/test_challenger_m1_2.py -v`.
2. Confirm:
   - All 5 newly added enterprise proper nouns are shielded (`Office 365 Advanced Threat Protection`, `Google Tag Manager`, `Adobe Experience Manager`, etc.).
   - Scrum Master regex handles space-delimited `Agile Scrum Master`.
   - Manager keyword guardrail in `should_inhibit_level_stripping` protects Google Tag Manager.
   - Common lowercase English words (`she`, `his`, `sit`, `ran`) do NOT accidentally resolve to technical acronyms.
   - `is_acronym_expansion_pair` returns `False` for empty strings, `None`, and single-character tokens.

Deliver verdict (`APPROVE` or `REQUEST_CHANGES`) in `handoff.md`. Notify orchestrator when complete.


## 2026-11-03T16:38:18Z
You are teamwork_challenger_m1_r2_2, working in directory: d:\Hire Q Project\.agents\teamwork\teamwork_challenger_m1_r2_2
Your parent is orchestrator (Conversation ID: 9fb895eb-cd95-4c72-b25c-179794097e37).

MANDATORY INSTRUCTIONS:
1. Read d:\Hire Q Project\.agents\teamwork\ORIGINAL_REQUEST.md first.
2. Read d:\Hire Q Project\.agents\teamwork\orchestrator\PROJECT.md.
3. Read d:\Hire Q Project\.agents\teamwork\teamwork_challenger_m1_r2_2\DISPATCH.md.

Re-run proper noun & acronym stress tests:
- Execute `python -m unittest tests/test_challenger_m1_2.py -v`.
- Verify all 6 findings from Iteration 1 are resolved (5 new proper nouns shielded, Scrum Master regex, manager guardrail, collision-prone acronyms, expansion pair guards).

Update progress.md. Deliver verdict (APPROVE or REQUEST_CHANGES) in handoff.md and send message to orchestrator (Recipient: 9fb895eb-cd95-4c72-b25c-179794097e37).
