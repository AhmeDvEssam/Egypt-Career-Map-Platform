import sys
import os
import re
import csv
import json
import time
import psycopg2
from collections import Counter
from concurrent.futures import ThreadPoolExecutor, as_completed
import pandas as pd

sys.stdout.reconfigure(encoding='utf-8')
sys.path.append('Backend API & Integration')
from ai_worker import call_llm

CATALOG_PATH = 'standard_skills_catalog.csv'
API_KEYS_PATH = 'API KEYS.xlsx'
PROGRESS_JSON = 'cleansing_progress_monitor.json'
CHECKPOINT_JSON = 'cleansing_checkpoint.json'
OUTPUT_CSV = 'database_empirical_skills_catalog.csv'
AUDIT_REPORT_CSV = 'catalog_comparative_audit_report.csv'

# ==============================================================================
# 1. LOAD CANONICAL CATALOG WITH CORE-FIRST PRECEDENCE
# ==============================================================================
print("[*] 1/5. Loading Standard Skills Catalog...")

TOOL_CANONICAL_HOMES = {
    'microsoft excel': ('Operations & Project Management', 'Office & Administrative Management', 'Tool / Software'),
    'excel': ('Operations & Project Management', 'Office & Administrative Management', 'Tool / Software'),
    'microsoft word': ('Operations & Project Management', 'Office & Administrative Management', 'Tool / Software'),
    'word': ('Operations & Project Management', 'Office & Administrative Management', 'Tool / Software'),
    'microsoft powerpoint': ('Operations & Project Management', 'Office & Administrative Management', 'Tool / Software'),
    'powerpoint': ('Operations & Project Management', 'Office & Administrative Management', 'Tool / Software'),
    'microsoft office': ('Operations & Project Management', 'Office & Administrative Management', 'Tool / Software'),
    'office 365': ('Operations & Project Management', 'Office & Administrative Management', 'Tool / Software'),
    'power bi': ('Data Science & Analytics', 'Business Intelligence & Data Analytics', 'Tool / Software'),
    'powerbi': ('Data Science & Analytics', 'Business Intelligence & Data Analytics', 'Tool / Software'),
    'tableau': ('Data Science & Analytics', 'Business Intelligence & Data Analytics', 'Tool / Software'),
    'git': ('Software Engineering & IT', 'DevOps & Cloud Infrastructure', 'Tool / Software'),
    'docker': ('Software Engineering & IT', 'DevOps & Cloud Infrastructure', 'Tool / Software'),
    'kubernetes': ('Software Engineering & IT', 'DevOps & Cloud Infrastructure', 'Tool / Software'),
    'linux': ('Software Engineering & IT', 'DevOps & Cloud Infrastructure', 'Tool / Software'),
    'autocad': ('Engineering & Construction', 'Civil & Structural Engineering', 'Tool / Software'),
    'revit': ('Engineering & Construction', 'Architecture & Interior Design', 'Tool / Software'),
    'solidworks': ('Engineering & Construction', 'Mechanical & MEP Engineering', 'Tool / Software'),
}

PRIORITY_WEIGHTS = {'Core': 3, 'Foundational': 2, 'Secondary': 1, '': 0}

catalog_exact = {}
catalog_clean = {}
catalog_aliases = {}
standard_catalog_skills = set()

with open(CATALOG_PATH, 'r', encoding='utf-8-sig', errors='ignore') as f:
    reader = csv.DictReader(f, delimiter=';')
    for row in reader:
        std_name = row['standard_skill_name'].strip()
        lower_name = std_name.lower()
        clean_name = re.sub(r'[^a-z0-9\u0600-\u06ff]', '', lower_name)
        standard_catalog_skills.add(std_name)
        
        row_weight = PRIORITY_WEIGHTS.get(row.get('skill_priority', ''), 0)
        
        if lower_name in TOOL_CANONICAL_HOMES:
            d, s, st = TOOL_CANONICAL_HOMES[lower_name]
            r = dict(row)
            r['domain'], r['sub_category'], r['skill_type'] = d, s, st
            catalog_exact[lower_name] = r
            catalog_clean[clean_name] = r
        else:
            cur_weight = PRIORITY_WEIGHTS.get(catalog_exact.get(lower_name, {}).get('skill_priority', ''), -1)
            if lower_name not in catalog_exact or row_weight > cur_weight:
                catalog_exact[lower_name] = row
            if clean_name not in catalog_clean or row_weight > cur_weight:
                catalog_clean[clean_name] = row
                
        aliases = row.get('known_aliases', '')
        if aliases:
            for alias in re.split(r'[,|]', aliases):
                a_str = alias.strip().lower()
                if not a_str: continue
                if a_str in TOOL_CANONICAL_HOMES:
                    d, s, st = TOOL_CANONICAL_HOMES[a_str]
                    r = dict(row)
                    r['domain'], r['sub_category'], r['skill_type'] = d, s, st
                    catalog_aliases[a_str] = r
                else:
                    cur_a_weight = PRIORITY_WEIGHTS.get(catalog_aliases.get(a_str, {}).get('skill_priority', ''), -1)
                    if a_str not in catalog_aliases or row_weight > cur_a_weight:
                        catalog_aliases[a_str] = row

print(f"[+] Loaded {len(catalog_exact)} unique exact skills, {len(catalog_aliases)} aliases from standard catalog.")

# 2. LOAD GROQ API KEYS
groq_df = pd.read_excel(API_KEYS_PATH)
groq_keys = [k.strip() for k in groq_df[groq_df['provider'].str.contains('groq', case=False, na=False)]['Api key'].tolist()]
print(f"[+] Active Groq API Keys: {len(groq_keys)}")

# 3. EXPLICIT PATTERNS & REGEXES
PATS = {
    'Certification': re.compile(r'(?i)\b(certified|certification|certificate|accredited|pmp|ccna|ccnp|mcse|mcsa|cissp|cisa|cism|ceh|itil|cbap|prince2|osha|iso\s*\d+|six\s*sigma|cpa|cma|cfa|acca|شهادة|معتمد)\b'),
    'Requirement': re.compile(r'(?i)\b(driving\s*licen[sc]e|driver\s*licen[sc]e|own\s*car|personal\s*car|military\s*service|military\s*status|rotational\s*shift|night\s*shift|day\s*shift|work\s*from\s*home|flexible\s*hours|رخصة\s*قيادة|رخصة\s*مهنية|سيارة\s*خاصة|امتلاك\s*سيارة|تجنيد|الخدمة\s*العسكرية|شفت|وردية|دوام\s*ليلي|ساعات\s*عمل)\b'),
    'Language': re.compile(r'(?i)\b(english|arabic|french|german|spanish|italian|chinese|russian|turkish|اللغة\s*الإنجليزية|اللغة\s*العربية|اللغة\s*الفرنسية|اللغة\s*الألمانية|الانجليزية|العربية|الفرنسية|الالمانية)\b'),
    'Tool / Software': re.compile(r'(?i)\b(software|suite|tool|platform|system|application|app|portal|database|framework|sdk|api|ide|library|erp|crm|autocad|revit|solidworks|sap|oracle|salesforce|jira|confluence|slack|trello|asana|figma|photoshop|illustrator|indesign|premiere|after\s*effects|power\s*bi|tableau|excel|word|powerpoint|access|outlook|matlab|spss|stata|docker|kubernetes|git|github|gitlab|jenkins|linux|windows|android|ios)\b'),
    'Soft Skill Indicator': re.compile(r'(?i)\b(mindset|curiosity|environment|attitude|coordination|communication|listening|interpersonal|teamwork|leadership|problem solving|analytical|critical thinking|adaptability|flexibility|creativity|negotiation|stress|patience|empathy|integrity|work ethic|self-motivated|literacy|presentation|etiquette)\b'),
    'Garbage': re.compile(r'(?i)\b(\d+\s*gb\s*(ram|ssd|hdd)|core\s*i[3579]|rtx\s*\d+|gtx\s*\d+|معالج|رامات|هارد|سنة\s*خبرة|\d+\s*years?\s*exp|مرتب|راتب|جنيه|salary|egp|usd)\b')
}

TITLE_DOMAIN_RULES = [
    (re.compile(r'(?i)\b(developer|frontend|backend|fullstack|software|programmer|devops|qa\b|quality assurance|cloud|cyber|penetration|network|system admin|mobile developer|ios|android)\b'), 'Software Engineering & IT'),
    (re.compile(r'(?i)\b(data analyst|data scientist|machine learning|deep learning|data engineer|bi analyst|business intelligence|nlp|big data)\b'), 'Data Science & Analytics'),
    (re.compile(r'(?i)\b(accountant|accounting|auditor|audit|finance|financial|treasury|tax|cfo|محاسب|مالي|حسابات)\b'), 'Business & Finance'),
    (re.compile(r'(?i)\b(sales|marketing|media buyer|seo|content creator|social media|account executive|telesales|b2b|مبيعات|تسويق|سيلز)\b'), 'Marketing & Sales'),
    (re.compile(r'(?i)\b(civil|mechanical|electrical|architect|structural|site engineer|mep|cad|construction|تشطيبات|موقع|معماري|مدني|كهرباء|ميكانيكا)\b'), 'Engineering & Construction'),
    (re.compile(r'(?i)\b(hr|recruiter|recruitment|talent acquisition|personnel|human resources|payroll|موارد بشرية|شؤون عاملين)\b'), 'Human Resources'),
    (re.compile(r'(?i)\b(supply chain|procurement|purchasing|warehouse|logistics|fleet|inventory|مشتريات|مخازن|سلاسل إمداد|لوجستيات)\b'), 'Supply Chain & Logistics'),
    (re.compile(r'(?i)\b(project manager|project engineer|operations|pmo|scrum master|customer service|call center|receptionist|office manager|خدمة عملاء|إداري|مدير مشروع)\b'), 'Operations & Project Management'),
    (re.compile(r'(?i)\b(driver|chauffeur|courier|technician|electrician|plumber|carpenter|فني|سائق|مندوب توصيل|كهربائي|سباك)\b'), 'Vocational Trades, Driving & Field Services'),
    (re.compile(r'(?i)\b(doctor|physician|nurse|pharmacist|medical|lab|صيدلي|طبيب|تمريض|معمل)\b'), 'Healthcare & Medical Sciences'),
    (re.compile(r'(?i)\b(chef|cook|waiter|barista|steward|reception|hotel|restaurant|طباخ|ويتر|باريستا|شيف)\b'), 'Hospitality, Tourism & Food Services'),
    (re.compile(r'(?i)\b(production engineer|factory|plant manager|industrial|quality control|إنتاج|مصنع|جودة)\b'), 'Manufacturing & Industrial Production'),
]

def map_job_title_to_domain(title):
    if not title: return None
    for rx, domain in TITLE_DOMAIN_RULES:
        if rx.search(title):
            return domain
    return None

def split_compound_skill(raw_name):
    protected = ['research & development', 'r&d', 'mergers & acquisitions', 'm&a', 
                 'supply chain & logistics', 'c/c++', 'pl/sql', 'ci/cd', 'frontend/backend']
    lower = raw_name.lower()
    for prot in protected:
        if prot in lower:
            return [raw_name]
    if re.search(r'\s+(&|/|\band\b|\bو\b)\s+', raw_name):
        parts = [p.strip() for p in re.split(r'\s+(&|/|\band\b|\bو\b)\s+', raw_name) if p.strip() and p not in ('&', '/', 'and', 'و')]
        if len(parts) >= 2 and all(len(p) > 2 for p in parts):
            return parts
    return [raw_name]

# 4. LLM BATCH ARBITER
def call_tier4_llm_batch(batch_items, key_idx=0):
    # batch_items = list of (raw_name, sample_titles)
    if not groq_keys:
        return {}
    api_key = groq_keys[key_idx % len(groq_keys)]
    
    items_text = "\n".join([f"{i+1}. \"{item[0]}\" (Context: {item[1][:4]})" for i, item in enumerate(batch_items)])
    
    prompt = f"""
You are a strictly calibrated Egyptian Job Market Taxonomy Arbiter.
Classify each extracted raw skill string into its exact canonical category.

Items to classify:
{items_text}

Allowed 'skill_type' ENUM:
['Tool / Software', 'Hard Skill', 'Soft Skill', 'Methodology', 'Language', 'Requirement', 'Certification', 'Garbage']

Allowed 'domain' ENUM:
['Software Engineering & IT', 'Data Science & Analytics', 'Business & Finance', 'Marketing & Sales', 
 'Engineering & Construction', 'Human Resources', 'Supply Chain & Logistics', 'Operations & Project Management', 
 'Vocational Trades, Driving & Field Services', 'Healthcare & Medical Sciences', 'Hospitality, Tourism & Food Services', 
 'Manufacturing & Industrial Production', 'Education, Teaching & Training', 'Legal, Regulatory & Government Relations', 'None']

CRITICAL RULES:
1. Cross-cutting tools (Excel, ERP, Word) MUST be 'Tool / Software', NEVER 'Soft Skill'.
2. Prerequisites (driving license, own car, shifts) MUST be 'Requirement'.
3. Hardware specs (RAM, Core i7, SSD), salary, or noise sentences MUST be 'Garbage'.
4. Behavioral traits, mindsets, curiosity, coordination, presentation MUST be 'Soft Skill' with domain 'Operations & Project Management'.
5. Always provide valid non-empty canonical_name, domain, and sub_category.

Output ONLY a valid JSON list of objects:
[
  {{"original": "...", "canonical_name": "...", "skill_type": "...", "domain": "...", "sub_category": "..."}}
]
"""
    try:
        raw_res, _ = call_llm(prompt, api_key, 'groq')
        m = re.search(r'\[.*\]', raw_res, re.DOTALL)
        if m:
            data = json.loads(m.group(0))
            return {item.get('original', '').strip().lower(): item for item in data}
        return {}
    except Exception as e:
        return {}

# 5. ATOMIC RESOLUTION LOGIC
def resolve_atomic(clean_raw, linked_titles):
    lower_raw = clean_raw.lower()
    norm_raw = re.sub(r'[^a-z0-9\u0600-\u06ff]', '', lower_raw)
    
    # Tier 0: Noise
    if PATS['Garbage'].search(clean_raw) or len(clean_raw) > 85:
        return {
            'tier': 'Tier 0: Noise Guard',
            'skill_type': 'Garbage',
            'domain': 'None',
            'sub_category': 'None',
            'resolved_name': clean_raw,
            'needs_llm': False
        }
        
    # Tier 1: Catalog
    if lower_raw in catalog_exact:
        m = catalog_exact[lower_raw]
        return {
            'tier': 'Tier 1: Catalog Exact',
            'skill_type': m['skill_type'],
            'domain': m['domain'],
            'sub_category': m['sub_category'],
            'resolved_name': m['standard_skill_name'],
            'needs_llm': False
        }
    if lower_raw in catalog_aliases:
        m = catalog_aliases[lower_raw]
        return {
            'tier': 'Tier 1: Catalog Alias',
            'skill_type': m['skill_type'],
            'domain': m['domain'],
            'sub_category': m['sub_category'],
            'resolved_name': m['standard_skill_name'],
            'needs_llm': False
        }
    if norm_raw in catalog_clean:
        m = catalog_clean[norm_raw]
        return {
            'tier': 'Tier 1: Catalog Normalized',
            'skill_type': m['skill_type'],
            'domain': m['domain'],
            'sub_category': m['sub_category'],
            'resolved_name': m['standard_skill_name'],
            'needs_llm': False
        }
        
    # Tier 2: Patterns
    detected_type = None
    for p_type, rx in PATS.items():
        if p_type in ('Garbage', 'Soft Skill Indicator'): continue
        if rx.search(clean_raw):
            detected_type = p_type
            break
            
    if detected_type == 'Language':
        return {
            'tier': 'Tier 2: Explicit Pattern',
            'skill_type': 'Language',
            'domain': 'Operations & Project Management',
            'sub_category': 'Office & Administrative Management',
            'resolved_name': clean_raw,
            'needs_llm': False
        }
    if detected_type == 'Requirement':
        dom = 'Vocational Trades, Driving & Field Services' if re.search(r'(?i)\b(driving|driver|رخصة|سيارة)\b', clean_raw) else 'Operations & Project Management'
        sub = 'Driving, Chauffeur & Fleet Operation' if 'Vocational' in dom else 'Office & Administrative Management'
        return {
            'tier': 'Tier 2: Explicit Pattern',
            'skill_type': 'Requirement',
            'domain': dom,
            'sub_category': sub,
            'resolved_name': clean_raw,
            'needs_llm': False
        }

    # Soft Skill Indicator Pre-Check
    if PATS['Soft Skill Indicator'].search(clean_raw):
        return {
            'tier': 'Tier 2: Soft Indicator Gate',
            'skill_type': 'Soft Skill',
            'domain': 'Operations & Project Management',
            'sub_category': 'Office & Administrative Management',
            'resolved_name': clean_raw,
            'needs_llm': False
        }

    # Tier 3: Job Title Majority Voting
    domain_votes = []
    for t in linked_titles:
        d = map_job_title_to_domain(t)
        if d: domain_votes.append(d)
            
    if domain_votes:
        vote_counts = Counter(domain_votes)
        top_domain, top_count = vote_counts.most_common(1)[0]
        confidence = top_count / len(domain_votes)
        
        if confidence >= 0.50 and top_count >= 2:
            final_type = detected_type if detected_type else 'Hard Skill'
            return {
                'tier': 'Tier 3: Title Majority Vote',
                'skill_type': final_type,
                'domain': top_domain,
                'sub_category': f'Plurality from {top_domain}',
                'resolved_name': clean_raw,
                'needs_llm': False
            }
            
    # Mark for Tier 4 LLM Batching
    return {
        'tier': 'Tier 4: Pending LLM Arbiter',
        'skill_type': detected_type if detected_type else 'Unresolved',
        'domain': 'Pending',
        'sub_category': 'Pending',
        'resolved_name': clean_raw,
        'needs_llm': True
    }

# ==============================================================================
# 6. MAIN EXECUTION PIPELINE
# ==============================================================================
def run_full_cleansing():
    t_start = time.time()
    print("\n[*] 2/5. Connecting to PostgreSQL to load all 28,824 skills & job contexts...")
    
    conn = psycopg2.connect(
        dbname='egypt_jobs_db',
        user='postgres',
        password=os.environ.get('DB_PASSWORD', 'postgres'),
        host='localhost',
        port=5432
    )
    cur = conn.cursor()
    
    # Load all skills and their total market frequency
    cur.execute('''
        SELECT s.id, s.name, COUNT(js.job_id) as freq
        FROM skills s
        LEFT JOIN job_skills js ON s.id = js.skill_id
        GROUP BY s.id, s.name
        ORDER BY freq DESC;
    ''')
    skills_raw = cur.fetchall()
    total_skills = len(skills_raw)
    print(f"[+] Loaded {total_skills} skills.")

    # Load top 5 sample titles for each skill (0.8s)
    print("[*] Pre-loading contextual job titles...")
    cur.execute('''
        WITH ranked_titles AS (
            SELECT js.skill_id, j.title_normalized,
                   ROW_NUMBER() OVER(PARTITION BY js.skill_id ORDER BY random()) as rn
            FROM job_skills js
            JOIN jobs j ON js.job_id = j.id
            WHERE j.title_normalized IS NOT NULL
        )
        SELECT skill_id, array_agg(title_normalized)
        FROM ranked_titles
        WHERE rn <= 5
        GROUP BY skill_id;
    ''')
    titles_map = {row[0]: row[1] for row in cur.fetchall()}
    cur.close()
    conn.close()
    print(f"[+] Titles index ready for {len(titles_map)} skills.\n")

    # Metrics
    processed_count = 0
    tier_stats = Counter()
    type_stats = Counter()
    domain_stats = Counter()
    anomalies = {
        'tools_as_soft': 0,
        'behavioral_as_hard': 0,
        'hardware_leaks': 0,
        'null_domains': 0
    }
    
    all_resolved_records = []
    BATCH_SIZE = 500
    llm_cache = {}

    print("="*80)
    print(f">>> STARTING REAL-TIME CLEANSING & TELEMETRY MONITOR ({total_skills} SKILLS)")
    print("="*80)

    for i in range(0, total_skills, BATCH_SIZE):
        batch = skills_raw[i:i+BATCH_SIZE]
        batch_num = (i // BATCH_SIZE) + 1
        total_batches = (total_skills + BATCH_SIZE - 1) // BATCH_SIZE
        
        tier4_queue = []
        batch_atomic_items = []
        
        # Phase 1: Local Tiers (0, 1, 2, 3)
        for s_id, s_name, s_freq in batch:
            linked = titles_map.get(s_id, [])
            atoms = split_compound_skill(s_name)
            for atom in atoms:
                res = resolve_atomic(atom, linked)
                res['db_id'] = str(s_id)
                res['market_frequency'] = s_freq
                res['original_raw_name'] = s_name
                res['sample_job_titles'] = " | ".join(linked[:3])
                
                if res['needs_llm']:
                    tier4_queue.append((atom, linked, res))
                else:
                    batch_atomic_items.append(res)
                    
        # Phase 2: Batch Tier 4 with LLM
        if tier4_queue:
            # Check cache first
            to_query = []
            for atom, linked, res_obj in tier4_queue:
                key = atom.strip().lower()
                if key in llm_cache:
                    cached = llm_cache[key]
                    res_obj['tier'] = 'Tier 4: LLM Arbiter (Cached)'
                    res_obj['skill_type'] = cached.get('skill_type', 'Hard Skill')
                    res_obj['domain'] = cached.get('domain', 'Operations & Project Management')
                    res_obj['sub_category'] = cached.get('sub_category', 'General')
                    res_obj['resolved_name'] = cached.get('canonical_name', atom)
                    batch_atomic_items.append(res_obj)
                else:
                    to_query.append((atom, linked, res_obj))
                    
            # Call Groq in sub-batches of 8 items
            SUB_BATCH = 8
            for sub_i in range(0, len(to_query), SUB_BATCH):
                sub_items = to_query[sub_i:sub_i+SUB_BATCH]
                items_payload = [(x[0], x[1]) for x in sub_items]
                key_rot = (batch_num + sub_i) % len(groq_keys) if groq_keys else 0
                llm_results = call_tier4_llm_batch(items_payload, key_rot)
                
                for atom, linked, res_obj in sub_items:
                    k = atom.strip().lower()
                    if k in llm_results:
                        classified = llm_results[k]
                        res_obj['tier'] = 'Tier 4: LLM Arbiter'
                        res_obj['skill_type'] = classified.get('skill_type', 'Hard Skill')
                        res_obj['domain'] = classified.get('domain', 'Operations & Project Management')
                        res_obj['sub_category'] = classified.get('sub_category', 'General')
                        res_obj['resolved_name'] = classified.get('canonical_name', atom)
                        llm_cache[k] = classified
                    else:
                        # Fallback default
                        res_obj['tier'] = 'Tier 4: Empirical Residual'
                        res_obj['skill_type'] = 'Hard Skill'
                        res_obj['domain'] = 'Operations & Project Management'
                        res_obj['sub_category'] = 'Cross-Functional'
                        res_obj['resolved_name'] = atom
                    batch_atomic_items.append(res_obj)

        # Update stats & audit for this batch
        for r in batch_atomic_items:
            tier_stats[r['tier']] += 1
            type_stats[r['skill_type']] += 1
            domain_stats[r['domain']] += 1
            all_resolved_records.append(r)
            
            # Watchdog check
            n_lower = r['resolved_name'].lower()
            st = r['skill_type']
            if re.search(r'\b(excel|word|powerpoint|erp|crm|git|docker|revit|autocad|solidworks)\b', n_lower) and st == 'Soft Skill':
                anomalies['tools_as_soft'] += 1
            if re.search(r'\b(curiosity|mindset|fast-paced|environment|empathy)\b', n_lower) and st == 'Hard Skill':
                anomalies['behavioral_as_hard'] += 1
            if re.search(r'\b(core i[3579]|\d+gb\s*ram|ssd)\b', n_lower) and st != 'Garbage':
                anomalies['hardware_leaks'] += 1
            if not r['domain'] or r['domain'] in ('None', 'null', 'nan', ''):
                if st != 'Garbage': anomalies['null_domains'] += 1

        processed_count += len(batch)
        pct = (processed_count / total_skills) * 100
        elapsed = time.time() - t_start
        speed = processed_count / max(elapsed, 0.1)
        eta_min = (total_skills - processed_count) / max(speed, 1) / 60
        
        # Save live progress JSON
        monitor_state = {
            'total_skills': total_skills,
            'processed_so_far': processed_count,
            'percentage_complete': f"{pct:.1f}%",
            'current_batch': f"{batch_num}/{total_batches}",
            'tier_breakdown': dict(tier_stats.most_common()),
            'skill_types': dict(type_stats.most_common()),
            'top_domains': dict(domain_stats.most_common(5)),
            'anomaly_watchdog': anomalies,
            'speed_skills_per_sec': f"{speed:.1f}",
            'elapsed_seconds': int(elapsed),
            'eta_minutes': f"{eta_min:.1f}"
        }
        with open(PROGRESS_JSON, 'w', encoding='utf-8') as f:
            json.dump(monitor_state, f, ensure_ascii=False, indent=2)

        print(f"[*] [Batch {batch_num:2d}/{total_batches}] {processed_count:5d}/{total_skills} ({pct:5.1f}%) | "
              f"T1: {tier_stats['Tier 1: Catalog Exact']+tier_stats['Tier 1: Catalog Alias']:4d} | "
              f"T3: {tier_stats['Tier 3: Title Majority Vote']:4d} | "
              f"T4: {tier_stats['Tier 4: LLM Arbiter']+tier_stats['Tier 4: LLM Arbiter (Cached)']:4d} | "
              f"T0: {tier_stats['Tier 0: Noise Guard']:3d} | "
              f"Speed: {speed:4.1f} sk/s | ETA: {eta_min:4.1f}m | Anomalies: {sum(anomalies.values())}")
              
        # Checkpoint every 3000 skills
        if processed_count % 3000 == 0 or processed_count == total_skills:
            with open(CHECKPOINT_JSON, 'w', encoding='utf-8') as f:
                json.dump({'checkpoint_index': processed_count, 'records_count': len(all_resolved_records)}, f)

    print("\n" + "="*80)
    print(">>> CLEANSING COMPLETE! COMPILING EMPIRICAL CATALOG & AUDIT REPORT...")
    print("="*80)

    # Filter out Garbage to produce pristine File 2
    clean_empirical_records = [r for r in all_resolved_records if r['skill_type'] != 'Garbage']
    
    # Save File 2: database_empirical_skills_catalog.csv
    file2_keys = ['standard_skill_name', 'domain', 'sub_category', 'skill_type', 'market_frequency', 'resolution_tier', 'sample_job_titles']
    with open(OUTPUT_CSV, 'w', encoding='utf-8-sig', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=file2_keys, delimiter=';', extrasaction='ignore')
        writer.writeheader()
        for r in clean_empirical_records:
            writer.writerow({
                'standard_skill_name': r['resolved_name'],
                'domain': r['domain'],
                'sub_category': r['sub_category'],
                'skill_type': r['skill_type'],
                'market_frequency': r['market_frequency'],
                'resolution_tier': r['tier'],
                'sample_job_titles': r['sample_job_titles']
            })
    print(f"[+] File 2 Created: {OUTPUT_CSV} ({len(clean_empirical_records)} verified empirical skills)")

    # Produce 1:1 Comparative Audit Report against File 1
    empirical_skills_set = set(r['resolved_name'] for r in clean_empirical_records)
    audit_rows = []
    
    for std_skill in sorted(list(standard_catalog_skills | empirical_skills_set)):
        in_std = std_skill in standard_catalog_skills
        in_emp = std_skill in empirical_skills_set
        
        status = 'Matched (Both)' if (in_std and in_emp) else ('Standard Catalog Only' if in_std else 'Empirical Market Discovery')
        audit_rows.append({
            'skill_name': std_skill,
            'status': status,
            'present_in_standard_catalog': in_std,
            'present_in_empirical_database': in_emp
        })
        
    with open(AUDIT_REPORT_CSV, 'w', encoding='utf-8-sig', newline='') as f:
        w = csv.DictWriter(f, fieldnames=['skill_name', 'status', 'present_in_standard_catalog', 'present_in_empirical_database'], delimiter=';')
        w.writeheader()
        w.writerows(audit_rows)
        
    print(f"[+] Audit Report Created: {AUDIT_REPORT_CSV} ({len(audit_rows)} total skills audited)")
    print(f"[+] Watchdog Anomaly Summary: {anomalies}")
    print("="*80)

if __name__ == '__main__':
    run_full_cleansing()
