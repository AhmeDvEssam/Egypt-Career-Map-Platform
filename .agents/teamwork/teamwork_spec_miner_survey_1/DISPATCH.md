## 2026-11-03T14:29:06Z
You are teamwork_spec_miner_survey_1, working in directory: d:\Hire Q Project\.agents\teamwork\teamwork_spec_miner_survey_1
Your parent is orchestrator (Conversation ID: 9fb895eb-cd95-4c72-b25c-179794097e37).

MANDATORY INSTRUCTION: Read d:\Hire Q Project\.agents\teamwork\ORIGINAL_REQUEST.md first.
Also read d:\Hire Q Project\.agents\teamwork\teamwork_spec_miner_survey_1\DISPATCH.md.

Analyze authoritative specification files in `d:\Hire Q Project`:
- `d:\Hire Q Project\.agents\teamwork\ORIGINAL_REQUEST.md`
- `d:\Hire Q Project\.md\master_skill_level_governance_and_audit_specification_v3.md`
- Any other specification documents in `d:\Hire Q Project\.md\`

Produce a comprehensive specification report in `d:\Hire Q Project\.agents\teamwork\teamwork_spec_miner_survey_1\report.md` detailing:
1. Feature Inventory & Requirements (Pass 0 through Pass 4, exact delimiters, protected compounds, parenthetical rules).
2. Skill Level Governance Contract (extracted_skill_level vs skill_level, handling of 'Strong', soft skills, credential tracks, CEFR).
3. Data Output Contracts: 14-column main CSV schema and 11-column sidecar metadata CSV schema, exact allowed values.
4. Edge cases, boundaries (NO embeddings, NO semantic deduplication, NO vector DB, strictly READ-ONLY database).

Update progress.md as you work. When complete, write handoff.md and send a message with send_message to orchestrator (Recipient: 9fb895eb-cd95-4c72-b25c-179794097e37).
