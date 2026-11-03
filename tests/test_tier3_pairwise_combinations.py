"""
Tier 3: Pairwise & Cross-Feature Combinations Test Suite
========================================================
Validates interactions between multiple linguistic intelligence features:
compounds with levels and parentheses, containers with delimiters, proper nouns
with standard skills, multiple parenthetical clauses, certifications, and languages.
"""

import unittest
from tests.test_helpers import (
    OpaqueBoxTestCase,
    get_pipeline,
)


class TestTier3PairwiseCombinations(OpaqueBoxTestCase):
    """Pairwise and multi-way feature interactions."""

    @classmethod
    def setUpClass(cls):
        cls.pipeline = get_pipeline()

    # --------------------------------------------------------------------------
    # 1. Compound + Level + Parentheses Interactions
    # --------------------------------------------------------------------------
    def test_senior_pl_sql_advanced(self):
        """'Senior PL/SQL (Advanced)' combines compound protection, seniority capture, and level."""
        raw = "Senior PL/SQL (Advanced)"
        res = self.pipeline.decompose(raw)
        self.assertEqual(len(res), 1)
        row = res[0]
        self.assertEqual(row["atomic_skill"], "PL/SQL")
        self.assertEqual(row["extracted_skill_level"], "Advanced")
        self.assertEqual(row["skill_level"], "Advanced")

        sidecar = self.pipeline.get_sidecar_metadata(raw)
        self.assertIn("Senior", sidecar["intra_string_seniority"])

    def test_ci_cd_pipelines_intermediate(self):
        """'CI/CD Pipelines (Intermediate)' protects slash compound and extracts intermediate level."""
        raw = "CI/CD Pipelines (Intermediate)"
        res = self.pipeline.decompose(raw)
        self.assertEqual(len(res), 1)
        row = res[0]
        self.assertEqual(row["atomic_skill"], "CI/CD")
        self.assertEqual(row["skill_level"], "Intermediate")

    def test_ui_ux_design_expert(self):
        """'UI/UX Design (Expert)' protects compound and collapses expert to advanced."""
        raw = "UI/UX Design (Expert)"
        res = self.pipeline.decompose(raw)
        self.assertEqual(len(res), 1)
        row = res[0]
        self.assertEqual(row["atomic_skill"], "UI/UX")
        self.assertEqual(row["extracted_skill_level"], "Expert")
        self.assertEqual(row["skill_level"], "Advanced")

    def test_c_cpp_beginner(self):
        """'C/C++ (Beginner)' protects C/C++ compound with beginner level in parens."""
        raw = "C/C++ (Beginner)"
        res = self.pipeline.decompose(raw)
        self.assertEqual(len(res), 1)
        row = res[0]
        self.assertEqual(row["atomic_skill"], "C/C++")
        self.assertEqual(row["skill_level"], "Beginner")

    # --------------------------------------------------------------------------
    # 2. Container + Delimiter + Compound Interactions
    # --------------------------------------------------------------------------
    def test_container_languages_python_and_c_cpp(self):
        """'Languages (Python / C++)' container containing slash delimiter and compound C/C++."""
        raw = "Languages (Python / C++)"
        res = self.pipeline.decompose(raw)
        skills = [r["atomic_skill"] for r in res]
        self.assertIn("Python", skills)
        self.assertIn("C/C++", skills)

        sidecar = self.pipeline.get_sidecar_metadata(raw)
        self.assertEqual(sidecar["category_container"], "Languages")

    def test_container_database_technologies_pl_sql_and_redis(self):
        """'Database Technologies (PL/SQL, PostgreSQL & Redis)' container with protected compound."""
        raw = "Database Technologies (PL/SQL, PostgreSQL & Redis)"
        res = self.pipeline.decompose(raw)
        skills = [r["atomic_skill"] for r in res]
        self.assertIn("PL/SQL", skills)
        self.assertIn("PostgreSQL", skills)
        self.assertIn("Redis", skills)

        sidecar = self.pipeline.get_sidecar_metadata(raw)
        self.assertEqual(sidecar["category_container"], "Database Technologies")

    def test_container_devops_suite_ci_cd_and_docker(self):
        """'DevOps Suite (CI/CD, Docker & Kubernetes)' extracts leaf tools cleanly."""
        raw = "DevOps Suite (CI/CD, Docker & Kubernetes)"
        res = self.pipeline.decompose(raw)
        skills = [r["atomic_skill"] for r in res]
        self.assertIn("CI/CD", skills)
        self.assertIn("Docker", skills)
        self.assertIn("Kubernetes", skills)

    # --------------------------------------------------------------------------
    # 3. Proper Noun + Delimiter + Standard Skill Interactions
    # --------------------------------------------------------------------------
    def test_lead_generation_and_cold_calling(self):
        """'Lead Generation & Cold Calling' shields Lead Generation while splitting on '&'."""
        raw = "Lead Generation & Cold Calling"
        res = self.pipeline.decompose(raw)
        self.assertEqual(len(res), 2)
        self.assertEqual(res[0]["atomic_skill"], "Lead Generation")
        self.assertEqual(res[0]["match_status"], "PROTECTED_PROPER_NOUN")
        self.assertEqual(res[1]["atomic_skill"], "Cold Calling")

    def test_lead_time_reduction_and_lean_six_sigma(self):
        """'Lead Time Reduction / Lean Six Sigma' shields cycle time noun and splits slash."""
        raw = "Lead Time Reduction / Lean Six Sigma"
        res = self.pipeline.decompose(raw)
        self.assertEqual(len(res), 2)
        self.assertEqual(res[0]["atomic_skill"], "Lead Time Reduction")
        self.assertEqual(res[1]["atomic_skill"], "Lean Six Sigma")

    def test_senior_care_and_nursing(self):
        """'Senior Care, Nursing & Patient Support' shields Senior Care while splitting comma and '&'."""
        raw = "Senior Care, Nursing & Patient Support"
        res = self.pipeline.decompose(raw)
        skills = [r["atomic_skill"] for r in res]
        self.assertIn("Senior Care", skills)
        self.assertIn("Nursing", skills)

    def test_github_advanced_security_and_devsecops(self):
        """'GitHub Advanced Security & DevSecOps' shields product name while splitting '&'."""
        raw = "GitHub Advanced Security & DevSecOps"
        res = self.pipeline.decompose(raw)
        self.assertEqual(len(res), 2)
        self.assertEqual(res[0]["atomic_skill"], "GitHub Advanced Security")
        self.assertEqual(res[0]["skill_level"], "Not Specified")

    # --------------------------------------------------------------------------
    # 4. Multiple Parentheses Clauses in a Single String
    # --------------------------------------------------------------------------
    def test_dual_parentheses_levels(self):
        """'Python (Advanced) & Docker (Intermediate)' decomposes both with respective levels."""
        raw = "Python (Advanced) & Docker (Intermediate)"
        res = self.pipeline.decompose(raw)
        self.assertEqual(len(res), 2)
        self.assertEqual(res[0]["atomic_skill"], "Python")
        self.assertEqual(res[0]["skill_level"], "Advanced")
        self.assertEqual(res[1]["atomic_skill"], "Docker")
        self.assertEqual(res[1]["skill_level"], "Intermediate")

    def test_dual_parentheses_acronyms(self):
        """'AWS (Amazon Web Services) & GCP (Google Cloud Platform)' resolves both pairs."""
        raw = "AWS (Amazon Web Services) & GCP (Google Cloud Platform)"
        res = self.pipeline.decompose(raw)
        self.assertEqual(len(res), 2)
        skills = [r["atomic_skill"] for r in res]
        self.assertTrue(any("AWS" in s or "Amazon Web Services" in s for s in skills))
        self.assertTrue(any("GCP" in s or "Google Cloud Platform" in s for s in skills))

    def test_dual_parentheses_industry_contexts(self):
        """'Sales (Real Estate) & Marketing (Hospitality)' extracts core skills and contexts."""
        raw = "Sales (Real Estate) & Marketing (Hospitality)"
        res = self.pipeline.decompose(raw)
        skills = [r["atomic_skill"] for r in res]
        self.assertIn("Sales", skills)
        self.assertIn("Marketing", skills)

    # --------------------------------------------------------------------------
    # 5. Level Prefix + Redundant Suffix Interactions
    # --------------------------------------------------------------------------
    def test_level_prefix_and_redundant_suffix(self):
        """'Advanced Python programming skills' strips both level prefix and suffix 'skills'."""
        raw = "Advanced Python programming skills"
        res = self.pipeline.decompose(raw)
        self.assertEqual(len(res), 1)
        self.assertIn("Python", res[0]["atomic_skill"])
        self.assertEqual(res[0]["skill_level"], "Advanced")

    def test_working_knowledge_of_docker_technologies(self):
        """'Working knowledge of Docker technologies' cleans both ends."""
        raw = "Working knowledge of Docker technologies"
        res = self.pipeline.decompose(raw)
        self.assertEqual(len(res), 1)
        self.assertEqual(res[0]["atomic_skill"], "Docker")
        self.assertEqual(res[0]["skill_level"], "Intermediate")

    # --------------------------------------------------------------------------
    # 6. Ambiguous Modifiers across Multiple Skills
    # --------------------------------------------------------------------------
    def test_strong_python_and_solid_git(self):
        """'Strong Python and Solid Git' maps both to Not Specified while preserving verbatim."""
        raw = "Strong Python and Solid Git"
        res = self.pipeline.decompose(raw)
        self.assertEqual(len(res), 2)
        self.assertEqual(res[0]["atomic_skill"], "Python")
        self.assertEqual(res[0]["extracted_skill_level"], "Strong")
        self.assertEqual(res[0]["skill_level"], "Not Specified")

        self.assertEqual(res[1]["atomic_skill"], "Git")
        self.assertEqual(res[1]["extracted_skill_level"], "Solid")
        self.assertEqual(res[1]["skill_level"], "Not Specified")

    # --------------------------------------------------------------------------
    # 7. Certifications with Examination Track and Delimiters
    # --------------------------------------------------------------------------
    def test_istqb_advanced_and_pmp_certified(self):
        """'ISTQB Advanced Level & PMP Certified' handles track on one and award on other."""
        raw = "ISTQB Advanced Level & PMP Certified"
        res = self.pipeline.decompose(raw)
        self.assertEqual(len(res), 2)
        self.assertEqual(res[0]["atomic_skill"], "ISTQB")
        self.assertEqual(res[0]["extracted_skill_level"], "Advanced")
        self.assertEqual(res[0]["skill_level"], "Not Specified")

        self.assertEqual(res[1]["atomic_skill"], "PMP")
        self.assertEqual(res[1]["skill_level"], "Active / Certified")

    # --------------------------------------------------------------------------
    # 8. Language CEFR + Free-form Language Interactions
    # --------------------------------------------------------------------------
    def test_english_b2_and_fluent_arabic(self):
        """'English (B2) and Fluent Arabic' maps CEFR code on one and holds freeform on other."""
        raw = "English (B2) and Fluent Arabic"
        res = self.pipeline.decompose(raw)
        self.assertEqual(len(res), 2)
        self.assertEqual(res[0]["atomic_skill"], "English")
        self.assertEqual(res[0]["skill_level"], "B2 (Upper Intermediate)")

        self.assertEqual(res[1]["atomic_skill"], "Arabic")
        self.assertEqual(res[1]["extracted_skill_level"], "Fluent")
        self.assertEqual(res[1]["skill_level"], "Not Specified")

    # --------------------------------------------------------------------------
    # 9. Compound Slash Mixed with Consecutive Slashes
    # --------------------------------------------------------------------------
    def test_c_cpp_slash_python_slash_java(self):
        """'C/C++ / Python / Java' splits regular slashes while preserving C/C++ compound."""
        raw = "C/C++ / Python / Java"
        res = self.pipeline.decompose(raw)
        self.assertEqual(len(res), 3)
        self.assertEqual([r["atomic_skill"] for r in res], ["C/C++", "Python", "Java"])

    def test_etl_elt_slash_data_warehousing(self):
        """'ETL/ELT / Data Warehousing' preserves ETL/ELT compound and splits regular slash."""
        raw = "ETL/ELT / Data Warehousing"
        res = self.pipeline.decompose(raw)
        self.assertEqual(len(res), 2)
        self.assertEqual(res[0]["atomic_skill"], "ETL/ELT")
        self.assertEqual(res[1]["atomic_skill"], "Data Warehousing")


if __name__ == "__main__":
    unittest.main()
