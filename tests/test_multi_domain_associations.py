"""
Comprehensive Multi-Domain Skill Association & Logic Validation Test Suite
==========================================================================
Verifies the Critical Architectural Principles for Milestone 1:
1. No skill is exclusively restricted to a single domain.
2. Every catalog association is preserved across all 281 multi-domain skills.
3. SQL (8 rows), Python (10 rows), Excel (25 rows), JS (4 rows) all retain 100% of associations.
4. Invariant: len(get_all_exact_matches(s)) == catalog row count for all duplicate skills.
5. Context-aware domain selection works deterministically when context_domain is supplied.
6. PL/SQL is decoupled from Oracle Database and shielded from partial regex matches (UNMATCHED_NOVEL).
7. GitHub Advanced Security is shielded from partial 'GitHub' regex matches.
8. Skill types are strictly normalized (90 rows) and validated (0 unapproved types).
9. Taxonomy represents exactly 14 closed domains (using 'Legal, Regulatory & Government Relations')
   and 61 closed subcategories without legacy pollution.
10. All Section 3.4 mandatory adversarial cases pass.
"""

import sys
import unittest
from pathlib import Path

# Add project root to sys.path
PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

import pandas as pd

from linguistic_intelligence.config import (
    APPROVED_SKILL_TYPES,
    CLOSED_DOMAINS_SET,
    CLOSED_SUBCATEGORIES_SET,
    DEFAULT_ACRONYMS_PATH,
    DEFAULT_CATALOG_PATH,
    DEFAULT_LEVELS_PATH,
)
from linguistic_intelligence.catalog import CatalogLoader, StandardSkillEntry


class TestMultiDomainSkillAssociations(unittest.TestCase):
    """Rigorous evidence-based test suite for multi-domain association preservation."""

    @classmethod
    def setUpClass(cls):
        cls.loader = CatalogLoader(
            catalog_path=DEFAULT_CATALOG_PATH,
            acronyms_path=DEFAULT_ACRONYMS_PATH,
            levels_path=DEFAULT_LEVELS_PATH,
        )
        cls.raw_df = pd.read_csv(DEFAULT_CATALOG_PATH, sep=";", encoding="utf-8-sig")

    # ─── 1. CORE MULTI-DOMAIN PRESERVATION ───────────────────────────────────────

    def test_sql_preserves_all_8_catalog_associations(self):
        """SQL must retain all 8 associations across 3 domains and 8 subcategories."""
        matches = self.loader.get_all_exact_matches("SQL")
        self.assertEqual(len(matches), 8, f"Expected 8 SQL associations, got {len(matches)}")

        domains = {e.domain for e in matches}
        self.assertEqual(domains, {
            "Data Science & Analytics",
            "Software Engineering & IT",
            "Human Resources",
        })

        subcats = {e.sub_category for e in matches}
        expected_subcats = {
            "Business Intelligence & Data Analytics",
            "Data Engineering",
            "Machine Learning & Data Science",
            "Artificial Intelligence & Deep Learning",
            "Data Governance, Quality & Architecture",
            "Backend Development",
            "Quality Assurance & Testing",
            "HR Operations & People Analytics",
        }
        self.assertEqual(subcats, expected_subcats)

        # Verify get_all_associations API
        assocs = self.loader.get_all_associations("SQL")
        self.assertEqual(len(assocs), 8)

    def test_python_preserves_all_10_catalog_associations(self):
        """Python must retain all 10 associations across 3 domains and 10 subcategories."""
        matches = self.loader.get_all_exact_matches("Python")
        self.assertEqual(len(matches), 10, f"Expected 10 Python associations, got {len(matches)}")

        domains = {e.domain for e in matches}
        self.assertEqual(domains, {
            "Data Science & Analytics",
            "Software Engineering & IT",
            "Human Resources",
        })

        subcats = {e.sub_category for e in matches}
        expected_subcats = {
            "Business Intelligence & Data Analytics",
            "Data Engineering",
            "Machine Learning & Data Science",
            "Artificial Intelligence & Deep Learning",
            "Data Governance, Quality & Architecture",
            "Backend Development",
            "DevOps & Cloud Infrastructure",
            "Quality Assurance & Testing",
            "Cybersecurity & Information Security",
            "HR Operations & People Analytics",
        }
        self.assertEqual(subcats, expected_subcats)

    def test_microsoft_excel_preserves_all_25_associations(self):
        """Microsoft Excel must retain all 25 associations across 7 domains."""
        matches = self.loader.get_all_exact_matches("Microsoft Excel")
        self.assertEqual(len(matches), 25, f"Expected 25 Excel associations, got {len(matches)}")

        # Also verify that alias 'Excel' returns all 25 associations
        alias_matches = self.loader.get_all_exact_matches("Excel")
        self.assertEqual(len(alias_matches), 25, "Alias 'Excel' must return all 25 associations of Microsoft Excel")

    def test_javascript_preserves_all_4_associations(self):
        """JavaScript must retain all 4 associations in Software Engineering & IT."""
        matches = self.loader.get_all_exact_matches("JavaScript")
        self.assertEqual(len(matches), 4)
        subcats = {e.sub_category for e in matches}
        self.assertEqual(subcats, {
            "Backend Development",
            "Frontend Development",
            "Mobile Development",
            "Quality Assurance & Testing",
        })

    def test_power_bi_preserves_all_4_associations(self):
        """Power BI must retain all 4 associations across 4 distinct domains."""
        matches = self.loader.get_all_exact_matches("Power BI")
        self.assertEqual(len(matches), 4)
        domains = {e.domain for e in matches}
        self.assertEqual(domains, {
            "Data Science & Analytics",
            "Business & Finance",
            "Human Resources",
            "Operations & Project Management",
        })

    # ─── 2. GENERAL INVARIANT ACROSS ALL 281 DUPLICATE SKILLS ────────────────────

    def test_general_invariant_all_duplicate_skills_preserve_every_association(self):
        """
        GENERAL INVARIANT: For every skill in standard_skills_catalog.csv,
        len(get_all_exact_matches(skill)) == catalog row count for that skill.
        No associations may be discarded through loading, hashing, or canonical resolution.
        """
        skill_counts = self.raw_df["standard_skill_name"].value_counts()
        duplicates = skill_counts[skill_counts > 1]
        self.assertEqual(len(duplicates), 281, "Catalog must have exactly 281 duplicate skill names")

        mismatches = []
        for skill_name, expected_count in duplicates.items():
            actual_matches = self.loader.get_all_exact_matches(skill_name)
            if len(actual_matches) != expected_count:
                mismatches.append((skill_name, expected_count, len(actual_matches)))

        self.assertEqual(
            len(mismatches), 0,
            f"Found {len(mismatches)} skills with missing associations: {mismatches[:5]}"
        )

    # ─── 3. CONTEXT-AWARE EXACT MATCHING ─────────────────────────────────────────

    def test_context_aware_exact_matching(self):
        """When context_domain is supplied, exact matching returns the domain-specific entry."""
        # SQL in Software Engineering
        se_entry = self.loader.get_exact_match("SQL", context_domain="Software Engineering & IT")
        self.assertIsNotNone(se_entry)
        self.assertEqual(se_entry.domain, "Software Engineering & IT")
        self.assertEqual(se_entry.sub_category, "Backend Development")

        # SQL in Human Resources
        hr_entry = self.loader.get_exact_match("SQL", context_domain="Human Resources")
        self.assertIsNotNone(hr_entry)
        self.assertEqual(hr_entry.domain, "Human Resources")
        self.assertEqual(hr_entry.sub_category, "HR Operations & People Analytics")

        # SQL in Data Science & Analytics
        ds_entry = self.loader.get_exact_match("SQL", context_domain="Data Science & Analytics")
        self.assertIsNotNone(ds_entry)
        self.assertEqual(ds_entry.domain, "Data Science & Analytics")

        # Default fallback without context returns canonical anchor
        default_entry = self.loader.get_exact_match("SQL")
        self.assertIsNotNone(default_entry)
        self.assertEqual(default_entry.domain, "Data Science & Analytics")
        self.assertEqual(default_entry.sub_category, "Data Engineering")

    # ─── 4. ALIAS SEPARATION & PL/SQL PROTECTION ─────────────────────────────────

    def test_plsql_never_maps_to_oracle_database(self):
        """
        Section 22.1: PL/SQL is an independent procedural language.
        It must NEVER be mapped to Oracle Database merely because of catalog alias proximity.
        """
        exact = self.loader.get_exact_match("PL/SQL")
        self.assertIsNone(exact, "PL/SQL must return None for catalog exact match (UNMATCHED_NOVEL)")

        all_exact = self.loader.get_all_exact_matches("PL/SQL")
        self.assertEqual(len(all_exact), 0, "PL/SQL must have 0 catalog matches")

        regex = self.loader.get_regex_match("PL/SQL")
        self.assertIsNone(regex, "PL/SQL must NOT match Oracle Database or SQL via regex")

    def test_github_advanced_security_never_matches_github(self):
        """
        Section 22.2: GitHub Advanced Security must be protected as a whole product name.
        It must NOT be partially swallowed by 'GitHub' regex matching.
        """
        exact = self.loader.get_exact_match("GitHub Advanced Security")
        self.assertIsNone(exact, "GitHub Advanced Security is not in standard_skills_catalog")

        regex = self.loader.get_regex_match("GitHub Advanced Security")
        self.assertIsNone(regex, "GitHub Advanced Security must NOT match 'GitHub' via regex")

    # ─── 5. SKILL TYPE VALIDATION & AUDIT ────────────────────────────────────────

    def test_skill_types_conform_to_approved_vocabulary(self):
        """All 3,794 catalog rows must conform strictly to the 5 approved skill types."""
        audit = self.loader.get_skill_type_audit_report()
        self.assertEqual(audit["total_rows"], 3794)
        self.assertEqual(audit["normalized_count"], 90, "Expected exactly 90 legacy types normalized to Hard Skill")
        self.assertEqual(audit["unapproved_count"], 0, "Must have zero unapproved skill types")

        # Verify entry.raw_skill_type preservation
        entry_with_norm = [e for e in self.loader.all_entries if e.raw_skill_type != e.skill_type]
        self.assertEqual(len(entry_with_norm), 90)

    # ─── 6. TAXONOMY CONSISTENCY & LEGAL DOMAIN RESOLUTION ───────────────────────

    def test_authoritative_domains_count_and_legal_label(self):
        """
        Section 6: Must have exactly 14 closed domains.
        The authoritative domain is 'Legal, Regulatory & Government Relations',
        NOT the legacy 'Legal & Compliance'.
        """
        domains = self.loader.get_all_domains()
        self.assertEqual(len(domains), 14, f"Expected 14 domains, got {len(domains)}: {domains}")
        self.assertIn("Legal, Regulatory & Government Relations", domains)
        self.assertNotIn("Legal & Compliance", domains)

        subcategories = self.loader.get_all_subcategories()
        self.assertEqual(len(subcategories), 61, f"Expected 61 subcategories, got {len(subcategories)}")

    # ─── 7. SECTION 3.4 MANDATORY ADVERSARIAL CASES ──────────────────────────────

    def test_section_3_4_adversarial_cases(self):
        """Test all Section 3.4 mandatory adversarial phrases."""
        # 1. SQL -> valid
        self.assertEqual(len(self.loader.get_all_exact_matches("SQL")), 8)

        # 2. PL/SQL -> None (protected compound, not in catalog)
        self.assertIsNone(self.loader.get_exact_match("PL/SQL"))
        self.assertIsNone(self.loader.get_regex_match("PL/SQL"))

        # 3. T-SQL -> maps to Microsoft SQL Server via alias
        tsql = self.loader.get_exact_match("T-SQL")
        self.assertIsNotNone(tsql)
        self.assertEqual(tsql.standard_skill_name, "Microsoft SQL Server")

        # 4. PostgreSQL -> valid exact match
        pg = self.loader.get_exact_match("PostgreSQL")
        self.assertIsNotNone(pg)
        self.assertEqual(pg.standard_skill_name, "PostgreSQL")

        # 5. Python -> 10 associations
        self.assertEqual(len(self.loader.get_all_exact_matches("Python")), 10)

        # 6. JavaScript -> 4 associations
        self.assertEqual(len(self.loader.get_all_exact_matches("JavaScript")), 4)

        # 7. Node.js -> Node.js (not JavaScript)
        nodejs = self.loader.get_exact_match("Node.js")
        self.assertIsNotNone(nodejs)
        self.assertEqual(nodejs.standard_skill_name, "Node.js")
        nodejs_regex = self.loader.get_regex_match("Node.js")
        self.assertEqual(nodejs_regex.standard_skill_name, "Node.js")

        # 8. Vue.js -> Vue.js (not JavaScript)
        vuejs = self.loader.get_exact_match("Vue.js")
        self.assertIsNotNone(vuejs)
        self.assertEqual(vuejs.standard_skill_name, "Vue.js")

        # 9. Lead Generation -> Protected proper noun, matches catalog
        lg = self.loader.get_exact_match("Lead Generation")
        self.assertIsNotNone(lg)
        self.assertEqual(lg.standard_skill_name, "Lead Generation")
        self.assertTrue(self.loader.is_protected_proper_noun("Lead Generation"))

        # 10. Lead User Support -> Not protected, not in catalog
        self.assertFalse(self.loader.is_protected_proper_noun("Lead User Support"))
        self.assertIsNone(self.loader.get_exact_match("Lead User Support"))

        # 11. End User Support -> Not protected, not in catalog
        self.assertFalse(self.loader.is_protected_proper_noun("End User Support"))
        self.assertIsNone(self.loader.get_exact_match("End User Support"))

        # 12. Senior Living -> Protected proper noun
        self.assertTrue(self.loader.is_protected_proper_noun("Senior Living"))

        # 13. Senior Python Developer -> Adversarial job title, NOT protected proper noun
        self.assertFalse(self.loader.is_protected_proper_noun("Senior Python Developer"))

        # 14. GitHub Advanced Security -> Protected proper noun, not in catalog
        self.assertTrue(self.loader.is_protected_proper_noun("GitHub Advanced Security"))
        self.assertIsNone(self.loader.get_exact_match("GitHub Advanced Security"))
        self.assertIsNone(self.loader.get_regex_match("GitHub Advanced Security"))

        # 15. Azure Advanced Threat Protection -> Protected proper noun
        self.assertTrue(self.loader.is_protected_proper_noun("Azure Advanced Threat Protection"))

        # 16. Master Data Management -> Protected proper noun, matches catalog
        self.assertTrue(self.loader.is_protected_proper_noun("Master Data Management"))
        mdm = self.loader.get_exact_match("Master Data Management")
        self.assertIsNotNone(mdm)

        # 17. Scrum Master -> Protected proper noun
        self.assertTrue(self.loader.is_protected_proper_noun("Scrum Master"))

        # 18. Google Tag Manager -> Protected proper noun, matches catalog
        self.assertTrue(self.loader.is_protected_proper_noun("Google Tag Manager"))
        gtm = self.loader.get_exact_match("Google Tag Manager")
        self.assertIsNotNone(gtm)

        # 19. Adobe Experience Manager -> Protected proper noun
        self.assertTrue(self.loader.is_protected_proper_noun("Adobe Experience Manager"))


if __name__ == "__main__":
    unittest.main()
