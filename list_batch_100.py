import csv

with open('skills.csv', 'r', encoding='utf-8') as f:
    reader = csv.DictReader(f)
    batch = [next(reader) for _ in range(100)]

for idx, r in enumerate(batch, 1):
    print(f"{idx:03d}. {r['name']} | Dom: {r['domain']} | Sub: {r['sub_category']}")
