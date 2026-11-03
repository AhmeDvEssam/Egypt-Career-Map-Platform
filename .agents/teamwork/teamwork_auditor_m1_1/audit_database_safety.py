import psycopg2

try:
    conn = psycopg2.connect(
        dbname="egypt_jobs_db",
        user="postgres",
        password="postgres",
        host="localhost",
        port=5432,
    )
    conn.set_session(readonly=True)
    cur = conn.cursor()

    # Check table row counts
    cur.execute("SELECT count(*) FROM jobs;")
    jobs_count = cur.fetchone()[0]

    cur.execute("SELECT count(*) FROM skills;")
    skills_count = cur.fetchone()[0]

    cur.execute("SELECT count(*) FROM job_skills;")
    job_skills_count = cur.fetchone()[0]

    print(f"Database row counts: jobs={jobs_count}, skills={skills_count}, job_skills={job_skills_count}")

    # Check pg_stat_user_tables for any inserts, updates, deletes
    cur.execute("""
        SELECT relname, n_tup_ins, n_tup_upd, n_tup_del
        FROM pg_stat_user_tables
        WHERE relname IN ('jobs', 'skills', 'job_skills');
    """)
    table_stats = cur.fetchall()
    print("pg_stat_user_tables:")
    for row in table_stats:
        print(f"  table={row[0]}: inserted={row[1]}, updated={row[2]}, deleted={row[3]}")

    cur.close()
    conn.close()
    print("PostgreSQL read-only audit completed successfully.")
except Exception as e:
    print(f"PostgreSQL audit error: {e}")
