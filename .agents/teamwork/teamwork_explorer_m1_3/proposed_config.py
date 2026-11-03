"""
Linguistic Intelligence Configuration & Frozen Schema Contracts
================================================================
Project: Egypt Career Map (egypt_jobs_db)
Reference Universe: 464,397 Job Postings | 28,824 Unique Raw Skills
Taxonomy: 14 Closed Domains | 61 Closed Subcategories | 6 Permitted Match Statuses
Governance: Master Skill Level Governance & Audit Specification v3

STRICT CONTRACT:
- Zero mutations to database.
- Frozen 14-column main dataset schema.
- Frozen 11-column sidecar metadata schema.
- Exact 6 permitted match statuses.
- Unmatched novel / rejected records receive domain = 'Unknown', sub_category = 'Unknown'.
"""

from pathlib import Path
from typing import Dict, FrozenSet, Set, Tuple

# ─── 1. PROJECT ROOT & FILE PATH CONSTANTS ────────────────────────────────────
PROJECT_ROOT = Path(__file__).resolve().parent.parent

DEFAULT_CATALOG_PATH = PROJECT_ROOT / "standard_skills_catalog.csv"
DEFAULT_ACRONYMS_PATH = PROJECT_ROOT / "skills_acronym_dictionary.json"
DEFAULT_LEVELS_PATH = PROJECT_ROOT / "standard_skill_levels_matrix.csv"
DEFAULT_RAW_SKILLS_PATH = PROJECT_ROOT / "skills.csv"

DEFAULT_MAIN_OUTPUT_PATH = PROJECT_ROOT / "egypt_skills_decomposed_graph.csv"
DEFAULT_SIDECAR_OUTPUT_PATH = PROJECT_ROOT / "egypt_skills_decomposition_metadata.csv"

# File format constants
CSV_DELIMITER = ";"
CSV_ENCODING = "utf-8-sig"  # Handles UTF-8 with BOM cleanly

# ─── 2. CLOSED TAXONOMY CONTRACT (14 DOMAINS & 61 SUBCATEGORIES) ──────────────
CLOSED_DOMAINS: Tuple[str, ...] = (
    "Business & Finance",
    "Data Science & Analytics",
    "Education, Teaching & Training",
    "Engineering & Construction",
    "Healthcare & Medical Sciences",
    "Hospitality, Tourism & Food Services",
    "Human Resources",
    "Legal, Regulatory & Government Relations",
    "Manufacturing & Industrial Production",
    "Marketing & Sales",
    "Operations & Project Management",
    "Software Engineering & IT",
    "Supply Chain & Logistics",
    "Vocational Trades, Driving & Field Services",
)

CLOSED_DOMAINS_SET: FrozenSet[str] = frozenset(CLOSED_DOMAINS)

# Full 14-to-61 mapping verified against standard_skills_catalog.csv
DOMAIN_TO_SUBCATEGORIES: Dict[str, Tuple[str, ...]] = {
    "Business & Finance": (
        "Accounting & Financial Reporting",
        "Auditing, Tax & Compliance",
        "Banking & Treasury Operations",
        "Corporate Finance & Financial Analysis",
    ),
    "Data Science & Analytics": (
        "Artificial Intelligence & Deep Learning",
        "Business Intelligence & Data Analytics",
        "Data Engineering",
        "Data Governance, Quality & Architecture",
        "Machine Learning & Data Science",
    ),
    "Education, Teaching & Training": (
        "Academic Tutoring & Special Education",
        "Curriculum Design & Educational Assessment",
        "K-12 School Teaching & Pedagogy",
        "Language Teaching & ESL",
    ),
    "Engineering & Construction": (
        "Architecture & Interior Design",
        "Civil & Structural Engineering",
        "Construction Management & Site Supervision",
        "Electrical & Power Engineering",
        "Mechanical & MEP Engineering",
    ),
    "Healthcare & Medical Sciences": (
        "Clinical Medicine & Patient Care",
        "Medical Laboratory & Diagnostic Imaging",
        "Nursing & Allied Health Services",
        "Pharmacy & Pharmaceutical Sales",
    ),
    "Hospitality, Tourism & Food Services": (
        "Culinary Arts, Kitchen & Food Preparation",
        "Food & Beverage (F&B) Service & Barista",
        "Hotel Front Desk & Guest Relations",
        "Travel, Tourism & Tour Operations",
    ),
    "Human Resources": (
        "HR Operations & People Analytics",
        "Learning & Development (L&D)",
        "Performance Management & Total Rewards",
        "Personnel, Payroll & Egyptian Labor Law",
        "Talent Acquisition & Recruitment",
    ),
    "Legal, Regulatory & Government Relations": (
        "Corporate Law, Contracts & Commercial Advisory",
        "Government Relations & Regulatory Compliance",
        "Litigation, Court Procedures & Dispute Resolution",
    ),
    "Manufacturing & Industrial Production": (
        "CNC, Machining & Metal Fabrication",
        "Industrial Automation, PLC & Instrumentation",
        "Industrial Health, Safety & Environment (HSE)",
        "Industrial Machinery & Equipment Maintenance",
        "Production Line & Assembly Operations",
    ),
    "Marketing & Sales": (
        "B2B Sales & Business Development",
        "Content Marketing, SEO & Social Media",
        "Digital Marketing & Paid Ads (Performance Media)",
        "Retail, B2C Sales & Account Management",
    ),
    "Operations & Project Management": (
        "Business Operations & Process Improvement",
        "Customer Service & Support Operations",
        "Office & Administrative Management",
        "Project & Agile Management (PMP, Agile, Scrum)",
    ),
    "Software Engineering & IT": (
        "Backend Development",
        "Cybersecurity & Information Security",
        "DevOps & Cloud Infrastructure",
        "Frontend Development",
        "Mobile Development",
        "Quality Assurance & Testing",
    ),
    "Supply Chain & Logistics": (
        "Inventory & Warehouse Management",
        "Logistics, Freight & Fleet Operations",
        "Procurement & Purchasing",
        "Supply Chain Planning & Demand Forecasting",
    ),
    "Vocational Trades, Driving & Field Services": (
        "Electrical, Plumbing & Mechanical Trades",
        "Facility Maintenance, Cleaning & Janitorial",
        "Professional Driving & Fleet Delivery",
        "Security, Guarding & Asset Protection",
    ),
}

# Flat tuple and set of all 61 closed subcategories
CLOSED_SUBCATEGORIES: Tuple[str, ...] = tuple(
    subcat
    for subcats in DOMAIN_TO_SUBCATEGORIES.values()
    for subcat in subcats
)
CLOSED_SUBCATEGORIES_SET: FrozenSet[str] = frozenset(CLOSED_SUBCATEGORIES)

# Fallback values for novel or rejected items
UNKNOWN_DOMAIN: str = "Unknown"
UNKNOWN_SUBCATEGORY: str = "Unknown"

# ─── 3. EXACT 6 PERMITTED MATCH STATUS VALUES ─────────────────────────────────
# Spec v3 Section 9.2: Every row in egypt_skills_decomposed_graph.csv MUST carry
# exactly one of these 6 statuses. PROTECTED_COMPOUND is strictly PROHIBITED.
CATALOG_EXACT_MATCH: str = "CATALOG_EXACT_MATCH"
CATALOG_REGEX_MATCH: str = "CATALOG_REGEX_MATCH"
PARENTHESIS_SPECIFICATION: str = "PARENTHESIS_SPECIFICATION"
PROTECTED_PROPER_NOUN: str = "PROTECTED_PROPER_NOUN"
UNMATCHED_NOVEL: str = "UNMATCHED_NOVEL"
REJECTED_NOISE: str = "REJECTED_NOISE"

VALID_MATCH_STATUSES: FrozenSet[str] = frozenset({
    CATALOG_EXACT_MATCH,
    CATALOG_REGEX_MATCH,
    PARENTHESIS_SPECIFICATION,
    PROTECTED_PROPER_NOUN,
    UNMATCHED_NOVEL,
    REJECTED_NOISE,
})

TAXONOMY_EXCEPTION_STATUSES: FrozenSet[str] = frozenset({
    UNMATCHED_NOVEL,
    REJECTED_NOISE,
})

# ─── 4. FROZEN OUTPUT DATASET SCHEMAS ─────────────────────────────────────────

# 14-Column Main Decomposition Output Contract
MAIN_OUTPUT_COLUMNS: Tuple[str, ...] = (
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
)

# 11-Column Sidecar Metadata Output Contract (1-to-1 with unique raw_skill)
SIDECAR_OUTPUT_COLUMNS: Tuple[str, ...] = (
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
)

# ─── 5. SKILL TYPES & CANONICAL LEVEL VOCABULARY ──────────────────────────────
APPROVED_SKILL_TYPES: FrozenSet[str] = frozenset({
    "Hard Skill",
    "Soft Skill",
    "Tool / Software",
    "Language",
    "Certification",
})

# Canonical governed level values
LEVEL_NOT_SPECIFIED: str = "Not Specified"
LEVEL_BEGINNER: str = "Beginner"
LEVEL_INTERMEDIATE: str = "Intermediate"
LEVEL_ADVANCED: str = "Advanced"

# CEFR Language Levels (applied ONLY to spoken languages)
CEFR_LEVELS: FrozenSet[str] = frozenset({
    "A1 (Beginner)",
    "A2 (Elementary)",
    "B1 (Intermediate)",
    "B2 (Upper Intermediate)",
    "C1 (Fluent)",
    "C2 (Mastery)",
})

# Certification award statuses (distinct from examination track tiers)
CERTIFICATION_STATUSES: FrozenSet[str] = frozenset({
    "Active / Certified",
    "Candidate / In Progress",
    LEVEL_NOT_SPECIFIED,
})

# ─── 6. CANONICAL HOMES FOR CROSS-DOMAIN SKILLS (PRIORITY RESOLUTION) ─────────
# In standard_skills_catalog.csv, 281 skills appear across multiple domains.
# Linear dict iteration causes Python to be overwritten by Row 2439 (Human Resources).
# This lookup establishes deterministic, audited primary homes for high-frequency tools.
CANONICAL_SKILL_HOMES: Dict[str, Tuple[str, str, str]] = {
    # Tool Name: (Domain, Subcategory, Skill Type)
    "Python": ("Software Engineering & IT", "Backend Development", "Tool / Software"),
    "SQL": ("Data Science & Analytics", "Business Intelligence & Data Analytics", "Tool / Software"),
    "Microsoft Excel": ("Data Science & Analytics", "Business Intelligence & Data Analytics", "Tool / Software"),
    "Excel": ("Data Science & Analytics", "Business Intelligence & Data Analytics", "Tool / Software"),
    "Power BI": ("Data Science & Analytics", "Business Intelligence & Data Analytics", "Tool / Software"),
    "Tableau": ("Data Science & Analytics", "Business Intelligence & Data Analytics", "Tool / Software"),
    "Git": ("Software Engineering & IT", "DevOps & Cloud Infrastructure", "Tool / Software"),
    "Docker": ("Software Engineering & IT", "DevOps & Cloud Infrastructure", "Tool / Software"),
    "Jira": ("Operations & Project Management", "Project & Agile Management (PMP, Agile, Scrum)", "Tool / Software"),
    "Linux": ("Software Engineering & IT", "DevOps & Cloud Infrastructure", "Tool / Software"),
    "Data Analysis": ("Data Science & Analytics", "Business Intelligence & Data Analytics", "Hard Skill"),
    "Machine Learning": ("Data Science & Analytics", "Machine Learning & Data Science", "Hard Skill"),
    "Project Management": ("Operations & Project Management", "Project & Agile Management (PMP, Agile, Scrum)", "Hard Skill"),
    "Communication": ("Operations & Project Management", "Customer Service & Support Operations", "Soft Skill"),
    "Problem Solving": ("Software Engineering & IT", "Backend Development", "Soft Skill"),
    "Teamwork": ("Operations & Project Management", "Business Operations & Process Improvement", "Soft Skill"),
    "Time Management": ("Operations & Project Management", "Office & Administrative Management", "Soft Skill"),
    "English": ("Data Science & Analytics", "Business Intelligence & Data Analytics", "Language"),
}

# Catalog Priority Hierarchy
PRIORITY_RANKS: Dict[str, int] = {
    "Core": 3,
    "Foundational": 2,
    "Secondary": 1,
}
