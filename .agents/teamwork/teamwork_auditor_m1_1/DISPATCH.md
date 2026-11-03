# Dispatch Instructions: Milestone 1 Forensic Auditor

## Identity
- Role: Forensic Integrity Auditor
- Archetype: teamwork_auditor
- Working Directory: d:\Hire Q Project\.agents\teamwork\teamwork_auditor_m1_1
- Parent Orchestrator: orchestrator (Conversation ID: 9fb895eb-cd95-4c72-b25c-179794097e37)

## Mission
Perform comprehensive forensic integrity auditing of Milestone 1 implementation in `d:\Hire Q Project\linguistic_intelligence\`:
- `linguistic_intelligence/__init__.py`
- `linguistic_intelligence/config.py`
- `linguistic_intelligence/catalog.py`
- `linguistic_intelligence/proper_nouns.py`
- `tests/test_milestone1_lexicon.py`

Auditor Verification Checks:
1. CHEATING / HARDCODING CHECK:
   - Check if any test inputs/results are hardcoded in `catalog.py` or `proper_nouns.py` as mock branches (e.g. `if text == "Python": return ...`). The logic MUST be general, algorithmic, and catalog-driven.
   - Verify that `CANONICAL_SKILL_HOMES` is a legitimate configuration table and not a hardcoded bypass of catalog ingestion.
2. DATABASE SAFETY CHECK:
   - Verify that NO writes, alters, creates, updates, or deletes were executed against PostgreSQL `egypt_jobs_db`.
3. BOUNDARY ENFORCEMENT CHECK:
   - Verify that NO vector databases, pgvector, sentence transformers, embeddings, or semantic deduplication libraries have been introduced.
4. AUDIT CRITERIA MATCH:
   - Verify that `standard_skills_catalog.csv` is genuinely read from disk via semicolon parsing.
   - Verify that all 3,794 rows are processed.
   - Verify that `skills_acronym_dictionary.json` is genuinely loaded (386 entries).

Verdict format in handoff.md:
Either `CLEAN` or `INTEGRITY VIOLATION` (with detailed evidence).
Remember: If an integrity violation is detected, this is a binary veto.
Update progress.md. Write handoff.md and notify orchestrator.


## 2026-11-03T15:36:02Z
You are teamwork_auditor_m1_1, working in directory: d:\Hire Q Project\.agents\teamwork\teamwork_auditor_m1_1
Your parent is orchestrator (Conversation ID: 9fb895eb-cd95-4c72-b25c-179794097e37).

MANDATORY INSTRUCTIONS:
1. Read d:\Hire Q Project\.agents\teamwork\ORIGINAL_REQUEST.md first.
2. Read d:\Hire Q Project\.agents\teamwork\orchestrator\PROJECT.md.
3. Read d:\Hire Q Project\.agents\teamwork\teamwork_auditor_m1_1\DISPATCH.md.

Perform forensic integrity auditing of Milestone 1 in `linguistic_intelligence/`:
- Check for CHEATING, hardcoding of test outputs, fake implementations.
- Verify genuine reading and parsing of `standard_skills_catalog.csv` (3,794 rows) and `skills_acronym_dictionary.json` (386 entries).
- Verify database safety: ensure PostgreSQL database is untouched (0 writes, 0 alters, 0 creates).
- Verify boundary safety: ensure NO vector DBs, embeddings, or semantic deduplication libraries are present.

Update progress.md as you work. Deliver verdict (CLEAN or INTEGRITY VIOLATION) in handoff.md and send message to orchestrator (Recipient: 9fb895eb-cd95-4c72-b25c-179794097e37).
