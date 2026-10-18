import csv
import re
import psycopg2
from datetime import datetime

conn = psycopg2.connect(
    host='localhost', dbname='egypt_jobs_db',
    user='egypt_jobs', password='egypt_jobs_2026', port=5432
)
cur = conn.cursor()

def parse_date(raw):
    if not raw or not raw.strip():
        return None
    s = raw.strip()
    
    # Format: DD-MM-YYYY (e.g. 28-08-2026)
    m = re.match(r'^(\d{1,2})-(\d{1,2})-(\d{4})$', s)
    if m:
        day, month, year = m.groups()
        return f"{year}-{month.zfill(2)}-{day.zfill(2)}"
    
    # Format: D/M/YYYY (e.g. 9/9/2026)
    m = re.match(r'^(\d{1,2})/(\d{1,2})/(\d{4})$', s)
    if m:
        day, month, year = m.groups()
        return f"{year}-{month.zfill(2)}-{day.zfill(2)}"
    
    return None

with open('data/bayt_clean_data_v3.csv', encoding='utf-8-sig', newline='') as f:
    reader = csv.DictReader(f)
    rows = list(reader)

print(f"Read {len(rows)} rows from CSV")

updated = 0
skipped = 0
not_found = 0

for row in rows:
    url = (row.get('Job URL') or '').strip()
    posted_raw = (row.get('Posted Time') or '').strip()

    if not url or not posted_raw:
        skipped += 1
        continue

    parsed_date = parse_date(posted_raw)
    if not parsed_date:
        print(f"  ⚠️  Could not parse date: '{posted_raw}' for {url[:60]}")
        skipped += 1
        continue

    cur.execute(
        "UPDATE jobs SET posted_date = %s, updated_at = NOW() WHERE job_url = %s AND posted_date IS NULL",
        (parsed_date, url)
    )
    if cur.rowcount > 0:
        updated += 1
    else:
        cur.execute("SELECT id FROM jobs WHERE job_url = %s", (url,))
        if cur.fetchone() is None:
            not_found += 1
        else:
            skipped += 1  # Already has a date

conn.commit()

print(f"\n[DONE]")
print(f"   Updated (NULL -> date): {updated}")
print(f"   Skipped (already had date or bad format): {skipped}")
print(f"   Not found in DB: {not_found}")

cur.execute("SELECT COUNT(*) FROM jobs WHERE source = 'Bayt' AND posted_date IS NULL")
remaining = cur.fetchone()[0]
print(f"\n   Remaining NULL posted_date for Bayt: {remaining}")

cur.close()
conn.close()
