import csv
from collections import defaultdict

with open('standard_skills_catalog.csv', 'r', encoding='utf-8-sig') as f:
    r = csv.DictReader(f, delimiter=';')
    dom_sub = defaultdict(set)
    for row in r:
        dom_sub[row['domain'].strip()].add(row['sub_category'].strip())

print("=== EXACT 14 DOMAINS AND 61 SUBCATEGORIES ===")
for dom in sorted(dom_sub.keys()):
    print(f"\nDomain: '{dom}' ({len(dom_sub[dom])} subcategories)")
    for sub in sorted(dom_sub[dom]):
        print(f"  - '{sub}'")
