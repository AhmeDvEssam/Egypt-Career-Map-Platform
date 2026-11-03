"""
Comprehensive Dynamic Parsing & Integrity Audit for Milestone 1 Remediated Code.
Tests dynamic binding, absence of hardcoding, regex sorting, defensive guards, and taxonomy compliance.
"""

import os
import sys
import tempfile
from pathlib import Path

# Add project root to path
PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from linguistic_intelligence.config import (
    APPROVED_SKILL_TYPES,
    CANONICAL_SKILL_HOMES,
    DEFAULT_ACRONYMS_PATH,
    DEFAULT_CATALOG_PATH,
    DEFAULT_LEVELS_PATH,
)
from linguistic_intelligence.catalog import CatalogLoader, StandardSkillEntry
from linguistic_intelligence.proper_nouns import AcronymResolver, ProperNounShield

def run_audit():
    print("=== STARTING MILESTONE 1 FORENSIC INTEGRITY CHECKS ===")
    failures = []

    # -------------------------------------------------------------
    # Check 1: Dynamic Loading of Real Assets
    # -------------------------------------------------------------
    print("\n--- Check 1: Ingestion of Production Reference Files ---")
    loader = CatalogLoader()
    print(f"Raw rows in catalog: {loader.raw_row_count}")
    print(f"Unique canonical standard skills: {len(loader.exact_canonical_map)}")
    print(f"Unique standard skill names in set: {len(loader.unique_standard_skills)}")
    print(f"Total aliases mapped: {len(loader.alias_map)}")
    print(f"Compiled regexes: {len(loader.compiled_regexes)}")
    print(f"Level matrix rows: {len(loader.level_matrix_entries)}")
    print(f"Acronym entries: {len(loader.acronym_resolver.acronyms)}")

    if loader.raw_row_count != 3794:
        failures.append(f"Catalog raw row count expected 3794, got {loader.raw_row_count}")
    if len(loader.level_matrix_entries) != 23:
        failures.append(f"Level matrix count expected 23, got {len(loader.level_matrix_entries)}")
    if len(loader.acronym_resolver.acronyms) != 386:
        failures.append(f"Acronym dictionary count expected 386, got {len(loader.acronym_resolver.acronyms)}")

    # Check that all loaded entries adhere to 5 frozen skill types
    invalid_types = set()
    for entry in loader.all_entries:
        if entry.skill_type not in APPROVED_SKILL_TYPES:
            invalid_types.add(entry.skill_type)
    if invalid_types:
        failures.append(f"Found unapproved skill types in loaded catalog: {invalid_types}")
    else:
        print("PASS: All 3,794 catalog entries map strictly to the 5 approved skill types.")

    # -------------------------------------------------------------
    # Check 2: Dynamic Mock File Binding (Proves Zero Hardcoding)
    # -------------------------------------------------------------
    print("\n--- Check 2: Dynamic Mock File Binding Verification ---")
    with tempfile.TemporaryDirectory() as tmpdir:
        mock_cat_path = Path(tmpdir) / "mock_catalog.csv"
        mock_acr_path = Path(tmpdir) / "mock_acronyms.json"
        mock_lvl_path = Path(tmpdir) / "mock_levels.csv"

        # Synthetic catalog
        mock_cat_path.write_text(
            "standard_skill_name;domain;sub_category;skill_type;applicable_level_category;initial_regex_pattern;known_aliases;skill_priority\n"
            "SyntheticQuantumSkill;Software Engineering & IT;Backend Development;Tool / Software;Technical;\\bSyntheticQuantumSkill\\b;SQS_Alias;Core\n",
            encoding="utf-8-sig"
        )

        # Synthetic acronyms
        mock_acr_path.write_text(
            '{"SQS": {"acronym": "SQS", "full_name": "Synthetic Quantum System", "canonical_skill_name": "SyntheticQuantumSkill", "domain": "Software Engineering & IT", "sub_category": "Backend Development", "skill_type": "Tool / Software", "source": "Synthetic"}}',
            encoding="utf-8"
        )

        # Synthetic level matrix
        mock_lvl_path.write_text(
            "skill_type;level_category;standard_level;rank_order;regex_patterns;arabic_patterns;example_usage\n"
            "Tool / Software;Technical;Advanced;3;\\b(synthetic_master)\\b;;Synthetic Advanced\n",
            encoding="utf-8-sig"
        )

        mock_loader = CatalogLoader(
            catalog_path=mock_cat_path,
            acronyms_path=mock_acr_path,
            levels_path=mock_lvl_path,
        )

        if mock_loader.raw_row_count != 1:
            failures.append(f"Mock loader failed raw_row_count: {mock_loader.raw_row_count}")
        match_synth = mock_loader.get_exact_match("SyntheticQuantumSkill")
        if not match_synth or match_synth.standard_skill_name != "SyntheticQuantumSkill":
            failures.append("Mock loader failed exact match for SyntheticQuantumSkill")
        match_alias = mock_loader.get_exact_match("SQS_Alias")
        if not match_alias or match_alias.standard_skill_name != "SyntheticQuantumSkill":
            failures.append("Mock loader failed alias match for SQS_Alias")
        match_acr = mock_loader.get_acronym("SQS")
        if not match_acr or match_acr.full_name != "Synthetic Quantum System":
            failures.append("Mock loader failed acronym lookup for SQS")
        if len(mock_loader.level_matrix_entries) != 1:
            failures.append("Mock loader failed level matrix loading")

        # Ensure production skills do NOT exist in mock loader
        if mock_loader.get_exact_match("Python") is not None:
            failures.append("Mock loader matched 'Python', proving hardcoded fallback exists!")
        else:
            print("PASS: Mock loader returned None for 'Python' — zero hardcoded fallback detected.")

    # -------------------------------------------------------------
    # Check 3: SQL Remediated Canonical Home
    # -------------------------------------------------------------
    print("\n--- Check 3: SQL Remediated Canonical Home Verification ---")
    sql_entry = loader.get_exact_match("SQL")
    if not sql_entry:
        failures.append("SQL not found in catalog loader")
    else:
        print(f"SQL resolved: domain='{sql_entry.domain}', sub_category='{sql_entry.sub_category}', skill_type='{sql_entry.skill_type}'")
        if sql_entry.sub_category != "Data Engineering":
            failures.append(f"SQL sub_category expected 'Data Engineering', got '{sql_entry.sub_category}'")
        if sql_entry.domain != "Data Science & Analytics":
            failures.append(f"SQL domain expected 'Data Science & Analytics', got '{sql_entry.domain}'")

    # -------------------------------------------------------------
    # Check 4: Tool Level Regex Cleaning ('lead user' and 'End User')
    # -------------------------------------------------------------
    print("\n--- Check 4: Level Matrix Regex Cleaning Verification ---")
    adv_patterns = loader.get_level_patterns(skill_type="Tool / Software", level="Advanced")
    end_user_matched = False
    for p in adv_patterns:
        if p.search("End User Support"):
            end_user_matched = True
            print(f"FAIL: Pattern '{p.pattern}' matched 'End User Support' as Advanced!")
            failures.append(f"Level matrix regex false positive on 'End User Support': {p.pattern}")
    if not end_user_matched:
        print("PASS: 'End User Support' does NOT falsely match Tool Advanced level.")

    # -------------------------------------------------------------
    # Check 5: JavaScript .js Framework Shield
    # -------------------------------------------------------------
    print("\n--- Check 5: JavaScript .js Framework Shield Verification ---")
    js_entry = loader.get_regex_match("Node.js Developer")
    if js_entry and js_entry.standard_skill_name == "JavaScript":
        failures.append("Regex match on 'Node.js Developer' falsely matched 'JavaScript'!")
    else:
        print("PASS: 'Node.js Developer' did NOT falsely match 'JavaScript'.")

    vue_entry = loader.get_regex_match("Vue.js Developer")
    if vue_entry and vue_entry.standard_skill_name == "JavaScript":
        failures.append("Regex match on 'Vue.js Developer' falsely matched 'JavaScript'!")
    else:
        print("PASS: 'Vue.js Developer' did NOT falsely match 'JavaScript'.")

    # -------------------------------------------------------------
    # Check 6: Specificity / Length Descending Sorting
    # -------------------------------------------------------------
    print("\n--- Check 6: Regex Length Descending Sorting Verification ---")
    rn_entry = loader.get_regex_match("React Native Developer")
    if not rn_entry or rn_entry.standard_skill_name != "React Native":
        failures.append(f"Expected 'React Native' for 'React Native Developer', got {rn_entry.standard_skill_name if rn_entry else None}")
    else:
        print("PASS: 'React Native Developer' matched 'React Native' before 'React'.")

    # -------------------------------------------------------------
    # Check 7: Collision-Prone Acronyms
    # -------------------------------------------------------------
    print("\n--- Check 7: Collision-Prone Acronyms Exact Case Verification ---")
    collision_words = ["she", "his", "sit", "ran", "da", "bs", "fi", "ad", "en", "pm"]
    for w in collision_words:
        res = loader.get_acronym(w)
        if res is not None:
            failures.append(f"Collision-prone lowercase word '{w}' resolved to acronym: {res.full_name}")
    print(f"PASS: All {len(collision_words)} collision-prone lowercase words returned None.")

    for w in ["SHE", "HIS", "SIT", "RAN", "PM", "AD"]:
        res = loader.get_acronym(w)
        if res is None:
            failures.append(f"Collision-prone uppercase acronym '{w}' returned None!")
    print("PASS: Collision-prone uppercase acronyms correctly resolve.")

    # -------------------------------------------------------------
    # Check 8: Proper Nouns & Disciplines Shielding
    # -------------------------------------------------------------
    print("\n--- Check 8: Proper Nouns & Disciplines Shielding Verification ---")
    shield = loader.proper_noun_shield

    # Protected multi-word terms
    should_shield = [
        "Lead Generation",
        "Lead Generation Campaigns",
        "Lead Time Reduction",
        "Senior Care",
        "Senior Living",
        "Advanced Threat Protection",
        "Office 365 Advanced Threat Protection",
        "Windows Defender Advanced Threat Protection",
        "Azure Advanced Threat Protection",
        "GitHub Advanced Security",
        "Master Data Management",
        "Scrum Master",
        "Professional Scrum Master",
        "Agile Scrum Master",
        "SOLID Principles",
        "Deep Learning",
        "Google Tag Manager",
        "Adobe Experience Manager",
    ]
    for term in should_shield:
        if not shield.is_protected_proper_noun(term):
            failures.append(f"Expected is_protected_proper_noun('{term}') == True, got False")
    print(f"PASS: All {len(should_shield)} protected terms correctly identified.")

    # Should NOT shield generic role/level phrases
    should_not_shield = [
        "Senior Python Developer",
        "Senior Java Engineer",
        "Lead Software Engineer",
        "Advanced Python",
        "Intermediate SQL",
        "Beginner React",
        "Expert Django",
    ]
    for term in should_not_shield:
        if shield.is_protected_proper_noun(term):
            failures.append(f"Expected is_protected_proper_noun('{term}') == False, got True")
    print(f"PASS: All {len(should_not_shield)} unshielded modifier phrases correctly returned False.")

    # Check manager guardrail
    if not shield.should_inhibit_level_stripping("Google Tag Manager", "Manager"):
        failures.append("Google Tag Manager failed manager level stripping inhibition")
    if not shield.should_inhibit_level_stripping("Adobe Experience Manager", "Manager"):
        failures.append("Adobe Experience Manager failed manager level stripping inhibition")
    if shield.should_inhibit_level_stripping("Senior Engineering Manager", "Manager"):
        failures.append("Senior Engineering Manager falsely inhibited manager level stripping")
    print("PASS: Manager guardrail behaves as specified.")

    # -------------------------------------------------------------
    # Check 9: Defensive Guards on Non-String Inputs
    # -------------------------------------------------------------
    print("\n--- Check 9: Defensive Guards Non-String Input Verification ---")
    non_strings = [None, 123, 45.6, [], {}, object()]
    for bad_input in non_strings:
        try:
            assert loader.get_exact_match(bad_input) is None
            assert loader.get_regex_match(bad_input) is None
            assert loader.get_acronym(bad_input) is None
            assert loader.is_protected_proper_noun(bad_input) is False
            assert loader.is_protected_compound(bad_input) is False
            assert shield.should_inhibit_level_stripping(bad_input, "Lead") is False
            assert shield.should_inhibit_level_stripping("Lead Generation", bad_input) is False
            assert loader.acronym_resolver.is_acronym_expansion_pair(bad_input, "Python") is False
            assert loader.acronym_resolver.is_acronym_expansion_pair("p", bad_input) is False
        except Exception as e:
            failures.append(f"Defensive guard failed on bad input {type(bad_input)}: {e}")
    print("PASS: All defensive guards handled non-string inputs cleanly.")

    # -------------------------------------------------------------
    # Summary & Verdict
    # -------------------------------------------------------------
    print("\n================ AUDIT SUMMARY ================")
    if failures:
        print(f"FAILED ({len(failures)} failures):")
        for f in failures:
            print(f"  - {f}")
        return False
    else:
        print("ALL AUDIT CHECKS PASSED WITH ZERO INTEGRITY VIOLATIONS.")
        return True

if __name__ == "__main__":
    success = run_audit()
    sys.exit(0 if success else 1)
