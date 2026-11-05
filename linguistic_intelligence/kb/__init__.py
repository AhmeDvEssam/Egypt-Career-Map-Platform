"""
Linguistic Intelligence — Knowledge Base (KB) Subpackage
=========================================================
Exports core entities, interfaces, schemas, and validators for the 4-layer
declarative Linguistic Knowledge Base introduced in Milestone 3.0.
"""

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

from linguistic_intelligence.kb.contracts import (
    IConceptStore,
    IExpressionStore,
    IKnowledgeBase,
    ILevelStore,
    ILexicalStore,
    IMorphologyStore,
    ITextNormalizer,
)

from linguistic_intelligence.kb.schema import (
    InvariantViolationError,
    ReferentialIntegrityError,
    SchemaVersionError,
    ValidationError,
    parse_semantic_version,
    validate_concept_association,
    validate_concept_lexical_mapping,
    validate_domain_concept,
    validate_evidence,
    validate_knowledge_bundle,
    validate_lexical_entry,
    validate_lexical_form,
    validate_metadata,
    validate_morphological_relation,
    validate_normalization_result,
    validate_requirement_frame,
)

__all__ = [
    # Types & Enums
    "ConceptAssociation",
    "ConceptLexicalMapping",
    "ConceptType",
    "DerivationType",
    "DomainConcept",
    "FrameComplement",
    "KnowledgeEvidence",
    "KnowledgeMetadata",
    "LexicalEntry",
    "LexicalForm",
    "LexicalFormType",
    "LifecycleStatus",
    "MappingType",
    "MorphologicalRelation",
    "MorphologyRelationType",
    "NormalizationStatus",
    "RequirementFrame",
    "TextNormalizationResult",
    # Contracts
    "IConceptStore",
    "IExpressionStore",
    "IKnowledgeBase",
    "ILevelStore",
    "ILexicalStore",
    "IMorphologyStore",
    "ITextNormalizer",
    # Schema Validators & Errors
    "InvariantViolationError",
    "ReferentialIntegrityError",
    "SchemaVersionError",
    "ValidationError",
    "parse_semantic_version",
    "validate_concept_association",
    "validate_concept_lexical_mapping",
    "validate_domain_concept",
    "validate_evidence",
    "validate_knowledge_bundle",
    "validate_lexical_entry",
    "validate_lexical_form",
    "validate_metadata",
    "validate_morphological_relation",
    "validate_normalization_result",
    "validate_requirement_frame",
]
