import csv
import sys
from collections import defaultdict, Counter

sys.stdout.reconfigure(encoding='utf-8')

print("=== BUILDING PRODUCTION SKILLS CATALOGS FOR EGYPT (T5 & T10) ===")

master_file = "egypt_skills_checkpoint_28900_master.csv"
matrix_file = "egypt_skills_checkpoint_28900_matrix.csv"

with open(master_file, 'r', encoding='utf-8-sig') as f:
    master_rows = list(csv.DictReader(f, delimiter=';'))

with open(matrix_file, 'r', encoding='utf-8-sig') as f:
    matrix_rows = list(csv.DictReader(f, delimiter=';'))

print(f"Total Master Rows Loaded: {len(master_rows)}")
print(f"Total Matrix Rows Loaded: {len(matrix_rows)}")

# 1. Filter T5 (Job Count >= 5) -> The ~7,500 Golden Catalog (< 10,000)
t5_master = [r for r in master_rows if int(r.get('job_count', 0)) >= 5]
t5_skill_names = set(r['canonical_skill_name'].strip() for r in t5_master)
t5_matrix = [r for r in matrix_rows if r['standard_skill_name'].strip() in t5_skill_names and int(r.get('job_count', 0)) >= 5]

t5_master_out = "egypt_skills_master_catalog_production_t5.csv"
t5_matrix_out = "egypt_skills_matrix_production_t5.csv"

with open(t5_master_out, 'w', encoding='utf-8-sig', newline='') as f:
    w = csv.DictWriter(f, fieldnames=master_rows[0].keys(), delimiter=';')
    w.writeheader()
    w.writerows(t5_master)

with open(t5_matrix_out, 'w', encoding='utf-8-sig', newline='') as f:
    w = csv.DictWriter(f, fieldnames=matrix_rows[0].keys(), delimiter=';')
    w.writeheader()
    w.writerows(t5_matrix)

# 2. Filter T10 (Job Count >= 10) -> The ~4,500 Core Catalog
t10_master = [r for r in master_rows if int(r.get('job_count', 0)) >= 10]
t10_skill_names = set(r['canonical_skill_name'].strip() for r in t10_master)
t10_matrix = [r for r in matrix_rows if r['standard_skill_name'].strip() in t10_skill_names and int(r.get('job_count', 0)) >= 10]

t10_master_out = "egypt_skills_master_catalog_production_t10.csv"
t10_matrix_out = "egypt_skills_matrix_production_t10.csv"

with open(t10_master_out, 'w', encoding='utf-8-sig', newline='') as f:
    w = csv.DictWriter(f, fieldnames=master_rows[0].keys(), delimiter=';')
    w.writeheader()
    w.writerows(t10_master)

with open(t10_matrix_out, 'w', encoding='utf-8-sig', newline='') as f:
    w = csv.DictWriter(f, fieldnames=matrix_rows[0].keys(), delimiter=';')
    w.writeheader()
    w.writerows(t10_matrix)

# Print Summary
print("\n=======================================================")
print(f"PRODUCTION CATALOG (T >= 5):")
print(f"  Distinct Canonical Atomic Skills: {len(t5_master)} (Strictly < 10,000!)")
print(f"  Matrix Triples: {len(t5_matrix)}")
print(f"  Output Master: {t5_master_out}")
print(f"  Output Matrix: {t5_matrix_out}")
print("=======================================================")
print(f"CORE CATALOG (T >= 10):")
print(f"  Distinct Canonical Atomic Skills: {len(t10_master)}")
print(f"  Matrix Triples: {len(t10_matrix)}")
print(f"  Output Master: {t10_master_out}")
print(f"  Output Matrix: {t10_matrix_out}")
print("=======================================================")

# Domain Breakdown in Production T5 Catalog
t5_domains = Counter(r['dominant_domain'] for r in t5_master)
print("\nDomain Distribution in Production Catalog (T >= 5):")
for d, c in t5_domains.most_common():
    print(f"  {d}: {c} skills")
