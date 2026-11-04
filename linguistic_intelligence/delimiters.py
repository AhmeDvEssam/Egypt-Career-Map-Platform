"""
Hierarchical Delimiter Splitting & Context Graph Engine (Milestone 2 - Phase 2.2)
================================================================================
Project: Egypt Career Map (egypt_jobs_db)
Taxonomy: 14 Closed Domains | 61 Closed Subcategories | 6 Permitted Match Statuses
Governance: Master Skill Level Governance & Audit Specification v3

STRICT CONTRACT:
- Zero mutations to database (localhost:5432/egypt_jobs_db is strictly READ-ONLY).
- Compound Shielding: Never fragment protected compounds (PL/SQL, CI/CD, UI/UX, AI/ML,
  C/C++, R&D, P&L, FP&A, TCP/IP, ETL/ELT, etc.) or multi-word catalog skills containing delimiters.
- Delimiter Hierarchy:
    Tier 1 (Hard): ; , newline (\r, \n), bullet (•, \u2022, *), pipe (|), tab (\t)
    Tier 2 (Comma): , (western comma), ، (Arabic comma \u060c)
    Tier 3 (Soft): & , / , word 'and', word 'or', isolated Arabic 'و', hyphen '-' with spaces
- Sequential Context Preservation (Graph Provenance):
    Each atomic skill record preserves:
      - separated_by: Delimiter token causing the split
      - separated_from_before: Immediately preceding atomic skill
      - separated_from_after: Immediately succeeding atomic skill
- Data Integrity:
    - Never split on mere whitespace.
    - Never drop unmatched skills (novel skills receive UNMATCHED_NOVEL).
    - Linear O(n) performance: safe regexes, bounded execution well under 50ms.
    - Zero data loss: oversized inputs are never truncated.
    - Malformed input safety: unbalanced parentheses are detected and preserved without corrupting split.
    - 100% collision-proof dynamic sentinels for shielding.
"""

from __future__ import annotations

import re
import uuid
from dataclasses import dataclass, field
from enum import IntEnum
from typing import Any, Dict, List, Optional, Set, Tuple, Union

from linguistic_intelligence.catalog import CatalogLoader
from linguistic_intelligence.proper_nouns import AcronymResolver, ProperNounShield


class DelimiterTier(IntEnum):
    """Delimiter hierarchy levels per Master Specification v3."""
    NONE = 0
    HARD = 1   # ; , \n, \r, •, |, *, \t
    COMMA = 2  # ,, ،
    SOFT = 3   # &, /, and, or, -, +, و


@dataclass
class SplitToken:
    """
    Represents an atomic skill segment resulting from hierarchical delimiter splitting.
    Tracks exact sequential context and delimiter provenance.
    """
    atomic_skill: str                   # Cleaned, whitespace-normalized token text
    raw_token: str                      # Verbatim extracted token text
    separated_by: str                   # The delimiter token that split this item ("" if single)
    separated_from_before: str          # Adjacent atomic token before this token ("" if first)
    separated_from_after: str           # Adjacent atomic token after this token ("" if last)
    hierarchy_level: int                # 1=Hard, 2=Comma, 3=Soft, 0=None
    span_index: int = 0                 # 0-based index of this token in decomposition
    total_tokens: int = 1               # Total count of tokens from this decomposition
    is_compound_shielded: bool = False  # True if token contains or is a shielded compound
    is_oversized: bool = False          # True if token exceeded maximum input length limit
    is_malformed: bool = False          # True if token has malformed syntax (e.g. unbalanced parens)
    malformed_reason: Optional[str] = None  # Description of why token is malformed

    def to_dict(self) -> Dict[str, Any]:
        """Returns JSON-serializable dictionary representation with zero circular references."""
        return {
            "atomic_skill": self.atomic_skill,
            "raw_token": self.raw_token,
            "separated_by": self.separated_by,
            "separated_from_before": self.separated_from_before,
            "separated_from_after": self.separated_from_after,
            "hierarchy_level": self.hierarchy_level,
            "span_index": self.span_index,
            "total_tokens": self.total_tokens,
            "is_compound_shielded": self.is_compound_shielded,
            "is_oversized": self.is_oversized,
            "is_malformed": self.is_malformed,
            "malformed_reason": self.malformed_reason,
        }


class HierarchicalDelimiterSplitter:
    """
    Hierarchical Delimiter Splitting & Context Graph Engine:
    Decomposes composite skill strings into atomic skills while strictly shielding
    protected compounds, catalog phrases, and parenthetical blocks.
    """

    MAX_INPUT_LENGTH: int = 20_000

    # ─── 1. PROTECTED COMPOUNDS REGISTRY ──────────────────────────────────────────
    # Slash and ampersand technical/business acronyms and domain phrases that must NEVER be split.
    PROTECTED_COMPOUNDS: Set[str] = {
        # Core Technical Compounds
        "pl/sql", "ci/cd", "ui/ux", "ai/ml", "c/c++", "r&d", "p&l", "fp&a",
        "tcp/ip", "etl/elt", "i/o", "pr/po", "qa/qc", "hvac/r", "ar/vr",
        "b2b/b2c", "saas/paas", "devops/mlops", "olap/oltp", "lan/wan",
        "cad/cam", "bi/dw", "erp/crm", "saas/iaas", "paas/iaas", "gui/cli",
        "client/server", "frontend/backend", "b2b/b2g", "b2c/d2c",
        "pos/inventory", "sla/slo", "kpi/okr", "iso/iec", "p&id", "w&b",
        "gmp/iso", "cpa/cpc", "aml/cft", "gcp/aws", "fi/co", "ckad/cka",
        "bpmn/uml", "cipp/m", "rtl/ltr", "obp/obma", "cdb/pdb", "cipp/e",
        "bmp/jpg", "poa&m", "m&e", "s&op", "f&b", "e2e", "p2p",
        # Language & Framework Specifics
        "c++", "c#", ".net", "node.js", "vue.js", "react.js", "next.js",
        "nest.js", "express.js", "three.js", "angular.js", "asp.net", "vb.net",
        # Multi-word Catalog / Technical Phrases containing Soft Delimiters
        "search and recommendation systems",
        "sales and operations planning",
        "research and development",
        "planning and control",
    }

    # ─── 2. HIERARCHICAL DELIMITER REGEX PATTERNS ─────────────────────────────────
    # Tier 1: Hard Separators (;, Arabic semicolon \u061b, newlines, bullets, pipes, tabs, standalone asterisks)
    HARD_DELIMITER_PATTERN: re.Pattern = re.compile(
        r"[\r\n]+|[;\u061b\t|•\u2022\u25cf\u25e6\u2219]+|(?<=\s)\*(?=\s)"
    )

    # Tier 2: Commas (Western comma, Arabic comma \u060c, including optional attached conjunctions ', and' or '، و')
    COMMA_DELIMITER_PATTERN: re.Pattern = re.compile(
        r"[,،](?:\s*و|\s*and\b)?"
    )

    # Tier 3: Soft Separators (&, /, and, or, -, +, isolated Arabic waw)
    SOFT_DELIMITER_PATTERN: re.Pattern = re.compile(
        r"(?:\s+&\s+|\s*&\s*|\s+/\s+|\b/\b|\b(?:and|or)\b|(?<=\s)و(?=\s)|(?<=[,،])\s*و\s*|\s+[\-\–\—]\s+|\s+\+\s+)",
        re.IGNORECASE,
    )

    # Delimiter intersection pattern for detecting catalog skills requiring shielding
    DELIMITER_INTERSECT_PATTERN: re.Pattern = re.compile(
        r"([&/+\t|•*;,،]|\s+[\-\–\—]\s+|\b(?:and|or)\b|(?<=\s)و(?=\s)|\bأو\b)",
        re.IGNORECASE,
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

        # Build set of protected phrases (compounds, acronyms, catalog skills intersecting delimiters)
        self.protected_phrases: Set[str] = set()
        for c in self.PROTECTED_COMPOUNDS:
            self.protected_phrases.add(c.lower())
        for c in self.proper_noun_shield.PROTECTED_COMPOUNDS:
            self.protected_phrases.add(c.lower())

        # BLOCKER 3: Dynamically protect all catalog skills and aliases intersecting ANY delimiter
        for row in self.catalog.all_entries:
            name = row.standard_skill_name.strip()
            name_lower = name.lower()
            if self.DELIMITER_INTERSECT_PATTERN.search(name):
                self.protected_phrases.add(name_lower)
            for alias in row.known_aliases:
                alias_clean = alias.strip()
                alias_lower = alias_clean.lower()
                if self.DELIMITER_INTERSECT_PATTERN.search(alias_clean):
                    self.protected_phrases.add(alias_lower)

        self._recompile_shield_regex()

    def register_protected_phrase(self, phrase: str) -> None:
        """Dynamically registers an additional protected phrase or catalog skill."""
        if not phrase or not isinstance(phrase, str):
            return
        p_clean = phrase.strip().lower()
        if p_clean and p_clean not in self.protected_phrases:
            self.protected_phrases.add(p_clean)
            self._recompile_shield_regex()

    def _recompile_shield_regex(self) -> None:
        """Pre-compiles multi-phrase regex for fast scanning (longest phrases first) with boundary safety."""
        sorted_phrases = sorted(self.protected_phrases, key=len, reverse=True)
        phrase_patterns: List[str] = []
        for p in sorted_phrases:
            escaped = re.escape(p)
            if re.match(r"^[\w\s]+$", p):
                phrase_patterns.append(rf"\b{escaped}\b")
            else:
                phrase_patterns.append(rf"(?<![\w/&]){escaped}(?![\w/&])")

        self._compiled_shield_regex = re.compile(
            "|".join(phrase_patterns), re.IGNORECASE
        )

    # ─── 3. SHIELDING & VALIDATION MECHANISMS ─────────────────────────────────────
    def check_parentheses_balance(self, text: str) -> Tuple[bool, Optional[str]]:
        """
        Validates that parentheses in text are strictly balanced and well-formed.
        Detects unclosed open parentheses, extra close parentheses, and malformed structures.
        Returns (is_balanced, malformed_reason).
        """
        if not text:
            return True, None
        stack: List[int] = []
        for i, ch in enumerate(text):
            if ch == "(":
                stack.append(i)
            elif ch == ")":
                if not stack:
                    return False, "UNBALANCED_EXTRA_CLOSE_PARENTHESIS"
                stack.pop()
        if stack:
            return False, "UNBALANCED_UNCLOSED_OPEN_PARENTHESIS"
        return True, None

    def mask_protected_spans(self, text: str) -> Tuple[str, Dict[str, str]]:
        """
        Masks top-level parenthetical blocks, protected compounds, and catalog phrases
        with collision-proof, dynamically salted sentinels so delimiter passes cannot fragment them.
        """
        if not text:
            return "", {}

        # BLOCKER 4: Generate dynamic salt guaranteed NOT to appear anywhere in input text
        salt_base = uuid.uuid4().hex[:12]
        salt = salt_base
        salt_counter = 0
        while salt in text:
            salt_counter += 1
            salt = f"{salt_base}_{salt_counter}"

        shield_map: Dict[str, str] = {}
        masked_text = text
        placeholder_idx = 0

        # Step A: Mask top-level parenthetical blocks
        # Balanced linear stack to find all top-level (...) spans
        paren_spans: List[Tuple[int, int]] = []
        stack: List[int] = []
        for i, ch in enumerate(masked_text):
            if ch == "(":
                stack.append(i)
            elif ch == ")" and stack:
                start = stack.pop()
                if not stack:  # Top-level span closed
                    paren_spans.append((start, i + 1))

        # Replace top-level parentheses in reverse order to preserve string indices
        for start, end in reversed(paren_spans):
            original = masked_text[start:end]
            placeholder = f"__SHIELD_{salt}_PAREN_{placeholder_idx}__"
            placeholder_idx += 1
            shield_map[placeholder] = original
            masked_text = masked_text[:start] + placeholder + masked_text[end:]

        # Step B: Mask protected compounds and phrases (longest matches first)
        def replace_compound(m: re.Match) -> str:
            nonlocal placeholder_idx
            matched_str = m.group(0)
            if matched_str.startswith("__SHIELD_"):
                return matched_str
            placeholder = f"__SHIELD_{salt}_COMP_{placeholder_idx}__"
            placeholder_idx += 1
            shield_map[placeholder] = matched_str
            return placeholder

        masked_text = self._compiled_shield_regex.sub(replace_compound, masked_text)

        return masked_text, shield_map

    def unmask_text(self, text: str, shield_map: Dict[str, str]) -> str:
        """Restores shielded placeholders to their verbatim original text."""
        if not text or not shield_map:
            return text
        result = text
        # Unmask in reverse insertion order
        for placeholder, original in reversed(list(shield_map.items())):
            result = result.replace(placeholder, original)
        return result

    # ─── 4. HIERARCHICAL SPLITTING ENGINE ─────────────────────────────────────────
    def split(self, text: str) -> List[SplitToken]:
        """
        Decomposes composite skill text into a list of atomic SplitToken objects
        following the 3-tier delimiter hierarchy while shielding protected spans.
        Enforces zero truncation and malformed syntax safety.
        """
        if not text or not isinstance(text, str) or not text.strip():
            return []

        text_clean = text.strip()

        # BLOCKER 1 GUARDRAIL: Strict zero-truncation on oversized input
        # Note: Oversized input is NOT malformed. It is a valid text that exceeds max processing limit.
        # raw_token preserves the verbatim input text as received (including all whitespace).
        if len(text_clean) > self.MAX_INPUT_LENGTH:
            return [
                SplitToken(
                    atomic_skill=text_clean,  # Cleaned, normalized skill text
                    raw_token=text,           # Verbatim input as received (zero character or whitespace loss)
                    separated_by="OVERSIZED_INPUT",
                    separated_from_before="",
                    separated_from_after="",
                    hierarchy_level=DelimiterTier.NONE,
                    span_index=0,
                    total_tokens=1,
                    is_compound_shielded=self.is_compound_protected(text_clean),
                    is_oversized=True,
                    is_malformed=False,       # Oversized is NOT malformed!
                    malformed_reason=None,
                )
            ]

        # BLOCKER 2 GUARDRAIL: Strict unbalanced / malformed parentheses detection
        # Malformed parentheses represent genuine syntax corruption.
        # raw_token preserves verbatim input text as received.
        is_balanced, malformed_reason = self.check_parentheses_balance(text_clean)
        if not is_balanced:
            return [
                SplitToken(
                    atomic_skill=text_clean,  # Retain entire text intact without corrupting split
                    raw_token=text,           # Verbatim input as received
                    separated_by=malformed_reason or "MALFORMED_PARENTHESES",
                    separated_from_before="",
                    separated_from_after="",
                    hierarchy_level=DelimiterTier.NONE,
                    span_index=0,
                    total_tokens=1,
                    is_compound_shielded=self.is_compound_protected(text_clean),
                    is_oversized=False,
                    is_malformed=True,        # Genuinely malformed syntax
                    malformed_reason=malformed_reason,
                )
            ]

        # 1. Mask protected spans (parentheses, compounds, catalog phrases)
        masked_text, shield_map = self.mask_protected_spans(text_clean)

        # 2. Hierarchical multi-tier decomposition
        # Tier 1 (Hard) -> Tier 2 (Comma) -> Tier 3 (Soft)
        raw_segments: List[Tuple[str, str, int]] = self._hierarchical_split(
            masked_text, tier=DelimiterTier.HARD
        )

        # 3. Clean segments and restore shielded placeholders
        tokens: List[Tuple[str, str, str, int]] = []
        for segment_text, delimiter_used, tier_used in raw_segments:
            # Unmask placeholder
            unmasked = self.unmask_text(segment_text, shield_map)
            cleaned = " ".join(unmasked.strip().split())
            # Clean leading/trailing punctuation leftover from split (except parentheses or +, #)
            cleaned = re.sub(r"^[\s,،;•|*&/\-]+", "", cleaned).strip()
            cleaned = re.sub(r"[\s,،;•|*&/\-]+$", "", cleaned).strip()

            if cleaned:
                tokens.append((cleaned, unmasked, delimiter_used, tier_used))

        if not tokens:
            return []

        # 4. Construct sequential context graph (separated_from_before / after)
        total_tokens = len(tokens)
        results: List[SplitToken] = []

        for idx, (cleaned_skill, raw_tok, delim, tier) in enumerate(tokens):
            before = tokens[idx - 1][0] if idx > 0 else ""
            after = tokens[idx + 1][0] if idx < total_tokens - 1 else ""

            # Standard separated_by convention:
            # If total_tokens == 1, separated_by is empty ("").
            # If total_tokens > 1, token records its separating delimiter.
            sep_by = delim if total_tokens > 1 else ""
            hier_lvl = tier if total_tokens > 1 else DelimiterTier.NONE
            # When text is a single atomic token, raw_token preserves verbatim input text as received
            actual_raw = text if total_tokens == 1 else raw_tok

            results.append(
                SplitToken(
                    atomic_skill=cleaned_skill,
                    raw_token=actual_raw,
                    separated_by=sep_by,
                    separated_from_before=before,
                    separated_from_after=after,
                    hierarchy_level=hier_lvl,
                    span_index=idx,
                    total_tokens=total_tokens,
                    is_compound_shielded=self.is_compound_protected(cleaned_skill),
                    is_oversized=False,
                    is_malformed=False,
                    malformed_reason=None,
                )
            )

        return results

    def _hierarchical_split(
        self, text: str, tier: DelimiterTier
    ) -> List[Tuple[str, str, int]]:
        """
        Recursive hierarchical split across Tier 1 (Hard), Tier 2 (Comma), Tier 3 (Soft).
        Returns list of (segment_text, delimiter_token, tier_level).
        """
        if tier > DelimiterTier.SOFT:
            return [(text, "", DelimiterTier.NONE)]

        # Select delimiter pattern for current tier
        if tier == DelimiterTier.HARD:
            pattern = self.HARD_DELIMITER_PATTERN
            next_tier = DelimiterTier.COMMA
        elif tier == DelimiterTier.COMMA:
            pattern = self.COMMA_DELIMITER_PATTERN
            next_tier = DelimiterTier.SOFT
        else:  # DelimiterTier.SOFT
            pattern = self.SOFT_DELIMITER_PATTERN
            next_tier = DelimiterTier.SOFT + 1

        matches = list(pattern.finditer(text))
        if not matches:
            # Current tier delimiter not found; descend to next tier
            return self._hierarchical_split(text, next_tier)

        # Delimiter found at current tier: split segments
        segments: List[Tuple[str, str, int]] = []
        last_end = 0

        for m in matches:
            segment = text[last_end:m.start()].strip()
            delim = m.group(0).strip()
            last_end = m.end()

            if segment:
                # Recurse sub-segment on next tier
                sub_segments = self._hierarchical_split(segment, next_tier)
                for sub_text, sub_delim, sub_tier in sub_segments:
                    # If sub-segment had an internal delimiter, keep it; otherwise assign current delimiter
                    final_delim = sub_delim if sub_delim else delim
                    final_tier = sub_tier if sub_tier != DelimiterTier.NONE else tier
                    segments.append((sub_text, final_delim, final_tier))

        # Tail segment after last delimiter
        tail = text[last_end:].strip()
        if tail:
            sub_tail = self._hierarchical_split(tail, next_tier)
            last_delim = matches[-1].group(0).strip()
            for sub_text, sub_delim, sub_tier in sub_tail:
                final_delim = sub_delim if sub_delim else last_delim
                final_tier = sub_tier if sub_tier != DelimiterTier.NONE else tier
                segments.append((sub_text, final_delim, final_tier))

        return segments

    # ─── 5. CONVENIENCE & INSPECTION METHODS ──────────────────────────────────────
    def split_tokens(self, text: str) -> List[str]:
        """Convenience method returning list of atomic skill strings."""
        return [t.atomic_skill for t in self.split(text)]

    def is_compound_protected(self, text: str) -> bool:
        """Checks whether text represents or contains a protected compound using token-aware boundary matching."""
        if not text or not isinstance(text, str):
            return False
        clean_lower = " ".join(text.strip().lower().split())
        if clean_lower in self.protected_phrases:
            return True
        return bool(self._compiled_shield_regex.search(clean_lower))
