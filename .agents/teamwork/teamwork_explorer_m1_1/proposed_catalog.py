"""
Linguistic Intelligence - Reference Catalog Engine (Feature 1)
==============================================================
Deterministic, priority-weighted ingestion for standard skills catalog,
curated canonical domain homes, acronym dictionary, and level matrix.
"""

from __future__ import annotations

import os
import re
import json
import logging
from typing import Optional, List, Dict, Tuple, Set, Any
from dataclasses import dataclass

import pandas as pd

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class StandardSkillEntry:
    """Canonical representation of an approved skill in the reference catalog."""
    standard_skill_name: str
    domain: str
    sub_category: str
    skill_type: str
    applicable_level_category: str
    skill_priority: str
    known_aliases: Tuple[str, ...]
    initial_regex_pattern: str
    source_row_index: int
    compiled_regex: Optional[re.Pattern] = None


@dataclass(frozen=True)
class AcronymEntry:
    """Verified acronym record from skills_acronym_dictionary.json."""
    acronym: str
    full_name: str
    canonical_skill_name: str
    domain: str
    sub_category: str
    skill_type: str
    source: str


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
    compiled_regex: Optional[re.Pattern] = None
    compiled_arabic_regex: Optional[re.Pattern] = None


class CatalogLoader:
    """
    Ingests standard_skills_catalog.csv, skills_acronym_dictionary.json,
    and standard_skill_levels_matrix.csv with deterministic priority-weighted
    deduplication and canonical home resolution.
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

    # Explicit canonical homes for cross-domain tools, frameworks, and languages
    CANONICAL_HOMES: Dict[str, Tuple[str, str]] = {
        # Programming Languages & Backend
        'python': ('Software Engineering & IT', 'Backend Development'),
        'c++': ('Software Engineering & IT', 'Backend Development'),
        'c#': ('Software Engineering & IT', 'Backend Development'),
        'java': ('Software Engineering & IT', 'Backend Development'),
        'node.js': ('Software Engineering & IT', 'Backend Development'),
        'php': ('Software Engineering & IT', 'Backend Development'),
        'go': ('Software Engineering & IT', 'Backend Development'),
        'rust': ('Software Engineering & IT', 'Backend Development'),
        'postgresql': ('Software Engineering & IT', 'Backend Development'),
        'mongodb': ('Software Engineering & IT', 'Backend Development'),
        'redis': ('Software Engineering & IT', 'Backend Development'),

        # Data Engineering & Warehousing
        'sql': ('Data Science & Analytics', 'Data Engineering'),
        'apache spark': ('Data Science & Analytics', 'Data Engineering'),
        'apache kafka': ('Data Science & Analytics', 'Data Engineering'),
        'snowflake': ('Data Science & Analytics', 'Data Engineering'),
        'dbt': ('Data Science & Analytics', 'Data Engineering'),

        # Business Intelligence & Analytics Tools
        'microsoft excel': ('Data Science & Analytics', 'Business Intelligence & Data Analytics'),
        'power bi': ('Data Science & Analytics', 'Business Intelligence & Data Analytics'),
        'tableau': ('Data Science & Analytics', 'Business Intelligence & Data Analytics'),

        # Cloud, DevOps & Infrastructure
        'git': ('Software Engineering & IT', 'DevOps & Cloud Infrastructure'),
        'docker': ('Software Engineering & IT', 'DevOps & Cloud Infrastructure'),
        'kubernetes': ('Software Engineering & IT', 'DevOps & Cloud Infrastructure'),
        'linux': ('Software Engineering & IT', 'DevOps & Cloud Infrastructure'),
        'bash': ('Software Engineering & IT', 'DevOps & Cloud Infrastructure'),
        'aws': ('Software Engineering & IT', 'DevOps & Cloud Infrastructure'),
        'azure devops': ('Software Engineering & IT', 'DevOps & Cloud Infrastructure'),
        'terraform': ('Software Engineering & IT', 'DevOps & Cloud Infrastructure'),
        'ci/cd': ('Software Engineering & IT', 'DevOps & Cloud Infrastructure'),

        # Project & Agile Management Tools
        'jira': ('Operations & Project Management', 'Project & Agile Management (PMP, Agile, Scrum)'),
        'confluence': ('Operations & Project Management', 'Project & Agile Management (PMP, Agile, Scrum)'),
        'asana': ('Operations & Project Management', 'Project & Agile Management (PMP, Agile, Scrum)'),
        'trello': ('Operations & Project Management', 'Project & Agile Management (PMP, Agile, Scrum)'),

        # Frontend Development
        'typescript': ('Software Engineering & IT', 'Frontend Development'),
        'javascript': ('Software Engineering & IT', 'Frontend Development'),
        'html': ('Software Engineering & IT', 'Frontend Development'),
        'css': ('Software Engineering & IT', 'Frontend Development'),
        'react': ('Software Engineering & IT', 'Frontend Development'),
        'angular': ('Software Engineering & IT', 'Frontend Development'),
        'vue.js': ('Software Engineering & IT', 'Frontend Development'),
        'figma': ('Software Engineering & IT', 'Frontend Development'),

        # QA & Testing
        'postman': ('Software Engineering & IT', 'Quality Assurance & Testing'),
        'selenium': ('Software Engineering & IT', 'Quality Assurance & Testing'),
        'cypress': ('Software Engineering & IT', 'Quality Assurance & Testing'),
        'jmeter': ('Software Engineering & IT', 'Quality Assurance & Testing'),

        # Spoken Languages
        'english': ('Operations & Project Management', 'Customer Service & Support Operations'),
        'arabic': ('Operations & Project Management', 'Customer Service & Support Operations'),
        'french': ('Operations & Project Management', 'Customer Service & Support Operations'),
        'german': ('Operations & Project Management', 'Customer Service & Support Operations'),
    }

    # Protected compounds: never split on / or &
    PROTECTED_COMPOUNDS: Set[str] = {
        'pl/sql', 'ci/cd', 'ui/ux', 'ai/ml', 'c/c++', 'r&d', 'p&l', 'p&id', 'w&b',
        'tcp/ip', 'etl/elt', 'i/o', 'pr/po', 'qa/qc', 'hvac/r', 'ar/vr', 'b2b/b2c',
        'saas/paas', 'devops/mlops', 'olap/oltp', 'lan/wan', 'cad/cam', 'bi/dw',
        'erp/crm', 'saas/iaas', 'paas/iaas', 'gui/cli', 'client/server', 'frontend/backend',
        'b2b/b2g', 'b2c/d2c', 'pos/inventory', 'sla/slo', 'kpi/okr', 'iso/iec'
    }

    # Multi-word proper nouns that must NEVER have 'lead', 'senior', or 'advanced' stripped
    PROTECTED_PROPER_NOUNS: Set[str] = {
        'lead generation', 'lead time reduction', 'lead nurturing', 'lead tracking',
        'lead scoring', 'lead management', 'lead conversion',
        'senior care', 'senior living', 'senior housing',
        'github advanced security', 'advanced threat protection',
        'advanced business application programming', 'advanced driver assistance systems',
        'adas', 'abap', 'apt', 'aes', 'acls', 'atls', 'apra'
    }

    def __init__(
        self,
        catalog_path: str = 'standard_skills_catalog.csv',
        acronyms_path: str = 'skills_acronym_dictionary.json',
        levels_path: str = 'standard_skill_levels_matrix.csv'
    ):
        self.catalog_path = catalog_path
        self.acronyms_path = acronyms_path
        self.levels_path = levels_path

        self.exact_canonical_map: Dict[str, StandardSkillEntry] = {}
        self.alias_map: Dict[str, StandardSkillEntry] = {}
        self.all_entries_by_name: Dict[str, List[StandardSkillEntry]] = {}
        self.compiled_regexes: List[Tuple[StandardSkillEntry, re.Pattern]] = []

        self.acronym_map: Dict[str, AcronymEntry] = {}
        self.acronym_reverse_map: Dict[str, AcronymEntry] = {}
        self.levels_matrix: List[LevelMatrixEntry] = []

        self._load_catalog()
        self._load_acronyms()
        self._load_levels()

    def _load_catalog(self) -> None:
        if not os.path.exists(self.catalog_path):
            raise FileNotFoundError(f"Catalog file not found: {self.catalog_path}")

        df = pd.read_csv(self.catalog_path, sep=';', encoding='utf-8-sig')

        for idx, r in df.iterrows():
            s_name = str(r['standard_skill_name']).strip()
            dom = str(r['domain']).strip()
            sub = str(r['sub_category']).strip()
            stype = str(r['skill_type']).strip()
            app_lvl = str(r.get('applicable_level_category', '')).strip()
            pat = str(r.get('initial_regex_pattern', '')).strip()
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
                skill_type=stype,
                applicable_level_category=app_lvl,
                skill_priority=prio,
                known_aliases=tuple(aliases),
                initial_regex_pattern=pat,
                source_row_index=int(idx),
                compiled_regex=compiled
            )

            s_lower = s_name.lower()
            if s_lower not in self.all_entries_by_name:
                self.all_entries_by_name[s_lower] = []
            self.all_entries_by_name[s_lower].append(entry)

        # Priority-weighted deduplication
        for s_lower, entries in self.all_entries_by_name.items():
            if len(entries) == 1:
                self.exact_canonical_map[s_lower] = entries[0]
            else:
                self.exact_canonical_map[s_lower] = self._resolve_duplicate_entries(s_lower, entries)

        # Ingest aliases pointing to canonical entry
        for entry in self.exact_canonical_map.values():
            for alias in entry.known_aliases:
                a_lower = alias.lower()
                if a_lower not in self.exact_canonical_map and a_lower not in self.alias_map:
                    self.alias_map[a_lower] = entry

        # Build list of unique compiled regexes (one per canonical skill)
        for entry in self.exact_canonical_map.values():
            if entry.compiled_regex:
                self.compiled_regexes.append((entry, entry.compiled_regex))

        logger.info(
            "Loaded reference catalog: %d unique canonical skills, %d aliases, %d compiled regexes.",
            len(self.exact_canonical_map),
            len(self.alias_map),
            len(self.compiled_regexes)
        )

    def _resolve_duplicate_entries(self, s_lower: str, entries: List[StandardSkillEntry]) -> StandardSkillEntry:
        """
        Resolves duplicate catalog entries using 2-Tier Resolution:
        Tier 1: Explicit CANONICAL_HOMES table
        Tier 2: Algorithmic Multi-Factor Scoring (Priority + Domain Affinity + Row Order)
        """
        # Tier 1: Check curated canonical homes
        if s_lower in self.CANONICAL_HOMES:
            target_dom, target_sub = self.CANONICAL_HOMES[s_lower]
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

    def _load_acronyms(self) -> None:
        if not os.path.exists(self.acronyms_path):
            logger.warning("Acronyms file not found: %s", self.acronyms_path)
            return

        with open(self.acronyms_path, 'r', encoding='utf-8') as f:
            data = json.load(f)

        for k, v in data.items():
            entry = AcronymEntry(
                acronym=v.get('acronym', k),
                full_name=v.get('full_name', ''),
                canonical_skill_name=v.get('canonical_skill_name', ''),
                domain=v.get('domain', ''),
                sub_category=v.get('sub_category', ''),
                skill_type=v.get('skill_type', ''),
                source=v.get('source', '')
            )
            self.acronym_map[k.lower()] = entry
            self.acronym_map[v.get('acronym', '').lower()] = entry
            full_lower = v.get('full_name', '').lower()
            if full_lower:
                self.acronym_reverse_map[full_lower] = entry

        logger.info("Loaded %d acronym records.", len(data))

    def _load_levels(self) -> None:
        if not os.path.exists(self.levels_path):
            logger.warning("Levels matrix file not found: %s", self.levels_path)
            return

        df = pd.read_csv(self.levels_path, sep=';', encoding='utf-8-sig')
        for idx, r in df.iterrows():
            pat = str(r.get('regex_patterns', '')).strip()
            ar_pat = str(r.get('arabic_patterns', '')).strip()

            comp = None
            if pat and pat != 'nan':
                try:
                    comp = re.compile(pat, re.IGNORECASE)
                except Exception:
                    pass

            comp_ar = None
            if ar_pat and ar_pat != 'nan':
                try:
                    comp_ar = re.compile(ar_pat, re.IGNORECASE)
                except Exception:
                    pass

            entry = LevelMatrixEntry(
                skill_type=str(r['skill_type']).strip(),
                level_category=str(r['level_category']).strip(),
                standard_level=str(r['standard_level']).strip(),
                rank_order=int(r['rank_order']),
                regex_patterns=pat,
                arabic_patterns=ar_pat,
                example_usage=str(r.get('example_usage', '')).strip(),
                compiled_regex=comp,
                compiled_arabic_regex=comp_ar
            )
            self.levels_matrix.append(entry)

        logger.info("Loaded %d level matrix records.", len(self.levels_matrix))

    def get_exact_match(self, text: str, context_domain: Optional[str] = None) -> Optional[StandardSkillEntry]:
        """
        Returns standard skill entry with priority-weighted domain resolution.
        If context_domain is supplied, checks for a domain-specific match first.
        """
        clean = text.strip().lower()
        if not clean:
            return None

        # Context-aware lookup: if skill exists in context_domain, prefer it
        if context_domain and clean in self.all_entries_by_name:
            for e in self.all_entries_by_name[clean]:
                if e.domain == context_domain:
                    return e

        # Fall back to canonical resolved entry
        if clean in self.exact_canonical_map:
            return self.exact_canonical_map[clean]

        # Check known aliases
        if clean in self.alias_map:
            return self.alias_map[clean]

        return None

    def get_regex_match(self, text: str) -> Optional[StandardSkillEntry]:
        """Returns matched standard skill entry using precompiled regex patterns."""
        clean = text.strip()
        if not clean:
            return None

        for entry, pattern in self.compiled_regexes:
            if pattern.search(clean):
                return entry

        return None

    def get_acronym(self, token: str) -> Optional[AcronymEntry]:
        """Returns verified acronym mapping."""
        return self.acronym_map.get(token.strip().lower())

    def is_protected_proper_noun(self, text: str) -> bool:
        """
        Checks whether multi-word term must be shielded from level stripping.
        Prevents 'Lead' in 'Lead Generation' or 'Senior' in 'Senior Care' from
        being erroneously stripped as skill proficiency levels.
        """
        clean = text.strip().lower()
        if clean in self.PROTECTED_PROPER_NOUNS:
            return True

        for noun in self.PROTECTED_PROPER_NOUNS:
            if clean == noun or clean.startswith(noun + ' ') or clean.endswith(' ' + noun):
                return True

        return False

    def is_protected_compound(self, text: str) -> bool:
        """
        Checks whether slash/ampersand term is a protected compound.
        Prevents 'PL/SQL', 'CI/CD', 'UI/UX', 'R&D', 'C/C++' from being split.
        """
        clean = text.strip().lower()
        return clean in self.PROTECTED_COMPOUNDS
