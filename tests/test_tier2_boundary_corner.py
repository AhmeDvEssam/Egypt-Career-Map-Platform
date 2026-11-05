"""
Tier 2: Boundary & Corner Cases Test Suite
==========================================
Validates system behavior on edge cases, extreme boundaries, unusual casing,
nested/malformed parentheses, Unicode, Arabic, and adversarial stress inputs.
"""

import time
import unittest
from tests.test_helpers import (
    OpaqueBoxTestCase,
    get_pipeline,
)


class TestTier2BoundaryAndCorner(OpaqueBoxTestCase):
    """Boundary, Corner, and Stress Test Cases."""

    @classmethod
    def setUpClass(cls):
        cls.pipeline = get_pipeline()

    # --------------------------------------------------------------------------
    # 1. Empty, Whitespace & Minimal Inputs
    # --------------------------------------------------------------------------
    def test_empty_string_input(self):
        """Empty string returns empty list without error."""
        res = self.pipeline.decompose("")
        self.assertEqual(res, [])

    def test_whitespace_only_input(self):
        """Whitespace-only string returns empty list without error."""
        for ws in ["   ", "\t", "\n", "\r\n", "  \t\n  "]:
            res = self.pipeline.decompose(ws)
            self.assertEqual(res, [], f"Failed on whitespace: {repr(ws)}")

    def test_single_character_input(self):
        """Single character invalid token is rejected cleanly."""
        res = self.pipeline.decompose("Z")
        self.assertEqual(len(res), 1)
        self.assertEqual(res[0]["match_status"], "REJECTED_NOISE")
        self.assertIn("short", res[0]["rejection_reason"].lower())

    def test_punctuation_only_input(self):
        """Punctuation-only string returns empty list or rejected noise."""
        for p in [";;;", "...", "---", ",,,", "///"]:
            res = self.pipeline.decompose(p)
            for r in res:
                self.assertEqual(r["match_status"], "REJECTED_NOISE")

    # --------------------------------------------------------------------------
    # 2. Extreme Length & High-Arity Inputs
    # --------------------------------------------------------------------------
    def test_extreme_length_500_chars(self):
        """500+ character string is processed within reasonable time without crashing."""
        long_skill = "Python & " * 60 + "SQL"
        t0 = time.perf_counter()
        res = self.pipeline.decompose(long_skill)
        elapsed = time.perf_counter() - t0
        self.assertLess(elapsed, 1.0, "Processing extreme length took too long")
        self.assertGreater(len(res), 10)

    def test_many_delimited_tokens(self):
        """String with 30 distinct skills is decomposed without dropping elements."""
        skills = [f"Skill{i}" for i in range(30)]
        raw = ", ".join(skills)
        res = self.pipeline.decompose(raw)
        self.assertEqual(len(res), 30)

    # --------------------------------------------------------------------------
    # 3. Delimiter Boundaries & Clustering
    # --------------------------------------------------------------------------
    def test_clustered_delimiters(self):
        """Clustered delimiters like '///' or '&&&' are handled cleanly without empty tokens."""
        raw = "Python /// SQL &&& Docker --- Git"
        res = self.pipeline.decompose(raw)
        atomic_names = [r["atomic_skill"] for r in res if r["match_status"] != "REJECTED_NOISE"]
        self.assertIn("Python", atomic_names)
        self.assertIn("SQL", atomic_names)
        self.assertIn("Docker", atomic_names)
        self.assertIn("Git", atomic_names)

    def test_leading_and_trailing_delimiters(self):
        """Leading and trailing delimiters are stripped cleanly."""
        raw = ", / & Python & SQL / ,"
        tokens = self.pipeline.decompose_to_tokens(raw)
        atomic_names = [t.atomic_skill for t in tokens if t.match_status != "REJECTED_NOISE"]
        self.assertEqual(atomic_names, ["Python", "SQL"])

    def test_pipe_and_rare_delimiters(self):
        """Pipe delimiters ' | ' split into clean atomic parts."""
        raw = "Python | SQL | Docker"
        tokens = self.pipeline.decompose_to_tokens(raw)
        atomic_names = [t.atomic_skill for t in tokens if t.match_status != "REJECTED_NOISE"]
        self.assertEqual(atomic_names, ["Python", "SQL", "Docker"])

    # --------------------------------------------------------------------------
    # 4. Parentheses Boundaries & Malformed Parentheses
    # --------------------------------------------------------------------------
    def test_empty_parentheses(self):
        """Empty parentheses 'Python ()' cleans to 'Python' without noise error."""
        tokens = self.pipeline.decompose_to_tokens("Python ()")
        self.assertEqual(len(tokens), 1)
        self.assertEqual(tokens[0].atomic_skill, "Python")

    def test_unmatched_opening_parenthesis(self):
        """Unmatched opening parenthesis 'Python (Advanced' is handled gracefully."""
        res = self.pipeline.decompose("Python (Advanced")
        self.assertGreaterEqual(len(res), 1)
        self.assertIn("Python", res[0]["atomic_skill"])

    def test_unmatched_closing_parenthesis(self):
        """Unmatched closing parenthesis 'Python Advanced)' is handled gracefully."""
        res = self.pipeline.decompose("Python Advanced)")
        self.assertGreaterEqual(len(res), 1)
        self.assertIn("Python", res[0]["atomic_skill"])

    def test_nested_parentheses(self):
        """Nested parentheses 'Excel (Advanced (Financial Modeling))' does not crash."""
        raw = "Excel (Advanced (Financial Modeling))"
        res = self.pipeline.decompose(raw)
        self.assertGreaterEqual(len(res), 1)
        self.assertEqual(res[0]["atomic_skill"], "Excel")

    def test_multiple_parenthetical_clauses(self):
        """Multiple distinct parentheses clauses in one string."""
        raw = "Python (Advanced) & Docker (Intermediate)"
        tokens = self.pipeline.decompose_to_tokens(raw)
        self.assertEqual(len(tokens), 2)
        self.assertEqual(tokens[0].atomic_skill, "Python")
        self.assertEqual(tokens[0].skill_level, "Advanced")
        self.assertEqual(tokens[1].atomic_skill, "Docker")
        self.assertEqual(tokens[1].skill_level, "Intermediate")

    # --------------------------------------------------------------------------
    # 5. Casing & Typography Variations
    # --------------------------------------------------------------------------
    def test_all_uppercase_casing(self):
        """All-uppercase skills match catalog."""
        tokens = self.pipeline.decompose_to_tokens("PYTHON")
        self.assertEqual(len(tokens), 1)
        self.assertEqual(tokens[0].atomic_skill.upper(), "PYTHON")
        self.assertIn(tokens[0].domain, ["Software Engineering & IT", "Data Science & Analytics"])

    def test_mixed_sponge_bob_casing(self):
        """Mixed casing 'pYtHoN' matches catalog."""
        tokens = self.pipeline.decompose_to_tokens("pYtHoN")
        self.assertEqual(len(tokens), 1)
        self.assertIn(tokens[0].domain, ["Software Engineering & IT", "Data Science & Analytics"])

    def test_level_all_caps(self):
        """All caps level 'ADVANCED PYTHON' preserves verbatim extracted level."""
        res = self.pipeline.decompose("ADVANCED PYTHON")
        self.assertEqual(res[0]["extracted_skill_level"], "ADVANCED")
        self.assertEqual(res[0]["skill_level"], "Advanced")

    # --------------------------------------------------------------------------
    # 6. Unicode, Special Characters & Arabic
    # --------------------------------------------------------------------------
    def test_unicode_smart_quotes(self):
        """Smart quotes around skill ‘Python’ are stripped cleanly."""
        tokens = self.pipeline.decompose_to_tokens("“Python”")
        self.assertEqual(len(tokens), 1)
        self.assertEqual(tokens[0].atomic_skill, "Python")

    def test_unicode_non_breaking_spaces(self):
        """Non-breaking space \\u00a0 is normalized."""
        res = self.pipeline.decompose("Python\u00a0SQL")
        self.assertGreaterEqual(len(res), 1)

    def test_zero_width_spaces(self):
        """Zero-width spaces do not corrupt tokenization."""
        res = self.pipeline.decompose("Python\u200bSQL")
        self.assertGreaterEqual(len(res), 1)

    def test_arabic_script_skills(self):
        """Arabic skill 'مهارات التواصل' resolves cleanly without crashing."""
        tokens = self.pipeline.decompose_to_tokens("مهارات التواصل")
        self.assertEqual(len(tokens), 1)
        res = self.pipeline.decompose("مهارات التواصل")
        self.assertGreaterEqual(len(res), 1)
        self.assert_14_column_contract(res[0], raw_skill="مهارات التواصل")

    def test_mixed_arabic_english(self):
        """Bilingual skill 'Python / برمجة بايثون' decomposes on slash."""
        tokens = self.pipeline.decompose_to_tokens("Python / برمجة بايثون")
        self.assertEqual(len(tokens), 2)
        self.assertEqual(tokens[0].atomic_skill, "Python")

    # --------------------------------------------------------------------------
    # 7. Versions, Numbers & Technical Codes
    # --------------------------------------------------------------------------
    def test_version_numbers_preserved(self):
        """Skill with version 'Python 3.12' or 'Angular 17' preserved."""
        for raw in ["Python 3.12", "Angular 17", "ISO 9001:2015"]:
            tokens = self.pipeline.decompose_to_tokens(raw)
            self.assertEqual(len(tokens), 1)
            self.assertTrue(len(tokens[0].atomic_skill) >= 3)

    def test_regulatory_law_number_preserved(self):
        """Egyptian Labor Law reference 'Labor Law 12/2003' is not split on slash."""
        tokens = self.pipeline.decompose_to_tokens("Labor Law 12/2003")
        self.assertEqual(len(tokens), 1)
        self.assertEqual(tokens[0].atomic_skill, "Labor Law 12/2003")
        res = self.pipeline.decompose("Labor Law 12/2003")
        self.assertGreaterEqual(len(res), 1)
        self.assertEqual(res[0]["atomic_skill"], "Labor Law 12/2003")


if __name__ == "__main__":
    unittest.main()
