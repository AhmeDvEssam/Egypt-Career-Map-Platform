"""
Linguistic Intelligence Module — Egypt Career Map
==================================================
Package exports for the Knowledge Base & Linguistic Lexicon Module (Milestone 1).
"""

from linguistic_intelligence.config import (
    APPROVED_SKILL_TYPES,
    CANONICAL_SKILL_HOMES,
    CATALOG_EXACT_MATCH,
    CATALOG_REGEX_MATCH,
    CEFR_LEVELS,
    CERTIFICATION_STATUSES,
    CLOSED_DOMAINS,
    CLOSED_DOMAINS_SET,
    CLOSED_SUBCATEGORIES,
    CLOSED_SUBCATEGORIES_SET,
    CSV_DELIMITER,
    CSV_ENCODING,
    DEFAULT_ACRONYMS_PATH,
    DEFAULT_CATALOG_PATH,
    DEFAULT_LEVELS_PATH,
    DEFAULT_MAIN_OUTPUT_PATH,
    DEFAULT_RAW_SKILLS_PATH,
    DEFAULT_SIDECAR_OUTPUT_PATH,
    DOMAIN_TO_SUBCATEGORIES,
    LEVEL_ADVANCED,
    LEVEL_BEGINNER,
    LEVEL_EXPERT,
    LEVEL_INTERMEDIATE,
    LEVEL_NOT_SPECIFIED,
    MAIN_OUTPUT_COLUMNS,
    PARENTHESIS_SPECIFICATION,
    PRIORITY_RANKS,
    PROJECT_ROOT,
    PROTECTED_PROPER_NOUN,
    REJECTED_NOISE,
    SIDECAR_OUTPUT_COLUMNS,
    TAXONOMY_EXCEPTION_STATUSES,
    UNKNOWN_DOMAIN,
    UNKNOWN_SUBCATEGORY,
    UNMATCHED_NOVEL,
    VALID_MATCH_STATUSES,
)

from linguistic_intelligence.proper_nouns import (
    AcronymEntry,
    AcronymEngine,
    AcronymResolver,
    Pass0ShieldResult,
    ProtectedProperNoun,
    ProperNounShield,
    is_protected_compound,
    is_protected_proper_noun,
)

from linguistic_intelligence.catalog import (
    CatalogLoader,
    LevelMatrixEntry,
    StandardSkillEntry,
)

__all__ = [
    # Classes & Dataclasses
    "CatalogLoader",
    "StandardSkillEntry",
    "AcronymEntry",
    "LevelMatrixEntry",
    "ProperNounShield",
    "AcronymResolver",
    "AcronymEngine",
    "Pass0ShieldResult",
    "ProtectedProperNoun",
    # Functions
    "is_protected_proper_noun",
    "is_protected_compound",
    # Taxonomy & Schemas
    "CLOSED_DOMAINS",
    "CLOSED_DOMAINS_SET",
    "CLOSED_SUBCATEGORIES",
    "CLOSED_SUBCATEGORIES_SET",
    "DOMAIN_TO_SUBCATEGORIES",
    "MAIN_OUTPUT_COLUMNS",
    "SIDECAR_OUTPUT_COLUMNS",
    "VALID_MATCH_STATUSES",
    "TAXONOMY_EXCEPTION_STATUSES",
    "APPROVED_SKILL_TYPES",
    "CANONICAL_SKILL_HOMES",
    "PRIORITY_RANKS",
    # Match Statuses
    "CATALOG_EXACT_MATCH",
    "CATALOG_REGEX_MATCH",
    "PARENTHESIS_SPECIFICATION",
    "PROTECTED_PROPER_NOUN",
    "UNMATCHED_NOVEL",
    "REJECTED_NOISE",
    # Fallback & Levels
    "UNKNOWN_DOMAIN",
    "UNKNOWN_SUBCATEGORY",
    "LEVEL_NOT_SPECIFIED",
    "LEVEL_BEGINNER",
    "LEVEL_INTERMEDIATE",
    "LEVEL_ADVANCED",
    "LEVEL_EXPERT",
    "CEFR_LEVELS",
    "CERTIFICATION_STATUSES",
    # Paths & Formats
    "PROJECT_ROOT",
    "DEFAULT_CATALOG_PATH",
    "DEFAULT_ACRONYMS_PATH",
    "DEFAULT_LEVELS_PATH",
    "DEFAULT_RAW_SKILLS_PATH",
    "DEFAULT_MAIN_OUTPUT_PATH",
    "DEFAULT_SIDECAR_OUTPUT_PATH",
    "CSV_DELIMITER",
    "CSV_ENCODING",
]
