"""
Linguistic Intelligence — Milestone 3.0 Knowledge Interfaces & Contracts
========================================================================
Defines the abstract interface boundaries for:
  - Overall Knowledge Base facade (IKnowledgeBase)
  - Lexical Store (ILexicalStore)
  - Morphology Store (IMorphologyStore)
  - Governed Skill Level Store (ILevelStore)
  - Domain Concept Store (IConceptStore)
  - Requirement Expression Frame Store (IExpressionStore)
  - Multilingual Text Normalizer Contract (ITextNormalizer)

CRITICAL DESIGN PRINCIPLES:
  1. Pure abstract interfaces with zero direct coupling to external frameworks (spaCy, NLTK, etc.).
  2. Complete separation of storage backend from runtime query contracts.
  3. Strict read contracts that future execution components (SkillLevelGovernor, AtomicClassifier)
     will consume without introducing hardcoded lists.
  4. Strong typing throughout: SkillLevelEntry replaces Any in level governance contracts.
  5. Polysemy-aware alias resolution: resolve_alias returns List[DomainConcept] to prevent
     blind overwriting of multi-domain terms.
  6. Multilingual boundary (ITextNormalizer) guarantees original-text immutability.
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Any, Dict, List, Optional, Tuple, Union

from linguistic_intelligence.kb.types import (
    ConceptLexicalMapping,
    ConceptType,
    DerivationType,
    DomainConcept,
    KnowledgeMetadata,
    LexicalEntry,
    LexicalForm,
    MorphologicalRelation,
    MorphologyRelationType,
    RequirementFrame,
    SkillLevelEntry,
    TextNormalizationResult,
)


# ==============================================================================
# 1. Store Interfaces
# ==============================================================================


class ILexicalStore(ABC):
    """Abstract contract for Layer 1 Lexical Knowledge retrieval."""

    @abstractmethod
    def get_by_id(self, lexical_id: str) -> Optional[LexicalEntry]:
        """Retrieve a lexical entry by its stable lexical_id."""
        pass

    @abstractmethod
    def get_by_lemma(self, lemma: str, language: Optional[str] = None) -> List[LexicalEntry]:
        """Retrieve all lexical entries matching the lemma and optional language code."""
        pass

    @abstractmethod
    def get_by_surface_form(self, form: str, language: Optional[str] = None) -> List[LexicalEntry]:
        """Retrieve lexical entries that realize the given surface form."""
        pass

    @abstractmethod
    def get_surface_forms(self, lexical_id: str) -> List[LexicalForm]:
        """Retrieve all recorded surface realizations for a lexical entry."""
        pass

    @abstractmethod
    def get_all_entries(self) -> List[LexicalEntry]:
        """Return all lexical entries contained in the store."""
        pass


class IMorphologyStore(ABC):
    """Abstract contract for Layer 2 Morphological Relations retrieval."""

    @abstractmethod
    def get_relations_for_lexical_id(self, lexical_id: str) -> List[MorphologicalRelation]:
        """Retrieve all morphological relations where the given ID is source or target."""
        pass

    @abstractmethod
    def get_related_entries(
        self,
        lexical_id: str,
        relation_type: Optional[MorphologyRelationType] = None,
    ) -> List[LexicalEntry]:
        """Retrieve all LexicalEntry entities related to the given lexical ID."""
        pass

    @abstractmethod
    def get_derivations(
        self,
        lexical_id: str,
        derivation_type: Optional[DerivationType] = None,
    ) -> List[MorphologicalRelation]:
        """Retrieve derivational relations for a lexical entry, optionally filtered by derivation type."""
        pass

    @abstractmethod
    def get_inflections(self, lexical_id: str) -> List[MorphologicalRelation]:
        """Retrieve inflectional relations for a lexical entry."""
        pass

    @abstractmethod
    def get_all_relations(self) -> List[MorphologicalRelation]:
        """Return all morphological relations in the store."""
        pass


class ILevelStore(ABC):
    """Abstract contract for governed skill-level mappings (Consumable by M3.2 SkillLevelGovernor)."""

    @abstractmethod
    def get_governed_level(self, raw_level: str) -> str:
        """Map a verbatim raw level string to one of the 4 governed tiers:
        ('Beginner', 'Intermediate', 'Advanced', 'Not Specified').
        """
        pass

    @abstractmethod
    def get_level_entry(self, raw_level: str) -> Optional[SkillLevelEntry]:
        """Retrieve structured level governance entry for a raw level string."""
        pass

    @abstractmethod
    def is_valid_level(self, raw_level: str) -> bool:
        """Check if the verbatim level string is recognized in the level matrix."""
        pass

    @abstractmethod
    def get_all_governed_levels(self) -> List[str]:
        """Return the closed list of governed level tiers."""
        pass


class IConceptStore(ABC):
    """Abstract contract for Layer 4 Domain Concepts & Mappings (Consumable by M3.3 AtomicClassifier)."""

    @abstractmethod
    def get_by_id(self, concept_id: str) -> Optional[DomainConcept]:
        """Retrieve a domain concept by its stable concept_id."""
        pass

    @abstractmethod
    def get_by_canonical_name(self, name: str) -> Optional[DomainConcept]:
        """Retrieve a domain concept by its exact canonical name."""
        pass

    @abstractmethod
    def resolve_alias(
        self,
        alias: str,
        context_domain: Optional[str] = None,
    ) -> List[DomainConcept]:
        """Resolve an alias or surface string to candidate domain concepts.
        
        Returns a list of matching concepts to explicitly support polysemy
        (e.g. 'pipeline' in Software vs Data vs Sales). When context_domain
        is provided, candidate concepts are filtered or ranked by domain.
        """
        pass

    @abstractmethod
    def resolve_single_alias(
        self,
        alias: str,
        context_domain: Optional[str] = None,
    ) -> Optional[DomainConcept]:
        """Resolve an alias returning a single concept if unambiguous.
        
        Returns the unique concept if exactly one match exists (or after domain filtering);
        returns None if ambiguous (multiple matches) or unmatched.
        """
        pass

    @abstractmethod
    def get_by_type(self, concept_type: ConceptType) -> List[DomainConcept]:
        """Retrieve all domain concepts of a specific ontological ConceptType."""
        pass

    @abstractmethod
    def get_by_domain(self, domain: str, sub_category: Optional[str] = None) -> List[DomainConcept]:
        """Retrieve all concepts associated with a specific professional domain."""
        pass

    @abstractmethod
    def get_concepts_for_lexical_id(
        self,
        lexical_id: str,
        context_domain: Optional[str] = None,
    ) -> List[DomainConcept]:
        """Retrieve domain concepts mapped to a lexical entry, optionally conditioned on context."""
        pass

    @abstractmethod
    def get_lexical_mappings(self, concept_id: str) -> List[ConceptLexicalMapping]:
        """Retrieve all lexical mappings pointing to the given concept_id."""
        pass

    @abstractmethod
    def get_all_concepts(self) -> List[DomainConcept]:
        """Return all domain concepts in the store."""
        pass


class IExpressionStore(ABC):
    """Abstract contract for Layer 3 Requirement & Responsibility Frames."""

    @abstractmethod
    def get_by_id(self, frame_id: str) -> Optional[RequirementFrame]:
        """Retrieve a requirement frame by its frame_id."""
        pass

    @abstractmethod
    def get_by_expression(self, expression: str) -> Optional[RequirementFrame]:
        """Retrieve a requirement frame by its exact canonical expression string."""
        pass

    @abstractmethod
    def get_all_frames(self) -> List[RequirementFrame]:
        """Return all requirement frames registered in the store."""
        pass

    @abstractmethod
    def get_frames_by_head_lemma(self, lemma: str) -> List[RequirementFrame]:
        """Retrieve frames sharing a syntactic head lemma (e.g. 'experience', 'knowledge')."""
        pass

    @abstractmethod
    def get_frames_by_function(self, semantic_function: str) -> List[RequirementFrame]:
        """Retrieve frames matching a semantic function category."""
        pass


# ==============================================================================
# 2. Master Knowledge Base Facade
# ==============================================================================


class IKnowledgeBase(ABC):
    """Unified master facade providing coordinated access to all Knowledge tiers."""

    @abstractmethod
    def get_lexical_store(self) -> ILexicalStore:
        """Access Layer 1 Lexical Knowledge store."""
        pass

    @abstractmethod
    def get_morphology_store(self) -> IMorphologyStore:
        """Access Layer 2 Morphology store."""
        pass

    @abstractmethod
    def get_level_store(self) -> ILevelStore:
        """Access Skill Level Governance store."""
        pass

    @abstractmethod
    def get_concept_store(self) -> IConceptStore:
        """Access Layer 4 Domain Concept store."""
        pass

    @abstractmethod
    def get_expression_store(self) -> IExpressionStore:
        """Access Layer 3 Requirement Frame store."""
        pass

    @abstractmethod
    def get_metadata(self) -> KnowledgeMetadata:
        """Retrieve version and provenance metadata for this knowledge base snapshot."""
        pass


# ==============================================================================
# 3. Multilingual Normalization Interface Boundary
# ==============================================================================


class ITextNormalizer(ABC):
    """Abstract contract for multilingual text normalization and translation boundaries.
    
    CRITICAL ARCHITECTURAL CONSTRAINTS:
      1. Must NOT implement translation directly in M3.0 (deferred to M3.4+).
      2. Must preserve original_text immutability under all outcomes.
      3. Must cleanly support English pass-through, Arabic translation, mixed scripts,
         and unsupported script handling without data corruption.
      4. Must report provider, model version, and error state transparently.
    """

    @abstractmethod
    def normalize(
        self,
        text: str,
        source_language: Optional[str] = None,
        target_language: str = "en",
    ) -> TextNormalizationResult:
        """Normalize or translate input text into target language while preserving original."""
        pass

    @abstractmethod
    def supports_language(self, language: str) -> bool:
        """Check if the given ISO language code is supported by this normalizer."""
        pass

    @abstractmethod
    def get_provider_info(self) -> Dict[str, Any]:
        """Return metadata describing the normalization provider, engine, and model version."""
        pass
