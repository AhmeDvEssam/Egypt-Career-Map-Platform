import psycopg2
import os
from dotenv import load_dotenv

load_dotenv()
PG_URL = os.getenv("DATABASE_URL", "postgresql://egypt_jobs:egypt_jobs_2026@localhost:5432/egypt_jobs_db")

def run_lexical_cleanup():
    conn = psycopg2.connect(PG_URL)
    conn.autocommit = True
    cur = conn.cursor()
    
    print("[*] Finding exact alphanumeric duplicates...")
    cur.execute('''
    SELECT 
        regexp_replace(lower(name), '[^a-z0-9]', '', 'g') AS normalized_name, 
        array_agg(id::text) as ids,
        array_agg(name) as versions 
    FROM skills 
    GROUP BY normalized_name 
    HAVING COUNT(*) > 1 
    ORDER BY COUNT(*) DESC;
    ''')
    
    groups = cur.fetchall()
    print(f"[*] Found {len(groups)} groups of inconsistencies!")
    
    merged_count = 0
    for row in groups:
        normalized, ids, versions = row
        if not normalized: # Skip empty strings
            continue
            
        # Pick the first one as canonical (could be improved by length, but first is fine)
        canonical_id = ids[0]
        canonical_name = versions[0]
        
        duplicate_ids = ids[1:]
        duplicate_names = versions[1:]
        
        for dup_id, dup_name in zip(duplicate_ids, duplicate_names):
            try:
                # Update jobs
                cur.execute('''
                    INSERT INTO job_skills (job_id, skill_id)
                    SELECT job_id, %s FROM job_skills WHERE skill_id = %s
                    ON CONFLICT DO NOTHING
                ''', (canonical_id, dup_id))
                
                cur.execute('DELETE FROM job_skills WHERE skill_id = %s', (dup_id,))
                
                # Insert Alias
                cur.execute('''
                    INSERT INTO skill_aliases (skill_id, alias_name) 
                    VALUES (%s, %s) ON CONFLICT DO NOTHING
                ''', (canonical_id, dup_name))
                
                # Delete duplicate from skills
                cur.execute('DELETE FROM skills WHERE id = %s', (dup_id,))
                merged_count += 1
            except Exception as e:
                print(f"Error processing {dup_name}: {e}")
                
    print(f"[+] Successfully merged {merged_count} duplicate skills across {len(groups)} groups!")
    
    cur.execute('SELECT COUNT(*) FROM skills')
    final_count = cur.fetchone()[0]
    print(f"[+] Final Canonical Skills Count: {final_count}")

if __name__ == "__main__":
    run_lexical_cleanup()
