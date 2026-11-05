"""
Tier 4: Real-World Egyptian Workloads Test Suite
================================================
Validates decomposition on authentic, verified skill phrases sampled directly
from Egyptian job postings stored in `skills.csv` and `egypt_jobs_db`.
"""

import unittest
from tests.test_helpers import (
    OpaqueBoxTestCase,
    get_pipeline,
)


class TestTier4RealWorldWorkloads(OpaqueBoxTestCase):
    """Real Egyptian labor market skill phrases sampled from skills.csv."""

    @classmethod
    def setUpClass(cls):
        cls.pipeline = get_pipeline()

    # --------------------------------------------------------------------------
    # 1. Egyptian Trade, Customs & Regulatory Compliance
    # --------------------------------------------------------------------------
    def test_cargox_acid_form4_documentation(self):
        """'CargoX/ACID/Form 4 Documentation' from Egyptian import/export logistics."""
        raw = "CargoX/ACID/Form 4 Documentation"
        res = self.pipeline.decompose(raw)
        self.assertGreaterEqual(len(res), 2)
        skills = [r["atomic_skill"] for r in res]
        self.assertTrue(any("CargoX" in s for s in skills))
        self.assertTrue(any("ACID" in s for s in skills))

    def test_ifrs_ias_accounting_standards(self):
        """'IFRS/IAS' international accounting and financial reporting standards."""
        raw = "IFRS/IAS"
        res = self.pipeline.decompose(raw)
        self.assertGreaterEqual(len(res), 1)
        for r in res:
            self.assert_14_column_contract(r, raw_skill=raw)

    # --------------------------------------------------------------------------
    # 2. Engineering, Construction & BOQ in Egyptian Industry
    # --------------------------------------------------------------------------
    def test_boq_preparation_quantity_takeoff(self):
        """'BOQ preparation, quantity take-off, and measurements' civil engineering phrase."""
        raw = "BOQ preparation, quantity take-off, and measurements"
        res = self.pipeline.decompose(raw)
        self.assertGreaterEqual(len(res), 2)
        skills = [r["atomic_skill"] for r in res]
        self.assertTrue(any("BOQ" in s for s in skills))

    def test_civil_structural_engineering(self):
        """'Civil/Structural Engineering' dual engineering discipline."""
        raw = "Civil/Structural Engineering"
        res = self.pipeline.decompose(raw)
        self.assertEqual(len(res), 2)
        self.assertEqual(res[0]["atomic_skill"], "Civil Engineering")
        self.assertEqual(res[1]["atomic_skill"], "Structural Engineering")
        for r in res:
            self.assertEqual(r["domain"], "Engineering & Construction")

    def test_pand_id_and_ga_drawings(self):
        """'P&ID and GA Drawings' piping & instrumentation diagram engineering phrase."""
        raw = "P&ID and GA Drawings"
        res = self.pipeline.decompose(raw)
        self.assertGreaterEqual(len(res), 2)
        skills = [r["atomic_skill"] for r in res]
        self.assertIn("P&ID", skills)

    def test_bms_integration(self):
        """'Building Management System (BMS) Integration' building automation skill."""
        raw = "Building Management System (BMS) Integration"
        res = self.pipeline.decompose(raw)
        self.assertEqual(len(res), 1)
        self.assertIn("Building Management System", res[0]["atomic_skill"])

    # --------------------------------------------------------------------------
    # 3. Telecommunications & Infrastructure
    # --------------------------------------------------------------------------
    def test_telecom_networks_generation_slash_stack(self):
        """'2G/3G/4G/5G Networks' telecommunications generation slash stack."""
        raw = "2G/3G/4G/5G Networks"
        res = self.pipeline.decompose(raw)
        self.assertGreaterEqual(len(res), 4)
        skills = [r["atomic_skill"] for r in res]
        # Short valid tokens 2G, 3G, 4G, 5G must not be rejected as noise
        for gen in ["2G", "3G", "4G", "5G"]:
            self.assertIn(gen, skills)

    def test_azure_iaas_paas(self):
        """'Azure IaaS/PaaS' cloud service model slash stack."""
        raw = "Azure IaaS/PaaS"
        res = self.pipeline.decompose(raw)
        self.assertGreaterEqual(len(res), 1)
        for r in res:
            self.assert_14_column_contract(r, raw_skill=raw)

    def test_sit_uat_management(self):
        """'SIT/UAT Management' software testing integration & user acceptance testing."""
        raw = "SIT/UAT Management"
        res = self.pipeline.decompose(raw)
        self.assertGreaterEqual(len(res), 2)
        skills = [r["atomic_skill"] for r in res]
        self.assertTrue(any("SIT" in s for s in skills))
        self.assertTrue(any("UAT" in s for s in skills))

    # --------------------------------------------------------------------------
    # 4. Enterprise Applications & Certifications
    # --------------------------------------------------------------------------
    def test_abap_advanced_business_application_programming(self):
        """'ABAP (Advanced Business Application Programming)' SAP development skill."""
        raw = "ABAP (Advanced Business Application Programming)"
        res = self.pipeline.decompose(raw)
        self.assertEqual(len(res), 1)
        self.assertEqual(res[0]["skill_level"], "Not Specified")

    def test_cfa_frm_certifications(self):
        """'CFA/FRM Certifications' dual financial credentials."""
        raw = "CFA/FRM Certifications"
        tokens = self.pipeline.decompose_to_tokens(raw)
        self.assertEqual(len(tokens), 2)
        skills = [t.atomic_skill for t in tokens]
        self.assertIn("CFA", skills)
        self.assertIn("FRM", skills)
        res = self.pipeline.decompose(raw)
        self.assertGreaterEqual(len(res), 2)
        for r in res:
            self.assertEqual(r["skill_type"], "Certification")

    def test_c_cpp_programming(self):
        """'C/C++ Programming' systems programming language pair."""
        raw = "C/C++ Programming"
        res = self.pipeline.decompose(raw)
        self.assertEqual(len(res), 1)
        self.assertEqual(res[0]["atomic_skill"], "C/C++")

    # --------------------------------------------------------------------------
    # 5. Sales, Business & HR Real Workloads
    # --------------------------------------------------------------------------
    def test_channel_field_sales_management(self):
        """'Channel/Field Sales Management' commercial sales leadership."""
        raw = "Channel/Field Sales Management"
        res = self.pipeline.decompose(raw)
        self.assertGreaterEqual(len(res), 2)
        skills = [r["atomic_skill"] for r in res]
        self.assertTrue(any("Channel" in s for s in skills))
        self.assertTrue(any("Field" in s for s in skills))

    def test_hr_policies_and_procedures(self):
        """'HR Policies and Procedures' human resources operational skill."""
        raw = "HR Policies and Procedures"
        res = self.pipeline.decompose(raw)
        self.assertGreaterEqual(len(res), 1)
        self.assert_14_column_contract(res[0], raw_skill=raw)

    def test_workplace_diversity_and_inclusion(self):
        """'Workplace Diversity and Inclusion' talent acquisition / corporate skill."""
        raw = "Workplace Diversity and Inclusion"
        res = self.pipeline.decompose(raw)
        self.assertGreaterEqual(len(res), 1)
        self.assert_14_column_contract(res[0], raw_skill=raw)


if __name__ == "__main__":
    unittest.main()
