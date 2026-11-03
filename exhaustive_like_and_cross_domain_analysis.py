import csv
import json
import re
from collections import defaultdict, Counter
import psycopg2

# 1. Connect to PostgreSQL and query all skill occurrences by job domain/title
conn = psycopg2.connect('host=localhost port=5432 dbname=egypt_jobs_db user=postgres password=postgres')
cur = conn.cursor()

print("Querying PostgreSQL for cross-domain distribution of all skills...")
cur.execute('''
    SELECT s.name AS skill_name, j.id AS job_id, j.title_raw, j.job_category
    FROM skills s
    JOIN job_skills js ON s.id = js.skill_id
    JOIN jobs j ON js.job_id = j.id;
''')
all_job_skills = cur.fetchall()
conn.close()

print(f"Total job-skill associations fetched: {len(all_job_skills)}")

# Load golden catalog
catalog = []
with open('database_empirical_skills_catalog_golden.csv', 'r', encoding='utf-8-sig') as f:
    reader = csv.DictReader(f, delimiter=';')
    for r in reader:
        catalog.append(r)

print(f"Total skills in Golden Catalog: {len(catalog)}")

# -------------------------------------------------------------
# Part 1: Exhaustive SQL-LIKE Formulation Containment Analysis
# -------------------------------------------------------------
# For every skill in catalog, find all other skills where it appears as a sub-phrase
catalog_names = [r['standard_skill_name'] for r in catalog]
name_to_row = {r['standard_skill_name'].lower(): r for r in catalog}

# Build index of words to candidates
word_index = defaultdict(set)
for name in catalog_names:
    words = re.findall(r'\b[a-zA-Z0-9+#/.-]+\b', name.lower())
    for w in words:
        if len(w) >= 3:
            word_index[w].add(name)

containment_map = defaultdict(list)

for base in catalog_names:
    if len(base) < 4:
        continue
    base_lower = base.lower()
    base_words = re.findall(r'\b[a-zA-Z0-9+#/.-]+\b', base_lower)
    if not base_words:
        continue
        
    # Candidates must contain all words of base
    candidates = word_index[base_words[0]]
    for w in base_words[1:]:
        candidates = candidates.intersection(word_index[w])
        
    # Check exact regex word-boundary match
    pattern = re.compile(r'\b' + re.escape(base) + r'\b', re.IGNORECASE)
    for cand in candidates:
        if cand.lower() == base_lower:
            continue
        if pattern.search(cand):
            containment_map[base].append(cand)

print(f"Total skills that appear as sub-phrases inside other skills: {len(containment_map)}")

# Sort by number of appearances descending
top_repeated_phrases = sorted(containment_map.items(), key=lambda x: len(x[1]), reverse=True)

# Classify repetitions:
# A. Redundant suffix/prefix of same skill (e.g. Base: 'Risk Assessment' -> 'Risk Assessment Management', 'Risk Assessment Procedures')
# B. Genuine Specialization (e.g. Base: 'Data Analysis' -> 'Financial Data Analysis')
FLUFF_TOKENS = {
    'management', 'processes', 'process', 'frameworks', 'framework',
    'procedures', 'procedure', 'operations', 'operation', 'practices',
    'practice', 'implementation', 'strategy', 'strategies', 'administration',
    'services', 'service', 'tools', 'tool', 'system', 'systems', 'design',
    'activities', 'activity', 'methodologies', 'methodology', 'techniques',
    'technique', 'skills', 'skill', 'development', 'analysis', 'standards',
    'guidelines', 'coordination', 'support', 'planning', 'execution', 'monitoring'
}

fluff_redundancy_report = []
for base, containers in top_repeated_phrases:
    base_lower = base.lower()
    base_words = set(re.findall(r'\b\w+\b', base_lower))
    
    redundant_variants = []
    distinct_specializations = []
    
    for c in containers:
        c_lower = c.lower()
        c_words = set(re.findall(r'\b\w+\b', c_lower))
        diff = c_words - base_words
        
        # If the added words are ONLY fluff words, this is an unjustified formulation duplicate!
        if diff and diff.issubset(FLUFF_TOKENS):
            redundant_variants.append(c)
        else:
            distinct_specializations.append(c)
            
    if redundant_variants:
        base_row = name_to_row[base_lower]
        fluff_redundancy_report.append({
            'base_skill': base,
            'base_jobs': int(base_row['unique_job_count']),
            'base_domain': base_row['domain'],
            'redundant_variants_count': len(redundant_variants),
            'redundant_variants': [(v, int(name_to_row[v.lower()]['unique_job_count'])) for v in redundant_variants],
            'distinct_specializations_count': len(distinct_specializations),
            'distinct_specializations_sample': distinct_specializations[:5]
        })

print(f"Total base skills with unjustified redundant phrasing variants: {len(fluff_redundancy_report)}")

# -------------------------------------------------------------
# Part 2: Cross-Domain Distribution of Skills (e.g. Python, SQL)
# -------------------------------------------------------------
# Categorize every job title into our 14 Domains
DOMAIN_TITLE_KEYWORDS = [
    ('Data Science & Analytics', re.compile(r'(?i)\b(data|machine learning|ai|artificial intelligence|deep learning|nlp|bi analyst|business intelligence|analytics|computer vision)\b')),
    ('Software Engineering & IT', re.compile(r'(?i)\b(developer|frontend|backend|full stack|software|programmer|devops|qa\b|quality assurance|cloud|cyber|penetration|network|system admin|mobile|ios|android|sre|scrum)\b')),
    ('Business & Finance', re.compile(r'(?i)\b(accountant|accounting|auditor|audit|finance|financial|treasury|tax|cfo|banking)\b')),
    ('Marketing & Sales', re.compile(r'(?i)\b(sales|marketing|media buyer|seo|sem|content|social media|account executive|telesales|b2b|retail|b2c|branding)\b')),
    ('Engineering & Construction', re.compile(r'(?i)\b(civil|mechanical|electrical|architect|structural|site engineer|mep|cad|construction|bim|interior)\b')),
    ('Human Resources', re.compile(r'(?i)\b(hr|recruiter|recruitment|talent acquisition|personnel|human resources|payroll|l&d|training)\b')),
    ('Supply Chain & Logistics', re.compile(r'(?i)\b(supply chain|procurement|purchasing|warehouse|logistics|fleet|inventory|shipping|storekeeper)\b')),
    ('Operations & Project Management', re.compile(r'(?i)\b(project manager|project engineer|operations|pmo|customer service|call center|receptionist|office manager|admin)\b')),
    ('Healthcare & Medical Sciences', re.compile(r'(?i)\b(doctor|physician|nurse|pharmacist|medical|clinical|hospital|laboratory|dentist)\b')),
    ('Manufacturing & Industrial Production', re.compile(r'(?i)\b(production engineer|factory|plant manager|industrial|quality control|maintenance engineer|machining|cnc)\b')),
    ('Education, Teaching & Training', re.compile(r'(?i)\b(teacher|tutor|instructor|teaching|school|curriculum|academic|professor)\b')),
    ('Hospitality, Tourism & Food Services', re.compile(r'(?i)\b(chef|cook|waiter|barista|steward|reception|hotel|restaurant|catering|food)\b')),
    ('Legal, Regulatory & Government Relations', re.compile(r'(?i)\b(lawyer|legal|counsel|attorney|litigation|contracts|compliance officer)\b')),
    ('Vocational Trades, Driving & Field Services', re.compile(r'(?i)\b(driver|chauffeur|courier|technician|electrician|plumber|carpenter|security guard)\b'))
]

def classify_job_domain(title):
    t = (title or "").lower()
    for dom, rx in DOMAIN_TITLE_KEYWORDS:
        if rx.search(t):
            return dom
    return 'Operations & Project Management'

skill_domain_jobs = defaultdict(lambda: defaultdict(set))

for sname, jid, title, cat in all_job_skills:
    s_clean = sname.lower().strip()
    dom = classify_job_domain(title)
    skill_domain_jobs[s_clean][dom].add(jid)

# Focus on major cross-domain skills
cross_domain_report = []
for r in catalog:
    sname = r['standard_skill_name']
    s_lower = sname.lower()
    dom_data = skill_domain_jobs.get(s_lower, {})
    total_distinct = len(set().union(*dom_data.values())) if dom_data else 0
    if total_distinct >= 20:
        # Check distribution
        sorted_doms = sorted([(dom, len(jids)) for dom, jids in dom_data.items()], key=lambda x: x[1], reverse=True)
        top_dom, top_cnt = sorted_doms[0]
        # If second domain has >= 15% of demand, it is truly cross-domain!
        if len(sorted_doms) > 1 and sorted_doms[1][1] >= 10:
            second_dom, second_cnt = sorted_doms[1]
            cross_domain_report.append({
                'skill_name': sname,
                'primary_catalog_domain': r['domain'],
                'primary_catalog_subcat': r['sub_category'],
                'total_market_jobs': total_distinct,
                'domains_breakdown': [(d, cnt, f"{cnt/total_distinct*100:.1f}%") for d, cnt in sorted_doms if cnt >= 5]
            })

print(f"Total truly cross-domain skills identified: {len(cross_domain_report)}")

# Save full results
with open('exhaustive_formulation_and_cross_domain_audit.json', 'w', encoding='utf-8') as f:
    json.dump({
        'total_skills': len(catalog),
        'fluff_redundancy_count': len(fluff_redundancy_report),
        'fluff_redundancy_sample': fluff_redundancy_report[:40],
        'cross_domain_count': len(cross_domain_report),
        'cross_domain_sample': cross_domain_report[:50]
    }, f, indent=2, ensure_ascii=False)

print("Saved exhaustive report to exhaustive_formulation_and_cross_domain_audit.json")
