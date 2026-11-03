"""
Linguistic Intelligence - Reference Catalog Engine (Feature 1 & 2)
==================================================================
Deterministic, multi-domain reference catalog engine for standard skills,
curated canonical domain homes, acronym dictionary, and level matrix.

CRITICAL ARCHITECTURAL PRINCIPLE:
No skill is exclusively restricted to a single domain. Every legitimate catalog
association is fully preserved and retrievable via multi-association queries.
"""

from __future__ import annotations

import json
import logging
import os
import re
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, List, Optional, Set, Tuple, Union

import pandas as pd

from linguistic_intelligence.config import (
    APPROVED_SKILL_TYPES,
    CANONICAL_SKILL_HOMES,
    CLOSED_DOMAINS_SET,
    CLOSED_SUBCATEGORIES_SET,
    CSV_DELIMITER,
    CSV_ENCODING,
    DEFAULT_ACRONYMS_PATH,
    DEFAULT_CATALOG_PATH,
    DEFAULT_LEVELS_PATH,
    DISALLOWED_ALIASES,
    PRIORITY_RANKS,
)
from linguistic_intelligence.proper_nouns import (
    AcronymEntry,
    AcronymResolver,
    ProperNounShield,
    is_protected_proper_noun as check_protected_proper_noun,
    is_protected_compound as check_protected_compound,
)

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class StandardSkillEntry:
    """Canonical representation of an approved skill in the reference catalog."""
    standard_skill_name: str
    domain: str
    sub_category: str
    skill_type: str
    applicable_level_category: str
    initial_regex_pattern: str
    known_aliases: Tuple[str, ...]
    skill_priority: str
    source_row_index: int = 0
    compiled_regex: Optional[re.Pattern] = None
    raw_skill_type: str = ""

    @property
    def name(self) -> str:
        """Alias for standard_skill_name used across test suites."""
        return self.standard_skill_name


@dataclass(frozen=True)
class LevelMatrixEntry:
    """Canonical skill level definition from standard_skill_levels_matrix.csv."""
    skill_type: str
    level_category: str
    standard_level: str
    rank_order: int
    regex_patterns: str
    arabic_patterns: str
    example_usage: str
    compiled_pattern: Optional[re.Pattern] = None
    compiled_arabic_regex: Optional[re.Pattern] = None

    @property
    def compiled_regex(self) -> Optional[re.Pattern]:
        """Backward-compatibility alias for compiled_pattern."""
        return self.compiled_pattern


class CatalogLoader:
    """
    Ingests standard_skills_catalog.csv, skills_acronym_dictionary.json,
    and standard_skill_levels_matrix.csv.
    
    Preserves ALL catalog associations (multi-domain skills like SQL, Python, Excel)
    while providing deterministic fallback homes for legacy single-match queries.
    """

    PRIORITY_WEIGHTS: Dict[str, int] = {
        'Core': 100,
        'Foundational': 50,
        'Secondary': 10,
    }

    TOOL_AFFINITY: Dict[str, int] = {
        'Software Engineering & IT': 40,
        'Data Science & Analytics': 35,
        'Engineering & Construction': 25,
        'Manufacturing & Industrial Production': 20,
        'Operations & Project Management': 15,
        'Business & Finance': 10,
        'Marketing & Sales': 5,
        'Human Resources': 0,
    }

    SOFT_AFFINITY: Dict[str, int] = {
        'Operations & Project Management': 30,
        'Human Resources': 25,
        'Business & Finance': 20,
        'Marketing & Sales': 15,
        'Data Science & Analytics': 10,
        'Software Engineering & IT': 10,
    }

    def __init__(
        self,
        catalog_path: Union[str, Path] = DEFAULT_CATALOG_PATH,
        acronyms_path: Union[str, Path] = DEFAULT_ACRONYMS_PATH,
        levels_path: Union[str, Path] = DEFAULT_LEVELS_PATH,
    ):
        self.catalog_path = Path(catalog_path)
        self.acronyms_path = Path(acronyms_path)
        self.levels_path = Path(levels_path)

        self.raw_row_count: int = 0
        self.all_entries: List[StandardSkillEntry] = []
        self.unique_standard_skills: Set[str] = set()

        # Multi-domain mapping: maps lowercase skill name to ALL valid catalog entries
        self.all_entries_by_name: Dict[str, List[StandardSkillEntry]] = {}

        # Canonical single-entry mappings for default fallback
        self.exact_canonical_map: Dict[str, StandardSkillEntry] = {}
        self.alias_map: Dict[str, StandardSkillEntry] = {}
        self.alias_to_standard_name: Dict[str, str] = {}
        self.exact_match_map: Dict[str, StandardSkillEntry] = {}

        # Regex indexing
        self.compiled_regexes: List[Tuple[StandardSkillEntry, re.Pattern]] = []
        self.compiled_regex_patterns: List[Tuple[str, re.Pattern, str, str, str]] = []
        self.all_compiled_regexes: List[Tuple[StandardSkillEntry, re.Pattern]] = []

        # Skill type audit tracking
        self.unapproved_skill_types: List[Tuple[int, str, str]] = []
        self.normalized_skill_types_audit: List[Tuple[int, str, str, str]] = []

        self.acronym_resolver = AcronymResolver(self.acronyms_path)
        self.proper_noun_shield = ProperNounShield(self.acronym_resolver)

        self.level_matrix_entries: List[LevelMatrixEntry] = []
        self.levels_matrix: List[LevelMatrixEntry] = []

        self._load_catalog()
        self._load_levels_matrix()

    @property
    def acronym_map(self) -> Dict[str, AcronymEntry]:
        return self.acronym_resolver.acronyms

    @property
    def acronym_reverse_map(self) -> Dict[str, AcronymEntry]:
        return self.acronym_resolver._by_lower_full_name

    def _load_catalog(self) -> None:
        if not self.catalog_path.exists():
            raise FileNotFoundError(f"Catalog file not found: {self.catalog_path}")

        df = pd.read_csv(self.catalog_path, sep=CSV_DELIMITER, encoding=CSV_ENCODING)
        self.raw_row_count = len(df)

        # Legacy skill type normalization table
        skill_type_normalization: Dict[str, str] = {
            "Methodology": "Hard Skill",
            "Domain Knowledge": "Hard Skill",
            "Requirement": "Hard Skill",
        }

        for idx, r in df.iterrows():
            s_name = str(r['standard_skill_name']).strip()
            dom = str(r['domain']).strip()
            sub = str(r['sub_category']).strip()
            
            raw_stype = str(r['skill_type']).strip()
            norm_stype = skill_type_normalization.get(raw_stype, raw_stype)
            if raw_stype != norm_stype:
                self.normalized_skill_types_audit.append((int(idx), s_name, raw_stype, norm_stype))

            if norm_stype not in APPROVED_SKILL_TYPES:
                self.unapproved_skill_types.append((int(idx), s_name, raw_stype))
                logger.error("Catalog Row %d: Skill '%s' has unapproved skill_type '%s'", idx, s_name, raw_stype)

            app_lvl = str(r.get('applicable_level_category', '')).strip()
            pat = str(r.get('initial_regex_pattern', '')).strip()

            # Shield .js frameworks (Node.js, Vue.js, Next.js) from plain JS matching
            if s_name == "JavaScript" and pat and pat != 'nan':
                pat = pat.replace(r'(?<!\w)', r'(?<![\w\.])')

            # Separate PL/SQL from Oracle Database regex pattern
            if s_name == "Oracle Database" and pat and pat != 'nan':
                pat = re.sub(r'\|PL\[\\s\\-_/\]\+SQLs\?', '', pat)

            aliases_raw = str(r.get('known_aliases', '')).strip()
            prio = str(r.get('skill_priority', '')).strip()

            aliases: List[str] = []
            if aliases_raw and aliases_raw != 'nan':
                aliases = [a.strip() for a in aliases_raw.split(',') if a.strip() and a.strip() != 'nan']

            compiled: Optional[re.Pattern] = None
            if pat and pat != 'nan':
                try:
                    compiled = re.compile(pat, re.IGNORECASE)
                except Exception as ex:
                    logger.warning("Failed to compile pattern for '%s': %s", s_name, ex)

            entry = StandardSkillEntry(
                standard_skill_name=s_name,
                domain=dom,
                sub_category=sub,
                skill_type=norm_stype,
                applicable_level_category=app_lvl,
                initial_regex_pattern=pat,
                known_aliases=tuple(aliases),
                skill_priority=prio,
                source_row_index=int(idx),
                compiled_regex=compiled,
                raw_skill_type=raw_stype,
            )

            self.all_entries.append(entry)
            self.unique_standard_skills.add(s_name)

            s_lower = s_name.lower()
            if s_lower not in self.all_entries_by_name:
                self.all_entries_by_name[s_lower] = []
            self.all_entries_by_name[s_lower].append(entry)

            if compiled:
                self.all_compiled_regexes.append((entry, compiled))

        # Build fallback canonical map for single-result queries
        for s_lower, entries in self.all_entries_by_name.items():
            if len(entries) == 1:
                self.exact_canonical_map[s_lower] = entries[0]
            else:
                self.exact_canonical_map[s_lower] = self._resolve_duplicate_entries(s_lower, entries)

        # Ingest aliases (pointing to canonical standard entry for single lookups)
        # Collect aliases across all duplicate rows of the skill to avoid alias loss
        for s_lower, entries in self.all_entries_by_name.items():
            canonical_entry = self.exact_canonical_map[s_lower]
            all_skill_aliases: Set[str] = set()
            for e in entries:
                for a in e.known_aliases:
                    all_skill_aliases.add(a)

            for alias in all_skill_aliases:
                a_lower = alias.lower()
                # Skip disallowed aliases that cause false concept merging
                if (a_lower, s_lower) in DISALLOWED_ALIASES:
                    logger.info("Skipping disallowed alias: ('%s' -> '%s')", alias, s_lower)
                    continue

                # Aliases cannot overwrite canonical standard skill names
                if a_lower not in self.exact_canonical_map:
                    if a_lower not in self.alias_map:
                        self.alias_map[a_lower] = canonical_entry
                        self.alias_to_standard_name[a_lower] = canonical_entry.standard_skill_name

        # Populate unified exact_match_map for single-entry lookup
        self.exact_match_map.update(self.exact_canonical_map)
        for a_lower, canon_entry in self.alias_map.items():
            if a_lower not in self.exact_match_map:
                self.exact_match_map[a_lower] = canon_entry

        # Build list of unique compiled regexes for canonical skills
        for entry in self.exact_canonical_map.values():
            if entry.compiled_regex:
                self.compiled_regexes.append((entry, entry.compiled_regex))
                self.compiled_regex_patterns.append((
                    entry.standard_skill_name,
                    entry.compiled_regex,
                    entry.domain,
                    entry.sub_category,
                    entry.skill_type,
                ))

        # Sort compiled regexes by descending length of standard_skill_name
        self.compiled_regexes.sort(key=lambda item: len(item[0].standard_skill_name), reverse=True)
        self.compiled_regex_patterns.sort(key=lambda item: len(item[0]), reverse=True)
        self.all_compiled_regexes.sort(key=lambda item: len(item[0].standard_skill_name), reverse=True)

        logger.info(
            "Loaded reference catalog: %d rows, %d unique skills, %d aliases, %d compiled regexes.",
            self.raw_row_count,
            len(self.exact_canonical_map),
            len(self.alias_map),
            len(self.compiled_regexes),
        )

    def _resolve_duplicate_entries(self, s_lower: str, entries: List[StandardSkillEntry]) -> StandardSkillEntry:
        """
        Resolves duplicate catalog entries to a primary default entry:
        Tier 1: Explicit CANONICAL_SKILL_HOMES table
        Tier 2: Algorithmic Multi-Factor Scoring (Priority + Domain Affinity + Row Order)
        
        NOTE: This is only a default fallback anchor. All entries remain fully preserved
        in self.all_entries_by_name and are queryable via get_all_exact_matches().
        """
        # Tier 1: Check curated canonical homes (case-insensitive check)
        for can_name, (target_dom, target_sub, target_type) in CANONICAL_SKILL_HOMES.items():
            if can_name.lower() == s_lower:
                for e in entries:
                    if e.domain == target_dom and e.sub_category == target_sub:
                        return e

        # Tier 2: Multi-Factor Scoring Formula
        best_entry = entries[0]
        best_score = -1.0
        for e in entries:
            prio_score = float(self.PRIORITY_WEIGHTS.get(e.skill_priority, 0))
            aff_score = 0.0
            if e.skill_type == 'Tool / Software':
                aff_score = float(self.TOOL_AFFINITY.get(e.domain, 0))
            elif e.skill_type == 'Soft Skill':
                aff_score = float(self.SOFT_AFFINITY.get(e.domain, 0))
            elif e.skill_type == 'Language':
                aff_score = 30.0 if e.domain == 'Operations & Project Management' else 10.0

            # Position tiebreaker (earlier row index in catalog wins)
            tiebreaker = 1.0 - (float(e.source_row_index) / 10000.0)

            score = prio_score + aff_score + tiebreaker
            if score > best_score:
                best_score = score
                best_entry = e

        return best_entry

    def _load_levels_matrix(self) -> None:
        """Loads and compiles regex patterns from standard_skill_levels_matrix.csv."""
        if not self.levels_path.exists():
            raise FileNotFoundError(f"Levels matrix file not found: {self.levels_path}")

        df = pd.read_csv(self.levels_path, sep=CSV_DELIMITER, encoding=CSV_ENCODING)

        for idx, r in df.iterrows():
            stype = str(r['skill_type']).strip()
            lcat = str(r['level_category']).strip()
            slevel = str(r['standard_level']).strip()
            rank = int(r['rank_order'])
            pat = str(r['regex_patterns']).strip()
            ar_pat = str(r.get('arabic_patterns', '')).strip()
            ex = str(r.get('example_usage', '')).strip()

            comp: Optional[re.Pattern] = None
            if pat and pat != 'nan':
                try:
                    # Strip legacy 'senior' and 'lead' modifiers from technical levels
                    cleaned_pat_str = re.sub(r'\b(lead\s+user|senior|lead)\b', '', pat, flags=re.IGNORECASE)
                    cleaned_pat_str = re.sub(r'\|\s*\|+', '|', cleaned_pat_str)
                    cleaned_pat_str = re.sub(r'\(\s*\|', '(', cleaned_pat_str)
                    cleaned_pat_str = re.sub(r'\|\s*\)', ')', cleaned_pat_str)
                    cleaned_pat_str = re.sub(r'\s+', ' ', cleaned_pat_str)
                    comp = re.compile(cleaned_pat_str, re.IGNORECASE)
                except Exception as ex_pat:
                    logger.warning("Failed to compile level regex for '%s %s': %s", stype, slevel, ex_pat)

            comp_ar: Optional[re.Pattern] = None
            if ar_pat and ar_pat != 'nan':
                try:
                    comp_ar = re.compile(ar_pat, re.IGNORECASE)
                except Exception as ex_ar:
                    logger.warning("Failed to compile arabic level regex for '%s %s': %s", stype, slevel, ex_ar)

            entry = LevelMatrixEntry(
                skill_type=stype,
                level_category=lcat,
                standard_level=slevel,
                rank_order=rank,
                regex_patterns=pat,
                arabic_patterns=ar_pat,
                example_usage=ex,
                compiled_pattern=comp,
                compiled_arabic_regex=comp_ar,
            )
            self.level_matrix_entries.append(entry)
            self.levels_matrix.append(entry)

        logger.info("Loaded %d level matrix records.", len(self.level_matrix_entries))

    # ─── MULTI-DOMAIN AND ASSOCIATION API ────────────────────────────────────────

    def get_all_exact_matches(self, text: str) -> List[StandardSkillEntry]:
        """
        Returns ALL legitimate catalog entries and associations for the skill.
        Does not restrict the skill to a single canonical home.
        Supports standard names and validated aliases.
        """
        if not text or not isinstance(text, str):
            return []

        clean = text.strip().lower()
        if not clean:
            return []

        # 1. Exact match on standard skill name
        if clean in self.all_entries_by_name:
            return list(self.all_entries_by_name[clean])

        # 2. Check alias mapping
        if clean in self.alias_to_standard_name:
            target_std_name = self.alias_to_standard_name[clean].lower()
            if target_std_name in self.all_entries_by_name:
                return list(self.all_entries_by_name[target_std_name])

        if clean in self.alias_map:
            canon_name = self.alias_map[clean].standard_skill_name.lower()
            if canon_name in self.all_entries_by_name:
                return list(self.all_entries_by_name[canon_name])
            return [self.alias_map[clean]]

        return []

    def get_all_entries_by_skill(self, standard_skill_name: str) -> List[StandardSkillEntry]:
        """Returns all catalog entries for a given standard skill name (case-insensitive)."""
        if not standard_skill_name or not isinstance(standard_skill_name, str):
            return []
        return list(self.all_entries_by_name.get(standard_skill_name.strip().lower(), []))

    def get_all_associations(self, skill_name: str) -> List[Tuple[str, str, str]]:
        """
        Returns list of (domain, sub_category, skill_type) tuples for the skill
        preserving all legitimate catalog associations without deduplication.
        """
        entries = self.get_all_exact_matches(skill_name)
        seen: Set[Tuple[str, str, str]] = set()
        associations: List[Tuple[str, str, str]] = []
        for e in entries:
            assoc = (e.domain, e.sub_category, e.skill_type)
            if assoc not in seen:
                seen.add(assoc)
                associations.append(assoc)
        return associations

    def get_exact_match(self, text: str, context_domain: Optional[str] = None) -> Optional[StandardSkillEntry]:
        """
        Returns standard skill entry with priority-weighted domain resolution or context match.
        If context_domain is supplied, checks for a domain-specific match first.
        
        NOTE: To retrieve ALL valid catalog associations for a skill across all domains,
        use get_all_exact_matches().
        """
        all_matches = self.get_all_exact_matches(text)
        if not all_matches:
            return None

        # Context-aware lookup: if skill exists in context_domain, prefer it
        if context_domain:
            for e in all_matches:
                if e.domain == context_domain:
                    return e

        # Fall back to canonical resolved entry for backward-compatibility
        clean = text.strip().lower()
        if clean in self.exact_canonical_map:
            return self.exact_canonical_map[clean]

        if clean in self.alias_map:
            return self.alias_map[clean]

        return all_matches[0]

    def get_all_regex_matches(self, text: str, include_all_associations: bool = True) -> List[StandardSkillEntry]:
        """
        Returns ALL matched standard skill entries using precompiled regex patterns.
        When include_all_associations is True, matched skills expand to all their catalog
        associations across domains and subcategories.
        Protects multi-word proper nouns from partial sub-token matching.
        """
        if not text or not isinstance(text, str):
            return []

        clean = text.strip()
        if not clean:
            return []

        # Proper noun and protected compound protection checks:
        # 1. If text is a protected proper noun (e.g. GitHub Advanced Security),
        # do NOT let a sub-token regex (e.g. GitHub) match it if the proper noun itself is not in catalog.
        if self.proper_noun_shield.is_protected_proper_noun(clean):
            exact_matches = self.get_all_exact_matches(clean)
            if exact_matches:
                return exact_matches
            return []

        # 2. If text is a protected compound (e.g. PL/SQL, CI/CD, UI/UX, AI/ML),
        # do NOT let a sub-token regex (e.g. SQL, AI, ML) partially match it if the compound is not in catalog.
        if self.proper_noun_shield.is_protected_compound(clean):
            exact_matches = self.get_all_exact_matches(clean)
            if exact_matches:
                return exact_matches
            return []

        matched_entries: List[StandardSkillEntry] = []
        matched_skill_names: Set[str] = set()
        seen_associations: Set[Tuple[str, str, str]] = set()

        for entry, pattern in self.all_compiled_regexes:
            s_name_lower = entry.standard_skill_name.lower()
            if s_name_lower in matched_skill_names:
                continue

            if pattern.search(clean):
                matched_skill_names.add(s_name_lower)
                if include_all_associations:
                    all_for_skill = self.all_entries_by_name.get(s_name_lower, [entry])
                    for e in all_for_skill:
                        assoc = (e.standard_skill_name, e.domain, e.sub_category)
                        if assoc not in seen_associations:
                            seen_associations.add(assoc)
                            matched_entries.append(e)
                else:
                    assoc = (entry.standard_skill_name, entry.domain, entry.sub_category)
                    if assoc not in seen_associations:
                        seen_associations.add(assoc)
                        matched_entries.append(entry)

        return matched_entries

    def get_regex_match(self, text: str, context_domain: Optional[str] = None) -> Optional[StandardSkillEntry]:
        """
        Returns matched standard skill entry using precompiled regex patterns.
        NOTE: To retrieve ALL matching skills and associations, use get_all_regex_matches().
        """
        matches = self.get_all_regex_matches(text, include_all_associations=True)
        if not matches:
            return None

        if context_domain:
            for e in matches:
                if e.domain == context_domain:
                    return e

        # Prefer canonical entry if present in matches
        clean = matches[0].standard_skill_name.lower()
        if clean in self.exact_canonical_map:
            return self.exact_canonical_map[clean]

        return matches[0]

    def get_acronym(self, token: str) -> Optional[AcronymEntry]:
        """Returns verified acronym mapping (supports forward and reverse lookup)."""
        if not token or not isinstance(token, str):
            return None
        return self.acronym_resolver.get_acronym(token)

    def is_protected_proper_noun(self, text: str) -> bool:
        """Checks whether multi-word term must be shielded from level stripping."""
        if not text or not isinstance(text, str):
            return False
        return self.proper_noun_shield.is_protected_proper_noun(text)

    def is_protected_compound(self, text: str) -> bool:
        """Checks whether slash/ampersand term is a protected compound."""
        if not text or not isinstance(text, str):
            return False
        return self.proper_noun_shield.is_protected_compound(text)

    def get_all_domains(self) -> Set[str]:
        """Returns set of all approved taxonomy domains (exactly 14 closed domains)."""
        return set(e.domain for e in self.all_entries)

    def get_all_subcategories(self) -> Set[str]:
        """Returns set of all approved taxonomy subcategories (exactly 61 closed subcategories)."""
        return set(e.sub_category for e in self.all_entries)

    def get_level_matrix_rows(self) -> List[LevelMatrixEntry]:
        """Returns loaded level matrix entries (23 rows)."""
        return list(self.level_matrix_entries)

    def get_level_patterns(self, skill_type: Optional[str] = None, level: Optional[str] = None) -> List[re.Pattern]:
        """Returns compiled regex patterns matching skill_type and level."""
        patterns: List[re.Pattern] = []
        for entry in self.level_matrix_entries:
            if skill_type and entry.skill_type != skill_type:
                continue
            if level and entry.standard_level != level:
                continue
            if entry.compiled_pattern:
                patterns.append(entry.compiled_pattern)
        return patterns

    def get_skill_type_audit_report(self) -> Dict[str, Any]:
        """Returns detailed audit report of skill type normalization and conformance."""
        return {
            "total_rows": self.raw_row_count,
            "approved_types": sorted(list(APPROVED_SKILL_TYPES)),
            "normalized_count": len(self.normalized_skill_types_audit),
            "normalized_samples": self.normalized_skill_types_audit[:10],
            "unapproved_count": len(self.unapproved_skill_types),
            "unapproved_samples": self.unapproved_skill_types,
        }
