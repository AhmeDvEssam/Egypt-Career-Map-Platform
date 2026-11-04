"""
Linguistic Intelligence — Pass 2 Parentheses Typology Engine
============================================================
Deterministic 5-way parenthetical classification engine.
Classifies parentheses content into:
  1. LEVEL_OR_EXPERIENCE: Proficiency level (sourced from M1 Level Matrix) or experience duration
  2. ACRONYM_EXPANSION: Acronym vs full name resolution via AcronymResolver (Dictionary-Verified Only)
  3. CATEGORY_CONTAINER: Generic tool/technology container decomposing to compound-shielded leaf skills
  4. INDUSTRY_CONTEXT: Sector or domain restrictions mapped to Sidecar metadata
  5. SUB_SKILL_SPECIFICATION: Domain sub-specialties and module specifications
Plus edge-case handlers for:
  - REGULATORY_FORM: Egyptian/international statutory forms (e.g. Forms 1, 2, 6)
  - VERSION_OR_TECH_DETAIL: Software versioning (e.g. v14+, 3.x)
  - EMPTY_OR_NOISE: Empty parens '()' or meaningless filler
  - MALFORMED: Linear O(n) detection of unclosed, unopened, or oversized parentheses

CRITICAL ARCHITECTURAL PRINCIPLES:
1. Strictly separates classification from Sidecar data persistence.
2. Clean data structures: Zero circular references (fully serializable via dataclasses.asdict).
3. Protected compounds (PL/SQL, CI/CD, UI/UX, C/C++, etc.) are shielded prior to delimiter splitting.
4. Delimiter splitting on '/' works with or without whitespace while compounds remain protected.
5. Acronym resolution is strictly Dictionary-Verified (zero unverified letter guessing).
6. Skill levels are sourced directly from M1 standard_skill_levels_matrix.csv via CatalogLoader.
7. Both verbatim extracted level and canonical governed level are populated.
8. Industry context requires actual sector verification (no false positives from 'Experience' suffix).
9. Linear O(n) algorithmic parser with safe boundary guards (no silent truncation).
10. Multi-parenthesis inputs supported via classify_all().
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
    LevelMatrixEntry,
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
    Completely non-circular: guaranteed 100% serializable via dataclasses.asdict and json.
    """
    typology: ParenthesisTypology
    raw_content: str
    base_text: str
    cleaned_base_skill: str
    extracted_level: Optional[str] = None
    canonical_level: Optional[str] = None
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
    span_index: int = 0
    total_spans: int = 1

    def to_dict(self) -> Dict[str, Any]:
        """Converts classification result to a standard dictionary without circular references."""
        return {
            "typology": self.typology.value,
            "raw_content": self.raw_content,
            "base_text": self.base_text,
            "cleaned_base_skill": self.cleaned_base_skill,
            "extracted_level": self.extracted_level,
            "canonical_level": self.canonical_level,
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
            "span_index": self.span_index,
            "total_spans": self.total_spans,
        }


class ParenthesesTypologyEngine:
    """
    Pass 2 Parentheses Typology Engine:
    Classifies parenthetical expressions using linear O(n) algorithmic parsing,
    strict length boundaries, protected compound shielding, and dynamic level matrix sourcing.
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

    # ─── 4. CATEGORY CONTAINER KEYWORDS ───────────────────────────────────────────
    CONTAINER_BASE_KEYWORDS: Set[str] = {
        "tools", "development tools", "ai tools", "ai development tools",
        "software", "technologies", "tech stack", "stack", "platforms",
        "languages", "programming languages", "frameworks", "libraries",
        "databases", "relational databases", "operating systems", "servers",
        "programs", "office programs", "skills", "concepts", "applications",
        "systems", "services", "protocols", "utilities", "methods", "techniques",
        "أدوات", "برامج", "لغات برمجة", "تقنيات", "أنظمة", "قواعد بيانات", "مهارات",
    }

    # ─── 5. INDUSTRY SECTORS & CONTEXTS ───────────────────────────────────────────
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

    # Experience indicator suffixes in base_text (used to clean base skill when inner IS an industry)
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

        # Load level matrix rows directly from M1 CatalogLoader (Single Source of Truth)
        self.level_matrix_rows: List[LevelMatrixEntry] = [
            row for row in self.catalog.get_level_matrix_rows()
            if row.standard_level != LEVEL_NOT_SPECIFIED and (row.compiled_pattern or row.compiled_arabic_regex)
        ]

        # Protected compounds for safe splitting (reused from M1 ProperNounShield)
        self.protected_compounds: Set[str] = set(self.proper_noun_shield.PROTECTED_COMPOUNDS)
        self.protected_compounds.add("fp&a")

    # ─── LINEAR O(n) PARENTHESES SCANNER ──────────────────────────────────────────
    def parse_spans(self, text: str) -> List[ParenthesisSpan]:
        """
        Parses all top-level parenthetical spans in text using a linear O(n) stack.
        Correctly balances nested parentheses and detects unclosed/unopened clauses.
        Safe against excessive length without silent truncation.
        """
        if not text or not isinstance(text, str):
            return []

        # Safe length guard: do NOT silently truncate. Flag as malformed if oversized.
        if len(text) > self.MAX_INPUT_LENGTH:
            return [
                ParenthesisSpan(
                    start_index=0,
                    end_index=len(text),
                    raw_clause="",
                    inner_content="",
                    depth=0,
                    is_malformed=True,
                    malformed_reason=f"Input length ({len(text)}) exceeds maximum safe limit ({self.MAX_INPUT_LENGTH})",
                )
            ]

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

    # ─── COMPOUND-SHIELDED TOKEN SPLITTER ─────────────────────────────────────────
    def split_tokens_safely(self, text: str) -> List[str]:
        """
        Splits delimited tokens (by , ; | / and or و) while strictly shielding
        protected compounds (PL/SQL, CI/CD, UI/UX, C/C++, R&D, P&L, FP&A, TCP/IP, etc.).
        Handles '/' with or without surrounding whitespace (e.g. Java/Python and Java / Python)
        while ensuring PL/SQL and CI/CD remain 100% shielded as single items.
        """
        if not text or not isinstance(text, str):
            return []

        masked_text = text
        placeholder_map: Dict[str, str] = {}
        counter = 0

        # Sort compounds by length descending to match longest first (e.g. c/c++ before c)
        compounds = sorted(self.protected_compounds, key=len, reverse=True)
        for comp in compounds:
            pattern = rf"(?<![a-zA-Z0-9_]){re.escape(comp)}(?![a-zA-Z0-9_])"
            matches = list(re.finditer(pattern, masked_text, flags=re.IGNORECASE))
            for m in reversed(matches):
                placeholder = f"__PROTECTED_COMPOUND_{counter}__"
                original_substr = m.group(0)
                placeholder_map[placeholder] = original_substr
                masked_text = masked_text[: m.start()] + placeholder + masked_text[m.end() :]
                counter += 1

        # Split on standard delimiters: comma, semicolon, pipe, slash (with/without space), and, or, Arabic و
        raw_tokens = re.split(r"[,;|]|\s*/\s*|\band\b|\bor\b|\s+و\s+", masked_text, flags=re.IGNORECASE)

        # Restore shielded compound placeholders
        clean_tokens: List[str] = []
        for tok in raw_tokens:
            t = tok.strip()
            if not t:
                continue
            for ph, orig in placeholder_map.items():
                t = t.replace(ph, orig)
            t = t.strip()
            if t:
                clean_tokens.append(t)

        return clean_tokens

    # ─── PRIMARY CLASSIFICATION INTERFACES ────────────────────────────────────────
    def classify(self, text: str) -> TypologyClassification:
        """
        Classifies parenthetical content from a single skill string.
        For strings with multiple parentheses, returns the primary (first) classification.
        Guaranteed non-circular: fully serializable via dataclasses.asdict and json.
        To retrieve all individual classifications independently, call classify_all().
        """
        all_res = self.classify_all(text)
        return all_res[0]

    def classify_all(self, text: str) -> List[TypologyClassification]:
        """
        Extracts and classifies ALL parenthetical clauses in text independently.
        For 'Python (Advanced) & Docker (Intermediate)', returns 2 distinct classifications:
          1. base='Python', level='Advanced', canonical_level='Advanced'
          2. base='Docker', level='Intermediate', canonical_level='Intermediate'
        Each returned object is independent with zero circular references.
        """
        if not text or not isinstance(text, str) or not text.strip():
            return [
                TypologyClassification(
                    typology=ParenthesisTypology.NONE,
                    raw_content="",
                    base_text="",
                    cleaned_base_skill="",
                    raw_input=text or "",
                )
            ]

        # Guard against oversized inputs without silent truncation
        if len(text) > self.MAX_INPUT_LENGTH:
            return [
                TypologyClassification(
                    typology=ParenthesisTypology.MALFORMED,
                    raw_content="",
                    base_text="",
                    cleaned_base_skill="",
                    is_malformed=True,
                    malformed_reason=f"Input length ({len(text)}) exceeds maximum safe limit ({self.MAX_INPUT_LENGTH})",
                    raw_input=text,
                )
            ]

        text_clean = text.strip()
        spans = self.parse_spans(text_clean)

        if not spans:
            return [
                TypologyClassification(
                    typology=ParenthesisTypology.NONE,
                    raw_content="",
                    base_text=text_clean,
                    cleaned_base_skill=text_clean,
                    raw_input=text_clean,
                )
            ]

        results: List[TypologyClassification] = []
        num_spans = len(spans)

        for idx, span in enumerate(spans):
            if span.is_malformed:
                base = text_clean[: span.start_index].strip()
                if not base:
                    base = text_clean[span.end_index :].strip()
                results.append(
                    self._classify_clause(
                        base_text=base or text_clean,
                        inner_content=span.inner_content,
                        raw_input=text_clean,
                        is_malformed=True,
                        malformed_reason=span.malformed_reason,
                        span_index=idx,
                        total_spans=num_spans,
                    )
                )
                continue

            # Contextual base text for this specific span
            prev_end = spans[idx - 1].end_index if idx > 0 else 0
            local_context = text_clean[prev_end : span.start_index].strip()
            # Clean leading/trailing conjunctions (&, /, and, or)
            local_base = re.sub(r"^[\s,;&/]+|\b(?:and|or)\b[\s]*", "", local_context, flags=re.IGNORECASE).strip()
            local_base = re.sub(r"[\s,;&/]+$", "", local_base).strip()

            if not local_base:
                local_base = self._strip_spans(text_clean, spans)

            results.append(
                self._classify_clause(
                    base_text=local_base,
                    inner_content=span.inner_content,
                    raw_input=text_clean,
                    is_malformed=False,
                    malformed_reason=None,
                    span_index=idx,
                    total_spans=num_spans,
                )
            )

        return results

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
        span_index: int = 0,
        total_spans: int = 1,
    ) -> TypologyClassification:
        """
        Internal implementation of the 8-step deterministic priority decision matrix:
          Step 1: Empty or Noise
          Step 2: Regulatory Form (Statutory numbers / forms)
          Step 3: Acronym Expansion (Strictly Dictionary-Verified via AcronymResolver)
          Step 4: Level or Experience Duration (Directly sourced from M1 Level Matrix)
          Step 5: Category Container (Generic tool header decomposing to shielded leaf items)
          Step 6: Industry Context (Strictly verified against industry lookup / sector terms)
          Step 7: Version or Technical Detail
          Step 8: Sub-skill Specification (Default fallthrough with compound shielding)
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
                span_index=span_index,
                total_spans=total_spans,
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
                span_index=span_index,
                total_spans=total_spans,
            )

        # ── Step 3: Acronym Expansion Check (Strict Dictionary-Verified Only) ──
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
                span_index=span_index,
                total_spans=total_spans,
            )

        # ── Step 4: Level or Experience Duration Check (M1 Level Matrix) ──────
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
                span_index=span_index,
                total_spans=total_spans,
            )

        # 4b. Governed Proficiency Level Modifier from M1 Matrix
        level_val = self._match_level_modifier(inner_clean)
        if level_val is not None:
            return TypologyClassification(
                typology=ParenthesisTypology.LEVEL_OR_EXPERIENCE,
                raw_content=inner_clean,
                base_text=base_clean,
                cleaned_base_skill=base_clean,
                extracted_level=inner_clean,     # Exact verbatim original text per Spec v3!
                canonical_level=level_val,       # Governed canonical standard level from matrix!
                is_malformed=is_malformed,
                malformed_reason=malformed_reason,
                raw_input=raw_input,
                span_index=span_index,
                total_spans=total_spans,
            )

        # ── Step 5: Category Container Check (Compound-Shielded) ──────────────
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
                span_index=span_index,
                total_spans=total_spans,
            )

        # ── Step 6: Industry Context Check (Strict Industry Lookup) ───────────
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
                span_index=span_index,
                total_spans=total_spans,
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
                span_index=span_index,
                total_spans=total_spans,
            )

        # ── Step 8: Default Sub-skill Specification (Compound-Shielded) ───────
        sub_skills = self.split_tokens_safely(inner_clean)
        return TypologyClassification(
            typology=ParenthesisTypology.SUB_SKILL_SPECIFICATION,
            raw_content=inner_clean,
            base_text=base_clean,
            cleaned_base_skill=base_clean,
            sub_skills=sub_skills if sub_skills else [inner_clean],
            is_malformed=is_malformed,
            malformed_reason=malformed_reason,
            raw_input=raw_input,
            span_index=span_index,
            total_spans=total_spans,
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
        STRICT POLICY: Dictionary-Verified Only via skills_acronym_dictionary.json.
        Zero algorithmic letter guessing. Exact normalized string matching (no loose substring).
        """
        if not base or not inner:
            return None

        base_clean = base.strip()
        inner_clean = inner.strip()
        base_lower = base_clean.lower()
        inner_lower = inner_clean.lower()

        # 1. Inner is verified acronym in dictionary
        entry_inner = self.acronym_resolver.get_acronym(inner_clean)
        if entry_inner:
            full_clean = re.sub(r"\s*\([^)]*\)\s*$", "", entry_inner.full_name).strip().lower()
            canon_clean = re.sub(r"\s*\([^)]*\)\s*$", "", entry_inner.canonical_skill_name).strip().lower()
            if base_lower == full_clean or base_lower == canon_clean:
                return (entry_inner.acronym, base_clean, entry_inner.canonical_skill_name)

        # 2. Base is verified acronym in dictionary
        entry_base = self.acronym_resolver.get_acronym(base_clean)
        if entry_base:
            full_clean = re.sub(r"\s*\([^)]*\)\s*$", "", entry_base.full_name).strip().lower()
            canon_clean = re.sub(r"\s*\([^)]*\)\s*$", "", entry_base.canonical_skill_name).strip().lower()
            if inner_lower == full_clean or inner_lower == canon_clean:
                return (entry_base.acronym, inner_clean, entry_base.canonical_skill_name)

        # If neither is in the verified dictionary with exact normalized expansion match, reject
        return None

    def _match_level_modifier(self, text: str) -> Optional[str]:
        """
        Checks if text matches any governed skill level modifier
        sourced directly from standard_skill_levels_matrix.csv via CatalogLoader.
        Applies word boundary and standalone token constraints so that words inside
        longer sub-skill phrases are not falsely extracted as pure level modifiers.
        """
        if not text:
            return None
        text_clean = text.strip()

        # A level modifier in parens is typically a standalone descriptor (<= 3 words)
        words = text_clean.split()
        if len(words) > 3:
            return None

        for row in self.level_matrix_rows:
            if row.compiled_pattern:
                m = row.compiled_pattern.search(text_clean)
                if m:
                    # Matched string must cover the whole token or represent the core modifier
                    matched_str = m.group(0).strip().lower()
                    if matched_str == text_clean.lower() or len(words) <= 2:
                        return row.standard_level
            if row.compiled_arabic_regex:
                m_ar = row.compiled_arabic_regex.search(text_clean)
                if m_ar:
                    return row.standard_level
        return None

    def _check_category_container(
        self, base: str, inner: str
    ) -> Optional[List[str]]:
        """
        Detects if base is a generic category container (e.g. 'Development Tools')
        and inner contains leaf items, shielding protected compounds (PL/SQL, CI/CD).
        """
        if not base or not inner:
            return None

        base_lower = base.lower()
        is_container_header = any(
            re.search(rf"\b{re.escape(kw)}\b", base_lower)
            for kw in self.CONTAINER_BASE_KEYWORDS
        )

        if not is_container_header:
            return None

        # Split inner tokens with compound shielding
        tokens = self.split_tokens_safely(inner)
        if tokens:
            return tokens

        return None

    def _is_industry_context(self, base: str, inner: str) -> bool:
        """
        Determines if inner_content represents a verified industry sector or domain context.
        STRICT POLICY: Requires actual industry verification. The mere presence of an
        'Experience' suffix on the base skill does NOT automatically make arbitrary content
        an industry context.
        """
        if not inner:
            return False

        inner_lower = inner.lower().strip()

        # 1. Direct match in industry lookup (closed domains, subcategories, additional sectors)
        if inner_lower in self._industry_lookup:
            return True

        # 2. Check for sector slash e.g. "Hospitality/Leisure"
        parts = [p.strip() for p in re.split(r"[/,&]", inner_lower) if p.strip()]
        if len(parts) > 1 and any(p in self._industry_lookup for p in parts):
            return True

        # 3. Check for explicit sector/industry qualifier keywords
        if re.search(r"\b(?:sector|industry|field|قطاع|صناعة)\b", inner_lower):
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
