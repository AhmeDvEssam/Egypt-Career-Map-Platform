"""
Unit Tests for Milestone 2: Parentheses Typology Engine
=======================================================
Validates the 5-way parenthetical classification, priority decision matrix,
linear O(n) algorithmic parsing, Arabic support, and boundary safety.
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

    # ─── 1. CASE 1: LEVEL OR EXPERIENCE (Proficiency) ─────────────────────────
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
        """'English (B2)' extracts CEFR B2 level."""
        res = self.engine.classify("English (B2)")
        self.assertEqual(res.typology, ParenthesisTypology.LEVEL_OR_EXPERIENCE)
        self.assertEqual(res.extracted_level, "B2")
        self.assertEqual(res.base_text, "English")

    def test_06_level_certification_status_certified(self):
        """'PMP (Certified)' extracts Certified status as level modifier."""
        res = self.engine.classify("PMP (Certified)")
        self.assertEqual(res.typology, ParenthesisTypology.LEVEL_OR_EXPERIENCE)
        self.assertEqual(res.extracted_level, "Certified")
        self.assertEqual(res.base_text, "PMP")

    def test_07_level_verbatim_casing_preserved(self):
        """Verbatim original casing preserved in extracted_level per Spec v3."""
        res = self.engine.classify("Docker (working knowledge)")
        self.assertEqual(res.typology, ParenthesisTypology.LEVEL_OR_EXPERIENCE)
        self.assertEqual(res.extracted_level, "working knowledge")

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

    # ─── 3. CASE 2: ACRONYM EXPANSION ─────────────────────────────────────────
    def test_11_acronym_full_to_acronym(self):
        """'Amazon Web Services (AWS)' resolves via AcronymResolver."""
        res = self.engine.classify("Amazon Web Services (AWS)")
        self.assertEqual(res.typology, ParenthesisTypology.ACRONYM_EXPANSION)
        self.assertEqual(res.acronym_token, "AWS")
        self.assertEqual(res.expanded_token, "Amazon Web Services")
        self.assertIn("AWS", res.cleaned_base_skill)

    def test_12_acronym_acronym_to_full(self):
        """'GTM (Google Tag Manager)' resolves reverse acronym expansion."""
        res = self.engine.classify("GTM (Google Tag Manager)")
        self.assertEqual(res.typology, ParenthesisTypology.ACRONYM_EXPANSION)
        self.assertEqual(res.acronym_token, "GTM")
        self.assertEqual(res.expanded_token, "Google Tag Manager")

    def test_13_acronym_rejection_of_arbitrary_words(self):
        """'Data Analysis (Machine Learning)' must NOT be classified as acronym expansion."""
        res = self.engine.classify("Data Analysis (Machine Learning)")
        self.assertNotEqual(res.typology, ParenthesisTypology.ACRONYM_EXPANSION)

    # ─── 4. CASE 3: CATEGORY CONTAINER ────────────────────────────────────────
    def test_14_category_container_dev_tools(self):
        """'Development Tools (Git, Jira)' decomposes into leaf items with container preserved."""
        res = self.engine.classify("Development Tools (Git, Jira)")
        self.assertEqual(res.typology, ParenthesisTypology.CATEGORY_CONTAINER)
        self.assertEqual(res.category_container, "Development Tools")
        self.assertEqual(res.leaf_tokens, ["Git", "Jira"])

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

    # ─── 6. CASE 5: SUB-SKILL SPECIFICATION ───────────────────────────────────
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

    # ─── 11. LENGTH GUARD & BOUNDARY SAFETY ───────────────────────────────────
    def test_33_extreme_length_guard_5000_chars(self):
        """Strings exceeding 5000 chars are safely truncated in O(1) time without memory explosion."""
        huge_str = "Python (" + "Advanced " * 1000 + ")"
        self.assertGreater(len(huge_str), 5000)
        res = self.engine.classify(huge_str)
        self.assertIsNotNone(res)

    def test_34_arabic_experience_duration(self):
        """'إدارة مبيعات (خبرة 5 سنوات)' extracts Arabic duration."""
        res = self.engine.classify("إدارة مبيعات (خبرة 5 سنوات)")
        self.assertEqual(res.typology, ParenthesisTypology.LEVEL_OR_EXPERIENCE)
        self.assertIsNotNone(res.extracted_duration)
        self.assertIn("سنوات", res.extracted_duration)

    def test_35_no_parentheses_passthrough(self):
        """Plain skill string without parentheses returns NONE typology cleanly."""
        res = self.engine.classify("PostgreSQL")
        self.assertEqual(res.typology, ParenthesisTypology.NONE)
        self.assertEqual(res.raw_content, "")
        self.assertEqual(res.base_text, "PostgreSQL")
        self.assertEqual(res.cleaned_base_skill, "PostgreSQL")


if __name__ == "__main__":
    unittest.main()
