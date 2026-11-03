# Dispatch Instructions: Milestone 1 Challenger 2

## Identity
- Role: Pass 0 Proper Nouns & Acronyms Challenger
- Archetype: teamwork_challenger
- Working Directory: d:\Hire Q Project\.agents\teamwork\teamwork_challenger_m1_2
- Parent Orchestrator: orchestrator (Conversation ID: 9fb895eb-cd95-4c72-b25c-179794097e37)

## Mission
Empirically stress-test the Pass 0 Proper Noun Shield and Acronym Engine (`linguistic_intelligence/proper_nouns.py`).

Challenger Objectives:
1. Write adversarial test cases testing the boundary between proper nouns and level modifiers:
   - Positive cases (MUST be shielded): `Lead Generation`, `Lead Nurturing`, `Lead Qualification`, `Lead Time Reduction`, `Senior Care`, `Senior Living`, `GitHub Advanced Security`, `Office 365 Advanced Threat Protection`, `Master Data Management`, `Scrum Master`, `SOLID Principles`, `Deep Learning`, `Google Tag Manager`, `Adobe Experience Manager`.
   - Negative cases (MUST NOT be shielded, should allow level stripping): `Lead Developer`, `Senior Python Developer`, `Advanced SQL`, `Mastery of Python`, `Solid understanding of Git`, `Deep knowledge of Kubernetes`.
2. Test Acronym collisions:
   - Does short token `AD` collide with `ad`?
   - Does `PM` collide with `pm`?
   - Can all 386 acronyms be retrieved and expanded?
   - Do symbol-bearing acronyms (`C++`, `C#`, `PL/SQL`, `CI/CD`, `UI/UX`, `R&D`) work safely?

Verdict format in handoff.md:
Either `APPROVE` or `REQUEST_CHANGES` with empirical results.
Update progress.md. Write handoff.md and notify orchestrator.

## 2026-11-03T15:35:48Z
You are teamwork_challenger_m1_2, working in directory: d:\Hire Q Project\.agents\teamwork\teamwork_challenger_m1_2
Your parent is orchestrator (Conversation ID: 9fb895eb-cd95-4c72-b25c-179794097e37).

MANDATORY INSTRUCTIONS:
1. Read d:\Hire Q Project\.agents\teamwork\ORIGINAL_REQUEST.md first.
2. Read d:\Hire Q Project\.agents\teamwork\orchestrator\PROJECT.md.
3. Read d:\Hire Q Project\.agents\teamwork\teamwork_challenger_m1_2\DISPATCH.md.

Empirically stress-test Pass 0 Proper Noun Shielding and Acronym Engine (`linguistic_intelligence/proper_nouns.py`).
Probe boundary between proper nouns and modifier phrases (`Lead Generation` vs `Lead Developer`, `Senior Care` vs `Senior Engineer`, `Deep Learning` vs `Deep knowledge`). Probe acronym collisions (`AD`, `PM`).

Update progress.md as you work. Deliver verdict (APPROVE or REQUEST_CHANGES) in handoff.md and send message to orchestrator (Recipient: 9fb895eb-cd95-4c72-b25c-179794097e37).
