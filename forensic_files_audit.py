import csv
import json
import re
from collections import Counter, defaultdict

print("=== FORENSIC AUDIT OF GENERATED FILES ===")

# -------------------------------------------------------------
# 1. Audit database_empirical_skills_by_domain.csv
# -------------------------------------------------------------
print("\n--- 1. AUDITING database_empirical_skills_by_domain.csv ---")
with open('database_empirical_skills_by_domain.csv', 'r', encoding='utf-8-sig') as f:
    reader = csv.DictReader(f, delimiter=';')
    by_domain_rows = list(reader)

print(f"Total rows in by_domain: {len(by_domain_rows)}")

# Check duplicate (domain, skill) pairs
pair_counts = Counter((r['domain'], r['standard_skill_name'].lower()) for r in by_domain_rows)
dups_by_domain = [k for k, c in pair_counts.items() if c > 1]
print(f"Duplicate (domain, skill) pairs: {len(dups_by_domain)}")

# Domain counts
domain_skill_counts = Counter(r['domain'] for r in by_domain_rows)
print("\nDomain breakdown in by_domain.csv:")
for d, cnt in domain_skill_counts.most_common():
    print(f"  {d:<45}: {cnt} skills")

# Check why Operations & Project Management is so high
# Check fallback mechanism
op_skills = [r for r in by_domain_rows if r['domain'] == 'Operations & Project Management']
tech_in_op = [r for r in op_skills if r['standard_skill_name'] in ['Git', 'Python', 'SQL', 'Docker', 'Java', 'React', 'Linux']]
print("\nTech skills sitting in Operations & Project Management:")
for r in tech_in_op:
    print(f"  {r['standard_skill_name']} in Operations: {r['domain_specific_jobs']} jobs ({r['domain_percentage']})")

# -------------------------------------------------------------
# 2. Audit database_empirical_skills_cross_domain.csv
# -------------------------------------------------------------
print("\n--- 2. AUDITING database_empirical_skills_cross_domain.csv ---")
with open('database_empirical_skills_cross_domain.csv', 'r', encoding='utf-8-sig') as f:
    reader = csv.DictReader(f, delimiter=';')
    cross_rows = list(reader)

print(f"Total rows in cross_domain: {len(cross_rows)}")

# Check nulls or missing
null_primaries = [r['standard_skill_name'] for r in cross_rows if not r['primary_domain']]
print(f"Skills with empty primary_domain: {len(null_primaries)}")

# Check skills where primary domain ended up as Operations & Project Management inappropriately
inappropriate_ops = []
for r in cross_rows:
    if r['primary_domain'] == 'Operations & Project Management':
        if r['standard_skill_name'] in ['Git', 'SQL', 'Python', 'Docker', 'Linux', 'Java', 'HTML', 'CSS', 'JavaScript']:
            inappropriate_ops.append((r['standard_skill_name'], r['primary_domain'], r['secondary_domains'][:60]))

print(f"Tech skills whose PRIMARY domain was wrongly assigned to Operations & Project Management: {len(inappropriate_ops)}")
for s, p, sec in inappropriate_ops:
    print(f"  {s}: Primary=[{p}] | Secondary=[{sec}]")

# -------------------------------------------------------------
# 3. Audit database_empirical_skills_catalog_golden.csv
# -------------------------------------------------------------
print("\n--- 3. AUDITING database_empirical_skills_catalog_golden.csv ---")
with open('database_empirical_skills_catalog_golden.csv', 'r', encoding='utf-8-sig') as f:
    reader = csv.DictReader(f, delimiter=';')
    golden_rows = list(reader)

print(f"Total rows in golden: {len(golden_rows)}")

# Check if the 333 fluff variants are still in the golden file or merged
fluff_checks = ['Compliance Standards', 'Process Compliance', 'Safety Procedures', 'Audit Methodologies', 'Sales Techniques', 'Sales Process']
present_fluff = [r['standard_skill_name'] for r in golden_rows if r['standard_skill_name'] in fluff_checks]
print(f"Check fluff variants presence in golden catalog: {present_fluff}")

# -------------------------------------------------------------
# 4. Audit skills_acronym_dictionary.csv
# -------------------------------------------------------------
print("\n--- 4. AUDITING skills_acronym_dictionary.csv ---")
with open('skills_acronym_dictionary.csv', 'r', encoding='utf-8-sig') as f:
    reader = csv.DictReader(f, delimiter=';')
    acronym_rows = list(reader)

print(f"Total rows in acronym dict: {len(acronym_rows)}")

# Check for single-letter or weird acronyms
weird_acronyms = [r for r in acronym_rows if len(r['acronym']) < 2 or len(r['acronym']) > 8 or not r['full_name']]
print(f"Suspicious acronym entries: {len(weird_acronyms)}")
for r in weird_acronyms[:10]:
    print(f"  [{r['acronym']}] -> '{r['full_name']}'")

# Check for duplicate acronym keys
acr_counts = Counter(r['acronym'].upper() for r in acronym_rows)
dup_acrs = [k for k, c in acr_counts.items() if c > 1]
print(f"Duplicate acronym keys: {len(dup_acrs)} -> {dup_acrs}")
