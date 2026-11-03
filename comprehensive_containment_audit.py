import csv
import json
import re
from collections import defaultdict, Counter

def load_catalog(path):
    skills = []
    with open(path, 'r', encoding='utf-8-sig') as f:
        reader = csv.DictReader(f, delimiter=';')
        for r in reader:
            skills.append({
                'name': r['standard_skill_name'].strip(),
                'domain': r['domain'].strip(),
                'sub_category': r['sub_category'].strip(),
                'skill_type': r['skill_type'].strip(),
                'jobs': int(r['unique_job_count']),
                'variants': r.get('variants_sample', '')
            })
    return skills

t10_skills = load_catalog('database_empirical_skills_catalog_t10.csv')
t5_skills = load_catalog('database_empirical_skills_catalog_t5.csv')

print(f"Loaded T10: {len(t10_skills)} skills")
print(f"Loaded T5:  {len(t5_skills)} skills")

# Common fluff words that often indicate redundant over-specification rather than a new skill
FLUFF_SUFFIXES = {
    'management', 'processes', 'process', 'frameworks', 'framework',
    'procedures', 'procedure', 'operations', 'operation', 'practices',
    'practice', 'implementation', 'strategy', 'strategies', 'administration',
    'services', 'service', 'tools', 'tool', 'system', 'systems', 'design',
    'activities', 'activity', 'methodologies', 'methodology', 'techniques',
    'technique', 'skills', 'skill', 'development', 'analysis'
}

def analyze_containment(skills_list, catalog_name):
    print(f"\n=======================================================")
    print(f"Analyzing Phrase Containment (SQL-LIKE) for {catalog_name}")
    print(f"=======================================================")
    
    # Map lowercase to full skill info
    name_to_info = {s['name'].lower(): s for s in skills_list}
    all_names = [s['name'] for s in skills_list]
    
    # Containment dictionary: base_skill -> list of skills containing it
    contained_in = defaultdict(list)
    
    # We examine base skills with length >= 4 to avoid trivial substrings
    for s in skills_list:
        base = s['name'].strip()
        if len(base) < 4:
            continue
        
        # Word-boundary regex matching SQL LIKE '% base %'
        pattern = re.compile(r'\b' + re.escape(base) + r'\b', re.IGNORECASE)
        
        for other in skills_list:
            other_name = other['name'].strip()
            if base.lower() == other_name.lower():
                continue
            if pattern.search(other_name):
                contained_in[base].append(other)
                
    # Sort base skills by number of containing skills descending
    top_bases = sorted(contained_in.items(), key=lambda x: len(x[1]), reverse=True)
    
    print(f"Total base skills that appear inside other skills: {len(top_bases)}")
    print(f"Top 20 most frequent base skills contained in other skills:")
    
    cluster_report = []
    
    for base, containers in top_bases[:30]:
        base_info = name_to_info[base.lower()]
        
        # Breakdown containers into: Justified vs Unjustified vs Corrupted
        justified = []
        unjustified = []
        corrupted = []
        
        base_words = set(base.lower().split())
        
        for c in containers:
            c_name = c['name']
            c_lower = c_name.lower()
            c_words = set(c_lower.split())
            diff_words = c_words - base_words
            
            # Check corrupted (e.g. starts with 'and ')
            if c_lower.startswith('and ') or c_lower.startswith('& ') or c_lower.startswith('or '):
                corrupted.append(c)
            # Check if difference is purely fluff
            elif diff_words.issubset(FLUFF_SUFFIXES):
                unjustified.append(c)
            else:
                justified.append(c)
                
        cluster_report.append({
            'base_skill': base,
            'base_jobs': base_info['jobs'],
            'base_domain': base_info['domain'],
            'base_subcat': base_info['sub_category'],
            'total_occurrences_in_catalog': len(containers) + 1,
            'container_count': len(containers),
            'justified_count': len(justified),
            'unjustified_count': len(unjustified),
            'corrupted_count': len(corrupted),
            'justified_samples': [f"{x['name']} ({x['jobs']})" for x in justified[:5]],
            'unjustified_samples': [f"{x['name']} ({x['jobs']})" for x in unjustified[:5]],
            'corrupted_samples': [f"{x['name']} ({x['jobs']})" for x in corrupted[:5]],
        })
        
    return cluster_report

t10_report = analyze_containment(t10_skills, "Threshold 10 (T10)")
t5_report = analyze_containment(t5_skills, "Threshold 5 (T5)")

with open("containment_analysis_report.json", "w", encoding="utf-8") as f:
    json.dump({'T10': t10_report, 'T5': t5_report}, f, indent=2, ensure_ascii=False)

print("\nSaved full containment report to containment_analysis_report.json")
