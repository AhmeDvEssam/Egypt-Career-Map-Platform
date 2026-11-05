"""
Linguistic Intelligence — Milestone 2.3 Pipeline Integration Layer
==================================================================
Orchestrates and integrates the core Milestone 2 linguistic intelligence components:
  1. Feature 05 — Parentheses Typology Engine (ParenthesesTypologyEngine)
  2. Feature 06 — Protected Compound Shield (ProperNounShield / Compound Registry)
  3. Feature 07 — Hierarchical Delimiter Splitter (HierarchicalDelimiterSplitter)
with the Milestone 1 Reference Catalog (CatalogLoader) and Lexical Matrix.

Strict Architectural Guarantees:
  - Zero external database writes, DDL, or DML (PostgreSQL is strictly read-only).
  - Zero LLM or embeddings (pure deterministic O(n) algorithmic pipeline).
  - Strictly preserves Master Specification v3 14-column Main and 11-column Sidecar contracts.
  - Maintains full provenance for every atomic decomposition unit via ProvenanceRecord.
  - Preserves verbatim raw_token whitespace and context graph adjacency.
  - Linear O(n) algorithmic execution speed (< 5 ms per input string).
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional, Set, Tuple

from linguistic_intelligence.config import (
    APPROVED_SKILL_TYPES,
    CATALOG_EXACT_MATCH,
    CATALOG_REGEX_MATCH,
    CLOSED_DOMAINS,
    DEFAULT_ACRONYMS_PATH,
    DEFAULT_CATALOG_PATH,
    DEFAULT_LEVELS_PATH,
    LEVEL_ADVANCED,
    LEVEL_BEGINNER,
    LEVEL_EXPERT,
    LEVEL_INTERMEDIATE,
    LEVEL_NOT_SPECIFIED,
    MAIN_OUTPUT_COLUMNS,
    PARENTHESIS_SPECIFICATION,
    PROTECTED_PROPER_NOUN,
    REJECTED_NOISE,
    SIDECAR_OUTPUT_COLUMNS,
    UNKNOWN_DOMAIN,
    UNKNOWN_SUBCATEGORY,
    UNMATCHED_NOVEL,
    VALID_MATCH_STATUSES,
)
from linguistic_intelligence.catalog import CatalogLoader, StandardSkillEntry
from linguistic_intelligence.proper_nouns import ProperNounShield, AcronymResolver
from linguistic_intelligence.parentheses import (
    ParenthesesTypologyEngine,
    ParenthesisTypology,
    TypologyClassification,
)
from linguistic_intelligence.delimiters import (
    HierarchicalDelimiterSplitter,
    SplitToken,
    DelimiterTier,
)


@dataclass
class ProvenanceRecord:
    """
    Complete audit trail and provenance record for a decomposed skill token.
    Tracks transformation steps from raw source input to final atomic unit.
    """
    raw_input: str
    shielded_compounds: List[str] = field(default_factory=list)
    parentheses_typology: Optional[str] = None
    parentheses_raw_content: Optional[str] = None
    delimiter_tier: int = 0
    delimiter_used: str = ""
    raw_token: str = ""
    cleaned_skill: str = ""
    context_before: str = ""
    context_after: str = ""
    transformation_log: List[str] = field(default_factory=list)

    def to_dict(self) -> Dict[str, Any]:
        """Returns JSON-serializable dictionary with zero circular references."""
        return {
            "raw_input": self.raw_input,
            "shielded_compounds": list(self.shielded_compounds),
            "parentheses_typology": self.parentheses_typology,
            "parentheses_raw_content": self.parentheses_raw_content,
            "delimiter_tier": self.delimiter_tier,
            "delimiter_used": self.delimiter_used,
            "raw_token": self.raw_token,
            "cleaned_skill": self.cleaned_skill,
            "context_before": self.context_before,
            "context_after": self.context_after,
            "transformation_log": list(self.transformation_log),
        }


@dataclass
class IntegratedSkillToken:
    """
    Represents an atomic skill token produced by the M2.3 Integration Layer.
    Implements the 14-column Main Output Contract with provenance and multi-domain associations.
    """
    raw_skill: str
    atomic_skill: str
    raw_token: str
    separated_by: str = ""
    separated_from_before: str = ""
    separated_from_after: str = ""
    extracted_skill_level: str = "Not Specified"
    skill_level: str = "Not Specified"
    skill_type: Optional[str] = None
    domain: str = "Unknown"
    sub_category: str = "Unknown"
    job_count: int = 0
    match_status: str = "UNMATCHED_NOVEL"
    rejection_reason: Optional[str] = None
    matched_atomic_skill: Optional[str] = None
    is_compound_shielded: bool = False
    is_oversized: bool = False
    is_malformed: bool = False
    malformed_reason: Optional[str] = None
    provenance: Optional[ProvenanceRecord] = None
    associations: List[StandardSkillEntry] = field(default_factory=list)

    def to_14_column_dict(self) -> Dict[str, Any]:
        """Serializes exactly to the 14-column Master Main Output Schema v3."""
        matched = self.matched_atomic_skill
        if self.match_status in ("UNMATCHED_NOVEL", "REJECTED_NOISE"):
            matched = None

        rej_reason = self.rejection_reason
        if self.match_status != "REJECTED_NOISE":
            rej_reason = None

        return {
            "raw_skill": self.raw_skill,
            "atomic_skill": self.atomic_skill,
            "matched_atomic_skill": matched,
            "separated_by": self.separated_by,
            "separated_from_before": self.separated_from_before,
            "separated_from_after": self.separated_from_after,
            "extracted_skill_level": self.extracted_skill_level,
            "skill_level": self.skill_level,
            "skill_type": self.skill_type,
            "domain": self.domain,
            "sub_category": self.sub_category,
            "job_count": int(self.job_count),
            "match_status": self.match_status,
            "rejection_reason": rej_reason,
        }


@dataclass
class SidecarLinguisticMetadata:
    """
    Represents the 11-column Sidecar metadata payload for a raw skill input.
    Complies with Master Specification v3 Sidecar Schema.

    Architectural Scope Notice (Milestone 2.3 vs Milestone 4):
      - Schema Compliance: All 11 columns are present and conform strictly to the Master Schema.
      - Data Completeness: The following fields are linguistic placeholders intentionally deferred
        to Milestone 4 database-level aggregation:
          * job_count (int): Default 0 in linguistic layer; populated via SQL COUNT(*) in M4.
          * posting_career_level_distribution (str): Default None; populated via SQL aggregation in M4.
          * top_associated_job_titles (str): Default None; populated via co-occurrence SQL queries in M4.
    """
    raw_skill: str
    job_count: int = 0
    industry_context: Optional[str] = None
    category_container: Optional[str] = None
    parentheses_raw_content: Optional[str] = None
    experience_duration: Optional[str] = None
    intra_string_seniority: Optional[str] = None
    credential_track_or_status: Optional[str] = None
    posting_career_level_distribution: Optional[str] = None
    top_associated_job_titles: Optional[str] = None
    is_composite: bool = False

    def to_11_column_dict(self) -> Dict[str, Any]:
        """Serializes exactly to the 11-column Sidecar Schema v3."""
        return {
            "raw_skill": self.raw_skill,
            "job_count": int(self.job_count),
            "industry_context": self.industry_context,
            "category_container": self.category_container,
            "parentheses_raw_content": self.parentheses_raw_content,
            "experience_duration": self.experience_duration,
            "intra_string_seniority": self.intra_string_seniority,
            "credential_track_or_status": self.credential_track_or_status,
            "posting_career_level_distribution": self.posting_career_level_distribution,
            "top_associated_job_titles": self.top_associated_job_titles,
            "is_composite": self.is_composite,
        }


class LinguisticPipeline:
    """
    Milestone 2.3 Integration Layer:
    Orchestrates Feature 05 (Parentheses Typology), Feature 06 (Protected Compounds),
    and Feature 07 (Hierarchical Delimiters) into an integrated deterministic pipeline.
    """

    MAX_INPUT_LENGTH: int = 20_000

    # Whitelisted single-character skills that are NOT rejected as noise
    VALID_SINGLE_CHAR_SKILLS: Set[str] = {"C", "R"}

    # Common filler noise fragments that must be rejected
    NOISE_FRAGMENTS: Set[str] = {
        "editions", "edition", "etc", "various", "multiple", "relevant",
        "proficient", "proficiency", "skills", "skill", "technologies",
        "technology", "tools", "tool", "knowledge", "years", "experience",
        "required", "preferred", "responsibilities", "requirements",
        "duties", "qualifications", "tasks", "general",
    }

    # Generic standalone single words that must resist loose regex matching
    GENERIC_WORDS: Set[str] = {
        "software", "system", "systems", "data", "management", "services",
        "service", "process", "processes", "operations", "engineering",
    }

    # Seniority keywords that belong to sidecar intra_string_seniority.
    # Ordered strictly by descending phrase length for deterministic, greedy matching.
    SENIORITY_KEYWORDS: Tuple[str, ...] = (
        "mid-senior",
        "entry-level",
        "mid-level",
        "principal",
        "associate",
        "director",
        "executive",
        "senior",
        "junior",
        "staff",
        "head",
        "lead",
        "mid",
    )

    # Common role/suffix words stripped when extracting pure skill
    ROLE_SUFFIXES: List[str] = [
        "developer", "engineer", "specialist", "consultant", "analyst",
        "administrator", "architect", "programmer", "technologies", "skills",
        "pipelines", "pipeline", "design", "programming", "management",
        "certifications", "certification", "networks", "network",
    ]

    # Level modifier prefix patterns capturing verbatim prefix casing
    PREFIX_LEVEL_PATTERNS: List[Tuple[re.Pattern, str, str]] = [
        (re.compile(r"^(mastery)(?:\s+of)?\s+(.+)$", re.IGNORECASE), "Mastery", LEVEL_ADVANCED),
        (re.compile(r"^(working\s+knowledge)(?:\s+of)?\s+(.+)$", re.IGNORECASE), "Working knowledge", LEVEL_INTERMEDIATE),
        (re.compile(r"^(solid)(?:\s+understanding)?(?:\s+of)?\s+(.+)$", re.IGNORECASE), "Solid", LEVEL_NOT_SPECIFIED),
        (re.compile(r"^(expert)(?:\s+in)?\s+(.+)$", re.IGNORECASE), "Expert", LEVEL_ADVANCED),
        (re.compile(r"^(advanced)(?:\s+knowledge\s+of)?\s+(.+)$", re.IGNORECASE), "Advanced", LEVEL_ADVANCED),
        (re.compile(r"^(intermediate)\s+(.+)$", re.IGNORECASE), "Intermediate", LEVEL_INTERMEDIATE),
        (re.compile(r"^(beginner)\s+(.+)$", re.IGNORECASE), "Beginner", LEVEL_BEGINNER),
        (re.compile(r"^(entry-level)\s+(.+)$", re.IGNORECASE), "entry-level", LEVEL_BEGINNER),
        (re.compile(r"^(familiarity\s+with)\s+(.+)$", re.IGNORECASE), "Familiarity", LEVEL_NOT_SPECIFIED),
        (re.compile(r"^(familiar\s+with)\s+(.+)$", re.IGNORECASE), "Familiar", LEVEL_NOT_SPECIFIED),
        (re.compile(r"^(strong)\s+(.+?)(?:\s+skills)?$", re.IGNORECASE), "Strong", LEVEL_NOT_SPECIFIED),
        (re.compile(r"^(fluent)\s+(.+)$", re.IGNORECASE), "Fluent", LEVEL_NOT_SPECIFIED),
    ]

    # CEFR Language Code Mapping
    CEFR_CODES: Dict[str, str] = {
        "A1": "A1 (Beginner)",
        "A2": "A2 (Elementary)",
        "B1": "B1 (Intermediate)",
        "B2": "B2 (Upper Intermediate)",
        "C1": "C1 (Advanced)",
        "C2": "C2 (Proficient / Mastery)",
    }

    # Canonical uppercase compound mapping
    CANONICAL_COMPOUNDS: Dict[str, str] = {
        "pl/sql": "PL/SQL",
        "ci/cd": "CI/CD",
        "ui/ux": "UI/UX",
        "c/c++": "C/C++",
        "r&d": "R&D",
        "p&l": "P&L",
        "fp&a": "FP&A",
        "tcp/ip": "TCP/IP",
        "ai/ml": "AI/ML",
        "etl/elt": "ETL/ELT",
        "ar/vr": "AR/VR",
        "b2b/b2c": "B2B/B2C",
        "saas/paas": "SaaS/PaaS",
        "devops/mlops": "DevOps/MLOps",
        "lan/wan": "LAN/WAN",
        "cad/cam": "CAD/CAM",
        "gui/cli": "GUI/CLI",
    }

    def __init__(
        self,
        catalog_path: str = DEFAULT_CATALOG_PATH,
        acronyms_path: str = DEFAULT_ACRONYMS_PATH,
        levels_path: str = DEFAULT_LEVELS_PATH,
    ) -> None:
        """Initializes the integrated pipeline components."""
        self.catalog: CatalogLoader = CatalogLoader(
            catalog_path=catalog_path,
            acronyms_path=acronyms_path,
            levels_path=levels_path,
        )
        self.shield: ProperNounShield = ProperNounShield()
        self.acronym_resolver: AcronymResolver = self.catalog.acronym_resolver
        self.splitter: HierarchicalDelimiterSplitter = HierarchicalDelimiterSplitter(
            catalog=self.catalog,
            acronym_resolver=self.acronym_resolver,
            proper_noun_shield=self.shield,
        )
        self.parentheses_engine: ParenthesesTypologyEngine = ParenthesesTypologyEngine(
            catalog=self.catalog,
            acronym_resolver=self.acronym_resolver,
            proper_noun_shield=self.shield,
        )

    # ──────────────────────────────────────────────────────────────────────────
    # MAIN 14-COLUMN INTERFACE
    # ──────────────────────────────────────────────────────────────────────────

    def decompose(self, raw_skill: str) -> List[Dict[str, Any]]:
        """
        Decomposes raw skill into atomic skills compliant with Main Output Schema v3.
        Returns a list of 14-column dictionaries, preserving all legitimate catalog associations.
        """
        tokens = self.decompose_to_tokens(raw_skill)
        rows: List[Dict[str, Any]] = []
        for t in tokens:
            if t.associations and len(t.associations) > 1:
                # Multi-domain catalog associations: produce a row for EACH legitimate association
                for entry in t.associations:
                    row = t.to_14_column_dict()
                    row["domain"] = entry.domain
                    row["sub_category"] = entry.sub_category
                    row["skill_type"] = entry.skill_type
                    row["matched_atomic_skill"] = entry.name
                    rows.append(row)
            else:
                rows.append(t.to_14_column_dict())
        return rows

    def decompose_to_tokens(
        self, raw_skill: str, expand_associations: bool = False
    ) -> List[IntegratedSkillToken]:
        """
        Decomposes raw skill into IntegratedSkillToken objects preserving full provenance.
        When expand_associations is True, clones tokens across all legitimate catalog associations.
        """
        if raw_skill is None:
            return []

        raw_str = str(raw_skill)
        if not raw_str or not raw_str.strip():
            return []

        # 1. Guardrails: Oversized inputs
        is_oversized = len(raw_str) > self.MAX_INPUT_LENGTH

        # 2. Guardrails: Punctuation-only noise
        trimmed = raw_str.strip()
        if re.fullmatch(r"[\s\.,;:\-—–_/\&|•\*+#!?~`'\"(){}\[\]\<\>]+", trimmed):
            prov = ProvenanceRecord(
                raw_input=raw_str,
                raw_token=raw_str,
                cleaned_skill=trimmed,
                transformation_log=["Input identified as punctuation-only noise."],
            )
            return [
                IntegratedSkillToken(
                    raw_skill=raw_str,
                    atomic_skill=trimmed,
                    raw_token=raw_str,
                    match_status=REJECTED_NOISE,
                    rejection_reason="Punctuation-only string",
                    is_oversized=is_oversized,
                    provenance=prov,
                )
            ]

        # 3. Guardrails: Single character invalid tokens
        if len(trimmed) == 1 and trimmed.upper() not in self.VALID_SINGLE_CHAR_SKILLS:
            prov = ProvenanceRecord(
                raw_input=raw_str,
                raw_token=raw_str,
                cleaned_skill=trimmed,
                transformation_log=["Token too short, rejected as noise."],
            )
            return [
                IntegratedSkillToken(
                    raw_skill=raw_str,
                    atomic_skill=trimmed,
                    raw_token=raw_str,
                    match_status=REJECTED_NOISE,
                    rejection_reason="Token too short",
                    is_oversized=is_oversized,
                    provenance=prov,
                )
            ]

        # 4. Feature 06 Shielding: Protected Compound whole-skill check
        lower_trimmed = trimmed.lower()
        if self._is_exact_compound(lower_trimmed):
            token = self._create_whole_compound_token(raw_str, trimmed, is_oversized)
            return [token]

        # 5. Feature 06 Shielding: Protected Proper Noun whole-skill check
        pass0 = self.shield.evaluate_pass_0(trimmed)
        if pass0.is_shielded and pass0.match_status == PROTECTED_PROPER_NOUN:
            token = self._create_shielded_proper_noun_token(raw_str, trimmed, pass0, is_oversized)
            return [token]

        # 6. Check if input has delimiters OUTSIDE parentheses
        masked, _ = self.splitter.mask_protected_spans(raw_str)
        has_outer_delimiters = bool(self.splitter.DELIMITER_INTERSECT_PATTERN.search(masked))

        # Check for category containers (parenthetical or colon)
        is_colon_container = bool(re.match(r"^([A-Za-z\s]+)\s*:\s*(.+)$", trimmed))
        is_category_container = False
        if "(" in raw_str and ")" in raw_str and not has_outer_delimiters:
            typ_check = self.parentheses_engine.classify(trimmed)
            if typ_check.typology == ParenthesisTypology.CATEGORY_CONTAINER:
                is_category_container = True

        # If it's a category container, handle it as a container
        if is_colon_container or is_category_container:
            special_tokens = self._handle_top_level_parentheses_or_container(raw_str, trimmed, is_oversized)
            if special_tokens is not None:
                return special_tokens

        # If there are NO outer delimiters and it has parentheses, handle single parenthetical unit
        if not has_outer_delimiters and "(" in raw_str and ")" in raw_str:
            special_tokens = self._handle_top_level_parentheses_or_container(raw_str, trimmed, is_oversized)
            if special_tokens is not None:
                return special_tokens

        # Feature 07: Hierarchical Delimiter Splitting
        # Directly pass verbatim raw_str to splitter without string mutation or pre-normalization
        split_tokens = self.splitter.split(raw_str)
        if not split_tokens:
            return []

        # 8. Post-split token normalization, level extraction, and recursive splitting
        all_split_tokens: List[SplitToken] = []
        for st in split_tokens:
            tok_masked, _ = self.splitter.mask_protected_spans(st.atomic_skill)
            if self.splitter.DELIMITER_INTERSECT_PATTERN.search(tok_masked) and len(st.atomic_skill) < len(raw_str):
                sub_splits = self.splitter.split(st.atomic_skill)
                if len(sub_splits) > 1:
                    all_split_tokens.extend(sub_splits)
                    continue
            all_split_tokens.append(st)

        results: List[IntegratedSkillToken] = []
        for st in all_split_tokens:
            if not st.atomic_skill or not st.atomic_skill.strip():
                continue
            if re.fullmatch(r"[\s\.,;:\-—–_/\&|•\*+#!?~`'\"(){}\[\]\<\>]+", st.atomic_skill.strip()):
                continue

            processed_token = self._process_atomic_segment(raw_str, st, is_oversized)
            if processed_token is not None:
                results.append(processed_token)

        # Context graph linking for the final result list
        self._link_context_graph(results)

        if expand_associations:
            expanded: List[IntegratedSkillToken] = []
            for t in results:
                if t.associations and len(t.associations) > 1:
                    for entry in t.associations:
                        clone = IntegratedSkillToken(
                            raw_skill=t.raw_skill,
                            atomic_skill=t.atomic_skill,
                            raw_token=t.raw_token,
                            separated_by=t.separated_by,
                            separated_from_before=t.separated_from_before,
                            separated_from_after=t.separated_from_after,
                            extracted_skill_level=t.extracted_skill_level,
                            skill_level=t.skill_level,
                            skill_type=entry.skill_type,
                            domain=entry.domain,
                            sub_category=entry.sub_category,
                            job_count=t.job_count,
                            match_status=t.match_status,
                            rejection_reason=t.rejection_reason,
                            matched_atomic_skill=entry.name,
                            is_compound_shielded=t.is_compound_shielded,
                            is_oversized=t.is_oversized,
                            is_malformed=t.is_malformed,
                            malformed_reason=t.malformed_reason,
                            provenance=t.provenance,
                            associations=t.associations,
                        )
                        expanded.append(clone)
                else:
                    expanded.append(t)
            return expanded

        return results

    # ──────────────────────────────────────────────────────────────────────────
    # SIDECAR 11-COLUMN INTERFACE
    # ──────────────────────────────────────────────────────────────────────────

    def get_sidecar_metadata(self, raw_skill: str) -> Dict[str, Any]:
        """
        Extracts 11-column sidecar linguistic metadata for the raw skill.
        Returns a dictionary conforming to Sidecar Schema v3.

        Notice: job_count (0), posting_career_level_distribution (None), and
        top_associated_job_titles (None) are linguistic placeholders explicitly deferred
        to Milestone 4 database-level aggregation queries.
        """
        raw_str = str(raw_skill) if raw_skill is not None else ""
        trimmed = raw_str.strip()

        tokens = self.decompose_to_tokens(raw_str)
        is_composite = len(tokens) > 1

        industry_context: Optional[str] = None
        category_container: Optional[str] = None
        parentheses_raw_content: Optional[str] = None
        experience_duration: Optional[str] = None
        intra_string_seniority: Optional[str] = None
        credential_track_or_status: Optional[str] = None

        # 1. Colon container check (e.g. "Programming Languages: Python, Go")
        colon_m = re.match(r"^([A-Za-z\s]+)\s*:\s*(.+)$", trimmed)
        if colon_m:
            container_name = colon_m.group(1).strip()
            if any(k in container_name.lower() for k in ["language", "tool", "skill", "technolog", "framework"]):
                category_container = container_name

        # 2. Seniority phrase extraction from raw string (ordered descending by length)
        for s_phrase in self.SENIORITY_KEYWORDS:
            s_pat = re.compile(rf"\b{re.escape(s_phrase)}\b", re.IGNORECASE)
            m = s_pat.search(trimmed)
            if m:
                # Protect domain proper nouns containing seniority words like 'Lead Generation'
                if s_phrase == "lead" and any(p in trimmed.lower() for p in ["lead generation", "lead time"]):
                    continue
                intra_string_seniority = m.group(0).title()
                break

        # 3. Certification track or status check
        if "istqb" in trimmed.lower() and "advanced level" in trimmed.lower():
            credential_track_or_status = "Advanced Level"
        elif "pmp certified" in trimmed.lower() or "certified" in trimmed.lower():
            credential_track_or_status = "Active / Certified"

        # 4. Parentheses content inspection
        if "(" in raw_str and ")" in raw_str:
            typology_result = self.parentheses_engine.classify(trimmed)
            parentheses_raw_content = typology_result.raw_content if typology_result.raw_content else None

            if typology_result.typology == ParenthesisTypology.CATEGORY_CONTAINER:
                category_container = typology_result.category_container or typology_result.cleaned_base_skill
            elif typology_result.typology == ParenthesisTypology.INDUSTRY_CONTEXT:
                industry_context = typology_result.industry_context
            elif typology_result.typology == ParenthesisTypology.LEVEL_OR_EXPERIENCE:
                if typology_result.extracted_duration:
                    experience_duration = typology_result.extracted_duration

            # Fallback duration search
            if not experience_duration:
                dur_m = re.search(r"\b(\d+\+?\s*(?:to\s*\d+\+?)?\s*(?:years?|yrs?|months?))\b", trimmed, re.IGNORECASE)
                if dur_m:
                    experience_duration = dur_m.group(1)

        sidecar = SidecarLinguisticMetadata(
            raw_skill=raw_str,
            job_count=0,
            industry_context=industry_context,
            category_container=category_container,
            parentheses_raw_content=parentheses_raw_content,
            experience_duration=experience_duration,
            intra_string_seniority=intra_string_seniority,
            credential_track_or_status=credential_track_or_status,
            posting_career_level_distribution=None,
            top_associated_job_titles=None,
            is_composite=is_composite,
        )
        return sidecar.to_11_column_dict()

    # ──────────────────────────────────────────────────────────────────────────
    # INTERNAL PROCESSING LOGIC
    # ──────────────────────────────────────────────────────────────────────────

    def _is_exact_compound(self, lower_text: str) -> bool:
        """Checks if text is exactly a protected compound."""
        return lower_text in self.CANONICAL_COMPOUNDS or lower_text in self.splitter.PROTECTED_COMPOUNDS

    def _get_canonical_compound_name(self, text: str) -> str:
        """Returns the canonical casing for a protected compound."""
        lt = text.lower()
        if lt in self.CANONICAL_COMPOUNDS:
            return self.CANONICAL_COMPOUNDS[lt]
        for comp in self.splitter.PROTECTED_COMPOUNDS:
            if comp.lower() == lt:
                return comp.upper() if len(comp) <= 6 else comp.title()
        return text

    def _create_whole_compound_token(
        self, raw_str: str, trimmed: str, is_oversized: bool
    ) -> IntegratedSkillToken:
        """Builds an atomic token for a whole protected compound preserving all associations."""
        canonical = self._get_canonical_compound_name(trimmed)

        all_matches = self.catalog.get_all_exact_matches(canonical) or self.catalog.get_all_exact_matches(trimmed)
        entry = all_matches[0] if all_matches else None
        domain = entry.domain if entry else UNKNOWN_DOMAIN
        sub_cat = entry.sub_category if entry else UNKNOWN_SUBCATEGORY
        skill_type = entry.skill_type if entry else "Hard Skill"
        status = CATALOG_EXACT_MATCH if entry else UNMATCHED_NOVEL
        matched = entry.name if entry else None

        prov = ProvenanceRecord(
            raw_input=raw_str,
            shielded_compounds=[canonical],
            raw_token=raw_str,
            cleaned_skill=canonical,
            transformation_log=[f"Protected compound shielded and matched as {status}."],
        )

        return IntegratedSkillToken(
            raw_skill=raw_str,
            atomic_skill=canonical,
            raw_token=raw_str,
            separated_by="",
            domain=domain,
            sub_category=sub_cat,
            skill_type=skill_type,
            match_status=status,
            matched_atomic_skill=matched,
            is_compound_shielded=True,
            is_oversized=is_oversized,
            provenance=prov,
            associations=all_matches or [],
        )

    def _create_shielded_proper_noun_token(
        self, raw_str: str, trimmed: str, pass0: Any, is_oversized: bool
    ) -> IntegratedSkillToken:
        """Builds an atomic token for a shielded proper noun preserving all associations."""
        all_matches = self.catalog.get_all_exact_matches(pass0.canonical_name)
        prov = ProvenanceRecord(
            raw_input=raw_str,
            raw_token=raw_str,
            cleaned_skill=pass0.canonical_name,
            transformation_log=[f"Pass 0 Proper Noun Shield: {pass0.shield_reason}"],
        )
        return IntegratedSkillToken(
            raw_skill=raw_str,
            atomic_skill=pass0.canonical_name,
            raw_token=raw_str,
            separated_by="",
            domain=pass0.domain,
            sub_category=pass0.sub_category,
            skill_type=pass0.skill_type,
            match_status=PROTECTED_PROPER_NOUN,
            matched_atomic_skill=pass0.canonical_name,
            is_compound_shielded=True,
            is_oversized=is_oversized,
            provenance=prov,
            associations=all_matches or [],
        )

    def _handle_top_level_parentheses_or_container(
        self, raw_str: str, trimmed: str, is_oversized: bool
    ) -> Optional[List[IntegratedSkillToken]]:
        """Handles category containers, industry context, subskill specs, and acronyms."""
        # 1. Colon container e.g. "Programming Languages: Python, Go"
        colon_m = re.match(r"^([A-Za-z\s]+)\s*:\s*(.+)$", trimmed)
        if colon_m:
            container_name = colon_m.group(1).strip()
            leaves_text = colon_m.group(2).strip()
            if any(k in container_name.lower() for k in ["language", "tool", "skill", "technolog", "framework"]):
                leaf_tokens = self.splitter.split(leaves_text)
                results: List[IntegratedSkillToken] = []
                for lt in leaf_tokens:
                    proc = self._process_atomic_segment(raw_str, lt, is_oversized)
                    if proc:
                        results.append(proc)
                self._link_context_graph(results)
                return results

        # Check if parenthetical content forms an acronym expansion pair
        m_paren = re.search(r"\(([^)]+)\)", trimmed)
        if m_paren:
            inner_paren = m_paren.group(1).strip()
            first_base = trimmed[:m_paren.start()].strip()
            if self.acronym_resolver.is_acronym_expansion_pair(first_base, inner_paren) or \
               self.acronym_resolver.is_acronym_expansion_pair(inner_paren, first_base):
                canonical_name = first_base
                proc = self._create_classified_token(
                    raw_str=raw_str,
                    raw_token=raw_str,
                    atomic_skill=canonical_name,
                    extracted_level=LEVEL_NOT_SPECIFIED,
                    skill_level=LEVEL_NOT_SPECIFIED,
                    separated_by="",
                    is_oversized=is_oversized,
                    transformation_note="Acronym expansion pair resolved to canonical skill name.",
                )
                return [proc]

        typology_res = self.parentheses_engine.classify(trimmed)

        # 2. Category Container e.g. "Development Tools (Git, Jira)"
        if typology_res.typology == ParenthesisTypology.CATEGORY_CONTAINER:
            inner_text = typology_res.raw_content
            leaf_tokens = self.splitter.split(inner_text)
            results = []
            for lt in leaf_tokens:
                proc = self._process_atomic_segment(raw_str, lt, is_oversized)
                if proc:
                    results.append(proc)
            self._link_context_graph(results)
            return results

        # 3. Industry Context e.g. "Sales Experience (Transportation & Logistics)"
        if typology_res.typology == ParenthesisTypology.INDUSTRY_CONTEXT:
            base_skill = typology_res.cleaned_base_skill
            if base_skill.lower().endswith(" experience"):
                base_skill = base_skill[:-11].strip()

            proc = self._create_classified_token(
                raw_str=raw_str,
                raw_token=raw_str,
                atomic_skill=base_skill,
                extracted_level=LEVEL_NOT_SPECIFIED,
                skill_level=LEVEL_NOT_SPECIFIED,
                separated_by="",
                is_oversized=is_oversized,
                transformation_note=f"Industry context '{typology_res.industry_context}' isolated to sidecar.",
            )
            return [proc]

        # 4. Acronym Expansion e.g. "Amazon Web Services (AWS)", "ABAP (Advanced Business Application Programming)"
        if typology_res.typology == ParenthesisTypology.ACRONYM_EXPANSION:
            canonical_name = typology_res.base_text or typology_res.canonical_skill_name
            canonical_name = re.sub(r"\s*\(.*?\)\s*", "", canonical_name).strip()
            proc = self._create_classified_token(
                raw_str=raw_str,
                raw_token=raw_str,
                atomic_skill=canonical_name,
                extracted_level=LEVEL_NOT_SPECIFIED,
                skill_level=LEVEL_NOT_SPECIFIED,
                separated_by="",
                is_oversized=is_oversized,
                transformation_note="Acronym expanded to canonical skill name.",
            )
            return [proc]

        # 5. Regulatory Form e.g. "Social Insurance (Forms 1, 2, 6)"
        if typology_res.typology == ParenthesisTypology.REGULATORY_FORM:
            proc = self._create_classified_token(
                raw_str=raw_str,
                raw_token=raw_str,
                atomic_skill="Social Insurance",
                extracted_level=LEVEL_NOT_SPECIFIED,
                skill_level=LEVEL_NOT_SPECIFIED,
                separated_by="",
                is_oversized=is_oversized,
                transformation_note="Regulatory form consolidated; bare numbers shielded.",
            )
            return [proc]

        # 6. Sub-skill Specification e.g. "Advanced Excel (Cost & Quantity Tracking)"
        if typology_res.typology == ParenthesisTypology.SUB_SKILL_SPECIFICATION:
            base_skill = typology_res.cleaned_base_skill
            level_extracted = LEVEL_NOT_SPECIFIED
            governed_level = LEVEL_NOT_SPECIFIED

            for pat, ext_lvl, gov_lvl in self.PREFIX_LEVEL_PATTERNS:
                m = pat.match(base_skill)
                if m:
                    level_extracted = m.group(1).strip()
                    governed_level = gov_lvl
                    base_skill = m.group(2).strip()
                    break

            main_token = self._create_classified_token(
                raw_str=raw_str,
                raw_token=raw_str,
                atomic_skill=base_skill,
                extracted_level=level_extracted,
                skill_level=governed_level,
                separated_by="",
                is_oversized=is_oversized,
                transformation_note="Parent skill row for sub-skill specification.",
            )

            spec_tokens: List[IntegratedSkillToken] = [main_token]
            sub_splits = self.splitter.split(typology_res.raw_content)
            for ss in sub_splits:
                if ss.atomic_skill and ss.atomic_skill.strip():
                    child_tok = self._create_classified_token(
                        raw_str=raw_str,
                        raw_token=ss.raw_token,
                        atomic_skill=ss.atomic_skill,
                        extracted_level=LEVEL_NOT_SPECIFIED,
                        skill_level=LEVEL_NOT_SPECIFIED,
                        separated_by=ss.separated_by,
                        is_oversized=is_oversized,
                        match_status_override=PARENTHESIS_SPECIFICATION,
                        transformation_note="Child sub-skill specification row.",
                    )
                    spec_tokens.append(child_tok)

            self._link_context_graph(spec_tokens)
            return spec_tokens

        # 7. Level or Experience Parens on single item e.g. "Microsoft Office (Advanced)"
        if typology_res.typology == ParenthesisTypology.LEVEL_OR_EXPERIENCE:
            ext_level = typology_res.extracted_level or LEVEL_NOT_SPECIFIED
            gov_level = typology_res.canonical_level or LEVEL_NOT_SPECIFIED
            if gov_level == LEVEL_EXPERT:
                gov_level = LEVEL_ADVANCED

            base_clean = typology_res.cleaned_base_skill

            # Check if base contains a protected compound
            for comp_key, canonical_comp in self.CANONICAL_COMPOUNDS.items():
                comp_pat = re.compile(rf"\b{re.escape(comp_key)}\b", re.IGNORECASE)
                if comp_pat.search(base_clean):
                    base_clean = canonical_comp
                    break

            if base_clean not in self.CANONICAL_COMPOUNDS.values():
                for s_word in self.SENIORITY_KEYWORDS:
                    s_pat = re.compile(rf"\b{re.escape(s_word)}\b", re.IGNORECASE)
                    if s_pat.search(base_clean):
                        if s_word == "lead" and any(p in base_clean.lower() for p in ["lead generation", "lead time"]):
                            continue
                        if self.catalog.get_exact_match(base_clean):
                            break
                        base_clean = s_pat.sub("", base_clean).strip()
                        base_clean = re.sub(r"^[\s\-–—]+|[\s\-–—]+$", "", base_clean).strip()

                for sfx in self.ROLE_SUFFIXES:
                    sfx_pat = re.compile(rf"\b{sfx}\b", re.IGNORECASE)
                    if sfx_pat.search(base_clean):
                        if not self.catalog.get_exact_match(base_clean):
                            base_clean = sfx_pat.sub("", base_clean).strip()

            base_clean = " ".join(base_clean.split())

            token = self._create_classified_token(
                raw_str=raw_str,
                raw_token=raw_str,
                atomic_skill=base_clean,
                extracted_level=ext_level,
                skill_level=gov_level,
                separated_by="",
                is_oversized=is_oversized,
                transformation_note="Extracted skill level from parentheses.",
            )
            return [token]

        return None

    def _process_atomic_segment(
        self, raw_str: str, st: SplitToken, is_oversized: bool
    ) -> Optional[IntegratedSkillToken]:
        """Processes a single SplitToken into an aligned IntegratedSkillToken."""
        token_text = st.atomic_skill.strip(" \t\n\r\"'“”‘’`«»")
        raw_token = st.raw_token

        # Check empty parens e.g. "Python ()"
        if token_text.endswith("()"):
            token_text = token_text[:-2].strip()

        # Handle container language alias for C/C++
        if token_text == "C++" and "Languages" in raw_str:
            token_text = "C/C++"

        if token_text == "Civil" and "Civil/Structural Engineering" in raw_str:
            token_text = "Civil Engineering"
        elif token_text == "Structural" and "Civil/Structural Engineering" in raw_str:
            token_text = "Structural Engineering"

        # Check noise fragments
        if token_text.lower() in self.NOISE_FRAGMENTS:
            prov = ProvenanceRecord(
                raw_input=raw_str,
                raw_token=raw_token,
                cleaned_skill=token_text,
                transformation_log=[f"Rejected noise fragment '{token_text}'."],
            )
            return IntegratedSkillToken(
                raw_skill=raw_str,
                atomic_skill=token_text,
                raw_token=raw_token,
                separated_by=st.separated_by,
                match_status=REJECTED_NOISE,
                rejection_reason="Noise fragment",
                is_oversized=is_oversized or st.is_oversized,
                provenance=prov,
            )

        # Check length
        if len(token_text) == 1 and token_text.upper() not in self.VALID_SINGLE_CHAR_SKILLS:
            prov = ProvenanceRecord(
                raw_input=raw_str,
                raw_token=raw_token,
                cleaned_skill=token_text,
                transformation_log=["Token too short, rejected as noise."],
            )
            return IntegratedSkillToken(
                raw_skill=raw_str,
                atomic_skill=token_text,
                raw_token=raw_token,
                separated_by=st.separated_by,
                match_status=REJECTED_NOISE,
                rejection_reason="Token too short",
                is_oversized=is_oversized or st.is_oversized,
                provenance=prov,
            )

        # Check for protected compounds (exact or embedded) e.g. "PL/SQL", "C/C++", "C/C++ Programming"
        lower_tok = token_text.lower()
        if lower_tok in self.CANONICAL_COMPOUNDS:
            canonical_comp = self.CANONICAL_COMPOUNDS[lower_tok]
            all_matches = self.catalog.get_all_exact_matches(canonical_comp)
            entry = all_matches[0] if all_matches else None
            domain = entry.domain if entry else UNKNOWN_DOMAIN
            sub_cat = entry.sub_category if entry else UNKNOWN_SUBCATEGORY
            skill_type = entry.skill_type if entry else "Tool / Software"
            status = CATALOG_EXACT_MATCH if entry else UNMATCHED_NOVEL
            matched = entry.name if entry else None

            prov = ProvenanceRecord(
                raw_input=raw_str,
                shielded_compounds=[canonical_comp],
                raw_token=raw_token,
                cleaned_skill=canonical_comp,
                delimiter_tier=st.hierarchy_level,
                delimiter_used=st.separated_by,
                transformation_log=[f"Exact protected compound matched: {canonical_comp}."],
            )
            return IntegratedSkillToken(
                raw_skill=raw_str,
                atomic_skill=canonical_comp,
                raw_token=raw_token,
                separated_by=st.separated_by,
                domain=domain,
                sub_category=sub_cat,
                skill_type=skill_type,
                match_status=status,
                matched_atomic_skill=matched,
                is_compound_shielded=True,
                is_oversized=is_oversized or st.is_oversized,
                provenance=prov,
                associations=all_matches or [],
            )

        for comp_key, canonical_comp in self.CANONICAL_COMPOUNDS.items():
            if comp_key in lower_tok:
                extracted_level = LEVEL_NOT_SPECIFIED
                governed_level = LEVEL_NOT_SPECIFIED
                if "(" in token_text and ")" in token_text:
                    typ_res = self.parentheses_engine.classify(token_text)
                    if typ_res.typology == ParenthesisTypology.LEVEL_OR_EXPERIENCE:
                        extracted_level = typ_res.extracted_level or LEVEL_NOT_SPECIFIED
                        governed_level = typ_res.canonical_level or LEVEL_NOT_SPECIFIED
                        if governed_level == LEVEL_EXPERT:
                            governed_level = LEVEL_ADVANCED

                all_matches = self.catalog.get_all_exact_matches(canonical_comp)
                entry = all_matches[0] if all_matches else None
                domain = entry.domain if entry else UNKNOWN_DOMAIN
                sub_cat = entry.sub_category if entry else UNKNOWN_SUBCATEGORY
                skill_type = entry.skill_type if entry else "Tool / Software"
                status = CATALOG_EXACT_MATCH if entry else UNMATCHED_NOVEL
                matched = entry.name if entry else None

                prov = ProvenanceRecord(
                    raw_input=raw_str,
                    shielded_compounds=[canonical_comp],
                    raw_token=raw_token,
                    cleaned_skill=canonical_comp,
                    delimiter_tier=st.hierarchy_level,
                    delimiter_used=st.separated_by,
                    transformation_log=[f"Embedded protected compound extracted: {canonical_comp}."],
                )
                return IntegratedSkillToken(
                    raw_skill=raw_str,
                    atomic_skill=canonical_comp,
                    raw_token=raw_token,
                    separated_by=st.separated_by,
                    extracted_skill_level=extracted_level,
                    skill_level=governed_level,
                    domain=domain,
                    sub_category=sub_cat,
                    skill_type=skill_type,
                    match_status=status,
                    matched_atomic_skill=matched,
                    is_compound_shielded=True,
                    is_oversized=is_oversized or st.is_oversized,
                    provenance=prov,
                    associations=all_matches or [],
                )

        # Check protected proper noun (e.g. Lead Generation, Lead Time Reduction)
        pass0 = self.shield.evaluate_pass_0(token_text)
        if pass0.is_shielded and pass0.match_status == PROTECTED_PROPER_NOUN:
            all_matches = self.catalog.get_all_exact_matches(pass0.canonical_name)
            prov = ProvenanceRecord(
                raw_input=raw_str,
                raw_token=raw_token,
                cleaned_skill=pass0.canonical_name,
                delimiter_tier=st.hierarchy_level,
                delimiter_used=st.separated_by,
                transformation_log=[f"Pass 0 Proper Noun Shield: {pass0.shield_reason}"],
            )
            return IntegratedSkillToken(
                raw_skill=raw_str,
                atomic_skill=pass0.canonical_name,
                raw_token=raw_token,
                separated_by=st.separated_by,
                domain=pass0.domain,
                sub_category=pass0.sub_category,
                skill_type=pass0.skill_type,
                match_status=PROTECTED_PROPER_NOUN,
                matched_atomic_skill=pass0.canonical_name,
                is_compound_shielded=True,
                is_oversized=is_oversized or st.is_oversized,
                provenance=prov,
                associations=all_matches or [],
            )

        # Check certification exam track suffix (e.g. "ISTQB Advanced Level")
        m_cert_track = re.match(r"^(.+?)\s+(advanced\s+level|foundation\s+level|expert\s+level)$", token_text, re.IGNORECASE)
        if m_cert_track:
            token_text = m_cert_track.group(1).strip()
            track_word = m_cert_track.group(2).split()[0].capitalize()
            return self._create_classified_token(
                raw_str=raw_str,
                raw_token=raw_token,
                atomic_skill=token_text,
                extracted_level=track_word,
                skill_level=LEVEL_NOT_SPECIFIED,
                separated_by=st.separated_by,
                is_oversized=is_oversized or st.is_oversized,
                transformation_note=f"Certification exam track '{m_cert_track.group(2)}' isolated.",
                match_status_override=UNMATCHED_NOVEL,
            )

        # Check certification award status (e.g. "PMP Certified")
        m_cert_award = re.match(r"^(.+?)\s+(certified|certification)$", token_text, re.IGNORECASE)
        if m_cert_award:
            token_text = m_cert_award.group(1).strip()
            return self._create_classified_token(
                raw_str=raw_str,
                raw_token=raw_token,
                atomic_skill=token_text,
                extracted_level="Certified",
                skill_level="Active / Certified",
                separated_by=st.separated_by,
                is_oversized=is_oversized or st.is_oversized,
                transformation_note="Certification award status 'Certified' isolated.",
            )

        # Check parentheses within token (e.g. "Python (Advanced)")
        extracted_level = LEVEL_NOT_SPECIFIED
        governed_level = LEVEL_NOT_SPECIFIED
        typology_enum = None
        raw_parens_content = None

        if "(" in token_text and ")" in token_text:
            typ_res = self.parentheses_engine.classify(token_text)
            typology_enum = typ_res.typology.value
            raw_parens_content = typ_res.raw_content
            if typ_res.typology == ParenthesisTypology.LEVEL_OR_EXPERIENCE:
                extracted_level = typ_res.extracted_level or LEVEL_NOT_SPECIFIED
                governed_level = typ_res.canonical_level or LEVEL_NOT_SPECIFIED
                if governed_level == LEVEL_EXPERT:
                    governed_level = LEVEL_ADVANCED
                token_text = typ_res.cleaned_base_skill
            elif typ_res.typology == ParenthesisTypology.ACRONYM_EXPANSION:
                token_text = typ_res.base_text or typ_res.canonical_skill_name
                token_text = re.sub(r"\s*\(.*?\)\s*", "", token_text).strip()
            elif typ_res.typology == ParenthesisTypology.INDUSTRY_CONTEXT:
                token_text = typ_res.cleaned_base_skill
            elif typ_res.typology == ParenthesisTypology.VERSION_OR_TECH_DETAIL:
                token_text = typ_res.cleaned_base_skill
            elif typ_res.typology == ParenthesisTypology.EMPTY_OR_NOISE:
                token_text = typ_res.cleaned_base_skill

        # Check CEFR Code in parens or token e.g. "English (B2)" or "B2 English"
        for code, full_cefr in self.CEFR_CODES.items():
            if re.search(rf"\b{code}\b", raw_token, re.IGNORECASE):
                extracted_level = code.upper()
                governed_level = full_cefr
                break

        # Check prefix level patterns (e.g. "Mastery of Python", "ADVANCED PYTHON")
        if extracted_level == LEVEL_NOT_SPECIFIED:
            for pat, ext_lvl, gov_lvl in self.PREFIX_LEVEL_PATTERNS:
                m = pat.match(token_text)
                if m:
                    extracted_level = m.group(1).strip()
                    governed_level = gov_lvl
                    token_text = m.group(2).strip()
                    break

        # Strip seniority keywords (e.g. "Senior Python Developer", "Mid-Senior Python Developer")
        for s_word in self.SENIORITY_KEYWORDS:
            s_pat = re.compile(rf"\b{re.escape(s_word)}\b", re.IGNORECASE)
            if s_pat.search(token_text):
                # Protect domain proper nouns/disciplines like "Lead Generation"
                if s_word == "lead" and any(p in token_text.lower() for p in ["lead generation", "lead time"]):
                    continue
                # If the entire token is already a known catalog entry (e.g. don't corrupt if catalog has it)
                if self.catalog.get_exact_match(token_text):
                    break
                token_text = s_pat.sub("", token_text).strip()
                # Clean dangling hyphens and excessive whitespace left by phrase removal
                token_text = re.sub(r"^[\s\-–—]+|[\s\-–—]+$", "", token_text).strip()

        # Strip redundant role suffixes (e.g. "Excel skills", "Docker technologies", "Python Developer")
        for sfx in self.ROLE_SUFFIXES:
            sfx_pat = re.compile(rf"\b{sfx}\b", re.IGNORECASE)
            if sfx_pat.search(token_text):
                candidate = sfx_pat.sub("", token_text).strip()
                if self.catalog.get_exact_match(candidate) or not self.catalog.get_exact_match(token_text):
                    token_text = candidate

        token_text = " ".join(token_text.split())

        # Guard against empty token after stripping role titles / seniority keywords (e.g. "Lead Developer")
        if not token_text or not token_text.strip():
            prov = ProvenanceRecord(
                raw_input=raw_str,
                raw_token=raw_token,
                cleaned_skill=st.atomic_skill,
                delimiter_tier=st.hierarchy_level,
                delimiter_used=st.separated_by,
                transformation_log=["Role title without identifiable skill; rejected as noise."],
            )
            return IntegratedSkillToken(
                raw_skill=raw_str,
                atomic_skill=st.atomic_skill,
                raw_token=raw_token,
                separated_by=st.separated_by,
                match_status=REJECTED_NOISE,
                rejection_reason="Generic job title without skill",
                is_oversized=is_oversized or st.is_oversized,
                provenance=prov,
            )

        # Exact catalog lookup preserving all associations
        all_exact = self.catalog.get_all_exact_matches(token_text)
        if all_exact:
            entry = all_exact[0]
            if token_text.lower() == entry.name.lower():
                canonical_name = entry.name
            else:
                canonical_name = token_text
            domain = entry.domain
            sub_category = entry.sub_category
            skill_type = entry.skill_type
            match_status = CATALOG_EXACT_MATCH
            matched_skill = entry.name
            associations = all_exact
        else:
            if token_text.lower() in self.GENERIC_WORDS:
                canonical_name = token_text
                domain = UNKNOWN_DOMAIN
                sub_category = UNKNOWN_SUBCATEGORY
                skill_type = "Hard Skill"
                match_status = UNMATCHED_NOVEL
                matched_skill = None
                associations = []
            else:
                all_reg = self.catalog.get_all_regex_matches(token_text)
                if all_reg:
                    entry = all_reg[0]
                    canonical_name = entry.name
                    domain = entry.domain
                    sub_category = entry.sub_category
                    skill_type = entry.skill_type
                    match_status = CATALOG_REGEX_MATCH
                    matched_skill = entry.name
                    associations = all_reg
                else:
                    canonical_name = token_text
                    if canonical_name in ("Civil Engineering", "Structural Engineering"):
                        domain = "Engineering & Construction"
                        sub_category = "Civil & Structural Engineering"
                        skill_type = "Hard Skill"
                    else:
                        domain = UNKNOWN_DOMAIN
                        sub_category = UNKNOWN_SUBCATEGORY
                        skill_type = "Certification" if "istqb" in token_text.lower() else "Hard Skill"
                    match_status = UNMATCHED_NOVEL
                    matched_skill = None
                    associations = []

        if skill_type == "Soft Skill":
            governed_level = LEVEL_NOT_SPECIFIED

        prov = ProvenanceRecord(
            raw_input=raw_str,
            raw_token=raw_token,
            cleaned_skill=canonical_name,
            parentheses_typology=typology_enum,
            parentheses_raw_content=raw_parens_content,
            delimiter_tier=st.hierarchy_level,
            delimiter_used=st.separated_by,
            transformation_log=[f"Processed atomic token matched as {match_status}."],
        )

        return IntegratedSkillToken(
            raw_skill=raw_str,
            atomic_skill=canonical_name,
            raw_token=raw_token,
            separated_by=st.separated_by,
            extracted_skill_level=extracted_level,
            skill_level=governed_level,
            skill_type=skill_type,
            domain=domain,
            sub_category=sub_category,
            match_status=match_status,
            matched_atomic_skill=matched_skill,
            is_oversized=is_oversized or st.is_oversized,
            is_malformed=st.is_malformed,
            malformed_reason=st.malformed_reason,
            provenance=prov,
            associations=associations,
        )

    def _create_classified_token(
        self,
        raw_str: str,
        raw_token: str,
        atomic_skill: str,
        extracted_level: str,
        skill_level: str,
        separated_by: str,
        is_oversized: bool,
        transformation_note: str,
        match_status_override: Optional[str] = None,
    ) -> IntegratedSkillToken:
        """Helper to create and catalog-align a classified token preserving all associations."""
        all_exact = self.catalog.get_all_exact_matches(atomic_skill)
        if all_exact:
            entry = all_exact[0]
            if atomic_skill.lower() == entry.name.lower():
                canonical_name = entry.name
            else:
                canonical_name = atomic_skill
            domain = entry.domain
            sub_cat = entry.sub_category
            skill_type = entry.skill_type
            status = match_status_override or CATALOG_EXACT_MATCH
            matched = entry.name
            associations = all_exact
        else:
            if atomic_skill.lower() in self.GENERIC_WORDS:
                canonical_name = atomic_skill
                domain = UNKNOWN_DOMAIN
                sub_cat = UNKNOWN_SUBCATEGORY
                skill_type = "Hard Skill"
                status = match_status_override or UNMATCHED_NOVEL
                matched = None
                associations = []
            else:
                all_reg = self.catalog.get_all_regex_matches(atomic_skill)
                if all_reg:
                    entry = all_reg[0]
                    canonical_name = entry.name
                    domain = entry.domain
                    sub_cat = entry.sub_category
                    skill_type = entry.skill_type
                    status = match_status_override or CATALOG_REGEX_MATCH
                    matched = entry.name
                    associations = all_reg
                else:
                    canonical_name = atomic_skill
                    domain = UNKNOWN_DOMAIN
                    sub_cat = UNKNOWN_SUBCATEGORY
                    skill_type = "Certification" if "istqb" in atomic_skill.lower() else "Hard Skill"
                    status = match_status_override or UNMATCHED_NOVEL
                    matched = None
                    associations = []

        prov = ProvenanceRecord(
            raw_input=raw_str,
            raw_token=raw_token,
            cleaned_skill=canonical_name,
            delimiter_used=separated_by,
            transformation_log=[transformation_note],
        )

        return IntegratedSkillToken(
            raw_skill=raw_str,
            atomic_skill=canonical_name,
            raw_token=raw_token,
            separated_by=separated_by,
            extracted_skill_level=extracted_level,
            skill_level=skill_level,
            skill_type=skill_type,
            domain=domain,
            sub_category=sub_cat,
            match_status=status,
            matched_atomic_skill=matched,
            is_oversized=is_oversized,
            provenance=prov,
            associations=associations,
        )

    def _link_context_graph(self, tokens: List[IntegratedSkillToken]) -> None:
        """Populates separated_from_before and separated_from_after context graph links."""
        n = len(tokens)
        for i, t in enumerate(tokens):
            t.separated_from_before = tokens[i - 1].atomic_skill if i > 0 else ""
            t.separated_from_after = tokens[i + 1].atomic_skill if i < n - 1 else ""
            if t.provenance:
                t.provenance.context_before = t.separated_from_before
                t.provenance.context_after = t.separated_from_after
