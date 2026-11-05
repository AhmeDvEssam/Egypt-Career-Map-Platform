"""
Benchmark Spec Traces Test Suite
================================
Validates the authoritative execution traces audited in Section 10 of
`master_skill_level_governance_and_audit_specification_v3.md` and related
spec-mandated benchmarks.
"""

import unittest
from tests.test_helpers import (
    OpaqueBoxTestCase,
    get_pipeline,
)


class TestBenchmarkSpecTraces(OpaqueBoxTestCase):
    """Audited End-to-End Traces from Section 10 of Governance Spec v3."""

    @classmethod
    def setUpClass(cls):
        cls.pipeline = get_pipeline()

    def test_trace_01_mastery_of_python(self):
        """TRACE 1: 'Mastery of Python' -> Advanced level, exact verbatim extracted level."""
        raw = "Mastery of Python"
        results = self.pipeline.decompose(raw)
        self.assertGreaterEqual(len(results), 1)
        row = results[0]
        self.assert_14_column_contract(row, raw_skill=raw)
        self.assertEqual(row["atomic_skill"], "Python")
        self.assertEqual(row["extracted_skill_level"], "Mastery")
        self.assertEqual(row["skill_level"], "Advanced")
        self.assertEqual(row["skill_type"], "Tool / Software")
        self.assertIn(row["domain"], ["Software Engineering & IT", "Data Science & Analytics"])
        self.assertEqual(row["match_status"], "CATALOG_EXACT_MATCH")

    def test_trace_02_working_knowledge_of_docker(self):
        """TRACE 2: 'Working knowledge of Docker' -> Intermediate level, lowercase 'k' preserved."""
        raw = "Working knowledge of Docker"
        results = self.pipeline.decompose(raw)
        self.assertGreaterEqual(len(results), 1)
        row = results[0]
        self.assert_14_column_contract(row, raw_skill=raw)
        self.assertEqual(row["atomic_skill"], "Docker")
        self.assertEqual(row["extracted_skill_level"], "Working knowledge")
        self.assertEqual(row["skill_level"], "Intermediate")
        self.assertEqual(row["skill_type"], "Tool / Software")
        self.assertIn(row["domain"], ["Software Engineering & IT", "Data Science & Analytics"])
        self.assertEqual(row["match_status"], "CATALOG_EXACT_MATCH")

    def test_trace_03_solid_understanding_of_git(self):
        """TRACE 3: 'Solid understanding of Git' -> Ambiguous modifier held to Not Specified."""
        raw = "Solid understanding of Git"
        results = self.pipeline.decompose(raw)
        self.assertGreaterEqual(len(results), 1)
        row = results[0]
        self.assert_14_column_contract(row, raw_skill=raw)
        self.assertEqual(row["atomic_skill"], "Git")
        self.assertEqual(row["extracted_skill_level"], "Solid")
        self.assertEqual(row["skill_level"], "Not Specified")
        self.assertEqual(row["skill_type"], "Tool / Software")
        self.assertEqual(row["match_status"], "CATALOG_EXACT_MATCH")

    def test_trace_04_strong_communication_skills(self):
        """TRACE 4: 'Strong communication skills' -> Soft skills default to Not Specified."""
        raw = "Strong communication skills"
        results = self.pipeline.decompose(raw)
        self.assertGreaterEqual(len(results), 1)
        row = results[0]
        self.assert_14_column_contract(row, raw_skill=raw)
        self.assertEqual(row["atomic_skill"], "Communication")
        self.assertEqual(row["extracted_skill_level"], "Strong")
        self.assertEqual(row["skill_level"], "Not Specified")
        self.assertEqual(row["skill_type"], "Soft Skill")
        self.assertEqual(row["match_status"], "CATALOG_EXACT_MATCH")

    def test_trace_05_fluent_english(self):
        """TRACE 5: 'Fluent English' -> Free-form adjective isolated, NOT forced into C1."""
        raw = "Fluent English"
        results = self.pipeline.decompose(raw)
        self.assertGreaterEqual(len(results), 1)
        row = results[0]
        self.assert_14_column_contract(row, raw_skill=raw)
        self.assertEqual(row["atomic_skill"], "English")
        self.assertEqual(row["extracted_skill_level"], "Fluent")
        self.assertEqual(row["skill_level"], "Not Specified")
        self.assertEqual(row["skill_type"], "Language")
        self.assertEqual(row["match_status"], "CATALOG_EXACT_MATCH")

    def test_trace_06_english_b2(self):
        """TRACE 6: 'English (B2)' -> Explicit CEFR code recognized in language level."""
        raw = "English (B2)"
        results = self.pipeline.decompose(raw)
        self.assertGreaterEqual(len(results), 1)
        row = results[0]
        self.assert_14_column_contract(row, raw_skill=raw)
        self.assertEqual(row["atomic_skill"], "English")
        self.assertEqual(row["extracted_skill_level"], "B2")
        self.assertEqual(row["skill_level"], "B2 (Upper Intermediate)")
        self.assertEqual(row["skill_type"], "Language")
        self.assertEqual(row["match_status"], "CATALOG_EXACT_MATCH")

    def test_trace_07_istqb_advanced_level(self):
        """TRACE 7: 'ISTQB Advanced Level' -> Exam track in extracted level, sidecar captures track."""
        raw = "ISTQB Advanced Level"
        results = self.pipeline.decompose(raw)
        self.assertGreaterEqual(len(results), 1)
        row = results[0]
        self.assert_14_column_contract(row, raw_skill=raw)
        self.assertEqual(row["atomic_skill"], "ISTQB")
        self.assertEqual(row["extracted_skill_level"], "Advanced")
        self.assertEqual(row["skill_level"], "Not Specified")
        self.assertEqual(row["skill_type"], "Certification")
        self.assertEqual(row["match_status"], "UNMATCHED_NOVEL")

        # Sidecar check
        sidecar = self.pipeline.get_sidecar_metadata(raw)
        self.assert_11_column_sidecar_contract(sidecar, raw_skill=raw)
        self.assertEqual(sidecar["credential_track_or_status"], "Advanced Level")

    def test_trace_08_lead_generation(self):
        """TRACE 8: 'Lead Generation' -> Shielded proper noun, NEVER stripped or converted to job role."""
        raw = "Lead Generation"
        results = self.pipeline.decompose(raw)
        self.assertGreaterEqual(len(results), 1)
        row = results[0]
        self.assert_14_column_contract(row, raw_skill=raw)
        self.assertEqual(row["atomic_skill"], "Lead Generation")
        self.assertEqual(row["extracted_skill_level"], "Not Specified")
        self.assertEqual(row["skill_level"], "Not Specified")
        self.assertEqual(row["skill_type"], "Hard Skill")
        self.assertIn(row["domain"], ["Marketing & Sales", "Sales & Business Development"])
        self.assertEqual(row["match_status"], "PROTECTED_PROPER_NOUN")

    def test_trace_09_lead_time_reduction(self):
        """TRACE 9: 'Lead Time Reduction' -> Manufacturing cycle time discipline; NOT team lead."""
        raw = "Lead Time Reduction"
        results = self.pipeline.decompose(raw)
        self.assertGreaterEqual(len(results), 1)
        row = results[0]
        self.assert_14_column_contract(row, raw_skill=raw)
        self.assertEqual(row["atomic_skill"], "Lead Time Reduction")
        self.assertEqual(row["extracted_skill_level"], "Not Specified")
        self.assertEqual(row["skill_level"], "Not Specified")
        self.assertEqual(row["skill_type"], "Hard Skill")
        self.assertEqual(row["domain"], "Operations & Project Management")
        self.assertEqual(row["sub_category"], "Business Operations & Process Improvement")
        self.assertEqual(row["match_status"], "PROTECTED_PROPER_NOUN")

    def test_trace_10_google_tag_manager(self):
        """TRACE 10: 'Google Tag Manager (GTM)' -> Software product; 'Manager' is NOT a job role."""
        raw = "Google Tag Manager (GTM)"
        results = self.pipeline.decompose(raw)
        self.assertGreaterEqual(len(results), 1)
        row = results[0]
        self.assert_14_column_contract(row, raw_skill=raw)
        self.assertEqual(row["atomic_skill"], "Google Tag Manager")
        self.assertEqual(row["extracted_skill_level"], "Not Specified")
        self.assertEqual(row["skill_level"], "Not Specified")
        self.assertEqual(row["skill_type"], "Tool / Software")
        self.assertEqual(row["match_status"], "CATALOG_EXACT_MATCH")

    def test_trace_11_senior_cpp_engineer(self):
        """TRACE 11: 'Senior C++ Engineer' (Adversarial) -> Senior captured in sidecar, not skill level."""
        raw = "Senior C++ Engineer"
        results = self.pipeline.decompose(raw)
        self.assertGreaterEqual(len(results), 1)
        row = results[0]
        self.assert_14_column_contract(row, raw_skill=raw)
        self.assertEqual(row["atomic_skill"], "C++")
        self.assertEqual(row["extracted_skill_level"], "Not Specified")
        self.assertEqual(row["skill_level"], "Not Specified")
        self.assertEqual(row["skill_type"], "Tool / Software")

        # Sidecar check
        sidecar = self.pipeline.get_sidecar_metadata(raw)
        self.assert_11_column_sidecar_contract(sidecar, raw_skill=raw)
        self.assertIn("Senior", sidecar["intra_string_seniority"])

    def test_trace_12_protected_compound_pl_sql(self):
        """TRACE 12: 'PL/SQL' -> Protected slash compound, NEVER split into 'PL' and 'SQL'."""
        raw = "PL/SQL"
        results = self.pipeline.decompose(raw)
        self.assertEqual(len(results), 1, "PL/SQL must produce exactly one atomic component")
        row = results[0]
        self.assert_14_column_contract(row, raw_skill=raw)
        self.assertEqual(row["atomic_skill"], "PL/SQL")
        self.assertIn(row["match_status"], ["CATALOG_EXACT_MATCH", "UNMATCHED_NOVEL"])

    def test_trace_13_protected_compound_ci_cd(self):
        """TRACE 13: 'CI/CD' -> Protected slash compound, NEVER split into 'CI' and 'CD'."""
        raw = "CI/CD"
        tokens = self.pipeline.decompose_to_tokens(raw)
        self.assertEqual(len(tokens), 1, "CI/CD must produce exactly one atomic component")
        self.assertEqual(tokens[0].atomic_skill, "CI/CD")
        results = self.pipeline.decompose(raw)
        self.assertGreaterEqual(len(results), 1)
        self.assertTrue(all(r["atomic_skill"] == "CI/CD" for r in results))
        row = results[0]
        self.assert_14_column_contract(row, raw_skill=raw)
        self.assertEqual(row["atomic_skill"], "CI/CD")
        self.assertIn(row["match_status"], ["CATALOG_EXACT_MATCH", "UNMATCHED_NOVEL"])

    def test_trace_14_parenthesis_subskill_specification(self):
        """TRACE 14: 'Advanced Excel (Cost & Quantity Tracking)' -> Parent row + child specification rows."""
        raw = "Advanced Excel (Cost & Quantity Tracking)"
        tokens = self.pipeline.decompose_to_tokens(raw)
        self.assertGreaterEqual(len(tokens), 2)
        results = self.pipeline.decompose(raw)
        self.assertGreaterEqual(len(results), 2, "Must produce main row plus specification sub-rows")

        # Check main row
        main_row = results[0]
        self.assertEqual(main_row["atomic_skill"], "Excel")
        self.assertEqual(main_row["skill_level"], "Advanced")

        # Check child specification rows
        spec_rows = [r for r in results if r["match_status"] == "PARENTHESIS_SPECIFICATION"]
        sub_skills = [r["atomic_skill"] for r in spec_rows]
        self.assertIn("Cost", sub_skills)
        for r in spec_rows:
            self.assertEqual(r["match_status"], "PARENTHESIS_SPECIFICATION")

    def test_trace_15_category_container(self):
        """TRACE 15: 'AI Development Tools (Claude Code, Codex)' -> Leaf tools extracted, container in sidecar."""
        raw = "AI Development Tools (Claude Code, Codex)"
        results = self.pipeline.decompose(raw)
        leaf_skills = [r["atomic_skill"] for r in results]
        self.assertTrue(
            "Claude Code" in leaf_skills or "Codex" in leaf_skills,
            "Leaf skills inside container must be decomposed",
        )

        sidecar = self.pipeline.get_sidecar_metadata(raw)
        self.assert_11_column_sidecar_contract(sidecar, raw_skill=raw)
        self.assertEqual(sidecar["category_container"], "AI Development Tools")

    def test_trace_16_industry_context(self):
        """TRACE 16: 'Sales Experience (Transportation & Logistics)' -> Sector moved to sidecar."""
        raw = "Sales Experience (Transportation & Logistics)"
        results = self.pipeline.decompose(raw)
        self.assertGreaterEqual(len(results), 1)
        row = results[0]
        self.assertEqual(row["atomic_skill"], "Sales")

        sidecar = self.pipeline.get_sidecar_metadata(raw)
        self.assert_11_column_sidecar_contract(sidecar, raw_skill=raw)
        self.assertEqual(sidecar["industry_context"], "Transportation & Logistics")


if __name__ == "__main__":
    unittest.main()
