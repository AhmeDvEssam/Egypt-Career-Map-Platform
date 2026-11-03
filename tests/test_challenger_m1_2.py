"""
Milestone 1 Challenger 2 Empirical Stress Test Suite
====================================================
Empirically stress-tests Pass 0 Proper Noun Shielding and Acronym Engine
(`linguistic_intelligence/proper_nouns.py`).
"""

import json
import unittest
from pathlib import Path

from linguistic_intelligence.proper_nouns import (
    AcronymEntry,
    AcronymResolver,
    ProperNounShield,
    is_protected_proper_noun,
    is_protected_compound,
)
from linguistic_intelligence.catalog import CatalogLoader


class TestProperNounShieldBoundaries(unittest.TestCase):
    """Stress-tests boundary between proper nouns and level/title modifiers."""

    def setUp(self):
        self.resolver = AcronymResolver()
        self.shield = ProperNounShield(self.resolver)

    def test_dispatch_positive_proper_nouns_shielded(self):
        """
        Tests the 14 positive cases specified in DISPATCH.md that MUST be shielded.
        Documents any failures as empirical findings.
        """
        required_positives = [
            "Lead Generation",
            "Lead Nurturing",
            "Lead Qualification",
            "Lead Time Reduction",
            "Senior Care",
            "Senior Living",
            "GitHub Advanced Security",
            "Office 365 Advanced Threat Protection",
            "Master Data Management",
            "Scrum Master",
            "SOLID Principles",
            "Deep Learning",
            "Google Tag Manager",
            "Adobe Experience Manager",
        ]

        failures = []
        for term in required_positives:
            is_prot = self.shield.is_protected_proper_noun(term)
            pass0_res = self.shield.evaluate_pass_0(term)
            if not (is_prot and pass0_res.is_shielded):
                failures.append({
                    "term": term,
                    "is_protected": is_prot,
                    "pass0_shielded": pass0_res.is_shielded,
                })

        # We assert failures list is empty — if not, failure message details exact terms
        self.assertEqual(
            failures,
            [],
            f"Failed to shield {len(failures)} required positive proper nouns: {failures}",
        )

    def test_dispatch_negative_modifier_cases_not_shielded(self):
        """
        Tests the 6 negative cases specified in DISPATCH.md that MUST NOT be shielded.
        They must allow level stripping.
        """
        negatives = [
            "Lead Developer",
            "Senior Python Developer",
            "Advanced SQL",
            "Mastery of Python",
            "Solid understanding of Git",
            "Deep knowledge of Kubernetes",
        ]

        for term in negatives:
            self.assertFalse(
                self.shield.is_protected_proper_noun(term),
                f"Negative case '{term}' was incorrectly marked as protected proper noun",
            )
            pass0_res = self.shield.evaluate_pass_0(term)
            self.assertFalse(
                pass0_res.is_shielded,
                f"Negative case '{term}' was incorrectly shielded in Pass 0",
            )

    def test_negative_cases_should_not_inhibit_level_stripping(self):
        """Verifies should_inhibit_level_stripping returns False for negative modifier cases."""
        negative_pairs = [
            ("Lead Developer", "lead"),
            ("Senior Python Developer", "senior"),
            ("Advanced SQL", "advanced"),
            ("Mastery of Python", "mastery"),
            ("Solid understanding of Git", "solid"),
            ("Deep knowledge of Kubernetes", "deep"),
        ]

        for text, kw in negative_pairs:
            self.assertFalse(
                self.shield.should_inhibit_level_stripping(text, kw),
                f"should_inhibit_level_stripping incorrectly returned True for '{text}' with kw '{kw}'",
            )

    def test_extended_advanced_threat_protection_products(self):
        """Verifies full product names containing 'Advanced Threat Protection' are shielded."""
        atp_products = [
            "Office 365 Advanced Threat Protection",
            "Windows Defender Advanced Threat Protection",
            "Azure Advanced Threat Protection",
        ]
        failures = []
        for prod in atp_products:
            if not self.shield.is_protected_proper_noun(prod):
                failures.append(prod)
        self.assertEqual(failures, [], f"ATP products not shielded: {failures}")

    def test_scrum_master_variations(self):
        """Verifies Agile Scrum Master variations."""
        variations = [
            "Scrum Master",
            "Professional Scrum Master",
            "Agile Scrum Master",
            "Agile/Scrum Master",
        ]
        failures = []
        for var in variations:
            if not self.shield.is_protected_proper_noun(var):
                failures.append(var)
        self.assertEqual(failures, [], f"Scrum master variations not shielded: {failures}")

    def test_manager_guardrails_in_should_inhibit(self):
        """Verifies should_inhibit_level_stripping protects products ending in Manager."""
        manager_tools = [
            ("Google Tag Manager", "manager"),
            ("Adobe Experience Manager", "manager"),
        ]
        failures = []
        for term, kw in manager_tools:
            if not self.shield.should_inhibit_level_stripping(term, kw):
                failures.append(term)
        self.assertEqual(failures, [], f"Manager tools failed inhibit check: {failures}")


class TestAcronymResolverCollisionsAndIntegrity(unittest.TestCase):
    """Stress-tests AcronymResolver collisions, symbol handling, and dictionary integrity."""

    def setUp(self):
        self.resolver = AcronymResolver()
        self.shield = ProperNounShield(self.resolver)

    def test_ad_pm_en_case_sensitivity(self):
        """Verifies AD, PM, EN do not collide with lowercase English words."""
        # Uppercase must resolve
        self.assertIsNotNone(self.resolver.get_acronym("AD"))
        self.assertEqual(self.resolver.get_acronym("AD").canonical_skill_name, "Azure Active Directory")

        self.assertIsNotNone(self.resolver.get_acronym("PM"))
        self.assertEqual(self.resolver.get_acronym("PM").canonical_skill_name, "SAP Plant Maintenance")

        self.assertIsNotNone(self.resolver.get_acronym("EN"))
        self.assertEqual(self.resolver.get_acronym("EN").canonical_skill_name, "European Standards")

        # Lowercase must NOT resolve
        self.assertIsNone(self.resolver.get_acronym("ad"))
        self.assertIsNone(self.resolver.get_acronym("pm"))
        self.assertIsNone(self.resolver.get_acronym("en"))
        self.assertIsNone(self.resolver.get_acronym("Ad"))
        self.assertIsNone(self.resolver.get_acronym("Pm"))
        self.assertIsNone(self.resolver.get_acronym("En"))

    def test_all_386_acronyms_retrievable_and_expandable(self):
        """Verifies all 386 acronym entries can be retrieved and expanded."""
        dict_path = Path("skills_acronym_dictionary.json")
        self.assertTrue(dict_path.exists())
        with open(dict_path, "r", encoding="utf-8") as f:
            data = json.load(f)

        self.assertEqual(len(data), 386)
        self.assertEqual(len(self.resolver.acronyms), 386)

        unretrievable = []
        unexpandable = []
        for key, entry in data.items():
            acr = entry.get("acronym", key.upper())
            res = self.resolver.get_acronym(acr)
            if res is None:
                unretrievable.append((key, acr))
            else:
                exp = self.resolver.expand(acr)
                if not exp:
                    unexpandable.append((key, acr))

        self.assertEqual(unretrievable, [], f"Unretrievable acronyms: {unretrievable}")
        self.assertEqual(unexpandable, [], f"Unexpandable acronyms: {unexpandable}")

    def test_symbol_bearing_acronyms_and_compounds(self):
        """Verifies behavior for symbol-bearing terms C++, C#, PL/SQL, CI/CD, UI/UX, R&D."""
        # Compounds check
        self.assertTrue(self.shield.is_protected_compound("PL/SQL"))
        self.assertTrue(self.shield.is_protected_compound("pl/sql"))
        self.assertTrue(self.shield.is_protected_compound("CI/CD"))
        self.assertTrue(self.shield.is_protected_compound("ci/cd"))
        self.assertTrue(self.shield.is_protected_compound("UI/UX"))
        self.assertTrue(self.shield.is_protected_compound("ui/ux"))
        self.assertTrue(self.shield.is_protected_compound("R&D"))
        self.assertTrue(self.shield.is_protected_compound("r&d"))
        self.assertTrue(self.shield.is_protected_compound("c/c++"))

        # Acronym expansions
        self.assertEqual(self.resolver.expand("CI/CD"), "CI/CD Pipelines")
        self.assertEqual(self.resolver.expand("UI/UX"), "UI/UX Design")
        self.assertEqual(self.resolver.expand("R&D"), "Research & Development")

    def test_lowercase_common_word_collisions(self):
        """
        Probes collision vulnerabilities for common lowercase English words.
        Words like 'she', 'his', 'sit', 'ran' should not resolve to obscure acronyms
        when provided in lowercase text.
        """
        vulnerable_words = ["she", "his", "sit", "ran"]
        accidental_resolutions = []
        for w in vulnerable_words:
            res = self.resolver.get_acronym(w)
            if res is not None:
                accidental_resolutions.append((w, res.canonical_skill_name))

        # This documents whether lowercase words accidentally resolve
        self.assertEqual(
            accidental_resolutions,
            [],
            f"Common lowercase words accidentally resolved to acronyms: {accidental_resolutions}",
        )

    def test_acronym_expansion_pair_robustness(self):
        """Probes edge cases and false positives in is_acronym_expansion_pair."""
        # Valid pairs must return True
        self.assertTrue(self.resolver.is_acronym_expansion_pair("AWS", "Amazon Web Services"))
        self.assertTrue(self.resolver.is_acronym_expansion_pair("ADAS", "Advanced Driver Assistance Systems"))
        self.assertTrue(self.resolver.is_acronym_expansion_pair("UI/UX", "UI/UX Design"))

        # Edge cases that MUST return False
        self.assertFalse(self.resolver.is_acronym_expansion_pair("", ""), "Empty strings returned True")
        self.assertFalse(self.resolver.is_acronym_expansion_pair("", "   "), "Whitespace returned True")
        self.assertFalse(self.resolver.is_acronym_expansion_pair("p", "Python"), "Single letter returned True")
        self.assertFalse(self.resolver.is_acronym_expansion_pair("j", "Java"), "Single letter returned True")


if __name__ == "__main__":
    unittest.main()
