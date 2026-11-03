# Dispatch Instructions: M1 Explorer 2 (Proper Noun & Acronym Shielding)

## Identity
- Role: Proper Noun & Acronym Shielding Explorer
- Archetype: teamwork_explorer
- Working Directory: d:\Hire Q Project\.agents\teamwork\teamwork_explorer_m1_2
- Parent Orchestrator: orchestrator (Conversation ID: 9fb895eb-cd95-4c72-b25c-179794097e37)

## Mission
Investigate and design the exact technical specification and implementation strategy for Feature 2 & 3 (Acronym & Level Matrix Loading, Proper Noun & Acronym Shielding - Pass 0) in Milestone 1.

MANDATORY INSTRUCTIONS:
1. Read `d:\Hire Q Project\.agents\teamwork\ORIGINAL_REQUEST.md`.
2. Read `d:\Hire Q Project\.agents\teamwork\orchestrator\PROJECT.md`.
3. Inspect `d:\Hire Q Project\skills_acronym_dictionary.json` (386 entries) and `d:\Hire Q Project\standard_skill_levels_matrix.csv`.
4. Inspect `d:\Hire Q Project\skills.csv` for terms containing proper noun words that would be stripped by naive level/role matching (e.g., `Lead Generation`, `Lead Time Reduction`, `Senior Care`, `Chief Financial Officer`, `Advanced Threat Protection`, `GitHub Advanced Security`, `Master Data Management`).

## Analysis Requirements
1. Enumerate all protected proper nouns, business disciplines, and role-like skill titles in `skills.csv` that must NEVER have words like "Lead", "Senior", "Advanced", "Master" stripped.
2. Structure the Pass 0 shielding lookup table and regex boundaries.
3. Design the Acronym Lookup Engine using `skills_acronym_dictionary.json` with expansion capability.
4. Recommend exact class design and methods for `linguistic_intelligence/proper_nouns.py`.

Update progress.md. Write handoff.md with verified recommendations and notify orchestrator.

## 2026-11-03T14:51:30Z
From: 9fb895eb-cd95-4c72-b25c-179794097e37
Content: You are teamwork_explorer_m1_2, working in directory: d:\Hire Q Project\.agents\teamwork\teamwork_explorer_m1_2
Your parent is orchestrator (Conversation ID: 9fb895eb-cd95-4c72-b25c-179794097e37).

MANDATORY INSTRUCTIONS:
1. Read d:\Hire Q Project\.agents\teamwork\ORIGINAL_REQUEST.md first.
2. Read d:\Hire Q Project\.agents\teamwork\orchestrator\PROJECT.md.
3. Read d:\Hire Q Project\.agents\teamwork\teamwork_explorer_m1_2\DISPATCH.md.

Investigate Features 2 & 3 (Acronym & Level Matrix Loading, Pass 0 Proper Noun & Acronym Shielding):
- Analyze `skills_acronym_dictionary.json` (386 entries) and `standard_skill_levels_matrix.csv`.
- Inspect `skills.csv` for proper noun multi-word terms with title or level keywords (`Lead Generation`, `Senior Care`, `Advanced Threat Protection`, `GitHub Advanced Security`, etc.).
- Design the Pass 0 shielding lookup structures and regex boundaries.
- Propose exact class design and methods for `linguistic_intelligence/proper_nouns.py`.

Update progress.md as you work. When complete, write handoff.md and send a message to orchestrator (Recipient: 9fb895eb-cd95-4c72-b25c-179794097e37).

