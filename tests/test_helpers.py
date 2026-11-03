"""
Test Helpers and Opaque-Box Execution Adapters
==============================================
Provides shared fixtures, contract validators, schema constants, and progressive
module loaders for the Egypt Career Map test suite.
"""

import os
import sys
import json
import unittest
from pathlib import Path
from typing import Any, Dict, List, Optional

# Ensure project root is in sys.path
PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

# Data file paths
CATALOG_PATH = PROJECT_ROOT / "standard_skills_catalog.csv"
LEVELS_PATH = PROJECT_ROOT / "standard_skill_levels_matrix.csv"
ACRONYMS_PATH = PROJECT_ROOT / "skills_acronym_dictionary.json"
SKILLS_PATH = PROJECT_ROOT / "skills.csv"

# Frozen schemas per Master Specification v3
MAIN_14_COLUMNS = [
    "raw_skill",
    "atomic_skill",
    "matched_atomic_skill",
    "separated_by",
    "separated_from_before",
    "separated_from_after",
    "extracted_skill_level",
    "skill_level",
    "skill_type",
    "domain",
    "sub_category",
    "job_count",
    "match_status",
    "rejection_reason",
]

SIDECAR_11_COLUMNS = [
    "raw_skill",
    "job_count",
    "industry_context",
    "category_container",
    "parentheses_raw_content",
    "experience_duration",
    "intra_string_seniority",
    "credential_track_or_status",
    "posting_career_level_distribution",
    "top_associated_job_titles",
    "is_composite",
]

# Strict 6 permitted match statuses
ALLOWED_MATCH_STATUSES = {
    "CATALOG_EXACT_MATCH",
    "CATALOG_REGEX_MATCH",
    "PARENTHESIS_SPECIFICATION",
    "PROTECTED_PROPER_NOUN",
    "UNMATCHED_NOVEL",
    "REJECTED_NOISE",
}

# 14 Closed Taxonomy Domains
CLOSED_DOMAINS = {
    "Software Engineering & IT",
    "Data Science & Analytics",
    "Human Resources",
    "Operations & Project Management",
    "Business & Finance",
    "Marketing & Sales",
    "Supply Chain & Logistics",
    "Engineering & Construction",
    "Manufacturing & Industrial Production",
    "Vocational Trades, Driving & Field Services",
    "Healthcare & Medical Sciences",
    "Hospitality, Tourism & Food Services",
    "Education, Teaching & Training",
    "Legal, Regulatory & Government Relations",
    "Unknown",  # Allowed only for UNMATCHED_NOVEL or REJECTED_NOISE
}

# Controlled Skill Types
ALLOWED_SKILL_TYPES = {
    "Hard Skill",
    "Soft Skill",
    "Tool / Software",
    "Language",
    "Certification",
}

# Progressive testability flag:
# When '1', tests skip gracefully if the targeted milestone component is not yet implemented.
# When '0', tests fail strictly if the targeted component is not found.
SKIP_IF_UNIMPLEMENTED = os.environ.get("SKIP_IF_UNIMPLEMENTED", "1") == "1"


def get_catalog_loader():
    """Returns an instance of CatalogLoader (Milestone 1)."""
    try:
        from linguistic_intelligence.catalog import CatalogLoader
        return CatalogLoader(
            catalog_path=str(CATALOG_PATH),
            acronyms_path=str(ACRONYMS_PATH),
            levels_path=str(LEVELS_PATH),
        )
    except (ImportError, ModuleNotFoundError) as e:
        if SKIP_IF_UNIMPLEMENTED:
            raise unittest.SkipTest(f"M1 CatalogLoader not implemented yet: {e}")
        raise AssertionError(f"M1 CatalogLoader required but not found: {e}")


def get_proper_nouns_shield():
    """Returns the proper nouns and acronym shield utility (Milestone 1)."""
    try:
        from linguistic_intelligence import proper_nouns
        return proper_nouns
    except (ImportError, ModuleNotFoundError) as e:
        if SKIP_IF_UNIMPLEMENTED:
            raise unittest.SkipTest(f"M1 proper_nouns not implemented yet: {e}")
        raise AssertionError(f"M1 proper_nouns required but not found: {e}")


def get_parentheses_engine():
    """Returns an instance of ParenthesesTypologyEngine (Milestone 2)."""
    try:
        from linguistic_intelligence.parentheses import ParenthesesTypologyEngine
        return ParenthesesTypologyEngine()
    except (ImportError, ModuleNotFoundError) as e:
        if SKIP_IF_UNIMPLEMENTED:
            raise unittest.SkipTest(f"M2 ParenthesesTypologyEngine not implemented yet: {e}")
        raise AssertionError(f"M2 ParenthesesTypologyEngine required but not found: {e}")


def get_delimiter_splitter():
    """Returns an instance of HierarchicalDelimiterSplitter (Milestone 2)."""
    try:
        from linguistic_intelligence.delimiters import HierarchicalDelimiterSplitter
        return HierarchicalDelimiterSplitter()
    except (ImportError, ModuleNotFoundError) as e:
        if SKIP_IF_UNIMPLEMENTED:
            raise unittest.SkipTest(f"M2 HierarchicalDelimiterSplitter not implemented yet: {e}")
        raise AssertionError(f"M2 HierarchicalDelimiterSplitter required but not found: {e}")


def get_level_governor():
    """Returns an instance of SkillLevelGovernor (Milestone 3)."""
    try:
        from linguistic_intelligence.level_governor import SkillLevelGovernor
        return SkillLevelGovernor()
    except (ImportError, ModuleNotFoundError) as e:
        if SKIP_IF_UNIMPLEMENTED:
            raise unittest.SkipTest(f"M3 SkillLevelGovernor not implemented yet: {e}")
        raise AssertionError(f"M3 SkillLevelGovernor required but not found: {e}")


def get_classifier():
    """Returns an instance of AtomicClassifier (Milestone 3)."""
    try:
        from linguistic_intelligence.classifier import AtomicClassifier
        return AtomicClassifier()
    except (ImportError, ModuleNotFoundError) as e:
        if SKIP_IF_UNIMPLEMENTED:
            raise unittest.SkipTest(f"M3 AtomicClassifier not implemented yet: {e}")
        raise AssertionError(f"M3 AtomicClassifier required but not found: {e}")


def get_sidecar_engine(db_url: Optional[str] = None):
    """Returns an instance of SidecarMetadataEngine (Milestone 4)."""
    try:
        from linguistic_intelligence.sidecar import SidecarMetadataEngine
        return SidecarMetadataEngine(db_connection_url=db_url)
    except (ImportError, ModuleNotFoundError) as e:
        if SKIP_IF_UNIMPLEMENTED:
            raise unittest.SkipTest(f"M4 SidecarMetadataEngine not implemented yet: {e}")
        raise AssertionError(f"M4 SidecarMetadataEngine required but not found: {e}")


def get_pipeline():
    """Returns an instance of the full AtomicDecompositionPipeline (Milestone 5)."""
    try:
        from linguistic_intelligence.engine import AtomicDecompositionPipeline
        return AtomicDecompositionPipeline(
            catalog_path=str(CATALOG_PATH),
            acronyms_path=str(ACRONYMS_PATH),
            levels_path=str(LEVELS_PATH),
        )
    except (ImportError, ModuleNotFoundError) as e:
        if SKIP_IF_UNIMPLEMENTED:
            raise unittest.SkipTest(f"M5 AtomicDecompositionPipeline not implemented yet: {e}")
        raise AssertionError(f"M5 AtomicDecompositionPipeline required but not found: {e}")


class OpaqueBoxTestCase(unittest.TestCase):
    """Base test case providing opaque-box assertions for 14-col and 11-col contracts."""

    def assert_14_column_contract(self, record: Dict[str, Any], raw_skill: Optional[str] = None):
        """Verifies that record satisfies the 14-column contract."""
        self.assertIsInstance(record, dict, "Record must be a dictionary or mapping")
        for col in MAIN_14_COLUMNS:
            self.assertIn(col, record, f"Missing required column '{col}' in 14-column output")

        if raw_skill is not None:
            self.assertEqual(
                record["raw_skill"],
                raw_skill,
                f"raw_skill mismatch: expected '{raw_skill}', got '{record['raw_skill']}'",
            )

        # Match status must be one of the strict 6
        status = record.get("match_status")
        self.assertIn(
            status,
            ALLOWED_MATCH_STATUSES,
            f"Invalid match_status '{status}'. Must be one of {ALLOWED_MATCH_STATUSES}",
        )

        # Domain must be in closed domains or Unknown
        domain = record.get("domain")
        self.assertIn(
            domain,
            CLOSED_DOMAINS,
            f"Domain '{domain}' is not in the 14 Closed Domains",
        )

        # If rejected, rejection_reason must be populated
        if status == "REJECTED_NOISE":
            self.assertTrue(
                bool(record.get("rejection_reason")),
                "REJECTED_NOISE must have a non-empty rejection_reason",
            )
            self.assertIn(
                record.get("matched_atomic_skill"),
                [None, "", "NULL"],
                "REJECTED_NOISE must have NULL matched_atomic_skill",
            )
        elif status == "UNMATCHED_NOVEL":
            self.assertIn(
                record.get("matched_atomic_skill"),
                [None, "", "NULL"],
                "UNMATCHED_NOVEL must have NULL matched_atomic_skill",
            )
            self.assertEqual(record.get("domain"), "Unknown")
            self.assertEqual(record.get("sub_category"), "Unknown")

    def assert_11_column_sidecar_contract(
        self, sidecar: Dict[str, Any], raw_skill: Optional[str] = None
    ):
        """Verifies that sidecar satisfies the 11-column sidecar metadata contract."""
        self.assertIsInstance(sidecar, dict, "Sidecar must be a dictionary")
        for col in SIDECAR_11_COLUMNS:
            self.assertIn(col, sidecar, f"Missing required column '{col}' in 11-column sidecar")

        if raw_skill is not None:
            self.assertEqual(
                sidecar["raw_skill"],
                raw_skill,
                f"Sidecar raw_skill mismatch: expected '{raw_skill}', got '{sidecar['raw_skill']}'",
            )

        # is_composite must be boolean or boolean-like
        self.assertIn(
            sidecar.get("is_composite"),
            [True, False, "True", "False"],
            "is_composite must be a boolean",
        )

        # posting_career_level_distribution must be valid JSON or None/NULL
        dist = sidecar.get("posting_career_level_distribution")
        if dist and dist not in ["NULL", ""]:
            try:
                parsed = json.loads(dist) if isinstance(dist, str) else dist
                self.assertIsInstance(parsed, dict)
            except Exception as e:
                self.fail(f"posting_career_level_distribution is not valid JSON: {e}")

        # top_associated_job_titles must be valid JSON array or Insufficient Postings or None
        titles = sidecar.get("top_associated_job_titles")
        if titles and titles not in ["NULL", "", "Insufficient Postings"]:
            try:
                parsed = json.loads(titles) if isinstance(titles, str) else titles
                self.assertIsInstance(parsed, list)
            except Exception as e:
                self.fail(f"top_associated_job_titles is not valid JSON array: {e}")
