---
name: ecm-arabic-multilingual-nlp
description: Multilingual Arabic-English text processing, Egyptian Arabic dialect normalization, Unicode orthography harmonization, and code-switching tokenization for job vacancy text.
---

# ECM Arabic & Multilingual NLP Processing Standards

## 1. Domain Scope & Objectives
Governs text preprocessing, orthographic normalization, tokenization, character offset preservation, and code-switching handling for Arabic, English, and Franco-Arabic job postings in the Egyptian labor market.

### In-Scope
- Arabic Unicode normalization and orthography harmonization (Alef variants, Taa Marbuta / Haa, Yaa / Alef Maksura).
- Multi-representation text pipeline: `raw_source_text` (immutable ground truth), `canonical_display_text` (clean presentation text), and `normalized_search_index_text` (retrieval token stream).
- Strict character span and offset tracking preserving exact boundaries referencing `raw_source_text`.
- Egyptian Arabic dialectal variants and informal spelling patterns (e.g., "خبره" vs "خبرة", "مهندس برمجيات" vs "سوفت وير ديفلوبر").
- Code-switching tokenization: preserving mixed Arabic and English phrases (e.g., "خبرة 3 سنين في الـ React و Next.js").
- Technical token protection: safeguarding programming language symbols (`C++`, `C#`, `.NET`) during normalization.

### Non-Goals
- Morphological full lemmatization or dependency tree parsing.
- Skill taxonomy mapping (governed by `ecm-hybrid-skill-extraction`).

---

## 2. Technical Contracts & Standards

### The Tri-Representation Architecture
Every text ingestion process MUST generate and preserve three distinct representations:

```
[Raw Ingested Text] ──► (Immutable Ground Truth) ──► raw_source_text
                               │
            ┌──────────────────┴──────────────────┐
            ▼                                     ▼
[Light Sanitization & Formatting]     [Deep Orthographic Normalization]
            │                                     │
            ▼                                     ▼
   canonical_display_text               normalized_search_index_text
(Proper orthography, sanitized HTML,  (Bare Alef, stripped diacritics,
 rendered in UI & highlight snippets)  Haa-harmonized for retrieval ONLY)
```

1. **`raw_source_text` (Immutable):**
   - The exact raw string as delivered from the ingestion source.
   - All character offsets `[start_char, end_char]` emitted by tokenizers and extractors MUST index directly into this string.
2. **`canonical_display_text` (Presentation Layer):**
   - Stripped of malicious HTML/script tags and control characters (`[\x00-\x1F\x7F]`).
   - Standard grammatical orthography preserved: `'ة'` remains `'ة'`, proper Alefs (`'أ'`, `'إ'`) remain intact.
   - Used for UI rendering, job detail pages, and candidate snippet previews.
3. **`normalized_search_index_text` (Indexing & Retrieval Layer):**
   - Harmonized for search recall: Bare Alef (`'ا'`), stripped diacritics, stripped tatweel (`\u0640`).
   - Word-final `'ة'` normalized to `'ه'` for high-recall candidate generation ONLY.

### Crucial Semantic Disambiguation Rule: Taa Marbuta (`ة`) vs Haa (`ه`)
> [!WARNING]
> Normalization of `'ة'` to `'ه'` is strictly an indexing heuristic for candidate token retrieval.
> It MUST NEVER be treated as definitive proof of entity identity.
> Collapsing `'ة'` and `'ه'` can conflate distinct semantic entities (e.g., `"مدرسة"` [school/academic institution] vs `"مدرسه"` [his teacher/instructor]).
> Downstream extractors must verify retrieved candidate spans against `canonical_display_text` before asserting domain entity classification.

### Technical Symbol Protection & Unicode NFKC Safety
- Standard Unicode NFKC normalization can unpredictably decompose or alter technical symbols (e.g., modifying `#` in `C#`, combining characters in `C++`, or altering `.NET`).
- **Standard Protocol:**
  1. Extract and mask all technical tokens (`C++`, `C#`, `F#`, `.NET`, `Node.js`, `CI/CD`) with unique alphanumeric sentinel tokens (e.g., `__TECH_TOKEN_01__`).
  2. Apply Unicode NFKC normalization, strip unwanted control characters, and normalize whitespace.
  3. Re-inject the protected technical tokens into their exact positions while updating the offset mapping ledger.

### Code-Switching & Latin Prefix Preservation
- In Egyptian technical vacancies, English terminology is frequently prefixed with Arabic definite article particles ("الـ" or "للـ"):
  - `"الـ Docker"`, `"للـ Backend"`, `"بالـ Python"`.
- The tokenizer MUST match pattern `/(?:ال|لل|بال)[-_\s]?([A-Za-z0-9+#.]+)/` and output:
  1. Full surface token span in `raw_source_text`.
  2. Isolated Latin entity value (`"Docker"`, `"Backend"`, `"Python"`).

---

## 3. Step-by-Step Processing Workflow

1. **UTF-8 Encoding Validation:**
   - Verify byte sequence validity; reject or sanitize malformed encoding bytes.
2. **Token Masking:**
   - Detect and mask technical symbols (`C#`, `C++`, `.NET`) with sentinel tokens.
3. **Dual Stream Generation:**
   - Stream A (`canonical_display_text`): Clean HTML entities, normalize punctuation, preserve grammatical Arabic.
   - Stream B (`normalized_search_index_text`): Apply Bare Alef, diacritics removal, tatweel removal, and retrieval-space harmonization.
4. **Tokenization with Offset Tracking:**
   - Tokenize text while building an integer array of start and end character offsets referencing `raw_source_text`.
5. **Entity Span Delivery:**
   - Deliver `(token_value, start_char, end_char, is_code_switched)` tuples to downstream extraction engines.

---

## 4. Failure Modes & Mitigations

| Failure Mode | Root Cause | Mitigation Strategy |
|---|---|---|
| **Semantic Collision via Haa/Taa** | Mapping `'ة'` to `'ه'` causes non-skill words to match skill aliases. | Use normalized text for retrieval only; verify candidates against `canonical_display_text`. |
| **Technical Symbol Corruption** | Stripping punctuation removes `+` from `C++` or `#` from `C#`. | Pre-mask technical terms before applying Unicode normalization or character stripping. |
| **Offset Drift Across Transforms** | String alterations (e.g. collapsing whitespace) cause character offsets to point to wrong words. | Build monotonic offset transformation map between raw and sanitized text. |
| **Entity Loss on Code-Switching** | Tokenizer splits "الـPython" into garbage tokens. | Implement dedicated particle stripping regex for Latin identifiers prefixed with Arabic particles. |

---

## 5. Verification Checklist

- [ ] `raw_source_text` is preserved unmodified as immutable ground truth.
- [ ] Both `canonical_display_text` and `normalized_search_index_text` are generated.
- [ ] Technical terms (`C++`, `C#`, `.NET`, `Node.js`) are shielded from normalization decay.
- [ ] Arabic-prefixed English terms ("الـReact") correctly resolved to core entity ("React").
- [ ] All emitted token spans `[start_char, end_char]` accurately locate the verbatim characters in `raw_source_text`.

---

## 6. Primary References
- **Unicode Standard Annex #44 (Unicode Character Database)**: https://www.unicode.org/reports/tr44/
- **Unicode Standard Annex #15 (Unicode Normalization Forms)**: https://www.unicode.org/reports/tr15/
- **CAMeL Tools (NYU Abu Dhabi)**: Arabic Natural Language Processing Toolkit.
- **NLTK Arabic Preprocessing Guidelines**: https://www.nltk.org/
