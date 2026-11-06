"""
Unit Test Suite for Milestone 3.0: Knowledge Contracts & Schema Foundation
==========================================================================
Verifies:
  1. Entity construction, deep immutability, and validation
  2. Controlled enum validation
  3. Morphological separation: Derivation != Semantic Equivalence
  4. Concept mapping cardinality (1-to-many, many-to-1, polysemy)
  5. Evidence metric integrity: raw >= sections >= jobs >= 0 and containment hierarchy
  6. Requirement-frame definitions vs occurrences
  7. Semantic versioning & schema compatibility
  8. Text normalization contracts (pass-through, translation result, failure preservation)
  9. Original-text preservation and deep immutability across all entities
  10. Abstract interface conformance (ABC instantiation checks & stub verification)
  11. Full knowledge bundle referential integrity, publication governance & invariants
  12. Polysemous alias resolution with template method resolve_single_alias
  13. Strong typing for SkillLevelEntry and ILevelStore
  14. Strict CountingScope analytical prerequisites (snapshot_id, time windows, partition_id)
  15. FrameOccurrence character offset and complement text boundary guarantees
"""

import sys
import unittest
from dataclasses import FrozenInstanceError
from pathlib import Path
from types import MappingProxyType
from typing import Any, Dict, List, Optional

# Add project root to sys.path
PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from linguistic_intelligence.kb.types import (
    ConceptAssociation,
    ConceptLexicalMapping,
    ConceptType,
    CountingScope,
    DerivationType,
    DomainConcept,
    FrameComplement,
    FrameOccurrence,
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
    SkillLevelEntry,
    TextNormalizationResult,
    freeze_value,
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
    validate_frame_occurrence,
    validate_knowledge_bundle,
    validate_lexical_entry,
    validate_lexical_form,
    validate_metadata,
    validate_morphological_relation,
    validate_normalization_result,
    validate_publication_bundle,
    validate_publishable_concept,
    validate_requirement_frame,
    validate_skill_level_entry,
)


class CustomMutableObject:
    """Arbitrary user-defined class used to probe deep immutability rejection."""
    def __init__(self, value: int = 10):
        self.value = value


class TestMilestone3EntitiesAndValidation(unittest.TestCase):
    """Test group 1 & 2: Entity construction, immutability, and controlled enums."""

    def test_01_lexical_form_creation_and_immutability(self):
        """LexicalForm must be frozen and store verbatim surface forms."""
        form = LexicalForm(
            form="Developers",
            normalized_form="developer",
            form_type=LexicalFormType.INFLECTION,
            grammatical_features={"number": "plural"},
        )
        self.assertEqual(form.form, "Developers")
        self.assertEqual(form.normalized_form, "developer")
        self.assertEqual(form.form_type, LexicalFormType.INFLECTION)
        self.assertEqual(form.grammatical_features["number"], "plural")

        # Verify immutability
        with self.assertRaises(FrozenInstanceError):
            form.form = "other"  # type: ignore

    def test_02_lexical_form_empty_rejection(self):
        """LexicalForm rejects empty or whitespace-only forms."""
        with self.assertRaises(ValueError):
            LexicalForm(form="", normalized_form="valid")
        with self.assertRaises(ValueError):
            LexicalForm(form="   ", normalized_form="valid")
        with self.assertRaises(ValueError):
            LexicalForm(form="valid", normalized_form="")

    def test_03_lexical_entry_creation_and_tuple_conversion(self):
        """LexicalEntry converts lists to immutable tuples and enforces validation."""
        entry = LexicalEntry(
            lexical_id="lex_developer",
            lemma="developer",
            language="en",
            pos=["NOUN"],  # passed as list
            surface_forms=[
                LexicalForm(form="developer", normalized_form="developer"),
                LexicalForm(form="developers", normalized_form="developer"),
            ],
        )
        self.assertIsInstance(entry.pos, tuple)
        self.assertIsInstance(entry.surface_forms, tuple)
        self.assertEqual(len(entry.surface_forms), 2)
        validate_lexical_entry(entry)

        # Immutability
        with self.assertRaises(FrozenInstanceError):
            entry.lemma = "dev"  # type: ignore

    def test_04_lexical_entry_empty_pos_rejection(self):
        """LexicalEntry must define at least one POS tag."""
        with self.assertRaises(ValueError):
            LexicalEntry(
                lexical_id="lex_empty_pos",
                lemma="test",
                language="en",
                pos=(),
            )

    def test_05_controlled_concept_types(self):
        """ConceptType enum covers all required controlled ontological categories."""
        expected_types = {
            "SKILL",
            "TECHNOLOGY",
            "TOOL",
            "PROFESSIONAL_DISCIPLINE",
            "OCCUPATION",
            "BUSINESS_ACTIVITY",
            "RESPONSIBILITY",
            "INDUSTRY",
            "KNOWLEDGE_AREA",
            "LANGUAGE",
            "CERTIFICATION",
            "OTHER",
        }
        actual_types = {ct.value for ct in ConceptType}
        self.assertEqual(actual_types, expected_types)

    def test_06_domain_concept_creation(self):
        """DomainConcept supports domain associations and ontological classifications."""
        concept = DomainConcept(
            concept_id="concept_sap",
            canonical_name="SAP",
            concept_type=ConceptType.TOOL,
            description="Enterprise ERP software platform",
            domains=[
                ConceptAssociation(domain="Operations & Logistics", sub_category="Supply Chain"),
                ConceptAssociation(domain="Finance & Accounting", sub_category="ERP Systems"),
            ],
            aliases=["SAP ERP", "SAP R/3", "SAP S/4HANA"],
            status=LifecycleStatus.APPROVED,
        )
        self.assertEqual(concept.canonical_name, "SAP")
        self.assertEqual(concept.concept_type, ConceptType.TOOL)
        self.assertEqual(len(concept.domains), 2)
        self.assertEqual(len(concept.aliases), 3)
        validate_domain_concept(concept)


class TestMilestone3LinguisticInvariants(unittest.TestCase):
    """Test groups 3, 4, 5: Morphological separation, mapping cardinality, and evidence metrics."""

    def test_07_morphology_non_equivalence_invariant(self):
        """Derivation relationship does NOT imply semantic equivalence."""
        entry_develop = LexicalEntry(
            lexical_id="lex_develop",
            lemma="develop",
            language="en",
            pos=("VERB",),
        )
        entry_developer = LexicalEntry(
            lexical_id="lex_developer",
            lemma="developer",
            language="en",
            pos=("NOUN",),
        )
        entry_development = LexicalEntry(
            lexical_id="lex_development",
            lemma="development",
            language="en",
            pos=("NOUN",),
        )

        rel_agent = MorphologicalRelation(
            relation_id="rel_develop_to_developer",
            source_lexical_id=entry_develop.lexical_id,
            target_lexical_id=entry_developer.lexical_id,
            relation_type=MorphologyRelationType.DERIVATION,
            derivation_type=DerivationType.AGENT_NOUN,
        )
        rel_abstract = MorphologicalRelation(
            relation_id="rel_develop_to_development",
            source_lexical_id=entry_develop.lexical_id,
            target_lexical_id=entry_development.lexical_id,
            relation_type=MorphologyRelationType.DERIVATION,
            derivation_type=DerivationType.ABSTRACT_NOUN,
        )

        validate_morphological_relation(rel_agent)
        validate_morphological_relation(rel_abstract)

        self.assertNotEqual(rel_agent.source_lexical_id, rel_agent.target_lexical_id)
        self.assertEqual(rel_agent.derivation_type, DerivationType.AGENT_NOUN)
        self.assertEqual(rel_abstract.derivation_type, DerivationType.ABSTRACT_NOUN)

        with self.assertRaises(ValueError):
            MorphologicalRelation(
                relation_id="rel_invalid_self",
                source_lexical_id="lex_same",
                target_lexical_id="lex_same",
                relation_type=MorphologyRelationType.DERIVATION,
            )

    def test_08_polysemy_one_to_many_concept_mappings(self):
        """One lexical entry can map to multiple domain concepts based on context."""
        lex_pipeline = LexicalEntry(
            lexical_id="lex_pipeline",
            lemma="pipeline",
            language="en",
            pos=("NOUN",),
        )

        concept_cicd = DomainConcept(
            concept_id="concept_cicd_pipeline",
            canonical_name="CI/CD Pipeline",
            concept_type=ConceptType.SKILL,
            domains=[ConceptAssociation(domain="Software Engineering & IT", sub_category="DevOps")],
        )

        concept_data_pipe = DomainConcept(
            concept_id="concept_data_pipeline",
            canonical_name="Data Pipeline",
            concept_type=ConceptType.SKILL,
            domains=[ConceptAssociation(domain="Data Science & Analytics", sub_category="Data Engineering")],
        )

        concept_sales_pipe = DomainConcept(
            concept_id="concept_sales_pipeline",
            canonical_name="Sales Pipeline",
            concept_type=ConceptType.BUSINESS_ACTIVITY,
            domains=[ConceptAssociation(domain="Sales & Business Development", sub_category="B2B Sales")],
        )

        map1 = ConceptLexicalMapping(
            mapping_id="map_pipe_cicd",
            concept_id=concept_cicd.concept_id,
            lexical_id=lex_pipeline.lexical_id,
            mapping_type=MappingType.EXACT,
            context_domain="Software Engineering & IT",
        )
        map2 = ConceptLexicalMapping(
            mapping_id="map_pipe_data",
            concept_id=concept_data_pipe.concept_id,
            lexical_id=lex_pipeline.lexical_id,
            mapping_type=MappingType.EXACT,
            context_domain="Data Science & Analytics",
        )
        map3 = ConceptLexicalMapping(
            mapping_id="map_pipe_sales",
            concept_id=concept_sales_pipe.concept_id,
            lexical_id=lex_pipeline.lexical_id,
            mapping_type=MappingType.EXACT,
            context_domain="Sales & Business Development",
        )

        for m in (map1, map2, map3):
            validate_concept_lexical_mapping(m)

        self.assertEqual(map1.lexical_id, map2.lexical_id)
        self.assertEqual(map2.lexical_id, map3.lexical_id)
        self.assertNotEqual(map1.concept_id, map2.concept_id)
        self.assertNotEqual(map2.concept_id, map3.concept_id)

    def test_09_synonymy_many_to_one_concept_mappings(self):
        """Multiple lexical entries can map to a single canonical concept."""
        concept_python = DomainConcept(
            concept_id="concept_python_lang",
            canonical_name="Python",
            concept_type=ConceptType.SKILL,
            domains=[ConceptAssociation(domain="Software Engineering & IT", sub_category="Backend Development")],
        )

        lex_python = LexicalEntry(lexical_id="lex_python", lemma="python", language="en", pos=("NOUN",))
        lex_py = LexicalEntry(lexical_id="lex_py", lemma="py", language="en", pos=("NOUN",))
        lex_python3 = LexicalEntry(lexical_id="lex_python3", lemma="python 3", language="en", pos=("NOUN",))

        m1 = ConceptLexicalMapping(
            mapping_id="m1", concept_id=concept_python.concept_id, lexical_id=lex_python.lexical_id
        )
        m2 = ConceptLexicalMapping(
            mapping_id="m2", concept_id=concept_python.concept_id, lexical_id=lex_py.lexical_id, mapping_type=MappingType.RELATED
        )
        m3 = ConceptLexicalMapping(
            mapping_id="m3", concept_id=concept_python.concept_id, lexical_id=lex_python3.lexical_id, mapping_type=MappingType.NARROWER
        )

        for m in (m1, m2, m3):
            validate_concept_lexical_mapping(m)
            self.assertEqual(m.concept_id, concept_python.concept_id)

    def test_10_evidence_metric_invariants_and_anti_inflation(self):
        """Evidence metrics enforce raw_occurrences >= distinct_sections >= distinct_jobs >= 0."""
        ev_valid = KnowledgeEvidence(
            evidence_id="ev_01",
            target_id="concept_sales",
            source_identifier="egypt_jobs_db.job_descriptions",
            raw_occurrences_count=50,
            distinct_sections_count=30,
            distinct_jobs_count=20,
            collected_at="2026-11-05T12:00:00Z",
            counting_scope=CountingScope.CORPUS_SNAPSHOT,
            snapshot_id="snapshot_2026_q4",
        )
        validate_evidence(ev_valid)

        # Negative count rejection
        with self.assertRaises(ValueError):
            KnowledgeEvidence(
                evidence_id="ev_neg",
                target_id="concept_sales",
                source_identifier="egypt_jobs_db",
                raw_occurrences_count=-1,
                distinct_sections_count=0,
                distinct_jobs_count=0,
                collected_at="2026-11-05T12:00:00Z",
                snapshot_id="snap1",
            )

        # Inflation violation: sections > raw
        with self.assertRaises(ValueError):
            KnowledgeEvidence(
                evidence_id="ev_inf1",
                target_id="concept_sales",
                source_identifier="egypt_jobs_db",
                raw_occurrences_count=10,
                distinct_sections_count=15,
                distinct_jobs_count=5,
                collected_at="2026-11-05T12:00:00Z",
                snapshot_id="snap1",
            )

        # Inflation violation: jobs > sections
        with self.assertRaises(ValueError):
            KnowledgeEvidence(
                evidence_id="ev_inf2",
                target_id="concept_sales",
                source_identifier="egypt_jobs_db",
                raw_occurrences_count=20,
                distinct_sections_count=10,
                distinct_jobs_count=15,
                collected_at="2026-11-05T12:00:00Z",
                snapshot_id="snap1",
            )


class TestMilestone3RequirementFramesAndVersion(unittest.TestCase):
    """Test groups 6 & 7: Requirement frames, syntactic complements, and versioning."""

    def test_11_requirement_frame_creation_and_complements(self):
        """RequirementFrame binds canonical expression to head lemma, POS, and complement."""
        frame = RequirementFrame(
            frame_id="frame_experience_in",
            canonical_expression="experience in",
            head_lemma="experience",
            head_pos="NOUN",
            preposition="in",
            expected_complement=FrameComplement.NOUN_PHRASE,
            semantic_function="EXPERIENCE_REQUIREMENT",
        )
        validate_requirement_frame(frame)
        self.assertEqual(frame.expected_complement, FrameComplement.NOUN_PHRASE)

        frame_ability = RequirementFrame(
            frame_id="frame_ability_to",
            canonical_expression="ability to",
            head_lemma="ability",
            head_pos="NOUN",
            preposition="to",
            expected_complement=FrameComplement.VERB_PHRASE,
            semantic_function="CAPABILITY_REQUIREMENT",
        )
        validate_requirement_frame(frame_ability)
        self.assertEqual(frame_ability.expected_complement, FrameComplement.VERB_PHRASE)

    def test_12_requirement_frame_validation_guards(self):
        """RequirementFrame rejects empty expressions or lemmas."""
        with self.assertRaises(ValueError):
            RequirementFrame(
                frame_id="",
                canonical_expression="valid",
                head_lemma="valid",
                head_pos="NOUN",
            )
        with self.assertRaises(ValueError):
            RequirementFrame(
                frame_id="f1",
                canonical_expression="",
                head_lemma="valid",
                head_pos="NOUN",
            )
        with self.assertRaises(ValueError):
            RequirementFrame(
                frame_id="f1",
                canonical_expression="valid",
                head_lemma="",
                head_pos="NOUN",
            )

    def test_13_semantic_versioning_and_metadata(self):
        """KnowledgeMetadata parses semver and validates schema compatibility."""
        meta = KnowledgeMetadata(
            schema_version="3.0.0",
            knowledge_version="1.2.0",
            source_revision="c95be7236ac207c0a4654f4c24e4cce6ef020ec7",
            created_at="2026-11-05T16:00:00Z",
            checksum="sha256:fedcba9876543210",
            provenance={"author": "Principal Architect", "milestone": "M3.0"},
        )
        validate_metadata(meta, expected_major_schema="3")

        with self.assertRaises(SchemaVersionError):
            validate_metadata(meta, expected_major_schema="4")

        with self.assertRaises(SchemaVersionError):
            parse_semantic_version("not_a_version")
        with self.assertRaises(SchemaVersionError):
            parse_semantic_version("3.0")


class TestMilestone3MultilingualContracts(unittest.TestCase):
    """Test groups 8 & 9: Multilingual normalization contracts and source text immutability."""

    def test_14_text_normalization_passthrough_english(self):
        """English text normalizer result preserves original text as immutable."""
        raw_text = "Senior Python Developer with 5+ years experience in Django and SQL"
        result = TextNormalizationResult(
            original_text=raw_text,
            normalized_text=raw_text,
            source_language="en",
            target_language="en",
            normalization_method="PASSTHROUGH",
            model_version=None,
            status=NormalizationStatus.PASSTHROUGH,
            alignment_metadata={"char_offset_delta": 0},
        )
        validate_normalization_result(result)
        self.assertEqual(result.original_text, raw_text)
        self.assertEqual(result.normalized_text, raw_text)
        self.assertEqual(result.status, NormalizationStatus.PASSTHROUGH)

        with self.assertRaises(FrozenInstanceError):
            result.original_text = "Modified text"  # type: ignore

    def test_15_text_normalization_future_arabic_translation_contract(self):
        """Simulated future Arabic normalization preserves original script and records alignment."""
        raw_ar = "مطلوب Data Analyst خبرة في SQL"
        normalized_en = "Data Analyst required with experience in SQL"
        result = TextNormalizationResult(
            original_text=raw_ar,
            normalized_text=normalized_en,
            source_language="ar",
            target_language="en",
            normalization_method="ARGOS_TRANSLATE_EN_AR_V2",
            model_version="argos-translate-2.1.0-egypt-finetuned",
            status=NormalizationStatus.SUCCESS,
            alignment_metadata={
                "source_token_count": 6,
                "target_token_count": 7,
                "protected_terms": ["Data Analyst", "SQL"],
            },
        )
        validate_normalization_result(result)
        self.assertEqual(result.original_text, raw_ar)
        self.assertEqual(result.normalized_text, normalized_en)
        self.assertEqual(result.status, NormalizationStatus.SUCCESS)
        self.assertIn("protected_terms", result.alignment_metadata)

    def test_16_text_normalization_failure_preserves_original_text(self):
        """Normalization failure preserves original text intact without data loss."""
        raw_mixed = "خبرة ممتازة في CI/CD and Docker pipelines"
        result = TextNormalizationResult(
            original_text=raw_mixed,
            normalized_text=None,
            source_language="mixed",
            target_language="en",
            normalization_method="LOCAL_OFFLINE_NLLB",
            model_version="nllb-200-distilled-600M",
            status=NormalizationStatus.FAILED,
            error="CUDA out of memory error during offline batch translation",
        )
        validate_normalization_result(result)
        self.assertEqual(result.original_text, raw_mixed)
        self.assertIsNone(result.normalized_text)
        self.assertEqual(result.status, NormalizationStatus.FAILED)
        self.assertIsNotNone(result.error)

    def test_17_text_normalization_contract_rejections(self):
        """Normalization result rejects None original_text or missing error on FAILED status."""
        with self.assertRaises(ValueError):
            TextNormalizationResult(
                original_text=None,  # type: ignore
                normalized_text=None,
                source_language="en",
                target_language="en",
                normalization_method="PASSTHROUGH",
                model_version=None,
                status=NormalizationStatus.PASSTHROUGH,
            )

        with self.assertRaises(ValidationError):
            res = TextNormalizationResult(
                original_text="text",
                normalized_text=None,
                source_language="en",
                target_language="en",
                normalization_method="METHOD",
                model_version=None,
                status=NormalizationStatus.FAILED,
                error=None,
            )
            validate_normalization_result(res)


class TestMilestone3InterfaceConformance(unittest.TestCase):
    """Test group 10: Abstract interface conformance and ABC constraints."""

    def test_18_abstract_interfaces_cannot_be_instantiated_directly(self):
        """ABCs cannot be instantiated without implementing all abstract methods."""
        with self.assertRaises(TypeError):
            IKnowledgeBase()  # type: ignore
        with self.assertRaises(TypeError):
            ILexicalStore()  # type: ignore
        with self.assertRaises(TypeError):
            IMorphologyStore()  # type: ignore
        with self.assertRaises(TypeError):
            ILevelStore()  # type: ignore
        with self.assertRaises(TypeError):
            IConceptStore()  # type: ignore
        with self.assertRaises(TypeError):
            IExpressionStore()  # type: ignore
        with self.assertRaises(TypeError):
            ITextNormalizer()  # type: ignore

    def test_19_stub_normalizer_implementation_conformance(self):
        """A minimal stub normalizer cleanly satisfies ITextNormalizer."""
        class StubEnglishNormalizer(ITextNormalizer):
            def normalize(
                self,
                text: str,
                source_language: Optional[str] = None,
                target_language: str = "en",
            ) -> TextNormalizationResult:
                return TextNormalizationResult(
                    original_text=text,
                    normalized_text=text,
                    source_language=source_language or "en",
                    target_language=target_language,
                    normalization_method="PASSTHROUGH",
                    model_version="1.0.0",
                    status=NormalizationStatus.PASSTHROUGH,
                )

            def supports_language(self, language: str) -> bool:
                return language.lower() in ("en", "eng")

            def get_provider_info(self) -> Dict[str, Any]:
                return {"provider": "StubPassThrough", "version": "1.0.0"}

        normalizer = StubEnglishNormalizer()
        self.assertTrue(normalizer.supports_language("en"))
        self.assertFalse(normalizer.supports_language("ar"))
        res = normalizer.normalize("Python Programming")
        self.assertEqual(res.status, NormalizationStatus.PASSTHROUGH)
        self.assertEqual(res.normalized_text, "Python Programming")


class TestMilestone3KnowledgeBundleIntegrity(unittest.TestCase):
    """Test group 11: Referential integrity and bundle invariant verification."""

    def setUp(self):
        self.entry1 = LexicalEntry(
            lexical_id="lex_python",
            lemma="python",
            language="en",
            pos=("NOUN",),
            surface_forms=(
                LexicalForm(form="Python", normalized_form="python"),
                LexicalForm(form="python", normalized_form="python"),
            ),
        )
        self.entry2 = LexicalEntry(
            lexical_id="lex_developer",
            lemma="developer",
            language="en",
            pos=("NOUN",),
            surface_forms=(
                LexicalForm(form="developer", normalized_form="developer"),
            ),
        )
        self.entry3 = LexicalEntry(
            lexical_id="lex_develop",
            lemma="develop",
            language="en",
            pos=("VERB",),
            surface_forms=(
                LexicalForm(form="develop", normalized_form="develop"),
            ),
        )

        self.rel1 = MorphologicalRelation(
            relation_id="rel_develop_developer",
            source_lexical_id="lex_develop",
            target_lexical_id="lex_developer",
            relation_type=MorphologyRelationType.DERIVATION,
            derivation_type=DerivationType.AGENT_NOUN,
        )

        self.concept1 = DomainConcept(
            concept_id="concept_python_lang",
            canonical_name="Python",
            concept_type=ConceptType.SKILL,
            domains=(
                ConceptAssociation(domain="Software Engineering & IT", sub_category="Backend Development"),
            ),
            aliases=("Python 3", "py"),
            status=LifecycleStatus.APPROVED,
        )

        self.mapping1 = ConceptLexicalMapping(
            mapping_id="map_python_lex",
            concept_id="concept_python_lang",
            lexical_id="lex_python",
            mapping_type=MappingType.EXACT,
        )

        self.frame1 = RequirementFrame(
            frame_id="frame_experience_with",
            canonical_expression="experience with",
            head_lemma="experience",
            head_pos="NOUN",
            preposition="with",
            expected_complement=FrameComplement.NOUN_PHRASE,
            semantic_function="EXPERIENCE_REQUIREMENT",
        )

        self.evidence1 = KnowledgeEvidence(
            evidence_id="ev_py_01",
            target_id="concept_python_lang",
            source_identifier="egypt_jobs_db.job_descriptions",
            raw_occurrences_count=15000,
            distinct_sections_count=12000,
            distinct_jobs_count=9500,
            collected_at="2026-11-05T12:00:00Z",
            counting_scope=CountingScope.CORPUS_SNAPSHOT,
            snapshot_id="snapshot_2026_q4",
        )

        self.meta = KnowledgeMetadata(
            schema_version="3.0.0",
            knowledge_version="1.0.0",
            source_revision="c95be7236ac207c0a4654f4c24e4cce6ef020ec7",
        )

    def test_20_valid_knowledge_bundle_passes(self):
        """A complete, consistent knowledge bundle passes validation with zero errors."""
        validate_knowledge_bundle(
            lexical_entries=[self.entry1, self.entry2, self.entry3],
            domain_concepts=[self.concept1],
            morphological_relations=[self.rel1],
            concept_mappings=[self.mapping1],
            requirement_frames=[self.frame1],
            evidence_list=[self.evidence1],
            metadata=self.meta,
        )

    def test_21_referential_integrity_dangling_relation(self):
        """Morphological relation referencing missing lexical entry raises ReferentialIntegrityError."""
        dangling_rel = MorphologicalRelation(
            relation_id="rel_dangling",
            source_lexical_id="lex_develop",
            target_lexical_id="lex_NONEXISTENT",
            relation_type=MorphologyRelationType.DERIVATION,
        )
        with self.assertRaises(ReferentialIntegrityError):
            validate_knowledge_bundle(
                lexical_entries=[self.entry1, self.entry3],
                domain_concepts=[self.concept1],
                morphological_relations=[dangling_rel],
                concept_mappings=[self.mapping1],
                requirement_frames=[self.frame1],
            )

    def test_22_referential_integrity_dangling_mapping(self):
        """Concept mapping referencing missing concept raises ReferentialIntegrityError."""
        dangling_map = ConceptLexicalMapping(
            mapping_id="map_dangling",
            concept_id="concept_NONEXISTENT",
            lexical_id="lex_python",
        )
        with self.assertRaises(ReferentialIntegrityError):
            validate_knowledge_bundle(
                lexical_entries=[self.entry1],
                domain_concepts=[self.concept1],
                morphological_relations=[],
                concept_mappings=[dangling_map],
                requirement_frames=[self.frame1],
            )

    def test_23_duplicate_identifier_detection(self):
        """Duplicate IDs within the same entity collection raise InvariantViolationError."""
        dup_concept = DomainConcept(
            concept_id="concept_python_lang",
            canonical_name="Python Duplicate",
            concept_type=ConceptType.SKILL,
            status=LifecycleStatus.APPROVED,
        )
        with self.assertRaises(InvariantViolationError):
            validate_knowledge_bundle(
                lexical_entries=[self.entry1],
                domain_concepts=[self.concept1, dup_concept],
                morphological_relations=[],
                concept_mappings=[self.mapping1],
                requirement_frames=[self.frame1],
            )


class TestMilestone3RemediationsAndDeepImmutability(unittest.TestCase):
    """Test group 12 & 13: Review Remediations (Deep Immutability, Lifecycle, Typing, Frames, Aliases)."""

    def test_24_deep_immutability_nested_metadata_rejection(self):
        """Attempting to mutate nested metadata in LexicalEntry raises TypeError."""
        entry = LexicalEntry(
            lexical_id="lex_test",
            lemma="test",
            language="en",
            pos=("NOUN",),
            metadata={"source": "initial_source", "nested": {"confidence": 0.95, "tags": ["nlp", "egypt"]}},
        )
        self.assertIsInstance(entry.metadata, MappingProxyType)
        self.assertEqual(entry.metadata["source"], "initial_source")

        with self.assertRaises(TypeError):
            entry.metadata["source"] = "modified"  # type: ignore

        with self.assertRaises(TypeError):
            entry.metadata["nested"]["confidence"] = 1.0  # type: ignore

        self.assertIsInstance(entry.metadata["nested"]["tags"], tuple)
        with self.assertRaises(AttributeError):
            entry.metadata["nested"]["tags"].append("ai")  # type: ignore

    def test_25_deep_immutability_across_all_entities(self):
        """All entities with nested metadata or collections enforce deep immutability."""
        form = LexicalForm(form="dev", normalized_form="dev", grammatical_features={"tense": "present"})
        with self.assertRaises(TypeError):
            form.grammatical_features["tense"] = "past"  # type: ignore

        concept = DomainConcept(
            concept_id="c1",
            canonical_name="Concept",
            concept_type=ConceptType.SKILL,
            metadata={"priority": 1},
        )
        with self.assertRaises(TypeError):
            concept.metadata["priority"] = 2  # type: ignore

        mapping = ConceptLexicalMapping(
            mapping_id="m1", concept_id="c1", lexical_id="lex1", metadata={"rule": "exact"}
        )
        with self.assertRaises(TypeError):
            mapping.metadata["rule"] = "fuzzy"  # type: ignore

        frame = RequirementFrame(
            frame_id="f1",
            canonical_expression="exp",
            head_lemma="exp",
            head_pos="NOUN",
            metadata={"weight": 1.5},
        )
        with self.assertRaises(TypeError):
            frame.metadata["weight"] = 2.0  # type: ignore

        meta = KnowledgeMetadata(
            schema_version="3.0.0", knowledge_version="1.0.0", provenance={"author": "lead"}
        )
        with self.assertRaises(TypeError):
            meta.provenance["author"] = "changed"  # type: ignore

        norm = TextNormalizationResult(
            original_text="text",
            normalized_text="text",
            source_language="en",
            target_language="en",
            normalization_method="NONE",
            model_version=None,
            status=NormalizationStatus.PASSTHROUGH,
            alignment_metadata={"tokens": 1},
        )
        with self.assertRaises(TypeError):
            norm.alignment_metadata["tokens"] = 2  # type: ignore

    def test_26_lifecycle_publication_governance(self):
        """validate_publishable_concept strictly requires LifecycleStatus.APPROVED."""
        draft_concept = DomainConcept(
            concept_id="c_draft",
            canonical_name="Discovered Candidate",
            concept_type=ConceptType.SKILL,
            status=LifecycleStatus.DRAFT,
        )
        proposed_concept = DomainConcept(
            concept_id="c_prop",
            canonical_name="Proposed Candidate",
            concept_type=ConceptType.SKILL,
            status=LifecycleStatus.PROPOSED,
        )
        approved_concept = DomainConcept(
            concept_id="c_app",
            canonical_name="Approved Skill",
            concept_type=ConceptType.SKILL,
            status=LifecycleStatus.APPROVED,
        )

        validate_domain_concept(draft_concept)
        validate_domain_concept(proposed_concept)
        validate_domain_concept(approved_concept)

        with self.assertRaises(InvariantViolationError):
            validate_publishable_concept(draft_concept)
        with self.assertRaises(InvariantViolationError):
            validate_publishable_concept(proposed_concept)

        validate_publishable_concept(approved_concept)

    def test_27_publication_bundle_rejects_unapproved_concepts(self):
        """validate_publication_bundle rejects bundles containing non-approved concepts."""
        draft_concept = DomainConcept(
            concept_id="c_draft_only",
            canonical_name="Unapproved Candidate",
            concept_type=ConceptType.SKILL,
            status=LifecycleStatus.DRAFT,
        )
        lex = LexicalEntry(lexical_id="lex_test", lemma="test", language="en", pos=("NOUN",))

        with self.assertRaises(InvariantViolationError):
            validate_publication_bundle(
                lexical_entries=[lex],
                domain_concepts=[draft_concept],
                morphological_relations=[],
                concept_mappings=[],
                requirement_frames=[],
            )

        validate_knowledge_bundle(
            lexical_entries=[lex],
            domain_concepts=[draft_concept],
            morphological_relations=[],
            concept_mappings=[],
            requirement_frames=[],
            require_approved_lifecycle=False,
        )

    def test_28_concept_store_polysemous_alias_resolution(self):
        """IConceptStore.resolve_alias returns List[DomainConcept], and resolve_single_alias works as concrete template."""
        # Note: MockConceptStore does NOT implement resolve_single_alias! It inherits the concrete default implementation.
        class MockConceptStore(IConceptStore):
            def __init__(self, concepts: List[DomainConcept]):
                self.concepts = {c.concept_id: c for c in concepts}

            def get_by_id(self, concept_id: str) -> Optional[DomainConcept]:
                return self.concepts.get(concept_id)

            def get_by_canonical_name(self, name: str) -> Optional[DomainConcept]:
                return next((c for c in self.concepts.values() if c.canonical_name == name), None)

            def resolve_alias(
                self, alias: str, context_domain: Optional[str] = None
            ) -> List[DomainConcept]:
                matches = [c for c in self.concepts.values() if alias in c.aliases or c.canonical_name == alias]
                if context_domain:
                    matches = [c for c in matches if any(a.domain == context_domain for a in c.domains)]
                return matches

            def get_by_type(self, concept_type: ConceptType) -> List[DomainConcept]:
                return [c for c in self.concepts.values() if c.concept_type == concept_type]

            def get_by_domain(self, domain: str, sub_category: Optional[str] = None) -> List[DomainConcept]:
                return [c for c in self.concepts.values() if any(a.domain == domain for a in c.domains)]

            def get_concepts_for_lexical_id(
                self, lexical_id: str, context_domain: Optional[str] = None
            ) -> List[DomainConcept]:
                return []

            def get_lexical_mappings(self, concept_id: str) -> List[ConceptLexicalMapping]:
                return []

            def get_all_concepts(self) -> List[DomainConcept]:
                return list(self.concepts.values())

        c_cicd = DomainConcept(
            concept_id="c_cicd",
            canonical_name="CI/CD Pipeline",
            concept_type=ConceptType.SKILL,
            domains=[ConceptAssociation(domain="Software Engineering & IT")],
            aliases=["pipeline"],
        )
        c_data = DomainConcept(
            concept_id="c_data",
            canonical_name="Data Pipeline",
            concept_type=ConceptType.SKILL,
            domains=[ConceptAssociation(domain="Data Science & Analytics")],
            aliases=["pipeline"],
        )
        c_sales = DomainConcept(
            concept_id="c_sales",
            canonical_name="Sales Pipeline",
            concept_type=ConceptType.BUSINESS_ACTIVITY,
            domains=[ConceptAssociation(domain="Sales & Business Development")],
            aliases=["pipeline"],
        )

        store = MockConceptStore([c_cicd, c_data, c_sales])

        # Without context: returns all 3 candidates
        candidates = store.resolve_alias("pipeline")
        self.assertEqual(len(candidates), 3)

        # Ambiguous single lookup delegates to inherited template method and returns None
        self.assertIsNone(store.resolve_single_alias("pipeline"))

        # Context-domain disambiguation
        data_candidates = store.resolve_alias("pipeline", context_domain="Data Science & Analytics")
        self.assertEqual(len(data_candidates), 1)
        self.assertEqual(data_candidates[0].canonical_name, "Data Pipeline")

        # Disambiguated single lookup succeeds via template method
        single_res = store.resolve_single_alias("pipeline", context_domain="Data Science & Analytics")
        self.assertIsNotNone(single_res)
        self.assertEqual(single_res.canonical_name, "Data Pipeline")

    def test_29_skill_level_entry_strong_typing_and_immutability(self):
        """SkillLevelEntry replaces Any in level governance contracts."""
        entry = SkillLevelEntry(
            raw_level="Expert",
            governed_level="Advanced",
            skill_type="Technical",
            confidence=1.0,
            metadata={"source": "M1 Level Matrix"},
        )
        validate_skill_level_entry(entry)
        self.assertEqual(entry.raw_level, "Expert")
        self.assertEqual(entry.governed_level, "Advanced")

        with self.assertRaises(FrozenInstanceError):
            entry.governed_level = "Beginner"  # type: ignore

        with self.assertRaises(TypeError):
            entry.metadata["source"] = "modified"  # type: ignore

        with self.assertRaises(ValueError):
            SkillLevelEntry(raw_level="", governed_level="Advanced")

    def test_30_frame_occurrence_validation_and_boundary_checks(self):
        """FrameOccurrence validates character offsets within source_text length."""
        raw_sentence = "Candidates must possess strong experience in Python and SQL database architecture."
        occ = FrameOccurrence(
            occurrence_id="occ_001",
            frame_id="frame_experience_in",
            source_text=raw_sentence,
            start_char=24,
            end_char=37,
            extracted_complement_text="Python and SQL database architecture",
            complement_type=FrameComplement.NOUN_PHRASE,
            job_id="job_12345",
            section_id="sec_req_01",
            confidence=0.98,
            metadata={"engine": "spaCy_parser"},
        )
        validate_frame_occurrence(occ)
        self.assertEqual(occ.extracted_complement_text, "Python and SQL database architecture")
        self.assertEqual(occ.complement_type, FrameComplement.NOUN_PHRASE)

        # end_char < start_char rejection
        with self.assertRaises(ValueError):
            FrameOccurrence(
                occurrence_id="occ_err1",
                frame_id="f1",
                source_text="short",
                start_char=10,
                end_char=5,
                extracted_complement_text="comp",
                complement_type=FrameComplement.NOUN_PHRASE,
            )

        # end_char > len(source_text) rejection
        with self.assertRaises(ValueError):
            FrameOccurrence(
                occurrence_id="occ_err2",
                frame_id="f1",
                source_text="Experience in Python",
                start_char=15,
                end_char=100,  # 100 exceeds len("Experience in Python") which is 20
                extracted_complement_text="Python",
                complement_type=FrameComplement.NOUN_PHRASE,
            )

        # Empty complement text rejection
        with self.assertRaises(ValueError):
            FrameOccurrence(
                occurrence_id="occ_err3",
                frame_id="f1",
                source_text="Experience in Python",
                start_char=0,
                end_char=10,
                extracted_complement_text="   ",
                complement_type=FrameComplement.NOUN_PHRASE,
            )

    def test_31_evidence_scope_and_temporal_validation(self):
        """Evidence validates CountingScope and temporal window consistency."""
        ev = KnowledgeEvidence(
            evidence_id="ev_scoped",
            target_id="concept_sap",
            source_identifier="egypt_jobs_db.job_descriptions",
            raw_occurrences_count=100,
            distinct_sections_count=80,
            distinct_jobs_count=50,
            collected_at="2026-11-06T00:00:00Z",
            counting_scope=CountingScope.TIME_WINDOW,
            time_window_start="2026-01-01",
            time_window_end="2026-06-30",
        )
        validate_evidence(ev)
        self.assertEqual(ev.counting_scope, CountingScope.TIME_WINDOW)

        # Missing snapshot_id for CORPUS_SNAPSHOT
        with self.assertRaises(ValueError):
            KnowledgeEvidence(
                evidence_id="ev_no_snap",
                target_id="concept_sap",
                source_identifier="egypt_jobs_db",
                raw_occurrences_count=10,
                distinct_sections_count=5,
                distinct_jobs_count=5,
                collected_at="2026-11-06T00:00:00Z",
                counting_scope=CountingScope.CORPUS_SNAPSHOT,
                snapshot_id=None,
            )

        # Missing time window for TIME_WINDOW
        with self.assertRaises(ValueError):
            KnowledgeEvidence(
                evidence_id="ev_no_time",
                target_id="concept_sap",
                source_identifier="egypt_jobs_db",
                raw_occurrences_count=10,
                distinct_sections_count=5,
                distinct_jobs_count=5,
                collected_at="2026-11-06T00:00:00Z",
                counting_scope=CountingScope.TIME_WINDOW,
                time_window_start="2026-01-01",
                time_window_end=None,
            )

        # Inverted temporal bounds
        with self.assertRaises(ValueError):
            KnowledgeEvidence(
                evidence_id="ev_time_err",
                target_id="concept_sap",
                source_identifier="egypt_jobs_db",
                raw_occurrences_count=10,
                distinct_sections_count=5,
                distinct_jobs_count=5,
                collected_at="2026-11-06T00:00:00Z",
                counting_scope=CountingScope.TIME_WINDOW,
                time_window_start="2026-12-31",
                time_window_end="2026-01-01",
            )

        # Missing partition_id for SOURCE_PARTITION
        with self.assertRaises(ValueError):
            KnowledgeEvidence(
                evidence_id="ev_no_part",
                target_id="concept_sap",
                source_identifier="egypt_jobs_db",
                raw_occurrences_count=10,
                distinct_sections_count=5,
                distinct_jobs_count=5,
                collected_at="2026-11-06T00:00:00Z",
                counting_scope=CountingScope.SOURCE_PARTITION,
                partition_id="",
            )

    def test_32_freeze_value_rejects_arbitrary_mutable_objects(self):
        """freeze_value rejects arbitrary mutable user objects with TypeError."""
        with self.assertRaises(TypeError):
            freeze_value(CustomMutableObject(value=42))

        # Rejection when nested inside a dictionary
        with self.assertRaises(TypeError):
            freeze_value({"safe_key": 1, "unsafe_obj": CustomMutableObject()})

        # Rejection when nested inside a list
        with self.assertRaises(TypeError):
            freeze_value(["valid_string", CustomMutableObject()])

    def test_33_freeze_value_freezes_sets_to_frozenset(self):
        """freeze_value converts sets to frozenset preserving set semantics."""
        raw_set = {"python", "sql", "docker"}
        frozen = freeze_value(raw_set)
        self.assertIsInstance(frozen, frozenset)
        self.assertEqual(frozen, frozenset({"python", "sql", "docker"}))

        # Rejection of in-place mutation
        with self.assertRaises(AttributeError):
            frozen.add("kubernetes")  # type: ignore


if __name__ == "__main__":
    unittest.main()
