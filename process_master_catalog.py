import csv
import json
import psycopg2
import time
from collections import defaultdict, Counter
from batch_engine_autonomous import (
    extract_level_and_clean_name,
    canonicalize_skill_name,
    route_skill_hybrid,
    detect_skill_type,
    VALID_TAXONOMY,
    STANDARD_BENCHMARK
)

print("="*80)
print("STARTING FULL-SCALE AUTONOMOUS CATALOG ENGINE (28,824 SKILLS)")
print("="*80)

t0 = time.time()

# 1. Connect to DB and pre-fetch all empirical context
print("\n[Step 1/5] Pre-fetching DB stats & empirical job titles from PostgreSQL...")
conn = psycopg2.connect("dbname=egypt_jobs_db user=postgres password=postgres host=localhost port=5432")
cur = conn.cursor()

# 1.1 Job counts and mode level
cur.execute("""
    SELECT 
        skill_id, 
        COUNT(job_id) as job_cnt,
        MODE() WITHIN GROUP (ORDER BY skill_level) as mode_lvl
    FROM job_skills
    GROUP BY skill_id;
""")
db_stats = {r[0]: {'job_count': r[1], 'mode_level': r[2]} for r in cur.fetchall()}
print(f"  -> Loaded job statistics for {len(db_stats)} skills.")

# 1.2 Empirical job titles (top 5 distinct titles per skill)
cur.execute("""
    WITH ranked_jobs AS (
        SELECT 
            js.skill_id,
            j.title_raw,
            ROW_NUMBER() OVER (PARTITION BY js.skill_id ORDER BY j.posted_date DESC NULLS LAST) as rn
        FROM job_skills js
        JOIN jobs j ON js.job_id = j.id
    )
    SELECT skill_id, array_agg(title_raw)
    FROM ranked_jobs
    WHERE rn <= 5
    GROUP BY skill_id;
""")
db_titles = {r[0]: r[1] for r in cur.fetchall()}
print(f"  -> Loaded empirical job titles for {len(db_titles)} skills.")
cur.close()
conn.close()

# 2. Process all skills from skills.csv
print("\n[Step 2/5] Streaming and processing 28,824 skills through Autonomous Engine...")

master_matrix_rows = []
canonical_skills_map = defaultdict(lambda: {
    'skill_ids': set(),
    'raw_names': set(),
    'levels': Counter(),
    'job_count': 0,
    'routes': [],
    'types': Counter()
})

taxonomy_violations = []
total_raw_rows = 0

with open('skills.csv', 'r', encoding='utf-8') as f:
    reader = csv.DictReader(f)
    for idx, row in enumerate(reader):
        total_raw_rows += 1
        sid = row['id'].strip()
        raw_name = row['name'].strip()
        old_dom = row['domain'].strip()
        old_sub = row['sub_category'].strip()
        
        # Stats
        stats = db_stats.get(sid, {'job_count': 0, 'mode_level': 'Not Specified'})
        job_cnt = stats['job_count']
        db_lvl = stats['mode_level']
        titles = db_titles.get(sid, [])
        
        # Level extraction & Preliminary cleaning
        lvl_cleaned, standardized_lvl = extract_level_and_clean_name(raw_name, db_lvl)
        
        # Atomic canonicalization
        atomic_name = canonicalize_skill_name(lvl_cleaned)
        
        # Hybrid Routing
        routes, reason = route_skill_hybrid(atomic_name, old_dom, old_sub, job_cnt, titles)
        
        # Aggregate Canonical Representation
        c_entry = canonical_skills_map[atomic_name]
        c_entry['skill_ids'].add(sid)
        c_entry['raw_names'].add(raw_name)
        c_entry['levels'][standardized_lvl] += 1
        c_entry['job_count'] = max(c_entry['job_count'], job_cnt)
        
        for r in routes:
            dom = r['domain']
            sub = r['sub_category']
            stype = r.get('skill_type', detect_skill_type(atomic_name))
            prio = r.get('skill_priority', 'Foundational')
            sname = r.get('standard_name', atomic_name)
            
            # Taxonomy validation
            is_valid = (dom in VALID_TAXONOMY) and (sub in VALID_TAXONOMY[dom])
            if not is_valid:
                taxonomy_violations.append((atomic_name, dom, sub))
                
            c_entry['types'][stype] += 1
            c_entry['routes'].append({
                'domain': dom,
                'sub_category': sub,
                'skill_priority': prio,
                'skill_type': stype,
                'standard_name': sname
            })
            
            # Matrix Row
            master_matrix_rows.append({
                'skill_id': sid,
                'raw_skill_name': raw_name,
                'canonical_skill_name': atomic_name,
                'standard_skill_name': sname,
                'domain': dom,
                'sub_category': sub,
                'skill_type': stype,
                'skill_priority': prio,
                'skill_level': standardized_lvl,
                'market_job_count': job_cnt,
                'routing_reason': reason
            })
            
        if (total_raw_rows % 5000) == 0:
            print(f"  -> Processed {total_raw_rows:,} / 28,824 skills...")

print(f"  -> Completed processing all {total_raw_rows:,} skills in {time.time()-t0:.2f}s!")
print(f"  -> Total Generated Domain-Skill Matrix Rows: {len(master_matrix_rows):,}")
print(f"  -> Total Unique Canonical Skills: {len(canonical_skills_map):,}")
print(f"  -> Taxonomy Violations: {len(taxonomy_violations)}")

# 3. Export egypt_skills_by_domain_matrix.csv
print("\n[Step 3/5] Writing 'egypt_skills_by_domain_matrix.csv'...")
matrix_fieldnames = [
    'skill_id', 'raw_skill_name', 'canonical_skill_name', 'standard_skill_name',
    'domain', 'sub_category', 'skill_type', 'skill_priority', 'skill_level',
    'market_job_count', 'routing_reason'
]

# De-duplicate triples (canonical_skill_name, domain, sub_category)
unique_matrix = {}
for r in master_matrix_rows:
    key = (r['canonical_skill_name'].lower(), r['domain'], r['sub_category'])
    if key not in unique_matrix or r['market_job_count'] > unique_matrix[key]['market_job_count']:
        unique_matrix[key] = r

with open('egypt_skills_by_domain_matrix.csv', 'w', encoding='utf-8-sig', newline='') as f:
    writer = csv.DictWriter(f, fieldnames=matrix_fieldnames, delimiter=';')
    writer.writeheader()
    writer.writerows(sorted(unique_matrix.values(), key=lambda x: (x['domain'], x['sub_category'], -x['market_job_count'])))
print(f"  -> Successfully exported {len(unique_matrix):,} unique (Domain, Subcategory, Skill) matrix records.")

# 4. Export egypt_skills_master_catalog.csv (1 row per unique canonical skill)
print("\n[Step 4/5] Writing 'egypt_skills_master_catalog.csv'...")
master_fieldnames = [
    'canonical_skill_name', 'primary_domain', 'primary_sub_category',
    'skill_type', 'skill_priority', 'dominant_level', 'market_job_count',
    'all_mapped_domains', 'all_mapped_subcategories', 'raw_synonyms_count', 'source_skill_ids'
]

master_catalog_rows = []
for cname, data in canonical_skills_map.items():
    # Pick primary route (highest priority / benchmark)
    best_route = sorted(data['routes'], key=lambda x: (
        0 if x['skill_priority'] == 'Core' else (1 if x['skill_priority'] == 'Foundational' else 2)
    ))[0]
    
    primary_dom = best_route['domain']
    primary_sub = best_route['sub_category']
    dominant_type = data['types'].most_common(1)[0][0] if data['types'] else 'Hard Skill'
    dominant_level = data['levels'].most_common(1)[0][0] if data['levels'] else 'Not Specified'
    
    all_doms = "|".join(sorted(set(r['domain'] for r in data['routes'])))
    all_subs = "|".join(sorted(set(r['sub_category'] for r in data['routes'])))
    
    master_catalog_rows.append({
        'canonical_skill_name': cname,
        'primary_domain': primary_dom,
        'primary_sub_category': primary_sub,
        'skill_type': dominant_type,
        'skill_priority': best_route['skill_priority'],
        'dominant_level': dominant_level,
        'market_job_count': data['job_count'],
        'all_mapped_domains': all_doms,
        'all_mapped_subcategories': all_subs,
        'raw_synonyms_count': len(data['raw_names']),
        'source_skill_ids': "|".join(sorted(list(data['skill_ids'])[:5]))
    })

master_catalog_rows.sort(key=lambda x: -x['market_job_count'])

with open('egypt_skills_master_catalog.csv', 'w', encoding='utf-8-sig', newline='') as f:
    writer = csv.DictWriter(f, fieldnames=master_fieldnames, delimiter=';')
    writer.writeheader()
    writer.writerows(master_catalog_rows)
print(f"  -> Successfully exported {len(master_catalog_rows):,} canonical skills to master catalog.")

# 5. Verify and Update Acronym Dictionary
print("\n[Step 5/5] Generating 'skills_acronym_dictionary.csv'...")
acronyms_dict = {}

try:
    with open('skills_acronym_dictionary.json', 'r', encoding='utf-8') as f:
        raw_json_acronyms = json.load(f)
        for k, v in raw_json_acronyms.items():
            acr = v.get('acronym', k).strip().upper()
            acronyms_dict[acr] = {
                'acronym': acr,
                'full_name': v.get('full_name', ''),
                'canonical_skill_name': v.get('canonical_skill_name', ''),
                'domain': v.get('domain', ''),
                'sub_category': v.get('sub_category', ''),
                'skill_type': v.get('skill_type', 'Hard Skill'),
                'source': v.get('source', 'Egyptian Market Empirical Extraction')
            }
except Exception as e:
    print(f"  Warning: JSON acronym load: {e}")

# Add newly verified acronyms
new_acronyms = {
    'VNA': {'acronym': 'VNA', 'full_name': 'Vendor Neutral Archive', 'canonical_skill_name': 'Vendor Neutral Archive (VNA)', 'domain': 'Healthcare & Medical Sciences', 'sub_category': 'Medical Laboratory & Diagnostic Imaging', 'skill_type': 'Tool / Software', 'source': 'Empirical Market Evidence (PaxeraHealth)'},
    'ATF': {'acronym': 'ATF', 'full_name': 'Automated Test Framework', 'canonical_skill_name': 'Automated Test Framework (ATF)', 'domain': 'Software Engineering & IT', 'sub_category': 'Quality Assurance & Testing', 'skill_type': 'Tool / Software', 'source': 'Empirical Market Evidence (ServiceNow)'},
    'P&ID': {'acronym': 'P&ID', 'full_name': 'Piping and Instrumentation Diagram', 'canonical_skill_name': 'P&ID and GA Drawings', 'domain': 'Engineering & Construction', 'sub_category': 'Mechanical & MEP Engineering', 'skill_type': 'Hard Skill', 'source': 'Empirical Market Evidence'},
    'GKE': {'acronym': 'GKE', 'full_name': 'Google Kubernetes Engine', 'canonical_skill_name': 'Google Kubernetes Engine (GKE)', 'domain': 'Software Engineering & IT', 'sub_category': 'DevOps & Cloud Infrastructure', 'skill_type': 'Tool / Software', 'source': 'Cloud Architecture Standard'},
    'STCW': {'acronym': 'STCW', 'full_name': 'Standards of Training, Certification and Watchkeeping for Seafarers', 'canonical_skill_name': 'STCW95', 'domain': 'Supply Chain & Logistics', 'sub_category': 'Logistics, Freight & Fleet Operations', 'skill_type': 'Certification', 'source': 'Maritime Regulatory Standard'},
    '3CX': {'acronym': '3CX', 'full_name': '3CX Software PBX Telephony System', 'canonical_skill_name': '3CX', 'domain': 'Software Engineering & IT', 'sub_category': 'DevOps & Cloud Infrastructure', 'skill_type': 'Tool / Software', 'source': 'Empirical Market Evidence (Nawy)'},
    'ARM': {'acronym': 'ARM', 'full_name': 'Azure Resource Manager', 'canonical_skill_name': 'ARM Templates', 'domain': 'Software Engineering & IT', 'sub_category': 'DevOps & Cloud Infrastructure', 'skill_type': 'Tool / Software', 'source': 'Empirical Market Evidence (EY / Cloud Consulting)'},
    'ENODEB': {'acronym': 'eNodeB', 'full_name': 'E-UTRAN Node B', 'canonical_skill_name': 'eNodeB', 'domain': 'Software Engineering & IT', 'sub_category': 'DevOps & Cloud Infrastructure', 'skill_type': 'Hard Skill', 'source': 'Telecom 4G/LTE Standard'}
}

for acr, row in new_acronyms.items():
    acronyms_dict[acr] = row

acronym_fieldnames = ['acronym', 'full_name', 'canonical_skill_name', 'domain', 'sub_category', 'skill_type', 'source']

with open('skills_acronym_dictionary.csv', 'w', encoding='utf-8-sig', newline='') as f:
    writer = csv.DictWriter(f, fieldnames=acronym_fieldnames, delimiter=';')
    writer.writeheader()
    writer.writerows(sorted(acronyms_dict.values(), key=lambda x: x['acronym']))
print(f"  -> Saved {len(acronyms_dict)} verified acronym mappings to skills_acronym_dictionary.csv.")

total_elapsed = time.time() - t0
print("\n" + "="*80)
print(f"ALL DELIVERABLES SUCCESSFULLY GENERATED IN {total_elapsed:.2f}s!")
print(f"Taxonomy Violations: {len(taxonomy_violations)}")
print("="*80)
