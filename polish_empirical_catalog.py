import csv
import pandas as pd

CANONICAL_DOMAINS = [
    'Software Engineering & IT',
    'Data Science & Analytics',
    'Business & Finance',
    'Marketing & Sales',
    'Engineering & Construction',
    'Human Resources',
    'Supply Chain & Logistics',
    'Operations & Project Management',
    'Vocational Trades, Driving & Field Services',
    'Healthcare & Medical Sciences',
    'Hospitality, Tourism & Food Services',
    'Manufacturing & Industrial Production',
    'Education, Teaching & Training',
    'Legal, Regulatory & Government Relations'
]

DOMAIN_MAP = {
    'Language': 'Operations & Project Management',
    'Supply Chain & Operations': 'Supply Chain & Logistics',
    'Vocational trades, Driving & Field Services': 'Vocational Trades, Driving & Field Services',
    'Business & Sales': 'Marketing & Sales',
    'Education': 'Education, Teaching & Training'
}

df = pd.read_csv('database_empirical_skills_catalog.csv', delimiter=';')
print(f"Initial shape: {df.shape}")

# 1. Map domain variants
for orig, target in DOMAIN_MAP.items():
    df.loc[df['domain'] == orig, 'domain'] = target

# 2. Fill any NaN or 'None' domains
null_mask = df['domain'].isna() | df['domain'].isin(['None', 'null', 'nan', ''])
df.loc[null_mask, 'domain'] = 'Operations & Project Management'
df.loc[null_mask, 'sub_category'] = 'Cross-Functional & Office Management'

# 3. Fix Presentation Software
df.loc[df['standard_skill_name'].str.contains('Presentation Software', case=False, na=False), 'skill_type'] = 'Tool / Software'

# Check final domain distribution
print("\nFinal clean 14 canonical domains:")
print(df['domain'].value_counts())
assert set(df['domain'].unique()).issubset(set(CANONICAL_DOMAINS)), "Some domains are not in CANONICAL_DOMAINS!"

# Save back to CSV
df.to_csv('database_empirical_skills_catalog.csv', sep=';', index=False, encoding='utf-8-sig')
print("\n[+] Successfully saved pristine database_empirical_skills_catalog.csv!")
