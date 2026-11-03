import csv
with open('standard_skills_catalog.csv', 'r', encoding='utf-8-sig') as f:
    r = csv.reader(f)
    print(next(r))
