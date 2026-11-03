# Dispatch Instructions: M1 Explorer 1 (Catalog & Priority Resolution)

## Identity
- Role: Catalog Architecture & Priority Resolution Explorer
- Archetype: teamwork_explorer
- Working Directory: d:\Hire Q Project\.agents\teamwork\teamwork_explorer_m1_1
- Parent Orchestrator: orchestrator (Conversation ID: 9fb895eb-cd95-4c72-b25c-179794097e37)

## Mission
Investigate and design the exact technical specification and implementation strategy for Feature 1 (Reference Catalog Ingestion & Priority Resolution) in Milestone 1.

MANDATORY INSTRUCTIONS:
1. Read `d:\Hire Q Project\.agents\teamwork\ORIGINAL_REQUEST.md`.
2. Read `d:\Hire Q Project\.agents\teamwork\orchestrator\PROJECT.md`.
3. Read `d:\Hire Q Project\standard_skills_catalog.csv` (3,794 rows, semicolon-separated).
4. Read Survey reports in `teamwork_explorer_survey_2` and `teamwork_explorer_survey_3`.

## Analysis Requirements
1. Analyze the 281 duplicate skill names across multiple domains in `standard_skills_catalog.csv`.
2. Specifically solve the `Python` dictionary overwrite bug (Row 2439 setting domain to Human Resources):
   - Design a priority-weighting algorithm or canonical domain resolution mapping (e.g. `Python` -> `Backend Development`).
   - Define canonical homes for cross-domain skills (e.g., `SQL` -> `Data Management & Warehousing` or `Backend Development`, `Power BI` -> `Data Analytics & Visualization`, `Excel` -> `Business Intelligence & Reporting`).
3. Define the exact dataclass / dictionary structure for catalog entries (`standard_skill_name`, `domain`, `sub_category`, `skill_type`, `priority`, `known_aliases`, `compiled_regex`).
4. Recommend exact class design and method signatures for `linguistic_intelligence/catalog.py`.

Update progress.md. Write handoff.md with verified recommendations and notify orchestrator.


## 2026-11-03T14:51:15Z
[Message] timestamp=2026-11-03T14:51:15Z sender=9fb895eb-cd95-4c72-b25c-179794097e37 priority=MESSAGE_PRIORITY_HIGH content=You are teamwork_explorer_m1_1, working in directory: d:\Hire Q Project\.agents\teamwork\teamwork_explorer_m1_1
Your parent is orchestrator (Conversation ID: 9fb895eb-cd95-4c72-b25c-179794097e37).

MANDATORY INSTRUCTIONS:
1. Read d:\Hire Q Project\.agents\teamwork\ORIGINAL_REQUEST.md first.
2. Read d:\Hire Q Project\.agents\teamwork\orchestrator\PROJECT.md.
3. Read d:\Hire Q Project\.agents\teamwork\teamwork_explorer_m1_1\DISPATCH.md.

Investigate Feature 1 (Reference Catalog Ingestion & Priority Resolution):
- Analyze `standard_skills_catalog.csv` (semicolon delimited, 3,794 rows, 14 domains, 61 subcategories).
- Solve duplicate skill names and priority resolution (especially Python -> Backend Development rather than HR).
- Define canonical home mappings for common cross-domain tools (SQL, Excel, Git, Jira, etc.).
- Propose exact class design and implementation for `linguistic_intelligence/catalog.py`.

Update progress.md as you work. When complete, write handoff.md and send a message to orchestrator (Recipient: 9fb895eb-cd95-4c72-b25c-179794097e37).
