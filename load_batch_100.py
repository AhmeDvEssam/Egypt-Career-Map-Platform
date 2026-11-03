import csv
import psycopg2

conn = psycopg2.connect(dbname='egypt_jobs_db', user='postgres', password='postgres', host='localhost', port=5432)
cur = conn.cursor()

# Pre-fetch job counts and mode levels from job_skills
cur.execute("""
    SELECT skill_id, COUNT(*) as job_count, 
           mode() WITHIN GROUP (ORDER BY skill_level) as db_level
    FROM job_skills
    GROUP BY skill_id;
""")
db_stats = {row[0]: (row[1], row[2]) for row in cur.fetchall()}
conn.close()

with open('skills.csv', 'r', encoding='utf-8') as f:
    reader = csv.DictReader(f)
    batch = [next(reader) for _ in range(100)]

print(f"Loaded 100 skills from skills.csv.")
for idx, r in enumerate(batch, 1):
    sid = r['id']
    count, lvl = db_stats.get(sid, (0, 'Not Specified'))
    r['job_count'] = count
    r['db_level'] = lvl

print("Batch 1 (1 to 100) sample with DB stats:")
for r in batch[:10]:
    print(f"{r['name']} | Old: {r['domain']} -> {r['sub_category']} | Jobs: {r['job_count']} | DB Level: {r['db_level']}")
