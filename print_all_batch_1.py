import csv

with open('batch_1_results.csv', 'r', encoding='utf-8-sig') as f:
    rows = list(csv.DictReader(f, delimiter=';'))

for idx, r in enumerate(rows, 1):
    print(f"{idx:03d}. [{r['raw_input']}] -> Clean: '{r['clean_name']}' | Level: {r['skill_level']} | Jobs: {r['job_count']}")
    print(f"     Dom: {r['new_domain']} -> Sub: {r['new_sub']} | Type: {r['skill_type']} | Prio: {r['skill_priority']}")
