---
name: ecm-nlp-evaluation
description: Empirical evaluation, precision, recall, F1, span matching, regression test suites, and gold standard benchmarking for NLP and skill extraction models in Egypt Career Map.
---

# ECM NLP Evaluation & Regression Benchmarking

## 1. Domain Scope & Objectives
Governs empirical evaluation frameworks, gold dataset curation, performance metrics, and regression testing for NLP components, skill extractors, and taxonomy classifiers across Egypt Career Map.

### In-Scope
- Gold standard test corpus governance, annotation contracts, and inter-annotator agreement (Cohen's Kappa $\kappa \ge 0.80$).
- Statistical metric computation: Precision, Recall, Micro/Macro F1-Score, Exact Span Match vs Partial Overlap (IoU $\ge 0.70$).
- Stratified evaluation across frequency tiers: Head (high-frequency), Torso (medium-frequency), and Tail (specialized/infrequent).
- Slice-based performance breakdown across linguistic profiles (Arabic-only, English-only, and Bilingual Egyptian postings).
- Automated regression test harness (`scripts/evaluate_nlp.py`) and schema verification (`resources/gold_corpus_schema.json`).
- Diagnostic reporting: Top-10 False Positives and False Negatives analysis.

### Non-Goals
- Real-time extraction execution (governed by `ecm-hybrid-skill-extraction`).
- General software unit testing (governed by `ecm-testing-verification`).

---

## 2. Technical Contracts & Standards

### Empirical Metric Target Contracts
Metrics are calibrated against stratified empirical targets rather than monolithic arbitrary numbers:

| Stratification Tier | Sample Characteristic | Target Precision ($P$) | Target Recall ($R$) | Minimum $F_1$ |
|---|---|---|---|---|
| **Head Skills** | Top 20% most frequent skills in Egypt (e.g. Python, React, SQL, Excel) | $\ge 0.92$ | $\ge 0.88$ | $\ge 0.90$ |
| **Torso Skills** | Moderate frequency skills (e.g. Docker, Flutter, PostgreSQL, Next.js) | $\ge 0.85$ | $\ge 0.80$ | $\ge 0.82$ |
| **Tail Skills** | Niche, emerging, or domain-specialized skills (e.g. Terraform, BioPython) | $\ge 0.80$ | $\ge 0.70$ | $\ge 0.75$ |
| **Overall Micro-$F_1$** | Weighted global document corpus | $\ge 0.88$ | $\ge 0.82$ | $\ge 0.85$ |

### Span Matching Contracts
1. **Strict Exact Match:**
   - Both the canonical `skill_id` and the verbatim token span `[start_char, end_char]` must match the gold annotation exactly:
     $$\text{start}_{\text{pred}} == \text{start}_{\text{gold}} \quad \text{and} \quad \text{end}_{\text{pred}} == \text{end}_{\text{gold}}$$
2. **Relaxed Boundary Match (IoU $\ge 0.70$):**
   - Candidate canonical `skill_id` matches, and character overlap satisfies Intersection-over-Union:
     $$\text{IoU} = \frac{\max(0, \min(\text{end}_p, \text{end}_g) - \max(\text{start}_p, \text{start}_g))}{\max(\text{end}_p, \text{end}_g) - \min(\text{start}_p, \text{start}_g)} \ge 0.70$$

### Benchmark Corpus Governance
- **Canonical Schema:** Verified by JSON Schema at `resources/gold_corpus_schema.json`.
- **Benchmark Dataset:** Maintained at `resources/benchmark_gold_corpus.jsonl`.
- **Evaluation Harness:** Executable via `python .agents/skills/ecm-nlp-evaluation/scripts/evaluate_nlp.py`.

---

## 3. Step-by-Step Benchmarking Workflow

1. **Corpus Ingestion & Integrity Check:**
   - Load `resources/benchmark_gold_corpus.jsonl` and validate against `gold_corpus_schema.json`.
2. **Pipeline Execution:**
   - Run candidate extraction pipeline (e.g., `ecm-hybrid-skill-extraction`) over benchmark text entries.
   - Record predicted skills, character offsets, and inference latency.
3. **Metric Computation via Harness:**
   - Execute `evaluate_nlp.py` passing candidate predictions.
   - Output exact match and partial match Precision, Recall, and F1 across Head, Torso, and Tail strata.
4. **Diagnostic Error Audit:**
   - Extract top false positive spans (over-predictions) and false negative spans (missed ground truth).
   - Categorize errors into: Tokenizer boundary error, Polysemy error, Synonym gap, or Annotation ambiguity.
5. **Regression CI Gate:**
   - If overall $F_1$ drops by $> 1.0\%$ or any category precision drops by $> 2.0\%$ relative to baseline, fail the evaluation gate and generate diagnostic failure summary.

---

## 4. Failure Modes & Mitigations

| Failure Mode | Root Cause | Mitigation Strategy |
|---|---|---|
| **Data Leakage in Evaluation** | Benchmark test set inadvertently included in dictionary compilation. | Strict separation: benchmark dataset maintained in read-only test fixture directory, excluded from training dictionaries. |
| **Silent Metric Inflation** | High volume of trivial Head skills masks complete failure on specialized skills. | Compute Macro-$F_1$ and stratify metrics across Head, Torso, and Tail tiers. |
| **Annotator Inconsistency** | Disagreements on boundary extents (e.g. "React" vs "React.js library"). | Enforce strict annotation guideline document and measure inter-annotator agreement (Cohen's Kappa $\ge 0.80$). |

---

## 5. Verification Checklist

- [ ] Benchmark corpus strictly conforms to `resources/gold_corpus_schema.json`.
- [ ] Precision, Recall, and F1 computed for both Exact Match and Relaxed Match (IoU $\ge 0.70$).
- [ ] Results stratified across Head, Torso, and Tail frequency tiers.
- [ ] Evaluation harness `evaluate_nlp.py` executes reproducibly and exits 0 on baseline.
- [ ] Zero network requests or external dependencies required during offline evaluation run.

---

## 6. Primary References
- **MUC-6 / CoNLL Named Entity Recognition Evaluation Metric Standards**: Conference on Computational Natural Language Learning.
- **scikit-learn Classification Metrics**: https://scikit-learn.org/stable/modules/model_evaluation.html
- **Holistic Evaluation of Language Models (HELM)**: Stanford CRFM.
