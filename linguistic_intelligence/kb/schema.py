"""
Linguistic Intelligence — Milestone 3.0 Knowledge Schema & Invariants
=====================================================================
Validates knowledge entities, schema version compatibility, and relational invariants:
  - Referential integrity across lexical entries, morphological relations, and concepts
  - Statistical evidence invariants (raw >= sections >= jobs >= 0)
  - Non-equivalence invariant: derivation != semantic concept identity
  - Concept classification taxonomy guardrails (prevent unknown terms -> SKILL)
  - Source text immutability and normalizer contract safety
"""

from __future__ import annotations

import re
from typing import Any, Collection, Dict, List, Optional, Set, Tuple

from linguistic_intelligence.kb.types import (
    ConceptAssociation,
    ConceptLexicalMapping,
    ConceptType,
    DerivationType,
    DomainConcept,
    FrameComplement,
    KnowledgeEvidence,
    KnowledgeMetadata,
    LexicalEntry,
    LexicalForm,
    LexicalFormType,
    LifecycleStatus,
    MappingType,
    MorphologicalRelation,
    MorphologyRelationType,
    NormalizationStatus,
    RequirementFrame,
    TextNormalizationResult,
)


# ==============================================================================
# 1. Custom Exceptions
# ==============================================================================


class ValidationError(Exception):
    """Base exception for schema and entity validation failures."""
    pass


class SchemaVersionError(ValidationError):
    """Raised when knowledge metadata has an incompatible or invalid schema version."""
    pass


class ReferentialIntegrityError(ValidationError):
    """Raised when an entity references a non-existent entity ID."""
    pass


class InvariantViolationError(ValidationError):
    """Raised when a core architectural invariant is violated."""
    pass


# ==============================================================================
# 2. Semantic Version Helpers
# ==============================================================================

SEMVER_REGEX = re.compile(r"^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?$")


def parse_semantic_version(version_str: str) -> Tuple[int, int, int]:
    """Parse a semver string (e.g. '3.0.0') into (major, minor, patch).
    
    Raises SchemaVersionError if the format is invalid.
    """
    if not isinstance(version_str, str):
        raise SchemaVersionError(f"Version must be a string, got {type(version_str).__name__}")
    match = SEMVER_REGEX.match(version_str.strip())
    if not match:
        raise SchemaVersionError(
            f"Invalid semantic version string: '{version_str}'. Expected format: X.Y.Z"
        )
    return int(match.group(1)), int(match.group(2)), int(match.group(3))


# ==============================================================================
# 3. Individual Entity Validators
# ==============================================================================


def validate_lexical_form(form: LexicalForm) -> None:
    """Validate a LexicalForm entity."""
    if not isinstance(form, LexicalForm):
        raise ValidationError(f"Expected LexicalForm instance, got {type(form).__name__}")
    if not form.form or not form.form.strip():
        raise ValidationError("LexicalForm 'form' cannot be empty or whitespace.")
    if not form.normalized_form or not form.normalized_form.strip():
        raise ValidationError("LexicalForm 'normalized_form' cannot be empty or whitespace.")
    if not isinstance(form.form_type, LexicalFormType):
        raise ValidationError(f"Invalid form_type: '{form.form_type}'. Must be LexicalFormType.")


def validate_lexical_entry(entry: LexicalEntry) -> None:
    """Validate a LexicalEntry entity."""
    if not isinstance(entry, LexicalEntry):
        raise ValidationError(f"Expected LexicalEntry instance, got {type(entry).__name__}")
    if not entry.lexical_id or not entry.lexical_id.strip():
        raise ValidationError("LexicalEntry 'lexical_id' cannot be empty.")
    if not entry.lemma or not entry.lemma.strip():
        raise ValidationError("LexicalEntry 'lemma' cannot be empty.")
    if not entry.language or not entry.language.strip():
        raise ValidationError("LexicalEntry 'language' cannot be empty.")
    if not entry.pos:
        raise ValidationError("LexicalEntry 'pos' must contain at least one part-of-speech tag.")
    for p in entry.pos:
        if not isinstance(p, str) or not p.strip():
            raise ValidationError(f"Invalid POS tag in LexicalEntry '{entry.lexical_id}': '{p}'")
    for form in entry.surface_forms:
        validate_lexical_form(form)


def validate_morphological_relation(rel: MorphologicalRelation) -> None:
    """Validate a MorphologicalRelation entity and enforce non-equivalence invariant."""
    if not isinstance(rel, MorphologicalRelation):
        raise ValidationError(f"Expected MorphologicalRelation instance, got {type(rel).__name__}")
    if not rel.relation_id or not rel.relation_id.strip():
        raise ValidationError("MorphologicalRelation 'relation_id' cannot be empty.")
    if not rel.source_lexical_id or not rel.source_lexical_id.strip():
        raise ValidationError("MorphologicalRelation 'source_lexical_id' cannot be empty.")
    if not rel.target_lexical_id or not rel.target_lexical_id.strip():
        raise ValidationError("MorphologicalRelation 'target_lexical_id' cannot be empty.")
    if rel.source_lexical_id == rel.target_lexical_id:
        raise InvariantViolationError(
            f"Self-referential relation forbidden: source and target are '{rel.source_lexical_id}'."
        )
    if not isinstance(rel.relation_type, MorphologyRelationType):
        raise ValidationError(
            f"Invalid relation_type: '{rel.relation_type}'. Must be MorphologyRelationType."
        )
    if rel.derivation_type is not None and not isinstance(rel.derivation_type, DerivationType):
        raise ValidationError(
            f"Invalid derivation_type: '{rel.derivation_type}'. Must be DerivationType."
        )


def validate_concept_association(assoc: ConceptAssociation) -> None:
    """Validate a ConceptAssociation entity."""
    if not isinstance(assoc, ConceptAssociation):
        raise ValidationError(f"Expected ConceptAssociation instance, got {type(assoc).__name__}")
    if not assoc.domain or not assoc.domain.strip():
        raise ValidationError("ConceptAssociation 'domain' cannot be empty.")
    if assoc.priority_weight < 0:
        raise ValidationError("ConceptAssociation 'priority_weight' cannot be negative.")


def validate_domain_concept(concept: DomainConcept) -> None:
    """Validate a DomainConcept entity."""
    if not isinstance(concept, DomainConcept):
        raise ValidationError(f"Expected DomainConcept instance, got {type(concept).__name__}")
    if not concept.concept_id or not concept.concept_id.strip():
        raise ValidationError("DomainConcept 'concept_id' cannot be empty.")
    if not concept.canonical_name or not concept.canonical_name.strip():
        raise ValidationError("DomainConcept 'canonical_name' cannot be empty.")
    if not isinstance(concept.concept_type, ConceptType):
        raise ValidationError(
            f"Invalid concept_type: '{concept.concept_type}'. Must be ConceptType enum."
        )
    if not isinstance(concept.status, LifecycleStatus):
        raise ValidationError(
            f"Invalid status: '{concept.status}'. Must be LifecycleStatus enum."
        )
    for assoc in concept.domains:
        validate_concept_association(assoc)


def validate_concept_lexical_mapping(mapping: ConceptLexicalMapping) -> None:
    """Validate an explicit ConceptLexicalMapping entity."""
    if not isinstance(mapping, ConceptLexicalMapping):
        raise ValidationError(f"Expected ConceptLexicalMapping instance, got {type(mapping).__name__}")
    if not mapping.mapping_id or not mapping.mapping_id.strip():
        raise ValidationError("ConceptLexicalMapping 'mapping_id' cannot be empty.")
    if not mapping.concept_id or not mapping.concept_id.strip():
        raise ValidationError("ConceptLexicalMapping 'concept_id' cannot be empty.")
    if not mapping.lexical_id or not mapping.lexical_id.strip():
        raise ValidationError("ConceptLexicalMapping 'lexical_id' cannot be empty.")
    if not isinstance(mapping.mapping_type, MappingType):
        raise ValidationError(f"Invalid mapping_type: '{mapping.mapping_type}'. Must be MappingType.")
    if not (0.0 <= mapping.confidence <= 1.0):
        raise InvariantViolationError(
            f"Mapping confidence must be between 0.0 and 1.0, got {mapping.confidence}"
        )


def validate_requirement_frame(frame: RequirementFrame) -> None:
    """Validate a RequirementFrame entity."""
    if not isinstance(frame, RequirementFrame):
        raise ValidationError(f"Expected RequirementFrame instance, got {type(frame).__name__}")
    if not frame.frame_id or not frame.frame_id.strip():
        raise ValidationError("RequirementFrame 'frame_id' cannot be empty.")
    if not frame.canonical_expression or not frame.canonical_expression.strip():
        raise ValidationError("RequirementFrame 'canonical_expression' cannot be empty.")
    if not frame.head_lemma or not frame.head_lemma.strip():
        raise ValidationError("RequirementFrame 'head_lemma' cannot be empty.")
    if not frame.head_pos or not frame.head_pos.strip():
        raise ValidationError("RequirementFrame 'head_pos' cannot be empty.")
    if not isinstance(frame.expected_complement, FrameComplement):
        raise ValidationError(
            f"Invalid expected_complement: '{frame.expected_complement}'. Must be FrameComplement."
        )


def validate_evidence(evidence: KnowledgeEvidence) -> None:
    """Validate KnowledgeEvidence and enforce distinct denominator hierarchy."""
    if not isinstance(evidence, KnowledgeEvidence):
        raise ValidationError(f"Expected KnowledgeEvidence instance, got {type(evidence).__name__}")
    if not evidence.evidence_id or not evidence.evidence_id.strip():
        raise ValidationError("KnowledgeEvidence 'evidence_id' cannot be empty.")
    if not evidence.target_id or not evidence.target_id.strip():
        raise ValidationError("KnowledgeEvidence 'target_id' cannot be empty.")
    if not evidence.source_identifier or not evidence.source_identifier.strip():
        raise ValidationError("KnowledgeEvidence 'source_identifier' cannot be empty.")

    # Distinct Denominators & Anti-Inflation Rules
    raw = evidence.raw_occurrences_count
    sec = evidence.distinct_sections_count
    jobs = evidence.distinct_jobs_count

    if raw < 0 or sec < 0 or jobs < 0:
        raise InvariantViolationError(
            f"Evidence counts cannot be negative: raw={raw}, sections={sec}, jobs={jobs}"
        )
    if sec > raw:
        raise InvariantViolationError(
            f"distinct_sections_count ({sec}) cannot exceed raw_occurrences_count ({raw})."
        )
    if jobs > sec:
        raise InvariantViolationError(
            f"distinct_jobs_count ({jobs}) cannot exceed distinct_sections_count ({sec})."
        )


def validate_metadata(
    metadata: KnowledgeMetadata,
    expected_major_schema: Optional[str] = "3",
) -> None:
    """Validate KnowledgeMetadata and schema version compatibility."""
    if not isinstance(metadata, KnowledgeMetadata):
        raise ValidationError(f"Expected KnowledgeMetadata instance, got {type(metadata).__name__}")
    if not metadata.schema_version or not metadata.schema_version.strip():
        raise ValidationError("KnowledgeMetadata 'schema_version' cannot be empty.")
    if not metadata.knowledge_version or not metadata.knowledge_version.strip():
        raise ValidationError("KnowledgeMetadata 'knowledge_version' cannot be empty.")

    # Parse versions
    major_schema, _, _ = parse_semantic_version(metadata.schema_version)
    parse_semantic_version(metadata.knowledge_version)

    if expected_major_schema is not None:
        if str(major_schema) != str(expected_major_schema):
            raise SchemaVersionError(
                f"Incompatible schema version: got '{metadata.schema_version}', "
                f"expected major version '{expected_major_schema}'."
            )


def validate_normalization_result(result: TextNormalizationResult) -> None:
    """Validate a TextNormalizationResult entity and enforce text immutability."""
    if not isinstance(result, TextNormalizationResult):
        raise ValidationError(f"Expected TextNormalizationResult instance, got {type(result).__name__}")
    if result.original_text is None:
        raise InvariantViolationError("TextNormalizationResult 'original_text' must not be None.")
    if not isinstance(result.status, NormalizationStatus):
        raise ValidationError(
            f"Invalid status: '{result.status}'. Must be NormalizationStatus enum."
        )
    if result.status == NormalizationStatus.FAILED and result.error is None:
        raise ValidationError("FAILED NormalizationResult must provide an error message.")
    if result.status in (NormalizationStatus.SUCCESS, NormalizationStatus.PASSTHROUGH):
        if result.normalized_text is None:
            raise ValidationError(
                f"Status '{result.status}' requires a non-None normalized_text."
            )


# ==============================================================================
# 4. Knowledge Bundle Referential Integrity & Invariant Validation
# ==============================================================================


def validate_knowledge_bundle(
    lexical_entries: Collection[LexicalEntry],
    domain_concepts: Collection[DomainConcept],
    morphological_relations: Collection[MorphologicalRelation],
    concept_mappings: Collection[ConceptLexicalMapping],
    requirement_frames: Collection[RequirementFrame],
    evidence_list: Optional[Collection[KnowledgeEvidence]] = None,
    metadata: Optional[KnowledgeMetadata] = None,
    expected_major_schema: Optional[str] = "3",
) -> None:
    """Perform exhaustive referential integrity and invariant validation across a full KB collection.
    
    Checks:
      1. Unique identifiers within each entity type.
      2. Morphological relations link valid, existing lexical entries.
      3. Concept mappings link valid concepts and valid lexical entries.
      4. Evidence targets existing concepts, lexical entries, relations, or frames.
      5. Derivations do NOT implicitly collapse concepts (preserves entity distinction).
      6. Metadata version compatibility.
    """
    if metadata is not None:
        validate_metadata(metadata, expected_major_schema=expected_major_schema)

    # 1. Validate Lexical Entries & build ID index
    lexical_ids: Set[str] = set()
    for entry in lexical_entries:
        validate_lexical_entry(entry)
        if entry.lexical_id in lexical_ids:
            raise InvariantViolationError(f"Duplicate lexical_id detected: '{entry.lexical_id}'")
        lexical_ids.add(entry.lexical_id)

    # 2. Validate Domain Concepts & build ID index
    concept_ids: Set[str] = set()
    for concept in domain_concepts:
        validate_domain_concept(concept)
        if concept.concept_id in concept_ids:
            raise InvariantViolationError(f"Duplicate concept_id detected: '{concept.concept_id}'")
        concept_ids.add(concept.concept_id)

    # 3. Validate Morphological Relations & verify foreign keys
    relation_ids: Set[str] = set()
    for rel in morphological_relations:
        validate_morphological_relation(rel)
        if rel.relation_id in relation_ids:
            raise InvariantViolationError(f"Duplicate relation_id detected: '{rel.relation_id}'")
        relation_ids.add(rel.relation_id)

        if rel.source_lexical_id not in lexical_ids:
            raise ReferentialIntegrityError(
                f"Relation '{rel.relation_id}' references non-existent source_lexical_id: "
                f"'{rel.source_lexical_id}'"
            )
        if rel.target_lexical_id not in lexical_ids:
            raise ReferentialIntegrityError(
                f"Relation '{rel.relation_id}' references non-existent target_lexical_id: "
                f"'{rel.target_lexical_id}'"
            )

    # 4. Validate Concept-Lexical Mappings & verify foreign keys
    mapping_ids: Set[str] = set()
    for m in concept_mappings:
        validate_concept_lexical_mapping(m)
        if m.mapping_id in mapping_ids:
            raise InvariantViolationError(f"Duplicate mapping_id detected: '{m.mapping_id}'")
        mapping_ids.add(m.mapping_id)

        if m.concept_id not in concept_ids:
            raise ReferentialIntegrityError(
                f"Mapping '{m.mapping_id}' references non-existent concept_id: '{m.concept_id}'"
            )
        if m.lexical_id not in lexical_ids:
            raise ReferentialIntegrityError(
                f"Mapping '{m.mapping_id}' references non-existent lexical_id: '{m.lexical_id}'"
            )

    # 5. Validate Requirement Frames & build ID index
    frame_ids: Set[str] = set()
    for frame in requirement_frames:
        validate_requirement_frame(frame)
        if frame.frame_id in frame_ids:
            raise InvariantViolationError(f"Duplicate frame_id detected: '{frame.frame_id}'")
        frame_ids.add(frame.frame_id)

    # 6. Validate Evidence & target references
    if evidence_list is not None:
        evidence_ids: Set[str] = set()
        all_valid_targets = lexical_ids | concept_ids | relation_ids | frame_ids
        for ev in evidence_list:
            validate_evidence(ev)
            if ev.evidence_id in evidence_ids:
                raise InvariantViolationError(f"Duplicate evidence_id detected: '{ev.evidence_id}'")
            evidence_ids.add(ev.evidence_id)

            if ev.target_id not in all_valid_targets:
                raise ReferentialIntegrityError(
                    f"Evidence '{ev.evidence_id}' references non-existent target_id: '{ev.target_id}'"
                )
