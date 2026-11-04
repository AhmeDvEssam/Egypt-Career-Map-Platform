"""
Linguistic Intelligence — Pass 2 Parentheses Typology Engine
============================================================
Deterministic 5-way parenthetical classification engine.
Classifies parentheses content into:
  1. LEVEL_OR_EXPERIENCE: Proficiency level or experience duration
  2. ACRONYM_EXPANSION: Acronym vs full name resolution via AcronymResolver
  3. CATEGORY_CONTAINER: Generic tool/technology container decomposing to leaf skills
  4. INDUSTRY_CONTEXT: Sector or domain restrictions mapped to Sidecar metadata
  5. SUB_SKILL_SPECIFICATION: Domain sub-specialties and module specifications
Plus edge-case handlers for:
  - REGULATORY_FORM: Egyptian/international statutory forms (e.g. Forms 1, 2, 6)
  - VERSION_OR_TECH_DETAIL: Software versioning (e.g. v14+, 3.x)
  - EMPTY_OR_NOISE: Empty parens '()' or meaningless filler
  - MALFORMED: Linear O(n) detection of unclosed or unopened parentheses

CRITICAL ARCHITECTURAL PRINCIPLE:
Strictly separates classification from Sidecar data persistence.
Produces a pure, typed TypologyClassification dataclass; does NOT write to sidecar.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Dict, List, Optional, Set, Tuple, Union

from linguistic_intelligence.config import (
    CLOSED_DOMAINS_SET,
    CLOSED_SUBCATEGORIES_SET,
    LEVEL_ADVANCED,
    LEVEL_BEGINNER,
    LEVEL_EXPERT,
    LEVEL_INTERMEDIATE,
    LEVEL_NOT_SPECIFIED,
    PARENTHESIS_SPECIFICATION,
)
from linguistic_intelligence.proper_nouns import (
    AcronymResolver,
    ProperNounShield,
    is_protected_proper_noun,
)
from linguistic_intelligence.catalog import (
    CatalogLoader,
)


class ParenthesisTypology(str, Enum):
    """5-Way Primary Typology + Edge Case Categories."""
    LEVEL_OR_EXPERIENCE = "LEVEL_OR_EXPERIENCE"
    ACRONYM_EXPANSION = "ACRONYM_EXPANSION"
    CATEGORY_CONTAINER = "CATEGORY_CONTAINER"
    INDUSTRY_CONTEXT = "INDUSTRY_CONTEXT"
    SUB_SKILL_SPECIFICATION = "SUB_SKILL_SPECIFICATION"
    REGULATORY_FORM = "REGULATORY_FORM"
    VERSION_OR_TECH_DETAIL = "VERSION_OR_TECH_DETAIL"
    EMPTY_OR_NOISE = "EMPTY_OR_NOISE"
    MALFORMED = "MALFORMED"
    NONE = "NONE"


@dataclass(frozen=True)
class ParenthesisSpan:
    """Exact character boundaries and raw content of a parenthetical span."""
    start_index: int
    end_index: int
    raw_clause: str
    inner_content: str
    depth: int = 1
    is_malformed: bool = False
    malformed_reason: Optional[str] = None


@dataclass
class TypologyClassification:
    """
    Structured classification payload produced by ParenthesesTypologyEngine.
    Preserves all textual evidence and separates classification from downstream persistence.
    """
    typology: ParenthesisTypology
    raw_content: str
    base_text: str
    cleaned_base_skill: str
    extracted_level: Optional[str] = None
    extracted_duration: Optional[str] = None
    acronym_token: Optional[str] = None
    expanded_token: Optional[str] = None
    canonical_skill_name: Optional[str] = None
    category_container: Optional[str] = None
    leaf_tokens: List[str] = field(default_factory=list)
    industry_context: Optional[str] = None
    sub_skills: List[str] = field(default_factory=list)
    is_regulatory_form: bool = False
    is_malformed: bool = False
    malformed_reason: Optional[str] = None
    raw_input: str = ""

    def to_dict(self) -> Dict[str, Any]:
        """Converts classification result to a standard dictionary."""
        return {
            "typology": self.typology.value,
            "raw_content": self.raw_content,
            "base_text": self.base_text,
            "cleaned_base_skill": self.cleaned_base_skill,
            "extracted_level": self.extracted_level,
            "extracted_duration": self.extracted_duration,
            "acronym_token": self.acronym_token,
            "expanded_token": self.expanded_token,
            "canonical_skill_name": self.canonical_skill_name,
            "category_container": self.category_container,
            "leaf_tokens": list(self.leaf_tokens),
            "industry_context": self.industry_context,
            "sub_skills": list(self.sub_skills),
            "is_regulatory_form": self.is_regulatory_form,
            "is_malformed": self.is_malformed,
            "malformed_reason": self.malformed_reason,
            "raw_input": self.raw_input,
        }


class ParenthesesTypologyEngine:
    """
    Pass 2 Parentheses Typology Engine:
    Classifies parenthetical expressions using linear O(n) algorithmic parsing,
    strict length boundaries, and a deterministic priority decision matrix.
    """

    MAX_INPUT_LENGTH: int = 5000

    # ─── 1. REGULATORY FORM PATTERNS (Egyptian statutory & legal forms) ───────────
    REGULATORY_FORM_PATTERN: re.Pattern = re.compile(
        r"^(?:forms?|نماذج|نموذج|استمار(?:ة|ات)|قانون)\s*[\d\s,،\-\&و\.\/]+$",
        re.IGNORECASE,
    )

    # ─── 2. EXPERIENCE DURATION PATTERNS ──────────────────────────────────────────
    EXPERIENCE_DURATION_PATTERN: re.Pattern = re.compile(
        r"^\s*(?:(?:خبرة|experience|exp\.?)\s*(?:of\s+|:)?\s*)?"
        r"(\d{1,2}(?:\s*[\-\–\/]\s*\d{1,2})?\s*\+?\s*(?:years?|yrs?|months?|mos?|سنوات|سنة|أشهر|شهور))"
        r"(?:\s+(?:of\s+)?(?:experience|خبرة))?\s*$",
        re.IGNORECASE,
    )

    # ─── 3. VERSION / TECHNICAL DETAIL PATTERNS ───────────────────────────────────
    VERSION_DETAIL_PATTERN: re.Pattern = re.compile(
        r"^(?:v(?:er(?:sion)?)?\.?\s*\d[\d\w\.\+\-]*|\d+\.[\dxX\+]+|\b(?:3\.x|2\.x|14\+|17\+|11\+|8\+)\b)$",
        re.IGNORECASE,
    )

    # ─── 4. LEVEL MODIFIER PATTERNS ───────────────────────────────────────────────
    # Governed level modifiers from standard_skill_levels_matrix.csv
    LEVEL_PATTERNS: List[Tuple[str, re.Pattern]] = [
        # Explicit Advanced
        ("Advanced", re.compile(r"^(?:advanced|expert|mastery|sme|architect\s+level|high-level)$", re.IGNORECASE)),
        # Explicit Intermediate
        ("Intermediate", re.compile(r"^(?:intermediate|proficient|proficiency|working\s+knowledge|good\s+command)$", re.IGNORECASE)),
        # Explicit Beginner
        ("Beginner", re.compile(r"^(?:beginner|basic|basics|foundational|elementary|familiar|familiarity)$", re.IGNORECASE)),
        # Language CEFR
        ("C2", re.compile(r"^(?:c2|near-native|native(?:\s+speaker)?|mother\s+tongue)$", re.IGNORECASE)),
        ("C1", re.compile(r"^(?:c1|fluent|fluency|full\s+professional\s+proficiency)$", re.IGNORECASE)),
        ("B2", re.compile(r"^(?:b2|upper-intermediate|professional\s+working\s+proficiency)$", re.IGNORECASE)),
        ("B1", re.compile(r"^(?:b1|conversational)$", re.IGNORECASE)),
        ("A2", re.compile(r"^(?:a2|pre-intermediate)$", re.IGNORECASE)),
        ("A1", re.compile(r"^(?:a1|basic\s+understanding)$", re.IGNORECASE)),
        # Certification Status
        ("Certified", re.compile(r"^(?:certified|licensed|credentialed|chartered|passed)$", re.IGNORECASE)),
        ("Candidate", re.compile(r"^(?:candidate|in\s+progress|studying\s+for|pursuing)$", re.IGNORECASE)),
        # Ambiguous modifiers that are still level indicators
        ("Solid", re.compile(r"^solid(?:\s+understanding)?$", re.IGNORECASE)),
        ("Strong", re.compile(r"^strong(?:\s+knowledge)?$", re.IGNORECASE)),
        ("Extensive", re.compile(r"^extensive(?:\s+experience)?$", re.IGNORECASE)),
        ("Hands-on", re.compile(r"^hands-on(?:\s+experience)?$", re.IGNORECASE)),
    ]

    # ─── 5. CATEGORY CONTAINER KEYWORDS ───────────────────────────────────────────
    # Words in base_text that indicate a generic parent category
    CONTAINER_BASE_KEYWORDS: Set[str] = {
        "tools", "development tools", "ai tools", "ai development tools",
        "software", "technologies", "tech stack", "stack", "platforms",
        "languages", "programming languages", "frameworks", "libraries",
        "databases", "relational databases", "operating systems", "servers",
        "programs", "office programs", "skills", "concepts", "applications",
        "systems", "services", "protocols", "utilities", "methods", "techniques",
        "أدوات", "برامج", "لغات برمجة", "تقنيات", "أنظمة", "قواعد بيانات", "مهارات",
    }

    # ─── 6. INDUSTRY SECTORS & CONTEXTS ───────────────────────────────────────────
    ADDITIONAL_INDUSTRY_SECTORS: Set[str] = {
        "transportation & logistics", "transportation", "logistics", "freight",
        "hospitality & leisure", "hospitality", "leisure", "tourism",
        "fmcg", "fast-moving consumer goods", "consumer goods",
        "real estate", "property development",
        "pharmaceuticals", "pharma", "clinical research",
        "automotive", "car manufacturing",
        "telecommunications", "telecom", "isp",
        "oil & gas", "petroleum", "energy & utilities", "energy",
        "fintech", "banking & financial services", "banking", "finance",
        "retail", "e-commerce", "wholesale",
        "manufacturing", "industrial production", "textiles & garments",
        "aviation & airlines", "aviation", "maritime & shipping", "maritime",
        "construction & contracting", "construction",
        "agriculture", "farming",
        "media & entertainment", "broadcasting",
        "healthcare", "medical devices", "hospitals",
        "education", "higher education", "k-12",
        "insurance", "general insurance", "life insurance",
    }

    # Experience indicator suffixes in base_text
    EXPERIENCE_SUFFIXES: Tuple[str, ...] = (
        "experience", "background", "sector", "industry", "domain",
        "field", "knowledge", "skills", "خبرة", "مجال", "قطاع",
    )

    def __init__(
        self,
        catalog: Optional[CatalogLoader] = None,
        acronym_resolver: Optional[AcronymResolver] = None,
        proper_noun_shield: Optional[ProperNounShield] = None,
    ):
        self.catalog = catalog or CatalogLoader()
        self.acronym_resolver = acronym_resolver or AcronymResolver()
        self.proper_noun_shield = proper_noun_shield or ProperNounShield()

        # Build fast lookup sets for industry matching
        self._industry_lookup: Set[str] = set()
        for d in CLOSED_DOMAINS_SET:
            self._industry_lookup.add(d.strip().lower())
        for sub in CLOSED_SUBCATEGORIES_SET:
            self._industry_lookup.add(sub.strip().lower())
        for ind in self.ADDITIONAL_INDUSTRY_SECTORS:
            self._industry_lookup.add(ind.strip().lower())

    # ─── LINEAR O(n) PARENTHESES SCANNER ──────────────────────────────────────────
    def parse_spans(self, text: str) -> List[ParenthesisSpan]:
        """
        Parses all top-level parenthetical spans in text using a linear O(n) stack.
        Correctly balances nested parentheses and detects unclosed/unopened clauses.
        Guarded against excessive length (MAX_INPUT_LENGTH).
        """
        if not text or not isinstance(text, str):
            return []

        # Length guard
        if len(text) > self.MAX_INPUT_LENGTH:
            text = text[: self.MAX_INPUT_LENGTH]

        spans: List[ParenthesisSpan] = []
        stack: List[Tuple[int, int]] = []  # (start_index, current_depth)

        for i, char in enumerate(text):
            if char == "(":
                current_depth = len(stack) + 1
                stack.append((i, current_depth))
            elif char == ")":
                if not stack:
                    # Unopened closing parenthesis
                    spans.append(
                        ParenthesisSpan(
                            start_index=i,
                            end_index=i + 1,
                            raw_clause=")",
                            inner_content="",
                            depth=0,
                            is_malformed=True,
                            malformed_reason="Unopened closing parenthesis",
                        )
                    )
                else:
                    start_idx, depth = stack.pop()
                    if depth == 1:
                        # Completed outermost top-level span
                        raw_clause = text[start_idx : i + 1]
                        inner_content = text[start_idx + 1 : i].strip()
                        spans.append(
                            ParenthesisSpan(
                                start_index=start_idx,
                                end_index=i + 1,
                                raw_clause=raw_clause,
                                inner_content=inner_content,
                                depth=1,
                                is_malformed=False,
                            )
                        )

        # Handle unclosed opening parentheses remaining on stack
        while stack:
            start_idx, depth = stack.pop()
            raw_clause = text[start_idx:]
            inner_content = text[start_idx + 1 :].strip()
            spans.append(
                ParenthesisSpan(
                    start_index=start_idx,
                    end_index=len(text),
                    raw_clause=raw_clause,
                    inner_content=inner_content,
                    depth=depth,
                    is_malformed=True,
                    malformed_reason="Unclosed opening parenthesis",
                )
            )

        # Sort spans by start_index
        spans.sort(key=lambda s: s.start_index)
        return spans

    # ─── PRIMARY CLASSIFICATION INTERFACE ─────────────────────────────────────────
    def classify(self, text: str) -> TypologyClassification:
        """
        Extracts and classifies parenthetical content from a single raw skill string.
        Follows the deterministic priority decision matrix (Principle 2).
        """
        if not text or not isinstance(text, str) or not text.strip():
            return TypologyClassification(
                typology=ParenthesisTypology.NONE,
                raw_content="",
                base_text="",
                cleaned_base_skill="",
                raw_input=text or "",
            )

        text_clean = text.strip()
        spans = self.parse_spans(text_clean)

        if not spans:
            # Zero parentheses found
            return TypologyClassification(
                typology=ParenthesisTypology.NONE,
                raw_content="",
                base_text=text_clean,
                cleaned_base_skill=text_clean,
                raw_input=text_clean,
            )

        # Check for malformed spans
        malformed_spans = [s for s in spans if s.is_malformed]
        if malformed_spans:
            first_malformed = malformed_spans[0]
            # Salvage whatever base text exists
            base = text_clean[: first_malformed.start_index].strip()
            if not base:
                base = text_clean[first_malformed.end_index :].strip()
            return self._classify_clause(
                base_text=base or text_clean,
                inner_content=first_malformed.inner_content,
                raw_input=text_clean,
                is_malformed=True,
                malformed_reason=first_malformed.malformed_reason,
            )

        # In case of multiple valid spans, analyze the first outermost span
        # while removing all parenthesis spans from the base text
        primary_span = spans[0]
        base_text = self._strip_spans(text_clean, spans)

        return self._classify_clause(
            base_text=base_text,
            inner_content=primary_span.inner_content,
            raw_input=text_clean,
            is_malformed=False,
            malformed_reason=None,
        )

    def classify_clause(
        self,
        base_text: str,
        inner_content: str,
    ) -> TypologyClassification:
        """Direct classification of an explicit (base_text, inner_content) pair."""
        return self._classify_clause(
            base_text=base_text.strip() if base_text else "",
            inner_content=inner_content.strip() if inner_content else "",
            raw_input=f"{base_text} ({inner_content})" if base_text else f"({inner_content})",
            is_malformed=False,
            malformed_reason=None,
        )

    # ─── DETERMINISTIC PRIORITY DECISION MATRIX ───────────────────────────────────
    def _classify_clause(
        self,
        base_text: str,
        inner_content: str,
        raw_input: str,
        is_malformed: bool,
        malformed_reason: Optional[str],
    ) -> TypologyClassification:
        """
        Internal implementation of the 8-step deterministic priority decision matrix:
          Step 1: Empty or Noise
          Step 2: Regulatory Form (Statutory numbers / forms)
          Step 3: Acronym Expansion (Verified via AcronymResolver)
          Step 4: Level or Experience Duration
          Step 5: Category Container (Generic tool header decomposing to children)
          Step 6: Industry Context (Closed domain / subcategory / sector)
          Step 7: Version or Technical Detail
          Step 8: Sub-skill Specification (Default fallthrough)
        """
        inner_clean = inner_content.strip()
        base_clean = base_text.strip()

        # ── Step 1: Empty or Noise Check ──────────────────────────────────────
        if not inner_clean or inner_clean.lower() in {"etc", "etc.", "e.g.", "ie", "i.e."}:
            return TypologyClassification(
                typology=ParenthesisTypology.EMPTY_OR_NOISE,
                raw_content=inner_clean,
                base_text=base_clean,
                cleaned_base_skill=base_clean,
                is_malformed=is_malformed,
                malformed_reason=malformed_reason,
                raw_input=raw_input,
            )

        # ── Step 2: Egyptian / Regulatory Form Check ──────────────────────────
        if self.REGULATORY_FORM_PATTERN.match(inner_clean):
            return TypologyClassification(
                typology=ParenthesisTypology.REGULATORY_FORM,
                raw_content=inner_clean,
                base_text=base_clean,
                cleaned_base_skill=base_clean,
                is_regulatory_form=True,
                is_malformed=is_malformed,
                malformed_reason=malformed_reason,
                raw_input=raw_input,
            )

        # ── Step 3: Acronym Expansion Check (Principle 2) ─────────────────────
        # Must be verified against AcronymResolver dictionary, not naive letter guessing
        acronym_res = self._check_acronym_expansion(base_clean, inner_clean)
        if acronym_res is not None:
            acronym_tok, expanded_tok, canonical_name = acronym_res
            return TypologyClassification(
                typology=ParenthesisTypology.ACRONYM_EXPANSION,
                raw_content=inner_clean,
                base_text=base_clean,
                cleaned_base_skill=canonical_name or base_clean,
                acronym_token=acronym_tok,
                expanded_token=expanded_tok,
                canonical_skill_name=canonical_name,
                is_malformed=is_malformed,
                malformed_reason=malformed_reason,
                raw_input=raw_input,
            )

        # ── Step 4: Level or Experience Duration Check ────────────────────────
        # 4a. Experience Duration
        dur_match = self.EXPERIENCE_DURATION_PATTERN.match(inner_clean)
        if dur_match:
            duration_val = dur_match.group(1).strip()
            cleaned_base = self._clean_experience_suffix(base_clean)
            return TypologyClassification(
                typology=ParenthesisTypology.LEVEL_OR_EXPERIENCE,
                raw_content=inner_clean,
                base_text=base_clean,
                cleaned_base_skill=cleaned_base,
                extracted_duration=duration_val,
                is_malformed=is_malformed,
                malformed_reason=malformed_reason,
                raw_input=raw_input,
            )

        # 4b. Proficiency Level Modifier
        level_val = self._match_level_modifier(inner_clean)
        if level_val is not None:
            return TypologyClassification(
                typology=ParenthesisTypology.LEVEL_OR_EXPERIENCE,
                raw_content=inner_clean,
                base_text=base_clean,
                cleaned_base_skill=base_clean,
                extracted_level=inner_clean,  # Verbatim extraction per Spec v3!
                is_malformed=is_malformed,
                malformed_reason=malformed_reason,
                raw_input=raw_input,
            )

        # ── Step 5: Category Container Check ──────────────────────────────────
        container_tokens = self._check_category_container(base_clean, inner_clean)
        if container_tokens is not None:
            return TypologyClassification(
                typology=ParenthesisTypology.CATEGORY_CONTAINER,
                raw_content=inner_clean,
                base_text=base_clean,
                cleaned_base_skill=base_clean,
                category_container=base_clean,
                leaf_tokens=container_tokens,
                is_malformed=is_malformed,
                malformed_reason=malformed_reason,
                raw_input=raw_input,
            )

        # ── Step 6: Industry Context Check ────────────────────────────────────
        if self._is_industry_context(base_clean, inner_clean):
            cleaned_base = self._clean_experience_suffix(base_clean)
            return TypologyClassification(
                typology=ParenthesisTypology.INDUSTRY_CONTEXT,
                raw_content=inner_clean,
                base_text=base_clean,
                cleaned_base_skill=cleaned_base,
                industry_context=inner_clean,
                is_malformed=is_malformed,
                malformed_reason=malformed_reason,
                raw_input=raw_input,
            )

        # ── Step 7: Version or Technical Detail Check ─────────────────────────
        if self.VERSION_DETAIL_PATTERN.match(inner_clean):
            return TypologyClassification(
                typology=ParenthesisTypology.VERSION_OR_TECH_DETAIL,
                raw_content=inner_clean,
                base_text=base_clean,
                cleaned_base_skill=base_clean,
                sub_skills=[inner_clean],
                is_malformed=is_malformed,
                malformed_reason=malformed_reason,
                raw_input=raw_input,
            )

        # ── Step 8: Default Sub-skill Specification ───────────────────────────
        sub_skills = self._split_specification_tokens(inner_clean)
        return TypologyClassification(
            typology=ParenthesisTypology.SUB_SKILL_SPECIFICATION,
            raw_content=inner_clean,
            base_text=base_clean,
            cleaned_base_skill=base_clean,
            sub_skills=sub_skills,
            is_malformed=is_malformed,
            malformed_reason=malformed_reason,
            raw_input=raw_input,
        )

    # ─── HELPER METHODS ───────────────────────────────────────────────────────────
    def _strip_spans(self, text: str, spans: List[ParenthesisSpan]) -> str:
        """Removes parenthetical span ranges from text and collapses excess whitespace."""
        chars = list(text)
        for s in spans:
            for idx in range(s.start_index, min(s.end_index, len(chars))):
                chars[idx] = " "
        cleaned = "".join(chars)
        return re.sub(r"\s+", " ", cleaned).strip()

    def _check_acronym_expansion(
        self, base: str, inner: str
    ) -> Optional[Tuple[str, str, Optional[str]]]:
        """
        Verifies whether (base, inner) forms an acronym expansion pair.
        Returns (acronym_token, expanded_token, canonical_name) or None.
        Relies strictly on AcronymResolver.
        """
        if not base or not inner:
            return None

        # Check if they form an acronym expansion pair
        if self.acronym_resolver.is_acronym_expansion_pair(base, inner):
            entry_inner = self.acronym_resolver.get_acronym(inner)
            entry_base = self.acronym_resolver.get_acronym(base)
            if entry_inner and not entry_base:
                # inner is the acronym: e.g. "Amazon Web Services (AWS)"
                return (inner, base, entry_inner.canonical_skill_name)
            elif entry_base and not entry_inner:
                # base is the acronym: e.g. "GTM (Google Tag Manager)"
                return (base, inner, entry_base.canonical_skill_name)
            elif len(inner) <= len(base):
                canon = (entry_inner or entry_base).canonical_skill_name if (entry_inner or entry_base) else None
                return (inner, base, canon)
            else:
                canon = (entry_base or entry_inner).canonical_skill_name if (entry_base or entry_inner) else None
                return (base, inner, canon)

        # 3. Direct dictionary check: inner is acronym whose full name or canonical matches base
        entry_inner = self.acronym_resolver.get_acronym(inner)
        if entry_inner:
            inner_full = entry_inner.full_name.strip().lower()
            inner_canon = entry_inner.canonical_skill_name.strip().lower()
            base_lower = base.lower()
            if base_lower == inner_full or base_lower == inner_canon or base_lower in inner_full:
                return (inner, base, entry_inner.canonical_skill_name)

        # 4. Direct dictionary check: base is acronym whose full name or canonical matches inner
        entry_base = self.acronym_resolver.get_acronym(base)
        if entry_base:
            base_full = entry_base.full_name.strip().lower()
            base_canon = entry_base.canonical_skill_name.strip().lower()
            inner_lower = inner.lower()
            if inner_lower == base_full or inner_lower == base_canon or inner_lower in base_full:
                return (base, inner, entry_base.canonical_skill_name)

        return None

    def _match_level_modifier(self, text: str) -> Optional[str]:
        """Checks if text matches any governed skill level modifier."""
        for level_name, pat in self.LEVEL_PATTERNS:
            if pat.match(text):
                return level_name
        return None

    def _check_category_container(
        self, base: str, inner: str
    ) -> Optional[List[str]]:
        """
        Detects if base is a generic category container (e.g. 'Development Tools')
        and inner contains multiple leaf items (e.g. 'Git, Jira').
        """
        if not base or not inner:
            return None

        base_lower = base.lower()
        # Check if base contains a container keyword
        is_container_header = any(
            re.search(rf"\b{re.escape(kw)}\b", base_lower)
            for kw in self.CONTAINER_BASE_KEYWORDS
        )

        if not is_container_header:
            return None

        # Split inner into potential child tokens
        tokens = [t.strip() for t in re.split(r"[,;/]|\band\b|\bor\b", inner, flags=re.IGNORECASE) if t.strip()]

        # Must have at least 1 distinct leaf token
        if tokens:
            return tokens

        return None

    def _is_industry_context(self, base: str, inner: str) -> bool:
        """Determines if inner_content represents an industry sector or domain context."""
        if not inner:
            return False

        inner_lower = inner.lower().strip()

        # Direct match in industry lookup (domains, subcategories, additional sectors)
        if inner_lower in self._industry_lookup:
            return True

        # Check for sector slash e.g. "Hospitality/Leisure"
        parts = [p.strip() for p in re.split(r"[/,&]", inner_lower) if p.strip()]
        if any(p in self._industry_lookup for p in parts):
            return True

        # Check if base ends with experience suffix (e.g. "Sales Experience")
        base_lower = base.lower()
        has_exp_suffix = any(
            base_lower.endswith(sfx) for sfx in self.EXPERIENCE_SUFFIXES
        )

        if has_exp_suffix:
            # If base indicates experience/field, inner is strongly biased toward industry/specialty
            return True

        return False

    def _clean_experience_suffix(self, base: str) -> str:
        """Strips redundant trailing experience suffixes: 'Sales Experience' -> 'Sales'."""
        if not base:
            return ""
        cleaned = re.sub(
            r"\s+(?:experience|background|sector|industry|field|knowledge|خبرة|مجال|قطاع)\s*$",
            "",
            base,
            flags=re.IGNORECASE,
        ).strip()
        return cleaned or base

    def _split_specification_tokens(self, inner: str) -> List[str]:
        """Splits sub-skill specifications into logical parts if delimited, or retains as single."""
        if not inner:
            return []
        tokens = [t.strip() for t in re.split(r"[,;]|\b(?:and|or)\b", inner, flags=re.IGNORECASE) if t.strip()]
        return tokens if len(tokens) > 1 else [inner.strip()]
