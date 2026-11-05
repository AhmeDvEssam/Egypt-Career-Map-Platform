"""
Unit Test Suite for Milestone 3.0: Knowledge Contracts & Schema Foundation
==========================================================================
Verifies:
  1. Entity construction, immutability, and validation
  2. Controlled enum validation
  3. Morphological separation: Derivation != Semantic Equivalence
  4. Concept mapping cardinality (1-to-many, many-to-1, polysemy)
  5. Evidence metric integrity: raw >= sections >= jobs >= 0
  6. Requirement-frame validation
  7. Semantic versioning & schema compatibility
  8. Text normalization contracts (pass-through, translation result, failure preservation)
  9. Original-text preservation and immutability
  10. Abstract interface conformance (ABC instantiation checks & stub verification)
  11. Full knowledge bundle referential integrity and invariant checks
"""

import sys
import unittest
from dataclasses import FrozenInstanceError
from pathlib import Path
from typing import Any, Dict, List, Optional

# Add project root to sys.path
PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

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
        # Action (Verb)
        entry_develop = LexicalEntry(
            lexical_id="lex_develop",
            lemma="develop",
            language="en",
            pos=("VERB",),
        )
        # Agent (Noun)
        entry_developer = LexicalEntry(
            lexical_id="lex_developer",
            lemma="developer",
            language="en",
            pos=("NOUN",),
        )
        # Discipline / Process (Noun)
        entry_development = LexicalEntry(
            lexical_id="lex_development",
            lemma="development",
            language="en",
            pos=("NOUN",),
        )

        # Derivation relation: develop -> developer (AGENT_NOUN)
        rel_agent = MorphologicalRelation(
            relation_id="rel_develop_to_developer",
            source_lexical_id=entry_develop.lexical_id,
            target_lexical_id=entry_developer.lexical_id,
            relation_type=MorphologyRelationType.DERIVATION,
            derivation_type=DerivationType.AGENT_NOUN,
        )
        # Derivation relation: develop -> development (ABSTRACT_NOUN)
        rel_abstract = MorphologicalRelation(
            relation_id="rel_develop_to_development",
            source_lexical_id=entry_develop.lexical_id,
            target_lexical_id=entry_development.lexical_id,
            relation_type=MorphologyRelationType.DERIVATION,
            derivation_type=DerivationType.ABSTRACT_NOUN,
        )

        validate_morphological_relation(rel_agent)
        validate_morphological_relation(rel_abstract)

        # Invariant checks: Source and target must remain distinct entities
        self.assertNotEqual(rel_agent.source_lexical_id, rel_agent.target_lexical_id)
        self.assertEqual(rel_agent.derivation_type, DerivationType.AGENT_NOUN)
        self.assertEqual(rel_abstract.derivation_type, DerivationType.ABSTRACT_NOUN)

        # Self-referential relation must be rejected
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

        # 3 contextual mappings from the single lexical ID 'lex_pipeline'
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

        # Verify they share the same lexical_id but map to 3 distinct concepts
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
        # Valid evidence: 50 occurrences across 30 sections in 20 jobs
        ev_valid = KnowledgeEvidence(
            evidence_id="ev_01",
            target_id="concept_sales",
            source_identifier="egypt_jobs_db.job_descriptions",
            raw_occurrences_count=50,
            distinct_sections_count=30,
            distinct_jobs_count=20,
            collected_at="2026-11-05T12:00:00Z",
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
            )

        # Inflation violation: sections > raw
        with self.assertRaises(ValueError):
            KnowledgeEvidence(
                evidence_id="ev_inf1",
                target_id="concept_sales",
                source_identifier="egypt_jobs_db",
                raw_occurrences_count=10,
                distinct_sections_count=15,  # Invalid: 15 sections cannot hold only 10 occurrences
                distinct_jobs_count=5,
                collected_at="2026-11-05T12:00:00Z",
            )

        # Inflation violation: jobs > sections
        with self.assertRaises(ValueError):
            KnowledgeEvidence(
                evidence_id="ev_inf2",
                target_id="concept_sales",
                source_identifier="egypt_jobs_db",
                raw_occurrences_count=20,
                distinct_sections_count=10,
                distinct_jobs_count=15,  # Invalid: 15 jobs cannot be contained in only 10 sections
                collected_at="2026-11-05T12:00:00Z",
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

        # Incompatible major version rejection
        with self.assertRaises(SchemaVersionError):
            validate_metadata(meta, expected_major_schema="4")

        # Malformed version string rejection
        with self.assertRaises(SchemaVersionError):
            parse_semantic_version("not_a_version")
        with self.assertRaises(SchemaVersionError):
            parse_semantic_version("3.0")  # missing patch


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

        # Immutability
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
            # FAILED status without error message must fail validation
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
        # Build a valid mini knowledge bundle
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
            concept_id="concept_python_lang",  # duplicate ID
            canonical_name="Python Duplicate",
            concept_type=ConceptType.SKILL,
        )
        with self.assertRaises(InvariantViolationError):
            validate_knowledge_bundle(
                lexical_entries=[self.entry1],
                domain_concepts=[self.concept1, dup_concept],
                morphological_relations=[],
                concept_mappings=[self.mapping1],
                requirement_frames=[self.frame1],
            )


if __name__ == "__main__":
    unittest.main()
