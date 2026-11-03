import sys
import os
import re
import csv
import json
import time
import psycopg2
from collections import Counter, defaultdict
import pandas as pd

sys.stdout.reconfigure(encoding='utf-8')
sys.path.append('Backend API & Integration')
from ai_worker import call_llm

# ==============================================================================
# 0. CONFIGURATION & FILE PATHS
# ==============================================================================
CATALOG_PATH = 'standard_skills_catalog.csv'
API_KEYS_PATH = 'API KEYS.xlsx'
OUTPUT_CSV = 'database_empirical_skills_catalog.csv'
AUDIT_REPORT_CSV = 'catalog_comparative_audit_report.csv'
PROGRESS_JSON = 'cleansing_progress_monitor.json'

# ==============================================================================
# 1. IMMUTABLE TAXONOMY: 14 DOMAINS & 61 CANONICAL SUBCATEGORIES
# ==============================================================================
TAXONOMY = {
    'Business & Finance': [
        'Accounting & Financial Reporting',
        'Auditing, Tax & Compliance',
        'Banking & Treasury Operations',
        'Corporate Finance & Financial Analysis'
    ],
    'Data Science & Analytics': [
        'Artificial Intelligence & Deep Learning',
        'Business Intelligence & Data Analytics',
        'Data Engineering',
        'Data Governance, Quality & Architecture',
        'Machine Learning & Data Science'
    ],
    'Education, Teaching & Training': [
        'Academic Tutoring & Special Education',
        'Curriculum Design & Educational Assessment',
        'K-12 School Teaching & Pedagogy',
        'Language Teaching & ESL'
    ],
    'Engineering & Construction': [
        'Architecture & Interior Design',
        'Civil & Structural Engineering',
        'Construction Management & Site Supervision',
        'Electrical & Power Engineering',
        'Mechanical & MEP Engineering'
    ],
    'Healthcare & Medical Sciences': [
        'Clinical Medicine & Patient Care',
        'Medical Laboratory & Diagnostic Imaging',
        'Nursing & Allied Health Services',
        'Pharmacy & Pharmaceutical Sales'
    ],
    'Hospitality, Tourism & Food Services': [
        'Culinary Arts, Kitchen & Food Preparation',
        'Food & Beverage (F&B) Service & Barista',
        'Hotel Front Desk & Guest Relations',
        'Travel, Tourism & Tour Operations'
    ],
    'Human Resources': [
        'HR Operations & People Analytics',
        'Learning & Development (L&D)',
        'Performance Management & Total Rewards',
        'Personnel, Payroll & Egyptian Labor Law',
        'Talent Acquisition & Recruitment'
    ],
    'Legal, Regulatory & Government Relations': [
        'Corporate Law, Contracts & Commercial Advisory',
        'Government Relations & Regulatory Compliance',
        'Litigation, Court Procedures & Dispute Resolution'
    ],
    'Manufacturing & Industrial Production': [
        'CNC, Machining & Metal Fabrication',
        'Industrial Automation, PLC & Instrumentation',
        'Industrial Health, Safety & Environment (HSE)',
        'Industrial Machinery & Equipment Maintenance',
        'Production Line & Assembly Operations'
    ],
    'Marketing & Sales': [
        'B2B Sales & Business Development',
        'Content Marketing, SEO & Social Media',
        'Digital Marketing & Paid Ads (Performance Media)',
        'Retail, B2C Sales & Account Management'
    ],
    'Operations & Project Management': [
        'Business Operations & Process Improvement',
        'Customer Service & Support Operations',
        'Office & Administrative Management',
        'Project & Agile Management (PMP, Agile, Scrum)'
    ],
    'Software Engineering & IT': [
        'Backend Development',
        'Cybersecurity & Information Security',
        'DevOps & Cloud Infrastructure',
        'Frontend Development',
        'Mobile Development',
        'Quality Assurance & Testing'
    ],
    'Supply Chain & Logistics': [
        'Inventory & Warehouse Management',
        'Logistics, Freight & Fleet Operations',
        'Procurement & Purchasing',
        'Supply Chain Planning & Demand Forecasting'
    ],
    'Vocational Trades, Driving & Field Services': [
        'Electrical, Plumbing & Mechanical Trades',
        'Facility Maintenance, Cleaning & Janitorial',
        'Professional Driving & Fleet Delivery',
        'Security, Guarding & Asset Protection'
    ]
}

# Pre-build reverse lookup: Subcategory -> Parent Domain
SUBCATEGORY_TO_DOMAIN = {}
ALL_61_SUBCATEGORIES = set()
for dom, subs in TAXONOMY.items():
    for sub in subs:
        SUBCATEGORY_TO_DOMAIN[sub] = dom
        ALL_61_SUBCATEGORIES.add(sub)

# Default subcategories for each domain (deterministic fallbacks within the same domain)
DOMAIN_DEFAULT_SUBCATEGORY = {
    'Business & Finance': 'Accounting & Financial Reporting',
    'Data Science & Analytics': 'Machine Learning & Data Science',
    'Education, Teaching & Training': 'K-12 School Teaching & Pedagogy',
    'Engineering & Construction': 'Civil & Structural Engineering',
    'Healthcare & Medical Sciences': 'Clinical Medicine & Patient Care',
    'Hospitality, Tourism & Food Services': 'Hotel Front Desk & Guest Relations',
    'Human Resources': 'HR Operations & People Analytics',
    'Legal, Regulatory & Government Relations': 'Corporate Law, Contracts & Commercial Advisory',
    'Manufacturing & Industrial Production': 'Production Line & Assembly Operations',
    'Marketing & Sales': 'B2B Sales & Business Development',
    'Operations & Project Management': 'Business Operations & Process Improvement',
    'Software Engineering & IT': 'Backend Development',
    'Supply Chain & Logistics': 'Supply Chain Planning & Demand Forecasting',
    'Vocational Trades, Driving & Field Services': 'Electrical, Plumbing & Mechanical Trades'
}

# ==============================================================================
# 2. CANONICAL CROSS-DOMAIN TOOL HOMES & REPUTABLE SOFT/LANG MAPPINGS
# ==============================================================================
TOOL_CANONICAL_HOMES = {
    'microsoft excel': ('Operations & Project Management', 'Office & Administrative Management', 'Tool / Software'),
    'excel': ('Operations & Project Management', 'Office & Administrative Management', 'Tool / Software'),
    'microsoft word': ('Operations & Project Management', 'Office & Administrative Management', 'Tool / Software'),
    'word': ('Operations & Project Management', 'Office & Administrative Management', 'Tool / Software'),
    'microsoft powerpoint': ('Operations & Project Management', 'Office & Administrative Management', 'Tool / Software'),
    'powerpoint': ('Operations & Project Management', 'Office & Administrative Management', 'Tool / Software'),
    'microsoft office': ('Operations & Project Management', 'Office & Administrative Management', 'Tool / Software'),
    'ms office': ('Operations & Project Management', 'Office & Administrative Management', 'Tool / Software'),
    'office 365': ('Operations & Project Management', 'Office & Administrative Management', 'Tool / Software'),
    'power bi': ('Data Science & Analytics', 'Business Intelligence & Data Analytics', 'Tool / Software'),
    'powerbi': ('Data Science & Analytics', 'Business Intelligence & Data Analytics', 'Tool / Software'),
    'tableau': ('Data Science & Analytics', 'Business Intelligence & Data Analytics', 'Tool / Software'),
    'git': ('Software Engineering & IT', 'DevOps & Cloud Infrastructure', 'Tool / Software'),
    'github': ('Software Engineering & IT', 'DevOps & Cloud Infrastructure', 'Tool / Software'),
    'gitlab': ('Software Engineering & IT', 'DevOps & Cloud Infrastructure', 'Tool / Software'),
    'docker': ('Software Engineering & IT', 'DevOps & Cloud Infrastructure', 'Tool / Software'),
    'kubernetes': ('Software Engineering & IT', 'DevOps & Cloud Infrastructure', 'Tool / Software'),
    'linux': ('Software Engineering & IT', 'DevOps & Cloud Infrastructure', 'Tool / Software'),
    'autocad': ('Engineering & Construction', 'Civil & Structural Engineering', 'Tool / Software'),
    'revit': ('Engineering & Construction', 'Architecture & Interior Design', 'Tool / Software'),
    'solidworks': ('Engineering & Construction', 'Mechanical & MEP Engineering', 'Tool / Software'),
}

UNIVERSAL_SOFT_SKILLS = {
    'communication', 'communication skills', 'interpersonal communication', 'interpersonal skills',
    'teamwork', 'team player', 'team collaboration', 'collaboration',
    'problem solving', 'problem-solving', 'analytical thinking', 'critical thinking',
    'time management', 'work under pressure', 'stress management', 'adaptability', 'flexibility',
    'leadership', 'negotiation', 'negotiation skills', 'presentation skills', 'presentation',
    'self-motivation', 'self motivated', 'attention to detail', 'detail oriented', 'growth mindset',
    'intellectual curiosity', 'computer literacy', 'accountability', 'coordination'
}

LANGUAGES = {
    'english', 'english language', 'arabic', 'arabic language', 'french', 'german', 'spanish',
    'italian', 'chinese', 'russian', 'turkish', 'اللغة الإنجليزية', 'اللغة العربية', 'اللغة الفرنسية',
    'اللغة الألمانية', 'الانجليزية', 'العربية', 'الفرنسية', 'الالمانية'
}

# ==============================================================================
# 3. NOISE & GARBAGE REGEXES (TIER 0)
# ==============================================================================
GARBAGE_REGEX = re.compile(
    r'(?i)\b('
    r'\d+\s*gb\s*(ram|ssd|hdd)|core\s*i[3579]|rtx\s*\d+|gtx\s*\d+|معالج|رامات|هارد|'
    r'\d+\s*(egp|usd|k\b|جنيه|دولار)|salary|مرتب|راتب|net\s*salary|'
    r'\d+\s*years?\s*exp|سنة\s*خبرة|\d+\s*سنين|خبرة\s*\d+|'
    r'job\s*description|responsibilities|qualifications|requirements|مهام\s*الوظيفة'
    r')\b'
)

# ==============================================================================
# 4. SMART ATOMIC DE-COMPOUNDING ENGINE
# ==============================================================================
PROTECTED_COMPOUNDS = {
    'research & development', 'r&d', 'mergers & acquisitions', 'm&a',
    'supply chain & logistics', 'c/c++', 'pl/sql', 'ci/cd', 'frontend/backend',
    'ui/ux', 'forms 1, 2, 6', 'form 1, 2, 6', 'p&l', 'profit & loss',
    'health & safety', 'learning & development', 'l&d', 'oil & gas',
    'pr & communications', 'qa/qc', 'hvac/mep', 'bim/revit', 'power bi',
    'etl/elt', 'tcp/ip', 'sales & marketing'
}

def split_compound_skill(raw_name):
    """
    Splits compound skills on comma, &, /, and, و while respecting protected engineering/business terms.
    """
    clean_str = raw_name.strip()
    lower = clean_str.lower()
    
    if lower in PROTECTED_COMPOUNDS:
        return [clean_str]
        
    for prot in PROTECTED_COMPOUNDS:
        if prot == lower:
            return [clean_str]

    # Comma separation
    if ',' in clean_str:
        if 'form' in lower and ('1' in lower or '2' in lower or '6' in lower):
            return [clean_str]
        parts = [p.strip() for p in clean_str.split(',') if p.strip()]
        if len(parts) > 1:
            atoms = []
            for p in parts:
                atoms.extend(split_compound_skill(p))
            return [a for a in atoms if len(a) > 1]

    # Delimiters: & / and و with spaces
    if re.search(r'\s+(&|/|\band\b|\bو\b)\s+', clean_str):
        parts = [p.strip() for p in re.split(r'\s+(&|/|\band\b|\bو\b)\s+', clean_str) if p.strip() and p not in ('&', '/', 'and', 'و')]
        if len(parts) >= 2 and all(len(p) > 1 for p in parts):
            return parts

    return [clean_str]

# ==============================================================================
# 5. DOMAIN & SUBCATEGORY CONTEXT MAPPERS FROM JOB TITLES (TIER 3)
# ==============================================================================
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
    (re.compile(r'(?i)\b(teacher|tutor|instructor|teaching|school|curriculum|مدرس|معلم|تدريس)\b'), 'Education, Teaching & Training'),
    (re.compile(r'(?i)\b(lawyer|legal|counsel|attorney|litigation|contracts|محامي|شؤون قانونية)\b'), 'Legal, Regulatory & Government Relations')
]

def map_job_titles_to_domain_and_sub(titles):
    """
    Deterministically determines the Domain and EXACT CANONICAL SUBCATEGORY (1 of 61)
    from linked job titles. Never outputs 'Plurality' or arbitrary text.
    """
    if not titles:
        return 'Operations & Project Management', 'Business Operations & Process Improvement'
        
    domain_votes = []
    for t in titles:
        for rx, dom in TITLE_DOMAIN_RULES:
            if rx.search(t):
                domain_votes.append(dom)
                break
                
    if not domain_votes:
        return 'Operations & Project Management', 'Business Operations & Process Improvement'
        
    top_domain, count = Counter(domain_votes).most_common(1)[0]
    all_titles_str = " ".join(titles).lower()
    
    # Strictly map to one of top_domain's allowed subcategories
    if top_domain == 'Software Engineering & IT':
        if re.search(r'\b(qa|test|quality assurance|tester)\b', all_titles_str):
            sub = 'Quality Assurance & Testing'
        elif re.search(r'\b(devops|cloud|sre|infrastructure|sysadmin|network|system administrator)\b', all_titles_str):
            sub = 'DevOps & Cloud Infrastructure'
        elif re.search(r'\b(frontend|front-end|ui|ux|web developer|react|angular|vue)\b', all_titles_str):
            sub = 'Frontend Development'
        elif re.search(r'\b(mobile|ios|android|flutter|react native)\b', all_titles_str):
            sub = 'Mobile Development'
        elif re.search(r'\b(security|cyber|soc|penetration|infosec)\b', all_titles_str):
            sub = 'Cybersecurity & Information Security'
        else:
            sub = 'Backend Development'

    elif top_domain == 'Marketing & Sales':
        if re.search(r'\b(digital|media buyer|seo|sem|performance|ad|google ads|meta ads)\b', all_titles_str):
            sub = 'Digital Marketing & Paid Ads (Performance Media)'
        elif re.search(r'\b(content|copywriter|social media|community|writer)\b', all_titles_str):
            sub = 'Content Marketing, SEO & Social Media'
        elif re.search(r'\b(retail|b2c|cashier|store|shop|branch)\b', all_titles_str):
            sub = 'Retail, B2C Sales & Account Management'
        else:
            sub = 'B2B Sales & Business Development'

    elif top_domain == 'Business & Finance':
        if re.search(r'\b(audit|tax|compliance|ضرائب|مراجعة)\b', all_titles_str):
            sub = 'Auditing, Tax & Compliance'
        elif re.search(r'\b(bank|treasury|خزينة|بنك)\b', all_titles_str):
            sub = 'Banking & Treasury Operations'
        elif re.search(r'\b(financial analyst|cfo|investment|finance manager|تمويل)\b', all_titles_str):
            sub = 'Corporate Finance & Financial Analysis'
        else:
            sub = 'Accounting & Financial Reporting'

    elif top_domain == 'Operations & Project Management':
        if re.search(r'\b(customer service|support|call center|telesales|خدمة عملاء)\b', all_titles_str):
            sub = 'Customer Service & Support Operations'
        elif re.search(r'\b(pmp|project manager|scrum|agile|مدير مشروع)\b', all_titles_str):
            sub = 'Project & Agile Management (PMP, Agile, Scrum)'
        elif re.search(r'\b(admin|office|reception|secretary|assistant|إداري|سكرتارية)\b', all_titles_str):
            sub = 'Office & Administrative Management'
        else:
            sub = 'Business Operations & Process Improvement'

    elif top_domain == 'Supply Chain & Logistics':
        if re.search(r'\b(procurement|purchasing|buyer|مشتريات)\b', all_titles_str):
            sub = 'Procurement & Purchasing'
        elif re.search(r'\b(warehouse|inventory|storekeeper|مخازن)\b', all_titles_str):
            sub = 'Inventory & Warehouse Management'
        elif re.search(r'\b(logistics|fleet|freight|shipping|شحن|أسطول)\b', all_titles_str):
            sub = 'Logistics, Freight & Fleet Operations'
        else:
            sub = 'Supply Chain Planning & Demand Forecasting'

    elif top_domain == 'Human Resources':
        if re.search(r'\b(recruitment|recruiter|talent|توظيف)\b', all_titles_str):
            sub = 'Talent Acquisition & Recruitment'
        elif re.search(r'\b(training|learning|l&d|تطوير)\b', all_titles_str):
            sub = 'Learning & Development (L&D)'
        elif re.search(r'\b(payroll|personnel|labor law|مرتبات|شؤون عاملين)\b', all_titles_str):
            sub = 'Personnel, Payroll & Egyptian Labor Law'
        elif re.search(r'\b(compensation|benefits|rewards|performance|تقييم أداء)\b', all_titles_str):
            sub = 'Performance Management & Total Rewards'
        else:
            sub = 'HR Operations & People Analytics'

    elif top_domain == 'Engineering & Construction':
        if re.search(r'\b(architect|interior|معماري|ديكور)\b', all_titles_str):
            sub = 'Architecture & Interior Design'
        elif re.search(r'\b(site|construction|supervision|موقع|تنفيذ)\b', all_titles_str):
            sub = 'Construction Management & Site Supervision'
        elif re.search(r'\b(electrical|power|كهرباء)\b', all_titles_str):
            sub = 'Electrical & Power Engineering'
        elif re.search(r'\b(mechanical|mep|hvac|plumbing|ميكانيكا)\b', all_titles_str):
            sub = 'Mechanical & MEP Engineering'
        else:
            sub = 'Civil & Structural Engineering'

    elif top_domain == 'Manufacturing & Industrial Production':
        if re.search(r'\b(hse|safety|بيئة|سلامة)\b', all_titles_str):
            sub = 'Industrial Health, Safety & Environment (HSE)'
        elif re.search(r'\b(automation|plc|scada|instrumentation|تحكم آلي)\b', all_titles_str):
            sub = 'Industrial Automation, PLC & Instrumentation'
        elif re.search(r'\b(maintenance|equipment|صيانة)\b', all_titles_str):
            sub = 'Industrial Machinery & Equipment Maintenance'
        elif re.search(r'\b(machining|cnc|welding|تشغيل معادن)\b', all_titles_str):
            sub = 'CNC, Machining & Metal Fabrication'
        else:
            sub = 'Production Line & Assembly Operations'

    elif top_domain == 'Data Science & Analytics':
        if re.search(r'\b(ai|deep learning|nlp|computer vision)\b', all_titles_str):
            sub = 'Artificial Intelligence & Deep Learning'
        elif re.search(r'\b(bi|business intelligence|reporting|tableau|power bi)\b', all_titles_str):
            sub = 'Business Intelligence & Data Analytics'
        elif re.search(r'\b(data engineer|etl|pipeline|big data)\b', all_titles_str):
            sub = 'Data Engineering'
        elif re.search(r'\b(governance|data quality|metadata)\b', all_titles_str):
            sub = 'Data Governance, Quality & Architecture'
        else:
            sub = 'Machine Learning & Data Science'

    elif top_domain == 'Healthcare & Medical Sciences':
        if re.search(r'\b(pharmacy|pharmacist|drug|صيدلي|دواء)\b', all_titles_str):
            sub = 'Pharmacy & Pharmaceutical Sales'
        elif re.search(r'\b(lab|laboratory|imaging|radiology|تحاليل|أشعة)\b', all_titles_str):
            sub = 'Medical Laboratory & Diagnostic Imaging'
        elif re.search(r'\b(nurse|nursing|تمريض)\b', all_titles_str):
            sub = 'Nursing & Allied Health Services'
        else:
            sub = 'Clinical Medicine & Patient Care'

    elif top_domain == 'Hospitality, Tourism & Food Services':
        if re.search(r'\b(culinary|chef|cook|kitchen|مطبخ|طباخ|شيف)\b', all_titles_str):
            sub = 'Culinary Arts, Kitchen & Food Preparation'
        elif re.search(r'\b(barista|beverage|waiter|steward|ويتر|باريستا)\b', all_titles_str):
            sub = 'Food & Beverage (F&B) Service & Barista'
        elif re.search(r'\b(travel|tour|tourism|سياحة)\b', all_titles_str):
            sub = 'Travel, Tourism & Tour Operations'
        else:
            sub = 'Hotel Front Desk & Guest Relations'

    elif top_domain == 'Education, Teaching & Training':
        if re.search(r'\b(english teacher|esl|language|لغات)\b', all_titles_str):
            sub = 'Language Teaching & ESL'
        elif re.search(r'\b(curriculum|assessment|مناهج)\b', all_titles_str):
            sub = 'Curriculum Design & Educational Assessment'
        elif re.search(r'\b(tutoring|special education|تربية خاصة)\b', all_titles_str):
            sub = 'Academic Tutoring & Special Education'
        else:
            sub = 'K-12 School Teaching & Pedagogy'

    elif top_domain == 'Legal, Regulatory & Government Relations':
        if re.search(r'\b(litigation|court|lawyer|محامي|قضايا)\b', all_titles_str):
            sub = 'Litigation, Court Procedures & Dispute Resolution'
        elif re.search(r'\b(government|relations|compliance|علاقات حكومية)\b', all_titles_str):
            sub = 'Government Relations & Regulatory Compliance'
        else:
            sub = 'Corporate Law, Contracts & Commercial Advisory'

    elif top_domain == 'Vocational Trades, Driving & Field Services':
        if re.search(r'\b(driver|driving|fleet|سائق|سواقة)\b', all_titles_str):
            sub = 'Professional Driving & Fleet Delivery'
        elif re.search(r'\b(security|guard|حراسة|أمن)\b', all_titles_str):
            sub = 'Security, Guarding & Asset Protection'
        elif re.search(r'\b(cleaning|janitorial|نظافة)\b', all_titles_str):
            sub = 'Facility Maintenance, Cleaning & Janitorial'
        else:
            sub = 'Electrical, Plumbing & Mechanical Trades'
    else:
        sub = DOMAIN_DEFAULT_SUBCATEGORY.get(top_domain, 'Business Operations & Process Improvement')

    # Hard sanity check: verify sub is strictly in TAXONOMY[top_domain]
    if sub not in TAXONOMY[top_domain]:
        sub = DOMAIN_DEFAULT_SUBCATEGORY[top_domain]

    return top_domain, sub

# ==============================================================================
# 6. LLM BATCH ARBITER WITH STRICT 61-SUBCATEGORY HARD CONSTRAINT (TIER 4)
# ==============================================================================
def call_constrained_tier4_llm(batch_items, groq_keys, key_idx=0):
    if not groq_keys:
        return {}
    api_key = groq_keys[key_idx % len(groq_keys)]
    
    items_text = "\n".join([f"{i+1}. \"{item[0]}\" (Context: {item[1][:3]})" for i, item in enumerate(batch_items)])
    domains_list = list(TAXONOMY.keys())
    
    prompt = f"""
You are a strictly calibrated Egyptian Job Market Taxonomy Arbiter.
Classify each extracted raw skill into its exact canonical category.

Items to classify:
{items_text}

CRITICAL RULES:
1. Allowed 'domain' ENUM (Exactly 14):
{json.dumps(domains_list, ensure_ascii=False)}

2. Allowed 'skill_type' ENUM:
['Tool / Software', 'Hard Skill', 'Soft Skill', 'Methodology', 'Language', 'Requirement', 'Certification', 'Garbage']

3. Allowed 'sub_category': MUST be a valid subcategory belonging to the chosen domain according to this map:
{json.dumps(TAXONOMY, ensure_ascii=False)}

4. Hardware, salary, or noise MUST be 'Garbage'.
5. Universal tools (Excel, Word) MUST be 'Tool / Software' under 'Operations & Project Management' -> 'Office & Administrative Management'.

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
            results = {}
            for item in data:
                orig = item.get('original', '').strip().lower()
                dom = item.get('domain', '').strip()
                sub = item.get('sub_category', '').strip()
                st = item.get('skill_type', 'Hard Skill').strip()
                cname = item.get('canonical_name', orig).strip()
                
                # Hard taxonomy validation
                if dom not in TAXONOMY:
                    dom = 'Operations & Project Management'
                if sub not in TAXONOMY[dom]:
                    sub = DOMAIN_DEFAULT_SUBCATEGORY[dom]
                    
                results[orig] = {
                    'canonical_name': cname,
                    'skill_type': st,
                    'domain': dom,
                    'sub_category': sub
                }
            return results
    except Exception:
        pass
    return {}

# ==============================================================================
# 7. MAIN ENGINE: ATOMIC RESOLUTION & CANONICAL AGGREGATION
# ==============================================================================
def execute_cleansing_and_aggregation():
    t0 = time.time()
    print("="*80)
    print(">>> 1/5. LOADING REFERENCE DATA & INITIALIZING ENGINE...")
    print("="*80)
    
    # 1. Load Standard Catalog
    catalog_exact = {}
    catalog_clean = {}
    catalog_aliases = {}
    standard_catalog_skills = set()
    
    with open(CATALOG_PATH, 'r', encoding='utf-8-sig', errors='ignore') as f:
        reader = csv.DictReader(f, delimiter=';')
        for row in reader:
            std_name = row['standard_skill_name'].strip()
            standard_catalog_skills.add(std_name)
            lower_name = std_name.lower()
            clean_name = re.sub(r'[^a-z0-9\u0600-\u06ff]', '', lower_name)
            
            # Canonical tool overrides
            if lower_name in TOOL_CANONICAL_HOMES:
                d, s, st = TOOL_CANONICAL_HOMES[lower_name]
                row['domain'], row['sub_category'], row['skill_type'] = d, s, st
                
            catalog_exact[lower_name] = row
            catalog_clean[clean_name] = row
            
            aliases = row.get('known_aliases', '')
            if aliases:
                for a in re.split(r'[,|]', aliases):
                    a_str = a.strip().lower()
                    if a_str:
                        catalog_aliases[a_str] = row
                        
    print(f"[+] Loaded {len(catalog_exact)} benchmark skills and {len(catalog_aliases)} aliases from File 1.")
    
    # 2. Load PostgreSQL Data & Aliases
    print("[*] Connecting to PostgreSQL (localhost:5432/egypt_jobs_db)...")
    conn = psycopg2.connect(
        dbname='egypt_jobs_db',
        user='postgres',
        password=os.environ.get('DB_PASSWORD', 'postgres'),
        host='localhost',
        port=5432
    )
    cur = conn.cursor()
    
    # Load DB aliases
    cur.execute('''
        SELECT sa.alias_name, s.name, s.domain, s.sub_category, s.skill_type
        FROM skill_aliases sa
        JOIN skills s ON sa.skill_id = s.id;
    ''')
    db_aliases_map = {}
    for alias_name, s_name, s_dom, s_sub, s_type in cur.fetchall():
        if alias_name:
            db_aliases_map[alias_name.strip().lower()] = {
                'canonical_name': s_name,
                'domain': s_dom,
                'sub_category': s_sub,
                'skill_type': s_type
            }
    print(f"[+] Loaded {len(db_aliases_map)} verified aliases from DB table 'skill_aliases'.")
    
    # Load all raw skills with market frequency
    cur.execute('''
        SELECT s.id, s.name, COUNT(js.job_id) as freq
        FROM skills s
        LEFT JOIN job_skills js ON s.id = js.skill_id
        GROUP BY s.id, s.name
        ORDER BY freq DESC;
    ''')
    skills_raw = cur.fetchall()
    total_skills = len(skills_raw)
    print(f"[+] Loaded {total_skills} raw skills from database.")
    
    # Load contextual job titles
    print("[*] Loading contextual job titles for all skills...")
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
    print(f"[+] Contextual titles indexed for {len(titles_map)} skills.\n")
    
    # Load Groq API Keys
    groq_keys = []
    if os.path.exists(API_KEYS_PATH):
        try:
            groq_df = pd.read_excel(API_KEYS_PATH)
            groq_keys = [k.strip() for k in groq_df[groq_df['provider'].str.contains('groq', case=False, na=False)]['Api key'].tolist()]
            print(f"[+] Active Groq API Keys: {len(groq_keys)}")
        except Exception as e:
            print(f"[!] Warning reading API Keys: {e}")

    # ==============================================================================
    # 2/5. ATOMIC CLEANSING & MULTI-TIER CLASSIFICATION
    # ==============================================================================
    print("="*80)
    print(">>> 2/5. EXECUTING ATOMIC DE-COMPOUNDING & STRICT MULTI-TIER RESOLUTION...")
    print("="*80)
    
    # Data structures for aggregation
    # Key: canonical_skill_name.lower() -> record
    canonical_catalog = {}
    
    tier_counts = Counter()
    garbage_pruned_count = 0
    compound_atoms_created = 0
    
    tier4_queue = [] # items needing LLM
    
    for idx, (s_id, s_name, s_freq) in enumerate(skills_raw):
        linked_titles = titles_map.get(s_id, [])
        atoms = split_compound_skill(s_name)
        
        if len(atoms) > 1:
            compound_atoms_created += len(atoms) - 1
            
        for atom in atoms:
            atom_clean = atom.strip()
            lower_atom = atom_clean.lower()
            norm_atom = re.sub(r'[^a-z0-9\u0600-\u06ff]', '', lower_atom)
            
            # --- Tier 0: Garbage Guard ---
            if GARBAGE_REGEX.search(atom_clean) or len(atom_clean) > 75 or len(norm_atom) < 2:
                garbage_pruned_count += 1
                tier_counts['Tier 0: Garbage Pruned'] += 1
                continue
                
            resolved_cname = None
            resolved_dom = None
            resolved_sub = None
            resolved_type = None
            resolved_tier = None
            
            # --- Tier 1A: Canonical Cross-Domain Tool Homes ---
            if lower_atom in TOOL_CANONICAL_HOMES:
                resolved_dom, resolved_sub, resolved_type = TOOL_CANONICAL_HOMES[lower_atom]
                resolved_cname = atom_clean.title()
                if lower_atom in ('power bi', 'powerbi'): resolved_cname = 'Power BI'
                elif lower_atom == 'git': resolved_cname = 'Git'
                elif lower_atom == 'autocad': resolved_cname = 'AutoCAD'
                resolved_tier = 'Tier 1A: Canonical Tool Home'
                
            # --- Tier 1B: Standard Catalog Match ---
            elif lower_atom in catalog_exact:
                m = catalog_exact[lower_atom]
                resolved_cname = m['standard_skill_name']
                resolved_dom = m['domain']
                resolved_sub = m['sub_category']
                resolved_type = m['skill_type']
                resolved_tier = 'Tier 1B: Catalog Exact'
                
            elif lower_atom in catalog_aliases:
                m = catalog_aliases[lower_atom]
                resolved_cname = m['standard_skill_name']
                resolved_dom = m['domain']
                resolved_sub = m['sub_category']
                resolved_type = m['skill_type']
                resolved_tier = 'Tier 1B: Catalog Alias'
                
            elif norm_atom in catalog_clean:
                m = catalog_clean[norm_atom]
                resolved_cname = m['standard_skill_name']
                resolved_dom = m['domain']
                resolved_sub = m['sub_category']
                resolved_type = m['skill_type']
                resolved_tier = 'Tier 1B: Catalog Normalized'
                
            # --- Tier 1C: PostgreSQL DB Aliases Match ---
            elif lower_atom in db_aliases_map:
                m = db_aliases_map[lower_atom]
                resolved_cname = m['canonical_name']
                resolved_dom = m['domain']
                resolved_sub = m['sub_category']
                resolved_type = m['skill_type']
                resolved_tier = 'Tier 1C: DB Alias Table'
                
            # --- Tier 2: Universal Soft Skills & Languages ---
            elif lower_atom in UNIVERSAL_SOFT_SKILLS:
                resolved_cname = atom_clean.title()
                resolved_dom = 'Operations & Project Management'
                resolved_sub = 'Office & Administrative Management'
                resolved_type = 'Soft Skill'
                resolved_tier = 'Tier 2: Universal Soft Skill'
                
            elif lower_atom in LANGUAGES:
                resolved_cname = atom_clean.title()
                resolved_dom = 'Operations & Project Management'
                resolved_sub = 'Office & Administrative Management'
                resolved_type = 'Language'
                resolved_tier = 'Tier 2: Language'
                
            # --- Tier 3: Context-Driven Domain & Subcategory via Job Titles ---
            elif linked_titles:
                dom, sub = map_job_titles_to_domain_and_sub(linked_titles)
                resolved_cname = atom_clean.title()
                resolved_dom = dom
                resolved_sub = sub
                resolved_type = 'Hard Skill'
                resolved_tier = 'Tier 3: Contextual Title Inference'
                
            # --- Tier 4: Residual / Pending LLM ---
            else:
                if s_freq >= 5 and groq_keys:
                    tier4_queue.append((atom_clean, linked_titles, s_freq, s_name))
                    continue
                else:
                    # Deterministic fallback within operations
                    resolved_cname = atom_clean.title()
                    resolved_dom = 'Operations & Project Management'
                    resolved_sub = 'Business Operations & Process Improvement'
                    resolved_type = 'Hard Skill'
                    resolved_tier = 'Tier 3: Default Domain Fallback'

            # Strict Assertion: verify sub_category is strictly 1 of 61 and matches domain
            if resolved_dom not in TAXONOMY:
                resolved_dom = 'Operations & Project Management'
            if resolved_sub not in TAXONOMY[resolved_dom]:
                resolved_sub = DOMAIN_DEFAULT_SUBCATEGORY[resolved_dom]

            tier_counts[resolved_tier] += 1
            
            # Canonical Aggregation (Deduplication into single master record)
            key = resolved_cname.strip().lower()
            if key not in canonical_catalog:
                canonical_catalog[key] = {
                    'standard_skill_name': resolved_cname.strip(),
                    'domain': resolved_dom,
                    'sub_category': resolved_sub,
                    'skill_type': resolved_type,
                    'market_frequency': s_freq,
                    'resolution_tier': resolved_tier,
                    'raw_aliases': {s_name, atom_clean},
                    'sample_job_titles': set(linked_titles[:3])
                }
            else:
                canonical_catalog[key]['market_frequency'] += s_freq
                canonical_catalog[key]['raw_aliases'].add(s_name)
                canonical_catalog[key]['raw_aliases'].add(atom_clean)
                for t in linked_titles[:3]:
                    canonical_catalog[key]['sample_job_titles'].add(t)

        if (idx + 1) % 5000 == 0 or (idx + 1) == total_skills:
            print(f"[*] Processed {idx+1:5d}/{total_skills} skills | Unique Canonical Skills: {len(canonical_catalog)} | Garbage Pruned: {garbage_pruned_count}")

    # Process Tier 4 Queue with LLM if any
    if tier4_queue and groq_keys:
        print(f"\n[*] Processing Tier 4 LLM Batch ({len(tier4_queue)} items)...")
        SUB_BATCH = 10
        for i in range(0, len(tier4_queue), SUB_BATCH):
            batch = tier4_queue[i:i+SUB_BATCH]
            payload = [(b[0], b[1]) for b in batch]
            res_dict = call_constrained_tier4_llm(payload, groq_keys, i // SUB_BATCH)
            
            for atom_clean, linked_titles, s_freq, s_name in batch:
                k = atom_clean.strip().lower()
                if k in res_dict:
                    item = res_dict[k]
                    resolved_cname = item['canonical_name']
                    resolved_dom = item['domain']
                    resolved_sub = item['sub_category']
                    resolved_type = item['skill_type']
                    resolved_tier = 'Tier 4: Constrained LLM Arbiter'
                else:
                    dom, sub = map_job_titles_to_domain_and_sub(linked_titles)
                    resolved_cname = atom_clean.title()
                    resolved_dom = dom
                    resolved_sub = sub
                    resolved_type = 'Hard Skill'
                    resolved_tier = 'Tier 4: Fallback Inferred'
                    
                tier_counts[resolved_tier] += 1
                ckey = resolved_cname.strip().lower()
                if ckey not in canonical_catalog:
                    canonical_catalog[ckey] = {
                        'standard_skill_name': resolved_cname.strip(),
                        'domain': resolved_dom,
                        'sub_category': resolved_sub,
                        'skill_type': resolved_type,
                        'market_frequency': s_freq,
                        'resolution_tier': resolved_tier,
                        'raw_aliases': {s_name, atom_clean},
                        'sample_job_titles': set(linked_titles[:3])
                    }
                else:
                    canonical_catalog[ckey]['market_frequency'] += s_freq
                    canonical_catalog[ckey]['raw_aliases'].add(s_name)
                    canonical_catalog[ckey]['raw_aliases'].add(atom_clean)
                    for t in linked_titles[:3]:
                        canonical_catalog[ckey]['sample_job_titles'].add(t)

    # ==============================================================================
    # 3/5. FILTERING & CANONICAL CATALOG COMPILATION
    # ==============================================================================
    print("\n" + "="*80)
    print(">>> 3/5. COMPILING & PRUNING CANONICAL EMPIRICAL CATALOG...")
    print("="*80)
    
    # We want a pristine empirical catalog of ~3,500 to 4,000 unique canonical skills
    # covering the vast majority of Egyptian labor market demand (>88%).
    # Qualification criteria:
    # 1. Matched File 1 (Benchmark Catalog)
    # 2. Matched Universal Soft Skills or Languages
    # 3. Market Frequency >= 10 (High market demand in Egypt)
    final_canonical_rows = []
    
    for k, item in canonical_catalog.items():
        cname = item['standard_skill_name']
        freq = item['market_frequency']
        tier = item['resolution_tier']
        
        is_standard_match = tier.startswith('Tier 1B') or tier.startswith('Tier 1A')
        is_universal = tier.startswith('Tier 2')
        is_high_market_demand = (freq >= 10)
        
        if is_standard_match or is_universal or is_high_market_demand:
            aliases_str = " | ".join(sorted(list(item['raw_aliases']))[:10])
            titles_str = " | ".join(sorted(list(item['sample_job_titles']))[:5])
            
            final_canonical_rows.append({
                'standard_skill_name': cname,
                'domain': item['domain'],
                'sub_category': item['sub_category'],
                'skill_type': item['skill_type'],
                'market_frequency': freq,
                'resolution_tier': tier,
                'known_aliases': aliases_str,
                'sample_job_titles': titles_str
            })

    # Sort descending by market frequency
    final_canonical_rows.sort(key=lambda x: x['market_frequency'], reverse=True)
    
    # Write File 2: database_empirical_skills_catalog.csv (with fallback if locked by Excel)
    target_output_csv = OUTPUT_CSV
    file2_fields = [
        'standard_skill_name', 'domain', 'sub_category', 'skill_type', 
        'market_frequency', 'resolution_tier', 'known_aliases', 'sample_job_titles'
    ]
    try:
        with open(target_output_csv, 'w', encoding='utf-8-sig', newline='') as f:
            writer = csv.DictWriter(f, fieldnames=file2_fields, delimiter=';')
            writer.writeheader()
            writer.writerows(final_canonical_rows)
        print(f"[+] Pristine File 2 Written: {target_output_csv}")
    except PermissionError:
        target_output_csv = 'database_empirical_skills_catalog_new.csv'
        with open(target_output_csv, 'w', encoding='utf-8-sig', newline='') as f:
            writer = csv.DictWriter(f, fieldnames=file2_fields, delimiter=';')
            writer.writeheader()
            writer.writerows(final_canonical_rows)
        print(f"[!] Notice: {OUTPUT_CSV} is currently locked by Excel. Saved cleanly to: {target_output_csv}")
        
    print(f"[+] Total Unique Canonical Skills in Catalog: {len(final_canonical_rows)}")

    # ==============================================================================
    # 4/5. 1:1 COMPARATIVE AUDIT REPORT AGAINST BENCHMARK (FILE 1)
    # ==============================================================================
    print("\n" + "="*80)
    print(">>> 4/5. PRODUCING 1:1 COMPARATIVE AUDIT REPORT...")
    print("="*80)
    
    emp_skill_names = set(r['standard_skill_name'] for r in final_canonical_rows)
    all_audit_skills = sorted(list(standard_catalog_skills | emp_skill_names))
    
    emp_dict = {r['standard_skill_name']: r for r in final_canonical_rows}
    std_dict = catalog_exact
    
    audit_rows = []
    for skill in all_audit_skills:
        in_std = skill in standard_catalog_skills
        in_emp = skill in emp_skill_names
        
        if in_std and in_emp:
            status = 'Matched (Both Catalogs)'
        elif in_std and not in_emp:
            status = 'Standard Benchmark Only (Unseen in DB)'
        else:
            status = 'Empirical Market Discovery (DB Only)'
            
        emp_freq = emp_dict[skill]['market_frequency'] if in_emp else 0
        emp_dom = emp_dict[skill]['domain'] if in_emp else ''
        emp_sub = emp_dict[skill]['sub_category'] if in_emp else ''
        emp_tier = emp_dict[skill]['resolution_tier'] if in_emp else ''
        
        audit_rows.append({
            'skill_name': skill,
            'status': status,
            'present_in_standard_catalog': in_std,
            'present_in_empirical_database': in_emp,
            'market_frequency': emp_freq,
            'empirical_domain': emp_dom,
            'empirical_sub_category': emp_sub,
            'resolution_tier': emp_tier
        })
        
    audit_fields = [
        'skill_name', 'status', 'present_in_standard_catalog', 'present_in_empirical_database',
        'market_frequency', 'empirical_domain', 'empirical_sub_category', 'resolution_tier'
    ]
    with open(AUDIT_REPORT_CSV, 'w', encoding='utf-8-sig', newline='') as f:
        w = csv.DictWriter(f, fieldnames=audit_fields, delimiter=';')
        w.writeheader()
        w.writerows(audit_rows)
        
    print(f"[+] Audit Report Written: {AUDIT_REPORT_CSV} ({len(audit_rows)} total skills)")

    # ==============================================================================
    # 5/5. PROGRAMMATIC INTEGRITY ASSERTIONS
    # ==============================================================================
    print("\n" + "="*80)
    print(">>> 5/5. RUNNING RIGOROUS PROGRAMMATIC INTEGRITY ASSERTIONS...")
    print("="*80)
    
    df_out = pd.read_csv(target_output_csv, sep=';', encoding='utf-8-sig')
    
    # 1. Zero Duplicate Skill Names
    assert df_out['standard_skill_name'].nunique() == len(df_out), "FAIL: Duplicate skill names found in catalog!"
    print(f"[PASSED] Zero duplicates: exactly {len(df_out)} unique skills.")
    
    # 2. Strict 14 Domains
    unique_doms = set(df_out['domain'].unique())
    assert unique_doms.issubset(set(TAXONOMY.keys())), f"FAIL: Unknown domain found: {unique_doms - set(TAXONOMY.keys())}"
    print(f"[PASSED] Strict Domains: {len(unique_doms)}/14 domains verified.")
    
    # 3. Strict 61 Subcategories
    unique_subs = set(df_out['sub_category'].unique())
    assert unique_subs.issubset(ALL_61_SUBCATEGORIES), f"FAIL: Unknown subcategory found: {unique_subs - ALL_61_SUBCATEGORIES}"
    print(f"[PASSED] Strict Subcategories: {len(unique_subs)}/61 verified. ZERO hallucinated subcategories.")
    
    # 4. Zero Plurality Strings
    plurality_found = df_out['sub_category'].str.contains('Plurality', case=False, na=False).sum()
    assert plurality_found == 0, "FAIL: 'Plurality' strings still exist!"
    print("[PASSED] Zero 'Plurality' strings anywhere in the dataset.")
    
    # 5. Taxonomy Hierarchy Consistency
    for idx, row in df_out.iterrows():
        d, s = row['domain'], row['sub_category']
        assert s in TAXONOMY[d], f"FAIL: Subcategory '{s}' does not belong to Domain '{d}'!"
    print("[PASSED] 100% Taxonomy Hierarchy Consistency verified across all rows.")
    
    print("\n" + "="*80)
    print(f">>> CLEANSING PIPELINE COMPLETED SUCCESSFULLY IN {time.time()-t0:.1f}s!")
    print(f">>> Final Empirical Skills Catalog: {len(df_out)} unique canonical skills.")
    print("="*80)

if __name__ == '__main__':
    execute_cleansing_and_aggregation()
