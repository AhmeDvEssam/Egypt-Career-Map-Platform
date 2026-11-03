import csv
import json
import re
from collections import defaultdict, Counter
import psycopg2

print("=== REBUILDING PRODUCTION GOLDEN & CROSS-DOMAIN SKILLS CATALOGS ===")

# 1. Connect to PostgreSQL
conn = psycopg2.connect('host=localhost port=5432 dbname=egypt_jobs_db user=postgres password=postgres')
cur = conn.cursor()

print("Fetching jobs and skills from DB...")
cur.execute('SELECT id, title_raw, job_category FROM jobs;')
jobs = cur.fetchall()

cur.execute('''
    SELECT js.job_id, s.name, s.domain 
    FROM job_skills js
    JOIN skills s ON js.skill_id = s.id
    WHERE s.domain IS NOT NULL;
''')
job_skills_map = defaultdict(list)
for jid, sname, sdomain in cur.fetchall():
    job_skills_map[jid].append((sname, sdomain))

cur.execute('''
    SELECT s.name, js.job_id, j.title_raw
    FROM skills s
    JOIN job_skills js ON s.id = js.skill_id
    JOIN jobs j ON js.job_id = j.id;
''')
skill_job_records = cur.fetchall()
conn.close()

print(f"Fetched {len(jobs)} jobs and {len(skill_job_records)} skill-job links.")

# 2. Enhanced Job Domain Rules (Arabic & English)
DOMAIN_TITLE_RULES_ENHANCED = [
    # Data Science & Analytics
    ('Data Science & Analytics', re.compile(
        r'(?i)\b(data|machine learning|deep learning|nlp|computer vision|bi analyst|business intelligence|'
        r'data engineer|data analyst|data scientist|analytics|big data|ai engineer|ai specialist|'
        r'علم البيانات|محلل بيانات|مهندس بيانات|ذكاء اصطناعي)\b'
    )),
    # Software Engineering & IT
    ('Software Engineering & IT', re.compile(
        r'(?i)\b(developer|frontend|backend|full stack|fullstack|software|programmer|devops|qa\b|'
        r'quality assurance|cloud|cyber|penetration|network|system admin|mobile|ios|android|'
        r'sre|it specialist|tech lead|react|angular|node|flutter|python developer|java developer|'
        r'.net developer|php developer|wordpress|web developer|ui/ux|ui designer|ux designer|'
        r'مطور|مبرمج|مهندس برمجيات|أمن معلومات|شبكات|دعم فني|it|نظم معلومات)\b'
    )),
    # Marketing & Sales / Design
    ('Marketing & Sales', re.compile(
        r'(?i)\b(graphic designer|art director|illustrator|motion designer|video editor|animator|visual designer|'
        r'sales|marketing|media buyer|seo|sem|content|social media|account executive|telesales|'
        r'b2b|retail|b2c|branding|copywriter|digital marketing|property consultant|real estate|'
        r'broker|account manager|commercial|key account|promoter|creative director|'
        r'مبيعات|تسويق|عقارات|سيلز|مندوب|مسؤول مبيعات|اخصائي تسويق|مصمم|جرافيك|فيديو|مونتير)\b'
    )),
    # Business & Finance
    ('Business & Finance', re.compile(
        r'(?i)\b(accountant|accounting|auditor|audit|finance|financial|treasury|tax|cfo|banking|'
        r'cost accountant|financial analyst|bookkeeper|credit|payroll accountant|'
        r'محاسب|حسابات|مراجع|مراجعة|مالي|مالية|ضرائب|خزينة|بنك|ائتمان)\b'
    )),
    # Engineering & Construction
    ('Engineering & Construction', re.compile(
        r'(?i)\b(civil|mechanical|electrical|architect|structural|site engineer|mep|cad|construction|'
        r'bim|interior|project engineer|technical office|planning engineer|surveyor|hvac|autocad|revit|'
        r'مهندس مدني|مهندس معماري|مهندس ميكانيكا|مهندس كهرباء|مهندس موقع|مكتب فني|تشطيبات|إنشاءات|عمارة)\b'
    )),
    # Human Resources
    ('Human Resources', re.compile(
        r'(?i)\b(hr|recruiter|recruitment|talent acquisition|personnel|human resources|payroll|'
        r'l&d|training|people operations|hr generalist|hr specialist|hr manager|hr officer|'
        r'موارد بشرية|شؤون عاملين|توظيف|أخصائي توظيف|مسؤول موارد)\b'
    )),
    # Supply Chain & Logistics
    ('Supply Chain & Logistics', re.compile(
        r'(?i)\b(supply chain|procurement|purchasing|warehouse|logistics|fleet|inventory|shipping|'
        r'storekeeper|buyer|import|export|customs|dispatcher|freight|'
        r'سلاسل إمداد|مشتريات|مخازن|مخزن|لوجستيات|أمين مخزن|شحن|جمارك|تصدير|استيراد)\b'
    )),
    # Operations & Project Management
    ('Operations & Project Management', re.compile(
        r'(?i)\b(project manager|pmo|scrum master|operations manager|operations specialist|'
        r'office manager|administrative assistant|admin assistant|executive assistant|receptionist|'
        r'coordinator|operations coordinator|operations supervisor|branch manager|general manager|'
        r'إدارة مشروعات|مدير مشروع|عمليات|إداري|سكرتارية|سكرتير|استقبال|مدير فرع|منسق)\b'
    )),
    # Healthcare & Medical Sciences
    ('Healthcare & Medical Sciences', re.compile(
        r'(?i)\b(doctor|physician|nurse|pharmacist|medical|clinical|hospital|laboratory|dentist|'
        r'healthcare|physiotherapy|vet|veterinary|biomedical|chemist|'
        r'طبيب|دكتور|صيدلي|صيدلية|تمريض|ممرض|مختبر|معمل|علاج طبيعي|بيطري|كيميائي|اسنان)\b'
    )),
    # Hospitality, Tourism & Food Services
    ('Hospitality, Tourism & Food Services', re.compile(
        r'(?i)\b(chef|cook|waiter|barista|steward|reception|hotel|restaurant|catering|food|bartender|'
        r'f&b|kitchen|pastry|housekeeping|guest relations|travel agent|tourism|tour guide|'
        r'شيف|طباخ|ويتر|باريستا|مضيف|فندق|مطعم|أغذية|مشروبات|سياحة|طيران)\b'
    )),
    # Manufacturing & Industrial Production
    ('Manufacturing & Industrial Production', re.compile(
        r'(?i)\b(production engineer|factory|plant manager|industrial|quality control|maintenance engineer|'
        r'machining|cnc|hse engineer|safety engineer|production supervisor|shift engineer|operator|'
        r'مهندس إنتاج|مصنع|تشغيل|صيانة|جودة إنتاج|سلامة وصحة مهنية|فني تشغيل)\b'
    )),
    # Education, Teaching & Training
    ('Education, Teaching & Training', re.compile(
        r'(?i)\b(teacher|tutor|instructor|teaching|school|curriculum|academic|professor|educator|'
        r'trainer|lecturer|math teacher|english teacher|science teacher|'
        r'معلم|مدرس|تدريس|أستاذ|مدرب|محاضر|مدرسة)\b'
    )),
    # Legal, Regulatory & Government Relations
    ('Legal, Regulatory & Government Relations', re.compile(
        r'(?i)\b(lawyer|legal|counsel|attorney|litigation|contracts|compliance officer|legal advisor|'
        r'paralegal|legal specialist|'
        r'محامي|قانوني|مستشار قانوني|شؤون قانونية|عقود|قضايا)\b'
    )),
    # Vocational Trades, Driving & Field Services
    ('Vocational Trades, Driving & Field Services', re.compile(
        r'(?i)\b(driver|chauffeur|courier|technician|electrician|plumber|carpenter|security guard|'
        r'field technician|delivery|maintenance technician|installer|painter|mechanic|'
        r'سائق|مندوب توصيل|فني|كهربائي|سباك|نجار|أمن|حراسة|عامل|صيانة منزلية|ميكانيكي)\b'
    ))
]

# Classify each job
job_to_domain = {}
for jid, title, cat in jobs:
    t = (title or "").lower()
    dom_found = None
    for dom, rx in DOMAIN_TITLE_RULES_ENHANCED:
        if rx.search(t):
            dom_found = dom
            break
    if not dom_found:
        if jid in job_skills_map and len(job_skills_map[jid]) > 0:
            dom_votes = [dom for sname, dom in job_skills_map[jid] if dom]
            if dom_votes:
                dom_found = Counter(dom_votes).most_common(1)[0][0]
    if not dom_found:
        dom_found = 'Operations & Project Management'
    job_to_domain[jid] = dom_found

print("All 46,802 jobs classified into domains.")

# Map skill -> jobs and sample titles
skill_jobs_map = defaultdict(set)
skill_titles_map = defaultdict(list)
for sname, jid, jtitle in skill_job_records:
    skill_jobs_map[sname.lower()].add(jid)
    if len(skill_titles_map[sname.lower()]) < 5 and jtitle:
        skill_titles_map[sname.lower()].append(jtitle)

# 3. Canonical Subcategory & Domain Guarantees
TAXONOMY_IDENTITY_MAP = {
    # Software Engineering & IT
    'backend development': ('Software Engineering & IT', 'Backend Development'),
    'frontend development': ('Software Engineering & IT', 'Frontend Development'),
    'mobile development': ('Software Engineering & IT', 'Mobile Development'),
    'devops & cloud infrastructure': ('Software Engineering & IT', 'DevOps & Cloud Infrastructure'),
    'quality assurance & testing': ('Software Engineering & IT', 'Quality Assurance & Testing'),
    'cybersecurity & information security': ('Software Engineering & IT', 'Cybersecurity & Information Security'),
    'game development': ('Software Engineering & IT', 'Game Development'),
    'embedded systems & iot': ('Software Engineering & IT', 'Embedded Systems & IoT'),
    'database administration': ('Software Engineering & IT', 'Database Administration'),
    'systems administration': ('Software Engineering & IT', 'Systems & Network Administration'),
    'network administration': ('Software Engineering & IT', 'Systems & Network Administration'),
    
    # Data Science & Analytics
    'data engineering': ('Data Science & Analytics', 'Data Engineering'),
    'machine learning': ('Data Science & Analytics', 'Machine Learning & Data Science'),
    'deep learning': ('Data Science & Analytics', 'Machine Learning & Data Science'),
    'artificial intelligence': ('Data Science & Analytics', 'Machine Learning & Data Science'),
    'business intelligence': ('Data Science & Analytics', 'Business Intelligence & Data Analytics'),
    'data analytics': ('Data Science & Analytics', 'Business Intelligence & Data Analytics'),
    'data science': ('Data Science & Analytics', 'Machine Learning & Data Science'),
    'data governance': ('Data Science & Analytics', 'Data Governance, Quality & Architecture'),
    
    # Marketing & Sales / Design
    'ui/ux design': ('Marketing & Sales', 'UI/UX Design'),
    'ui design': ('Marketing & Sales', 'UI/UX Design'),
    'ux design': ('Marketing & Sales', 'UI/UX Design'),
    'graphic design': ('Marketing & Sales', 'Graphic Design & Creative'),
    'digital marketing': ('Marketing & Sales', 'Digital Marketing & Performance'),
    'content creation': ('Marketing & Sales', 'Content Marketing, SEO & Social Media'),
    'social media management': ('Marketing & Sales', 'Content Marketing, SEO & Social Media'),
    'b2b sales': ('Marketing & Sales', 'B2B Sales & Business Development'),
    'business development': ('Marketing & Sales', 'B2B Sales & Business Development'),
    'account management': ('Marketing & Sales', 'Account Management & Client Relations'),
    
    # Product & Project Management
    'product management': ('Operations & Project Management', 'Product & Agile Management (PMP, Agile, Scrum)'),
    'project management': ('Operations & Project Management', 'Project & Agile Management (PMP, Agile, Scrum)'),
    'agile': ('Operations & Project Management', 'Project & Agile Management (PMP, Agile, Scrum)'),
    'scrum': ('Operations & Project Management', 'Project & Agile Management (PMP, Agile, Scrum)'),
    'operations management': ('Operations & Project Management', 'Business Operations & Process Improvement'),
    
    # Business & Finance
    'accounting': ('Business & Finance', 'Accounting & Financial Reporting'),
    'financial accounting': ('Business & Finance', 'Accounting & Financial Reporting'),
    'auditing': ('Business & Finance', 'Auditing, Tax & Compliance'),
    'taxation': ('Business & Finance', 'Auditing, Tax & Compliance'),
    'corporate finance': ('Business & Finance', 'Corporate Finance & Treasury'),
    
    # Human Resources
    'talent acquisition': ('Human Resources', 'Talent Acquisition & Recruitment'),
    'recruitment': ('Human Resources', 'Talent Acquisition & Recruitment'),
    'payroll': ('Human Resources', 'Compensation, Benefits & Payroll'),
    'human resources': ('Human Resources', 'HR Operations & Personnel Administration'),
    'performance management': ('Human Resources', 'Learning, Development & Performance Management'),
    
    # Supply Chain & Logistics
    'supply chain': ('Supply Chain & Logistics', 'Supply Chain Strategy & Planning'),
    'procurement': ('Supply Chain & Logistics', 'Procurement & Purchasing Operations'),
    'inventory management': ('Supply Chain & Logistics', 'Warehouse & Inventory Management'),
    'logistics': ('Supply Chain & Logistics', 'Logistics, Fleet & Transportation Management'),
    
    # Legal
    'contract law': ('Legal, Regulatory & Government Relations', 'Corporate Law, Contracts & Commercial Advisory'),
    'compliance': ('Legal, Regulatory & Government Relations', 'Regulatory Compliance & Corporate Governance'),
    
    # Engineering & Construction
    'civil engineering': ('Engineering & Construction', 'Civil & Structural Engineering'),
    'mechanical engineering': ('Engineering & Construction', 'Mechanical & Industrial Systems Engineering'),
    'electrical engineering': ('Engineering & Construction', 'Electrical & Power Engineering'),
    'architecture': ('Engineering & Construction', 'Architectural Design & Urban Planning')
}

# 4. Read the current golden catalog
with open('database_empirical_skills_catalog_golden.csv', 'r', encoding='utf-8-sig') as f:
    reader = csv.DictReader(f, delimiter=';')
    golden_rows = list(reader)

print(f"Loaded {len(golden_rows)} original rows from golden catalog.")

# 5. Fluff Redundancy Consolidation
FLUFF_TOKENS = {
    'management', 'processes', 'process', 'frameworks', 'framework',
    'procedures', 'procedure', 'operations', 'operation', 'practices',
    'practice', 'implementation', 'strategy', 'strategies', 'administration',
    'services', 'service', 'tools', 'tool', 'system', 'systems', 'design',
    'activities', 'activity', 'methodologies', 'methodology', 'techniques',
    'technique', 'skills', 'skill', 'development', 'analysis', 'standards',
    'guidelines', 'coordination', 'support', 'planning', 'execution', 'monitoring'
}

# Identify base skills in catalog
skill_names_lower = {r['standard_skill_name'].lower(): r['standard_skill_name'] for r in golden_rows}

# Explicit merges for fluff variants
FLUFF_MERGE_MAP = {
    'sales process': 'Sales',
    'sales processes': 'Sales',
    'sales techniques': 'Sales',
    'sales methodologies': 'Sales',
    'sales practices': 'Sales',
    'compliance standards': 'Compliance',
    'process compliance': 'Compliance',
    'compliance procedures': 'Compliance',
    'compliance framework': 'Compliance',
    'safety procedures': 'Occupational Health and Safety',
    'safety practices': 'Occupational Health and Safety',
    'safety standards': 'Occupational Health and Safety',
    'safety management': 'Occupational Health and Safety',
    'audit methodologies': 'Auditing',
    'audit procedures': 'Auditing',
    'auditing standards': 'Auditing',
    'quality standards': 'Quality Management',
    'quality procedures': 'Quality Management',
    'testing methodologies': 'Software Testing',
    'testing techniques': 'Software Testing',
    'recruitment process': 'Recruitment',
    'recruitment techniques': 'Recruitment',
    'training methodologies': 'Training and Development',
    'training techniques': 'Training and Development',
    'negotiation techniques': 'Negotiation',
    'negotiation skills': 'Negotiation',
    'presentation techniques': 'Presentation Skills'
}

# Consolidate fluff variants
consolidated_catalog = {}
merged_fluff_count = 0

for r in golden_rows:
    orig_name = r['standard_skill_name']
    lower_name = orig_name.lower().strip()
    
    # Check if this row is a known fluff variant to merge
    target_canonical = None
    if lower_name in FLUFF_MERGE_MAP:
        cand = FLUFF_MERGE_MAP[lower_name]
        if cand.lower() in skill_names_lower:
            target_canonical = skill_names_lower[cand.lower()]
    
    if target_canonical and target_canonical.lower() != lower_name:
        merged_fluff_count += 1
        # Merge job references
        target_lower = target_canonical.lower()
        if target_lower in consolidated_catalog:
            target_row = consolidated_catalog[target_lower]
            # Combine jobs
            target_jobs = skill_jobs_map[target_lower].union(skill_jobs_map[lower_name])
            skill_jobs_map[target_lower] = target_jobs
            target_row['unique_job_count'] = str(len(target_jobs))
            # Append variant
            existing_vars = target_row.get('variants_sample', '')
            if orig_name not in existing_vars:
                target_row['variants_sample'] = f"{existing_vars}, {orig_name}".strip(', ')
        continue
    
    consolidated_catalog[lower_name] = r

print(f"Consolidated and purged {merged_fluff_count} redundant fluff variant rows.")
print(f"Remaining pure skills in catalog: {len(consolidated_catalog)}")

# 6. Recalculate Domains and Subcategories accurately
clean_golden_rows = []
cross_domain_rows = []
by_domain_rows = []

for lower_name, r in consolidated_catalog.items():
    sname = r['standard_skill_name']
    sjobs = skill_jobs_map[lower_name]
    total_jobs = len(sjobs) if sjobs else int(r.get('unique_job_count', 1))
    
    # Calculate empirical domain breakdown from actual assigned job domains
    dom_counts = Counter()
    for jid in sjobs:
        d = job_to_domain.get(jid, 'Operations & Project Management')
        dom_counts[d] += 1
    
    # Check if skill has an immutable Taxonomy Identity
    if lower_name in TAXONOMY_IDENTITY_MAP:
        primary_domain, primary_subcat = TAXONOMY_IDENTITY_MAP[lower_name]
    else:
        # Use empirical job domain breakdown
        if dom_counts:
            primary_domain = dom_counts.most_common(1)[0][0]
        else:
            primary_domain = r['domain']
        
        # Subcategory determination
        # If DB had a specific subcategory that belongs to this domain, respect it!
        primary_subcat = r['sub_category']
        
        # Guard against backend/frontend title bugs
        if 'backend' in lower_name and primary_domain == 'Software Engineering & IT':
            primary_subcat = 'Backend Development'
        elif 'frontend' in lower_name and primary_domain == 'Software Engineering & IT':
            primary_subcat = 'Frontend Development'
        elif 'mobile' in lower_name and primary_domain == 'Software Engineering & IT':
            primary_subcat = 'Mobile Development'
        elif 'devops' in lower_name and primary_domain == 'Software Engineering & IT':
            primary_subcat = 'DevOps & Cloud Infrastructure'
        elif ('qa' in lower_name or 'test' in lower_name) and primary_domain == 'Software Engineering & IT':
            primary_subcat = 'Quality Assurance & Testing'
    
    # Format secondary domains
    secondary_parts = []
    applicable_domains = []
    
    if dom_counts:
        sorted_doms = dom_counts.most_common()
        applicable_domains = [d for d, cnt in sorted_doms if (cnt / total_jobs) >= 0.03 or cnt >= 5]
        if not applicable_domains:
            applicable_domains = [primary_domain]
        elif primary_domain not in applicable_domains:
            applicable_domains.insert(0, primary_domain)
            
        for d, cnt in sorted_doms:
            if d != primary_domain and ((cnt / total_jobs) >= 0.03 or cnt >= 5):
                pct = (cnt / total_jobs) * 100
                secondary_parts.append(f"{d} ({cnt} jobs, {pct:.1f}%)")
    else:
        applicable_domains = [primary_domain]
    
    secondary_domains_str = "; ".join(secondary_parts) if secondary_parts else "None"
    all_applicable_str = ", ".join(applicable_domains)
    
    # 1. Golden Catalog Row
    clean_golden_rows.append({
        'standard_skill_name': sname,
        'domain': primary_domain,
        'sub_category': primary_subcat,
        'skill_type': r.get('skill_type', 'Hard Skill'),
        'unique_job_count': str(total_jobs),
        'raw_occurrences': r.get('raw_occurrences', str(total_jobs)),
        'resolution_source': r.get('resolution_source', 'Empirical Market Discovery'),
        'confidence_score': r.get('confidence_score', '0.90'),
        'variants_sample': r.get('variants_sample', sname),
        'sample_job_titles': ", ".join(skill_titles_map[lower_name][:3]) if skill_titles_map[lower_name] else r.get('sample_job_titles', '')
    })
    
    # 2. Cross Domain Catalog Row
    cross_domain_rows.append({
        'standard_skill_name': sname,
        'primary_domain': primary_domain,
        'primary_sub_category': primary_subcat,
        'skill_type': r.get('skill_type', 'Hard Skill'),
        'unique_job_count': str(total_jobs),
        'secondary_domains': secondary_domains_str,
        'all_applicable_domains': all_applicable_str,
        'resolution_source': r.get('resolution_source', 'Empirical Market Discovery'),
        'confidence_score': r.get('confidence_score', '0.90')
    })
    
    # 3. By Domain Catalog Rows
    if dom_counts:
        for d, cnt in dom_counts.items():
            pct = (cnt / total_jobs) * 100
            # Include if relevant share
            if cnt >= 3 or pct >= 3.0 or d == primary_domain:
                by_domain_rows.append({
                    'domain': d,
                    'standard_skill_name': sname,
                    'sub_category': primary_subcat,
                    'skill_type': r.get('skill_type', 'Hard Skill'),
                    'domain_specific_jobs': str(cnt),
                    'domain_percentage': f"{pct:.1f}%",
                    'total_market_jobs': str(total_jobs)
                })
    else:
        by_domain_rows.append({
            'domain': primary_domain,
            'standard_skill_name': sname,
            'sub_category': primary_subcat,
            'skill_type': r.get('skill_type', 'Hard Skill'),
            'domain_specific_jobs': str(total_jobs),
            'domain_percentage': "100.0%",
            'total_market_jobs': str(total_jobs)
        })

# Sort rows
clean_golden_rows.sort(key=lambda x: int(x['unique_job_count']), reverse=True)
cross_domain_rows.sort(key=lambda x: int(x['unique_job_count']), reverse=True)
by_domain_rows.sort(key=lambda x: (x['domain'], -int(x['domain_specific_jobs'])))

# Write clean_golden_rows to database_empirical_skills_catalog_golden.csv & database_empirical_skills_catalog.csv
for out_path in ['database_empirical_skills_catalog_golden.csv', 'database_empirical_skills_catalog.csv']:
    with open(out_path, 'w', encoding='utf-8-sig', newline='') as f:
        fieldnames = [
            'standard_skill_name', 'domain', 'sub_category', 'skill_type',
            'unique_job_count', 'raw_occurrences', 'resolution_source',
            'confidence_score', 'variants_sample', 'sample_job_titles'
        ]
        writer = csv.DictWriter(f, fieldnames=fieldnames, delimiter=';')
        writer.writeheader()
        writer.writerows(clean_golden_rows)
    print(f"Written {len(clean_golden_rows)} rows to {out_path}.")

# Write cross_domain_rows
with open('database_empirical_skills_cross_domain.csv', 'w', encoding='utf-8-sig', newline='') as f:
    fieldnames = [
        'standard_skill_name', 'primary_domain', 'primary_sub_category', 'skill_type',
        'unique_job_count', 'secondary_domains', 'all_applicable_domains',
        'resolution_source', 'confidence_score'
    ]
    writer = csv.DictWriter(f, fieldnames=fieldnames, delimiter=';')
    writer.writeheader()
    writer.writerows(cross_domain_rows)
print(f"Written {len(cross_domain_rows)} rows to database_empirical_skills_cross_domain.csv.")

# Write by_domain_rows
with open('database_empirical_skills_by_domain.csv', 'w', encoding='utf-8-sig', newline='') as f:
    fieldnames = [
        'domain', 'standard_skill_name', 'sub_category', 'skill_type',
        'domain_specific_jobs', 'domain_percentage', 'total_market_jobs'
    ]
    writer = csv.DictWriter(f, fieldnames=fieldnames, delimiter=';')
    writer.writeheader()
    writer.writerows(by_domain_rows)
print(f"Written {len(by_domain_rows)} rows to database_empirical_skills_by_domain.csv.")

print("\n=== ALL FILES SUCCESSFULLY REGENERATED & HARMONIZED! ===")
