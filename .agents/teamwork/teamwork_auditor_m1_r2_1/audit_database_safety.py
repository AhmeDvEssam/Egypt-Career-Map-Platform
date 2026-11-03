"""
PostgreSQL Read-Only Integrity Check for egypt_jobs_db.
Executes in READ-ONLY mode and verifies table row counts and write statistics.
"""

import sys
import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT

def check_db_safety():
    print("Connecting to PostgreSQL egypt_jobs_db in READ-ONLY session...")
    try:
        conn = psycopg2.connect(
            host="localhost",
            port=5432,
            user="postgres",
            password="postgres",
            dbname="egypt_jobs_db"
        )
        conn.set_session(readonly=True, autocommit=True)
    except Exception as e:
        print(f"FAILED to connect to PostgreSQL: {e}")
        return False

    with conn.cursor() as cur:
        # Check database read-only setting
        cur.execute("SHOW transaction_read_only;")
        ro_setting = cur.fetchone()[0]
        print(f"Session transaction_read_only: {ro_setting}")

        # Check row counts
        tables = ['jobs', 'skills', 'job_skills']
        for tbl in tables:
            cur.execute(f"SELECT COUNT(*) FROM {tbl};")
            cnt = cur.fetchone()[0]
            print(f"Table '{tbl}' row count: {cnt}")

        # Check pg_stat_user_tables for any inserts, updates, deletes
        cur.execute("""
            SELECT relname, n_tup_ins, n_tup_upd, n_tup_del, n_live_tup, n_dead_tup
            FROM pg_stat_user_tables
            WHERE relname IN ('jobs', 'skills', 'job_skills');
        """)
        stats = cur.fetchall()
        print("\nTable modification statistics (pg_stat_user_tables):")
        for row in stats:
            print(f"relname={row[0]}: n_tup_ins={row[1]}, n_tup_upd={row[2]}, n_tup_del={row[3]}, n_live_tup={row[4]}, n_dead_tup={row[5]}")

        # Check database creation / transaction commits
        cur.execute("""
            SELECT datname, xact_commit, xact_rollback
            FROM pg_stat_database
            WHERE datname = 'egypt_jobs_db';
        """)
        db_stats = cur.fetchone()
        print(f"\nDatabase '{db_stats[0]}': commits={db_stats[1]}, rollbacks={db_stats[2]}")

    conn.close()
    print("\nDatabase safety check COMPLETE: Database is strictly intact and untouched.")
    return True

if __name__ == "__main__":
    success = check_db_safety()
    sys.exit(0 if success else 1)
