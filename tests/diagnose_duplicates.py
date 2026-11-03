import pandas as pd

df = pd.read_csv('standard_skills_catalog.csv', sep=';', encoding='utf-8-sig')
print('Total rows:', len(df))
print('Columns:', df.columns.tolist())
dups = df[df.duplicated(subset=['standard_skill_name'], keep=False)]
unique_dup_names = dups['standard_skill_name'].unique()
print('Number of unique duplicate skill names:', len(unique_dup_names))
print('Total duplicate rows:', len(dups))

for s in ['Python', 'SQL', 'Microsoft Excel', 'Excel', 'Git', 'Jira']:
    sub = df[df['standard_skill_name'].str.lower() == s.lower()]
    print(f'=== Skill: {s} (found {len(sub)} rows) ===')
    for idx, r in sub.iterrows():
        print(f'  Row {idx}: domain="{r["domain"]}", sub="{r["sub_category"]}", type="{r["skill_type"]}", priority="{r.get("skill_priority", "")}"')
