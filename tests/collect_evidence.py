import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
import io
import csv
import collections
import json
import re
import unittest

sys.stdout.reconfigure(encoding='utf-8')

from linguistic_intelligence.catalog import CatalogLoader
from linguistic_intelligence.proper_nouns import ProperNounShield
from linguistic_intelligence.config import (
    APPROVED_SKILL_TYPES, CLOSED_DOMAINS, CLOSED_SUBCATEGORIES,
    CANONICAL_SKILL_HOMES, DISALLOWED_ALIASES
)

evidence = {}

print("=== STEP 1: INITIALIZING CATALOG LOADER ===")
loader = CatalogLoader()
shield = ProperNounShield()

evidence["loader_all_entries_count"] = len(loader.all_entries)
evidence["unique_standard_skills"] = len(loader.unique_standard_skills)

# --- 1. SOURCE CSV VS LOADED MULTISET ---
catalog_path = r'd:\Hire Q Project\standard_skills_catalog.csv'
with open(catalog_path, 'r', encoding='utf-8-sig') as f:
    reader = csv.reader(f, delimiter=';')
    header = next(reader)
    raw_rows = list(reader)

source_tuples_raw = [(r[0].strip(), r[1].strip(), r[2].strip(), r[3].strip() if len(r)>3 else '') for r in raw_rows]
loaded_tuples_raw = [(e.standard_skill_name, e.domain, e.sub_category, getattr(e, 'raw_skill_type', e.skill_type)) for e in loader.all_entries]
loaded_tuples_norm = [(e.standard_skill_name, e.domain, e.sub_category, e.skill_type) for e in loader.all_entries]

c_source = collections.Counter(source_tuples_raw)
c_loaded_raw = collections.Counter(loaded_tuples_raw)

missing_raw = c_source - c_loaded_raw
extra_raw = c_loaded_raw - c_source

evidence["multiset"] = {
    "source_count": len(source_tuples_raw),
    "loaded_count": len(loaded_tuples_raw),
    "missing_count": sum(missing_raw.values()),
    "extra_count": sum(extra_raw.values()),
    "count_mismatches": sum(1 for k in c_source if c_source[k] != c_loaded_raw.get(k, 0)),
    "identical_duplicates_source": sum(v - 1 for v in c_source.values() if v > 1),
    "identical_duplicates_loaded": sum(v - 1 for v in c_loaded_raw.values() if v > 1),
}

# --- 2. API PRESERVATION MATRIX ---
skills_to_test = [
    ("SQL", 8),
    ("Python", 10),
    ("Power BI", 4),
    ("Microsoft Excel", 25),
    ("JavaScript", 4),
]
api_results = []
for skill, expected_count in skills_to_test:
    entries = loader.get_all_entries_by_skill(skill)
    assocs = loader.get_all_associations(skill)
    api_results.append({
        "skill": skill,
        "expected": expected_count,
        "entries_count": len(entries),
        "assocs_count": len(assocs),
        "entries_match": len(entries) == expected_count,
        "assocs_match": len(assocs) == expected_count,
        "associations": assocs
    })
evidence["api_preservation_samples"] = api_results

# Invariant across all 2,756 skills
source_name_counts = collections.Counter([r[0].strip() for r in raw_rows])
invariant_failures = []
for skill, expected_count in source_name_counts.items():
    actual_entries = loader.get_all_entries_by_skill(skill)
    actual_assocs = loader.get_all_associations(skill)
    if len(actual_entries) != expected_count or len(actual_assocs) != expected_count:
        invariant_failures.append({
            "skill": skill,
            "expected": expected_count,
            "actual_entries": len(actual_entries),
            "actual_assocs": len(actual_assocs)
        })
evidence["invariant_failures_count"] = len(invariant_failures)
evidence["invariant_failures"] = invariant_failures

# --- 3. 90-ROW SKILL TYPE NORMALIZATION AUDIT ---
audit_rows = loader.normalized_skill_types_audit
evidence["audit_rows_count"] = len(audit_rows)
evidence["audit_rows"] = audit_rows

# Check if unapproved types remain
unapproved = loader.unapproved_skill_types
evidence["unapproved_skill_types_count"] = len(unapproved)
evidence["unapproved_skill_types"] = list(unapproved)

# --- 4. OVERLAPPING MATCH MATRIX (14 Cases) ---
test_cases = [
    ("PL/SQL", "SQL", "Preserve PL/SQL as independent skill"),
    ("T-SQL", "SQL", "Preserve intended skill identity"),
    ("Oracle Database", "PL/SQL", "No incorrect PL/SQL mapping"),
    ("GitHub Advanced Security", "GitHub", "Protect complete product name"),
    ("Python for Data Analysis", "Python", "Preserve intended ambiguity"),
    ("JavaScript", "Java", "No unintended partial match"),
    ("Node.js", "JavaScript", "No incorrect equivalence"),
    ("Lead Generation", "Lead", "Preserve complete phrase"),
    ("End User Support", "Lead User", "No false partial match"),
    ("Senior Living", "Senior", "Preserve complete phrase"),
    ("Senior Python Developer", "Senior", "Preserve seniority context"),
    ("Master Data Management", "Master", "Preserve complete phrase"),
    ("Scrum Master", "Master", "Preserve complete phrase"),
    ("Google Tag Manager (GTM)", "Google Tag Manager / GTM", "Preserve one logical skill"),
]

overlap_results = []
for text, conflict, expected_behavior in test_cases:
    # Test both exact and regex matching
    exact_matches = loader.get_all_exact_matches(text)
    regex_matches = loader.get_all_regex_matches(text)
    is_protected_proper = shield.is_protected_proper_noun(text)
    is_protected_compound = loader.is_protected_compound(text)
    
    # Combined matched names
    all_matched_names = set([e.standard_skill_name for e in exact_matches] + [e.standard_skill_name for e in regex_matches])
    
    overlap_results.append({
        "input": text,
        "potential_conflict": conflict,
        "expected_behavior": expected_behavior,
        "exact_matches": [f"{e.standard_skill_name} ({e.domain})" for e in exact_matches],
        "regex_matches": [f"{e.standard_skill_name} ({e.domain})" for e in regex_matches],
        "all_matched_names": sorted(list(all_matched_names)),
        "is_protected_proper": is_protected_proper,
        "is_protected_compound": is_protected_compound,
    })
evidence["overlapping_results"] = overlap_results

# --- 5. DETERMINISM (10 REPEATED EXECUTIONS) ---
determinism_inputs = [
    "SQL", "Python", "Microsoft Excel", "PL/SQL", "GitHub Advanced Security", 
    "JavaScript", "Scrum Master", "Lead Generation", "Senior Python Developer"
]
determinism_results = []
for inp in determinism_inputs:
    runs = []
    for _ in range(10):
        em = [e.standard_skill_name + "::" + e.domain + "::" + e.sub_category for e in loader.get_all_exact_matches(inp)]
        rm = [e.standard_skill_name + "::" + e.domain + "::" + e.sub_category for e in loader.get_all_regex_matches(inp)]
        assocs = loader.get_all_associations(inp)
        runs.append((em, rm, assocs))
    
    # Check equality across all 10 runs
    membership_identical = all(set(r[0]) == set(runs[0][0]) and set(r[1]) == set(runs[0][1]) and set(tuple(a) for a in r[2]) == set(tuple(a) for a in runs[0][2]) for r in runs)
    ordering_identical = all(r[0] == runs[0][0] and r[1] == runs[0][1] and r[2] == runs[0][2] for r in runs)
    counts_identical = all(len(r[0]) == len(runs[0][0]) and len(r[1]) == len(runs[0][1]) and len(r[2]) == len(runs[0][2]) for r in runs)
    
    determinism_results.append({
        "input": inp,
        "run_count": 10,
        "membership_identical": membership_identical,
        "ordering_identical": ordering_identical,
        "counts_identical": counts_identical,
        "result": "PASS" if (membership_identical and ordering_identical and counts_identical) else "FAIL"
    })
evidence["determinism_results"] = determinism_results

# --- 6. SINGLE-MATCH API CALL SITES AUDIT ---
call_sites = []
code_dirs = [r'd:\Hire Q Project\linguistic_intelligence', r'd:\Hire Q Project\tests']
pattern = re.compile(r'(get_exact_match|get_regex_match)\s*\(')

for cdir in code_dirs:
    for root, _, files in os.walk(cdir):
        for f in files:
            if f.endswith('.py'):
                fp = os.path.join(root, f)
                with open(fp, 'r', encoding='utf-8') as src_file:
                    for lno, line in enumerate(src_file, 1):
                        m = pattern.search(line)
                        if m:
                            call_sites.append({
                                "file": os.path.relpath(fp, r'd:\Hire Q Project'),
                                "line": lno,
                                "func": m.group(1),
                                "code": line.strip()
                            })
evidence["call_sites"] = call_sites

# Save evidence to JSON
output_path = r'd:\Hire Q Project\.md\collected_evidence.json'
with open(output_path, 'w', encoding='utf-8') as out:
    json.dump(evidence, out, indent=2, ensure_ascii=False)

print(f"Evidence collected and saved to {output_path}")
