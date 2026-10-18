import sqlite3
import os
import uuid
import datetime
from decimal import Decimal

# Connect to the Postgres via Prisma (We'll use raw psycopg2 or Prisma Client)
# Actually, since it's Python, psycopg2 is perfect.
import psycopg2
from psycopg2.extras import execute_batch

def main():
    print("Starting data transfer from SQLite to PostgreSQL...")
    sqlite_db = os.path.join(r"d:\Hire Q Project", "Backend API & Integration", "jobs.db")
    
    if not os.path.exists(sqlite_db):
        print(f"Error: SQLite DB not found at {sqlite_db}")
        return

    # Connect to SQLite
    sqlite_conn = sqlite3.connect(sqlite_db)
    sqlite_conn.row_factory = sqlite3.Row
    sqlite_cur = sqlite_conn.cursor()

    # Connect to PostgreSQL
    try:
        pg_conn = psycopg2.connect(
            "postgresql://egypt_jobs:egypt_jobs_2026@localhost:5432/egypt_jobs_db"
        )
        pg_cur = pg_conn.cursor()
    except Exception as e:
        print(f"Error connecting to PostgreSQL: {e}")
        return

    # Clear existing data in PG
    print("Clearing existing data in PostgreSQL...")
    pg_cur.execute("TRUNCATE TABLE jobs CASCADE;")
    pg_conn.commit()

    print("Fetching records from SQLite...")
    sqlite_cur.execute("SELECT * FROM job_listings")
    rows = sqlite_cur.fetchall()
    
    if not rows:
        print("No records found in SQLite.")
        return
        
    print(f"Found {len(rows)} records. Inserting into PostgreSQL...")
    
    insert_query = """
    INSERT INTO jobs (
        id, source, source_job_id, title_raw, title_normalized,
        company_name, location_raw, job_type, work_type,
        experience_level, job_url, posted_date, scraped_at, status, salary_min, currency, updated_at
    ) VALUES (
        %s, %s, %s, %s, %s,
        %s, %s, %s, %s,
        %s, %s, %s, %s, %s, %s, %s, %s
    )
    """
    
    # Check if we have salary column and parsing logic
    # Also skills relation
    skill_insert_query = "INSERT INTO skills (id, name) VALUES (%s, %s) ON CONFLICT (name) DO NOTHING"
    job_skill_query = "INSERT INTO job_skills (job_id, skill_id) VALUES (%s, %s) ON CONFLICT DO NOTHING"
    
    batch_data = []
    
    # Store unique skills
    all_skills = set()
    job_skills_data = []
    
    for r in rows:
        job_id = str(uuid.uuid4())
        source = r["source"] if r["source"] else "Wuzzuf"
        source_job_id = f"sqlite_{r['id']}" 
        now = datetime.datetime.now()
        
        # Salary basic extract
        sal = r["salary"]
        sal_val = None
        if sal and any(char.isdigit() for char in sal):
            sal_val = Decimal(0) # simplified placeholder
        
        batch_data.append((
            job_id, source, source_job_id,
            r["title"] or "Unknown Title", r["title"],
            r["company"] or "Unknown Company", r["location"] or "Egypt",
            r["job_type"], r["work_type"], r["experience_needed"],
            r["url"] or "https://example.com", now, now, "Open",
            sal_val, "EGP", now
        ))
        
        skills_str = r["skills"]
        if skills_str:
            # skills in sqlite might be comma separated or JSON. Assuming comma separated.
            skills_list = [s.strip() for s in skills_str.split(",") if s.strip()]
            for s in skills_list:
                all_skills.add(s)
                job_skills_data.append((job_id, s))

    print(f"Inserting {len(batch_data)} jobs...")
    execute_batch(pg_cur, insert_query, batch_data)
    
    print(f"Inserting {len(all_skills)} unique skills...")
    skills_batch = [(str(uuid.uuid4()), s) for s in all_skills]
    execute_batch(pg_cur, skill_insert_query, skills_batch)
    
    print("Linking skills to jobs...")
    # Need to map skill name back to ID
    pg_cur.execute("SELECT name, id FROM skills")
    skill_map = {row[0]: row[1] for row in pg_cur.fetchall()}
    
    job_skill_batch = []
    for j_id, s_name in job_skills_data:
        if s_name in skill_map:
            job_skill_batch.append((j_id, skill_map[s_name]))
            
    execute_batch(pg_cur, job_skill_query, job_skill_batch)
    pg_conn.commit()
    
    print("Populating GovernorateMetrics from the migrated data...")
    pg_cur.execute("TRUNCATE TABLE governorate_metrics;")
    
    # Calculate basic metrics based on location
    metrics_query = """
    INSERT INTO governorate_metrics (id, governorate_name, industry, open_jobs_count, updated_at)
    SELECT gen_random_uuid(), location_raw, 'All', COUNT(*), NOW()
    FROM jobs
    GROUP BY location_raw
    """
    pg_cur.execute(metrics_query)
    pg_conn.commit()
    
    print(f"Successfully transferred {len(batch_data)} records to PostgreSQL!")
    
    pg_cur.close()
    pg_conn.close()
    sqlite_cur.close()
    sqlite_conn.close()

if __name__ == "__main__":
    main()
