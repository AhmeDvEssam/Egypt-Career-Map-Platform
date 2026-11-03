import csv
from collections import defaultdict, Counter

# 1. Load Standard Skills Catalog
with open('standard_skills_catalog.csv', 'r', encoding='utf-8-sig') as f:
    reader = csv.DictReader(f, delimiter=';')
    standard_rows = list(reader)

std_taxonomy = defaultdict(set)
subcat_to_domain = {}
std_skill_lookup = {} # skill_lower -> (domain, sub_category, skill_type)

for r in standard_rows:
    d = r['domain'].strip()
    s = r['sub_category'].strip()
    name = r['standard_skill_name'].strip()
    std_taxonomy[d].add(s)
    subcat_to_domain[s.lower()] = d
    std_skill_lookup[name.lower()] = (d, s, r.get('skill_type', 'Hard Skill'))
    # Also index aliases
    aliases = r.get('known_aliases', '')
    if aliases:
        for a in aliases.split(','):
            a_clean = a.strip().lower()
            if a_clean and a_clean not in std_skill_lookup:
                std_skill_lookup[a_clean] = (d, s, r.get('skill_type', 'Hard Skill'))

print(f"Loaded Standard Catalog: {len(standard_rows)} skills across {len(std_taxonomy)} domains and {len(subcat_to_domain)} subcategories.")

# 2. Check Empirical Skills (t5) against Standard Catalog
with open('database_empirical_skills_catalog_t5.csv', 'r', encoding='utf-8-sig') as f:
    reader = csv.DictReader(f, delimiter=';')
    t5_rows = list(reader)

print(f"Loaded Empirical Catalog t5: {len(t5_rows)} skills.")

matched_exact = 0
unmatched_in_std = []

for r in t5_rows:
    name = r['standard_skill_name'].strip().lower()
    if name in std_skill_lookup:
        matched_exact += 1
    else:
        unmatched_in_std.append(r)

print(f"Exact Matches in Standard Benchmark: {matched_exact} ({matched_exact/len(t5_rows)*100:.1f}%)")
print(f"Empirical Skills not in Standard Benchmark: {len(unmatched_in_std)} ({len(unmatched_in_std)/len(t5_rows)*100:.1f}%)")

# Inspect the taxonomy of t5
t5_tax_violations = 0
for r in t5_rows:
    d = r['domain'].strip()
    s = r['sub_category'].strip()
    if d not in std_taxonomy or s not in std_taxonomy[d]:
        t5_tax_violations += 1

print(f"Taxonomy Violations in t5: {t5_tax_violations} (Should be 0)")
