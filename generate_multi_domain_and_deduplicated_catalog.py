import csv
import json
import re
from collections import defaultdict, Counter
import psycopg2

print("Connecting to PostgreSQL to generate Cross-Domain & Deduplicated Production Catalogs...")
conn = psycopg2.connect('host=localhost port=5432 dbname=egypt_jobs_db user=postgres password=postgres')
cur = conn.cursor()

cur.execute('''
    SELECT s.name AS skill_name, js.job_id, j.title_raw, j.job_category
    FROM skills s
    JOIN job_skills js ON s.id = js.skill_id
    JOIN jobs j ON js.job_id = j.id;
''')
all_records = cur.fetchall()
conn.close()

print(f"Fetched {len(all_records)} job-skill records from DB.")

# Domain title classification
DOMAIN_TITLE_RULES = [
    ('Data Science & Analytics', re.compile(r'(?i)\b(data|machine learning|ai|artificial intelligence|deep learning|nlp|bi analyst|business intelligence|analytics|computer vision|data engineer)\b')),
    ('Software Engineering & IT', re.compile(r'(?i)\b(developer|frontend|backend|full stack|software|programmer|devops|qa\b|quality assurance|cloud|cyber|penetration|network|system admin|mobile|ios|android|sre|scrum master|it specialist|tech lead)\b')),
    ('Business & Finance', re.compile(r'(?i)\b(accountant|accounting|auditor|audit|finance|financial|treasury|tax|cfo|banking|cost accountant)\b')),
    ('Marketing & Sales', re.compile(r'(?i)\b(sales|marketing|media buyer|seo|sem|content|social media|account executive|telesales|b2b|retail|b2c|branding|copywriter|digital marketing)\b')),
    ('Engineering & Construction', re.compile(r'(?i)\b(civil|mechanical|electrical|architect|structural|site engineer|mep|cad|construction|bim|interior|project engineer)\b')),
    ('Human Resources', re.compile(r'(?i)\b(hr|recruiter|recruitment|talent acquisition|personnel|human resources|payroll|l&d|training|people operations)\b')),
    ('Supply Chain & Logistics', re.compile(r'(?i)\b(supply chain|procurement|purchasing|warehouse|logistics|fleet|inventory|shipping|storekeeper|buyer)\b')),
    ('Operations & Project Management', re.compile(r'(?i)\b(project manager|operations|pmo|customer service|call center|receptionist|office manager|admin|executive assistant)\b')),
    ('Healthcare & Medical Sciences', re.compile(r'(?i)\b(doctor|physician|nurse|pharmacist|medical|clinical|hospital|laboratory|dentist|healthcare)\b')),
    ('Manufacturing & Industrial Production', re.compile(r'(?i)\b(production engineer|factory|plant manager|industrial|quality control|maintenance engineer|machining|cnc|hse engineer)\b')),
    ('Education, Teaching & Training', re.compile(r'(?i)\b(teacher|tutor|instructor|teaching|school|curriculum|academic|professor|educator)\b')),
    ('Hospitality, Tourism & Food Services', re.compile(r'(?i)\b(chef|cook|waiter|barista|steward|reception|hotel|restaurant|catering|food|bartender)\b')),
    ('Legal, Regulatory & Government Relations', re.compile(r'(?i)\b(lawyer|legal|counsel|attorney|litigation|contracts|compliance officer|legal advisor)\b')),
    ('Vocational Trades, Driving & Field Services', re.compile(r'(?i)\b(driver|chauffeur|courier|technician|electrician|plumber|carpenter|security guard|field technician)\b'))
]

def get_job_domain(title):
    t = (title or "").lower()
    for dom, rx in DOMAIN_TITLE_RULES:
        if rx.search(t):
            return dom
    return 'Operations & Project Management'

# Load golden catalog
golden_catalog = []
with open('database_empirical_skills_catalog_golden.csv', 'r', encoding='utf-8-sig') as f:
    reader = csv.DictReader(f, delimiter=';')
    for r in reader:
        golden_catalog.append(r)

# Map raw name to canonical name
name_to_canonical = {}
canonical_meta = {}
for r in golden_catalog:
    canon = r['standard_skill_name'].strip()
    name_to_canonical[canon.lower()] = canon
    canonical_meta[canon] = r
    # Also parse variants_sample
    variants = r.get('variants_sample', '')
    if variants:
        for v in variants.split(','):
            v_clean = v.strip().lower()
            if v_clean and v_clean not in name_to_canonical:
                name_to_canonical[v_clean] = canon

# Ingest all records into canonical skill domain mapping
canonical_domain_jobs = defaultdict(lambda: defaultdict(set))
canonical_total_jobs = defaultdict(set)

for sname, jid, title, cat in all_records:
    s_clean = sname.lower().strip()
    canon = name_to_canonical.get(s_clean)
    if not canon:
        # direct lookup
        for c in canonical_meta:
            if s_clean == c.lower():
                canon = c
                name_to_canonical[s_clean] = canon
                break
    if canon:
        dom = get_job_domain(title)
        canonical_domain_jobs[canon][dom].add(jid)
        canonical_total_jobs[canon].add(jid)

print(f"Aggregated {len(canonical_domain_jobs)} skills with full domain distribution.")

# -------------------------------------------------------------
# Generate File A: database_empirical_skills_cross_domain.csv
# -------------------------------------------------------------
cross_domain_rows = []
for canon, meta in canonical_meta.items():
    total_jobs = len(canonical_total_jobs.get(canon, set()))
    dom_breakdown = canonical_domain_jobs.get(canon, {})
    
    # Sort domains by demand
    sorted_doms = sorted([(d, len(jids)) for d, jids in dom_breakdown.items()], key=lambda x: x[1], reverse=True)
    
    primary_domain = sorted_doms[0][0] if sorted_doms else meta['domain']
    
    # Secondary domains (domains with >= 5 jobs or >= 10% of demand)
    secondary_list = []
    applicable_domains = [primary_domain]
    for d, cnt in sorted_doms[1:]:
        if cnt >= 5:
            pct = cnt / total_jobs * 100 if total_jobs > 0 else 0
            secondary_list.append(f"{d} ({cnt} jobs, {pct:.1f}%)")
            applicable_domains.append(d)
            
    cross_domain_rows.append({
        'standard_skill_name': canon,
        'primary_domain': primary_domain,
        'primary_sub_category': meta['sub_category'],
        'skill_type': meta['skill_type'],
        'unique_job_count': total_jobs if total_jobs > 0 else int(meta['unique_job_count']),
        'secondary_domains': "; ".join(secondary_list) if secondary_list else "None",
        'all_applicable_domains': ", ".join(applicable_domains),
        'resolution_source': meta.get('resolution_source', ''),
        'confidence_score': meta.get('confidence_score', '')
    })

cross_domain_rows.sort(key=lambda x: int(x['unique_job_count']), reverse=True)

with open('database_empirical_skills_cross_domain.csv', 'w', encoding='utf-8-sig', newline='') as f:
    writer = csv.DictWriter(f, fieldnames=[
        'standard_skill_name', 'primary_domain', 'primary_sub_category', 'skill_type',
        'unique_job_count', 'secondary_domains', 'all_applicable_domains',
        'resolution_source', 'confidence_score'
    ], delimiter=';')
    writer.writeheader()
    writer.writerows(cross_domain_rows)

print(f"Saved {len(cross_domain_rows)} rows to database_empirical_skills_cross_domain.csv")

# -------------------------------------------------------------
# Generate File B: database_empirical_skills_by_domain.csv (Multi-Home)
# -------------------------------------------------------------
by_domain_rows = []
for canon, meta in canonical_meta.items():
    total_jobs = len(canonical_total_jobs.get(canon, set()))
    dom_breakdown = canonical_domain_jobs.get(canon, {})
    
    # Add an entry for every domain where this skill is demanded (>= 5 jobs)
    for dom, jids in dom_breakdown.items():
        cnt = len(jids)
        if cnt >= 5:
            pct = cnt / total_jobs * 100 if total_jobs > 0 else 0
            by_domain_rows.append({
                'domain': dom,
                'standard_skill_name': canon,
                'sub_category': meta['sub_category'],
                'skill_type': meta['skill_type'],
                'domain_specific_jobs': cnt,
                'domain_percentage': f"{pct:.1f}%",
                'total_market_jobs': total_jobs if total_jobs > 0 else int(meta['unique_job_count']),
            })

by_domain_rows.sort(key=lambda x: (x['domain'], -x['domain_specific_jobs']))

with open('database_empirical_skills_by_domain.csv', 'w', encoding='utf-8-sig', newline='') as f:
    writer = csv.DictWriter(f, fieldnames=[
        'domain', 'standard_skill_name', 'sub_category', 'skill_type',
        'domain_specific_jobs', 'domain_percentage', 'total_market_jobs'
    ], delimiter=';')
    writer.writeheader()
    writer.writerows(by_domain_rows)

print(f"Saved {len(by_domain_rows)} domain-skill rows to database_empirical_skills_by_domain.csv")
print("ALL MULTI-DOMAIN AND CROSS-DOMAIN CATALOGS GENERATED SUCCESSFULLY!")
