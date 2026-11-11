---
name: ecm-hybrid-skill-extraction
description: Deterministic-first hybrid skill extraction engine combining Aho-Corasick, trie/regex matching, taxonomy alias graphs, and strict LLM fallbacks for Egyptian and MENA job descriptions.
---

# ECM Deterministic-First Hybrid Skill Extraction Engine

## 1. Domain Scope & Objectives
Governs the architecture, execution contracts, and verification gates of the multi-tiered skill extraction pipeline designed to identify technical, functional, and soft skills from Arabic, English, and bilingual Egyptian job postings with high precision, bounded latency, and zero unchecked hallucinations.

### In-Scope
- Multi-tier extraction hierarchy: Exact/Canonical dictionary match -> Trie / Aho-Corasick phrase matching -> Contextual disambiguation -> Fallback LLM extraction.
- Canonical taxonomy graph alignment (mapping aliases, variants, misspellings, and colloquial Arabic synonyms to standard ESCO / Hire Q skill IDs).
- Contextual false-positive filtering (syntactic boundary checks, negative disambiguation, part-of-speech context).
- Confidence scoring and empirical calibration (calibrated confidence ranges, boundary anchoring).
- LLM Gateway operational specification: strict activation criteria, latency/cost budgets, JSON Schema validation, verbatim span grounding, and novel skill quarantine protocol.

### Non-Goals
- Raw Unicode text normalization rules (governed by `ecm-arabic-multilingual-nlp`).
- Offline statistical metric benchmarking and gold dataset governance (governed by `ecm-nlp-evaluation`).

---

## 2. Technical Contracts & The Multi-Tier Extraction Hierarchy

```
[Raw Job Vacancy Text]
         │
         ▼
[Preprocessing & Span Preserving Tokenizer (ecm-arabic-multilingual-nlp)]
         │
         ├── Emit: raw_source_text, canonical_display_text, normalized_search_index_text
         ▼
┌────────────────────────────────────────────────────────────────────────┐
│ TIER 1: Deterministic Aho-Corasick Automaton                          │
│ - Exact dictionary & pre-compiled alias matching                       │
│ - Longest-match greedy span resolution                                 │
│ - Resolves high-frequency technical skills deterministically           │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │
                    Candidate Spans Identified?
                     ├── YES ──► [TIER 2: Contextual Disambiguation Filter]
                     │                 │
                     │          Passes Syntactic Boundary & Negation Rules?
                     │           ├── YES ──► Emitted as Verified Match (Base Confidence 0.85 - 0.98)
                     │           └── NO  ──► Rejected / Discarded
                     │
                     └── NO (Dense Unstructured Prose / Low Recall Candidate)
                                   │
                                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│ TIER 3: Controlled LLM Extraction Gateway                             │
│ - Gated Invocation (Triggered ONLY when explicit threshold criteria met)│
│ - Hard budget: 500ms timeout cap, zero retry on latency failure       │
│ - JSON Schema conformance & Verbatim Character Span Grounding Guard    │
│ - Novel Skill Quarantine (Candidates staged for offline review)        │
└────────────────────────────────────────────────────────────────────────┘
```

### Detailed Tier Contracts

#### Tier 1 — Deterministic Aho-Corasick Automaton
- Loaded with canonical skill entries and pre-compiled aliases (e.g., `["PostgreSQL", "Postgres", "PGSQL", "بوستجريس"]` -> `SKILL_POSTGRESQL`).
- Matches executed against normalized search tokens while preserving original character offsets referencing `raw_source_text`.
- Base confidence: $0.90 \le \text{confidence} \le 0.98$, calibrated by alias specificity and token boundary isolation.

#### Tier 2 — Contextual Disambiguation & Stop-Pattern Pruning
- Word sense disambiguation for polysemous terms:
  - Single-letter / acronym skills (`"C"`, `"R"`, `"Go"`, `"Git"`, `"Spring"`).
  - Require syntactic proximity (within window of 5 tokens) to domain anchor keywords (e.g., `"developer"`, `"programming"`, `"framework"`, `"language"`, `"backend"`, `"code"`).
- Negative pattern pruning:
  - Reject non-technical colloquial occurrences (e.g., `"willing to react to changes"` vs `"React developer"`, `"go to customer site"` vs `"Go engineer"`).

#### Tier 3 — Controlled LLM Extraction Gateway Specification

##### A. Invocation Criteria
The LLM gateway is NEVER invoked on the full document by default. It is activated ONLY when one of the following deterministic conditions is met:
1. **Dense Arabic Text Gap:** An Arabic-language section contains $> 30$ consecutive words without a single Tier 1 skill match.
2. **Ambiguous Boundary Score:** A Tier 1 or regex candidate has an ambiguity score $\ge 0.40$ (e.g. polysemous acronym in an unclear syntactic position).
3. **Novel Skill Discovery Mode:** The ingestion pipeline is explicitly configured for discovery on unclassified corporate postings.

##### B. Operational Boundaries & Budget Caps
- **Timeout Deadline:** Hard $500\text{ ms}$ timeout. If exceeded, the gateway fails open (returns empty LLM candidates; pipeline does not block).
- **Circuit Breaker:** If 3 consecutive requests timeout or error, trip breaker for 60 seconds; log alert and continue Tier 1/2 only.
- **Token Constraints:** Input prompt capped at 350 tokens; max completion tokens capped at 150 tokens.
- **Sampling Parameters:** Temperature $= 0.0$, top_p $= 1.0$.

##### C. Mandatory JSON Output Schema
The LLM response MUST strictly conform to this schema:
```json
{
  "type": "object",
  "properties": {
    "extracted_skills": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "canonical_name": {"type": "string"},
          "verbatim_span": {"type": "string"},
          "start_char": {"type": "integer", "minimum": 0},
          "end_char": {"type": "integer", "minimum": 0},
          "confidence": {"type": "number", "minimum": 0.0, "maximum": 1.0},
          "is_novel": {"type": "boolean"}
        },
        "required": ["canonical_name", "verbatim_span", "start_char", "end_char", "confidence", "is_novel"],
        "additionalProperties": false
      }
    }
  },
  "required": ["extracted_skills"],
  "additionalProperties": false
}
```

##### D. Hallucination & Validation Guards
1. **Verbatim Span Grounding Guard:**
   $$\text{raw\_source\_text}[\text{start\_char}:\text{end\_char}].\text{strip}() == \text{verbatim\_span}.\text{strip}()$$
   If this assertion fails, the entire candidate item is discarded immediately.
2. **Taxonomy Alignment Guard:**
   If `is_novel == false`, `canonical_name` MUST exist in the verified taxonomy registry.
3. **Novel Skill Quarantine Protocol:**
   If `is_novel == true`, the candidate skill is NOT written to the production skills catalog. It is routed to `quarantined_candidate_skills` table with its context window and frequency counter for human-in-the-loop review and clustering.

---

## 3. Step-by-Step Extraction Workflow

1. **Receive Normalized Stream:**
   - Ingest `raw_source_text`, `canonical_display_text`, and `normalized_search_index_text` from `ecm-arabic-multilingual-nlp`.
2. **Execute Tier 1 Aho-Corasick Search:**
   - Query pre-compiled automaton against `normalized_search_index_text`.
   - Map matched token positions back to character offsets in `raw_source_text`.
3. **Apply Span Conflict Resolution (Greedy Longest Match):**
   - If two spans overlap (e.g., `"Node.js Developer"` vs `"Node.js"`), select longest span matching a canonical taxonomy entry.
4. **Execute Tier 2 Context Filters:**
   - Filter candidate spans through polysemous whitelist/blacklist rules.
5. **Evaluate Tier 3 Activation Gate:**
   - If gaps or ambiguities exist and budget permits, invoke LLM Gateway with candidate context window.
   - Run Grounding and Schema validation guards on LLM output.
6. **Emit Structured Entity Graph:**
   - Produce unified list of deduplicated skills containing: `skill_id`, `canonical_name`, `span`, `offsets: [start, end]`, `confidence`, `source_tier`.

---

## 4. Failure Modes & Mitigations

| Failure Mode | Root Cause | Mitigation Strategy |
|---|---|---|
| **Polysemous False Positives** | Short words ("R", "Go", "Git", "Spring") match common English words. | Enforce contextual boundary checks: require programming domain keywords in same sentence. |
| **LLM Hallucinated Skills** | LLM invents non-existent frameworks or skills not mentioned in text. | Enforce strict verbatim character span grounding against `raw_source_text`. |
| **Compound Phrase Fragmentation** | "Machine Learning Engineer" extracted as both "Machine" and "Learning". | Implement greedy longest-prefix match in Aho-Corasick automaton. |
| **High LLM API Costs & Latency** | Directing every job posting to LLM first. | Enforce Deterministic-First gate: only invoke LLM for unresolved ambiguous sections. |
| **Novel Skill Pollution** | Unverified skills directly polluting production taxonomies. | Enforce novel skill quarantine protocol with human approval gate. |

---

## 5. Verification Checklist

- [ ] Deterministic Aho-Corasick automaton executes before any LLM invocation.
- [ ] Overlapping spans resolve in favor of longest canonical taxonomy term.
- [ ] Polysemous words ("Go", "C", "Spring") have explicit contextual whitelist/blacklist checks.
- [ ] LLM fallback responses are strictly schema-validated and groundable in source text.
- [ ] Zero duplicate skill IDs emitted for the same document.
- [ ] All novel skills routed to quarantine storage, never directly committed to production taxonomy.

---

## 6. Primary References
- **Aho-Corasick String Matching Algorithm**: Bell Laboratories (1975).
- **ESCO (European Skills, Competences, and Occupations) Classification**: https://esco.ec.europa.eu/
- **spaCy Rule-based Matching Documentation**: https://spacy.io/usage/rule-based-matching
- **Zod / JSON Schema Specifications**: RFC 8259.
