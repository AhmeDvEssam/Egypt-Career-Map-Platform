# Handoff Report: Specification Survey & Linguistic Intelligence Governance

**Agent:** `teamwork_spec_miner_survey_1`  
**Recipient:** Orchestrator (`9fb895eb-cd95-4c72-b25c-179794097e37`)  
**Target File:** `d:\Hire Q Project\.agents\teamwork\teamwork_spec_miner_survey_1\report.md`  
**Handoff Type:** Hard (Task Complete)

---

### 1. Observation

1. **Authoritative Specification Mandate:**
   - In `d:\Hire Q Project\.agents\teamwork\ORIGINAL_REQUEST.md` (lines 110-150):
     - Main output: `egypt_skills_decomposed_graph.csv` (Frozen 14 columns).
     - Sidecar output: `egypt_skills_decomposition_metadata.csv` (Frozen 11 columns).
     - Non-negotiable scope: "This implementation must solve atomic decomposition, not final normalization. You MUST NOT implement: Semantic deduplication... Embedding-based similarity matching... Vector database integration... pgvector integration..."
     - Database safety: "The database MUST remain strictly READ-ONLY throughout the entire task."
   - In `d:\Hire Q Project\.md\master_skill_level_governance_and_audit_specification_v3.md`:
     - Line 14: "Pure Verbatim Extraction Restored: `extracted_skill_level` preserves the exact original substring, including original casing and internal spacing (e.g. `'Working knowledge'`, NOT `'Working Knowledge'`)."
     - Line 68: "Governed Decision: To protect dashboard dropdown integrity and prevent subjective inflation, all Soft Skills default to `skill_level = 'Not Specified'` in Phase A."
     - Line 108: Certification level separated from award status: `ISTQB Advanced Level` -> `extracted_skill_level = "Advanced"`, `skill_level = "Not Specified"`, sidecar `credential_track_or_status = "Advanced Level"`.
     - Lines 125-143: 11-column sidecar metadata schema strictly specified with 1-to-1 relationship per unique `raw_skill`.
     - Lines 262-270: Exactly 6 approved `match_status` values: `CATALOG_EXACT_MATCH`, `CATALOG_REGEX_MATCH`, `PARENTHESIS_SPECIFICATION`, `PROTECTED_PROPER_NOUN`, `UNMATCHED_NOVEL`, `REJECTED_NOISE`. Line 272 explicitly states: "`PROTECTED_COMPOUND` is NOT a match status."
     - Lines 254-261: Taxonomy exception: `UNMATCHED_NOVEL` and `REJECTED_NOISE` receive `domain = 'Unknown'` and `sub_category = 'Unknown'`, and are NEVER forced into unsupported catalog nodes.

2. **Repository & Taxonomy Evidence:**
   - Evaluated `d:\Hire Q Project\standard_skills_catalog.csv` via Python command: confirmed exactly **14 Closed Domains** and **61 Closed Subcategories**. Total rows: 3,794 standard skills.
   - Evaluated `d:\Hire Q Project\standard_skill_levels_matrix.csv`: 23 rows detailing level tiers across Hard Skill, Tool / Software, Language (CEFR A1-C2), Certification, and Soft Skill.
   - Evaluated `d:\Hire Q Project\skills_acronym_dictionary.json`: 386 verified global and Egyptian technical acronyms.
   - Verified live PostgreSQL read-only query on `localhost:5432/egypt_jobs_db`: `SELECT count(*) FROM skills;` returned **28,824** rows; `SELECT count(*) FROM job_skills;` returned **464,397** rows.

3. **Superseded Draft Artifacts:**
   - In `revised_atomic_decomposition_and_linguistic_plan.md` (lines 50-82) and `revised_skill_level_architecture_and_two_column_design.md` (lines 33-79), early drafts referenced a 13-column main schema and 8-column or 9-column sidecar schema. These have been formally updated and superseded by the 14-column and 11-column layouts in `master_skill_level_governance_and_audit_specification_v3.md` and `ORIGINAL_REQUEST.md`.

---

### 2. Logic Chain

1. **Reconciliation of Schemas:**
   - Observation 1 establishes that `ORIGINAL_REQUEST.md` and `master_skill_level_governance_and_audit_specification_v3.md` are the frozen Tier-1 authoritative specifications.
   - Observation 3 shows earlier planning drafts had 13 main / 8 sidecar columns.
   - Therefore, the pipeline contract is definitively locked to the **14-column main schema** (incorporating pure verbatim `extracted_skill_level` as column 7 and normalized `skill_level` as column 8) and the **11-column sidecar metadata schema** (incorporating `job_count`, `intra_string_seniority`, `credential_track_or_status`, `posting_career_level_distribution`, `top_associated_job_titles`, and `is_composite`).

2. **Reconciliation of Skill Level Governance:**
   - In earlier drafts, `Solid` was proposed as `Intermediate`, and `ISTQB Advanced` had `skill_level = 'Advanced'`.
   - However, Observation 1 proves that `master_skill_level_governance_and_audit_specification_v3.md` resolved these contradictions:
     - `Solid` and `Strong` are classified as `AMBIGUOUS` and default strictly to `skill_level = 'Not Specified'`.
     - Soft skills default to `skill_level = 'Not Specified'` in Phase A.
     - Certification levels (`ISTQB Advanced`) capture exam tiers in `extracted_skill_level` and sidecar `credential_track_or_status`, while setting `skill_level = 'Not Specified'` because the approved certification matrix tracks only Credential Award Status (`Active / Certified`, `Candidate / In Progress`).
     - CEFR language ratings (`A1` to `C2`) are assigned only when explicit CEFR codes appear in the raw text; conversational adjectives (`Fluent`) do not force CEFR codes.
     - The Golden Rule governs: any unverified or ambiguous modifier defaults to `'Not Specified'`.

3. **Pass Precedence & Protection Hierarchy:**
   - Pass 0 contextual shield guarantees that multi-word proper nouns (`Lead Generation`, `Senior Care`, `Advanced Threat Protection`, `GitHub Advanced Security`) are shielded before level stripping or splitting.
   - Pass 1 protects whole-skill matches (`Data Analysis`) from space splitting.
   - Pass 2 resolves parenthetical structures into 5 discrete functional cases (level-only, acronyms, category containers, industry contexts, and sub-skill specifications).
   - Pass 3 masks protected compounds (`PL/SQL`, `CI/CD`, `UI/UX`, `AI/ML`, `C/C++`, `R&D`, etc.) before hierarchical delimiter splitting on `&`, `/`, `,`, `-`, `and`.
   - Pass 4 performs verbatim level extraction, governed level normalization, noise rejection, and taxonomy mapping (retaining unmatched novel skills with `domain = 'Unknown'`).

---

### 3. Caveats

- **No Live Modifications:** This survey was conducted in strict accordance with the read-only mandate. Zero lines of production engine code were executed against the full dataset, and zero database writes were performed.
- **Title Words Regression Boundary:** The 225 records in `skills.csv` containing title words (`Manager`, `Director`, `Lead`, `Senior`) were empirically confirmed to be software products (`Google Tag Manager`), certifications (`AWS Solutions Architect`), or business disciplines (`Lead Generation`). Hypothetical adversarial cases like `Senior C++ Engineer` do not exist in `skills.csv` and are retained only as regression tests.
- **Subprocess Isolation Requirement:** The 5-gate regex safety validator requires execution in a multiprocessing subprocess with a hard 50ms timeout; implementation teams must ensure platform compatibility with Python multiprocessing on Windows.

---

### 4. Conclusion

The authoritative specification survey is fully completed and documented in `d:\Hire Q Project\.agents\teamwork\teamwork_spec_miner_survey_1\report.md`. All requirements across the 5 passes, 14-column main schema, 11-column sidecar metadata schema, 5-tier level governance, 14 Closed Domains, 61 Closed Subcategories, and strict read-only/no-embedding boundaries are fully enumerated and ready for immediate implementation by downstream agents.

---

### 5. Verification Method

To independently verify the facts and findings presented in this report:

1. **Verify Database Counts (Read-Only):**
   ```powershell
   python -c "import psycopg2; conn = psycopg2.connect('postgresql://postgres:postgres@localhost:5432/egypt_jobs_db'); cur = conn.cursor(); cur.execute('SELECT count(*) FROM skills;'); print('Skills:', cur.fetchone()[0]); cur.execute('SELECT count(*) FROM job_skills;'); print('Job Skills:', cur.fetchone()[0]); conn.close()"
   ```
   *Expected Result:* Skills: 28,824; Job Skills: 464,397.

2. **Verify Closed Taxonomy Cardinality:**
   ```powershell
   python -c "import pandas as pd; df = pd.read_csv('standard_skills_catalog.csv', sep=';', encoding='utf-8-sig'); print('Domains:', df['domain'].nunique(), '| Subcategories:', df['sub_category'].nunique())"
   ```
   *Expected Result:* Domains: 14 | Subcategories: 61.

3. **Inspect Specification Report:**
   Inspect `d:\Hire Q Project\.agents\teamwork\teamwork_spec_miner_survey_1\report.md` to confirm the presence of:
   - Section 2: `## Features Discovered` (21 features across Pass 0 to Pass 4, governance, and safety).
   - Section 3: `## Edge Cases` (25 representative edge cases with concrete inputs and observed behaviors).
   - Section 5: Master 5-tier Level Governance Matrix and specialized entity rules.
   - Section 6: Frozen 14-column main schema and frozen 11-column sidecar schema.
   - Section 8: Complete table of all 14 Closed Domains and 61 Closed Subcategories.
