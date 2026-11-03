import csv
import json
import re
from collections import Counter

# Load T10 and T5
def load_catalog(path):
    skills = {}
    with open(path, 'r', encoding='utf-8-sig') as f:
        reader = csv.DictReader(f, delimiter=';')
        for r in reader:
            skills[r['standard_skill_name'].lower().strip()] = r
    return skills

t10 = load_catalog('database_empirical_skills_catalog_t10.csv')
t5 = load_catalog('database_empirical_skills_catalog_t5.csv')
delta = {k: v for k, v in t5.items() if k not in t10}

t10_names = list(t10.keys())

# Metrics
acronym_variants = []
partial_overlaps = []
bare_abbreviations = []
vague_process_traits = []
niche_valid_skills = []

# Regex for bare abbreviations (2-4 uppercase letters, no space)
abbrev_rx = re.compile(r'^[A-Z0-9]{2,4}$')
vague_rx = re.compile(r'(?i)\b(guideline|procedure|task|duty|routine|following|passion|ethics|trait|basic|general|apparel)\b')

for k, r in delta.items():
    name = r['standard_skill_name']
    lower = name.lower()
    
    # 1. Bare abbreviation
    if abbrev_rx.match(name):
        bare_abbreviations.append(name)
        continue
        
    # 2. Check if acronym variant of a T10 skill (e.g. 'X (Y)' vs 'X' or 'X' vs 'X (Y)')
    # Strip parens from both and compare
    name_no_parens = re.sub(r'\(.*?\)', '', lower).strip()
    is_acronym_variant = False
    for t_name in t10_names:
        t_no_parens = re.sub(r'\(.*?\)', '', t_name).strip()
        if name_no_parens == t_no_parens and lower != t_name:
            acronym_variants.append((name, t10[t_name]['standard_skill_name']))
            is_acronym_variant = True
            break
        elif (name_no_parens in t_no_parens or t_no_parens in name_no_parens) and len(name_no_parens) > 5 and len(t_no_parens) > 5:
            # Sub-variant
            if abs(len(name_no_parens) - len(t_no_parens)) <= 8:
                partial_overlaps.append((name, t10[t_name]['standard_skill_name']))
                is_acronym_variant = True
                break
    if is_acronym_variant:
        continue
        
    # 3. Vague process or trait
    if vague_rx.search(lower) and len(name.split()) <= 2:
        vague_process_traits.append(name)
        continue
        
    # 4. Otherwise genuine niche skill
    niche_valid_skills.append(name)

print(f"Total Delta Skills: {len(delta)}")
print(f"1. Direct Acronym / Parenthesis Variants of T10: {len(acronym_variants)}")
print(f"2. Sub-variants / Close Formulation Overlaps with T10: {len(partial_overlaps)}")
print(f"3. Bare Abbreviations (2-4 chars without expansion): {len(bare_abbreviations)}")
print(f"4. Vague Process Fragments & Traits: {len(vague_process_traits)}")
print(f"5. Genuine Niche & Specialized Skills: {len(niche_valid_skills)}")
print(f"Sum check: {len(acronym_variants) + len(partial_overlaps) + len(bare_abbreviations) + len(vague_process_traits) + len(niche_valid_skills)}")

print("\n--- Samples of Acronym Variants ---")
for d, t in acronym_variants[:10]:
    print(f"  Delta: '{d}'  <--->  T10: '{t}'")

print("\n--- Samples of Bare Abbreviations ---")
print(", ".join(bare_abbreviations[:20]))

print("\n--- Samples of Vague Process / Trait Fragments ---")
print(", ".join(vague_process_traits[:20]))

print("\n--- Samples of Genuine Niche Skills ---")
print(", ".join(niche_valid_skills[:20]))
