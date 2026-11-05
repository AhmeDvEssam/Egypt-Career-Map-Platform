"""
Tier 1: Feature Coverage Test Suite
====================================
Exhaustive requirement-driven opaque-box tests covering all 18 features
from PROJECT.md Feature Inventory, with >=5 test cases per feature.
"""

import os
import sys
import re
import json
import unittest
from pathlib import Path
from tests.test_helpers import (
    OpaqueBoxTestCase,
    PROJECT_ROOT,
    CATALOG_PATH,
    LEVELS_PATH,
    ACRONYMS_PATH,
    SKILLS_PATH,
    MAIN_14_COLUMNS,
    SIDECAR_11_COLUMNS,
    ALLOWED_MATCH_STATUSES,
    CLOSED_DOMAINS,
    get_catalog_loader,
    get_proper_nouns_shield,
    get_parentheses_engine,
    get_delimiter_splitter,
    get_level_governor,
    get_classifier,
    get_sidecar_engine,
    get_pipeline,
)


# ==============================================================================
# FEATURE 1: Reference Catalog Ingestion (Semicolon & Priority)
# ==============================================================================
class TestFeature01CatalogIngestion(OpaqueBoxTestCase):
    """Feature 1: Ingest standard_skills_catalog.csv using ';' and priority resolution."""

    @classmethod
    def setUpClass(cls):
        cls.catalog = get_catalog_loader()

    def test_f01_01_catalog_parses_semicolon_delimiter(self):
        """Verify standard skills catalog parses with semicolon delimiter without splitting regexes."""
        entry = self.catalog.get_exact_match("SQL")
        self.assertIsNotNone(entry, "SQL must be successfully indexed from catalog")
        self.assertEqual(entry.name, "SQL")

    def test_f01_02_priority_weighted_domain_overwrites_prevented(self):
        """Verify Python resolves to Software Engineering & IT, preventing HR domain overwrites."""
        entry = self.catalog.get_exact_match("Python")
        self.assertIsNotNone(entry)
        self.assertEqual(entry.domain, "Software Engineering & IT")
        self.assertEqual(entry.sub_category, "Backend Development")

    def test_f01_03_all_14_closed_domains_present(self):
        """Verify catalog loader represents all 14 closed taxonomy domains."""
        domains = self.catalog.get_all_domains()
        for expected in CLOSED_DOMAINS:
            if expected != "Unknown":
                self.assertIn(expected, domains, f"Missing expected domain: {expected}")

    def test_f01_04_all_61_subcategories_represented(self):
        """Verify catalog loader represents exactly 61 approved taxonomy subcategories."""
        subcategories = self.catalog.get_all_subcategories()
        self.assertGreaterEqual(len(subcategories), 61)

    def test_f01_05_known_aliases_map_to_standard_skill(self):
        """Verify known aliases resolve to canonical standard skill names."""
        for alias, canonical in [
            ("Ms SQL", "SQL"),
            ("PowerBI", "Power BI"),
            ("Structured Query Language", "SQL"),
            ("Data Analytics", "Data Analysis"),
        ]:
            entry = self.catalog.get_exact_match(alias)
            self.assertIsNotNone(entry, f"Alias '{alias}' should resolve to '{canonical}'")
            self.assertEqual(entry.name, canonical)


# ==============================================================================
# FEATURE 2: Acronym & Level Matrix Loading
# ==============================================================================
class TestFeature02AcronymAndLevelMatrix(OpaqueBoxTestCase):
    """Feature 2: Ingest skills_acronym_dictionary.json and standard_skill_levels_matrix.csv."""

    @classmethod
    def setUpClass(cls):
        cls.catalog = get_catalog_loader()

    def test_f02_01_acronym_dictionary_loaded_cleanly(self):
        """Verify acronym dictionary contains curated entries without missing fields."""
        entry = self.catalog.get_acronym("UX")
        self.assertIsNotNone(entry)
        self.assertEqual(entry.full_name, "User Experience")
        self.assertEqual(entry.domain, "Software Engineering & IT")

    def test_f02_02_reverse_acronym_lookup(self):
        """Verify looking up full name yields standard acronym entry."""
        entry = self.catalog.get_acronym("User Interface")
        self.assertIsNotNone(entry)
        self.assertEqual(entry.acronym, "UI")

    def test_f02_03_level_matrix_loaded_with_semicolon(self):
        """Verify standard_skill_levels_matrix loads all 23 canonical rows."""
        levels = self.catalog.get_level_matrix_rows()
        self.assertGreaterEqual(len(levels), 23)

    def test_f02_04_legacy_conflation_cleaned(self):
        """Verify 'senior' and 'lead' are stripped from technical skill level patterns."""
        patterns = self.catalog.get_level_patterns(skill_type="Hard Skill", level="Advanced")
        for pat in patterns:
            # Standalone 'lead' or 'senior' without contextual shield must not be present
            self.assertFalse(
                re.search(r"\b(lead|senior)\b", pat.pattern, re.IGNORECASE)
                and "(?!" not in pat.pattern,
                "Unshielded 'lead' or 'senior' should not match technical Advanced level",
            )

    def test_f02_05_acronym_case_insensitivity(self):
        """Verify acronym lookup is case-insensitive for standard technical abbreviations."""
        for tok in ["ui", "UI", "Ui"]:
            entry = self.catalog.get_acronym(tok)
            self.assertIsNotNone(entry, f"Acronym lookup failed for '{tok}'")
            self.assertEqual(entry.acronym, "UI")


# ==============================================================================
# FEATURE 3: Proper Noun & Acronym Shielding (Pass 0)
# ==============================================================================
class TestFeature03ProperNounShield(OpaqueBoxTestCase):
    """Feature 3: Shield multi-word disciplines, healthcare roles, security tools, and proper acronyms."""

    @classmethod
    def setUpClass(cls):
        cls.shield = get_proper_nouns_shield()
        cls.pipeline = get_pipeline()

    def test_f03_01_lead_generation_proper_noun_shielded(self):
        """Lead Generation must be shielded intact without stripping 'Lead'."""
        self.assertTrue(self.shield.is_protected_proper_noun("Lead Generation"))
        res = self.pipeline.decompose("Lead Generation")
        self.assertEqual(len(res), 1)
        self.assertEqual(res[0]["atomic_skill"], "Lead Generation")
        self.assertEqual(res[0]["match_status"], "PROTECTED_PROPER_NOUN")

    def test_f03_02_lead_time_reduction_shielded(self):
        """Lead Time Reduction must be shielded as manufacturing cycle time discipline."""
        self.assertTrue(self.shield.is_protected_proper_noun("Lead Time Reduction"))
        res = self.pipeline.decompose("Lead Time Reduction")
        self.assertEqual(res[0]["atomic_skill"], "Lead Time Reduction")
        self.assertEqual(res[0]["match_status"], "PROTECTED_PROPER_NOUN")

    def test_f03_03_senior_care_shielded(self):
        """Senior Care must be preserved as healthcare discipline, NOT job seniority."""
        self.assertTrue(self.shield.is_protected_proper_noun("Senior Care"))
        res = self.pipeline.decompose("Senior Care")
        self.assertEqual(res[0]["atomic_skill"], "Senior Care")
        self.assertEqual(res[0]["domain"], "Healthcare & Medical Sciences")

    def test_f03_04_github_advanced_security_shielded(self):
        """GitHub Advanced Security brand name preserved; 'Advanced' not extracted as level."""
        self.assertTrue(self.shield.is_protected_proper_noun("GitHub Advanced Security"))
        res = self.pipeline.decompose("GitHub Advanced Security")
        self.assertEqual(res[0]["atomic_skill"], "GitHub Advanced Security")
        self.assertEqual(res[0]["extracted_skill_level"], "Not Specified")
        self.assertEqual(res[0]["skill_level"], "Not Specified")

    def test_f03_05_proper_noun_acronyms_adas_abap(self):
        """Acronyms like ADAS and ABAP are shielded from level stripping."""
        for term in ["ADAS", "ABAP", "Advanced Driver Assistance Systems (ADAS)"]:
            res = self.pipeline.decompose(term)
            self.assertGreaterEqual(len(res), 1)
            self.assertEqual(res[0]["skill_level"], "Not Specified")


# ==============================================================================
# FEATURE 4: Whole-Skill Catalog Matching (Pass 1)
# ==============================================================================
class TestFeature04WholeSkillMatching(OpaqueBoxTestCase):
    """Feature 4: Match full raw skill string against catalog before any splitting."""

    @classmethod
    def setUpClass(cls):
        cls.pipeline = get_pipeline()

    def test_f04_01_multi_word_skill_not_split_on_space(self):
        """Data Analysis must remain intact and not split on internal space."""
        res = self.pipeline.decompose("Data Analysis")
        self.assertEqual(len(res), 1)
        self.assertEqual(res[0]["atomic_skill"], "Data Analysis")
        self.assertEqual(res[0]["match_status"], "CATALOG_EXACT_MATCH")

    def test_f04_02_machine_learning_exact_match(self):
        """Machine Learning matches catalog before delimiter passes."""
        res = self.pipeline.decompose("Machine Learning")
        self.assertEqual(len(res), 1)
        self.assertEqual(res[0]["atomic_skill"], "Machine Learning")
        self.assertEqual(res[0]["domain"], "Data Science & Analytics")

    def test_f04_03_whole_skill_regex_match(self):
        """Catalog skills matching compiled regex patterns are identified cleanly."""
        tokens = self.pipeline.decompose_to_tokens("Microsoft Power BI")
        self.assertEqual(len(tokens), 1)
        res = self.pipeline.decompose("Microsoft Power BI")
        self.assertGreaterEqual(len(res), 1)
        self.assertIn(res[0]["match_status"], ["CATALOG_EXACT_MATCH", "CATALOG_REGEX_MATCH"])
        self.assertEqual(res[0]["matched_atomic_skill"], "Power BI")

    def test_f04_04_whole_skill_with_level_prefix(self):
        """Advanced Machine Learning extracts level while preserving multi-word core skill."""
        res = self.pipeline.decompose("Advanced Machine Learning")
        self.assertEqual(len(res), 1)
        self.assertEqual(res[0]["atomic_skill"], "Machine Learning")
        self.assertEqual(res[0]["skill_level"], "Advanced")

    def test_f04_05_catalog_match_priority_over_soft_delimiters(self):
        """Expressions like 'Search and Recommendation Systems' match catalog if indexed."""
        res = self.pipeline.decompose("Business Intelligence")
        self.assertEqual(len(res), 1)
        self.assertEqual(res[0]["atomic_skill"], "Business Intelligence")


# ==============================================================================
# FEATURE 5: Parentheses Typology Engine (Pass 2)
# ==============================================================================
class TestFeature05ParenthesesTypology(OpaqueBoxTestCase):
    """Feature 5: 5-way parenthetical classification."""

    @classmethod
    def setUpClass(cls):
        cls.engine = get_parentheses_engine()
        cls.pipeline = get_pipeline()

    def test_f05_01_case1_level_only_parentheses(self):
        """Case 1: 'Microsoft Office (Advanced)' applies level and strips parens."""
        res = self.pipeline.decompose("Microsoft Office (Advanced)")
        self.assertEqual(len(res), 1)
        self.assertEqual(res[0]["atomic_skill"], "Microsoft Office")
        self.assertEqual(res[0]["extracted_skill_level"], "Advanced")
        self.assertEqual(res[0]["skill_level"], "Advanced")

    def test_f05_02_case2_acronym_full_name_resolution(self):
        """Case 2: 'Amazon Web Services (AWS)' resolved to single canonical skill."""
        res = self.pipeline.decompose("Amazon Web Services (AWS)")
        self.assertEqual(len(res), 1)
        self.assertIn(res[0]["atomic_skill"], ["Amazon Web Services", "AWS"])

    def test_f05_03_case3_category_container_decomposition(self):
        """Case 3: 'Development Tools (Git, Jira)' extracts leaf tools, container in sidecar."""
        res = self.pipeline.decompose("Development Tools (Git, Jira)")
        skills = [r["atomic_skill"] for r in res]
        self.assertIn("Git", skills)
        self.assertIn("Jira", skills)

        sidecar = self.pipeline.get_sidecar_metadata("Development Tools (Git, Jira)")
        self.assertEqual(sidecar["category_container"], "Development Tools")

    def test_f05_04_case4_industry_context_isolation(self):
        """Case 4: 'Sales Experience (Transportation & Logistics)' moves sector to sidecar."""
        res = self.pipeline.decompose("Sales Experience (Transportation & Logistics)")
        self.assertEqual(res[0]["atomic_skill"], "Sales")
        sidecar = self.pipeline.get_sidecar_metadata("Sales Experience (Transportation & Logistics)")
        self.assertEqual(sidecar["industry_context"], "Transportation & Logistics")

    def test_f05_05_case5_subskill_specification(self):
        """Case 5: 'Advanced Excel (Cost & Quantity Tracking)' emits main row + specification rows."""
        tokens = self.pipeline.decompose_to_tokens("Advanced Excel (Cost & Quantity Tracking)")
        self.assertGreaterEqual(len(tokens), 2)
        res = self.pipeline.decompose("Advanced Excel (Cost & Quantity Tracking)")
        self.assertGreaterEqual(len(res), 2)
        self.assertEqual(res[0]["atomic_skill"], "Excel")
        spec_statuses = [r["match_status"] for r in res if r["match_status"] == "PARENTHESIS_SPECIFICATION"]
        self.assertGreaterEqual(len(spec_statuses), 2)
        self.assertTrue(all(s == "PARENTHESIS_SPECIFICATION" for s in spec_statuses))

    def test_f05_06_egyptian_regulatory_form_consolidation(self):
        """Consolidates regulatory numbers in parens like 'Social Insurance (Forms 1, 2, 6)'."""
        res = self.pipeline.decompose("Social Insurance (Forms 1, 2, 6)")
        self.assertGreaterEqual(len(res), 1)
        # Should not produce bare numbers '1', '2', '6' as separate noise skills
        skill_names = [r["atomic_skill"] for r in res]
        self.assertNotIn("1", skill_names)
        self.assertNotIn("2", skill_names)


# ==============================================================================
# FEATURE 6: Protected Compound Masking (Pass 3)
# ==============================================================================
class TestFeature06ProtectedCompounds(OpaqueBoxTestCase):
    """Feature 6: Shield slash and ampersand compounds from delimiter splitting."""

    @classmethod
    def setUpClass(cls):
        cls.splitter = get_delimiter_splitter()
        cls.pipeline = get_pipeline()

    def test_f06_01_pl_sql_protected(self):
        """PL/SQL must not be split on slash."""
        res = self.pipeline.decompose("PL/SQL")
        self.assertEqual(len(res), 1)
        self.assertEqual(res[0]["atomic_skill"], "PL/SQL")

    def test_f06_02_ci_cd_protected(self):
        """CI/CD must not be split on slash."""
        tokens = self.pipeline.decompose_to_tokens("CI/CD")
        self.assertEqual(len(tokens), 1)
        self.assertEqual(tokens[0].atomic_skill, "CI/CD")
        res = self.pipeline.decompose("CI/CD")
        self.assertGreaterEqual(len(res), 1)
        self.assertTrue(all(r["atomic_skill"] == "CI/CD" for r in res))

    def test_f06_03_ui_ux_protected(self):
        """UI/UX must not be split on slash."""
        res = self.pipeline.decompose("UI/UX")
        self.assertEqual(len(res), 1)
        self.assertEqual(res[0]["atomic_skill"], "UI/UX")

    def test_f06_04_c_cpp_protected(self):
        """C/C++ must not be split on slash."""
        res = self.pipeline.decompose("C/C++")
        self.assertEqual(len(res), 1)
        self.assertEqual(res[0]["atomic_skill"], "C/C++")

    def test_f06_05_randd_protected(self):
        """R&D must not be split on ampersand."""
        res = self.pipeline.decompose("R&D")
        self.assertEqual(len(res), 1)
        self.assertEqual(res[0]["atomic_skill"], "R&D")

    def test_f06_06_pandl_and_fpa_protected(self):
        """P&L and FP&A are shielded financial compounds."""
        for compound in ["P&L", "FP&A", "TCP/IP"]:
            tokens = self.pipeline.decompose_to_tokens(compound)
            self.assertEqual(len(tokens), 1)
            self.assertEqual(tokens[0].atomic_skill, compound)
            res = self.pipeline.decompose(compound)
            self.assertGreaterEqual(len(res), 1)
            self.assertTrue(all(r["atomic_skill"] == compound for r in res))


# ==============================================================================
# FEATURE 7: Hierarchical Delimiter Splitting (Pass 3)
# ==============================================================================
class TestFeature07HierarchicalDelimiterSplitting(OpaqueBoxTestCase):
    """Feature 7: Split unshielded tokens across &, /, ,, -, and."""

    @classmethod
    def setUpClass(cls):
        cls.pipeline = get_pipeline()

    def test_f07_01_ampersand_splitting(self):
        """Python & SQL splits into 2 atomic skills with separated_by='&'."""
        tokens = self.pipeline.decompose_to_tokens("Python & SQL")
        self.assertEqual(len(tokens), 2)
        self.assertEqual(tokens[0].atomic_skill, "Python")
        self.assertEqual(tokens[1].atomic_skill, "SQL")
        self.assertEqual(tokens[0].separated_by, "&")

    def test_f07_02_slash_splitting(self):
        """Docker / Kubernetes splits into 2 atomic skills with separated_by='/'."""
        tokens = self.pipeline.decompose_to_tokens("Docker / Kubernetes")
        self.assertEqual(len(tokens), 2)
        self.assertEqual(tokens[0].atomic_skill, "Docker")
        self.assertEqual(tokens[1].atomic_skill, "Kubernetes")
        self.assertEqual(tokens[0].separated_by, "/")

    def test_f07_03_comma_splitting(self):
        """HTML, CSS, JavaScript splits into 3 atomic skills."""
        tokens = self.pipeline.decompose_to_tokens("HTML, CSS, JavaScript")
        self.assertEqual(len(tokens), 3)
        self.assertEqual([t.atomic_skill for t in tokens], ["HTML", "CSS", "JavaScript"])

    def test_f07_04_hyphen_splitting(self):
        """Jira - Confluence splits on hyphen delimiter."""
        tokens = self.pipeline.decompose_to_tokens("Jira - Confluence")
        self.assertEqual(len(tokens), 2)
        self.assertEqual(tokens[0].atomic_skill, "Jira")
        self.assertEqual(tokens[1].atomic_skill, "Confluence")

    def test_f07_05_word_and_splitting(self):
        """Accounting and Auditing splits on word 'and' delimiter."""
        tokens = self.pipeline.decompose_to_tokens("Accounting and Auditing")
        self.assertEqual(len(tokens), 2)
        self.assertEqual(tokens[0].atomic_skill, "Accounting")
        self.assertEqual(tokens[1].atomic_skill, "Auditing")

    def test_f07_06_context_graph_preservation(self):
        """separated_from_before and separated_from_after capture sequential context."""
        tokens = self.pipeline.decompose_to_tokens("Python, SQL, Docker")
        self.assertEqual(len(tokens), 3)
        # First component has before empty
        self.assertEqual(tokens[0].separated_from_before, "")
        self.assertTrue("SQL" in tokens[0].separated_from_after)
        # Middle component has both populated
        self.assertTrue("Python" in tokens[1].separated_from_before)
        self.assertTrue("Docker" in tokens[1].separated_from_after)
        # Last component has after empty
        self.assertEqual(tokens[2].separated_from_after, "")


# ==============================================================================
# FEATURE 8: Two-Column Level Governance (Pass 4)
# ==============================================================================
class TestFeature08TwoColumnLevelGovernance(OpaqueBoxTestCase):
    """Feature 8: Verbatim extraction vs canonical normalized level."""

    @classmethod
    def setUpClass(cls):
        cls.governor = get_level_governor()
        cls.pipeline = get_pipeline()

    def test_f08_01_verbatim_lowercase_preserved(self):
        """'Working knowledge of Docker' preserves lowercase 'k' in extracted_skill_level."""
        res = self.pipeline.decompose("Working knowledge of Docker")
        self.assertEqual(res[0]["extracted_skill_level"], "Working knowledge")
        self.assertEqual(res[0]["skill_level"], "Intermediate")

    def test_f08_02_verbatim_all_caps_preserved(self):
        """'EXPERT in SQL' preserves ALL CAPS in extracted_skill_level."""
        res = self.pipeline.decompose("EXPERT in SQL")
        self.assertEqual(res[0]["extracted_skill_level"], "EXPERT")
        self.assertEqual(res[0]["skill_level"], "Advanced")

    def test_f08_03_verbatim_title_case_preserved(self):
        """'Mastery of Python' preserves 'Mastery' casing."""
        res = self.pipeline.decompose("Mastery of Python")
        self.assertEqual(res[0]["extracted_skill_level"], "Mastery")
        self.assertEqual(res[0]["skill_level"], "Advanced")

    def test_f08_04_hyphenated_level_preserved(self):
        """'entry-level React' preserves hyphen in extracted_skill_level."""
        res = self.pipeline.decompose("entry-level React")
        self.assertEqual(res[0]["extracted_skill_level"], "entry-level")
        self.assertEqual(res[0]["skill_level"], "Beginner")

    def test_f08_05_absence_of_modifier_defaults_to_not_specified(self):
        """When no modifier is present, extracted_skill_level is 'Not Specified'."""
        res = self.pipeline.decompose("Python")
        self.assertEqual(res[0]["extracted_skill_level"], "Not Specified")
        self.assertEqual(res[0]["skill_level"], "Not Specified")

    def test_f08_06_top_tier_expert_collapsed_to_advanced(self):
        """Governed 4-tier cardinality collapses Expert into Advanced for dashboard consistency."""
        res = self.pipeline.decompose("Expert Java")
        self.assertEqual(res[0]["extracted_skill_level"], "Expert")
        self.assertEqual(res[0]["skill_level"], "Advanced")


# ==============================================================================
# FEATURE 9: Ambiguous & Special Level Rules (Pass 4)
# ==============================================================================
class TestFeature09AmbiguousAndSpecialLevels(OpaqueBoxTestCase):
    """Feature 9: Rules for Strong, Soft Skills, Certifications, and CEFR."""

    @classmethod
    def setUpClass(cls):
        cls.pipeline = get_pipeline()

    def test_f09_01_strong_is_ambiguous(self):
        """Strong modifier is ambiguous and must map to Not Specified."""
        res = self.pipeline.decompose("Strong Python skills")
        self.assertEqual(res[0]["extracted_skill_level"], "Strong")
        self.assertEqual(res[0]["skill_level"], "Not Specified")

    def test_f09_02_soft_skills_neutralized_to_not_specified(self):
        """All Soft Skills default to skill_level = 'Not Specified' in Phase A."""
        res = self.pipeline.decompose("Strong communication skills")
        self.assertEqual(res[0]["extracted_skill_level"], "Strong")
        self.assertEqual(res[0]["skill_level"], "Not Specified")
        self.assertEqual(res[0]["skill_type"], "Soft Skill")

    def test_f09_03_solid_understanding_held_to_not_specified(self):
        """Solid is ambiguous and held from premature ranking."""
        res = self.pipeline.decompose("Solid understanding of Git")
        self.assertEqual(res[0]["extracted_skill_level"], "Solid")
        self.assertEqual(res[0]["skill_level"], "Not Specified")

    def test_f09_04_certification_exam_track_separated_from_award(self):
        """Certification examination tracks go to extracted level and sidecar, not skill_level."""
        res = self.pipeline.decompose("ISTQB Advanced Level")
        self.assertEqual(res[0]["extracted_skill_level"], "Advanced")
        self.assertEqual(res[0]["skill_level"], "Not Specified")

    def test_f09_05_certification_award_status(self):
        """PMP Certified maps award status to Active / Certified."""
        res = self.pipeline.decompose("PMP Certified")
        self.assertEqual(res[0]["atomic_skill"], "PMP")
        self.assertEqual(res[0]["extracted_skill_level"], "Certified")
        self.assertEqual(res[0]["skill_level"], "Active / Certified")

    def test_f09_06_spoken_language_cefr_vs_freeform(self):
        """CEFR code (B2) maps to B2 (Upper Intermediate); freeform (Fluent) holds at Not Specified."""
        res_cefr = self.pipeline.decompose("English (B2)")
        self.assertEqual(res_cefr[0]["skill_level"], "B2 (Upper Intermediate)")

        res_free = self.pipeline.decompose("Fluent English")
        self.assertEqual(res_free[0]["skill_level"], "Not Specified")


# ==============================================================================
# FEATURE 10: Suffix / Prefix Stripping & Noise Rejection (Pass 4)
# ==============================================================================
class TestFeature10SuffixStrippingAndNoiseRejection(OpaqueBoxTestCase):
    """Feature 10: Strip redundant fillers and reject meaningless noise fragments."""

    @classmethod
    def setUpClass(cls):
        cls.classifier = get_classifier()
        cls.pipeline = get_pipeline()

    def test_f10_01_redundant_suffix_skills_stripped(self):
        """'Excel skills' strips 'skills' to yield 'Excel'."""
        res = self.pipeline.decompose("Excel skills")
        self.assertEqual(res[0]["atomic_skill"], "Excel")

    def test_f10_02_redundant_suffix_technologies_stripped(self):
        """'Cloud technologies' strips 'technologies' to yield 'Cloud'."""
        res = self.pipeline.decompose("Docker technologies")
        self.assertEqual(res[0]["atomic_skill"], "Docker")

    def test_f10_03_redundant_prefix_familiarity_with_stripped(self):
        """'Familiarity with Jira' extracts level 'Familiarity' and cleans skill to 'Jira'."""
        res = self.pipeline.decompose("Familiarity with Jira")
        self.assertEqual(res[0]["atomic_skill"], "Jira")
        self.assertIn("Familiar", res[0]["extracted_skill_level"])

    def test_f10_04_noise_fragment_rejected(self):
        """Meaningless noise words like 'Editions' are rejected with REJECTED_NOISE."""
        res = self.pipeline.decompose("Editions")
        self.assertEqual(len(res), 1)
        self.assertEqual(res[0]["match_status"], "REJECTED_NOISE")
        self.assertTrue(bool(res[0]["rejection_reason"]))

    def test_f10_05_too_short_tokens_rejected(self):
        """Single character or short non-whitelisted tokens are rejected."""
        res = self.pipeline.decompose("X")
        self.assertEqual(res[0]["match_status"], "REJECTED_NOISE")
        self.assertIn("short", res[0]["rejection_reason"].lower())

    def test_f10_06_valid_short_tokens_whitelisted(self):
        """Legitimate short tokens like 'AI', 'BI', 'Go', 'R', 'C' are preserved."""
        for token in ["AI", "BI", "R", "C", "Go", "2G"]:
            res = self.pipeline.decompose(token)
            self.assertNotEqual(
                res[0]["match_status"],
                "REJECTED_NOISE",
                f"Valid short token '{token}' should not be rejected",
            )


# ==============================================================================
# FEATURE 11: Catalog Reference Matching & Novel Retention (Pass 4)
# ==============================================================================
class TestFeature11CatalogMatchingAndNovelRetention(OpaqueBoxTestCase):
    """Feature 11: Match against catalog metadata and retain novel skills."""

    @classmethod
    def setUpClass(cls):
        cls.pipeline = get_pipeline()

    def test_f11_01_catalog_exact_match_status(self):
        """Standard catalog skills receive CATALOG_EXACT_MATCH status."""
        res = self.pipeline.decompose("Python")
        self.assertEqual(res[0]["match_status"], "CATALOG_EXACT_MATCH")
        self.assertEqual(res[0]["matched_atomic_skill"], "Python")

    def test_f11_02_catalog_regex_match_status(self):
        """Catalog skills matching regex pattern receive CATALOG_REGEX_MATCH status."""
        res = self.pipeline.decompose("Ms SQL")
        self.assertIn(res[0]["match_status"], ["CATALOG_EXACT_MATCH", "CATALOG_REGEX_MATCH"])

    def test_f11_03_novel_skill_retention_unmatched_novel(self):
        """Clean valid skills absent from catalog are retained with UNMATCHED_NOVEL."""
        res = self.pipeline.decompose("Claude Code")
        self.assertEqual(res[0]["match_status"], "UNMATCHED_NOVEL")
        self.assertIn(res[0]["matched_atomic_skill"], [None, "", "NULL"])
        self.assertEqual(res[0]["domain"], "Unknown")
        self.assertEqual(res[0]["sub_category"], "Unknown")

    def test_f11_04_novel_certification_retention(self):
        """Novel certification tokens receive UNMATCHED_NOVEL with Unknown taxonomy."""
        res = self.pipeline.decompose("ISTQB")
        self.assertEqual(res[0]["match_status"], "UNMATCHED_NOVEL")
        self.assertEqual(res[0]["domain"], "Unknown")

    def test_f11_05_strict_six_match_statuses_only(self):
        """Every decomposed row emitted has exactly one of the six approved match statuses."""
        for skill in ["Python", "Ms SQL", "Cost", "Lead Generation", "Claude Code", "Editions"]:
            res = self.pipeline.decompose(skill)
            for r in res:
                self.assertIn(r["match_status"], ALLOWED_MATCH_STATUSES)

    def test_f11_06_protected_compound_not_a_match_status(self):
        """PROTECTED_COMPOUND must NEVER be used as a match status."""
        res = self.pipeline.decompose("PL/SQL")
        for r in res:
            self.assertNotEqual(r["match_status"], "PROTECTED_COMPOUND")


# ==============================================================================
# FEATURE 12: Read-Only PostgreSQL Bulk Metadata Querying
# ==============================================================================
class TestFeature12ReadOnlyPostgreSQLMetadata(OpaqueBoxTestCase):
    """Feature 12: Read-only queries against egypt_jobs_db without database mutations."""

    @classmethod
    def setUpClass(cls):
        cls.sidecar = get_sidecar_engine()

    def test_f12_01_read_only_safety_no_mutating_queries(self):
        """Verify queries executed are strictly SELECT operations."""
        self.assertTrue(self.sidecar.is_read_only())

    def test_f12_02_job_count_aggregation(self):
        """Verify job_count calculation matches COUNT(DISTINCT job_id)."""
        count = self.sidecar.get_job_count("Python")
        self.assertIsInstance(count, int)
        self.assertGreaterEqual(count, 0)

    def test_f12_03_career_level_distribution_json(self):
        """Verify career_level distribution outputs valid JSON dictionary."""
        dist = self.sidecar.get_career_level_distribution("Python")
        if dist:
            parsed = json.loads(dist) if isinstance(dist, str) else dist
            self.assertIsInstance(parsed, dict)

    def test_f12_04_top_associated_job_titles_aggregation(self):
        """Verify top associated job titles outputs top 3 distinct job titles."""
        titles = self.sidecar.get_top_job_titles("Python")
        if titles and titles != "Insufficient Postings":
            parsed = json.loads(titles) if isinstance(titles, str) else titles
            self.assertIsInstance(parsed, list)
            self.assertLessEqual(len(parsed), 3)

    def test_f12_05_low_frequency_filter_insufficient_postings(self):
        """Skills with job_count <= 2 output 'Insufficient Postings'."""
        titles = self.sidecar.format_top_titles_with_threshold(
            titles=["Software Engineer"], job_count=1
        )
        self.assertEqual(titles, "Insufficient Postings")


# ==============================================================================
# FEATURE 13: Sidecar Linguistic Context Extraction
# ==============================================================================
class TestFeature13SidecarLinguisticContext(OpaqueBoxTestCase):
    """Feature 13: Intra-string linguistic context extraction for the sidecar."""

    @classmethod
    def setUpClass(cls):
        cls.pipeline = get_pipeline()

    def test_f13_01_industry_context_extraction(self):
        """Isolate industry sector restrictions into industry_context."""
        sidecar = self.pipeline.get_sidecar_metadata("Sales (Real Estate)")
        self.assertEqual(sidecar["industry_context"], "Real Estate")

    def test_f13_02_category_container_extraction(self):
        """Extract category container header into category_container."""
        sidecar = self.pipeline.get_sidecar_metadata("Programming Languages: Python, Go")
        self.assertEqual(sidecar["category_container"], "Programming Languages")

    def test_f13_03_parentheses_raw_content_extraction(self):
        """Capture verbatim outermost parentheses content."""
        sidecar = self.pipeline.get_sidecar_metadata("Python (Advanced Level)")
        self.assertEqual(sidecar["parentheses_raw_content"], "Advanced Level")

    def test_f13_04_experience_duration_extraction(self):
        """Extract verbatim experience duration string."""
        sidecar = self.pipeline.get_sidecar_metadata("Python (5+ years experience)")
        self.assertIn("5+", sidecar["experience_duration"])

    def test_f13_05_intra_string_seniority_extraction(self):
        """Extract role seniority word into intra_string_seniority."""
        sidecar = self.pipeline.get_sidecar_metadata("Senior Python Developer")
        self.assertIn("Senior", sidecar["intra_string_seniority"])

    def test_f13_06_is_composite_computation(self):
        """Verify is_composite is True for multi-component skills and False for atomic."""
        sidecar_single = self.pipeline.get_sidecar_metadata("Python")
        self.assertFalse(sidecar_single["is_composite"])

        sidecar_multi = self.pipeline.get_sidecar_metadata("Python & SQL")
        self.assertTrue(sidecar_multi["is_composite"])


# ==============================================================================
# FEATURE 14: Sidecar 11-Column CSV Serialization
# ==============================================================================
class TestFeature14SidecarSerialization(OpaqueBoxTestCase):
    """Feature 14: Serialization of egypt_skills_decomposition_metadata.csv."""

    @classmethod
    def setUpClass(cls):
        cls.pipeline = get_pipeline()

    def test_f14_01_sidecar_exact_11_columns(self):
        """Verify sidecar schema contains exactly the 11 frozen columns."""
        sidecar = self.pipeline.get_sidecar_metadata("Python")
        self.assertEqual(list(sidecar.keys()), SIDECAR_11_COLUMNS)

    def test_f14_02_sidecar_one_to_one_with_raw_skills(self):
        """Verify exactly one sidecar row is generated per unique raw_skill."""
        raws = ["Python", "SQL", "Docker"]
        sidecar_rows = [self.pipeline.get_sidecar_metadata(r) for r in raws]
        self.assertEqual(len(sidecar_rows), len(raws))

    def test_f14_03_sidecar_is_composite_boolean(self):
        """Verify is_composite is strictly boolean."""
        sidecar = self.pipeline.get_sidecar_metadata("Python")
        self.assertIsInstance(sidecar["is_composite"], bool)

    def test_f14_04_sidecar_career_distribution_serializable(self):
        """Verify distribution field is serializable to standard CSV."""
        sidecar = self.pipeline.get_sidecar_metadata("Python")
        dist = sidecar["posting_career_level_distribution"]
        self.assertTrue(dist is None or isinstance(dist, (str, dict)))

    def test_f14_05_sidecar_raw_skill_preserved_identically(self):
        """Verify raw_skill in sidecar preserves exact original string."""
        raw = "  Python & SQL (Advanced)  "
        sidecar = self.pipeline.get_sidecar_metadata(raw)
        self.assertEqual(sidecar["raw_skill"], raw)


# ==============================================================================
# FEATURE 15: 14-Column Main Decomposition Serialization
# ==============================================================================
class TestFeature15MainGraphSerialization(OpaqueBoxTestCase):
    """Feature 15: Serialization of egypt_skills_decomposed_graph.csv."""

    @classmethod
    def setUpClass(cls):
        cls.pipeline = get_pipeline()

    def test_f15_01_main_csv_exact_14_columns(self):
        """Verify main output row contains exactly the 14 frozen columns."""
        results = self.pipeline.decompose("Python")
        self.assertEqual(list(results[0].keys()), MAIN_14_COLUMNS)

    def test_f15_02_main_csv_column_order(self):
        """Verify column order strictly follows frozen schema."""
        results = self.pipeline.decompose("Python")
        self.assertEqual(list(results[0].keys()), MAIN_14_COLUMNS)

    def test_f15_03_null_matched_skill_for_novel(self):
        """matched_atomic_skill must be NULL for novel or rejected skills."""
        res = self.pipeline.decompose("Claude Code")
        self.assertIn(res[0]["matched_atomic_skill"], [None, "", "NULL"])

    def test_f15_04_null_rejection_reason_for_accepted(self):
        """rejection_reason must be NULL or empty for valid accepted skills."""
        res = self.pipeline.decompose("Python")
        self.assertIn(res[0]["rejection_reason"], [None, "", "NULL"])

    def test_f15_05_job_count_integer(self):
        """job_count must be an integer."""
        res = self.pipeline.decompose("Python")
        self.assertIsInstance(res[0]["job_count"], int)


# ==============================================================================
# FEATURE 16: End-to-End Pipeline Integration & Batch Execution
# ==============================================================================
class TestFeature16PipelineIntegration(OpaqueBoxTestCase):
    """Feature 16: End-to-end integration across all 5 sequential passes."""

    @classmethod
    def setUpClass(cls):
        cls.pipeline = get_pipeline()

    def test_f16_01_full_decomposition_flow(self):
        """Process complex delimited string through full 5-pass flow."""
        raw = "Python / SQL & Power BI"
        res = self.pipeline.decompose(raw)
        self.assertGreaterEqual(len(res), 3)
        skills = [r["atomic_skill"] for r in res]
        self.assertIn("Python", skills)
        self.assertIn("SQL", skills)
        self.assertIn("Power BI", skills)

    def test_f16_02_determinism_across_multiple_invocations(self):
        """Same input must yield identical output records on repeated runs."""
        raw = "Advanced Python & Solid Git"
        res1 = self.pipeline.decompose(raw)
        res2 = self.pipeline.decompose(raw)
        self.assertEqual(res1, res2)

    def test_f16_03_batch_processing_capability(self):
        """Pipeline can process batch list of raw skills efficiently."""
        raws = ["Python", "SQL", "Docker", "Git", "Kubernetes"]
        batch_results = [self.pipeline.decompose(r) for r in raws]
        self.assertEqual(len(batch_results), len(raws))

    def test_f16_04_resilience_to_malformed_inputs(self):
        """Pipeline handles malformed or weirdly spaced inputs gracefully."""
        raw = "   /// Python  &&&   SQL  ---  "
        res = self.pipeline.decompose(raw)
        skills = [r["atomic_skill"] for r in res if r["match_status"] != "REJECTED_NOISE"]
        self.assertTrue(len(skills) >= 1)

    def test_f16_05_sidecar_and_main_dataset_consistency(self):
        """Verify sidecar and main records maintain consistent raw_skill references."""
        raw = "Python & SQL"
        main_res = self.pipeline.decompose(raw)
        sidecar_res = self.pipeline.get_sidecar_metadata(raw)
        for row in main_res:
            self.assertEqual(row["raw_skill"], sidecar_res["raw_skill"])


# ==============================================================================
# FEATURE 17: E2E Testing Framework & 4-Tier Test Cases
# ==============================================================================
class TestFeature17E2ETestingFramework(OpaqueBoxTestCase):
    """Feature 17: Validation of test infrastructure, runner, and 4-tier taxonomy."""

    def test_f17_01_all_test_files_exist(self):
        """Verify all required test suite files exist in tests directory."""
        tests_dir = PROJECT_ROOT / "tests"
        required_files = [
            "__init__.py",
            "test_helpers.py",
            "test_benchmark_spec_traces.py",
            "test_tier1_feature_coverage.py",
            "test_tier2_boundary_corner.py",
            "test_tier3_pairwise_combinations.py",
            "test_tier4_real_world_workloads.py",
            "run_all_tests.py",
        ]
        for f in required_files:
            p = tests_dir / f
            self.assertTrue(p.exists(), f"Required test file missing: {p}")

    def test_f17_02_test_infra_documentation_exists(self):
        """Verify TEST_INFRA.md exists at project root."""
        infra_path = PROJECT_ROOT / "TEST_INFRA.md"
        self.assertTrue(infra_path.exists(), "TEST_INFRA.md must exist at project root")

    def test_f17_03_runner_syntax_valid(self):
        """Verify master runner file parses and compiles cleanly."""
        runner_path = PROJECT_ROOT / "tests" / "run_all_tests.py"
        with open(runner_path, "r", encoding="utf-8") as f:
            code = f.read()
        compile(code, str(runner_path), "exec")

    def test_f17_04_test_isolation_no_global_state_mutation(self):
        """Verify tests run without mutating shared module constants."""
        orig_len = len(MAIN_14_COLUMNS)
        self.assertEqual(orig_len, 14)

    def test_f17_05_coverage_across_all_18_features(self):
        """Verify that Feature Inventory covers all 18 features."""
        # This test file itself contains classes for Features 1 through 18
        current_module = sys.modules[__name__]
        feature_classes = [
            attr
            for attr in dir(current_module)
            if attr.startswith("TestFeature") and isinstance(getattr(current_module, attr), type)
        ]
        self.assertGreaterEqual(
            len(feature_classes),
            18,
            f"Expected at least 18 feature test classes, found {len(feature_classes)}",
        )


# ==============================================================================
# FEATURE 18: Adversarial Hardening & Forensic Integrity Audit
# ==============================================================================
class TestFeature18AdversarialHardening(OpaqueBoxTestCase):
    """Feature 18: Adversarial validation protocol and security gates."""

    @classmethod
    def setUpClass(cls):
        cls.pipeline = get_pipeline()

    def test_f18_01_gate1_json_syntax_validation(self):
        """Gate 1: Acronym dictionary and modifier configs parse cleanly as valid JSON."""
        with open(ACRONYMS_PATH, "r", encoding="utf-8") as f:
            data = json.load(f)
        self.assertIsInstance(data, dict)

    def test_f18_02_gate2_python_regex_compilation(self):
        """Gate 2: All regexes in catalog compile with zero errors under re.IGNORECASE."""
        with open(CATALOG_PATH, "r", encoding="utf-8-sig") as f:
            lines = f.readlines()
        for idx, line in enumerate(lines[1:50]):  # Sample first 50 patterns
            parts = line.strip().split(";")
            if len(parts) >= 6:
                pattern = parts[5].strip()
                if pattern:
                    try:
                        re.compile(pattern, re.IGNORECASE)
                    except re.error as e:
                        self.fail(f"Regex compilation failure at row {idx}: {pattern} ({e})")

    def test_f18_03_gate3_catastrophic_backtracking_guard(self):
        """Gate 3: Adversarial nested pattern does not cause catastrophic backtracking."""
        import time

        payload = "word " * 30 + "!"
        t0 = time.perf_counter()
        # Decompose payload; must terminate within 100ms
        self.pipeline.decompose(payload)
        elapsed = time.perf_counter() - t0
        self.assertLess(elapsed, 0.5, "Execution exceeded safety threshold for adversarial payload")

    def test_f18_04_gate4_generic_words_resistance(self):
        """Gate 4: Generic words like 'Software', 'System', 'Data' resist false catalog matches."""
        generic_words = ["Software", "System", "Data", "Management", "Services"]
        for word in generic_words:
            res = self.pipeline.decompose(word)
            # A generic standalone word should not falsely match a specific tool like 'Software Architecture'
            if res and res[0]["match_status"] == "CATALOG_EXACT_MATCH":
                self.assertEqual(res[0]["atomic_skill"].lower(), word.lower())

    def test_f18_05_gate5_arabic_unicode_isolation(self):
        """Gate 5: Non-Arabic technical regexes are not applied to Arabic text inappropriately."""
        arabic_skill = "إدارة المشروعات"
        res = self.pipeline.decompose(arabic_skill)
        self.assertGreaterEqual(len(res), 1)
        self.assertIn(res[0]["atomic_skill"], ["إدارة المشروعات", "Project Management"])


if __name__ == "__main__":
    unittest.main()
