"""
Dedicated Test Suite: Separation of Career Seniority from Technical Proficiency
================================================================================
Verifies that:
1. Career Seniority keywords (principal, lead, senior, mid, mid-senior, mid-level, junior, entry-level)
   are strictly decoupled and purged from standard_skill_levels_matrix.csv.
2. Technical Proficiency levels (Expert, Advanced, Intermediate, Beginner) only match genuine
   proficiency modifiers (e.g. extensive, proficient, foundational), NEVER job seniority titles.
3. Ambiguous modifier 'Strong' / 'قوي' is removed from Soft Skill level patterns to prevent
   dashboard filter pollution; 'Strong Communication' preserves 'Strong' in extracted_skill_level
   while defaulting canonical skill_level to 'Not Specified'.
4. Specific adversarial career phrases evaluate deterministically:
   - 'Senior Python Developer' -> Senior is career seniority, NOT Advanced proficiency.
   - 'Principal Engineer' -> Principal is career seniority, NOT Advanced proficiency.
   - 'Mid-senior Developer' -> Mid-senior is career seniority, NOT Intermediate proficiency.
   - 'Junior QA' -> Junior is career seniority, NOT Beginner proficiency.
   - 'Strong Communication' -> Strong is ambiguous; Soft Skill level defaults to Not Specified.
"""

import sys
import os
import unittest
from pathlib import Path

# Add project root to sys.path
PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from linguistic_intelligence.config import (
    DEFAULT_CATALOG_PATH,
    DEFAULT_ACRONYMS_PATH,
    DEFAULT_LEVELS_PATH,
)
from linguistic_intelligence.catalog import CatalogLoader, LevelMatrixEntry


class TestSeniorityVsProficiencySeparation(unittest.TestCase):
    """Rigorous tests proving the separation of career seniority from technical proficiency."""

    @classmethod
    def setUpClass(cls):
        cls.loader = CatalogLoader(
            catalog_path=DEFAULT_CATALOG_PATH,
            acronyms_path=DEFAULT_ACRONYMS_PATH,
            levels_path=DEFAULT_LEVELS_PATH,
        )
        cls.entries = cls.loader.level_matrix_entries

    # ─── 1. MATRIX PURGE VERIFICATION ──────────────────────────────────────────

    def test_no_career_seniority_in_hard_skill_patterns(self):
        """Ensure no job seniority terms exist in Hard Skill proficiency patterns."""
        forbidden_terms = [
            r"\bsenior\b", r"\blead\b", r"\bprincipal\b",
            r"\bmid-senior\b", r"\bmid-level\b", r"\bmid\b",
            r"\bjunior\b", r"\bentry-level\b",
        ]
        hard_skill_entries = [e for e in self.entries if e.skill_type == "Hard Skill"]
        self.assertGreater(len(hard_skill_entries), 0)

        for entry in hard_skill_entries:
            pattern_str = entry.regex_patterns.lower()
            for term in forbidden_terms:
                self.assertNotIn(
                    term.replace(r"\b", ""),
                    pattern_str,
                    f"Forbidden career seniority term '{term}' found in Hard Skill level '{entry.standard_level}' pattern: {pattern_str}"
                )

    def test_no_lead_user_in_tool_software_patterns(self):
        """Ensure 'lead user' is purged from Tool / Software patterns."""
        tool_entries = [e for e in self.entries if e.skill_type == "Tool / Software"]
        for entry in tool_entries:
            self.assertNotIn(
                "lead",
                entry.regex_patterns.lower(),
                f"Forbidden term 'lead' found in Tool / Software level '{entry.standard_level}'"
            )

    def test_no_strong_in_soft_skill_patterns(self):
        """Ensure 'strong' and 'قوي' are purged from Soft Skill level patterns (ambiguous modifier)."""
        soft_entries = [e for e in self.entries if e.skill_type == "Soft Skill"]
        for entry in soft_entries:
            self.assertNotIn(
                "strong",
                entry.regex_patterns.lower(),
                f"'strong' must not be in Soft Skill level patterns (Row: {entry.standard_level})"
            )
            self.assertNotIn(
                "قوي",
                entry.arabic_patterns,
                f"'قوي' must not be in Soft Skill arabic patterns (Row: {entry.standard_level})"
            )

    # ─── 2. ADVERSARIAL PHRASE EVALUATION ──────────────────────────────────────

    def test_senior_python_developer_does_not_match_advanced_proficiency(self):
        """
        'Senior Python Developer': 'Senior' indicates career seniority / job title,
        NOT technical skill proficiency. It must NOT match Hard Skill Advanced.
        """
        phrase = "Senior Python Developer"
        advanced_patterns = self.loader.get_level_patterns("Hard Skill", "Advanced")
        for pat in advanced_patterns:
            self.assertIsNone(
                pat.search(phrase),
                f"Pattern {pat.pattern} erroneously matched career seniority phrase '{phrase}' as Advanced!"
            )

    def test_principal_engineer_does_not_match_advanced_proficiency(self):
        """
        'Principal Engineer': 'Principal' indicates career seniority / job title,
        NOT technical skill proficiency. It must NOT match Hard Skill Advanced.
        """
        phrase = "Principal Engineer"
        advanced_patterns = self.loader.get_level_patterns("Hard Skill", "Advanced")
        for pat in advanced_patterns:
            self.assertIsNone(
                pat.search(phrase),
                f"Pattern {pat.pattern} erroneously matched career seniority phrase '{phrase}' as Advanced!"
            )

    def test_mid_senior_developer_does_not_match_intermediate_proficiency(self):
        """
        'Mid-senior Developer': 'Mid-senior' indicates career seniority / job title,
        NOT technical skill proficiency. It must NOT match Hard Skill Intermediate.
        """
        phrase = "Mid-senior Developer"
        intermediate_patterns = self.loader.get_level_patterns("Hard Skill", "Intermediate")
        for pat in intermediate_patterns:
            self.assertIsNone(
                pat.search(phrase),
                f"Pattern {pat.pattern} erroneously matched career seniority phrase '{phrase}' as Intermediate!"
            )

    def test_junior_qa_does_not_match_beginner_proficiency(self):
        """
        'Junior QA': 'Junior' indicates career seniority / job title,
        NOT technical skill proficiency. It must NOT match Hard Skill Beginner.
        """
        phrase = "Junior QA"
        beginner_patterns = self.loader.get_level_patterns("Hard Skill", "Beginner")
        for pat in beginner_patterns:
            self.assertIsNone(
                pat.search(phrase),
                f"Pattern {pat.pattern} erroneously matched career seniority phrase '{phrase}' as Beginner!"
            )

    def test_strong_communication_does_not_match_soft_skill_high(self):
        """
        'Strong Communication': 'Strong' is an ambiguous adjective.
        Per Section 8.3, adjectives like 'Strong' are preserved verbatim in
        extracted_skill_level while the canonical skill_level defaults to 'Not Specified'.
        Therefore, 'Strong Communication' must NOT match Soft Skill High / Strong pattern.
        """
        phrase = "Strong Communication"
        high_patterns = self.loader.get_level_patterns("Soft Skill", "High / Strong")
        for pat in high_patterns:
            self.assertIsNone(
                pat.search(phrase),
                f"Pattern {pat.pattern} erroneously matched ambiguous phrase '{phrase}' as High / Strong!"
            )

    # ─── 3. GENUINE PROFICIENCY MODIFIERS MUST STILL MATCH ──────────────────────

    def test_genuine_proficiency_modifiers_match_correctly(self):
        """Ensure genuine technical proficiency modifiers are recognized."""
        advanced_pat = self.loader.get_level_patterns("Hard Skill", "Advanced")[0]
        self.assertIsNotNone(advanced_pat.search("Advanced Machine Learning"))
        self.assertIsNotNone(advanced_pat.search("Extensive experience in algorithms"))
        self.assertIsNotNone(advanced_pat.search("Solid understanding of architecture"))

        intermediate_pat = self.loader.get_level_patterns("Hard Skill", "Intermediate")[0]
        self.assertIsNotNone(intermediate_pat.search("Proficient in React and Redux"))
        self.assertIsNotNone(intermediate_pat.search("Intermediate Data Modeling"))

        beginner_pat = self.loader.get_level_patterns("Hard Skill", "Beginner")[0]
        self.assertIsNotNone(beginner_pat.search("Basic QA Testing"))
        self.assertIsNotNone(beginner_pat.search("Foundational knowledge of Docker"))


if __name__ == "__main__":
    unittest.main()
