"""
Linguistic Intelligence — Pass 0 Proper Noun & Acronym Shielding Engine
========================================================================
Shields multi-word proper nouns, business disciplines, software products,
and acronyms containing title/level keywords from naive level/role stripping.
"""

from __future__ import annotations

import json
import os
import re
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Dict, List, Optional, Set, Tuple, Union

from linguistic_intelligence.config import (
    DEFAULT_ACRONYMS_PATH,
    PROTECTED_PROPER_NOUN as PROTECTED_PROPER_NOUN_STATUS,
)


@dataclass(frozen=True)
class ProtectedProperNoun:
    """Canonical representation of a protected proper noun or discipline."""
    canonical_name: str
    domain: str
    sub_category: str
    skill_type: str
    category: str
    match_status: str = PROTECTED_PROPER_NOUN_STATUS


@dataclass(frozen=True)
class AcronymEntry:
    """Verified acronym entry loaded from skills_acronym_dictionary.json."""
    acronym: str
    full_name: str
    canonical_skill_name: str
    domain: str
    sub_category: str
    skill_type: str
    source: str


@dataclass
class Pass0ShieldResult:
    """Result of evaluating a token or expression against Pass 0 shields."""
    is_shielded: bool
    shielded_token: Optional[str] = None
    canonical_name: Optional[str] = None
    domain: Optional[str] = None
    sub_category: Optional[str] = None
    skill_type: Optional[str] = None
    match_status: Optional[str] = None
    inhibit_level_stripping: bool = False
    inhibit_delimiter_splitting: bool = False
    shield_reason: Optional[str] = None


class AcronymResolver:
    """
    Ingests and queries skills_acronym_dictionary.json (386 entries).
    Provides bidirectional lookup, expansion, and boundary-safe detection.
    """
    COLLISION_PRONE_ACRONYMS: Set[str] = {"AD", "EN", "PM", "SHE", "HIS", "SIT", "RAN", "DA", "BS", "FI"}

    def __init__(self, acronym_dict_path: Union[str, Path] = DEFAULT_ACRONYMS_PATH):
        self.acronym_dict_path = Path(acronym_dict_path)
        self.acronyms: Dict[str, AcronymEntry] = {}
        self._by_lower_key: Dict[str, AcronymEntry] = {}
        self._by_exact_acronym: Dict[str, AcronymEntry] = {}
        self._by_lower_full_name: Dict[str, AcronymEntry] = {}
        self._load()

    def _load(self) -> None:
        if not self.acronym_dict_path.exists():
            return

        with open(self.acronym_dict_path, "r", encoding="utf-8") as f:
            raw_data = json.load(f)

        for key, entry in raw_data.items():
            # Controlled 5-type normalization: Methodology -> Hard Skill
            stype = entry.get("skill_type", "Hard Skill")
            if stype == "Methodology":
                stype = "Hard Skill"

            acronym_str = entry.get("acronym", key.upper())
            full_name_str = entry.get("full_name", "")
            can_name_str = entry.get("canonical_skill_name", full_name_str or acronym_str)

            acronym_obj = AcronymEntry(
                acronym=acronym_str,
                full_name=full_name_str,
                canonical_skill_name=can_name_str,
                domain=entry.get("domain", "Unknown"),
                sub_category=entry.get("sub_category", "Unknown"),
                skill_type=stype,
                source=entry.get("source", "Dictionary"),
            )

            k_lower = key.strip().lower()
            self.acronyms[key] = acronym_obj
            self._by_lower_key[k_lower] = acronym_obj
            self._by_exact_acronym[acronym_obj.acronym] = acronym_obj

            if full_name_str:
                self._by_lower_full_name[full_name_str.strip().lower()] = acronym_obj

            if can_name_str:
                self._by_lower_full_name[can_name_str.strip().lower()] = acronym_obj

    def get_acronym(self, token: str) -> Optional[AcronymEntry]:
        """Looks up an acronym entry with collision safety and reverse lookup support."""
        if not token or not isinstance(token, str):
            return None

        t_clean = token.strip()
        if not t_clean:
            return None

        # Short collision-prone acronyms must match exact casing
        if t_clean.upper() in self.COLLISION_PRONE_ACRONYMS:
            if t_clean != t_clean.upper():
                return None
            return self._by_exact_acronym.get(t_clean)

        # Direct acronym lookup (case-insensitive)
        t_lower = t_clean.lower()
        if t_lower in self._by_lower_key:
            return self._by_lower_key[t_lower]

        # Reverse lookup by full name or canonical skill name
        if t_lower in self._by_lower_full_name:
            return self._by_lower_full_name[t_lower]

        return None

    def expand(self, token: str) -> Optional[str]:
        entry = self.get_acronym(token)
        return entry.full_name if entry else None

    def is_acronym_expansion_pair(self, token_a: str, token_b: str) -> bool:
        """Checks if token_a is an acronym for token_b or vice versa."""
        if not token_a or not token_b or not isinstance(token_a, str) or not isinstance(token_b, str):
            return False

        a_clean = token_a.strip().lower()
        b_clean = token_b.strip().lower()
        if not a_clean or not b_clean:
            return False

        # Check if a is acronym for b
        entry_a = self.get_acronym(token_a)
        if entry_a and (entry_a.full_name.strip().lower() == b_clean or entry_a.canonical_skill_name.strip().lower() == b_clean):
            return True

        # Check if b is acronym for a
        entry_b = self.get_acronym(token_b)
        if entry_b and (entry_b.full_name.strip().lower() == a_clean or entry_b.canonical_skill_name.strip().lower() == a_clean):
            return True

        # Fallback to algorithmic initialism with min length >= 2
        words_b = [w for w in re.split(r'[\s\-]+', b_clean) if w and w not in ('of', 'and', 'the', 'for', 'in', 'to', '&')]
        if len(a_clean) >= 2 and len(words_b) >= 2 and ''.join(w[0] for w in words_b if w) == a_clean:
            return True

        words_a = [w for w in re.split(r'[\s\-]+', a_clean) if w and w not in ('of', 'and', 'the', 'for', 'in', 'to', '&')]
        if len(b_clean) >= 2 and len(words_a) >= 2 and ''.join(w[0] for w in words_a if w) == b_clean:
            return True

        return False


# Alias for backward compatibility
AcronymEngine = AcronymResolver


class ProperNounShield:
    """
    Pass 0 Proper Noun Shielding Engine:
    Shields multi-word business disciplines, certifications, and proper nouns
    from having level words or role titles stripped.
    """

    # Protected compounds: never split on / or &
    PROTECTED_COMPOUNDS: Set[str] = {
        'pl/sql', 'ci/cd', 'ui/ux', 'ai/ml', 'c/c++', 'r&d', 'p&l', 'p&id', 'w&b',
        'tcp/ip', 'etl/elt', 'i/o', 'pr/po', 'qa/qc', 'hvac/r', 'ar/vr', 'b2b/b2c',
        'saas/paas', 'devops/mlops', 'olap/oltp', 'lan/wan', 'cad/cam', 'bi/dw',
        'erp/crm', 'saas/iaas', 'paas/iaas', 'gui/cli', 'client/server', 'frontend/backend',
        'b2b/b2g', 'b2c/d2c', 'pos/inventory', 'sla/slo', 'kpi/okr', 'iso/iec'
    }

    # Curated protected proper nouns registry with taxonomy metadata
    PROTECTED_PROPER_NOUNS_REGISTRY: List[ProtectedProperNoun] = [
        # Sales Disciplines
        ProtectedProperNoun("Lead Generation", "Marketing & Sales", "B2B Sales & Business Development", "Hard Skill", "Sales Prospecting"),
        ProtectedProperNoun("Lead Generation Campaigns", "Marketing & Sales", "B2B Sales & Business Development", "Hard Skill", "Sales Prospecting"),
        ProtectedProperNoun("Lead Generation & Outreach", "Marketing & Sales", "B2B Sales & Business Development", "Hard Skill", "Sales Prospecting"),
        ProtectedProperNoun("Lead Nurturing", "Marketing & Sales", "B2B Sales & Business Development", "Hard Skill", "Sales Discipline"),
        ProtectedProperNoun("Lead Scoring", "Marketing & Sales", "B2B Sales & Business Development", "Hard Skill", "Sales Discipline"),
        ProtectedProperNoun("Lead Qualification", "Marketing & Sales", "B2B Sales & Business Development", "Hard Skill", "Sales Discipline"),
        ProtectedProperNoun("Lead Tracking", "Marketing & Sales", "B2B Sales & Business Development", "Hard Skill", "Sales Discipline"),
        ProtectedProperNoun("Lead Conversion", "Marketing & Sales", "B2B Sales & Business Development", "Hard Skill", "Sales Discipline"),
        ProtectedProperNoun("Lead Routing", "Marketing & Sales", "B2B Sales & Business Development", "Hard Skill", "Sales Discipline"),
        ProtectedProperNoun("Lead Database Management", "Marketing & Sales", "B2B Sales & Business Development", "Hard Skill", "Sales Discipline"),
        ProtectedProperNoun("Lead Engagement", "Marketing & Sales", "B2B Sales & Business Development", "Hard Skill", "Sales Discipline"),
        ProtectedProperNoun("Lead Enrichment", "Marketing & Sales", "B2B Sales & Business Development", "Hard Skill", "Sales Discipline"),
        ProtectedProperNoun("Cost Per Lead", "Marketing & Sales", "Digital Marketing & Paid Ads (Performance Media)", "Hard Skill", "Sales Economics"),
        ProtectedProperNoun("Lead-to-Cash", "Marketing & Sales", "B2B Sales & Business Development", "Hard Skill", "Commercial Strategy"),
        # Supply Chain & Manufacturing
        ProtectedProperNoun("Lead Time Analysis", "Supply Chain & Logistics", "Supply Chain Planning & Demand Forecasting", "Hard Skill", "Supply Chain"),
        ProtectedProperNoun("Lead Time Reduction", "Operations & Project Management", "Business Operations & Process Improvement", "Hard Skill", "Supply Chain"),
        ProtectedProperNoun("Lead Shielding", "Engineering & Construction", "Civil & Structural Engineering", "Hard Skill", "Physical Safety"),
        # ISO Auditing & Compliance
        ProtectedProperNoun("ISO Lead Auditor", "Operations & Project Management", "Business Operations & Process Improvement", "Certification", "ISO Auditing"),
        ProtectedProperNoun("ISO 9001 Lead Auditor", "Operations & Project Management", "Business Operations & Process Improvement", "Certification", "ISO Auditing"),
        ProtectedProperNoun("ISO 27001 Lead Auditor", "Operations & Project Management", "Business Operations & Process Improvement", "Certification", "ISO Auditing"),
        ProtectedProperNoun("ISO 22301 Lead Auditor", "Operations & Project Management", "Business Operations & Process Improvement", "Certification", "ISO Auditing"),
        ProtectedProperNoun("ISO 45001 Lead Auditor", "Operations & Project Management", "Business Operations & Process Improvement", "Certification", "ISO Auditing"),
        ProtectedProperNoun("ISO Lead Implementer", "Operations & Project Management", "Business Operations & Process Improvement", "Certification", "ISO Implementation"),
        ProtectedProperNoun("ISO 27001 Lead Implementer", "Operations & Project Management", "Business Operations & Process Improvement", "Certification", "ISO Implementation"),
        ProtectedProperNoun("ISO 22301 Lead Implementer", "Operations & Project Management", "Business Operations & Process Improvement", "Certification", "ISO Implementation"),
        # Healthcare & Senior
        ProtectedProperNoun("Senior Care", "Healthcare & Medical Sciences", "Nursing & Allied Health Services", "Hard Skill", "Healthcare"),
        ProtectedProperNoun("Senior Living", "Healthcare & Medical Sciences", "Nursing & Allied Health Services", "Hard Skill", "Healthcare"),
        ProtectedProperNoun("Senior Housing", "Healthcare & Medical Sciences", "Nursing & Allied Health Services", "Hard Skill", "Healthcare"),
        ProtectedProperNoun("Senior Decision Maker Selling", "Marketing & Sales", "B2B Sales & Business Development", "Hard Skill", "Commercial Strategy"),
        ProtectedProperNoun("Sales to Senior Decision Makers", "Marketing & Sales", "B2B Sales & Business Development", "Hard Skill", "Commercial Strategy"),
        ProtectedProperNoun("Senior-Level Recruitment", "Human Resources", "Talent Acquisition & Recruitment", "Hard Skill", "Recruitment"),
        # Cybersecurity & Software Tools
        ProtectedProperNoun("Advanced Threat Protection", "Software Engineering & IT", "Cybersecurity & Information Security", "Tool / Software", "Cybersecurity"),
        ProtectedProperNoun("Windows Defender ATP", "Software Engineering & IT", "Cybersecurity & Information Security", "Tool / Software", "Cybersecurity"),
        ProtectedProperNoun("Office 365 ATP", "Software Engineering & IT", "Cybersecurity & Information Security", "Tool / Software", "Cybersecurity"),
        ProtectedProperNoun("Office 365 Advanced Threat Protection", "Software Engineering & IT", "Cybersecurity & Information Security", "Tool / Software", "Cybersecurity"),
        ProtectedProperNoun("Windows Defender Advanced Threat Protection", "Software Engineering & IT", "Cybersecurity & Information Security", "Tool / Software", "Cybersecurity"),
        ProtectedProperNoun("Azure Advanced Threat Protection", "Software Engineering & IT", "Cybersecurity & Information Security", "Tool / Software", "Cybersecurity"),
        ProtectedProperNoun("GitHub Advanced Security", "Software Engineering & IT", "DevOps & Cloud Infrastructure", "Tool / Software", "DevSecOps"),
        # Enterprise Software & Automotive
        ProtectedProperNoun("ABAP", "Software Engineering & IT", "Backend Development", "Hard Skill", "Enterprise Systems"),
        ProtectedProperNoun("Advanced Business Application Programming", "Software Engineering & IT", "Backend Development", "Hard Skill", "Enterprise Systems"),
        ProtectedProperNoun("ADAS", "Engineering & Construction", "Electrical & Power Engineering", "Hard Skill", "Automotive"),
        ProtectedProperNoun("Advanced Driver Assistance Systems", "Engineering & Construction", "Electrical & Power Engineering", "Hard Skill", "Automotive"),
        ProtectedProperNoun("Advanced Driver Assistance Systems (ADAS)", "Engineering & Construction", "Electrical & Power Engineering", "Hard Skill", "Automotive"),
        ProtectedProperNoun("DCACI", "Software Engineering & IT", "DevOps & Cloud Infrastructure", "Certification", "Cloud Infrastructure"),
        ProtectedProperNoun("VCAP", "Software Engineering & IT", "DevOps & Cloud Infrastructure", "Certification", "Cloud Infrastructure"),
        ProtectedProperNoun("Advanced Analytics", "Data Science & Analytics", "Business Intelligence & Data Analytics", "Hard Skill", "Data Analytics"),
        ProtectedProperNoun("Advanced Planning Systems", "Supply Chain & Logistics", "Supply Chain Planning & Demand Forecasting", "Hard Skill", "Supply Chain"),
        ProtectedProperNoun("Advanced Diagnostic Procedures", "Healthcare & Medical Sciences", "Clinical Medicine & Patient Care", "Hard Skill", "Medical"),
        # Enterprise Data Management
        ProtectedProperNoun("Master Data Management", "Data Science & Analytics", "Data Governance, Quality & Architecture", "Hard Skill", "Enterprise Data"),
        ProtectedProperNoun("Master Data Management (MDM)", "Data Science & Analytics", "Data Governance, Quality & Architecture", "Hard Skill", "Enterprise Data"),
        ProtectedProperNoun("Materials Master Data", "Data Science & Analytics", "Data Governance, Quality & Architecture", "Hard Skill", "Enterprise Data"),
        ProtectedProperNoun("Master Data Governance", "Data Science & Analytics", "Data Governance, Quality & Architecture", "Hard Skill", "Enterprise Data"),
        ProtectedProperNoun("Master Production Scheduling", "Operations & Project Management", "Business Operations & Process Improvement", "Hard Skill", "Operations Planning"),
        ProtectedProperNoun("Scrum Master", "Operations & Project Management", "Project & Agile Management (PMP, Agile, Scrum)", "Hard Skill", "Agile"),
        ProtectedProperNoun("Professional Scrum Master", "Operations & Project Management", "Project & Agile Management (PMP, Agile, Scrum)", "Hard Skill", "Agile"),
        # Engineering & Technical Principles
        ProtectedProperNoun("SOLID Principles", "Software Engineering & IT", "Backend Development", "Hard Skill", "Software Architecture"),
        ProtectedProperNoun("Solid Edge", "Engineering & Construction", "Mechanical & MEP Engineering", "Tool / Software", "CAD"),
        ProtectedProperNoun("Solid State Drive", "Software Engineering & IT", "DevOps & Cloud Infrastructure", "Tool / Software", "Hardware"),
        ProtectedProperNoun("Solid Waste Management", "Engineering & Construction", "Civil & Structural Engineering", "Hard Skill", "Environmental"),
        ProtectedProperNoun("Solid Dosage Formulation", "Healthcare & Medical Sciences", "Pharmacy & Pharmaceutical Sales", "Hard Skill", "Pharma"),
        # AI & Machine Learning
        ProtectedProperNoun("Deep Learning", "Data Science & Analytics", "Artificial Intelligence & Deep Learning", "Hard Skill", "AI/ML"),
        ProtectedProperNoun("Deep Linking", "Software Engineering & IT", "Mobile Development", "Hard Skill", "Mobile"),
        ProtectedProperNoun("Deep Foundation Design", "Engineering & Construction", "Civil & Structural Engineering", "Hard Skill", "Civil"),
        ProtectedProperNoun("Deep Tissue Massage", "Healthcare & Medical Sciences", "Nursing & Allied Health Services", "Hard Skill", "Therapy"),
        ProtectedProperNoun("Deep-Dive Business Analysis", "Operations & Project Management", "Business Operations & Process Improvement", "Hard Skill", "Analysis"),
        # Additional Proper Nouns
        ProtectedProperNoun("Visual Basic", "Software Engineering & IT", "Backend Development", "Tool / Software", "Programming"),
        ProtectedProperNoun("Expert Systems", "Data Science & Analytics", "Artificial Intelligence & Deep Learning", "Hard Skill", "AI"),
        ProtectedProperNoun("Google Tag Manager", "Marketing & Sales", "Digital Marketing & Paid Ads (Performance Media)", "Tool / Software", "MarTech"),
        ProtectedProperNoun("Adobe Experience Manager", "Software Engineering & IT", "Frontend Development", "Tool / Software", "Enterprise CMS"),
    ]

    def __init__(self, acronym_engine: Optional[AcronymResolver] = None):
        self.acronym_engine = acronym_engine or AcronymResolver()
        self._exact_proper_nouns: Dict[str, ProtectedProperNoun] = {}
        self._init_registry()

    def _init_registry(self) -> None:
        for p in self.PROTECTED_PROPER_NOUNS_REGISTRY:
            key = p.canonical_name.strip().lower()
            self._exact_proper_nouns[key] = p

    def is_protected_proper_noun(self, text: str) -> bool:
        """
        Returns True if the text represents a protected proper noun or discipline.
        Must return False for unshielded modifier phrases like 'Advanced Python',
        'Intermediate SQL', 'Beginner React', etc.
        """
        if not text or not isinstance(text, str):
            return False

        clean = text.strip()
        if not clean:
            return False

        lower = clean.lower()
        if lower in self._exact_proper_nouns:
            return True

        # Check if known acronym exists in acronym dictionary with full name
        acronym_entry = self.acronym_engine.get_acronym(clean)
        if acronym_entry and acronym_entry.acronym.lower() == lower:
            # Acronyms like ADAS, ABAP, VCAP, DCACI are shielded
            if lower in {"adas", "abap", "vcap", "dcaci", "atp", "apt", "aes", "acls", "atls", "apra", "mdm", "mdb", "mcse", "vcdx"}:
                return True

        # Check specific discipline patterns
        # 1. Lead disciplines
        if re.fullmatch(r'lead\s+(generation|generation\s+campaigns|nurturing|scoring|qualification|tracking|conversion|routing|database\s+management|engagement|enrichment|time\s+analysis|time\s+reduction|shielding)', lower):
            return True
        if lower in {"cost per lead", "lead-to-cash"}:
            return True
        if re.search(r'\biso\s+(?:\d+\s+)?lead\s+(?:auditor|implementer)\b', lower):
            return True

        # 2. Senior disciplines
        if re.fullmatch(r'senior\s+(care|living|housing|decision\s+maker\s+selling)', lower):
            return True
        if lower in {"sales to senior decision makers", "senior-level recruitment"}:
            return True

        # 3. Advanced products
        if re.fullmatch(r'(?:(?:office\s+365|windows\s+defender|azure|github)\s+)?advanced\s+(?:threat\s+protection|security|analytics|planning\s+systems|diagnostic\s+procedures)', lower):
            return True
        if lower in {"office 365 atp", "windows defender atp", "azure atp"}:
            return True

        # 4. Master disciplines
        if re.fullmatch(r'master\s+(data|data\s+management|data\s+governance|production\s+scheduling|planning)', lower):
            return True
        if re.fullmatch(r'(?:professional\s+|agile[\s/])?scrum\s+master', lower):
            return True

        # 5. Solid concepts
        if re.fullmatch(r'solid\s+(principles?|edge|state\s+drive|waste\s+management|dosage\s+formulation)', lower):
            return True

        # 6. Deep concepts
        if re.fullmatch(r'deep\s+(learning|linking|foundation\s+design|tissue\s+massage)', lower) or lower == "deep-dive business analysis":
            return True

        return False

    def evaluate_pass_0(self, raw_skill: str) -> Pass0ShieldResult:
        """
        Evaluates a raw skill candidate against Pass 0 shields.
        """
        raw_clean = raw_skill.strip()
        if not raw_clean:
            return Pass0ShieldResult(is_shielded=False)

        norm_key = re.sub(r'\s+', ' ', raw_clean.lower())
        exact_entry = self._exact_proper_nouns.get(norm_key)
        if exact_entry:
            return Pass0ShieldResult(
                is_shielded=True,
                shielded_token=raw_clean,
                canonical_name=exact_entry.canonical_name,
                domain=exact_entry.domain,
                sub_category=exact_entry.sub_category,
                skill_type=exact_entry.skill_type,
                match_status=PROTECTED_PROPER_NOUN_STATUS,
                inhibit_level_stripping=True,
                inhibit_delimiter_splitting=True,
                shield_reason=f"Protected Proper Noun: {exact_entry.category}",
            )

        if self.is_protected_proper_noun(raw_clean):
            return Pass0ShieldResult(
                is_shielded=True,
                shielded_token=raw_clean,
                canonical_name=raw_clean,
                domain="Unknown",
                sub_category="Unknown",
                skill_type="Hard Skill",
                match_status=PROTECTED_PROPER_NOUN_STATUS,
                inhibit_level_stripping=True,
                inhibit_delimiter_splitting=True,
                shield_reason="Protected Proper Noun Pattern",
            )

        return Pass0ShieldResult(is_shielded=False)

    def should_inhibit_level_stripping(self, token: str, detected_keyword: str) -> bool:
        """
        Pass 4 Guardrail: Checks whether a detected level keyword (e.g. 'Lead', 'Senior',
        'Advanced', 'Master', 'Solid', 'Deep', 'Manager') is actually internal to a protected proper noun.
        """
        if not token or not detected_keyword or not isinstance(token, str) or not isinstance(detected_keyword, str):
            return False

        t_lower = token.lower().strip()
        kw_lower = detected_keyword.lower().strip()

        # Check if whole token is protected
        if self.is_protected_proper_noun(token):
            return True

        if kw_lower == "manager" and re.search(r'\b(?:google\s+tag\s+manager|adobe\s+experience\s+manager)\b', t_lower):
            return True

        # Check keyword-specific word boundaries inside compounds
        if kw_lower == "lead" and re.search(r'\blead\s+(?:generation|nurturing|scoring|tracking|conversion|routing|database|engagement|enrichment|quality|qualification|time|to\s*cash|shielding)\b', t_lower):
            return True

        if kw_lower == "senior" and re.search(r'\bsenior\s+(?:care|living|housing|decision\s+maker|level\s+recruitment)\b', t_lower):
            return True

        if kw_lower == "advanced" and re.search(r'\b(?:github\s+advanced\s+security|advanced\s+threat\s+protection|advanced\s+analytics|advanced\s+planning\s+systems|advanced\s+driver\s+assistance|advanced\s+business\s+application)\b', t_lower):
            return True

        if kw_lower in ("master", "mastery") and re.search(r'\b(?:master\s+data|scrum\s+master|master\s+planning|master\s+production\s+scheduling|materials\s+master\s+data)\b', t_lower):
            return True

        if kw_lower == "solid" and re.search(r'\b(?:solid\s+principles?|solid\s+edge|solid\s+state\s+drive|solid\s+waste|solid\s+dosage)\b', t_lower):
            return True

        if kw_lower == "deep" and re.search(r'\b(?:deep\s+learning|deep\s+linking|deep\s+foundation|deep\s+tissue|deep[\s\-]dive)\b', t_lower):
            return True

        return False

    def is_protected_compound(self, text: str) -> bool:
        """Checks whether slash/ampersand term is a protected compound."""
        if not text or not isinstance(text, str):
            return False
        clean = text.strip().lower()
        return clean in self.PROTECTED_COMPOUNDS


# Module-level singleton and functions
_DEFAULT_SHIELD = ProperNounShield()


def is_protected_proper_noun(text: str) -> bool:
    """Module-level function returning True if phrase is a protected proper noun or discipline."""
    if not text or not isinstance(text, str):
        return False
    return _DEFAULT_SHIELD.is_protected_proper_noun(text)


def is_protected_compound(text: str) -> bool:
    """Module-level function returning True if slash/ampersand term is a protected compound."""
    if not text or not isinstance(text, str):
        return False
    return _DEFAULT_SHIELD.is_protected_compound(text)
