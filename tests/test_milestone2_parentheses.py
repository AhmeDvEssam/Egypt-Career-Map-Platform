"""
Unit Tests for Milestone 2: Parentheses Typology Engine
=======================================================
Validates the 5-way parenthetical classification, priority decision matrix,
linear O(n) algorithmic parsing, protected compound shielding inside parens,
strict dictionary-only acronym policy, M1 matrix level sourcing,
multi-parenthesis parsing, and boundary safety.
"""

import unittest
from linguistic_intelligence.parentheses import (
    ParenthesesTypologyEngine,
    ParenthesisSpan,
    ParenthesisTypology,
    TypologyClassification,
)


class TestMilestone2ParenthesesTypology(unittest.TestCase):
    """Exhaustive test suite for ParenthesesTypologyEngine (Pass 2)."""

    @classmethod
    def setUpClass(cls):
        cls.engine = ParenthesesTypologyEngine()

    # ─── 1. CASE 1: LEVEL OR EXPERIENCE (Proficiency from M1 Matrix) ──────────
    def test_01_level_advanced(self):
        """'Microsoft Office (Advanced)' extracts Advanced level and preserves base."""
        res = self.engine.classify("Microsoft Office (Advanced)")
        self.assertEqual(res.typology, ParenthesisTypology.LEVEL_OR_EXPERIENCE)
        self.assertEqual(res.extracted_level, "Advanced")
        self.assertEqual(res.base_text, "Microsoft Office")
        self.assertEqual(res.cleaned_base_skill, "Microsoft Office")
        self.assertFalse(res.is_malformed)

    def test_02_level_intermediate(self):
        """'SQL (Intermediate)' extracts Intermediate level."""
        res = self.engine.classify("SQL (Intermediate)")
        self.assertEqual(res.typology, ParenthesisTypology.LEVEL_OR_EXPERIENCE)
        self.assertEqual(res.extracted_level, "Intermediate")
        self.assertEqual(res.base_text, "SQL")

    def test_03_level_beginner(self):
        """'Python (Beginner)' extracts Beginner level."""
        res = self.engine.classify("Python (Beginner)")
        self.assertEqual(res.typology, ParenthesisTypology.LEVEL_OR_EXPERIENCE)
        self.assertEqual(res.extracted_level, "Beginner")
        self.assertEqual(res.base_text, "Python")

    def test_04_level_expert(self):
        """'Linux (Expert)' extracts Expert level."""
        res = self.engine.classify("Linux (Expert)")
        self.assertEqual(res.typology, ParenthesisTypology.LEVEL_OR_EXPERIENCE)
        self.assertEqual(res.extracted_level, "Expert")
        self.assertEqual(res.base_text, "Linux")

    def test_05_level_cefr_b2(self):
        """'English (B2)' extracts CEFR B2 level from M1 matrix."""
        res = self.engine.classify("English (B2)")
        self.assertEqual(res.typology, ParenthesisTypology.LEVEL_OR_EXPERIENCE)
        self.assertEqual(res.extracted_level, "B2")
        self.assertEqual(res.base_text, "English")

    def test_06_level_certification_status_certified(self):
        """'PMP (Certified)' extracts Certified status from M1 matrix."""
        res = self.engine.classify("PMP (Certified)")
        self.assertEqual(res.typology, ParenthesisTypology.LEVEL_OR_EXPERIENCE)
        self.assertEqual(res.extracted_level, "Certified")
        self.assertEqual(res.base_text, "PMP")

    def test_07_level_verbatim_casing_preserved(self):
        """Verbatim original casing preserved in extracted_level per Spec v3."""
        res = self.engine.classify("Docker (working knowledge)")
        self.assertEqual(res.typology, ParenthesisTypology.LEVEL_OR_EXPERIENCE)
        self.assertEqual(res.extracted_level, "working knowledge")

    def test_07b_level_matrix_sourcing_verified(self):
        """Level matching is sourced directly from M1 standard_skill_levels_matrix.csv."""
        self.assertGreaterEqual(len(self.engine.level_matrix_rows), 15)
        # Test that 'proficient' matches via M1 matrix
        res = self.engine.classify("Excel (proficient)")
        self.assertEqual(res.typology, ParenthesisTypology.LEVEL_OR_EXPERIENCE)
        self.assertEqual(res.extracted_level, "proficient")

    # ─── 2. CASE 1: LEVEL OR EXPERIENCE (Duration) ────────────────────────────
    def test_08_duration_years(self):
        """'Java (5+ years)' extracts duration without corrupting skill."""
        res = self.engine.classify("Java (5+ years)")
        self.assertEqual(res.typology, ParenthesisTypology.LEVEL_OR_EXPERIENCE)
        self.assertEqual(res.extracted_duration, "5+ years")
        self.assertEqual(res.cleaned_base_skill, "Java")
        self.assertIsNone(res.extracted_level)

    def test_09_duration_months(self):
        """'React (6 months)' extracts 6 months duration."""
        res = self.engine.classify("React (6 months)")
        self.assertEqual(res.typology, ParenthesisTypology.LEVEL_OR_EXPERIENCE)
        self.assertEqual(res.extracted_duration, "6 months")
        self.assertEqual(res.cleaned_base_skill, "React")

    def test_10_duration_range(self):
        """'Node.js (3-5 years)' extracts year range."""
        res = self.engine.classify("Node.js (3-5 years)")
        self.assertEqual(res.typology, ParenthesisTypology.LEVEL_OR_EXPERIENCE)
        self.assertEqual(res.extracted_duration, "3-5 years")

    # ─── 3. CASE 2: ACRONYM EXPANSION (Dictionary-Verified Only) ──────────────
    def test_11_acronym_full_to_acronym(self):
        """'Amazon Web Services (AWS)' resolves via verified AcronymResolver dictionary."""
        res = self.engine.classify("Amazon Web Services (AWS)")
        self.assertEqual(res.typology, ParenthesisTypology.ACRONYM_EXPANSION)
        self.assertEqual(res.acronym_token, "AWS")
        self.assertEqual(res.expanded_token, "Amazon Web Services")
        self.assertIn("AWS", res.cleaned_base_skill)

    def test_12_acronym_acronym_to_full(self):
        """'UI (User Interface)' resolves reverse acronym expansion via verified dictionary."""
        res = self.engine.classify("UI (User Interface)")
        self.assertEqual(res.typology, ParenthesisTypology.ACRONYM_EXPANSION)
        self.assertEqual(res.acronym_token, "UI")
        self.assertEqual(res.expanded_token, "User Interface")

    def test_12b_acronym_gtm_go_to_market(self):
        """'GTM (Go-to-Market)' resolves reverse expansion to verified dictionary meaning."""
        res = self.engine.classify("GTM (Go-to-Market)")
        self.assertEqual(res.typology, ParenthesisTypology.ACRONYM_EXPANSION)
        self.assertEqual(res.acronym_token, "GTM")
        self.assertEqual(res.expanded_token, "Go-to-Market")

    def test_13_acronym_rejection_of_arbitrary_words(self):
        """'Data Analysis (Machine Learning)' must NOT be classified as acronym expansion."""
        res = self.engine.classify("Data Analysis (Machine Learning)")
        self.assertNotEqual(res.typology, ParenthesisTypology.ACRONYM_EXPANSION)

    def test_13b_acronym_rejection_of_unverified_initialism(self):
        """Unverified acronym pair NOT in dictionary is strictly rejected from ACRONYM_EXPANSION."""
        res = self.engine.classify("Specialist Engine (SE)")
        self.assertNotEqual(res.typology, ParenthesisTypology.ACRONYM_EXPANSION)

    def test_13c_acronym_no_loose_substring_false_positive(self):
        """'Service (AWS)' must NOT match because 'Service' is merely a substring, not the full name."""
        res = self.engine.classify("Service (AWS)")
        self.assertNotEqual(res.typology, ParenthesisTypology.ACRONYM_EXPANSION)

    # ─── 4. CASE 3: CATEGORY CONTAINER (Compound-Shielded) ────────────────────
    def test_14_category_container_dev_tools(self):
        """'Development Tools (Git, Jira)' decomposes into leaf items with container preserved."""
        res = self.engine.classify("Development Tools (Git, Jira)")
        self.assertEqual(res.typology, ParenthesisTypology.CATEGORY_CONTAINER)
        self.assertEqual(res.category_container, "Development Tools")
        self.assertEqual(res.leaf_tokens, ["Git", "Jira"])

    def test_14b_category_container_protected_compounds_shielded(self):
        """
        'Development Tools (PL/SQL, Git, CI/CD)' shields PL/SQL and CI/CD from splitting on slash.
        Must NOT produce ['PL', 'SQL', 'Git', 'CI', 'CD'].
        """
        res = self.engine.classify("Development Tools (PL/SQL, Git, CI/CD)")
        self.assertEqual(res.typology, ParenthesisTypology.CATEGORY_CONTAINER)
        self.assertEqual(res.category_container, "Development Tools")
        self.assertIn("PL/SQL", res.leaf_tokens)
        self.assertIn("CI/CD", res.leaf_tokens)
        self.assertIn("Git", res.leaf_tokens)
        self.assertNotIn("PL", res.leaf_tokens)
        self.assertNotIn("SQL", res.leaf_tokens)
        self.assertNotIn("CI", res.leaf_tokens)
        self.assertNotIn("CD", res.leaf_tokens)

    def test_14c_category_container_c_cpp_shielded(self):
        """'Programming Languages (C/C++, Java, Python)' shields C/C++ from splitting."""
        res = self.engine.classify("Programming Languages (C/C++, Java, Python)")
        self.assertEqual(res.typology, ParenthesisTypology.CATEGORY_CONTAINER)
        self.assertIn("C/C++", res.leaf_tokens)
        self.assertNotIn("C++", res.leaf_tokens)

    def test_15_category_container_programming_languages(self):
        """'Programming Languages (Python, Java, Go)' extracts 3 leaf tokens."""
        res = self.engine.classify("Programming Languages (Python, Java, Go)")
        self.assertEqual(res.typology, ParenthesisTypology.CATEGORY_CONTAINER)
        self.assertEqual(res.category_container, "Programming Languages")
        self.assertEqual(res.leaf_tokens, ["Python", "Java", "Go"])

    def test_16_category_container_relational_databases(self):
        """'Relational Databases (PostgreSQL, MySQL)' extracts database tokens."""
        res = self.engine.classify("Relational Databases (PostgreSQL, MySQL)")
        self.assertEqual(res.typology, ParenthesisTypology.CATEGORY_CONTAINER)
        self.assertEqual(res.category_container, "Relational Databases")
        self.assertIn("PostgreSQL", res.leaf_tokens)
        self.assertIn("MySQL", res.leaf_tokens)

    # ─── 5. CASE 4: INDUSTRY CONTEXT ──────────────────────────────────────────
    def test_17_industry_context_transportation(self):
        """'Sales Experience (Transportation & Logistics)' isolates sector and cleans base."""
        res = self.engine.classify("Sales Experience (Transportation & Logistics)")
        self.assertEqual(res.typology, ParenthesisTypology.INDUSTRY_CONTEXT)
        self.assertEqual(res.industry_context, "Transportation & Logistics")
        self.assertEqual(res.cleaned_base_skill, "Sales")

    def test_18_industry_context_hospitality_leisure(self):
        """'Accounting Background (Hospitality/Leisure)' maps to industry context."""
        res = self.engine.classify("Accounting Background (Hospitality/Leisure)")
        self.assertEqual(res.typology, ParenthesisTypology.INDUSTRY_CONTEXT)
        self.assertEqual(res.industry_context, "Hospitality/Leisure")
        self.assertEqual(res.cleaned_base_skill, "Accounting")

    def test_19_industry_context_healthcare(self):
        """'Marketing (Healthcare & Medical Sciences)' maps to closed domain."""
        res = self.engine.classify("Marketing (Healthcare & Medical Sciences)")
        self.assertEqual(res.typology, ParenthesisTypology.INDUSTRY_CONTEXT)
        self.assertEqual(res.industry_context, "Healthcare & Medical Sciences")

    # ─── 6. CASE 5: SUB-SKILL SPECIFICATION (Compound-Shielded) ───────────────
    def test_20_subskill_specification_excel_cost_tracking(self):
        """'Advanced Excel (Cost & Quantity Tracking)' retains specification."""
        res = self.engine.classify("Advanced Excel (Cost & Quantity Tracking)")
        self.assertEqual(res.typology, ParenthesisTypology.SUB_SKILL_SPECIFICATION)
        self.assertEqual(res.sub_skills, ["Cost & Quantity Tracking"])
        self.assertEqual(res.base_text, "Advanced Excel")

    def test_21_subskill_specification_autocad(self):
        """'AutoCAD (2D & 3D Drafting)' extracts drafting specification."""
        res = self.engine.classify("AutoCAD (2D & 3D Drafting)")
        self.assertEqual(res.typology, ParenthesisTypology.SUB_SKILL_SPECIFICATION)
        self.assertEqual(res.base_text, "AutoCAD")

    def test_22_subskill_specification_sap_module(self):
        """'SAP (FICO)' extracts module as sub-skill specification."""
        res = self.engine.classify("SAP (FICO)")
        self.assertEqual(res.typology, ParenthesisTypology.SUB_SKILL_SPECIFICATION)
        self.assertEqual(res.sub_skills, ["FICO"])

    def test_22b_subskill_specification_with_protected_compound(self):
        """'DevOps Engineering (CI/CD, Kubernetes)' preserves CI/CD intact in specifications."""
        res = self.engine.classify("DevOps Engineering (CI/CD, Kubernetes)")
        self.assertEqual(res.typology, ParenthesisTypology.SUB_SKILL_SPECIFICATION)
        self.assertIn("CI/CD", res.sub_skills)
        self.assertIn("Kubernetes", res.sub_skills)

    # ─── 7. REGULATORY FORMS & STATUTORY SPECIFICATIONS ───────────────────────
    def test_23_regulatory_form_english(self):
        """'Social Insurance (Forms 1, 2, 6)' detected as regulatory form, not noise numbers."""
        res = self.engine.classify("Social Insurance (Forms 1, 2, 6)")
        self.assertEqual(res.typology, ParenthesisTypology.REGULATORY_FORM)
        self.assertTrue(res.is_regulatory_form)
        self.assertEqual(res.raw_content, "Forms 1, 2, 6")
        self.assertEqual(res.cleaned_base_skill, "Social Insurance")

    def test_24_regulatory_form_arabic(self):
        """'تأمينات اجتماعية (استمارة 1 و 2 و 6)' correctly detected as regulatory form."""
        res = self.engine.classify("تأمينات اجتماعية (استمارة 1 و 2 و 6)")
        self.assertEqual(res.typology, ParenthesisTypology.REGULATORY_FORM)
        self.assertTrue(res.is_regulatory_form)

    # ─── 8. VERSION & TECHNICAL DETAILS ───────────────────────────────────────
    def test_25_version_detail_python_3x(self):
        """'Python (3.x)' detected as technical version detail."""
        res = self.engine.classify("Python (3.x)")
        self.assertEqual(res.typology, ParenthesisTypology.VERSION_OR_TECH_DETAIL)
        self.assertEqual(res.cleaned_base_skill, "Python")

    def test_26_version_detail_angular_v14(self):
        """'Angular (v14+)' detected as version detail."""
        res = self.engine.classify("Angular (v14+)")
        self.assertEqual(res.typology, ParenthesisTypology.VERSION_OR_TECH_DETAIL)
        self.assertEqual(res.cleaned_base_skill, "Angular")

    # ─── 9. EMPTY & NOISE PARENTHESES ─────────────────────────────────────────
    def test_27_empty_parentheses(self):
        """'Python ()' is classified as EMPTY_OR_NOISE and base skill cleaned."""
        res = self.engine.classify("Python ()")
        self.assertEqual(res.typology, ParenthesisTypology.EMPTY_OR_NOISE)
        self.assertEqual(res.cleaned_base_skill, "Python")

    def test_28_noise_parentheses_etc(self):
        """'DevOps (etc.)' is classified as EMPTY_OR_NOISE."""
        res = self.engine.classify("DevOps (etc.)")
        self.assertEqual(res.typology, ParenthesisTypology.EMPTY_OR_NOISE)
        self.assertEqual(res.cleaned_base_skill, "DevOps")

    # ─── 10. MALFORMED & UNBALANCED PARENTHESES (Linear O(n) Scanner) ─────────
    def test_29_unclosed_opening_parenthesis(self):
        """'Python (Advanced' flagged as malformed without crashing or catastrophic backtracking."""
        res = self.engine.classify("Python (Advanced")
        self.assertTrue(res.is_malformed)
        self.assertIn("unclosed", res.malformed_reason.lower())
        self.assertEqual(res.base_text, "Python")

    def test_30_unopened_closing_parenthesis(self):
        """'Python Advanced)' flagged as malformed without crashing."""
        res = self.engine.classify("Python Advanced)")
        self.assertTrue(res.is_malformed)
        self.assertIn("unopened", res.malformed_reason.lower())

    def test_31_nested_parentheses_linear_safety(self):
        """'Excel (Advanced (Financial Modeling))' parsed outer span cleanly."""
        res = self.engine.classify("Excel (Advanced (Financial Modeling))")
        self.assertFalse(res.is_malformed)
        self.assertEqual(res.base_text, "Excel")
        self.assertIn("Financial Modeling", res.raw_content)

    def test_32_multiple_parenthetical_spans(self):
        """'Python (Advanced) & Docker (Intermediate)' decomposes multiple spans."""
        spans = self.engine.parse_spans("Python (Advanced) & Docker (Intermediate)")
        self.assertEqual(len(spans), 2)
        self.assertEqual(spans[0].inner_content, "Advanced")
        self.assertEqual(spans[1].inner_content, "Intermediate")

    # ─── 11. MULTI-PARENTHESIS CLASSIFY_ALL INTERFACE ─────────────────────────
    def test_33_classify_all_multiple_clauses(self):
        """'Python (Advanced) & Docker (Intermediate)' classifies BOTH clauses independently."""
        results = self.engine.classify_all("Python (Advanced) & Docker (Intermediate)")
        self.assertEqual(len(results), 2)

        # Clause 1: Python (Advanced)
        self.assertEqual(results[0].base_text, "Python")
        self.assertEqual(results[0].extracted_level, "Advanced")
        self.assertEqual(results[0].typology, ParenthesisTypology.LEVEL_OR_EXPERIENCE)
        self.assertEqual(results[0].span_index, 0)
        self.assertEqual(results[0].total_spans, 2)

        # Clause 2: Docker (Intermediate)
        self.assertEqual(results[1].base_text, "Docker")
        self.assertEqual(results[1].extracted_level, "Intermediate")
        self.assertEqual(results[1].typology, ParenthesisTypology.LEVEL_OR_EXPERIENCE)
        self.assertEqual(results[1].span_index, 1)
        self.assertEqual(results[1].total_spans, 2)

    def test_33b_classify_attaches_all_classifications(self):
        """classify() on multi-parenthesis string attaches all_classifications list."""
        res = self.engine.classify("Python (Advanced) & Docker (Intermediate)")
        self.assertEqual(len(res.all_classifications), 2)
        self.assertEqual(res.all_classifications[1].base_text, "Docker")

    # ─── 12. LENGTH GUARD & BOUNDARY SAFETY (No Silent Truncation) ────────────
    def test_34_extreme_length_guard_5000_chars_no_silent_truncation(self):
        """
        Strings exceeding 5000 chars are NOT silently truncated.
        Flagged as MALFORMED, raw_input preserved in full, and reason documented.
        """
        huge_str = "Python (" + "Advanced " * 1000 + ")"
        self.assertGreater(len(huge_str), 5000)
        res = self.engine.classify(huge_str)
        self.assertTrue(res.is_malformed)
        self.assertEqual(res.typology, ParenthesisTypology.MALFORMED)
        self.assertEqual(len(res.raw_input), len(huge_str))
        self.assertIn("exceeds maximum safe limit", res.malformed_reason)

    def test_35_arabic_experience_duration(self):
        """'إدارة مبيعات (خبرة 5 سنوات)' extracts Arabic duration."""
        res = self.engine.classify("إدارة مبيعات (خبرة 5 سنوات)")
        self.assertEqual(res.typology, ParenthesisTypology.LEVEL_OR_EXPERIENCE)
        self.assertIsNotNone(res.extracted_duration)
        self.assertIn("سنوات", res.extracted_duration)

    def test_36_no_parentheses_passthrough(self):
        """Plain skill string without parentheses returns NONE typology cleanly."""
        res = self.engine.classify("PostgreSQL")
        self.assertEqual(res.typology, ParenthesisTypology.NONE)
        self.assertEqual(res.raw_content, "")
        self.assertEqual(res.base_text, "PostgreSQL")
        self.assertEqual(res.cleaned_base_skill, "PostgreSQL")


if __name__ == "__main__":
    unittest.main()
