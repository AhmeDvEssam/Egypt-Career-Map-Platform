# Dispatch Instructions: Milestone 1 Worker (Remediation Iteration 2)

## Identity
- Role: Milestone 1 Remediation Worker
- Archetype: teamwork_worker
- Working Directory: d:\Hire Q Project\.agents\teamwork\teamwork_worker_m1_2
- Parent Orchestrator: orchestrator (Conversation ID: 9fb895eb-cd95-4c72-b25c-179794097e37)

## MANDATORY INTEGRITY WARNING
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

## Mission
Remediate the specific defects identified by Reviewer 1, Challenger 1, and Challenger 2 during Milestone 1 Gate Iteration 1.

Source Reports:
- `d:\Hire Q Project\.agents\teamwork\teamwork_reviewer_m1_1\handoff.md`
- `d:\Hire Q Project\.agents\teamwork\teamwork_challenger_m1_1\handoff.md`
- `d:\Hire Q Project\.agents\teamwork\teamwork_challenger_m1_2\handoff.md`
- `d:\Hire Q Project\.agents\teamwork\orchestrator\GATE_STATUS.md`

## Required Remediations

### 1. `linguistic_intelligence/config.py`:
- In `CANONICAL_SKILL_HOMES["SQL"]`: Change subcategory from `"Business Intelligence & Data Analytics"` to `"Data Engineering"`.

### 2. `linguistic_intelligence/catalog.py`:
- In `_load_catalog()`: Normalize legacy `skill_type` values to the 5 frozen types:
  `"Domain Knowledge"` -> `"Hard Skill"`, `"Methodology"` -> `"Hard Skill"`, `"Requirement"` -> `"Hard Skill"` (or `"Certification"` if certification-related).
- In `get_exact_match()` and `get_regex_match()`: Add defensive guards for `None` and empty inputs (return `None` instead of raising `AttributeError`).
- In `_clean_level_regex()`: Fix tool level regex cleaning. Do not leave a dangling `| user|` when cleaning `lead user` (use `\blead\s+user\b`).
- In `get_regex_match()`: Sort compiled regex patterns by pattern length descending so specific longer expressions match before shorter ones.
- In JavaScript regex pattern: Ensure `(?<![\w\.])JS(?!\w)` so that `.js` (in `Node.js`, `Vue.js`, `Next.js`) is NOT matched as plain `JavaScript`.

### 3. `linguistic_intelligence/proper_nouns.py`:
- Add to `PROTECTED_PROPER_NOUNS_REGISTRY`:
  - `ProtectedProperNoun("Office 365 Advanced Threat Protection", "Software Engineering & IT", "Cybersecurity & Information Security", "Tool / Software", "Cybersecurity")`
  - `ProtectedProperNoun("Windows Defender Advanced Threat Protection", "Software Engineering & IT", "Cybersecurity & Information Security", "Tool / Software", "Cybersecurity")`
  - `ProtectedProperNoun("Azure Advanced Threat Protection", "Software Engineering & IT", "Cybersecurity & Information Security", "Tool / Software", "Cybersecurity")`
  - `ProtectedProperNoun("Google Tag Manager", "Marketing & Sales", "Digital Marketing & Paid Ads (Performance Media)", "Tool / Software", "MarTech")`
  - `ProtectedProperNoun("Adobe Experience Manager", "Software Engineering & IT", "Frontend Development", "Tool / Software", "Enterprise CMS")`
- In `is_protected_proper_noun()`:
  - Broaden ATP regex to allow vendor prefixes: `r'(?:(?:office\s+365|windows\s+defender|azure|github)\s+)?advanced\s+(?:threat\s+protection|security|analytics|planning\s+systems|diagnostic\s+procedures)'`.
  - Fix Scrum Master regex to allow whitespace: `r'(?:professional\s+|agile[\s/])?scrum\s+master'`.
- In `should_inhibit_level_stripping()`:
  - Add guardrail for keyword `"manager"`:
    `if kw_lower == "manager" and re.search(r'\b(?:google\s+tag\s+manager|adobe\s+experience\s+manager)\b', t_lower): return True`
- In `AcronymResolver`:
  - Expand `COLLISION_PRONE_ACRONYMS` to include common English words: `{"AD", "EN", "PM", "SHE", "HIS", "SIT", "RAN", "DA", "BS", "FI"}` so they require exact uppercase matching.
- In `is_acronym_expansion_pair()`:
  - Add `None` and empty string guards (return `False`).
  - Require minimum length >= 2 for algorithmic initialism fallback.

### 4. Tests:
- In `tests/test_milestone1_lexicon.py`: Update test asserting `SQL` to assert `Data Engineering`.
- Run and verify:
  1. `python -m unittest tests/test_milestone1_lexicon.py -v` (Must pass 100%)
  2. `python -m unittest tests/test_challenger_m1_2.py -v` (Must pass 100%)
  3. `python -m unittest tests/test_adversarial_m1_catalog.py -v` (Must pass 100%)
  4. `python tests/run_all_tests.py --suite tier1 -v` (Must pass 100%)

Document all changes and test outputs in `handoff.md`. Notify orchestrator when complete.


## 2026-11-03T15:57:59Z
You are teamwork_worker_m1_2, working in directory: d:\Hire Q Project\.agents\teamwork\teamwork_worker_m1_2
Your parent is orchestrator (Conversation ID: 9fb895eb-cd95-4c72-b25c-179794097e37).

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

MANDATORY INSTRUCTIONS:
1. Read d:\Hire Q Project\.agents\teamwork\ORIGINAL_REQUEST.md first.
2. Read d:\Hire Q Project\.agents\teamwork\orchestrator\PROJECT.md.
3. Read d:\Hire Q Project\.agents\teamwork\teamwork_worker_m1_2\DISPATCH.md.
4. Read Reviewer and Challenger reports:
   - `d:\Hire Q Project\.agents\teamwork\teamwork_reviewer_m1_1\handoff.md`
   - `d:\Hire Q Project\.agents\teamwork\teamwork_challenger_m1_1\handoff.md`
   - `d:\Hire Q Project\.agents\teamwork\teamwork_challenger_m1_2\handoff.md`

Remediate all action items in:
- `linguistic_intelligence/config.py` (SQL home -> Data Engineering)
- `linguistic_intelligence/catalog.py` (normalize 90 legacy skill_types, None guards, fix tool level regex cleaning, regex length sorting, .js collision)
- `linguistic_intelligence/proper_nouns.py` (add proper nouns, ATP regex, Scrum Master regex, manager guardrail, collision-prone acronyms, acronym expansion pair guards)
- `tests/test_milestone1_lexicon.py` (update SQL assertion)

Verification commands to run:
1. `python -m unittest tests/test_milestone1_lexicon.py -v`
2. `python -m unittest tests/test_challenger_m1_2.py -v`
3. `python -m unittest tests/test_adversarial_m1_catalog.py -v`
4. `python tests/run_all_tests.py --suite tier1 -v`

Update progress.md as you work. Deliver handoff.md and send message to orchestrator (Recipient: 9fb895eb-cd95-4c72-b25c-179794097e37).

## 2026-11-03T16:30:32Z
**Context**: Milestone 1 Remediation Worker Iteration 2
**Content**: Liveness query. Your progress.md was last updated at 16:06:00Z (>20 minutes ago). Please report your status on the 4 remediations and test verification.
**Action**: Update progress.md, finalize handoff.md, and send your completion report.
