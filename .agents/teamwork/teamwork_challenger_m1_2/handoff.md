# Handoff Report: Milestone 1 Challenger 2 — Proper Nouns & Acronyms Engine

## Verdict: REQUEST_CHANGES

---

## 1. Observation

### Exact File Paths and Line Numbers Inspected
- Implementation target: `d:\Hire Q Project\linguistic_intelligence\proper_nouns.py`
- Test suite executed: `d:\Hire Q Project\tests\test_challenger_m1_2.py`
- Reference catalog: `d:\Hire Q Project\skills_acronym_dictionary.json`

### Direct Code Observations
1. **`proper_nouns.py` Lines 189–264 (`PROTECTED_PROPER_NOUNS_REGISTRY`)**:
   Contains `ProtectedProperNoun("Office 365 ATP", ...)` at line 228, but completely lacks:
   - `Office 365 Advanced Threat Protection`
   - `Windows Defender Advanced Threat Protection`
   - `Azure Advanced Threat Protection`
   - `Google Tag Manager`
   - `Adobe Experience Manager`

2. **`proper_nouns.py` Lines 313–317 (`is_protected_proper_noun`)**:
   ```python
   # 3. Advanced products
   if re.fullmatch(r'(?:github\s+)?advanced\s+(?:threat\s+protection|security|analytics|planning\s+systems|diagnostic\s+procedures)', lower):
       return True
   if lower in {"office 365 atp", "windows defender atp"}:
       return True
   ```
   The regex prefix `(?:github\s+)?` strictly allows only `"github"` before `"advanced"`. Any other vendor prefix (e.g. `"Office 365"`, `"Windows Defender"`, `"Azure"`) fails to match.

3. **`proper_nouns.py` Lines 321–322 (`is_protected_proper_noun`)**:
   ```python
   if re.fullmatch(r'(?:professional\s+|agile/)?scrum\s+master', lower):
       return True
   ```
   The regex specifies `agile/` with a literal slash, which fails to match space-separated `"Agile Scrum Master"`.

4. **`proper_nouns.py` Lines 290–295 (`is_protected_proper_noun`)**:
   ```python
   # Check if known acronym exists in acronym dictionary with full name
   acronym_entry = self.acronym_engine.get_acronym(clean)
   if acronym_entry and acronym_entry.acronym.lower() == lower:
       # Acronyms like ADAS, ABAP, VCAP, DCACI are shielded
       if lower in {"adas", "abap", "vcap", "dcaci", "atp", "apt", "aes", "acls", "atls", "apra", "mdm", "mdb", "mcse", "vcdx"}:
           return True
   ```
   When queried with full name `"Adobe Experience Manager"`, `get_acronym("Adobe Experience Manager")` resolves reverse-lookup to `AcronymEntry(acronym='AEM', full_name='Adobe Experience Manager')`. However, the conditional checks `acronym_entry.acronym.lower() == lower` (`'aem' == 'adobe experience manager'`), which evaluates to `False`. Thus, full names of acronym-backed tools are not shielded.

5. **`proper_nouns.py` Lines 374–405 (`should_inhibit_level_stripping`)**:
   Guardrail specifically handles `lead`, `senior`, `advanced`, `master`/`mastery`, `solid`, `deep`. It contains no guard for keyword `manager` against products like `"Google Tag Manager"` or `"Adobe Experience Manager"`.

6. **`proper_nouns.py` Lines 66, 120–130 (`COLLISION_PRONE_ACRONYMS` and `get_acronym`)**:
   ```python
   COLLISION_PRONE_ACRONYMS: Set[str] = {"AD", "EN", "PM"}
   ...
   # Direct acronym lookup (case-insensitive)
   t_lower = t_clean.lower()
   if t_lower in self._by_lower_key:
       return self._by_lower_key[t_lower]
   ```
   Only 3 acronyms are in `COLLISION_PRONE_ACRONYMS`. For any other entry in `skills_acronym_dictionary.json`, case-insensitive lookup causes common lowercase words to resolve:
   - `resolver.get_acronym("she")` -> `Safety, Health & Environment`
   - `resolver.get_acronym("his")` -> `Healthcare Information Systems`
   - `resolver.get_acronym("sit")` -> `System Integration Testing`
   - `resolver.get_acronym("ran")` -> `Ericsson Radio Access Network`

7. **`proper_nouns.py` Lines 141–165 (`is_acronym_expansion_pair`)**:
   ```python
   words_b = [w for w in re.split(r'[\s\-]+', b_clean) if w not in ('of', 'and', 'the', 'for', 'in', 'to', '&')]
   if words_b and ''.join(w[0] for w in words_b if w) == a_clean:
       return True
   ```
   - When inputs are empty strings `("", "")` or whitespace `("", "   ")`, `re.split` returns `['']`, which is truthy. The empty string comprehension produces `""`, which equals `a_clean == ""`, returning `True` (vacuous true match).
   - Single-character inputs match single-word initialisms: `is_acronym_expansion_pair("p", "Python")` returns `True`; `is_acronym_expansion_pair("j", "Java")` returns `True`.
   - Passing `None` raises an unhandled `AttributeError: 'NoneType' object has no attribute 'strip'`.

### Empirical Test Execution and Results
Command executed:
`python -m unittest tests/test_challenger_m1_2.py`

Output:
```
F..F..FFF.F
======================================================================
FAIL: test_dispatch_positive_proper_nouns_shielded
AssertionError: Lists differ: [{'term': 'Office 365 Advanced Threat Prot[218 chars]lse}] != []
Failed to shield 3 required positive proper nouns: [
  {'term': 'Office 365 Advanced Threat Protection', 'is_protected': False, 'pass0_shielded': False},
  {'term': 'Google Tag Manager', 'is_protected': False, 'pass0_shielded': False},
  {'term': 'Adobe Experience Manager', 'is_protected': False, 'pass0_shielded': False}
]

======================================================================
FAIL: test_extended_advanced_threat_protection_products
AssertionError: ATP products not shielded: ['Office 365 Advanced Threat Protection', 'Windows Defender Advanced Threat Protection', 'Azure Advanced Threat Protection']

======================================================================
FAIL: test_manager_guardrails_in_should_inhibit
AssertionError: Manager tools failed inhibit check: ['Google Tag Manager', 'Adobe Experience Manager']

======================================================================
FAIL: test_scrum_master_variations
AssertionError: Scrum master variations not shielded: ['Agile Scrum Master']

======================================================================
FAIL: test_lowercase_common_word_collisions
AssertionError: Common lowercase words accidentally resolved to acronyms: [
  ('she', 'Safety, Health & Environment'),
  ('his', 'Healthcare Information Systems'),
  ('sit', 'System Integration Testing'),
  ('ran', 'Ericsson Radio Access Network')
]

======================================================================
FAIL: test_acronym_expansion_pair_robustness
AssertionError: True is not false : Empty strings returned True

----------------------------------------------------------------------
Ran 11 tests in 0.033s
FAILED (failures=6)
```

---

## 2. Logic Chain

1. **Premise 1 (Acceptance Criteria)**: DISPATCH.md mandates that Pass 0 MUST shield 14 specific positive proper nouns, explicitly including `Office 365 Advanced Threat Protection`, `Google Tag Manager`, and `Adobe Experience Manager`.
2. **Observation 1**: Executing `ProperNounShield.is_protected_proper_noun()` and `ProperNounShield.evaluate_pass_0()` demonstrates that 3 of the 14 mandatory proper nouns evaluate to `False` / `is_shielded=False` (Observation 1, 2, 4).
3. **Observation 2**: In Pass 4 level governance, words like `Manager` or `Advanced` are treated as title/level words. Because `Google Tag Manager` and `Adobe Experience Manager` are not shielded in Pass 0 and have no guardrail in `should_inhibit_level_stripping()` (Observation 5), downstream passes will strip `Manager` or misclassify them.
4. **Observation 3**: In `AcronymResolver`, case-insensitive lookup for all acronyms outside the 3 hardcoded tokens in `COLLISION_PRONE_ACRONYMS` causes common English words like `she`, `his`, `sit`, and `ran` to resolve to domain acronyms (Observation 6).
5. **Observation 4**: In `is_acronym_expansion_pair`, empty strings evaluate to `True`, single letters match arbitrary words, and null inputs crash (Observation 7).
6. **Inference**: Pass 0 fails both explicit positive acceptance criteria from DISPATCH.md and critical defensive boundary contracts necessary for reliable upstream shielding.
7. **Conclusion**: Implementation cannot be approved in its current state. Changes must be requested and resolved before advancing to Milestone 2.

---

## 3. Caveats

- **Negative Cases**: The negative cases from DISPATCH.md (`Lead Developer`, `Senior Python Developer`, `Advanced SQL`, `Mastery of Python`, `Solid understanding of Git`, `Deep knowledge of Kubernetes`) all correctly evaluated to `False` for both `is_protected_proper_noun()` and `evaluate_pass_0()`.
- **Acronym Dictionary Completeness**: All 386 acronym entries in `skills_acronym_dictionary.json` load successfully and are retrievable/expandable when queried in uppercase.
- **Symbol Compounds**: Compounds `PL/SQL`, `CI/CD`, `UI/UX`, `R&D`, and `c/c++` correctly evaluate to `True` under `is_protected_compound()`.
- **Scope of Changes**: The required fixes are localized exclusively to `linguistic_intelligence/proper_nouns.py` and do not require changing `catalog.py` or the data files.

---

## 4. Conclusion

### Final Assessment: REQUEST_CHANGES

The worker must implement the following 6 concrete remediations in `linguistic_intelligence/proper_nouns.py`:

1. **Add Missing Proper Nouns to Registry (`PROTECTED_PROPER_NOUNS_REGISTRY`)**:
   Add the following entries:
   ```python
   ProtectedProperNoun("Office 365 Advanced Threat Protection", "Software Engineering & IT", "Cybersecurity & Information Security", "Tool / Software", "Cybersecurity"),
   ProtectedProperNoun("Windows Defender Advanced Threat Protection", "Software Engineering & IT", "Cybersecurity & Information Security", "Tool / Software", "Cybersecurity"),
   ProtectedProperNoun("Azure Advanced Threat Protection", "Software Engineering & IT", "Cybersecurity & Information Security", "Tool / Software", "Cybersecurity"),
   ProtectedProperNoun("Google Tag Manager", "Marketing & Sales", "Digital Marketing & Paid Ads (Performance Media)", "Tool / Software", "MarTech"),
   ProtectedProperNoun("Adobe Experience Manager", "Software Engineering & IT", "Frontend Development", "Tool / Software", "Enterprise CMS"),
   ```

2. **Broaden ATP Regex Pattern**:
   In `is_protected_proper_noun()`, update the Advanced Threat Protection regex to allow vendor prefixes:
   ```python
   if re.fullmatch(r'(?:(?:office\s+365|windows\s+defender|azure|github)\s+)?advanced\s+(?:threat\s+protection|security|analytics|planning\s+systems|diagnostic\s+procedures)', lower):
       return True
   ```

3. **Fix Scrum Master Regex for Whitespace Separators**:
   Update line 321 to permit whitespace or slash:
   ```python
   if re.fullmatch(r'(?:professional\s+|agile[\s/])?scrum\s+master', lower):
       return True
   ```

4. **Add Manager Guardrail in `should_inhibit_level_stripping`**:
   Add guard for `manager`:
   ```python
   if kw_lower == "manager" and re.search(r'\b(?:google\s+tag\s+manager|adobe\s+experience\s+manager|engineering\s+manager|product\s+manager)\b', t_lower):
       return True
   ```

5. **Protect Collision-Prone Words in `AcronymResolver`**:
   Expand `COLLISION_PRONE_ACRONYMS` or require exact uppercase match for acronyms matching common English vocabulary:
   ```python
   COLLISION_PRONE_ACRONYMS: Set[str] = {"AD", "EN", "PM", "SHE", "HIS", "SIT", "RAN", "DA", "BS", "FI"}
   ```

6. **Harden `is_acronym_expansion_pair`**:
   - Add null and empty guards:
     ```python
     if not token_a or not token_b:
         return False
     a_clean = str(token_a).strip().lower()
     b_clean = str(token_b).strip().lower()
     if not a_clean or not b_clean:
         return False
     ```
   - In algorithmic initialism fallback, require minimum lengths:
     ```python
     if len(a_clean) >= 2 and len(words_b) >= 2 and ''.join(w[0] for w in words_b if w) == a_clean:
         return True
     ```

---

## 5. Verification Method

To independently verify the resolution of these findings:

1. Run the challenger test suite:
   ```powershell
   python -m unittest tests/test_challenger_m1_2.py
   ```
2. Verify all existing unit tests continue to pass:
   ```powershell
   python -m unittest tests/test_milestone1_lexicon.py
   ```
3. Run the full test discovery:
   ```powershell
   python -m unittest discover -s tests
   ```
4. **Invalidation Condition**: If `python -m unittest tests/test_challenger_m1_2.py` exits with code 0 (`Ran 11 tests ... OK`), all 6 findings have been successfully remediated.
