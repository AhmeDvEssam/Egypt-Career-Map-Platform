"""
Unit Test Suite for Milestone 1: Knowledge Base & Linguistic Lexicon Module
===========================================================================
Tests reference catalog ingestion, priority deduplication (Python -> Backend Development),
acronym dictionary loading (386 entries), Pass 0 proper noun shielding, level matrix (23 rows),
and frozen 14/11 schema contract adherence.
"""

import unittest
import os
import re
from pathlib import Path

# Config imports
from linguistic_intelligence.config import (
    PROJECT_ROOT,
    DEFAULT_CATALOG_PATH,
    DEFAULT_ACRONYMS_PATH,
    DEFAULT_LEVELS_PATH,
    CSV_DELIMITER,
    CSV_ENCODING,
    CLOSED_DOMAINS,
    CLOSED_DOMAINS_SET,
    CLOSED_SUBCATEGORIES,
    CLOSED_SUBCATEGORIES_SET,
    DOMAIN_TO_SUBCATEGORIES,
    MAIN_OUTPUT_COLUMNS,
    SIDECAR_OUTPUT_COLUMNS,
    VALID_MATCH_STATUSES,
    TAXONOMY_EXCEPTION_STATUSES,
    APPROVED_SKILL_TYPES,
    CANONICAL_SKILL_HOMES,
    CATALOG_EXACT_MATCH,
    CATALOG_REGEX_MATCH,
    PARENTHESIS_SPECIFICATION,
    PROTECTED_PROPER_NOUN,
    UNMATCHED_NOVEL,
    REJECTED_NOISE,
)

from linguistic_intelligence.catalog import (
    CatalogLoader,
    StandardSkillEntry,
    AcronymEntry,
    LevelMatrixEntry,
)

from linguistic_intelligence.proper_nouns import (
    ProperNounShield,
    AcronymResolver,
)


class TestConfigurationAndSchemaContracts(unittest.TestCase):
    """Verifies frozen schema contracts, taxonomy constants, and match status enums."""

    def test_main_schema_exact_14_columns(self):
        expected_columns = (
            "raw_skill",
            "atomic_skill",
            "matched_atomic_skill",
            "separated_by",
            "separated_from_before",
            "separated_from_after",
            "extracted_skill_level",
            "skill_level",
            "skill_type",
            "domain",
            "sub_category",
            "job_count",
            "match_status",
            "rejection_reason",
        )
        self.assertEqual(len(MAIN_OUTPUT_COLUMNS), 14)
        self.assertEqual(MAIN_OUTPUT_COLUMNS, expected_columns)

    def test_sidecar_schema_exact_11_columns(self):
        expected_columns = (
            "raw_skill",
            "job_count",
            "industry_context",
            "category_container",
            "parentheses_raw_content",
            "experience_duration",
            "intra_string_seniority",
            "credential_track_or_status",
            "posting_career_level_distribution",
            "top_associated_job_titles",
            "is_composite",
        )
        self.assertEqual(len(SIDECAR_OUTPUT_COLUMNS), 11)
        self.assertEqual(SIDECAR_OUTPUT_COLUMNS, expected_columns)

    def test_exact_six_permitted_match_statuses(self):
        expected_statuses = {
            "CATALOG_EXACT_MATCH",
            "CATALOG_REGEX_MATCH",
            "PARENTHESIS_SPECIFICATION",
            "PROTECTED_PROPER_NOUN",
            "UNMATCHED_NOVEL",
            "REJECTED_NOISE",
        }
        self.assertEqual(len(VALID_MATCH_STATUSES), 6)
        self.assertEqual(VALID_MATCH_STATUSES, expected_statuses)
        self.assertNotIn("PROTECTED_COMPOUND", VALID_MATCH_STATUSES)

    def test_taxonomy_exception_statuses(self):
        self.assertEqual(TAXONOMY_EXCEPTION_STATUSES, {"UNMATCHED_NOVEL", "REJECTED_NOISE"})

    def test_closed_taxonomy_counts(self):
        self.assertEqual(len(CLOSED_DOMAINS), 14)
        self.assertEqual(len(CLOSED_SUBCATEGORIES), 61)
        self.assertEqual(len(CLOSED_DOMAINS_SET), 14)
        self.assertEqual(len(CLOSED_SUBCATEGORIES_SET), 61)
        total_subcats_in_map = sum(len(subs) for subs in DOMAIN_TO_SUBCATEGORIES.values())
        self.assertEqual(total_subcats_in_map, 61)


class TestCatalogIngestion(unittest.TestCase):
    """Verifies catalog loading, semicolon parsing, row counts, and taxonomy validity."""

    @classmethod
    def setUpClass(cls):
        cls.loader = CatalogLoader(
            catalog_path=DEFAULT_CATALOG_PATH,
            acronyms_path=DEFAULT_ACRONYMS_PATH,
            levels_path=DEFAULT_LEVELS_PATH,
        )

    def test_catalog_file_exists(self):
        self.assertTrue(DEFAULT_CATALOG_PATH.exists(), f"Catalog file not found at {DEFAULT_CATALOG_PATH}")

    def test_catalog_raw_row_count_3794(self):
        self.assertEqual(self.loader.raw_row_count, 3794)

    def test_catalog_unique_standard_skill_count(self):
        # 2,756 unique canonical names
        self.assertEqual(len(self.loader.unique_standard_skills), 2756)

    def test_all_catalog_entries_in_closed_domains(self):
        for entry in self.loader.all_entries:
            self.assertIn(
                entry.domain,
                CLOSED_DOMAINS_SET,
                f"Domain '{entry.domain}' for skill '{entry.standard_skill_name}' not in closed domains",
            )

    def test_all_catalog_entries_in_closed_subcategories(self):
        for entry in self.loader.all_entries:
            self.assertIn(
                entry.sub_category,
                CLOSED_SUBCATEGORIES_SET,
                f"Subcategory '{entry.sub_category}' for skill '{entry.standard_skill_name}' not in closed subcategories",
            )

    def test_domain_subcategory_hierarchy_integrity(self):
        for entry in self.loader.all_entries:
            valid_subcats = DOMAIN_TO_SUBCATEGORIES.get(entry.domain, ())
            self.assertIn(
                entry.sub_category,
                valid_subcats,
                f"Subcategory '{entry.sub_category}' invalid under domain '{entry.domain}'",
            )

    def test_catalog_regex_compilation(self):
        self.assertGreater(len(self.loader.compiled_regex_patterns), 0)
        for skill_name, pattern, domain, subcat, stype in self.loader.compiled_regex_patterns:
            self.assertIsNotNone(pattern)
            self.assertTrue(hasattr(pattern, "search"))


class TestPriorityResolutionAndDeduplication(unittest.TestCase):
    """Verifies priority resolution and canonical home mapping (Python -> Backend Development)."""

    @classmethod
    def setUpClass(cls):
        cls.loader = CatalogLoader(
            catalog_path=DEFAULT_CATALOG_PATH,
            acronyms_path=DEFAULT_ACRONYMS_PATH,
            levels_path=DEFAULT_LEVELS_PATH,
        )

    def test_python_resolves_to_backend_development(self):
        """CRITICAL: Python must resolve to Backend Development, NOT Human Resources."""
        entry = self.loader.get_exact_match("Python")
        self.assertIsNotNone(entry, "Python not found in catalog")
        self.assertEqual(entry.standard_skill_name, "Python")
        self.assertEqual(entry.domain, "Software Engineering & IT")
        self.assertEqual(entry.sub_category, "Backend Development")
        self.assertEqual(entry.skill_type, "Tool / Software")

    def test_sql_resolves_to_canonical_home(self):
        entry = self.loader.get_exact_match("SQL")
        self.assertIsNotNone(entry)
        self.assertEqual(entry.domain, "Data Science & Analytics")
        self.assertEqual(entry.sub_category, "Data Engineering")

    def test_excel_resolves_to_canonical_home(self):
        entry = self.loader.get_exact_match("Microsoft Excel")
        self.assertIsNotNone(entry)
        self.assertEqual(entry.domain, "Data Science & Analytics")
        self.assertEqual(entry.sub_category, "Business Intelligence & Data Analytics")

    def test_git_resolves_to_devops(self):
        entry = self.loader.get_exact_match("Git")
        self.assertIsNotNone(entry)
        self.assertEqual(entry.domain, "Software Engineering & IT")
        self.assertEqual(entry.sub_category, "DevOps & Cloud Infrastructure")

    def test_docker_resolves_to_devops(self):
        entry = self.loader.get_exact_match("Docker")
        self.assertIsNotNone(entry)
        self.assertEqual(entry.domain, "Software Engineering & IT")
        self.assertEqual(entry.sub_category, "DevOps & Cloud Infrastructure")

    def test_known_alias_py_resolves_to_python(self):
        entry = self.loader.get_exact_match("Py")
        self.assertIsNotNone(entry)
        self.assertEqual(entry.standard_skill_name, "Python")
        self.assertEqual(entry.domain, "Software Engineering & IT")
        self.assertEqual(entry.sub_category, "Backend Development")

    def test_known_alias_pbi_resolves_to_power_bi(self):
        entry = self.loader.get_exact_match("PBI")
        self.assertIsNotNone(entry)
        self.assertEqual(entry.standard_skill_name, "Power BI")

    def test_case_insensitive_exact_match(self):
        entry_upper = self.loader.get_exact_match("PYTHON")
        entry_lower = self.loader.get_exact_match("python")
        self.assertIsNotNone(entry_upper)
        self.assertEqual(entry_upper, entry_lower)


class TestAcronymResolver(unittest.TestCase):
    """Verifies loading of 386 verified acronym entries and lookup accuracy."""

    @classmethod
    def setUpClass(cls):
        cls.resolver = AcronymResolver(DEFAULT_ACRONYMS_PATH)

    def test_acronym_dictionary_count_386(self):
        self.assertEqual(len(self.resolver.acronyms), 386)

    def test_lookup_ux(self):
        entry = self.resolver.get_acronym("UX")
        self.assertIsNotNone(entry)
        self.assertEqual(entry.full_name, "User Experience")
        self.assertEqual(entry.canonical_skill_name, "User Experience")
        self.assertEqual(entry.domain, "Software Engineering & IT")
        self.assertEqual(entry.sub_category, "Frontend Development")

    def test_lookup_gtm(self):
        entry = self.resolver.get_acronym("GTM")
        self.assertIsNotNone(entry)
        self.assertEqual(entry.full_name, "Go-to-Market")

    def test_lookup_bi(self):
        entry = self.resolver.get_acronym("BI")
        self.assertIsNotNone(entry)
        self.assertEqual(entry.full_name, "Business Intelligence")

    def test_lookup_case_insensitivity(self):
        lower = self.resolver.get_acronym("aws")
        upper = self.resolver.get_acronym("AWS")
        self.assertIsNotNone(lower)
        self.assertEqual(lower, upper)

    def test_all_386_conform_to_closed_taxonomy(self):
        for key, entry in self.resolver.acronyms.items():
            self.assertIn(
                entry.domain,
                CLOSED_DOMAINS_SET,
                f"Acronym '{key}' has invalid domain '{entry.domain}'",
            )
            self.assertIn(
                entry.sub_category,
                CLOSED_SUBCATEGORIES_SET,
                f"Acronym '{key}' has invalid subcategory '{entry.sub_category}'",
            )


class TestPass0ProperNounShielding(unittest.TestCase):
    """Verifies Pass 0 shielding of multi-word business disciplines, roles, and software names."""

    @classmethod
    def setUpClass(cls):
        cls.shield = ProperNounShield()

    def test_shield_lead_generation(self):
        self.assertTrue(self.shield.is_protected_proper_noun("Lead Generation"))
        self.assertTrue(self.shield.is_protected_proper_noun("lead generation"))

    def test_shield_lead_time_reduction(self):
        self.assertTrue(self.shield.is_protected_proper_noun("Lead Time Reduction"))

    def test_shield_senior_care(self):
        self.assertTrue(self.shield.is_protected_proper_noun("Senior Care"))

    def test_shield_advanced_threat_protection(self):
        self.assertTrue(self.shield.is_protected_proper_noun("Advanced Threat Protection"))

    def test_shield_github_advanced_security(self):
        self.assertTrue(self.shield.is_protected_proper_noun("GitHub Advanced Security"))

    def test_shield_master_data_management(self):
        self.assertTrue(self.shield.is_protected_proper_noun("Master Data Management"))

    def test_shield_scrum_master(self):
        self.assertTrue(self.shield.is_protected_proper_noun("Scrum Master"))

    def test_shield_adas(self):
        self.assertTrue(self.shield.is_protected_proper_noun("ADAS"))

    def test_shield_abap(self):
        self.assertTrue(self.shield.is_protected_proper_noun("ABAP"))

    def test_unshielded_modifier_phrases_not_blocked(self):
        # These are proficiency modifiers + skill nouns, and must NOT be shielded!
        self.assertFalse(self.shield.is_protected_proper_noun("Advanced Python"))
        self.assertFalse(self.shield.is_protected_proper_noun("Intermediate SQL"))
        self.assertFalse(self.shield.is_protected_proper_noun("Beginner React"))


class TestStandardSkillLevelsMatrix(unittest.TestCase):
    """Verifies standard_skill_levels_matrix.csv loading (23 rows) and regex compilation."""

    @classmethod
    def setUpClass(cls):
        cls.loader = CatalogLoader(
            catalog_path=DEFAULT_CATALOG_PATH,
            acronyms_path=DEFAULT_ACRONYMS_PATH,
            levels_path=DEFAULT_LEVELS_PATH,
        )

    def test_matrix_loading_23_rows(self):
        self.assertEqual(len(self.loader.level_matrix_entries), 23)

    def test_matrix_covers_five_skill_types(self):
        types = {r.skill_type for r in self.loader.level_matrix_entries}
        expected_types = {"Hard Skill", "Tool / Software", "Language", "Certification", "Soft Skill"}
        self.assertEqual(types, expected_types)

    def test_matrix_regex_compilation(self):
        for entry in self.loader.level_matrix_entries:
            self.assertIsNotNone(entry.compiled_pattern)
            self.assertTrue(hasattr(entry.compiled_pattern, "search"))


if __name__ == "__main__":
    unittest.main()
