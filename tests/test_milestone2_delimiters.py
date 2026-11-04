"""
Unit Tests for HierarchicalDelimiterSplitter (Milestone 2 - Phase 2.2)
======================================================================
Tests hierarchical delimiter splitting, compound shielding, sequential context graph
preservation, Arabic delimiter safety, and performance constraints.

Test Accounting:
- Tier 1 Hard Delimiters (;, Arabic semicolon, newlines, bullets, pipes, tabs)
- Tier 2 Comma Delimiters (Western comma, Arabic comma, Oxford comma with and/و)
- Tier 3 Soft Delimiters (&, /, and, or, -, +)
- Protected Compound Shielding (PL/SQL, CI/CD, UI/UX, AI/ML, C/C++, R&D, P&L, FP&A, TCP/IP, ETL/ELT)
- Catalog Multi-Word Shielding (Boiler Operation & Maintenance, etc.)
- Parenthetical Span Delimiter Isolation
- Sequential Context Graph (separated_from_before / separated_from_after / separated_by)
- Edge Cases, Adversarial Inputs, and Performance Benchmark
"""

import time
import unittest
from typing import List

from linguistic_intelligence.delimiters import (
    DelimiterTier,
    HierarchicalDelimiterSplitter,
    SplitToken,
)


class TestMilestone2DelimiterSplitter(unittest.TestCase):
    """Standalone unit test suite for HierarchicalDelimiterSplitter."""

    @classmethod
    def setUpClass(cls):
        cls.splitter = HierarchicalDelimiterSplitter()

    # ─── 1. TIER 1: HARD DELIMITERS ───────────────────────────────────────────
    def test_01_semicolon_splitting(self):
        """Semicolon ';' splits into distinct atomic skills with separated_by=';'."""
        res = self.splitter.split("Python; Docker; Kubernetes")
        self.assertEqual(len(res), 3)
        self.assertEqual([t.atomic_skill for t in res], ["Python", "Docker", "Kubernetes"])
        self.assertEqual(res[0].separated_by, ";")
        self.assertEqual(res[0].hierarchy_level, DelimiterTier.HARD)

    def test_02_arabic_semicolon_splitting(self):
        """Arabic semicolon '؛' (\\u061b) splits Arabic skill lists accurately."""
        res = self.splitter.split("إدارة المشاريع؛ التخطيط الاستراتيجي؛ القيادة")
        self.assertEqual(len(res), 3)
        self.assertEqual(
            [t.atomic_skill for t in res],
            ["إدارة المشاريع", "التخطيط الاستراتيجي", "القيادة"],
        )
        self.assertEqual(res[0].separated_by, "؛")
        self.assertEqual(res[0].hierarchy_level, DelimiterTier.HARD)

    def test_03_newline_splitting(self):
        """Newlines (\\n, \\r\\n) split multi-line skill blocks."""
        res = self.splitter.split("Linux\nBash\r\nGit")
        self.assertEqual(len(res), 3)
        self.assertEqual([t.atomic_skill for t in res], ["Linux", "Bash", "Git"])
        self.assertEqual(res[0].hierarchy_level, DelimiterTier.HARD)

    def test_04_bullet_splitting(self):
        """Bullet characters (•, \\u2022) split list items."""
        res = self.splitter.split("HTML • CSS • JavaScript")
        self.assertEqual(len(res), 3)
        self.assertEqual([t.atomic_skill for t in res], ["HTML", "CSS", "JavaScript"])
        self.assertEqual(res[0].separated_by, "•")
        self.assertEqual(res[0].hierarchy_level, DelimiterTier.HARD)

    def test_05_pipe_splitting(self):
        """Pipe symbol '|' splits cloud technology tracks."""
        res = self.splitter.split("AWS | Azure | GCP")
        self.assertEqual(len(res), 3)
        self.assertEqual([t.atomic_skill for t in res], ["AWS", "Azure", "GCP"])
        self.assertEqual(res[0].separated_by, "|")
        self.assertEqual(res[0].hierarchy_level, DelimiterTier.HARD)

    def test_06_tab_splitting(self):
        """Tab characters split tab-delimited skills."""
        res = self.splitter.split("C++\tPython\tGo")
        self.assertEqual(len(res), 3)
        self.assertEqual([t.atomic_skill for t in res], ["C++", "Python", "Go"])
        self.assertEqual(res[0].hierarchy_level, DelimiterTier.HARD)

    # ─── 2. TIER 2: COMMA DELIMITERS ──────────────────────────────────────────
    def test_07_western_comma_splitting(self):
        """Western comma ',' splits standard comma-separated skills."""
        res = self.splitter.split("React, Angular, Vue")
        self.assertEqual(len(res), 3)
        self.assertEqual([t.atomic_skill for t in res], ["React", "Angular", "Vue"])
        self.assertEqual(res[0].separated_by, ",")
        self.assertEqual(res[0].hierarchy_level, DelimiterTier.COMMA)

    def test_08_arabic_comma_splitting(self):
        """Arabic comma '،' (\\u060c) splits Arabic skill listings."""
        res = self.splitter.split("تطوير الويب، قواعد البيانات، الذكاء الاصطناعي")
        self.assertEqual(len(res), 3)
        self.assertEqual(
            [t.atomic_skill for t in res],
            ["تطوير الويب", "قواعد البيانات", "الذكاء الاصطناعي"],
        )
        self.assertEqual(res[0].separated_by, "،")
        self.assertEqual(res[0].hierarchy_level, DelimiterTier.COMMA)

    def test_09_oxford_comma_with_and(self):
        """Oxford comma with 'and' (', and') decomposes cleanly without leaving 'and'."""
        res = self.splitter.split("HTML, CSS, and JavaScript")
        self.assertEqual(len(res), 3)
        self.assertEqual([t.atomic_skill for t in res], ["HTML", "CSS", "JavaScript"])

    def test_10_arabic_comma_with_waw(self):
        """Arabic comma followed by conjunction waw ('، و' or '، و') cleans leading waw."""
        res = self.splitter.split("بايثون، جافا، وسيكويل")
        self.assertEqual(len(res), 3)
        self.assertEqual([t.atomic_skill for t in res], ["بايثون", "جافا", "سيكويل"])

    def test_11_consecutive_delimiters_and_cleanup(self):
        """Leading, trailing, and duplicate commas are ignored without empty tokens."""
        res = self.splitter.split(", Python ,, SQL ,;")
        self.assertEqual(len(res), 2)
        self.assertEqual([t.atomic_skill for t in res], ["Python", "SQL"])

    # ─── 3. TIER 3: SOFT DELIMITERS ───────────────────────────────────────────
    def test_12_ampersand_splitting(self):
        """Ampersand '&' splits unshielded skills into 2 atomic skills."""
        res = self.splitter.split("Python & SQL")
        self.assertEqual(len(res), 2)
        self.assertEqual([t.atomic_skill for t in res], ["Python", "SQL"])
        self.assertEqual(res[0].separated_by, "&")
        self.assertEqual(res[0].hierarchy_level, DelimiterTier.SOFT)

    def test_13_slash_splitting(self):
        """Slash '/' splits unshielded tool pairings."""
        res = self.splitter.split("Docker / Kubernetes")
        self.assertEqual(len(res), 2)
        self.assertEqual([t.atomic_skill for t in res], ["Docker", "Kubernetes"])
        self.assertEqual(res[0].separated_by, "/")
        self.assertEqual(res[0].hierarchy_level, DelimiterTier.SOFT)

    def test_14_word_and_splitting(self):
        """Word 'and' with word boundaries splits composite disciplines."""
        res = self.splitter.split("Accounting and Auditing")
        self.assertEqual(len(res), 2)
        self.assertEqual([t.atomic_skill for t in res], ["Accounting", "Auditing"])
        self.assertEqual(res[0].separated_by, "and")

    def test_15_word_or_splitting(self):
        """Word 'or' splits alternative skill requirements."""
        res = self.splitter.split("Java or Kotlin")
        self.assertEqual(len(res), 2)
        self.assertEqual([t.atomic_skill for t in res], ["Java", "Kotlin"])
        self.assertEqual(res[0].separated_by, "or")

    def test_16_hyphen_with_spaces_splitting(self):
        """Hyphen with spaces ' - ' splits distinct tools."""
        res = self.splitter.split("Jira - Confluence")
        self.assertEqual(len(res), 2)
        self.assertEqual([t.atomic_skill for t in res], ["Jira", "Confluence"])
        self.assertEqual(res[0].separated_by, "-")

    def test_17_plus_with_spaces_splitting(self):
        """Plus with spaces ' + ' splits composite stacks."""
        res = self.splitter.split("Python + Django")
        self.assertEqual(len(res), 2)
        self.assertEqual([t.atomic_skill for t in res], ["Python", "Django"])
        self.assertEqual(res[0].separated_by, "+")

    # ─── 4. PROTECTED COMPOUND SHIELDING ──────────────────────────────────────
    def test_18_pl_sql_protected(self):
        """PL/SQL must never be fragmented on slash."""
        res = self.splitter.split("PL/SQL")
        self.assertEqual(len(res), 1)
        self.assertEqual(res[0].atomic_skill, "PL/SQL")
        self.assertEqual(res[0].separated_by, "")
        self.assertTrue(res[0].is_compound_shielded)

    def test_19_ci_cd_protected(self):
        """CI/CD must never be fragmented on slash."""
        res = self.splitter.split("CI/CD")
        self.assertEqual(len(res), 1)
        self.assertEqual(res[0].atomic_skill, "CI/CD")
        self.assertTrue(res[0].is_compound_shielded)

    def test_20_ui_ux_protected(self):
        """UI/UX must never be fragmented on slash."""
        res = self.splitter.split("UI/UX")
        self.assertEqual(len(res), 1)
        self.assertEqual(res[0].atomic_skill, "UI/UX")
        self.assertTrue(res[0].is_compound_shielded)

    def test_21_ai_ml_protected(self):
        """AI/ML must never be fragmented on slash."""
        res = self.splitter.split("AI/ML")
        self.assertEqual(len(res), 1)
        self.assertEqual(res[0].atomic_skill, "AI/ML")
        self.assertTrue(res[0].is_compound_shielded)

    def test_22_c_cpp_protected(self):
        """C/C++ must never be fragmented on slash."""
        res = self.splitter.split("C/C++")
        self.assertEqual(len(res), 1)
        self.assertEqual(res[0].atomic_skill, "C/C++")
        self.assertTrue(res[0].is_compound_shielded)

    def test_23_randd_protected(self):
        """R&D must never be fragmented on ampersand."""
        res = self.splitter.split("R&D")
        self.assertEqual(len(res), 1)
        self.assertEqual(res[0].atomic_skill, "R&D")
        self.assertTrue(res[0].is_compound_shielded)

    def test_24_pandl_and_fpa_protected(self):
        """P&L and FP&A are shielded financial compounds."""
        for comp in ["P&L", "FP&A", "TCP/IP", "ETL/ELT"]:
            res = self.splitter.split(comp)
            self.assertEqual(len(res), 1, f"Failed for {comp}")
            self.assertEqual(res[0].atomic_skill, comp)
            self.assertTrue(res[0].is_compound_shielded)

    def test_25_pl_sql_and_ci_cd_combination(self):
        """'PL/SQL & CI/CD' splits on '&' into 2 shielded compounds."""
        res = self.splitter.split("PL/SQL & CI/CD")
        self.assertEqual(len(res), 2)
        self.assertEqual(res[0].atomic_skill, "PL/SQL")
        self.assertEqual(res[1].atomic_skill, "CI/CD")
        self.assertEqual(res[0].separated_by, "&")

    def test_26_compound_trio_with_slashes(self):
        """'R&D / FP&A / P&L' splits on external slashes while shielding internal ampersands."""
        res = self.splitter.split("R&D / FP&A / P&L")
        self.assertEqual(len(res), 3)
        self.assertEqual([t.atomic_skill for t in res], ["R&D", "FP&A", "P&L"])
        self.assertEqual(res[0].separated_by, "/")

    def test_27_compound_trio_with_bullets(self):
        """'C/C++ • Linux • TCP/IP' splits on bullets without corrupting compounds."""
        res = self.splitter.split("C/C++ • Linux • TCP/IP")
        self.assertEqual(len(res), 3)
        self.assertEqual([t.atomic_skill for t in res], ["C/C++", "Linux", "TCP/IP"])
        self.assertEqual(res[0].separated_by, "•")

    # ─── 5. CATALOG PHRASE & SPECIAL CHARACTER SHIELDING ─────────────────────
    def test_28_catalog_phrase_with_ampersand_shielded(self):
        """Catalog skill 'Boiler Operation & Maintenance' must not split on ampersand."""
        res = self.splitter.split("Boiler Operation & Maintenance, GPS Navigation & Map Reading")
        self.assertEqual(len(res), 2)
        self.assertEqual(
            [t.atomic_skill for t in res],
            ["Boiler Operation & Maintenance", "GPS Navigation & Map Reading"],
        )
        self.assertEqual(res[0].separated_by, ",")

    def test_29_csharp_and_cpp_safety(self):
        """'C/C++ & C#' splits on '&' without corrupting C++ or C#."""
        res = self.splitter.split("C/C++ & C#")
        self.assertEqual(len(res), 2)
        self.assertEqual([t.atomic_skill for t in res], ["C/C++", "C#"])

    def test_30_js_framework_dots_not_split(self):
        """'Node.js, Vue.js & React.js' preserves dots and splits on commas and ampersand."""
        res = self.splitter.split("Node.js, Vue.js & React.js")
        self.assertEqual(len(res), 3)
        self.assertEqual([t.atomic_skill for t in res], ["Node.js", "Vue.js", "React.js"])

    # ─── 6. PARENTHESIS DELIMITER ISOLATION ───────────────────────────────────
    def test_31_parenthesis_with_inner_commas_shielded(self):
        """Commas inside parentheses must not trigger top-level splitting."""
        res = self.splitter.split("Python (Flask, Django), Docker & Kubernetes")
        self.assertEqual(len(res), 3)
        self.assertEqual(res[0].atomic_skill, "Python (Flask, Django)")
        self.assertEqual(res[1].atomic_skill, "Docker")
        self.assertEqual(res[2].atomic_skill, "Kubernetes")

    def test_32_parenthesis_with_inner_slashes_shielded(self):
        """Slashes inside parentheses must not trigger top-level splitting."""
        res = self.splitter.split("Web (React / Next.js) & Backend (Node.js / Express)")
        self.assertEqual(len(res), 2)
        self.assertEqual(res[0].atomic_skill, "Web (React / Next.js)")
        self.assertEqual(res[1].atomic_skill, "Backend (Node.js / Express)")
        self.assertEqual(res[0].separated_by, "&")

    def test_33_parenthesis_with_inner_ampersand_shielded(self):
        """Ampersand inside parentheses must not trigger top-level splitting."""
        res = self.splitter.split("Data Science (R & Python) • Cloud (AWS & Azure)")
        self.assertEqual(len(res), 2)
        self.assertEqual(res[0].atomic_skill, "Data Science (R & Python)")
        self.assertEqual(res[1].atomic_skill, "Cloud (AWS & Azure)")
        self.assertEqual(res[0].separated_by, "•")

    def test_34_parenthesis_with_level_modifiers_intact(self):
        """Parenthetical level modifiers remain attached to their respective base skills."""
        res = self.splitter.split("Python (Advanced), Docker (Intermediate) & Kubernetes (Beginner)")
        self.assertEqual(len(res), 3)
        self.assertEqual(res[0].atomic_skill, "Python (Advanced)")
        self.assertEqual(res[1].atomic_skill, "Docker (Intermediate)")
        self.assertEqual(res[2].atomic_skill, "Kubernetes (Beginner)")

    # ─── 7. SEQUENTIAL CONTEXT GRAPH (PROVENANCE) ─────────────────────────────
    def test_35_context_graph_three_components(self):
        """Context graph accurately tracks separated_from_before and separated_from_after."""
        res = self.splitter.split("Python, SQL, Docker")
        self.assertEqual(len(res), 3)
        # Token 0 (Python): before is empty, after is SQL
        self.assertEqual(res[0].separated_from_before, "")
        self.assertEqual(res[0].separated_from_after, "SQL")
        self.assertEqual(res[0].span_index, 0)
        self.assertEqual(res[0].total_tokens, 3)

        # Token 1 (SQL): before is Python, after is Docker
        self.assertEqual(res[1].separated_from_before, "Python")
        self.assertEqual(res[1].separated_from_after, "Docker")
        self.assertEqual(res[1].span_index, 1)

        # Token 2 (Docker): before is SQL, after is empty
        self.assertEqual(res[2].separated_from_before, "SQL")
        self.assertEqual(res[2].separated_from_after, "")
        self.assertEqual(res[2].span_index, 2)

    def test_36_single_token_context_graph(self):
        """Single unseparated token has separated_by='', before='', after=''."""
        res = self.splitter.split("Python")
        self.assertEqual(len(res), 1)
        self.assertEqual(res[0].atomic_skill, "Python")
        self.assertEqual(res[0].separated_by, "")
        self.assertEqual(res[0].separated_from_before, "")
        self.assertEqual(res[0].separated_from_after, "")
        self.assertEqual(res[0].hierarchy_level, DelimiterTier.NONE)
        self.assertEqual(res[0].span_index, 0)
        self.assertEqual(res[0].total_tokens, 1)

    # ─── 8. BOUNDARY, ADVERSARIAL & PERFORMANCE TESTS ─────────────────────────
    def test_37_empty_and_whitespace_inputs(self):
        """Empty, whitespace-only, or None inputs return empty list safely."""
        self.assertEqual(self.splitter.split(""), [])
        self.assertEqual(self.splitter.split("   "), [])
        self.assertEqual(self.splitter.split(None), [])

    def test_38_arabic_word_starting_with_waw_safe(self):
        """Arabic words starting with letter waw (e.g. وورد, وثائق) must never be split."""
        res = self.splitter.split("مهندس برمجيات وورد ومحرر وثائق")
        self.assertEqual(len(res), 1)
        self.assertEqual(res[0].atomic_skill, "مهندس برمجيات وورد ومحرر وثائق")

    def test_39_hyphenated_words_without_spaces_preserved(self):
        """Hyphenated words (Front-End, Back-End) are not split, but ' - ' with spaces splits."""
        res = self.splitter.split("Front-End, Back-End - Full-Stack")
        self.assertEqual(len(res), 3)
        self.assertEqual([t.atomic_skill for t in res], ["Front-End", "Back-End", "Full-Stack"])

    def test_40_oversized_input_guardrail(self):
        """
        BLOCKER 1: Inputs exceeding MAX_INPUT_LENGTH must NEVER be truncated or lose data.
        Note 1: Oversized input is NOT malformed. It is a valid text exceeding processing limit.
        Note 2: raw_token preserves the verbatim raw text, while atomic_skill is cleaned.
        """
        raw_huge_input = "   " + ("Python, " * 5_000) + "   "
        res = self.splitter.split(raw_huge_input)
        self.assertEqual(len(res), 1)
        # Strict zero data loss: raw_token preserves verbatim input including whitespace
        self.assertEqual(res[0].raw_token, raw_huge_input)
        self.assertEqual(len(res[0].raw_token), len(raw_huge_input))
        # atomic_skill contains the clean, normalized, non-truncated text
        self.assertEqual(res[0].atomic_skill, raw_huge_input.strip())
        self.assertEqual(len(res[0].atomic_skill), len(raw_huge_input.strip()))
        # Reviewer Note 1: Disentangle oversized from malformed
        self.assertTrue(res[0].is_oversized)
        self.assertFalse(res[0].is_malformed)
        self.assertIsNone(res[0].malformed_reason)
        self.assertEqual(res[0].separated_by, "OVERSIZED_INPUT")
        self.assertEqual(res[0].hierarchy_level, DelimiterTier.NONE)

    def test_41_mixed_hierarchy_nested_delimiters(self):
        """
        Mixed multi-tier delimiters:
        Tier 1 (;) splits major tracks, Tier 2 (,) splits categories, Tier 3 (&) splits pairs.
        """
        raw = "HTML, CSS & JavaScript; Python & Django; Docker, Kubernetes"
        res = self.splitter.split(raw)
        self.assertEqual(len(res), 7)
        skills = [t.atomic_skill for t in res]
        self.assertEqual(skills, ["HTML", "CSS", "JavaScript", "Python", "Django", "Docker", "Kubernetes"])
        # Check hierarchy and delimiters:
        # HTML was split by comma
        self.assertEqual(res[0].separated_by, ",")
        self.assertEqual(res[0].hierarchy_level, DelimiterTier.COMMA)
        # JavaScript was split by &
        self.assertEqual(res[2].separated_by, "&")
        self.assertEqual(res[2].hierarchy_level, DelimiterTier.SOFT)
        # Docker was split by comma
        self.assertEqual(res[5].separated_by, ",")
        self.assertEqual(res[5].hierarchy_level, DelimiterTier.COMMA)

    def test_42_split_to_dict_serializability(self):
        """SplitToken.to_dict() returns clean primitive dictionary with zero circular references."""
        res = self.splitter.split("Python & SQL")
        d = res[0].to_dict()
        self.assertEqual(d["atomic_skill"], "Python")
        self.assertEqual(d["separated_by"], "&")
        self.assertEqual(d["separated_from_after"], "SQL")
        self.assertEqual(d["hierarchy_level"], DelimiterTier.SOFT)
        self.assertFalse(d["is_oversized"])
        self.assertFalse(d["is_malformed"])
        self.assertIsNone(d["malformed_reason"])
        self.assertIsInstance(d, dict)

    # ─── 9. BLOCKER REGRESSION & ADVERSARIAL TEST SUITE ───────────────────────
    def test_44_unbalanced_open_parenthesis_preserved(self):
        """
        BLOCKER 2: Unclosed opening parenthesis must NOT cause corrupt splitting on internal commas.
        Entire text is preserved intact with clear malformed status.
        """
        raw = "Python (Flask, Django"
        res = self.splitter.split(raw)
        self.assertEqual(len(res), 1)
        self.assertEqual(res[0].atomic_skill, raw)
        self.assertEqual(res[0].raw_token, raw)
        self.assertTrue(res[0].is_malformed)
        self.assertEqual(res[0].malformed_reason, "UNBALANCED_UNCLOSED_OPEN_PARENTHESIS")
        self.assertEqual(res[0].separated_by, "UNBALANCED_UNCLOSED_OPEN_PARENTHESIS")

    def test_45_unbalanced_extra_close_parenthesis_preserved(self):
        """
        BLOCKER 2: Extra unopened closing parenthesis must NOT cause corrupt splitting.
        """
        raw = "Python) Flask, Django"
        res = self.splitter.split(raw)
        self.assertEqual(len(res), 1)
        self.assertEqual(res[0].atomic_skill, raw)
        self.assertTrue(res[0].is_malformed)
        self.assertEqual(res[0].malformed_reason, "UNBALANCED_EXTRA_CLOSE_PARENTHESIS")

    def test_46_nested_unbalanced_parentheses_preserved(self):
        """
        BLOCKER 2: Nested unclosed parenthesis must be detected and preserved without fragmentation.
        """
        raw = "Python ((Flask), Django"
        res = self.splitter.split(raw)
        self.assertEqual(len(res), 1)
        self.assertEqual(res[0].atomic_skill, raw)
        self.assertTrue(res[0].is_malformed)
        self.assertEqual(res[0].malformed_reason, "UNBALANCED_UNCLOSED_OPEN_PARENTHESIS")

    def test_47_catalog_phrase_with_and_protected(self):
        """
        BLOCKER 3: Multi-word technical and catalog phrases containing word 'and'
        (e.g. 'Search and Recommendation Systems') must NEVER be split by soft delimiter.
        """
        raw = "Search and Recommendation Systems, Python & Docker"
        res = self.splitter.split(raw)
        self.assertEqual(len(res), 3)
        skills = [t.atomic_skill for t in res]
        self.assertEqual(skills, ["Search and Recommendation Systems", "Python", "Docker"])
        self.assertTrue(res[0].is_compound_shielded)

    def test_48_catalog_phrases_with_and_from_catalog_matrix(self):
        """
        BLOCKER 3: Existing catalog entries containing 'and' (e.g. 'Planning and Control',
        'Water Pump Installation and Repair') are shielded while outer delimiters split.
        """
        raw = "Planning and Control, Water Pump Installation and Repair & PLC"
        res = self.splitter.split(raw)
        self.assertEqual(len(res), 3)
        self.assertEqual(
            [t.atomic_skill for t in res],
            ["Planning and Control", "Water Pump Installation and Repair", "PLC"],
        )
        self.assertTrue(res[0].is_compound_shielded)
        self.assertTrue(res[1].is_compound_shielded)

    def test_49_conjunction_and_splitting_when_not_catalog_phrase(self):
        """
        BLOCKER 3: When 'and' is a true coordinating conjunction between independent skills,
        it must split cleanly without false shielding.
        """
        raw = "Python and Docker"
        res = self.splitter.split(raw)
        self.assertEqual(len(res), 2)
        self.assertEqual([t.atomic_skill for t in res], ["Python", "Docker"])
        self.assertEqual(res[0].separated_by, "and")

    def test_50_placeholder_collision_proof(self):
        """
        BLOCKER 4: User input intentionally containing placeholder sentinel tokens
        (e.g. '__SHIELD_COMP_0__') must NEVER collide or be corrupted by shielding unmasking.
        """
        raw = "Python __SHIELD_COMP_0__ & SQL; CI/CD"
        res = self.splitter.split(raw)
        self.assertEqual(len(res), 3)
        skills = [t.atomic_skill for t in res]
        self.assertEqual(skills, ["Python __SHIELD_COMP_0__", "SQL", "CI/CD"])
        self.assertEqual(res[0].atomic_skill, "Python __SHIELD_COMP_0__")
        self.assertEqual(res[2].atomic_skill, "CI/CD")
        self.assertTrue(res[2].is_compound_shielded)

    def test_51_compound_token_aware_boundary_no_false_positive(self):
        """
        Reviewer Note: is_compound_protected() must be token/boundary-aware and avoid
        substring false positives (e.g. 'e2e' inside 'create2event').
        """
        self.assertFalse(self.splitter.is_compound_protected("create2event"))
        self.assertTrue(self.splitter.is_compound_protected("e2e"))
        self.assertTrue(self.splitter.is_compound_protected("E2E Testing"))
        self.assertTrue(self.splitter.is_compound_protected("CI/CD Pipeline"))

    def test_52_adversarial_deeply_nested_balanced_parentheses(self):
        """Adversarial balanced multi-level parentheses are cleanly shielded."""
        raw = "Python (Flask (REST API (v1))), Docker"
        res = self.splitter.split(raw)
        self.assertEqual(len(res), 2)
        self.assertEqual(
            [t.atomic_skill for t in res],
            ["Python (Flask (REST API (v1)))", "Docker"],
        )

    def test_53_adversarial_sentinel_tampering_multiple(self):
        """Multiple sentinel tampering attempts in single string are 100% collision-proof."""
        raw = "__SHIELD_PAREN_0__ & __SHIELD_COMP_1__; UI/UX & R&D"
        res = self.splitter.split(raw)
        self.assertEqual(len(res), 4)
        self.assertEqual(
            [t.atomic_skill for t in res],
            ["__SHIELD_PAREN_0__", "__SHIELD_COMP_1__", "UI/UX", "R&D"],
        )

    def test_54_adversarial_mixed_arabic_english_delimiters(self):
        """Arabic semicolons, commas, English ampersands, and compound shielding in mixed input."""
        raw = "تطوير واجهات المستخدم (UI/UX)؛ Python & Django، إدارة المشاريع والتخطيط"
        res = self.splitter.split(raw)
        self.assertEqual(len(res), 4)
        self.assertEqual(
            [t.atomic_skill for t in res],
            ["تطوير واجهات المستخدم (UI/UX)", "Python", "Django", "إدارة المشاريع والتخطيط"],
        )

    def test_55_verbatim_raw_token_whitespace_preservation_policy(self):
        """
        Reviewer Note 2: Verbatim raw_token preservation policy.
        raw_token preserves exact verbatim characters and whitespace as received by the engine.
        atomic_skill holds the cleaned, trimmed, and normalized skill text.
        """
        raw_single = "   Python Programming   "
        res = self.splitter.split(raw_single)
        self.assertEqual(len(res), 1)
        # raw_token retains unstripped string exactly
        self.assertEqual(res[0].raw_token, raw_single)
        # atomic_skill retains clean normalized skill
        self.assertEqual(res[0].atomic_skill, "Python Programming")
        self.assertFalse(res[0].is_oversized)
        self.assertFalse(res[0].is_malformed)

    def test_56_oversized_input_disentangled_from_malformed(self):
        """
        Reviewer Note 1: Oversized inputs are valid semantic text that exceed processing limit.
        They must have is_oversized=True and is_malformed=False, preserving raw text verbatim.
        """
        raw_input = "  " + ("Docker, " * 4_000) + "Kubernetes  "
        res = self.splitter.split(raw_input)
        self.assertEqual(len(res), 1)
        self.assertEqual(res[0].raw_token, raw_input)
        self.assertEqual(res[0].atomic_skill, raw_input.strip())
        self.assertTrue(res[0].is_oversized)
        self.assertFalse(res[0].is_malformed)
        self.assertIsNone(res[0].malformed_reason)
        self.assertEqual(res[0].separated_by, "OVERSIZED_INPUT")

    def test_57_verbatim_raw_token_preservation_for_multiple_tokens(self):
        """
        Reviewer Requirement: raw_token must preserve the exact verbatim source substring
        (including surrounding whitespace) for multi-token inputs.
        Example input: '  Python  ,  SQL  ,  Docker  '
        """
        raw_input = "  Python  ,  SQL  ,  Docker  "
        res = self.splitter.split(raw_input)
        self.assertEqual(len(res), 3)
        # raw_token retains exact verbatim slices with surrounding spaces
        self.assertEqual(res[0].raw_token, "  Python  ")
        self.assertEqual(res[1].raw_token, "  SQL  ")
        self.assertEqual(res[2].raw_token, "  Docker  ")
        # atomic_skill is cleaned and normalized
        self.assertEqual(res[0].atomic_skill, "Python")
        self.assertEqual(res[1].atomic_skill, "SQL")
        self.assertEqual(res[2].atomic_skill, "Docker")
        # separated_by is independent delimiter token
        self.assertEqual(res[0].separated_by, ",")
        self.assertEqual(res[1].separated_by, ",")
        self.assertEqual(res[2].separated_by, ",")

    def test_58_verbatim_raw_token_preservation_mixed_delimiters(self):
        """
        Multi-token preservation across mixed delimiter tiers with asymmetric whitespace:
        '  HTML  ;  CSS  &  JavaScript  '
        """
        raw_input = "  HTML  ;  CSS  &  JavaScript  "
        res = self.splitter.split(raw_input)
        self.assertEqual(len(res), 3)
        self.assertEqual(res[0].raw_token, "  HTML  ")
        self.assertEqual(res[1].raw_token, "  CSS  ")
        self.assertEqual(res[2].raw_token, "  JavaScript  ")
        self.assertEqual([t.atomic_skill for t in res], ["HTML", "CSS", "JavaScript"])
        self.assertEqual(res[0].separated_by, ";")
        self.assertEqual(res[1].separated_by, "&")
        self.assertEqual(res[2].separated_by, "&")

    def test_43_sub_millisecond_benchmark(self):
        """1,000 splits execute in well under 2,000 ms (< 2 ms per split; budget is 50 ms)."""
        test_inputs = [
            "Python & SQL",
            "Docker / Kubernetes",
            "HTML, CSS, JavaScript",
            "Jira - Confluence",
            "Accounting and Auditing",
            "PL/SQL & CI/CD",
            "R&D / FP&A / P&L",
            "C/C++ • Linux • TCP/IP",
            "Python (Flask, Django), Docker & Kubernetes",
            "Search and Recommendation Systems, Python & Docker",
            "Python __SHIELD_COMP_0__ & SQL; CI/CD",
            "Python (Flask, Django",
            "بايثون، جافا، وسيكويل",
        ]
        t0 = time.perf_counter()
        for _ in range(100):
            for inp in test_inputs:
                self.splitter.split(inp)
        elapsed_ms = (time.perf_counter() - t0) * 1000

        # Assert 1,300 splits completed in < 2,000 ms
        self.assertLess(
            elapsed_ms,
            2000.0,
            f"Expected splits to take < 2000 ms, took {elapsed_ms:.2f} ms",
        )
        print(f"\n[BENCHMARK] 1,300 delimiter splits: {elapsed_ms:.2f} ms ({elapsed_ms/1300:.3f} ms/split)")


if __name__ == "__main__":
    unittest.main()
