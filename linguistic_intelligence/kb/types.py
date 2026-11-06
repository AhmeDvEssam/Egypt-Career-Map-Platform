"""
Linguistic Intelligence — Milestone 3.0 Knowledge Types & Entities
===================================================================
Defines strongly-typed, deeply immutable dataclasses and controlled enums for:
  - Lexical entries and surface forms (Layer 1)
  - Morphological relationships and derivational families (Layer 2)
  - Multi-word requirement frame definitions & occurrences (Layer 3)
  - Domain concepts and contextual polysemy mappings (Layer 4)
  - Governed skill level entries (Consumable by M3.2)
  - Empirical corpus evidence and version metadata
  - Multilingual text normalization contracts (Readiness for M3.4+)

CRITICAL ARCHITECTURAL INVARIANTS:
  1. Morphological relationship != semantic equivalence (Develop != Developer != Development).
  2. Discovered candidate != approved knowledge (LifecycleStatus publication gating).
  3. Unknown term != missing skill (ConceptType controlled taxonomy).
  4. Original text is strictly immutable across all normalization transformations.
  5. Deep Immutability: All nested mappings are frozen via MappingProxyType, sequences via tuples.
  6. Empirical counts are distinct: Raw Occurrences >= Distinct Sections >= Distinct Jobs >= 0.
"""

from __future__ import annotations

from collections.abc import Mapping, Sequence, Set
from dataclasses import dataclass, field
from enum import Enum
from types import MappingProxyType
from typing import Any, Dict, List, Optional, Tuple, Union


# ==============================================================================
# 0. Deep Immutability Helper
# ==============================================================================


def freeze_value(val: Any) -> Any:
    """Recursively freeze mappings into MappingProxyType and sequences into tuples.
    
    Guarantees deep immutability for metadata, features, and nested configuration.
    Any attempt to mutate nested dictionaries (e.g. entry.metadata['key'] = 'val')
    raises TypeError: 'mappingproxy' object does not support item assignment.
    """
    if val is None:
        return None
    if isinstance(val, (str, bytes, int, float, bool)):
        return val
    if isinstance(val, Mapping):
        return MappingProxyType({k: freeze_value(v) for k, v in val.items()})
    if isinstance(val, (list, tuple, set)):
        return tuple(freeze_value(v) for v in val)
    return val


# ==============================================================================
# 1. Controlled Enums
# ==============================================================================


class ConceptType(str, Enum):
    """Controlled ontological classification for domain concepts.
    
    Prevents uncataloged terms from being blindly classified as 'skills'.
    """
    SKILL = "SKILL"
    TECHNOLOGY = "TECHNOLOGY"
    TOOL = "TOOL"
    PROFESSIONAL_DISCIPLINE = "PROFESSIONAL_DISCIPLINE"
    OCCUPATION = "OCCUPATION"
    BUSINESS_ACTIVITY = "BUSINESS_ACTIVITY"
    RESPONSIBILITY = "RESPONSIBILITY"
    INDUSTRY = "INDUSTRY"
    KNOWLEDGE_AREA = "KNOWLEDGE_AREA"
    LANGUAGE = "LANGUAGE"
    CERTIFICATION = "CERTIFICATION"
    OTHER = "OTHER"


class FrameComplement(str, Enum):
    """Expected syntactic complement structure governed by a requirement frame."""
    NOUN_PHRASE = "NOUN_PHRASE"
    VERB_PHRASE = "VERB_PHRASE"
    GERUND_PHRASE = "GERUND_PHRASE"
    PREPOSITIONAL_PHRASE = "PREPOSITIONAL_PHRASE"
    CLAUSE = "CLAUSE"
    OTHER = "OTHER"


class MorphologyRelationType(str, Enum):
    """Linguistic relationship type connecting lexical entries."""
    INFLECTION = "INFLECTION"
    DERIVATION = "DERIVATION"
    COMPOUND_FORM = "COMPOUND_FORM"
    OTHER = "OTHER"


class DerivationType(str, Enum):
    """Specific grammatical category shift in derivational morphology."""
    AGENT_NOUN = "AGENT_NOUN"        # e.g. develop -> developer, analyze -> analyst
    ABSTRACT_NOUN = "ABSTRACT_NOUN"  # e.g. develop -> development, manage -> management
    ADJECTIVAL_FORM = "ADJECTIVAL_FORM"  # e.g. analyze -> analytical, manage -> managerial
    GERUND = "GERUND"                # e.g. develop -> developing, design -> designing
    OTHER = "OTHER"


class NormalizationStatus(str, Enum):
    """Outcome status of multilingual text normalization."""
    SUCCESS = "SUCCESS"              # Text was translated or normalized
    PASSTHROUGH = "PASSTHROUGH"      # Text already in target language; unchanged
    FAILED = "FAILED"                # Normalization encountered error; original preserved
    UNSUPPORTED = "UNSUPPORTED"      # Language/script detected but unsupported


class LifecycleStatus(str, Enum):
    """Knowledge governance and publication lifecycle."""
    DRAFT = "DRAFT"
    PROPOSED = "PROPOSED"
    APPROVED = "APPROVED"
    DEPRECATED = "DEPRECATED"
    REJECTED = "REJECTED"


class LexicalFormType(str, Enum):
    """Realization type of a lexical surface form."""
    LEMMA = "LEMMA"
    INFLECTION = "INFLECTION"
    SURFACE_VARIANT = "SURFACE_VARIANT"
    ACRONYM = "ACRONYM"
    ABBREVIATION = "ABBREVIATION"
    OTHER = "OTHER"


class MappingType(str, Enum):
    """Semantic precision of concept-to-lexical mapping."""
    EXACT = "EXACT"
    BROADER = "BROADER"
    NARROWER = "NARROWER"
    RELATED = "RELATED"


class CountingScope(str, Enum):
    """Scope boundaries for empirical evidence aggregation."""
    CORPUS_SNAPSHOT = "CORPUS_SNAPSHOT"
    TIME_WINDOW = "TIME_WINDOW"
    SOURCE_PARTITION = "SOURCE_PARTITION"


# ==============================================================================
# 2. Immutable Core Knowledge Dataclasses
# ==============================================================================


@dataclass(frozen=True)
class LexicalForm:
    """Surface realization of a lexical entry.
    
    Preserves verbatim orthography, casing, and inflected forms.
    Guarantees deep immutability for grammatical features.
    """
    form: str
    normalized_form: str
    form_type: LexicalFormType = LexicalFormType.LEMMA
    grammatical_features: Mapping[str, Any] = field(default_factory=dict)

    def __post_init__(self) -> None:
        if not self.form or not self.form.strip():
            raise ValueError("LexicalForm 'form' cannot be empty or whitespace.")
        if not self.normalized_form or not self.normalized_form.strip():
            raise ValueError("LexicalForm 'normalized_form' cannot be empty or whitespace.")
        object.__setattr__(
            self,
            "grammatical_features",
            freeze_value(self.grammatical_features if self.grammatical_features is not None else {}),
        )


@dataclass(frozen=True)
class LexicalEntry:
    """A linguistic lexical unit (Layer 1 of Linguistic KB).
    
    Represents an English or Arabic word/phrase with its lemma, language,
    parts of speech, and surface forms. Independent of domain concepts.
    Guarantees deep immutability for pos, surface_forms, and metadata.
    """
    lexical_id: str
    lemma: str
    language: str
    pos: Tuple[str, ...]
    surface_forms: Tuple[LexicalForm, ...] = field(default_factory=tuple)
    metadata: Mapping[str, Any] = field(default_factory=dict)

    def __post_init__(self) -> None:
        if not self.lexical_id or not self.lexical_id.strip():
            raise ValueError("LexicalEntry 'lexical_id' cannot be empty.")
        if not self.lemma or not self.lemma.strip():
            raise ValueError("LexicalEntry 'lemma' cannot be empty.")
        if not self.language or not self.language.strip():
            raise ValueError("LexicalEntry 'language' cannot be empty.")
        object.__setattr__(self, "pos", tuple(self.pos) if self.pos is not None else ())
        object.__setattr__(
            self, "surface_forms", tuple(self.surface_forms) if self.surface_forms is not None else ()
        )
        object.__setattr__(
            self, "metadata", freeze_value(self.metadata if self.metadata is not None else {})
        )
        if not self.pos:
            raise ValueError("LexicalEntry must define at least one part-of-speech tag.")


@dataclass(frozen=True)
class MorphologicalRelation:
    """Linguistic relationship between lexical entries (Layer 2).
    
    CRITICAL: Derivation does NOT imply semantic equivalence.
    'developer' (AGENT_NOUN) derives from 'develop' (VERB), but they
    represent distinct semantic concepts.
    """
    relation_id: str
    source_lexical_id: str
    target_lexical_id: str
    relation_type: MorphologyRelationType
    derivation_type: Optional[DerivationType] = None
    metadata: Mapping[str, Any] = field(default_factory=dict)

    def __post_init__(self) -> None:
        if not self.relation_id or not self.relation_id.strip():
            raise ValueError("MorphologicalRelation 'relation_id' cannot be empty.")
        if not self.source_lexical_id or not self.source_lexical_id.strip():
            raise ValueError("MorphologicalRelation 'source_lexical_id' cannot be empty.")
        if not self.target_lexical_id or not self.target_lexical_id.strip():
            raise ValueError("MorphologicalRelation 'target_lexical_id' cannot be empty.")
        if self.source_lexical_id == self.target_lexical_id:
            raise ValueError(
                f"Source and target lexical IDs cannot be identical ('{self.source_lexical_id}')."
            )
        if self.relation_type == MorphologyRelationType.DERIVATION and self.derivation_type is None:
            object.__setattr__(self, "derivation_type", DerivationType.OTHER)
        object.__setattr__(
            self, "metadata", freeze_value(self.metadata if self.metadata is not None else {})
        )


@dataclass(frozen=True)
class ConceptAssociation:
    """Domain and subcategory mapping with priority weight for a concept."""
    domain: str
    sub_category: Optional[str] = None
    priority_weight: float = 1.0

    def __post_init__(self) -> None:
        if not self.domain or not self.domain.strip():
            raise ValueError("ConceptAssociation 'domain' cannot be empty.")
        if self.priority_weight < 0:
            raise ValueError("ConceptAssociation 'priority_weight' cannot be negative.")


@dataclass(frozen=True)
class DomainConcept:
    """A professional, labor-market, or technical concept (Layer 4).
    
    Represents an entity in the labor market ontology (Skill, Tool, Discipline, etc.).
    Guarantees deep immutability for domains, aliases, and metadata.
    """
    concept_id: str
    canonical_name: str
    concept_type: ConceptType
    description: Optional[str] = None
    domains: Tuple[ConceptAssociation, ...] = field(default_factory=tuple)
    aliases: Tuple[str, ...] = field(default_factory=tuple)
    status: LifecycleStatus = LifecycleStatus.APPROVED
    metadata: Mapping[str, Any] = field(default_factory=dict)

    def __post_init__(self) -> None:
        if not self.concept_id or not self.concept_id.strip():
            raise ValueError("DomainConcept 'concept_id' cannot be empty.")
        if not self.canonical_name or not self.canonical_name.strip():
            raise ValueError("DomainConcept 'canonical_name' cannot be empty.")
        object.__setattr__(self, "domains", tuple(self.domains) if self.domains is not None else ())
        object.__setattr__(self, "aliases", tuple(self.aliases) if self.aliases is not None else ())
        object.__setattr__(
            self, "metadata", freeze_value(self.metadata if self.metadata is not None else {})
        )


@dataclass(frozen=True)
class ConceptLexicalMapping:
    """Explicit mapping connecting a LexicalEntry to a DomainConcept.
    
    Supports:
      - 1-to-many: Lexical entry 'pipeline' -> Software 'CI/CD Pipeline' OR Data 'Data Pipeline'
      - many-to-1: Lexical entries 'Python 3', 'Python', 'Python Language' -> Concept 'Python'
      - Context-specific domain conditioning.
    """
    mapping_id: str
    concept_id: str
    lexical_id: str
    mapping_type: MappingType = MappingType.EXACT
    context_domain: Optional[str] = None
    confidence: float = 1.0
    metadata: Mapping[str, Any] = field(default_factory=dict)

    def __post_init__(self) -> None:
        if not self.mapping_id or not self.mapping_id.strip():
            raise ValueError("ConceptLexicalMapping 'mapping_id' cannot be empty.")
        if not self.concept_id or not self.concept_id.strip():
            raise ValueError("ConceptLexicalMapping 'concept_id' cannot be empty.")
        if not self.lexical_id or not self.lexical_id.strip():
            raise ValueError("ConceptLexicalMapping 'lexical_id' cannot be empty.")
        if not (0.0 <= self.confidence <= 1.0):
            raise ValueError(f"Confidence score must be between 0.0 and 1.0, got {self.confidence}")
        object.__setattr__(
            self, "metadata", freeze_value(self.metadata if self.metadata is not None else {})
        )


@dataclass(frozen=True)
class RequirementFrame:
    """Multi-word expression governing candidate requirements (Layer 3 Frame Definition).
    
    Identifies syntactic frames (e.g. 'experience in', 'ability to', 'responsible for')
    and binds them to their expected syntactic complement structure.
    """
    frame_id: str
    canonical_expression: str
    head_lemma: str
    head_pos: str
    preposition: Optional[str] = None
    expected_complement: FrameComplement = FrameComplement.NOUN_PHRASE
    semantic_function: str = "EXPERIENCE_REQUIREMENT"
    metadata: Mapping[str, Any] = field(default_factory=dict)

    def __post_init__(self) -> None:
        if not self.frame_id or not self.frame_id.strip():
            raise ValueError("RequirementFrame 'frame_id' cannot be empty.")
        if not self.canonical_expression or not self.canonical_expression.strip():
            raise ValueError("RequirementFrame 'canonical_expression' cannot be empty.")
        if not self.head_lemma or not self.head_lemma.strip():
            raise ValueError("RequirementFrame 'head_lemma' cannot be empty.")
        if not self.head_pos or not self.head_pos.strip():
            raise ValueError("RequirementFrame 'head_pos' cannot be empty.")
        object.__setattr__(
            self, "metadata", freeze_value(self.metadata if self.metadata is not None else {})
        )


@dataclass(frozen=True)
class FrameOccurrence:
    """Instantiated occurrence of a RequirementFrame in raw job text (Layer 3 Frame Occurrence).
    
    Strictly separates the canonical Frame Definition (RequirementFrame)
    from its empirical textual realization and parsed complement text.
    """
    occurrence_id: str
    frame_id: str
    source_text: str
    start_char: int
    end_char: int
    extracted_complement_text: str
    complement_type: FrameComplement
    job_id: Optional[str] = None
    section_id: Optional[str] = None
    confidence: float = 1.0
    metadata: Mapping[str, Any] = field(default_factory=dict)

    def __post_init__(self) -> None:
        if not self.occurrence_id or not self.occurrence_id.strip():
            raise ValueError("FrameOccurrence 'occurrence_id' cannot be empty.")
        if not self.frame_id or not self.frame_id.strip():
            raise ValueError("FrameOccurrence 'frame_id' cannot be empty.")
        if self.source_text is None:
            raise ValueError("FrameOccurrence 'source_text' cannot be None.")
        if self.start_char < 0 or self.end_char < self.start_char:
            raise ValueError(
                f"Invalid char offsets: [{self.start_char}:{self.end_char}]"
            )
        if not (0.0 <= self.confidence <= 1.0):
            raise ValueError(f"Confidence must be between 0.0 and 1.0, got {self.confidence}")
        object.__setattr__(
            self, "metadata", freeze_value(self.metadata if self.metadata is not None else {})
        )


@dataclass(frozen=True)
class SkillLevelEntry:
    """Structured entry representing a governed skill level mapping.
    
    Connects verbatim extracted levels (e.g. 'Expert', 'Senior') to
    governed level tiers ('Advanced', 'Intermediate', etc.) per the level matrix.
    Consumable by M3.2 SkillLevelGovernor.
    """
    raw_level: str
    governed_level: str
    skill_type: str = "Technical"
    confidence: float = 1.0
    metadata: Mapping[str, Any] = field(default_factory=dict)

    def __post_init__(self) -> None:
        if not self.raw_level or not self.raw_level.strip():
            raise ValueError("SkillLevelEntry 'raw_level' cannot be empty.")
        if not self.governed_level or not self.governed_level.strip():
            raise ValueError("SkillLevelEntry 'governed_level' cannot be empty.")
        if not (0.0 <= self.confidence <= 1.0):
            raise ValueError(f"SkillLevelEntry confidence must be between 0.0 and 1.0, got {self.confidence}")
        object.__setattr__(
            self, "metadata", freeze_value(self.metadata if self.metadata is not None else {})
        )


@dataclass(frozen=True)
class KnowledgeEvidence:
    """Empirical corpus evidence supporting a knowledge entity or mapping.
    
    DEFINITIONS & COUNTING SEMANTICS:
      - Job: Distinct job posting identified by unique job_id.
      - Section: Parsed structured document section (DESCRIPTION, REQUIREMENTS, SKILLS).
        Each section has a distinct identity within its parent job posting.
      - Occurrence: Single textual appearance of the target entity within a section.
    
    CONTAINMENT HIERARCHY INVARIANT:
      Every job containing the evidence contains at least 1 section containing the evidence.
      Every section containing the evidence contains at least 1 raw occurrence.
      Therefore, across any homogeneous counting scope:
        raw_occurrences_count >= distinct_sections_count >= distinct_jobs_count >= 0
    """
    evidence_id: str
    target_id: str
    source_identifier: str
    raw_occurrences_count: int
    distinct_sections_count: int
    distinct_jobs_count: int
    collected_at: str
    counting_scope: CountingScope = CountingScope.CORPUS_SNAPSHOT
    snapshot_id: Optional[str] = None
    time_window_start: Optional[str] = None
    time_window_end: Optional[str] = None
    reference_uri: Optional[str] = None
    metadata: Mapping[str, Any] = field(default_factory=dict)

    def __post_init__(self) -> None:
        if not self.evidence_id or not self.evidence_id.strip():
            raise ValueError("KnowledgeEvidence 'evidence_id' cannot be empty.")
        if not self.target_id or not self.target_id.strip():
            raise ValueError("KnowledgeEvidence 'target_id' cannot be empty.")
        if not self.source_identifier or not self.source_identifier.strip():
            raise ValueError("KnowledgeEvidence 'source_identifier' cannot be empty.")
        if self.raw_occurrences_count < 0:
            raise ValueError(f"raw_occurrences_count cannot be negative ({self.raw_occurrences_count}).")
        if self.distinct_sections_count < 0:
            raise ValueError(f"distinct_sections_count cannot be negative ({self.distinct_sections_count}).")
        if self.distinct_jobs_count < 0:
            raise ValueError(f"distinct_jobs_count cannot be negative ({self.distinct_jobs_count}).")
        if self.distinct_sections_count > self.raw_occurrences_count:
            raise ValueError(
                f"distinct_sections_count ({self.distinct_sections_count}) cannot exceed "
                f"raw_occurrences_count ({self.raw_occurrences_count})."
            )
        if self.distinct_jobs_count > self.distinct_sections_count:
            raise ValueError(
                f"distinct_jobs_count ({self.distinct_jobs_count}) cannot exceed "
                f"distinct_sections_count ({self.distinct_sections_count})."
            )
        object.__setattr__(
            self, "metadata", freeze_value(self.metadata if self.metadata is not None else {})
        )


@dataclass(frozen=True)
class KnowledgeMetadata:
    """Versioning, provenance, and integrity metadata for a knowledge bundle."""
    schema_version: str
    knowledge_version: str
    source_revision: Optional[str] = None
    created_at: str = ""
    checksum: Optional[str] = None
    provenance: Mapping[str, Any] = field(default_factory=dict)

    def __post_init__(self) -> None:
        if not self.schema_version or not self.schema_version.strip():
            raise ValueError("KnowledgeMetadata 'schema_version' cannot be empty.")
        if not self.knowledge_version or not self.knowledge_version.strip():
            raise ValueError("KnowledgeMetadata 'knowledge_version' cannot be empty.")
        object.__setattr__(
            self, "provenance", freeze_value(self.provenance if self.provenance is not None else {})
        )


@dataclass(frozen=True)
class TextNormalizationResult:
    """Immutable result contract for multilingual text normalization.
    
    GUARANTEES:
      1. original_text is NEVER mutated or destroyed.
      2. If status != SUCCESS and != PASSTHROUGH, normalized_text may be None,
         but original_text remains intact.
      3. Provider, model version, and error details are fully auditable.
      4. alignment_metadata allows future token/character offset reconstruction
         and is deeply immutable.
    """
    original_text: str
    normalized_text: Optional[str]
    source_language: str
    target_language: str
    normalization_method: str
    model_version: Optional[str]
    status: NormalizationStatus
    alignment_metadata: Optional[Mapping[str, Any]] = None
    error: Optional[str] = None

    def __post_init__(self) -> None:
        if self.original_text is None:
            raise ValueError("TextNormalizationResult 'original_text' cannot be None.")
        object.__setattr__(self, "alignment_metadata", freeze_value(self.alignment_metadata))
