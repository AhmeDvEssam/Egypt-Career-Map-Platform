import csv
import sys
from collections import defaultdict, Counter

sys.stdout.reconfigure(encoding='utf-8')

print("=== CONSOLIDATING BATCHES 1 TO 90 (MILESTONE 9000) ===")

all_rows = []
raw_skills_seen = set()
skills_by_canonical = defaultdict(list)

for b in range(1, 91):
    fpath = f"batch_{b}_results.csv"
    with open(fpath, 'r', encoding='utf-8-sig') as f:
        r = csv.DictReader(f, delimiter=';')
        for row in r:
            raw_input = row['raw_input'].strip()
            raw_skills_seen.add(raw_input)
            canon = (row.get('standard_skill_name') or row.get('clean_name', '')).strip()
            all_rows.append(row)
            skills_by_canonical[canon].append(row)

# 1. Consolidated file
cons_file = "egypt_skills_consolidated_batches_1_to_90.csv"
with open(cons_file, 'w', encoding='utf-8-sig', newline='') as f:
    fieldnames = [
        'batch_id', 'skill_index', 'skill_id', 'raw_input', 'clean_name',
        'standard_skill_name', 'skill_level', 'job_count', 'old_domain',
        'old_sub', 'new_domain', 'new_sub', 'skill_type', 'skill_priority',
        'status', 'reason'
    ]
    w = csv.DictWriter(f, fieldnames=fieldnames, delimiter=';')
    w.writeheader()
    w.writerows(all_rows)

# 2. Master file
master_rows = []
for canon, rows in sorted(skills_by_canonical.items()):
    path_counts = Counter((r['new_domain'], r['new_sub']) for r in rows)
    (dom_dom, dom_sub), _ = path_counts.most_common(1)[0]
    
    type_counts = Counter(r['skill_type'] for r in rows)
    prio_counts = Counter(r['skill_priority'] for r in rows)
    stype = type_counts.most_common(1)[0][0]
    prio = prio_counts.most_common(1)[0][0]
    
    max_jc = max(int(r.get('job_count', 0)) for r in rows)
    if max_jc >= 20: level = 'Advanced'
    elif max_jc >= 10: level = 'Intermediate'
    elif max_jc >= 3: level = 'Intermediate'
    else: level = 'Beginner'
    
    mappings = sorted(list(set((r['new_domain'], r['new_sub']) for r in rows)))
    mapped_paths_str = ' || '.join([f"{d} > {s}" for d, s in mappings])
    
    master_rows.append({
        'canonical_skill_name': canon,
        'dominant_domain': dom_dom,
        'dominant_sub_category': dom_sub,
        'skill_type': stype,
        'skill_priority': prio,
        'skill_level': level,
        'job_count': max_jc,
        'raw_variants_count': len(rows),
        'multi_homed': 'Yes' if len(mappings) > 1 else 'No',
        'all_mapped_paths': mapped_paths_str
    })

master_file = "egypt_skills_checkpoint_9000_master.csv"
master_headers = [
    'canonical_skill_name', 'dominant_domain', 'dominant_sub_category',
    'skill_type', 'skill_priority', 'skill_level', 'job_count',
    'raw_variants_count', 'multi_homed', 'all_mapped_paths'
]
with open(master_file, 'w', encoding='utf-8-sig', newline='') as f:
    w = csv.DictWriter(f, fieldnames=master_headers, delimiter=';')
    w.writeheader()
    w.writerows(master_rows)

# 3. Matrix file
matrix_rows = []
seen_triples = set()
for r in all_rows:
    cname = (r.get('standard_skill_name') or r.get('clean_name', '')).strip()
    triple = (r['new_domain'], r['new_sub'], cname)
    if triple not in seen_triples:
        seen_triples.add(triple)
        matrix_rows.append({
            'domain': r['new_domain'],
            'sub_category': r['new_sub'],
            'standard_skill_name': cname,
            'skill_type': r['skill_type'],
            'skill_priority': r['skill_priority'],
            'job_count': r['job_count']
        })

matrix_file = "egypt_skills_checkpoint_9000_matrix.csv"
matrix_headers = ['domain', 'sub_category', 'standard_skill_name', 'skill_type', 'skill_priority', 'job_count']
with open(matrix_file, 'w', encoding='utf-8-sig', newline='') as f:
    w = csv.DictWriter(f, fieldnames=matrix_headers, delimiter=';')
    w.writeheader()
    w.writerows(matrix_rows)

# Domain breakdown in master
dom_counts = Counter(r['dominant_domain'] for r in master_rows)
print(f"Total Raw Skills Processed: {len(raw_skills_seen)}")
print(f"Total Rows in Consolidated: {len(all_rows)}")
print(f"Distinct Canonical Atomic Skills: {len(master_rows)}")
print(f"Total Matrix Triples: {len(matrix_rows)}")
print("\nDomain Distribution in Checkpoint 9000 Master:")
for d, cnt in dom_counts.most_common():
    print(f"  {d}: {cnt}")
