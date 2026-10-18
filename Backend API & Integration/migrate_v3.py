from sqlalchemy import text
from database import engine

def add_new_ai_columns():
    """Adds AI-specific columns to jobs and job_skills tables."""
    print("--- Adding AI columns to 'jobs' table ---")
    jobs_columns = [
        ("has_explicit_skills", "BOOLEAN DEFAULT FALSE"),
        ("ai_analyzed", "BOOLEAN DEFAULT FALSE")
    ]
    
    with engine.begin() as conn:
        for col_name, col_type in jobs_columns:
            try:
                conn.execute(text(f"ALTER TABLE jobs ADD COLUMN {col_name} {col_type}"))
                print(f"[+] Added column '{col_name}' to jobs")
            except Exception as e:
                print(f"[-] Column '{col_name}' likely already exists.")
                
    print("\n--- Adding AI columns to 'job_skills' table ---")
    job_skills_columns = [
        ("skill_level", "VARCHAR"),
        ("confidence", "FLOAT DEFAULT 1.0"),
        ("source_job_id", "VARCHAR"),
        ("raw_skill_text", "TEXT")
    ]
    
    with engine.begin() as conn:
        for col_name, col_type in job_skills_columns:
            try:
                conn.execute(text(f"ALTER TABLE job_skills ADD COLUMN {col_name} {col_type}"))
                print(f"[+] Added column '{col_name}' to job_skills")
            except Exception as e:
                print(f"[-] Column '{col_name}' likely already exists.")

if __name__ == "__main__":
    add_new_ai_columns()
    print("\n[+] Schema Migration Complete!")
