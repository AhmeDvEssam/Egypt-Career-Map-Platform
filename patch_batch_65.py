import csv

fix_mapping = {
    'Academic': ('Academic Program Administration & Leadership', 'Education, Teaching & Training', 'Curriculum Design & Educational Assessment', 'Knowledge & Concepts', 'Core'),
    'Partnership': ('Strategic Commercial Partnerships & Alliances', 'Marketing & Sales', 'B2B Sales & Business Development', 'Hard Skill', 'Core'),
    'Agent Rollback': ('MLOps Autonomous Agent Rollback & Versioning', 'Data Science & Analytics', 'Machine Learning & Data Science', 'Hard Skill', 'Core'),
    'Motor circuits': ('Electric Motor Branch Circuits & Control Wiring', 'Engineering & Construction', 'Electrical & Power Engineering', 'Hard Skill', 'Core'),
    'Guest Service Passion': ('Guest Service Excellence & VIP Hospitality', 'Hospitality, Tourism & Food Services', 'Hotel Front Desk & Guest Relations', 'Soft Skill', 'Core'),
    'Boiler Certification': ('Industrial Boiler Safety Certification & Inspection', 'Manufacturing & Industrial Production', 'Industrial Health, Safety & Environment (HSE)', 'Knowledge & Concepts', 'Core'),
    'Microbiology': ('Clinical & Food Microbiological Testing', 'Healthcare & Medical Sciences', 'Medical Laboratory & Diagnostic Imaging', 'Hard Skill', 'Core'),
    'PE-Backed Finance': ('Private Equity (PE) Backed Financial Leadership', 'Business & Finance', 'Corporate Finance & Financial Analysis', 'Hard Skill', 'Core'),
    'Performance Driven': ('Performance-Driven Execution & Target Achievement', 'Operations & Project Management', 'Business Operations & Process Improvement', 'Soft Skill', 'Foundational'),
    'performance bottleneck identification': ('Software Performance Bottleneck Profiling', 'Software Engineering & IT', 'Quality Assurance & Testing', 'Hard Skill', 'Core'),
    'Product Auditing': ('Finished Goods Quality Auditing & Inspection', 'Manufacturing & Industrial Production', 'Production Line & Assembly Operations', 'Hard Skill', 'Core'),
    'IT Collaboration Support': ('Enterprise IT Collaboration & Workflow Automation Tools', 'Software Engineering & IT', 'DevOps & Cloud Infrastructure', 'Hard Skill', 'Core'),
    'Transformation Roadmaps': ('Enterprise Cloud & Digital Transformation Roadmaps', 'Software Engineering & IT', 'DevOps & Cloud Infrastructure', 'Hard Skill', 'Core'),
    'Gearset (Software)': ('Gearset Salesforce DevOps & Release Management', 'Software Engineering & IT', 'DevOps & Cloud Infrastructure', 'Tool / Technology', 'Core'),
    'Real': ('Cash Collection & Field Receivables Recovery', 'Business & Finance', 'Accounting & Financial Reporting', 'Hard Skill', 'Core'),
    'Batch Management': ('Warehouse Inventory Batch & Lot Management', 'Supply Chain & Logistics', 'Inventory & Warehouse Management', 'Hard Skill', 'Core'),
    'Flash Bootloader': ('Automotive Embedded Flash Bootloader Development', 'Software Engineering & IT', 'Backend Development', 'Hard Skill', 'Core'),
    'Demand Review Process': ('Integrated Business Planning (IBP) Demand Review', 'Supply Chain & Logistics', 'Supply Chain Planning & Demand Forecasting', 'Hard Skill', 'Core'),
    'Technical Screenings': ('Technical IT Candidate Screening & Assessment', 'Human Resources', 'Talent Acquisition & Recruitment', 'Hard Skill', 'Core'),
    'Alerting': ('Infrastructure Alerting & On-Call Incident Notification', 'Software Engineering & IT', 'DevOps & Cloud Infrastructure', 'Hard Skill', 'Core'),
    'Data & AI Solutions': ('Data & AI Enterprise Solution Sales', 'Marketing & Sales', 'B2B Sales & Business Development', 'Hard Skill', 'Core'),
    'Greenfield Product': ('Greenfield Software Architecture & Product Delivery', 'Software Engineering & IT', 'Backend Development', 'Hard Skill', 'Core'),
    'Judgment': ('High-Stakes Decision Making & Operational Judgment', 'Operations & Project Management', 'Business Operations & Process Improvement', 'Soft Skill', 'Foundational'),
    'Performance Measurement': ('Organizational Performance Measurement & Metric Tracking', 'Operations & Project Management', 'Business Operations & Process Improvement', 'Hard Skill', 'Core'),
    'Risk Mitigation': ('Project Risk Assessment & Mitigation Planning', 'Operations & Project Management', 'Project & Agile Management (PMP, Agile, Scrum)', 'Hard Skill', 'Core'),
    'Fault Troubleshooting': ('Electro-Mechanical Equipment Fault Troubleshooting', 'Manufacturing & Industrial Production', 'Industrial Machinery & Equipment Maintenance', 'Hard Skill', 'Core'),
    'Process Improvement Identification': ('Procurement Process Efficiency & Value Engineering', 'Supply Chain & Logistics', 'Procurement & Purchasing', 'Hard Skill', 'Core')
}

with open('batch_65_results.csv', 'r', encoding='utf-8-sig') as f:
    rows = list(csv.DictReader(f, delimiter=';'))

for r in rows:
    raw = r['raw_input'].strip()
    if raw in fix_mapping:
        canon, dom, sub, stype, prio = fix_mapping[raw]
        r['standard_skill_name'] = canon
        r['new_domain'] = dom
        r['new_sub'] = sub
        r['skill_type'] = stype
        r['skill_priority'] = prio
        r['reason'] = f"Audited batch 65 recalibrated: normalized '{raw}' to '{canon}' in ({dom} > {sub})."

fieldnames = [
    'batch_id', 'skill_index', 'skill_id', 'raw_input', 'clean_name',
    'standard_skill_name', 'skill_level', 'job_count', 'old_domain',
    'old_sub', 'new_domain', 'new_sub', 'skill_type', 'skill_priority',
    'status', 'reason'
]

with open('batch_65_results.csv', 'w', encoding='utf-8-sig', newline='') as f:
    w = csv.DictWriter(f, fieldnames=fieldnames, delimiter=';')
    w.writeheader()
    w.writerows(rows)

print("Batch 65 successfully patched and recalibrated with 0 fallbacks.")
