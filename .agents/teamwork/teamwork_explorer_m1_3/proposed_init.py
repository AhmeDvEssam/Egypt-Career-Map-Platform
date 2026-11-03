"""
Linguistic Intelligence Package — Egypt Career Map
==================================================
Deterministic, context-preserving linguistic processing, reference catalog
ingestion, and atomic skill decomposition engine for Egyptian job postings.
"""

from linguistic_intelligence.config import (
    # Project Paths & Defaults
    PROJECT_ROOT,
    DEFAULT_CATALOG_PATH,
    DEFAULT_ACRONYMS_PATH,
    DEFAULT_LEVELS_PATH,
    DEFAULT_RAW_SKILLS_PATH,
    DEFAULT_MAIN_OUTPUT_PATH,
    DEFAULT_SIDECAR_OUTPUT_PATH,
    CSV_DELIMITER,
    CSV_ENCODING,
    # Taxonomy
    CLOSED_DOMAINS,
    CLOSED_DOMAINS_SET,
    CLOSED_SUBCATEGORIES,
    CLOSED_SUBCATEGORIES_SET,
    DOMAIN_TO_SUBCATEGORIES,
    UNKNOWN_DOMAIN,
    UNKNOWN_SUBCATEGORY,
    # Match Statuses
    CATALOG_EXACT_MATCH,
    CATALOG_REGEX_MATCH,
    PARENTHESIS_SPECIFICATION,
    PROTECTED_PROPER_NOUN,
    UNMATCHED_NOVEL,
    REJECTED_NOISE,
    VALID_MATCH_STATUSES,
    TAXONOMY_EXCEPTION_STATUSES,
    # Output Dataset Schemas
    MAIN_OUTPUT_COLUMNS,
    SIDECAR_OUTPUT_COLUMNS,
    # Types & Level Constants
    APPROVED_SKILL_TYPES,
    LEVEL_NOT_SPECIFIED,
    LEVEL_BEGINNER,
    LEVEL_INTERMEDIATE,
    LEVEL_ADVANCED,
    CEFR_LEVELS,
    CERTIFICATION_STATUSES,
    CANONICAL_SKILL_HOMES,
    PRIORITY_RANKS,
)

from linguistic_intelligence.catalog import (
    CatalogLoader,
    StandardSkillEntry,
    AcronymEntry,
    LevelMatrixEntry,
)

from linguistic_intelligence.proper_nouns import (
    ProperNounShield,
    AcronymResolver,
)

__version__ = "1.0.0"

__all__ = [
    # Config Paths
    "PROJECT_ROOT",
    "DEFAULT_CATALOG_PATH",
    "DEFAULT_ACRONYMS_PATH",
    "DEFAULT_LEVELS_PATH",
    "DEFAULT_RAW_SKILLS_PATH",
    "DEFAULT_MAIN_OUTPUT_PATH",
    "DEFAULT_SIDECAR_OUTPUT_PATH",
    "CSV_DELIMITER",
    "CSV_ENCODING",
    # Taxonomy Constants
    "CLOSED_DOMAINS",
    "CLOSED_DOMAINS_SET",
    "CLOSED_SUBCATEGORIES",
    "CLOSED_SUBCATEGORIES_SET",
    "DOMAIN_TO_SUBCATEGORIES",
    "UNKNOWN_DOMAIN",
    "UNKNOWN_SUBCATEGORY",
    # Match Statuses
    "CATALOG_EXACT_MATCH",
    "CATALOG_REGEX_MATCH",
    "PARENTHESIS_SPECIFICATION",
    "PROTECTED_PROPER_NOUN",
    "UNMATCHED_NOVEL",
    "REJECTED_NOISE",
    "VALID_MATCH_STATUSES",
    "TAXONOMY_EXCEPTION_STATUSES",
    # Schemas
    "MAIN_OUTPUT_COLUMNS",
    "SIDECAR_OUTPUT_COLUMNS",
    # Types & Levels
    "APPROVED_SKILL_TYPES",
    "LEVEL_NOT_SPECIFIED",
    "LEVEL_BEGINNER",
    "LEVEL_INTERMEDIATE",
    "LEVEL_ADVANCED",
    "CEFR_LEVELS",
    "CERTIFICATION_STATUSES",
    "CANONICAL_SKILL_HOMES",
    "PRIORITY_RANKS",
    # M1 Core Classes & Data Models
    "CatalogLoader",
    "StandardSkillEntry",
    "AcronymEntry",
    "LevelMatrixEntry",
    "ProperNounShield",
    "AcronymResolver",
]
