import pandas as pd
import re
from collections import defaultdict

df = pd.read_csv('database_empirical_skills_catalog_new.csv', sep=';', encoding='utf-8-sig')
total_rows = len(df)

# ==============================================================================
# 1. Broken Parentheses Fragments (Splitting inside parentheses)
# ==============================================================================
def is_broken_parens(name):
    # unbalanced parens
    if name.count('(') != name.count(')'): return True
    # starts or ends with paren
    if name.startswith(')') or name.endswith('('): return True
    return False

broken_parens_rows = df[df['standard_skill_name'].apply(is_broken_parens)]

# Leading conjunctions
leading_conj_rows = df[df['standard_skill_name'].str.contains(r'^\s*(and|or|with|of|in|to|for)\b', case=False, regex=True)]

# Trailing conjunctions/prepositions/punctuation
trailing_junk_rows = df[df['standard_skill_name'].str.contains(r'[\(\[\{/\\,\-]\s*$|\b(and|or|with|of|in|to|for)\s*$', case=False, regex=True)]

all_fragments = pd.concat([broken_parens_rows, leading_conj_rows, trailing_junk_rows]).drop_duplicates()

# ==============================================================================
# 2. Formatting / Punctuation Duplicates
# ==============================================================================
fmt_map = defaultdict(list)
for idx, r in df.iterrows():
    name = r['standard_skill_name']
    norm = re.sub(r'[\W_]+', ' ', name).strip().lower()
    fmt_map[norm].append(name)

fmt_dups = {k: v for k, v in fmt_map.items() if len(v) > 1 and len(set(v)) > 1}

# ==============================================================================
# 3. Singular vs Plural Duplicates
# ==============================================================================
def stem_word(w):
    w = w.lower()
    if w.endswith('ies'): return w[:-3] + 'y'
    if w.endswith('es') and not w.endswith('tes'): return w[:-2]
    if w.endswith('s') and not w.endswith('ss'): return w[:-1]
    return w

def stem_phrase(phrase):
    clean = re.sub(r'[\W_]+', ' ', phrase).strip().lower()
    return " ".join(stem_word(w) for w in clean.split())

stem_map = defaultdict(list)
for idx, r in df.iterrows():
    name = r['standard_skill_name']
    s_key = stem_phrase(name)
    stem_map[s_key].append(name)

stem_dups = {k: v for k, v in stem_map.items() if len(v) > 1 and len(set(re.sub(r'[\W_]+', ' ', x).lower() for x in v)) > 1}

# ==============================================================================
# 4. Qualifier Suffix / Prefix Duplicates ('Skills', 'Experience', 'Knowledge')
# ==============================================================================
def strip_qualifiers(name):
    clean = re.sub(r'\b(skills?|experience|knowledge|ability|expert|competency|proficient)\b', '', name, flags=re.IGNORECASE)
    return re.sub(r'[\W_]+', ' ', clean).strip().lower()

qual_map = defaultdict(list)
for idx, r in df.iterrows():
    name = r['standard_skill_name']
    q_key = strip_qualifiers(name)
    if q_key:
        qual_map[q_key].append(name)

qual_dups = {k: v for k, v in qual_map.items() if len(v) > 1 and len(set(strip_qualifiers(x) for x in v)) == 1 and len(set(x.lower() for x in v)) > 1}

# ==============================================================================
# 5. Core Skill Over-Specification & Sub-Variants (Root Family Clusters)
# ==============================================================================
# Identify major root skills that have 3+ variations in the catalog
roots = [
    'excel', 'autocad', 'python', 'sales', 'marketing', 'accounting', 
    'communication', 'management', 'recruitment', 'procurement', 'design', 
    'quality', 'audit', 'nurse', 'engineering', 'logistics', 'finance', 
    'tax', 'sql', 'crm', 'erp', 'hr', 'data', 'cloud', 'security'
]

family_counts = {}
for root in roots:
    matches = df[df['standard_skill_name'].str.contains(r'\b' + root + r'\b', case=False, na=False)]['standard_skill_name'].tolist()
    family_counts[root] = len(matches)

# Print Summary Report
print("="*80)
print("COMPREHENSIVE DUPLICATE & FRAGMENT AUDIT REPORT")
print(f"Total rows in catalog: {total_rows}")
print("="*80)
print(f"1. Mutilated Fragments (Hanging parens / leading 'And' / broken phrases): {len(all_fragments)} skills")
print(f"2. Punctuation & Formatting Duplicates (hyphens, underscores): {len(fmt_dups)} clusters ({sum(len(v) for v in fmt_dups.values())} skills)")
print(f"3. Singular vs. Plural Duplicates: {len(stem_dups)} clusters ({sum(len(v) for v in stem_dups.values())} skills)")
print(f"4. Suffix Qualifier Duplicates ('Skills', 'Experience', 'Knowledge'): {len(qual_dups)} clusters ({sum(len(v) for v in qual_dups.values())} skills)")

print("\n--- Top Root Skill Family Explosions (Sub-variants that should be consolidated) ---")
for r, cnt in sorted(family_counts.items(), key=lambda x: x[1], reverse=True)[:15]:
    print(f" - Root '{r}': {cnt} separate skill entries in catalog!")
