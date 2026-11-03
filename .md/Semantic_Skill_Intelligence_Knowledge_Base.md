# Egypt Career Map --- Semantic Skill Intelligence Knowledge Base

## 1. القرار المعماري

فهمك صحيح: نريد Knowledge Base منظمة وقابلة للقراءة آليًا، تحتوي على
المصطلحات، والـvocabularies، والـprotected phrases، والـmodifiers،
والـlinguistic/regex patterns، والـcontextual rules، والـtaxonomy،
والـrelationships، والاختبارات. محرك Python يقرأ هذه المعرفة ويطبقها
بشكل deterministic بدل دفن المعرفة داخل if-statements متناثرة.

لكن لا نحاول تخزين «كل المعاني الممكنة»؛ اللغة مفتوحة ومتغيرة. نبني
تغطية واسعة قابلة للقياس، ونضيف fallback يكتشف ما ينقصنا. اكتشاف مصطلح
جديد لا يعني فهم معناه تلقائيًا.

افصل بين: 1. **Knowledge Authoring:** توليد وتجميع المعرفة بمساعدة AI.
2. **Knowledge Base:** تخزين منظم، versioned، وله provenance وحالة
مراجعة. 3. **Deterministic Runtime:** محرك يقرأ المعرفة، يطبق قواعد
بأولوية واضحة، ويعيد القرار مع evidence أو يعلن الغموض.

## 2. مجموعات البيانات المقترحة

هذه logical datasets؛ لا يلزم إنشاء كل شيء كجدول PostgreSQL من البداية.
يمكن البدء بملفات CSV/JSON version-controlled.

  -----------------------------------------------------------------------
  Dataset                             المحتوى
  ----------------------------------- -----------------------------------
  `knowledge_entities`                الكيانات: Python، GitHub Advanced
                                      Security، ISTQB

  `entity_types`                      Skill, Tool, Product, Technology,
                                      Certification, Language, Category

  `vocabularies`                      programming languages, spoken
                                      languages, soft skills, tools,
                                      certifications وغيرها

  `protected_phrases`                 عبارات كاملة يجب حمايتها من التقسيم
                                      أو تفسير modifier داخلها

  `modifier_lexicon`                  Advanced, Beginner, Senior, Lead,
                                      Junior وغيرها مع وظيفة كل منها

  `modifier_patterns`                 أنماط ظهور proficiency أو seniority
                                      أو qualifiers

  `linguistic_patterns`               knowledge of X, experience with X,
                                      X (5+ years) وغيرها

  `contextual_rules`                  قواعد positive/negative مرتبطة
                                      بالسياق

  `taxonomy_nodes`                    Categories وSubcategories والعقد
                                      التصنيفية

  `semantic_relationship_types`       تعريف أنواع العلاقات واتجاهها

  `semantic_relationships`            علاقات موثقة بين كيانات بعينها

  `rule_precedence`                   ترتيب أولوية القواعد وحل التعارض

  `test_cases`                        positive, negative, ambiguous,
                                      adversarial cases

  `unresolved_candidates`             المصطلحات غير المعروفة وتكرارها
                                      وسياقاتها

  `knowledge_sources`                 مصدر كل معلومة وحالتها

  `knowledge_versions`                إصدارات المعرفة والتغييرات
  -----------------------------------------------------------------------

حقول مشتركة مقترحة: `record_id`, `term/pattern`, `record_type`,
`entity_type`, `language`, `domain`, `rule_action`, `priority`,
`positive_context`, `negative_context`, `review_status`, `source_type`,
`source_reference`, `version`, `notes`.

استخدم حالات مثل `PROPOSED`, `REVIEWED`, `APPROVED`, `REJECTED`. أي
معلومة مولدة بالـAI تبدأ `PROPOSED` ولا تدخل runtime المعتمد قبل
validation والمراجعة.

## 3. كيف يقرر النظام معنى Advanced؟

لا تستخدم `if "advanced" in text`. استخدم precedence واضحة:

1.  Exact protected phrase.
2.  Exact full-phrase catalog/entity match.
3.  Longest known phrase match.
4.  Known linguistic templates.
5.  Positive and negative contextual rules.
6.  Modifier extraction فقط إذا دعمه السياق وقاعدة معتمدة.
7.  إذا ظل أكثر من تفسير معقول: `AMBIGUOUS/NEEDS_REVIEW` داخليًا، مع
    الحفاظ على النص الأصلي.

أمثلة:

  -----------------------------------------------------------------------
  Input                               التفسير المحتمل
  ----------------------------------- -----------------------------------
  Advanced Threat Protection          احفظ العبارة ككيان كامل إذا كانت
                                      معتمدة

  GitHub Advanced Security            احفظ الاسم الكامل ككيان

  Advanced Python                     قد يكون Advanced مستوى؛ لا تحسم دون
                                      قاعدة وسياق

  Senior Care                         Senior جزء من المصطلح إذا كان
                                      المصطلح الكامل معروفًا

  Senior Python Developer             Senior غالبًا job seniority وليس
                                      skill proficiency

  Lead Generation                     Lead جزء من المصطلح

  Lead Software Engineer              Lead غالبًا job seniority

  ISTQB Advanced Level                مستوى شهادة، لا proficiency تلقائيًا
  -----------------------------------------------------------------------

يجب الفصل بين `Skill Proficiency` و`Job Seniority` و`Lexical Component`.
لا تحول Senior أو Lead تلقائيًا إلى Advanced، ولا تضعهما في `skill_level`
إلا إذا تغير تعريف هذا العمود واعتمد ذلك صراحة.

## 4. Fallback لاكتشاف نقص المعرفة

-   جرّب القواعد والعبارات المعتمدة أولًا.
-   إذا لم يوجد تفسير موثوق، سجّل candidate مع frequency وأمثلة سياقية.
-   استخرج recurring unknown phrases وpossible aliases/acronyms
    والـcandidate modifiers.
-   استخدم AI لاقتراح التفسير أو نوع الكيان أو العلاقة، لا لاعتمادها
    تلقائيًا.
-   نفّذ schema validation، duplicate/conflict detection، regex
    compilation، واختبارات positive/negative.
-   بعد المراجعة فقط تُرقّى السجلات إلى `APPROVED` في إصدار جديد.

لا تعتبر كل unknown noise، ولا تعتبر كل اقتراح AI حقيقة.

## 5. Semantic relationships

لا تخلط category membership مع parent-child skill decomposition. عرّف
العلاقات بشكل منفصل، مثل:

-   `CATEGORY_CONTAINS` / `MEMBER_OF`
-   `PARENT_SKILL_OF` / `SUBSKILL_OF`
-   `HAS_SPECIALIZATION` / `SPECIALIZATION_OF`
-   `ALIAS_OF`
-   `RELATED_TO`
-   `REQUIRES`
-   `USED_WITH`
-   `TOOL_FOR`
-   `CERTIFIES`
-   `ISSUED_BY`

مثال: `AI Development Tools → Claude Code` قد تكون `CATEGORY_CONTAINS`،
وليست بالضرورة `PARENT_SKILL_OF`. لا تستنتج علاقة من co-occurrence أو
تشابه الاسم فقط. كل علاقة يجب أن تحمل direction, evidence, provenance,
review status.

## 6. حدود المراحل

**Current Atomic Skill Decomposition:** استخراج atomic skills مع الحفاظ
على الـ13-column schema والقيود الحالية. يمكنه استهلاك linguistic
knowledge المعتمدة، لكنه لا يتحول الآن إلى Semantic Knowledge Graph
كامل.

**Later Semantic Skill Intelligence:** entity classification، taxonomy
mapping، semantic relationships، parent/child reasoning، definitions،
alias resolution، knowledge graph.

من الآن حافظ على raw text والسياق والـevidence حتى لا نفقد ما ستحتاجه
المرحلة اللاحقة.

------------------------------------------------------------------------

# Gemini Prompt --- Design/Audit Only

انسخ هذا الـprompt إلى Gemini مع ملفات المشروع والخطط ذات الصلة. هذا
checkpoint للتصميم والمراجعة فقط؛ لا يسمح بالتنفيذ.

``` text
PROJECT: Egypt Career Map
TASK: Design the Deterministic Semantic Skill Intelligence Knowledge Base
MODE: DESIGN AND AUDIT ONLY — DO NOT IMPLEMENT

Inspect the actual repository files, source code, CSV/JSON datasets, catalogs, taxonomies, level matrices, aliases, acronym dictionaries, plans, and database schemas available to you. Do not invent file contents or database facts.

CONTEXT
- PostgreSQL database: egypt_jobs_db; it must remain read-only.
- Approximately 28,824 unique raw skill names.
- Atomic Decomposition processes each unique raw_skill once. job_count is COUNT(DISTINCT job_id). Do not duplicate output rows per posting.
- Atomic Decomposition has a frozen 13-column output schema and strict scope.
- Two original specifications remain essential:
  (1) Atomic Skill Decomposition & Skill Graph Engine — Implementation Prompt.
  (2) Comprehensive Linguistic Coverage & Skill Pattern Intelligence Specification, including “MANDATORY EXPANSION: COMPREHENSIVE SKILL VOCABULARY, LANGUAGE COVERAGE, LEVEL PATTERNS & LINGUISTIC RULES”.
- Do not discard, silently replace, or implement either original prompt.

VISION
Design a broad, structured, versioned Knowledge Base consumed by a deterministic Python engine. It should cover terminology, entity types, vocabularies, protected phrases, proficiency modifiers, job seniority indicators, linguistic/regex patterns, contextual positive/negative rules, taxonomy concepts, semantic relationships, tests, provenance, review status, and versioning.

Do not claim that any finite dataset contains every possible term or meaning. Design high coverage plus unknown-term discovery and explicit ambiguity handling. Unknown does not mean noise. AI-generated does not mean true. If evidence is insufficient, preserve the original phrase and return an unresolved/ambiguous outcome rather than guessing.

REQUIRED DELIVERABLES

1. REPOSITORY/DATA AUDIT
Inspect relevant files and report verifiable schemas, counts, reusable knowledge, conflicts, and gaps. Cite exact file/section/line locations where possible.

2. KNOWLEDGE DOMAIN INVENTORY
Design detailed domains/subdomains for programming/query/scripting/markup languages, data formats, frameworks, developer and AI tools, cloud, infrastructure, cybersecurity, enterprise software, spoken languages, soft skills, business/industry skills, certifications, proficiency, seniority, qualifiers, protected phrases, acronyms, and abbreviations.
For each: define scope, exclusions, schema, ambiguity risks, validation, and phase relevance.

3. DATA MODEL
Evaluate normalized logical datasets/tables including knowledge_entities, entity_types, vocabularies, protected_phrases, modifier_lexicon, modifier_patterns, linguistic_patterns, contextual_rules, taxonomy_nodes, semantic_relationship_types, semantic_relationships, rule_precedence, test_cases, unresolved_candidates, knowledge_sources, knowledge_versions.
For each provide purpose, primary key, columns/types, constraints, foreign keys, indexes, examples, and whether to start in CSV/JSON or PostgreSQL. Distinguish entity identity, aliases, patterns, rules, taxonomy membership, and relationships. Avoid both one giant table and unnecessary normalization.

4. DETERMINISTIC DECISION ENGINE
Specify a deterministic precedence pipeline covering exact full phrase, longest match, protected phrases, catalog match, aliases/acronyms, modifier extraction, linguistic templates, positive/negative context, delimiter decomposition, entity classification, ambiguity fallback.
Explain conflict resolution and evidence recording.
Work through: Advanced Threat Protection, GitHub Advanced Security, Advanced Python, Advanced Excel, ISTQB Advanced Level, Senior Care, Senior Python Developer, Lead Generation, Lead Software Engineer, Advanced Data Analytics, PL/SQL, Civil & Structural Engineering.
For each show candidate interpretations, consulted knowledge, precedence path, outcome, evidence, and confidence rationale.
Never convert Senior/Lead to skill proficiency automatically.

5. RELATIONSHIP ONTOLOGY
Distinguish CATEGORY_CONTAINS/MEMBER_OF, PARENT_SKILL_OF/SUBSKILL_OF, HAS_SPECIALIZATION, ALIAS_OF, RELATED_TO, REQUIRES, USED_WITH, TOOL_FOR, CERTIFIES, ISSUED_BY.
Classify hierarchical, associative, and equivalence relations. Do not infer parent-child from co-occurrence or string similarity alone.
Use AI Development Tools/Claude Code, Programming Languages/Python, Database Management/SQL. Every relationship needs direction, evidence, provenance, and review status.

6. AI KNOWLEDGE GENERATION
Design repeatable domain-by-domain LLM generation batches with strict output schemas, provenance, positive/negative/ambiguous examples, deduplication, conflict detection, validation, human review, approval, versioning, and rollback. AI proposals default to PROPOSED, not APPROVED. Do not fabricate sources or claim completeness.

7. UNKNOWN/GAP DISCOVERY
Mine real raw-skill data for recurring unmatched phrases, multiword entities, aliases, acronyms, modifiers, protected phrases, taxonomy/relationship gaps. Include frequency and representative contexts. Preserve source data. Define review and promotion workflow. Never silently mutate catalog/taxonomy.

8. REGEX GOVERNANCE
Store regex in a versioned registry. Compile every configured regex before processing. Add positive, negative, boundary, Unicode, and adversarial tests. Detect duplicates, unreachable/conflicting/overbroad patterns; avoid catastrophic backtracking. Define engine, flags, boundaries, and precedence. Invalid regex must block processing.

9. EVALUATION
Design gold-standard positive, negative, ambiguous, adversarial, regression tests; coverage metrics by domain and pattern; precision/recall and error categories. Do not improve recall by causing destructive false positives. Define measurable acceptance criteria.

10. PHASE BOUNDARIES
Separate:
A. Current Atomic Decomposition.
B. Knowledge Base foundations needed now.
C. Later Semantic Intelligence/Knowledge Graph.
Explain how Atomic Decomposition consumes approved linguistic knowledge without changing its frozen output schema or scope. Identify any required change to the two original prompts; do not silently change them.

11. TRACEABILITY AND FINAL OUTPUT
Provide repository audit, domain inventory, schemas with sample records, deterministic flow, relationship ontology, AI generation workflow, unknown discovery workflow, regex validation, benchmark, phased roadmap, unresolved decisions, and a traceability matrix mapping both original prompts to the architecture.

STRICT RESTRICTIONS
- DESIGN/AUDIT ONLY. No implementation code.
- No database writes or schema changes.
- Do not alter approved catalog/taxonomy.
- Do not begin implementation.
- Do not delete, replace, or silently rewrite either original prompt.
- End with concise approval checklist and wait for explicit authorization.
```

------------------------------------------------------------------------

# ماذا نفعل بالـPrompts القديمة؟

1.  **Atomic Decomposition prompt:** نحتفظ به كمواصفة المرحلة الحالية.
    لا نرسله للتنفيذ الآن قبل إكمال المراجعة النهائية، ونعدله فقط لتحديد
    طريقة استهلاك Knowledge Base المعتمدة دون توسيع نطاقه.
2.  **Linguistic Coverage prompt:** لا نرميه ولا نرسله كما هو. نوسعه
    ليغطي knowledge schemas، provenance، AI generation، validation،
    ambiguity، fallback، وgap discovery.
3.  لا ندمج كل شيء في prompt ضخم واحد. الأفضل مواصفات مترابطة: Knowledge
    Base design/generation، Atomic Decomposition implementation،
    وLinguistic Coverage data-generation.
4.  الخطوة التالية هي إرسال Gemini Prompt أعلاه في وضع Design/Audit
    Only. بعد مراجعة الناتج واعتماده، ننتج النسخ التنفيذية النهائية. لا
    يبدأ Gemini coding قبل موافقتك الصريحة.

## حفظ المستند

اسم الملف المقترح داخل مشروعك:
`docs/knowledge_base/semantic_skill_intelligence_knowledge_base.md`

هذا الملف مرفق بهذه المحادثة ويمكنك الاحتفاظ بنسخة منه داخل مجلد
المشروع. للعثور عليه لاحقًا، ابحث في المحادثة عن:
`Semantic Skill Intelligence Knowledge Base`
