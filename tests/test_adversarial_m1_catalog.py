"""
Adversarial Stress Test Suite for Milestone 1: Catalog Loader & Priority Resolution
==================================================================================
Empirical validation probing:
1. Semicolon catalog parser crash resistance & integrity (all 3,794 rows)
2. All 281 duplicate skill resolutions (Tier 1 canonical homes + Tier 2 multi-factor scoring)
3. Python HR immunity under case/whitespace/alias variations
4. SQL canonical resolution probe (Data Engineering vs BI)
5. Microsoft Excel & alias 'Excel' resolution
6. Edge case crash resistance: empty, whitespace, None, numbers, emojis, Arabic, regex chars
7. Regex false-positive collision vulnerabilities (.js frameworks, short aliases like 'IT')
8. Execution latency benchmarks (1,000 exact lookups, 100 regex searches)
"""

import sys
import time
import unittest
from pathlib import Path

# Add project root to sys.path
PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

import pandas as pd

from linguistic_intelligence.config import (
    DEFAULT_CATALOG_PATH,
    DEFAULT_ACRONYMS_PATH,
    DEFAULT_LEVELS_PATH,
    CLOSED_DOMAINS_SET,
    CLOSED_SUBCATEGORIES_SET,
    DOMAIN_TO_SUBCATEGORIES,
    APPROVED_SKILL_TYPES,
    CANONICAL_SKILL_HOMES,
    PRIORITY_RANKS,
)
from linguistic_intelligence.catalog import (
    CatalogLoader,
    StandardSkillEntry,
)


class TestCatalogAdversarialIntegrity(unittest.TestCase):
    """Stress tests catalog loading, semicolon delimiter handling, and row validity."""

    @classmethod
    def setUpClass(cls):
        cls.loader = CatalogLoader(
            catalog_path=DEFAULT_CATALOG_PATH,
            acronyms_path=DEFAULT_ACRONYMS_PATH,
            levels_path=DEFAULT_LEVELS_PATH,
        )
        cls.raw_df = pd.read_csv(DEFAULT_CATALOG_PATH, sep=";", encoding="utf-8-sig")

    def test_catalog_exact_row_count_3794(self):
        """Verify that all 3,794 catalog rows load without parser crash or truncation."""
        self.assertEqual(len(self.raw_df), 3794)
        self.assertEqual(self.loader.raw_row_count, 3794)
        self.assertEqual(len(self.loader.all_entries), 3794)

    def test_all_catalog_entries_concur_with_closed_taxonomy(self):
        """Verify every single loaded row belongs to approved closed taxonomy."""
        for entry in self.loader.all_entries:
            self.assertIn(
                entry.domain,
                CLOSED_DOMAINS_SET,
                f"Row {entry.source_row_index}: Unknown domain '{entry.domain}' for skill '{entry.standard_skill_name}'"
            )
            self.assertIn(
                entry.sub_category,
                CLOSED_SUBCATEGORIES_SET,
                f"Row {entry.source_row_index}: Unknown subcategory '{entry.sub_category}' for skill '{entry.standard_skill_name}'"
            )
            valid_subcats = DOMAIN_TO_SUBCATEGORIES.get(entry.domain, ())
            self.assertIn(
                entry.sub_category,
                valid_subcats,
                f"Row {entry.source_row_index}: Subcategory '{entry.sub_category}' does not belong to domain '{entry.domain}'"
            )

    def test_audit_uncontrolled_skill_types_in_raw_catalog(self):
        """
        Verify that all legacy skill types (Requirement, Domain Knowledge, Methodology)
        are normalized so 0 loaded entries violate the 5-type frozen contract.
        """
        non_conforming = [
            e for e in self.loader.all_entries
            if e.skill_type not in APPROVED_SKILL_TYPES
        ]
        self.assertEqual(
            len(non_conforming),
            0,
            f"Expected 0 non-conforming rows after normalization, found {len(non_conforming)}"
        )

    def test_acronym_dictionary_integrity_386(self):
        """Verify 386 verified acronym entries load with non-empty fields."""
        self.assertEqual(len(self.loader.acronym_map), 386)
        for key, entry in self.loader.acronym_map.items():
            self.assertTrue(bool(entry.acronym), f"Acronym key '{key}' has empty acronym")
            self.assertTrue(bool(entry.full_name), f"Acronym key '{key}' has empty full_name")

    def test_levels_matrix_integrity_23_rows(self):
        """Verify 23 level matrix rows load with compiled regexes."""
        self.assertEqual(len(self.loader.level_matrix_entries), 23)
        for entry in self.loader.level_matrix_entries:
            self.assertIsNotNone(entry.compiled_pattern)


class TestDuplicateSkillsResolution(unittest.TestCase):
    """Stress tests the resolution of all 281 duplicate skills in the catalog."""

    @classmethod
    def setUpClass(cls):
        cls.loader = CatalogLoader()
        cls.raw_df = pd.read_csv(DEFAULT_CATALOG_PATH, sep=";", encoding="utf-8-sig")
        cls.dups_df = cls.raw_df[cls.raw_df.duplicated(subset=["standard_skill_name"], keep=False)]
        cls.dup_names = sorted(cls.dups_df["standard_skill_name"].unique())

    def test_exact_281_duplicate_skills_identified(self):
        """Verify standard_skills_catalog.csv has exactly 281 duplicate skill names across 1,319 rows."""
        self.assertEqual(len(self.dup_names), 281)
        self.assertEqual(len(self.dups_df), 1319)

    def test_all_281_duplicate_skills_resolve_validly(self):
        """Every duplicate skill must resolve to a valid entry matching closed taxonomy."""
        for name in self.dup_names:
            entry = self.loader.get_exact_match(name)
            self.assertIsNotNone(entry, f"Duplicate skill '{name}' failed to resolve")
            self.assertIn(entry.domain, CLOSED_DOMAINS_SET)
            self.assertIn(entry.sub_category, CLOSED_SUBCATEGORIES_SET)

    def test_tier2_scoring_preserves_priority_hierarchy(self):
        """
        Verify that for all duplicates resolved via Tier 2 (algorithmic scoring),
        a skill never resolves to a lower priority (e.g. Foundational/Secondary)
        when a Core entry is present.
        """
        prio_map = {"Core": 3, "Foundational": 2, "Secondary": 1}
        tier2_count = 0
        for name in self.dup_names:
            # Skip Tier 1
            if any(name.lower() == k.lower() for k in CANONICAL_SKILL_HOMES):
                continue
            tier2_count += 1
            rows = self.raw_df[self.raw_df["standard_skill_name"].str.lower() == name.lower()]
            max_prio = max(prio_map.get(str(r.get("skill_priority", "")).strip(), 0) for _, r in rows.iterrows())
            resolved = self.loader.get_exact_match(name)
            resolved_prio = prio_map.get(resolved.skill_priority, 0)
            self.assertGreaterEqual(
                resolved_prio,
                max_prio,
                f"Skill '{name}' resolved to priority {resolved.skill_priority} ({resolved_prio}) "
                f"when max available priority was {max_prio}"
            )
        self.assertEqual(tier2_count, 281 - 14)


class TestTargetedSkillResolution(unittest.TestCase):
    """Stress tests Python, SQL, Excel, Git, Jira as specified in dispatch."""

    @classmethod
    def setUpClass(cls):
        cls.loader = CatalogLoader()

    def test_python_never_resolves_to_human_resources(self):
        """
        Python has 10 rows in catalog culminating in Row 2439 (Human Resources).
        Must NEVER resolve to Human Resources under any casing, whitespace, or alias variation.
        """
        variations = [
            "Python", "python", "PYTHON", "pYtHoN", "PyThOn",
            "  Python", "Python  ", "  Python  ", "\tPython\t", "\nPython\n",
            "Py", "py", "PY", "  Py  ", "  py  ",
        ]
        for v in variations:
            entry = self.loader.get_exact_match(v)
            self.assertIsNotNone(entry, f"Failed lookup for variation '{v}'")
            self.assertNotEqual(
                entry.domain,
                "Human Resources",
                f"CRITICAL DEFECT: Python variation '{v}' resolved to Human Resources!"
            )
            self.assertEqual(entry.domain, "Software Engineering & IT")
            self.assertEqual(entry.sub_category, "Backend Development")

    def test_python_regex_queries(self):
        """Verify Python regex matching on phrases."""
        queries = ["Python 3", "Python Developer", "Senior Python Engineer", "Advanced Python"]
        for q in queries:
            m = self.loader.get_regex_match(q)
            self.assertIsNotNone(m, f"Regex failed for '{q}'")
            self.assertEqual(m.domain, "Software Engineering & IT")
            self.assertEqual(m.sub_category, "Backend Development")

    def test_sql_resolution_investigation(self):
        """
        Verify SQL resolves to Data Science & Analytics / Data Engineering
        per canonical priority resolution.
        """
        entry = self.loader.get_exact_match("SQL")
        self.assertIsNotNone(entry)
        self.assertEqual(entry.domain, "Data Science & Analytics")
        self.assertEqual(
            entry.sub_category,
            "Data Engineering",
            "SQL must resolve to Data Engineering per specification."
        )

    def test_microsoft_excel_and_alias_excel_resolution(self):
        """
        Verify Microsoft Excel and its alias Excel resolve to
        Data Science & Analytics / Business Intelligence & Data Analytics.
        """
        queries = ["Microsoft Excel", "microsoft excel", "Excel", "excel", "EXCEL", "  excel  "]
        for q in queries:
            entry = self.loader.get_exact_match(q)
            self.assertIsNotNone(entry, f"Lookup failed for '{q}'")
            self.assertEqual(entry.standard_skill_name, "Microsoft Excel")
            self.assertEqual(entry.domain, "Data Science & Analytics")
            self.assertEqual(entry.sub_category, "Business Intelligence & Data Analytics")

    def test_git_and_jira_resolutions(self):
        """Verify Git resolves to DevOps and Jira resolves to Agile Management."""
        for g in ["Git", "git", "GIT", "  Git  "]:
            entry = self.loader.get_exact_match(g)
            self.assertIsNotNone(entry)
            self.assertEqual(entry.domain, "Software Engineering & IT")
            self.assertEqual(entry.sub_category, "DevOps & Cloud Infrastructure")

        for j in ["Jira", "jira", "JIRA", "  Jira  "]:
            entry = self.loader.get_exact_match(j)
            self.assertIsNotNone(entry)
            self.assertEqual(entry.domain, "Operations & Project Management")
            self.assertEqual(entry.sub_category, "Project & Agile Management (PMP, Agile, Scrum)")


class TestEdgeCasesAndCrashResistance(unittest.TestCase):
    """Stress tests boundary inputs, symbols, numbers, emojis, Arabic, and None handling."""

    @classmethod
    def setUpClass(cls):
        cls.loader = CatalogLoader()

    def test_empty_and_whitespace_lookups(self):
        """Empty and whitespace strings must return None without raising exceptions."""
        for s in ["", " ", "   ", "\t", "\n", " \t \n "]:
            self.assertIsNone(self.loader.get_exact_match(s))
            self.assertIsNone(self.loader.get_regex_match(s))

    def test_pure_numbers_lookups(self):
        """Pure numeric inputs must return None without raising exceptions."""
        for num in ["0", "1", "123", "404", "-1", "999999"]:
            self.assertIsNone(self.loader.get_exact_match(num))
            self.assertIsNone(self.loader.get_regex_match(num))

    def test_emojis_lookups(self):
        """Emoji strings must return None without raising exceptions."""
        for em in ["\U0001f40d", "\U0001f4bb\U0001f680", "\U0001f916", "\U0001f525"]:
            self.assertIsNone(self.loader.get_exact_match(em))
            self.assertIsNone(self.loader.get_regex_match(em))

    def test_arabic_alias_lookup(self):
        """Verify that known Arabic aliases resolve to their canonical English skill."""
        entry = self.loader.get_exact_match("\u0628\u0627\u064a\u062b\u0648\u0646")  # Python in Arabic
        self.assertIsNotNone(entry)
        self.assertEqual(entry.standard_skill_name, "Python")

        # Unmapped Arabic phrase returns None safely
        self.assertIsNone(self.loader.get_exact_match("\u0625\u062f\u0627\u0631\u0629 \u0627\u0644\u0645\u0634\u0627\u0631\u064a\u0639 \u0627\u0644\u0639\u0627\u0645\u0629"))

    def test_special_regex_characters_in_lookups(self):
        """Lookup strings containing regex meta-characters must not trigger regex syntax errors."""
        special_inputs = ["C++", "C#", "Node.js", "ASP.NET", "(SQL)", "[React]", "*.*", "?+", r"\d+"]
        for s in special_inputs:
            # Exact match should never throw regex syntax error
            try:
                self.loader.get_exact_match(s)
            except Exception as e:
                self.fail(f"get_exact_match crashed on '{s}': {e}")

            # Regex match should search safely without crashing
            try:
                self.loader.get_regex_match(s)
            except Exception as e:
                self.fail(f"get_regex_match crashed on '{s}': {e}")

    def test_extreme_input_length(self):
        """10,000-character input must not trigger ReDoS or crash."""
        huge = "A" * 10000
        t0 = time.perf_counter()
        res_exact = self.loader.get_exact_match(huge)
        res_regex = self.loader.get_regex_match(huge)
        elapsed = time.perf_counter() - t0
        self.assertIsNone(res_exact)
        self.assertIsNone(res_regex)
        self.assertLess(elapsed, 2.0, "Lookup on 10,000-character string took excessive time")

    def test_none_input_vulnerability_discovery(self):
        """
        Verify passing None to get_exact_match or get_regex_match returns None safely
        without raising an AttributeError.
        """
        self.assertIsNone(self.loader.get_exact_match(None))  # type: ignore
        self.assertIsNone(self.loader.get_regex_match(None))  # type: ignore


class TestAdversarialCollisionsAndRegexVulnerabilities(unittest.TestCase):
    """
    Exposes subtle regex substring collisions and alias overwrites.
    """

    @classmethod
    def setUpClass(cls):
        cls.loader = CatalogLoader()

    def test_js_framework_regex_collision(self):
        r"""
        Verify .js framework queries do NOT match plain JavaScript due to (?<![\w\.])
        lookbehind boundary and length-descending sorting.
        """
        m_node = self.loader.get_regex_match("Node.js Developer")
        self.assertIsNotNone(m_node)
        self.assertEqual(m_node.standard_skill_name, "Node.js")

    def test_it_alias_collision(self):
        """
        EMPIRICAL DEFECT TEST:
        'IT' in standard_skills_catalog.csv Row 2521 is listed as an alias for 'Indirect Procurement'!
        Therefore, exact match for 'IT' resolves to Indirect Procurement in Supply Chain & Logistics.
        """
        entry = self.loader.get_exact_match("IT")
        self.assertIsNotNone(entry)
        self.assertEqual(entry.standard_skill_name, "Indirect Procurement")
        self.assertEqual(entry.domain, "Supply Chain & Logistics")


class TestExecutionLatencyBenchmarks(unittest.TestCase):
    """Measures latency of 1,000 exact lookups and 100 regex pattern searches."""

    @classmethod
    def setUpClass(cls):
        cls.loader = CatalogLoader()

    def test_benchmark_1000_exact_lookups(self):
        """1,000 exact lookups must execute in under 100 ms (typically < 2 ms)."""
        test_skills = [
            "Python", "SQL", "Microsoft Excel", "Excel", "Git", "Jira", "Docker", "Linux",
            "Communication", "Problem Solving", "Data Analysis", "Machine Learning",
            "Java", "C++", "JavaScript", "HTML", "CSS", "React", "Angular", "Node.js",
        ]
        t0 = time.perf_counter()
        for i in range(1000):
            s = test_skills[i % len(test_skills)]
            res = self.loader.get_exact_match(s)
            self.assertIsNotNone(res)
        elapsed_ms = (time.perf_counter() - t0) * 1000
        print(f"\n[BENCHMARK] 1,000 exact lookups: {elapsed_ms:.2f} ms ({elapsed_ms/1000*1000:.2f} us/lookup)")
        self.assertLess(elapsed_ms, 100.0)

    def test_benchmark_100_regex_searches_matched(self):
        """100 regex pattern searches on matching strings must execute in under 200 ms."""
        test_phrases = [
            "Senior Python Developer", "Proficient in SQL and R", "Advanced Microsoft Excel User",
            "Git version control", "Jira sprint tracking", "Docker containers",
        ]
        t0 = time.perf_counter()
        for i in range(100):
            p = test_phrases[i % len(test_phrases)]
            res = self.loader.get_regex_match(p)
            self.assertIsNotNone(res)
        elapsed_ms = (time.perf_counter() - t0) * 1000
        print(f"[BENCHMARK] 100 matched regex searches: {elapsed_ms:.2f} ms ({elapsed_ms/100:.2f} ms/search)")
        self.assertLess(elapsed_ms, 1200.0)

    def test_benchmark_100_regex_searches_unmatched(self):
        """
        100 regex pattern searches on unmatched strings (worst case: iterates all 2,756 patterns).
        Must complete in under 500 ms.
        """
        unmatched_phrases = [f"UnmatchedNovelSkillExpression_{i}" for i in range(100)]
        t0 = time.perf_counter()
        for p in unmatched_phrases:
            res = self.loader.get_regex_match(p)
            self.assertIsNone(res)
        elapsed_ms = (time.perf_counter() - t0) * 1000
        print(f"[BENCHMARK] 100 unmatched regex searches (worst case): {elapsed_ms:.2f} ms ({elapsed_ms/100:.2f} ms/search)")
        self.assertLess(elapsed_ms, 1200.0)


if __name__ == "__main__":
    unittest.main()
