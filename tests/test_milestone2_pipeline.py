"""
Milestone 2.3: Pipeline Integration Layer Test Suite
====================================================
Exhaustive verification of the integration layer connecting:
  - Feature 05: Parentheses Typology Engine (ParenthesesTypologyEngine)
  - Feature 06: Protected Compound Shielding (ProperNounShield / Compound Registry)
  - Feature 07: Hierarchical Delimiter Splitting (HierarchicalDelimiterSplitter)
with the Milestone 1 Reference Catalog (CatalogLoader) and Lexical Matrix.

Strict Audit Areas:
  1. Pipeline initialization, component wiring & data contracts
  2. ProvenanceRecord tracking across all transformation stages
  3. Master Main Output Schema v3 (14 columns) & Sidecar Schema v3 (11 columns)
  4. Feature 06 compound shielding across delimiters
  5. Feature 05 5-way parenthetical classification and leaf decomposition
  6. Feature 07 hierarchical delimiter splitting & context graph preservation
  7. Edge cases, guardrails, oversized & malformed handling
  8. Determinism and sub-millisecond execution performance
"""

import sys
import os
import unittest
import time
from pathlib import Path

# Add project root to sys.path
PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from linguistic_intelligence.pipeline import (
    LinguisticPipeline,
    IntegratedSkillToken,
    ProvenanceRecord,
    SidecarLinguisticMetadata,
)
from linguistic_intelligence.engine import AtomicDecompositionPipeline
from linguistic_intelligence.config import (
    MAIN_OUTPUT_COLUMNS,
    SIDECAR_OUTPUT_COLUMNS,
    VALID_MATCH_STATUSES,
    CLOSED_DOMAINS,
    LEVEL_ADVANCED,
    LEVEL_BEGINNER,
    LEVEL_EXPERT,
    LEVEL_INTERMEDIATE,
    LEVEL_NOT_SPECIFIED,
    CATALOG_EXACT_MATCH,
    CATALOG_REGEX_MATCH,
    PARENTHESIS_SPECIFICATION,
    PROTECTED_PROPER_NOUN,
    UNMATCHED_NOVEL,
    REJECTED_NOISE,
)
from tests.test_helpers import OpaqueBoxTestCase


class TestMilestone2PipelineIntegration(OpaqueBoxTestCase):
    """Authoritative test suite for Milestone 2.3 Pipeline Integration Layer."""

    @classmethod
    def setUpClass(cls):
        cls.pipeline = LinguisticPipeline()

    # ──────────────────────────────────────────────────────────────────────────
    # 1. Pipeline Architecture, Wiring & Provenance Contracts
    # ──────────────────────────────────────────────────────────────────────────

    def test_01_component_wiring_integrity(self):
        """Pipeline must properly wire splitter, parentheses engine, shield, and catalog."""
        self.assertIsNotNone(self.pipeline.splitter)
        self.assertIsNotNone(self.pipeline.parentheses_engine)
        self.assertIsNotNone(self.pipeline.shield)
        self.assertIsNotNone(self.pipeline.catalog)
        self.assertIsNotNone(self.pipeline.acronym_resolver)

    def test_02_provenance_record_generation_and_serialization(self):
        """IntegratedSkillToken must carry complete, non-circular ProvenanceRecord."""
        raw = "Python (Advanced) & SQL (Beginner)"
        tokens = self.pipeline.decompose_to_tokens(raw)
        self.assertEqual(len(tokens), 2)

        for tok in tokens:
            self.assertIsNotNone(tok.provenance)
            prov_dict = tok.provenance.to_dict()
            self.assertIsInstance(prov_dict, dict)
            self.assertEqual(prov_dict["raw_input"], raw)
            self.assertIn("transformation_log", prov_dict)
            self.assertGreaterEqual(len(prov_dict["transformation_log"]), 1)

    def test_03_main_14_column_schema_strictness(self):
        """Every decomposed row must strictly satisfy the 14-column contract."""
        test_inputs = [
            "Python",
            "Python & SQL",
            "PL/SQL",
            "Microsoft Office (Advanced)",
            "Development Tools (Git, Jira)",
            "Sales Experience (Transportation & Logistics)",
            "Advanced Excel (Cost & Quantity Tracking)",
            "Amazon Web Services (AWS)",
            "Social Insurance (Forms 1, 2, 6)",
            "Lead Generation",
            "NonExistentCustomSkill123",
            ";;;",
        ]
        for raw in test_inputs:
            res = self.pipeline.decompose(raw)
            for row in res:
                self.assert_14_column_contract(row, raw_skill=raw)

    def test_04_sidecar_11_column_schema_strictness(self):
        """Sidecar metadata must strictly satisfy the 11-column contract."""
        test_inputs = [
            "Python",
            "Python & SQL",
            "Programming Languages: Python, Go",
            "Senior Python Developer",
            "Python (5+ years experience)",
            "Sales (Real Estate)",
            "ISTQB Advanced Level",
        ]
        for raw in test_inputs:
            sidecar = self.pipeline.get_sidecar_metadata(raw)
            self.assert_11_column_sidecar_contract(sidecar, raw_skill=raw)

    def test_05_strict_permitted_match_statuses_enforced(self):
        """Every emitted row must possess exactly one of the strict 6 match statuses."""
        samples = [
            ("Python", CATALOG_EXACT_MATCH),
            ("Lead Generation", PROTECTED_PROPER_NOUN),
            ("Claude Code", UNMATCHED_NOVEL),
            (";;;", REJECTED_NOISE),
            ("Z", REJECTED_NOISE),
        ]
        for raw, expected_status in samples:
            res = self.pipeline.decompose(raw)
            self.assertGreaterEqual(len(res), 1)
            self.assertEqual(res[0]["match_status"], expected_status)
            self.assertIn(res[0]["match_status"], VALID_MATCH_STATUSES)

    # ──────────────────────────────────────────────────────────────────────────
    # 2. Feature 06 Compound Protection Across Delimiters
    # ──────────────────────────────────────────────────────────────────────────

    def test_06_pl_sql_protected_from_slash_split(self):
        """PL/SQL must not be split on slash."""
        tokens = self.pipeline.decompose_to_tokens("PL/SQL")
        self.assertEqual(len(tokens), 1)
        self.assertEqual(tokens[0].atomic_skill, "PL/SQL")
        self.assertTrue(tokens[0].is_compound_shielded)

    def test_07_ci_cd_protected_from_slash_split(self):
        """CI/CD must not be split on slash."""
        tokens = self.pipeline.decompose_to_tokens("CI/CD")
        self.assertEqual(len(tokens), 1)
        self.assertEqual(tokens[0].atomic_skill, "CI/CD")
        self.assertTrue(tokens[0].is_compound_shielded)

    def test_08_c_cpp_protected_from_slash_split(self):
        """C/C++ must not be split on slash."""
        tokens = self.pipeline.decompose_to_tokens("C/C++")
        self.assertEqual(len(tokens), 1)
        self.assertEqual(tokens[0].atomic_skill, "C/C++")
        self.assertTrue(tokens[0].is_compound_shielded)

    def test_09_ui_ux_protected_from_slash_split(self):
        """UI/UX must not be split on slash."""
        tokens = self.pipeline.decompose_to_tokens("UI/UX")
        self.assertEqual(len(tokens), 1)
        self.assertEqual(tokens[0].atomic_skill, "UI/UX")
        self.assertTrue(tokens[0].is_compound_shielded)

    def test_10_randd_protected_from_ampersand_split(self):
        """R&D must not be split on ampersand."""
        tokens = self.pipeline.decompose_to_tokens("R&D")
        self.assertEqual(len(tokens), 1)
        self.assertEqual(tokens[0].atomic_skill, "R&D")
        self.assertTrue(tokens[0].is_compound_shielded)

    def test_11_pandl_and_fpa_protected(self):
        """P&L and FP&A are shielded financial compounds."""
        for comp in ["P&L", "FP&A", "TCP/IP", "AI/ML", "ETL/ELT"]:
            tokens = self.pipeline.decompose_to_tokens(comp)
            self.assertEqual(len(tokens), 1, f"Failed for compound: {comp}")
            self.assertEqual(tokens[0].atomic_skill, comp)
            self.assertTrue(tokens[0].is_compound_shielded)

    def test_12_multi_compound_delimited_string(self):
        """'PL/SQL & C/C++ / CI/CD' preserves all 3 compounds while splitting on delimiters."""
        raw = "PL/SQL & C/C++ / CI/CD"
        tokens = self.pipeline.decompose_to_tokens(raw)
        self.assertEqual(len(tokens), 3)
        skills = [t.atomic_skill for t in tokens]
        self.assertEqual(skills, ["PL/SQL", "C/C++", "CI/CD"])
        for t in tokens:
            self.assertTrue(t.is_compound_shielded)

    def test_13_senior_pl_sql_advanced_interaction(self):
        """'Senior PL/SQL (Advanced)' isolates Senior to sidecar, protects compound, and extracts level."""
        raw = "Senior PL/SQL (Advanced)"
        res = self.pipeline.decompose(raw)
        self.assertEqual(len(res), 1)
        self.assertEqual(res[0]["atomic_skill"], "PL/SQL")
        self.assertEqual(res[0]["extracted_skill_level"], "Advanced")
        self.assertEqual(res[0]["skill_level"], "Advanced")

        sidecar = self.pipeline.get_sidecar_metadata(raw)
        self.assertIn("Senior", sidecar["intra_string_seniority"])

    def test_14_ci_cd_pipelines_intermediate(self):
        """'CI/CD Pipelines (Intermediate)' strips suffix Pipelines, protects compound, and extracts level."""
        raw = "CI/CD Pipelines (Intermediate)"
        res = self.pipeline.decompose(raw)
        self.assertEqual(len(res), 1)
        self.assertEqual(res[0]["atomic_skill"], "CI/CD")
        self.assertEqual(res[0]["skill_level"], "Intermediate")

    def test_15_ui_ux_design_expert_collapsed(self):
        """'UI/UX Design (Expert)' strips suffix Design, protects compound, collapses expert to advanced."""
        raw = "UI/UX Design (Expert)"
        res = self.pipeline.decompose(raw)
        self.assertEqual(len(res), 1)
        self.assertEqual(res[0]["atomic_skill"], "UI/UX")
        self.assertEqual(res[0]["extracted_skill_level"], "Expert")
        self.assertEqual(res[0]["skill_level"], "Advanced")

    # ──────────────────────────────────────────────────────────────────────────
    # 3. Feature 05 Parentheses Typology Integration
    # ──────────────────────────────────────────────────────────────────────────

    def test_16_level_only_parentheses(self):
        """'Microsoft Office (Advanced)' applies level and cleans base skill."""
        raw = "Microsoft Office (Advanced)"
        res = self.pipeline.decompose(raw)
        self.assertEqual(len(res), 1)
        self.assertEqual(res[0]["atomic_skill"], "Microsoft Office")
        self.assertEqual(res[0]["extracted_skill_level"], "Advanced")
        self.assertEqual(res[0]["skill_level"], "Advanced")

    def test_17_acronym_expansion_resolution(self):
        """'Amazon Web Services (AWS)' resolves to canonical skill name."""
        raw = "Amazon Web Services (AWS)"
        res = self.pipeline.decompose(raw)
        self.assertEqual(len(res), 1)
        self.assertIn(res[0]["atomic_skill"], ["Amazon Web Services", "AWS"])

    def test_18_abap_acronym_expansion(self):
        """'ABAP (Advanced Business Application Programming)' resolves to ABAP."""
        raw = "ABAP (Advanced Business Application Programming)"
        res = self.pipeline.decompose(raw)
        self.assertEqual(len(res), 1)
        self.assertEqual(res[0]["atomic_skill"], "ABAP")

    def test_19_bms_acronym_expansion(self):
        """'Building Management System (BMS) Integration' resolves to single skill."""
        raw = "Building Management System (BMS) Integration"
        res = self.pipeline.decompose(raw)
        self.assertEqual(len(res), 1)

    def test_20_category_container_decomposition(self):
        """'Development Tools (Git, Jira)' extracts leaf tools, container in sidecar."""
        raw = "Development Tools (Git, Jira)"
        res = self.pipeline.decompose(raw)
        skills = [r["atomic_skill"] for r in res]
        self.assertIn("Git", skills)
        self.assertIn("Jira", skills)

        sidecar = self.pipeline.get_sidecar_metadata(raw)
        self.assertEqual(sidecar["category_container"], "Development Tools")

    def test_21_colon_category_container(self):
        """'Programming Languages: Python, Go' extracts leaf tools, container in sidecar."""
        raw = "Programming Languages: Python, Go"
        res = self.pipeline.decompose(raw)
        skills = [r["atomic_skill"] for r in res]
        self.assertIn("Python", skills)
        self.assertIn("Go", skills)

        sidecar = self.pipeline.get_sidecar_metadata(raw)
        self.assertEqual(sidecar["category_container"], "Programming Languages")

    def test_22_industry_context_isolation(self):
        """'Sales Experience (Transportation & Logistics)' moves sector to sidecar."""
        raw = "Sales Experience (Transportation & Logistics)"
        res = self.pipeline.decompose(raw)
        self.assertEqual(len(res), 1)
        self.assertEqual(res[0]["atomic_skill"], "Sales")

        sidecar = self.pipeline.get_sidecar_metadata(raw)
        self.assertEqual(sidecar["industry_context"], "Transportation & Logistics")

    def test_23_subskill_specification_rows(self):
        """'Advanced Excel (Cost & Quantity Tracking)' emits main row + specification rows."""
        raw = "Advanced Excel (Cost & Quantity Tracking)"
        res = self.pipeline.decompose(raw)
        self.assertGreaterEqual(len(res), 2)
        self.assertEqual(res[0]["atomic_skill"], "Excel")
        self.assertEqual(res[0]["skill_level"], "Advanced")

        spec_statuses = [r["match_status"] for r in res[1:]]
        self.assertTrue(all(s == PARENTHESIS_SPECIFICATION for s in spec_statuses))

    def test_24_regulatory_form_consolidation(self):
        """'Social Insurance (Forms 1, 2, 6)' protects statutory form numbers from fragmentation."""
        raw = "Social Insurance (Forms 1, 2, 6)"
        res = self.pipeline.decompose(raw)
        self.assertGreaterEqual(len(res), 1)
        skills = [r["atomic_skill"] for r in res]
        self.assertNotIn("1", skills)
        self.assertNotIn("2", skills)
        self.assertNotIn("6", skills)

    def test_25_dual_parentheses_acronyms_delimited(self):
        """'AWS (Amazon Web Services) & GCP (Google Cloud Platform)' resolves both pairs."""
        raw = "AWS (Amazon Web Services) & GCP (Google Cloud Platform)"
        res = self.pipeline.decompose(raw)
        self.assertEqual(len(res), 2)
        skills = [r["atomic_skill"] for r in res]
        self.assertIn("AWS", skills)
        self.assertIn("GCP", skills)

    def test_26_dual_parentheses_industry_contexts(self):
        """'Sales (Real Estate) & Marketing (Hospitality)' splits on & and preserves both skills."""
        raw = "Sales (Real Estate) & Marketing (Hospitality)"
        res = self.pipeline.decompose(raw)
        self.assertEqual(len(res), 2)
        skills = [r["atomic_skill"] for r in res]
        self.assertIn("Sales", skills)
        self.assertIn("Marketing", skills)

    # ──────────────────────────────────────────────────────────────────────────
    # 4. Feature 07 Delimiter Splitting & Context Graph
    # ──────────────────────────────────────────────────────────────────────────

    def test_27_ampersand_splitting(self):
        """'Python & SQL' splits into 2 atomic skills with separated_by='&'."""
        res = self.pipeline.decompose("Python & SQL")
        self.assertEqual(len(res), 2)
        self.assertEqual(res[0]["atomic_skill"], "Python")
        self.assertEqual(res[1]["atomic_skill"], "SQL")
        self.assertEqual(res[0]["separated_by"], "&")

    def test_28_slash_splitting(self):
        """'Docker / Kubernetes' splits into 2 atomic skills with separated_by='/'."""
        res = self.pipeline.decompose("Docker / Kubernetes")
        self.assertEqual(len(res), 2)
        self.assertEqual(res[0]["atomic_skill"], "Docker")
        self.assertEqual(res[1]["atomic_skill"], "Kubernetes")
        self.assertEqual(res[0]["separated_by"], "/")

    def test_29_comma_splitting(self):
        """'HTML, CSS, JavaScript' splits into 3 atomic skills."""
        res = self.pipeline.decompose("HTML, CSS, JavaScript")
        self.assertEqual(len(res), 3)
        self.assertEqual([r["atomic_skill"] for r in res], ["HTML", "CSS", "JavaScript"])

    def test_30_hyphen_splitting(self):
        """'Jira - Confluence' splits on hyphen delimiter."""
        res = self.pipeline.decompose("Jira - Confluence")
        self.assertEqual(len(res), 2)
        self.assertEqual(res[0]["atomic_skill"], "Jira")
        self.assertEqual(res[1]["atomic_skill"], "Confluence")

    def test_31_word_and_splitting(self):
        """'Accounting and Auditing' splits on word 'and' delimiter."""
        res = self.pipeline.decompose("Accounting and Auditing")
        self.assertEqual(len(res), 2)
        self.assertEqual(res[0]["atomic_skill"], "Accounting")
        self.assertEqual(res[1]["atomic_skill"], "Auditing")

    def test_32_context_graph_preservation(self):
        """Context graph correctly connects separated_from_before and separated_from_after."""
        res = self.pipeline.decompose("Python, SQL, Docker")
        self.assertEqual(len(res), 3)
        # First
        self.assertEqual(res[0]["separated_from_before"], "")
        self.assertEqual(res[0]["separated_from_after"], "SQL")
        # Middle
        self.assertEqual(res[1]["separated_from_before"], "Python")
        self.assertEqual(res[1]["separated_from_after"], "Docker")
        # Last
        self.assertEqual(res[2]["separated_from_before"], "SQL")
        self.assertEqual(res[2]["separated_from_after"], "")

    def test_33_pipe_delimiter_splitting(self):
        """'Python | SQL | Docker' splits cleanly on pipes."""
        res = self.pipeline.decompose("Python | SQL | Docker")
        self.assertEqual(len(res), 3)
        self.assertEqual([r["atomic_skill"] for r in res], ["Python", "SQL", "Docker"])

    def test_34_hierarchical_precedence_semicolon_over_comma(self):
        """Hard delimiter ';' takes precedence over soft delimiters."""
        res = self.pipeline.decompose("Python & Pandas; SQL & PostgreSQL")
        self.assertGreaterEqual(len(res), 2)
        skills = [r["atomic_skill"] for r in res]
        self.assertIn("Python", skills)
        self.assertIn("SQL", skills)

    def test_35_telecom_networks_generation_slash_stack(self):
        """'2G/3G/4G/5G Networks' splits cleanly into generations."""
        raw = "2G/3G/4G/5G Networks"
        res = self.pipeline.decompose(raw)
        skills = [r["atomic_skill"] for r in res]
        for gen in ["2G", "3G", "4G", "5G"]:
            self.assertIn(gen, skills)

    def test_36_sit_uat_management_splitting(self):
        """'SIT/UAT Management' splits into SIT and UAT."""
        raw = "SIT/UAT Management"
        res = self.pipeline.decompose(raw)
        self.assertGreaterEqual(len(res), 2)
        skills = [r["atomic_skill"] for r in res]
        self.assertTrue(any("SIT" in s for s in skills))
        self.assertTrue(any("UAT" in s for s in skills))

    def test_37_civil_structural_engineering(self):
        """'Civil/Structural Engineering' dual engineering discipline."""
        raw = "Civil/Structural Engineering"
        res = self.pipeline.decompose(raw)
        self.assertEqual(len(res), 2)
        skills = [r["atomic_skill"] for r in res]
        self.assertIn("Civil Engineering", skills)
        self.assertIn("Structural Engineering", skills)
        self.assertEqual(res[0]["domain"], "Engineering & Construction")

    # ──────────────────────────────────────────────────────────────────────────
    # 5. Edge Cases, Guardrails & Defensive Engineering
    # ──────────────────────────────────────────────────────────────────────────

    def test_38_empty_string_input(self):
        """Empty string returns empty list without error."""
        self.assertEqual(self.pipeline.decompose(""), [])
        self.assertEqual(self.pipeline.decompose(None), [])

    def test_39_whitespace_only_input(self):
        """Whitespace-only strings return empty list without error."""
        for ws in ["   ", "\t", "\n", "\r\n", "  \t\n  "]:
            self.assertEqual(self.pipeline.decompose(ws), [])

    def test_40_punctuation_only_noise(self):
        """Punctuation-only string is rejected as noise."""
        for p in [";;;", "...", "---", ",,,", "///"]:
            res = self.pipeline.decompose(p)
            self.assertEqual(len(res), 1)
            self.assertEqual(res[0]["match_status"], REJECTED_NOISE)

    def test_41_single_character_noise(self):
        """Single non-whitelisted characters are rejected cleanly."""
        res = self.pipeline.decompose("Z")
        self.assertEqual(len(res), 1)
        self.assertEqual(res[0]["match_status"], REJECTED_NOISE)
        self.assertIn("short", res[0]["rejection_reason"].lower())

    def test_42_whitelisted_single_characters(self):
        """C and R are whitelisted single character programming languages."""
        for ch in ["C", "R"]:
            res = self.pipeline.decompose(ch)
            self.assertEqual(len(res), 1)
            self.assertNotEqual(res[0]["match_status"], REJECTED_NOISE)

    def test_43_oversized_input_no_truncation(self):
        """Input exceeding 20,000 characters sets is_oversized without truncation."""
        long_input = "Python & " * 3000 + "SQL"
        self.assertGreater(len(long_input), 20000)
        tokens = self.pipeline.decompose_to_tokens(long_input)
        self.assertTrue(any(t.is_oversized for t in tokens))

    def test_44_unbalanced_parentheses_resilience(self):
        """Unmatched opening or closing parentheses do not crash."""
        for p in ["Python (Advanced", "Python Advanced)"]:
            res = self.pipeline.decompose(p)
            self.assertGreaterEqual(len(res), 1)
            self.assertIn("Python", res[0]["atomic_skill"])

    def test_45_empty_parentheses_cleanup(self):
        """Empty parentheses 'Python ()' cleans to 'Python' without noise error."""
        res = self.pipeline.decompose("Python ()")
        self.assertEqual(len(res), 1)
        self.assertEqual(res[0]["atomic_skill"], "Python")

    def test_46_clustered_delimiters_cleaned(self):
        """Clustered delimiters like '///' or '&&&' are handled cleanly without empty tokens."""
        raw = "Python /// SQL &&& Docker --- Git"
        res = self.pipeline.decompose(raw)
        skills = [r["atomic_skill"] for r in res if r["match_status"] != REJECTED_NOISE]
        self.assertIn("Python", skills)
        self.assertIn("SQL", skills)
        self.assertIn("Docker", skills)
        self.assertIn("Git", skills)

    def test_47_smart_quotes_stripped(self):
        """Smart quotes around skill are stripped cleanly."""
        res = self.pipeline.decompose("“Python”")
        self.assertEqual(len(res), 1)
        self.assertEqual(res[0]["atomic_skill"], "Python")

    # ──────────────────────────────────────────────────────────────────────────
    # 6. Determinism & Performance Benchmarks
    # ──────────────────────────────────────────────────────────────────────────

    def test_48_determinism_across_multiple_runs(self):
        """Same input must yield byte-for-byte identical output on repeated runs."""
        raw = "Python (Advanced) & Docker (Intermediate); CI/CD"
        res1 = self.pipeline.decompose(raw)
        res2 = self.pipeline.decompose(raw)
        self.assertEqual(res1, res2)

    def test_49_atomic_decomposition_pipeline_adapter(self):
        """AtomicDecompositionPipeline adapter instantiates and executes identically."""
        engine = AtomicDecompositionPipeline()
        res = engine.decompose("Python & SQL")
        self.assertEqual(len(res), 2)
        self.assertEqual(res[0]["atomic_skill"], "Python")
        self.assertEqual(res[1]["atomic_skill"], "SQL")

    def test_50_submillisecond_execution_performance(self):
        """Decomposing 200 standard composite skills must average under 5 ms per input."""
        samples = [
            "Python & SQL",
            "Docker / Kubernetes",
            "Microsoft Office (Advanced)",
            "PL/SQL & C/C++",
            "HTML, CSS, JavaScript",
        ] * 40  # 200 items

        t0 = time.perf_counter()
        for s in samples:
            self.pipeline.decompose(s)
        total_time = time.perf_counter() - t0
        avg_ms = (total_time / len(samples)) * 1000

        print(f"\n[BENCHMARK] M2.3 Pipeline Integration: {len(samples)} decompositions in {total_time:.3f}s ({avg_ms:.3f} ms/item)")
        self.assertLess(avg_ms, 5.0, f"Average execution time {avg_ms:.2f} ms exceeded 5.0 ms limit")


if __name__ == "__main__":
    unittest.main()
