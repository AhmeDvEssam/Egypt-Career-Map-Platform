# Handoff Report: Milestone 1 Features 2 & 3 Investigation
**Acronym & Level Matrix Loading, Pass 0 Proper Noun & Acronym Shielding**

- **Author**: `teamwork_explorer_m1_2`
- **Recipient**: `orchestrator` (`9fb895eb-cd95-4c72-b25c-179794097e37`)
- **Date**: 2026-11-03
- **Scope**: Feature 2 (Acronym & Level Matrix Loading) & Feature 3 (Pass 0 Proper Noun & Acronym Shielding)

---

## 1. Observation

Direct empirical observations from inspecting project files in `d:\Hire Q Project`:

### 1.1 `skills_acronym_dictionary.json`
- **File path**: `d:\Hire Q Project\skills_acronym_dictionary.json`
- **Total entries**: Exactly 386 JSON objects.
- **Key length distribution**:
  - 2 characters: 20 keys (`ux`, `ui`, `cx`, `dx`, `ai`, `ml`, `dl`, `bi`, `cv`, `ad`, `1g`, `od`, `en`, `ia`, `bs`, `v6`, `fi`, `pm`, `ps`, `da`)
  - 3 characters: 248 keys (e.g., `aws`, `gcp`, `sql`, `k8s`, `etl`, `crm`, `erp`, `seo`)
  - 4 characters: 82 keys (e.g., `html`, `saas`, `rest`, `scrum`, `poam`)
  - 5 characters: 13 keys (e.g., `tcp/ip`, `oauth`, `cipp/e`)
  - 6 to 8 characters: 23 keys (e.g., `pci-dss`, `ckad/cka`, `gmp/iso`)
- **Keys containing punctuation**: 29 keys contain punctuation (`/`, `&`, `-`), including compounds (`ui/ux`, `ci/cd`, `p&l`, `r&d`, `s&op`, `f&b`, `m&e`) and certifications/standards (`az-104`, `az-400`, `t-sql`, `pci-dss`, `gc-ms`).
- **Skill types in acronym dictionary**: 4 distinct types: `{'Hard Skill', 'Tool / Software', 'Certification', 'Methodology'}`.
  - Notice: `Methodology` appears in entries like `sdlc`, `tdd`, `bdd`, but is NOT one of the 5 controlled schema types (`Hard Skill`, `Soft Skill`, `Tool / Software`, `Language`, `Certification`).
- **Acronyms whose expansion contains level/role keywords**:
  - `DL`: Deep Learning
  - `MDB`: Master Data Bus
  - `MCSE`: Microsoft Certified Solutions Expert
  - `CIO`: Chief Information Officer
  - `CISO`: Chief Information Security Officer
  - `VCDX`: VMware Certified Design Expert
  - `AZ-400`: Azure DevOps Engineer Expert
  - `VCAP`: VMware Certified Advanced Professional
- **Acronyms colliding with common English words**: Exactly 3: `ad` (Active Directory), `en` (European Standards), `pm` (SAP Plant Maintenance).

### 1.2 `standard_skill_levels_matrix.csv`
- **File path**: `d:\Hire Q Project\standard_skill_levels_matrix.csv`
- **Total rows**: Exactly 23 data rows (semicolon-delimited `;`, UTF-8-sig).
- **Distribution across skill types**:
  - Rows 1–5: `Hard Skill` (`Expert`, `Advanced`, `Intermediate`, `Beginner`, `Not Specified`)
  - Rows 6–10: `Tool / Software` (`Expert`, `Advanced`, `Intermediate`, `Beginner`, `Not Specified`)
  - Rows 11–17: `Language` (`C2 (Mastery)`, `C1 (Fluent)`, `B2 (Upper Intermediate)`, `B1 (Intermediate)`, `A2 (Elementary)`, `A1 (Beginner)`, `Not Specified`)
  - Rows 18–20: `Certification` (`Active / Certified`, `Candidate / In Progress`, `Not Specified`)
  - Rows 21–23: `Soft Skill` (`High / Strong`, `Demonstrated`, `Not Specified`)
- **Specific conflations observed in matrix**:
  - Row 2: `\b(advanced|senior|lead|principal|high-level|extensive|solid)\b` mapped to `Advanced`.
  - Rows 11–14: Maps conversational words (`fluent`, `native`, `excellent`, `very good`, `good`) directly to CEFR levels (`C2`, `C1`, `B2`, `B1`).
  - Rows 21–22: Maps `strong`, `exceptional`, `proven`, `outstanding`, `solid` to `High / Strong` and `Demonstrated` for Soft Skills.

### 1.3 `skills.csv` Empirical Keyword Audit (28,824 Unique Raw Skills)
Inspection of `skills.csv` (column 1 `name`) for terms containing level and title keywords revealed:
- `lead`: 43 matches
- `senior`: 15 matches
- `advanced`: 29 matches
- `master`: 24 matches
- `solid`: 7 matches
- `deep`: 11 matches
- `manager`: 49 matches
- `director`: 10 matches
- `officer`: 5 matches
- `chief`: 4 matches
- `expert`: 11 matches
- `executive`: 41 matches
- `supervisor`: 5 matches
- `sr`: 1 match (`STN-SR`)
- `junior`: 2 matches

---

## 2. Logic Chain

### 2.1 The Need for Pass 0 Proper Noun Shielding
1. **Observation**: `skills.csv` contains 43 skills containing "Lead" (e.g., `Lead Generation`, `Lead Time Reduction`, `Lead Nurturing`, `ISO 27001 Lead Auditor`) and 15 skills containing "Senior" (e.g., `Senior Care`, `Senior Decision Maker Selling`).
2. **Observation**: A standard level extraction regex (such as Row 2 of `standard_skill_levels_matrix.csv`: `\b(advanced|senior|lead|principal)\b`) strips the keyword from the string.
3. **Deduction**: If level extraction runs naively without Pass 0:
   - `Lead Generation` -> `extracted_skill_level = "Lead"`, remaining token = `"Generation"`.
   - `"Generation"` fails exact catalog match, is classified as noise, and the multi-billion dollar discipline `Lead Generation` is destroyed.
   - `Lead Time Reduction` -> `extracted_skill_level = "Lead"`, remaining token = `"Time Reduction"`.
   - `Senior Care` -> `extracted_skill_level = "Senior"`, remaining token = `"Care"`.
   - `GitHub Advanced Security` -> `extracted_skill_level = "Advanced"`, remaining token = `"GitHub Security"`.
   - `SOLID Principles` -> `extracted_skill_level = "Solid"`, remaining token = `"Principles"`.
   - `Deep Learning` -> `extracted_skill_level = "Deep"`, remaining token = `"Learning"`.
4. **Conclusion**: A dedicated **Pass 0 Shielding Layer** must run before whole-skill catalog matching (Pass 1), parentheses analysis (Pass 2), delimiter splitting (Pass 3), and level extraction (Pass 4). Tokens recognized by Pass 0 are shielded so that internal keywords are NEVER extracted as level modifiers or stripped.

### 2.2 Reconciling `standard_skill_levels_matrix.csv` Legacy Conflations
1. **Observation**: Section 3 of `master_skill_level_governance_and_audit_specification_v3.md` and Section 8 of `ORIGINAL_REQUEST.md` resolve 5 critical governance rules:
   - Rule A (`Lead` / `Senior`): Standalone `Lead` and `Senior` are REJECTED as skill proficiency levels. They represent organizational hierarchy or role seniority, captured in sidecar `intra_string_seniority`, NEVER in `skill_level`.
   - Rule B (`Soft Skills`): Soft skills default to `skill_level = 'Not Specified'`. Verbatim expressions like `"Strong"` or `"Effective"` are preserved in `extracted_skill_level`, but canonical `skill_level` remains `'Not Specified'` to prevent metric inflation.
   - Rule C (`Ambiguous Modifiers`): Modifiers like `"Strong"`, `"Solid"`, `"Extensive"`, `"Hands-on"` default to `skill_level = 'Not Specified'`.
   - Rule D (`CEFR Language Codes`): CEFR ranks (`A1`–`C2`) are applied ONLY when the explicit CEFR alphanumeric code appears in the raw source (e.g., `English (B2)` -> `B2 (Upper Intermediate)`). Hyperbolic fluency terms (e.g., `Fluent English`) yield `extracted_skill_level = 'Fluent'`, `skill_level = 'Not Specified'`.
   - Rule E (`Certification Track vs. Status`): Tier names (`ISTQB Advanced Level`) set `extracted_skill_level = 'Advanced'`, `skill_level = 'Not Specified'`, and sidecar `credential_track_or_status = 'Advanced Level'`. Rows 18–20 of the matrix only recognize `Active / Certified`, `Candidate / In Progress`, `Not Specified`.
2. **Deduction**: Loading `standard_skill_levels_matrix.csv` must NOT be done naively as raw regexes. The loader must apply the audited 5-tier governance rules:
   - Hard Skill Row 2 regex must exclude standalone `senior`, `lead`, `solid`, `extensive`.
   - Soft Skill Rows 21–22 must map to canonical `'Not Specified'`.
   - Language Rows 11–14 must quarantine non-CEFR conversational terms to `'Not Specified'`.
   - Certification Rows 18–20 must remain distinct from technical proficiency tiers.

### 2.3 Acronym Engine Design & Boundary Safety
1. **Observation**: 386 acronym entries exist. 20 have length 2 (`ux`, `ui`, `ai`, `ad`, `en`, `pm`, etc.). 29 contain symbols (`ui/ux`, `ci/cd`, `p&l`, `r&d`, `az-400`, `t-sql`).
2. **Observation**: Python `\b` boundary behavior:
   - For purely alphanumeric acronyms (`AWS`, `SQL`, `ADAS`): `\b` works reliably.
   - For symbol-bearing acronyms (`C++`, `C#`, `PL/SQL`, `CI/CD`, `UI/UX`, `R&D`): `\b` fails at punctuation boundaries if trailing or leading character is non-word (e.g. `\bC++\b` fails because `+` is `\W`).
   - For collision-prone 2-letter tokens (`ad`, `en`, `pm`): case-insensitive regex `\b(ad|en|pm)\b` causes massive false matches in standard English text (e.g. "ad copy", "en route", "5 pm").
3. **Deduction**: The Acronym Lookup Engine must:
   - Provide exact normalized string lookup (`token.upper().strip()`).
   - Support case-sensitive matching for short collision-prone tokens (`AD`, `EN`, `PM`).
   - Normalize `skill_type: "Methodology"` to `"Hard Skill"`.
   - Provide bidirectional mapping: Acronym -> Full Name (`AWS` -> `Amazon Web Services`) and Full Name -> Acronym (`Amazon Web Services` -> `AWS`), enabling Pass 2 parentheses classification.

---

## 3. Caveats

1. **Dual Meaning of Certain Acronyms**:
   - `MDM` in `skills_acronym_dictionary.json` is mapped to `MobileIron` (Mobile Device Management) under Software Engineering. In `skills.csv`, `MDM` also appears as `Master Data Management (MDM)` under Data Science. The engine must support catalog-linked resolution when surrounding context specifies the domain.
   - `SME` appears in `skills.csv` as `Small and Medium Enterprises` (e.g. `SME Banking`, `SME Lending`), whereas in `standard_skill_levels_matrix.csv` Row 1, `sme` was listed as `Subject Matter Expert`. Contextual domain weighting prevents improper level stripping.
2. **Parenthetical Compounds with Proper Nouns**:
   - In cases like `Advanced Excel (Cost & Quantity Tracking)`, `Advanced` is a true proficiency level modifier on `Excel`, NOT a proper noun. The shielding engine must distinguish between `Advanced Threat Protection` (whole noun shielded) and `Advanced Excel` (level modifier extracted).
3. **Catalog Overlap**:
   - Some protected proper nouns exist in `standard_skills_catalog.csv` (`Lead Generation`, `Lead Generation Campaigns`, `Master Data Management`, `SOLID Principles`, `Deep Learning`), while others are novel (`Lead Time Reduction`, `Senior Care`, `Advanced Threat Protection`, `GitHub Advanced Security`). Pass 0 protects both catalog-matched and novel proper nouns.

---

## 4. Conclusion & Technical Specification

### 4.1 Master Enumeration of Protected Proper Nouns in `skills.csv`

The following verified inventory of multi-word proper nouns, business disciplines, and software tools in `skills.csv` must be shielded from level/role stripping:

| Category | Canonical Protected Name | Sample `skills.csv` Expressions | Domain | Subcategory | Skill Type |
|---|---|---|---|---|---|
| **Sales Prospecting** | `Lead Generation` | `Lead Generation`, `Lead Generation Campaigns`, `Lead Generation & Outreach`, `Cold Calling & Lead Generation`, `Digital Marketing & Lead Generation`, `Prospecting & Lead Generation`, `SaaS Lead Generation` | Marketing & Sales | B2B Sales & Business Development | Hard Skill |
| **Sales Discipline** | `Lead Nurturing` | `Lead Nurturing` | Marketing & Sales | B2B Sales & Business Development | Hard Skill |
| **Sales Discipline** | `Lead Scoring` | `Lead Scoring` | Marketing & Sales | B2B Sales & Business Development | Hard Skill |
| **Sales Discipline** | `Lead Qualification` | `Lead Qualification`, `Lead qualification`, `Lead Generation & Qualification` | Marketing & Sales | B2B Sales & Business Development | Hard Skill |
| **Sales Discipline** | `Lead Tracking` | `Lead Tracking`, `Lead & Listing Management`, `Lead & Client Record Management` | Marketing & Sales | B2B Sales & Business Development | Hard Skill |
| **Sales Discipline** | `Lead Conversion` | `Lead Conversion`, `Lead Routing`, `Lead Database Management`, `Lead Engagement`, `Lead Enrichment` | Marketing & Sales | B2B Sales & Business Development | Hard Skill |
| **Sales Economics** | `Cost Per Lead` | `Cost Per Lead`, `Cost Per Lead Optimization`, `Cost Per Action/Lead Analysis` | Marketing & Sales | Digital Marketing & Paid Ads | Hard Skill |
| **Commercial Strategy** | `Lead-to-Cash` | `Lead-to-Cash`, `Marketing-to-Lead` | Marketing & Sales | B2B Sales & Business Development | Hard Skill |
| **Supply Chain / SCM** | `Lead Time Analysis` | `Lead Time Analysis` | Supply Chain & Logistics | Supply Chain Planning & Demand Forecasting | Hard Skill |
| **Supply Chain / SCM** | `Lead Time Reduction` | `Lead Time Reduction` | Operations & Project Management | Business Operations & Process Improvement | Hard Skill |
| **Physical Safety** | `Lead Shielding` | `Radiation Protection & Lead Shielding` | Engineering & Construction | Health, Safety & Environment (HSE) | Hard Skill |
| **ISO Auditing** | `ISO Lead Auditor` | `ISO 9001 Lead Auditor`, `ISO 27001 Lead Auditor`, `ISO 22301 Lead Auditor`, `ISO 45001 Lead Auditor`, `ISO Lead Auditor Certification` | Operations & Project Management | Quality Assurance & Quality Control | Certification |
| **ISO Implementation** | `ISO Lead Implementer` | `ISO 22301 Lead Implementer`, `ISO 27001 Lead Implementer` | Operations & Project Management | Quality Assurance & Quality Control | Certification |
| **Healthcare** | `Senior Care` | `Senior Care`, `Senior Living` | Healthcare & Medical Services | Nursing & Patient Care | Hard Skill |
| **Commercial Strategy** | `Senior Decision Maker Selling` | `Senior Decision Maker Selling`, `Sales to Senior Decision Makers` | Marketing & Sales | B2B Sales & Business Development | Hard Skill |
| **Recruitment** | `Senior-Level Recruitment` | `Senior-Level Recruitment` | Human Resources | Talent Acquisition & Recruiting | Hard Skill |
| **Cybersecurity** | `Advanced Threat Protection` | `Advanced Threat Protection`, `Office 365 ATP`, `Windows Defender ATP` | Software Engineering & IT | Cybersecurity & Information Security | Tool / Software |
| **DevSecOps** | `GitHub Advanced Security` | `GitHub Actions/GitHub Advanced Security`, `GitHub Advanced Security` | Software Engineering & IT | DevOps & Cloud Infrastructure | Tool / Software |
| **Enterprise Software** | `ABAP` | `ABAP (Advanced Business Application Programming)`, `SAP ABAP` | Software Engineering & IT | Enterprise Systems (ERP / CRM) | Hard Skill |
| **Automotive AI** | `ADAS` | `ADAS`, `Advanced Driver Assistance Systems` | Engineering & Construction | Automotive Engineering | Hard Skill |
| **Cloud Infrastructure** | `DCACI` | `DCACI (Certified Cloud Advanced Infrastructure)` | Software Engineering & IT | DevOps & Cloud Infrastructure | Certification |
| **Cloud Infrastructure** | `VCAP` | `VMware Certified Advanced Professional (VCAP)` | Software Engineering & IT | DevOps & Cloud Infrastructure | Certification |
| **Data Analytics** | `Advanced Analytics` | `Advanced Analytics` | Data Science & Analytics | Data Analytics & Reporting | Hard Skill |
| **Supply Chain** | `Advanced Planning Systems` | `advanced planning systems` | Supply Chain & Logistics | Supply Chain Planning & Demand Forecasting | Hard Skill |
| **Medical Diagnostics** | `Advanced Diagnostic Procedures`| `Advanced Diagnostic Procedures` | Healthcare & Medical Services | Medical Practice & Clinical Procedures | Hard Skill |
| **Enterprise Data** | `Master Data Management` | `Master Data Management`, `Master Data Management (MDM)`, `Master Data Management (MDM) Design`, `Master Data Management (MDM) Distribution`, `Master Data`, `Master Data Governance`, `Master Data Lifecycle Management`, `Master Data Bus (MDB)` | Data Science & Analytics | Data Governance, Quality & Architecture | Hard Skill |
| **Enterprise Data** | `Materials Master Data` | `Materials Master Data Domain`, `Materials master data`, `Supplier Master Data`, `Customer Master File Maintenance`, `ERP master data integrity` | Data Science & Analytics | Data Governance, Quality & Architecture | Hard Skill |
| **Operations Planning** | `Master Production Scheduling` | `Master Planning`, `Master Production Scheduling`, `MPS (Master Production Scheduling)` | Operations & Project Management | Business Operations & Process Improvement | Hard Skill |
| **Agile Framework** | `Scrum Master` | `Scrum Master`, `Agile/Scrum Master`, `Professional Scrum Master` | Operations & Project Management | Agile & Scrum Methodologies | Hard Skill |
| **Software Architecture**| `SOLID Principles` | `SOLID Principles`, `SOLID principles` | Software Engineering & IT | Backend Development | Hard Skill |
| **Engineering CAD** | `Solid Edge` | `Solid Edge (CAD Software)`, `Solid Edge` | Engineering & Construction | Mechanical Engineering | Tool / Software |
| **Hardware / Storage** | `Solid State Drive` | `Solid State Drive` | Software Engineering & IT | DevOps & Cloud Infrastructure | Tool / Software |
| **Pharma Formulation** | `Solid Dosage Formulation` | `Solid Dosage Formulation`, `Solid Oral Dosages` | Healthcare & Medical Services | Pharmaceuticals & Clinical Research | Hard Skill |
| **Civil / Environmental** | `Solid Waste Management` | `Solid Waste Management` | Engineering & Construction | Civil & Structural Engineering | Hard Skill |
| **AI / Machine Learning** | `Deep Learning` | `Deep Learning`, `Deep Learning for Vision`, `Computer Vision & Deep Learning Algorithms`, `Machine Learning & Deep Learning` | Data Science & Analytics | Artificial Intelligence & Deep Learning | Hard Skill |
| **Mobile Architecture** | `Deep Linking` | `Deep Linking` | Software Engineering & IT | Mobile Development | Hard Skill |
| **Geotechnical Eng.** | `Deep Foundation Design` | `Deep Foundation Design` | Engineering & Construction | Civil & Structural Engineering | Hard Skill |
| **Physical Therapy** | `Deep Tissue Massage` | `Deep Tissue Massage` | Healthcare & Medical Services | Therapy & Rehabilitation | Hard Skill |
| **Analytical Methods** | `Deep-Dive Business Analysis` | `Deep-Dive Business Analysis`, `Technical Deep Dive`, `Deep Dive Analysis` | Operations & Project Management | Business Operations & Process Improvement | Hard Skill |
| **Marketing Software** | `Google Tag Manager` | `Google Tag Manager`, `Google Tag Manager (GTM)` | Marketing & Sales | Digital Marketing & Paid Ads | Tool / Software |
| **Digital Experience** | `Adobe Experience Manager` | `Adobe Experience Manager`, `Adobe Experience Manager (AEM)` | Marketing & Sales | Digital Marketing & Paid Ads | Tool / Software |
| **Social Ad Tools** | `Ads Manager` | `Meta Ads Manager`, `Facebook Ads Manager`, `Ads Manager`, `LinkedIn Campaign Manager`, `TikTok Ads Manager` | Marketing & Sales | Digital Marketing & Paid Ads | Tool / Software |
| **Endpoint Systems** | `Microsoft Configuration Manager` | `Microsoft Endpoint Configuration Manager`, `Microsoft Configuration Manager`, `Microsoft System Center Operations Manager` | Software Engineering & IT | DevOps & Cloud Infrastructure | Tool / Software |
| **Developer Tools** | `Swift Package Manager` | `Swift Package Manager` | Software Engineering & IT | Mobile Development | Tool / Software |
| **Virtualization Tools** | `Citrix Director` | `Citrix Director`, `VMware Cloud Director`, `VMware vCloud Director`, `Oracle Traffic Director` | Software Engineering & IT | DevOps & Cloud Infrastructure | Tool / Software |
| **Executive Governance** | `Chief Information Security Officer` | `Chief Information Security Officer (CISO)`, `Chief Information Officer (CIO)`, `Chief Data Protection Officer`, `Chief Mate Certification` | Software Engineering & IT | Cybersecurity & Information Security | Hard Skill |
| **Corporate Sales** | `Account Executive` | `Account Executive`, `Executive Assistant`, `Executive Administration`, `Executive Compensation` | Marketing & Sales | B2B Sales & Business Development | Hard Skill |

---

### 4.2 Exact Class Design: `linguistic_intelligence/proper_nouns.py`

```python
"""
Linguistic Intelligence — Pass 0 Proper Noun & Acronym Shielding Engine
========================================================================
Shields multi-word proper nouns, business disciplines, software products,
and acronyms containing title/level keywords from naive stripping.
"""

from dataclasses import dataclass, field
from typing import Dict, List, Optional, Set, Tuple
import json
import re


@dataclass(frozen=True)
class ProtectedProperNoun:
    """Canonical representation of a protected proper noun or discipline."""
    canonical_name: str
    domain: str
    sub_category: str
    skill_type: str
    category: str
    match_status: str = "PROTECTED_PROPER_NOUN"


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


class AcronymEngine:
    """
    Ingests and queries skills_acronym_dictionary.json (386 entries).
    Provides bidirectional lookup, expansion, and boundary-safe detection.
    """
    COLLISION_PRONE_ACRONYMS = {"AD", "EN", "PM"}

    def __init__(self, acronym_dict_path: str):
        self.acronym_dict_path = acronym_dict_path
        self._by_lower_key: Dict[str, AcronymEntry] = {}
        self._by_exact_acronym: Dict[str, AcronymEntry] = {}
        self._by_lower_full_name: Dict[str, AcronymEntry] = {}
        self._load()

    def _load(self) -> None:
        with open(self.acronym_dict_path, "r", encoding="utf-8") as f:
            raw_data = json.load(f)

        for key, entry in raw_data.items():
            # Controlled 5-type normalization: Methodology -> Hard Skill
            stype = entry.get("skill_type", "Hard Skill")
            if stype == "Methodology":
                stype = "Hard Skill"

            acronym_obj = AcronymEntry(
                acronym=entry.get("acronym", key.upper()),
                full_name=entry.get("full_name", ""),
                canonical_skill_name=entry.get("canonical_skill_name", entry.get("full_name", "")),
                domain=entry.get("domain", "Unknown"),
                sub_category=entry.get("sub_category", "Unknown"),
                skill_type=stype,
                source=entry.get("source", "Dictionary")
            )
            k_lower = key.strip().lower()
            self._by_lower_key[k_lower] = acronym_obj
            self._by_exact_acronym[acronym_obj.acronym] = acronym_obj

            if acronym_obj.full_name:
                self._by_lower_full_name[acronym_obj.full_name.strip().lower()] = acronym_obj

    def get_entry(self, token: str) -> Optional[AcronymEntry]:
        """Looks up an acronym entry taking into account collision safety."""
        t_clean = token.strip()
        if not t_clean:
            return None

        # Short collision-prone acronyms must match exact casing
        if t_clean.upper() in self.COLLISION_PRONE_ACRONYMS:
            if t_clean != t_clean.upper():
                return None
            return self._by_exact_acronym.get(t_clean)

        return self._by_lower_key.get(t_clean.lower())

    def expand(self, token: str) -> Optional[str]:
        entry = self.get_entry(token)
        return entry.full_name if entry else None

    def is_acronym_expansion_pair(self, token_a: str, token_b: str) -> bool:
        """Checks if token_a is an acronym for token_b or vice versa."""
        a_clean = token_a.strip().lower()
        b_clean = token_b.strip().lower()

        # Check if a is acronym for b
        entry_a = self.get_entry(token_a)
        if entry_a and entry_a.full_name.strip().lower() == b_clean:
            return True

        # Check if b is acronym for a
        entry_b = self.get_entry(token_b)
        if entry_b and entry_b.full_name.strip().lower() == a_clean:
            return True

        # Fallback to algorithmic initialism
        words_b = [w for w in re.split(r'[\s\-]+', b_clean) if w not in ('of', 'and', 'the', 'for', 'in', 'to', '&')]
        if ''.join(w[0] for w in words_b if w) == a_clean:
            return True

        words_a = [w for w in re.split(r'[\s\-]+', a_clean) if w not in ('of', 'and', 'the', 'for', 'in', 'to', '&')]
        if ''.join(w[0] for w in words_a if w) == b_clean:
            return True

        return False


class ProperNounShieldEngine:
    """
    Pass 0 Proper Noun Shielding Engine:
    Maintains the lookup structures and regex boundaries that protect
    multi-word business disciplines, certifications, and proper nouns
    from having level words or role titles stripped.
    """
    def __init__(self, acronym_engine: Optional[AcronymEngine] = None):
        self.acronym_engine = acronym_engine
        self._exact_proper_nouns: Dict[str, ProtectedProperNoun] = {}
        self._pattern_proper_nouns: List[Tuple[re.Pattern, ProtectedProperNoun]] = []
        self._init_registry()

    def _init_registry(self) -> None:
        """Registers all audited protected proper noun terms and phrase patterns."""
        # 1. Register Exact Normalized Terms
        ...
        # 2. Register Contextual Phrase Regex Patterns
        ...

    def evaluate_pass_0(self, raw_skill: str) -> Pass0ShieldResult:
        """
        Executes Pass 0 on a candidate string.
        Returns a Pass0ShieldResult indicating if the token is fully shielded.
        """
        raw_clean = raw_skill.strip()
        if not raw_clean:
            return Pass0ShieldResult(is_shielded=False)

        # 1. Exact proper noun lookup
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
                match_status="PROTECTED_PROPER_NOUN",
                inhibit_level_stripping=True,
                inhibit_delimiter_splitting=True,
                shield_reason=f"Protected Proper Noun: {exact_entry.category}"
            )

        # 2. Pattern-based proper noun lookup
        for pat, p_entry in self._pattern_proper_nouns:
            if pat.fullmatch(raw_clean):
                return Pass0ShieldResult(
                    is_shielded=True,
                    shielded_token=raw_clean,
                    canonical_name=p_entry.canonical_name,
                    domain=p_entry.domain,
                    sub_category=p_entry.sub_category,
                    skill_type=p_entry.skill_type,
                    match_status="PROTECTED_PROPER_NOUN",
                    inhibit_level_stripping=True,
                    inhibit_delimiter_splitting=True,
                    shield_reason=f"Protected Proper Noun Pattern: {p_entry.category}"
                )

        return Pass0ShieldResult(is_shielded=False)

    def should_inhibit_level_stripping(self, token: str, detected_keyword: str) -> bool:
        """
        Pass 4 Guardrail: Checks whether a detected level keyword (e.g. 'Lead', 'Senior',
        'Advanced', 'Master', 'Solid', 'Deep') is actually internal to a protected proper noun.
        """
        t_lower = token.lower().strip()
        kw_lower = detected_keyword.lower().strip()

        # Check if the token matches any protected proper noun
        if self.evaluate_pass_0(token).is_shielded:
            return True

        # Check specific word-boundary protections
        if kw_lower == "lead" and re.search(r'\blead\s+(?:generation|nurturing|scoring|tracking|conversion|routing|database|engagement|enrichment|quality|qualification|time|to\s*cash)\b', t_lower):
            return True

        if kw_lower == "senior" and re.search(r'\bsenior\s+(?:care|living|decision\s+maker|level\s+recruitment)\b', t_lower):
            return True

        if kw_lower == "advanced" and re.search(r'\b(?:github\s+advanced\s+security|advanced\s+threat\s+protection|advanced\s+analytics|advanced\s+planning\s+systems)\b', t_lower):
            return True

        if kw_lower in ("master", "mastery") and re.search(r'\b(?:master\s+data|scrum\s+master|master\s+planning|master\s+production\s+scheduling|master\s+clock)\b', t_lower):
            return True

        if kw_lower == "solid" and re.search(r'\b(?:solid\s+principles?|solid\s+edge|solid\s+state\s+drive|solid\s+waste|solid\s+dosage)\b', t_lower):
            return True

        if kw_lower == "deep" and re.search(r'\b(?:deep\s+learning|deep\s+linking|deep\s+foundation|deep\s+tissue|deep[\s\-]dive)\b', t_lower):
            return True

        return False
```

---

## 5. Verification Method

To independently verify all findings and designs:

### 5.1 Verification Commands
1. **Verify Acronym Dictionary count and properties**:
   ```powershell
   python -c "import json; d=json.load(open('skills_acronym_dictionary.json', encoding='utf-8')); print('Total:', len(d)); assert len(d) == 386"
   ```
2. **Verify Level Matrix rows and legacy conflations**:
   ```powershell
   python -c "import csv; r=list(csv.reader(open('standard_skill_levels_matrix.csv', encoding='utf-8-sig'), delimiter=';')); print('Rows:', len(r)-1); assert len(r)-1 == 23"
   ```
3. **Verify Protected Proper Nouns in `skills.csv`**:
   ```powershell
   python -c "import csv, re; s=[row[1].strip() for row in csv.reader(open('skills.csv', encoding='utf-8')) if len(row)>1]; print('Lead skills:', len([x for x in s if re.search(r'\blead\b', x.lower())]))"
   ```
4. **Unit Test Pass 0 Shielding on Benchmark Traces**:
   - Trace 8: `"Lead Generation"` -> `should_inhibit_level_stripping("Lead Generation", "Lead") == True`.
   - Trace 9: `"Lead Time Reduction"` -> `should_inhibit_level_stripping("Lead Time Reduction", "Lead") == True`.
   - Trace 1: `"Advanced Python"` -> `should_inhibit_level_stripping("Advanced Python", "Advanced") == False` (Level stripped).
   - Trace 11: `"Senior C++ Engineer"` -> `should_inhibit_level_stripping("Senior C++ Engineer", "Senior") == False` (Role seniority extracted to sidecar).

### 5.2 Invalidation Conditions
- If any skill expression in `skills.csv` containing a protected discipline (`Lead Generation`, `Lead Time Reduction`, `Senior Care`, `GitHub Advanced Security`) has its defining noun stripped into `extracted_skill_level` or rejected as noise, the Pass 0 implementation is invalid.
- If `standard_skill_levels_matrix.csv` loader assigns `skill_level = 'Advanced'` to standalone `senior` or `lead`, or assigns canonical level ranks to soft skills, the implementation violates the audited governance specification.
