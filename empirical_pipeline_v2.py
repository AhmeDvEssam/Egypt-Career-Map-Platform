import sys
import os
import re
import csv
import json
import psycopg2
from collections import Counter
import pandas as pd

sys.stdout.reconfigure(encoding='utf-8')
sys.path.append('Backend API & Integration')
from ai_worker import call_llm

CATALOG_PATH = 'standard_skills_catalog.csv'
API_KEYS_PATH = 'API KEYS.xlsx'

# ==============================================================================
# 1. CANONICAL DOMAIN PRECEDENCE RULES
# ==============================================================================
# Specific tools have designated canonical homes to prevent file-order collisions
TOOL_CANONICAL_HOMES = {
    # Office & Productivity
    'microsoft excel': ('Operations & Project Management', 'Office & Administrative Management', 'Tool / Software'),
    'excel': ('Operations & Project Management', 'Office & Administrative Management', 'Tool / Software'),
    'microsoft word': ('Operations & Project Management', 'Office & Administrative Management', 'Tool / Software'),
    'word': ('Operations & Project Management', 'Office & Administrative Management', 'Tool / Software'),
    'microsoft powerpoint': ('Operations & Project Management', 'Office & Administrative Management', 'Tool / Software'),
    'powerpoint': ('Operations & Project Management', 'Office & Administrative Management', 'Tool / Software'),
    'microsoft office': ('Operations & Project Management', 'Office & Administrative Management', 'Tool / Software'),
    'office 365': ('Operations & Project Management', 'Office & Administrative Management', 'Tool / Software'),
    'google workspace': ('Operations & Project Management', 'Office & Administrative Management', 'Tool / Software'),
    
    # BI & Analytics
    'power bi': ('Data Science & Analytics', 'Business Intelligence & Data Analytics', 'Tool / Software'),
    'powerbi': ('Data Science & Analytics', 'Business Intelligence & Data Analytics', 'Tool / Software'),
    'tableau': ('Data Science & Analytics', 'Business Intelligence & Data Analytics', 'Tool / Software'),
    
    # Software Engineering & IT
    'git': ('Software Engineering & IT', 'DevOps & Cloud Infrastructure', 'Tool / Software'),
    'github': ('Software Engineering & IT', 'DevOps & Cloud Infrastructure', 'Tool / Software'),
    'gitlab': ('Software Engineering & IT', 'DevOps & Cloud Infrastructure', 'Tool / Software'),
    'docker': ('Software Engineering & IT', 'DevOps & Cloud Infrastructure', 'Tool / Software'),
    'kubernetes': ('Software Engineering & IT', 'DevOps & Cloud Infrastructure', 'Tool / Software'),
    'linux': ('Software Engineering & IT', 'DevOps & Cloud Infrastructure', 'Tool / Software'),
    'jira': ('Operations & Project Management', 'Project & Agile Management (PMP, Agile, Scrum)', 'Tool / Software'),
    
    # Engineering & CAD
    'autocad': ('Engineering & Construction', 'Civil & Structural Engineering', 'Tool / Software'),
    'autodesk revit': ('Engineering & Construction', 'Architecture & Interior Design', 'Tool / Software'),
    'revit': ('Engineering & Construction', 'Architecture & Interior Design', 'Tool / Software'),
    'solidworks': ('Engineering & Construction', 'Mechanical & MEP Engineering', 'Tool / Software'),
    'primavera p6': ('Engineering & Construction', 'Construction Management & Project Controls', 'Tool / Software'),
}

# General Domain Priority for tie-breaking other multi-row catalog skills
DOMAIN_PRIORITY = {
    'Software Engineering & IT': 10,
    'Data Science & Analytics': 9,
    'Engineering & Construction': 8,
    'Business & Finance': 7,
    'Marketing & Sales': 6,
    'Human Resources': 5,
    'Supply Chain & Logistics': 4,
    'Operations & Project Management': 3
}

def get_row_priority(row):
    return DOMAIN_PRIORITY.get(row.get('domain', ''), 1)

print("[*] Loading Canonical Skills Catalog with Canonical Precedence...")
catalog_exact = {}
catalog_clean = {}
catalog_aliases = {}

with open(CATALOG_PATH, 'r', encoding='utf-8-sig', errors='ignore') as f:
    reader = csv.DictReader(f, delimiter=';')
    for row in reader:
        std_name = row['standard_skill_name'].strip()
        lower_name = std_name.lower()
        clean_name = re.sub(r'[^a-z0-9\u0600-\u06ff]', '', lower_name)
        
        # Override with curated canonical home if in TOOL_CANONICAL_HOMES
        if lower_name in TOOL_CANONICAL_HOMES:
            dom, sub, stype = TOOL_CANONICAL_HOMES[lower_name]
            row_copy = dict(row)
            row_copy['domain'] = dom
            row_copy['sub_category'] = sub
            row_copy['skill_type'] = stype
            catalog_exact[lower_name] = row_copy
            catalog_clean[clean_name] = row_copy
        else:
            if lower_name not in catalog_exact or get_row_priority(row) > get_row_priority(catalog_exact[lower_name]):
                catalog_exact[lower_name] = row
            if clean_name not in catalog_clean or get_row_priority(row) > get_row_priority(catalog_clean[clean_name]):
                catalog_clean[clean_name] = row
        
        aliases = row.get('known_aliases', '')
        if aliases:
            for alias in re.split(r'[,|]', aliases):
                a_str = alias.strip().lower()
                if not a_str: continue
                if a_str in TOOL_CANONICAL_HOMES:
                    dom, sub, stype = TOOL_CANONICAL_HOMES[a_str]
                    a_row = dict(row)
                    a_row['domain'] = dom
                    a_row['sub_category'] = sub
                    a_row['skill_type'] = stype
                    catalog_aliases[a_str] = a_row
                elif a_str not in catalog_aliases or get_row_priority(row) > get_row_priority(catalog_aliases[a_str]):
                    catalog_aliases[a_str] = row

print(f"[+] Catalog loaded: {len(catalog_exact)} exact, {len(catalog_aliases)} aliases.")

# 2. Get Groq API Key
groq_df = pd.read_excel(API_KEYS_PATH)
groq_keys = groq_df[groq_df['provider'].str.contains('groq', case=False, na=False)]['Api key'].tolist()
GROQ_KEY = groq_keys[0].strip() if groq_keys else None
print(f"[+] Groq key active: {bool(GROQ_KEY)}")

# 3. Explicit Patterns
PATS = {
    'Certification': re.compile(r'(?i)\b(certified|certification|certificate|accredited|pmp|ccna|ccnp|mcse|mcsa|cissp|cisa|cism|ceh|itil|cbap|prince2|osha|iso\s*\d+|six\s*sigma|cpa|cma|cfa|acca|شهادة|معتمد)\b'),
    'Requirement': re.compile(r'(?i)\b(driving\s*licen[sc]e|driver\s*licen[sc]e|own\s*car|personal\s*car|military\s*service|military\s*status|rotational\s*shift|night\s*shift|day\s*shift|work\s*from\s*home|flexible\s*hours|رخصة\s*قيادة|رخصة\s*مهنية|سيارة\s*خاصة|امتلاك\s*سيارة|تجنيد|الخدمة\s*العسكرية|شفت|وردية|دوام\s*ليلي|ساعات\s*عمل)\b'),
    'Language': re.compile(r'(?i)\b(english|arabic|french|german|spanish|italian|chinese|russian|turkish|اللغة\s*الإنجليزية|اللغة\s*العربية|اللغة\s*الفرنسية|اللغة\s*الألمانية|الانجليزية|العربية|الفرنسية|الالمانية)\b'),
    'Tool / Software': re.compile(r'(?i)\b(software|suite|tool|platform|system|application|app|portal|database|framework|sdk|api|ide|library|erp|crm|autocad|revit|solidworks|sap|oracle|salesforce|jira|confluence|slack|trello|asana|figma|photoshop|illustrator|indesign|premiere|after\s*effects|power\s*bi|tableau|excel|word|powerpoint|access|outlook|matlab|spss|stata|docker|kubernetes|git|github|gitlab|jenkins|linux|windows|android|ios)\b'),
    'Soft Skill Indicator': re.compile(r'(?i)\b(mindset|curiosity|environment|attitude|coordination|communication|listening|interpersonal|teamwork|leadership|problem solving|analytical|critical thinking|adaptability|flexibility|creativity|negotiation|stress|patience|empathy|integrity|work ethic|self-motivated|literacy|presentation)\b'),
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

# Local cache for LLM decisions to prevent duplicate API hits
llm_decision_cache = {}

def call_tier4_llm(raw_name, sample_titles):
    cache_key = raw_name.strip().lower()
    if cache_key in llm_decision_cache:
        return llm_decision_cache[cache_key]
        
    prompt = f"""
    You are a strictly calibrated Egyptian Job Market Taxonomy Arbiter.
    Classify the following extracted raw skill string into its exact canonical category.
    
    Skill String: "{raw_name}"
    Context Job Titles in Egypt: {sample_titles[:5]}
    
    Allowed 'skill_type' ENUM:
    ['Tool / Software', 'Hard Skill', 'Soft Skill', 'Methodology', 'Language', 'Requirement', 'Certification', 'Garbage']
    
    Allowed 'domain' ENUM:
    ['Software Engineering & IT', 'Data Science & Analytics', 'Business & Finance', 'Marketing & Sales', 
     'Engineering & Construction', 'Human Resources', 'Supply Chain & Logistics', 'Operations & Project Management', 
     'Vocational Trades, Driving & Field Services', 'Healthcare & Medical Sciences', 'Hospitality, Tourism & Food Services', 
     'Manufacturing & Industrial Production', 'Education, Teaching & Training', 'Legal, Regulatory & Government Relations', 'None']
     
    CRITICAL RULES:
    1. Cross-cutting tools (e.g. Excel, ERP, Word) MUST be 'Tool / Software', NEVER 'Soft Skill'.
    2. Prerequisites like driving licenses, own cars, shifts MUST be 'Requirement'.
    3. Hardware specs (RAM, Core i7, SSD), salary, or noise sentences MUST be 'Garbage'.
    4. General behavioral traits, mindsets, curiosity, coordination, presentation MUST be 'Soft Skill' with domain 'Operations & Project Management'.
    5. Always provide a non-empty canonical_name, domain, and sub_category. NEVER leave domain as null/NaN.
    
    Respond ONLY with valid JSON in this exact structure:
    {{
        "canonical_name": "<clean standard name>",
        "skill_type": "<one of allowed types>",
        "domain": "<one of allowed domains>",
        "sub_category": "<concise subcategory>",
        "rationale": "<brief 1-sentence reason>"
    }}
    """
    try:
        raw_res, _ = call_llm(prompt, GROQ_KEY, 'groq')
        m = re.search(r'\{.*\}', raw_res, re.DOTALL)
        res_json = json.loads(m.group(0)) if m else json.loads(raw_res)
        # Guard against NaN/Null
        if not res_json.get('domain') or res_json.get('domain') in ('None', 'null', None):
            res_json['domain'] = 'Operations & Project Management'
        llm_decision_cache[cache_key] = res_json
        return res_json
    except Exception as e:
        err_res = {
            "canonical_name": raw_name,
            "skill_type": "Unresolved_Error",
            "domain": "Operations & Project Management",
            "sub_category": "General",
            "rationale": str(e)
        }
        llm_decision_cache[cache_key] = err_res
        return err_res

# ==============================================================================
# ATOMIC DE-COMPOUNDING ENGINE (Tier 0.5)
# ==============================================================================
def split_compound_skill(raw_name):
    # Splits e.g. "Presentation & Problem-Solving" -> ["Presentation", "Problem-Solving"]
    # Does NOT split established terms like "Research & Development" or "Supply Chain & Logistics"
    protected_terms = ['research & development', 'r&d', 'mergers & acquisitions', 'm&a', 
                       'supply chain & logistics', 'c/c++', 'pl/sql', 'ci/cd', 'frontend/backend']
    lower = raw_name.lower()
    for prot in protected_terms:
        if prot in lower:
            return [raw_name]
            
    if re.search(r'\s+(&|/|\band\b|\bو\b)\s+', raw_name):
        parts = [p.strip() for p in re.split(r'\s+(&|/|\band\b|\bو\b)\s+', raw_name) if p.strip() and p not in ('&', '/', 'and', 'و')]
        if len(parts) >= 2 and all(len(p) > 2 for p in parts):
            return parts
    return [raw_name]

# ==============================================================================
# MASTER 4-TIER RESOLUTION ENGINE V2
# ==============================================================================
def resolve_single_atomic_skill(clean_raw, linked_titles, enable_llm=True):
    lower_raw = clean_raw.lower()
    norm_raw = re.sub(r'[^a-z0-9\u0600-\u06ff]', '', lower_raw)
    
    # Tier 0: Noise Guard
    if PATS['Garbage'].search(clean_raw) or len(clean_raw) > 85:
        return {
            'input_name': clean_raw,
            'tier': 'Tier 0: Noise Guard',
            'skill_type': 'Garbage',
            'domain': 'None',
            'sub_category': 'None',
            'resolved_name': clean_raw,
            'reason': 'Hardware specs, salary, or excessive sentence length'
        }
        
    # Tier 1: Catalog Match
    if lower_raw in catalog_exact:
        m = catalog_exact[lower_raw]
        return {
            'input_name': clean_raw,
            'tier': 'Tier 1: Catalog Exact',
            'skill_type': m['skill_type'],
            'domain': m['domain'],
            'sub_category': m['sub_category'],
            'resolved_name': m['standard_skill_name'],
            'reason': 'Exact match with canonical catalog'
        }
    if lower_raw in catalog_aliases:
        m = catalog_aliases[lower_raw]
        return {
            'input_name': clean_raw,
            'tier': 'Tier 1: Catalog Alias',
            'skill_type': m['skill_type'],
            'domain': m['domain'],
            'sub_category': m['sub_category'],
            'resolved_name': m['standard_skill_name'],
            'reason': 'Matched known alias in catalog'
        }
    if norm_raw in catalog_clean:
        m = catalog_clean[norm_raw]
        return {
            'input_name': clean_raw,
            'tier': 'Tier 1: Catalog Normalized',
            'skill_type': m['skill_type'],
            'domain': m['domain'],
            'sub_category': m['sub_category'],
            'resolved_name': m['standard_skill_name'],
            'reason': 'Clean alphanumeric match'
        }
        
    # Tier 2: Explicit Patterns
    detected_type = None
    pattern_reason = None
    for p_type, rx in PATS.items():
        if p_type in ('Garbage', 'Soft Skill Indicator'): continue
        if rx.search(clean_raw):
            detected_type = p_type
            pattern_reason = f"Explicit pattern for {p_type}"
            break
            
    if detected_type == 'Language':
        return {
            'input_name': clean_raw,
            'tier': 'Tier 2: Explicit Pattern',
            'skill_type': 'Language',
            'domain': 'Operations & Project Management',
            'sub_category': 'Office & Administrative Management',
            'resolved_name': clean_raw,
            'reason': pattern_reason
        }
    if detected_type == 'Requirement':
        dom = 'Vocational Trades, Driving & Field Services' if re.search(r'(?i)\b(driving|driver|رخصة|سيارة)\b', clean_raw) else 'Operations & Project Management'
        sub = 'Driving, Chauffeur & Fleet Operation' if 'Vocational' in dom else 'Office & Administrative Management'
        return {
            'input_name': clean_raw,
            'tier': 'Tier 2: Explicit Pattern',
            'skill_type': 'Requirement',
            'domain': dom,
            'sub_category': sub,
            'resolved_name': clean_raw,
            'reason': pattern_reason
        }

    # Soft Skill Indicator Pre-Check
    if PATS['Soft Skill Indicator'].search(clean_raw):
        return {
            'input_name': clean_raw,
            'tier': 'Tier 2: Soft Indicator Gate',
            'skill_type': 'Soft Skill',
            'domain': 'Operations & Project Management',
            'sub_category': 'Soft Skills & Leadership',
            'resolved_name': clean_raw,
            'reason': f"Detected behavioral/soft attribute ({clean_raw})"
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
        
        # Only vote if confident and supported
        if confidence >= 0.50 and top_count >= 2:
            final_type = detected_type if detected_type else 'Hard Skill'
            return {
                'input_name': clean_raw,
                'tier': 'Tier 3: Title Majority Vote',
                'skill_type': final_type,
                'domain': top_domain,
                'sub_category': f'Plurality from {top_domain}',
                'resolved_name': clean_raw,
                'reason': f"Majority vote ({top_count}/{len(domain_votes)} = {confidence:.1%}) from linked titles"
            }
            
    # Tier 4: LLM Fallback Arbiter
    if enable_llm and GROQ_KEY:
        llm_res = call_tier4_llm(clean_raw, linked_titles)
        return {
            'input_name': clean_raw,
            'tier': 'Tier 4: LLM Arbiter',
            'skill_type': llm_res.get('skill_type', 'Hard Skill'),
            'domain': llm_res.get('domain', 'Operations & Project Management'),
            'sub_category': llm_res.get('sub_category', 'General'),
            'resolved_name': llm_res.get('canonical_name', clean_raw),
            'reason': llm_res.get('rationale', 'LLM classification')
        }
        
    return {
        'input_name': clean_raw,
        'tier': 'Tier 4: Unresolved (No LLM)',
        'skill_type': detected_type if detected_type else 'Unresolved',
        'domain': 'Pending',
        'sub_category': 'Pending',
        'resolved_name': clean_raw,
        'reason': 'Unmatched and unvoted'
    }

def process_raw_skill(raw_name, linked_titles=None, enable_llm=True):
    if linked_titles is None: linked_titles = []
    clean_raw = raw_name.strip()
    
    # Check if compound
    sub_parts = split_compound_skill(clean_raw)
    results = []
    for part in sub_parts:
        r = resolve_single_atomic_skill(part, linked_titles, enable_llm=enable_llm)
        r['original_raw_input'] = raw_name
        r['is_compound_split'] = (len(sub_parts) > 1)
        results.append(r)
    return results

print("[+] Pipeline V2 Engine Ready.")
