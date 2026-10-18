import pandas as pd
from sqlalchemy import create_engine, text
from database import PG_URL

engine = create_engine(PG_URL)

with engine.connect() as conn:
    analyzed_jobs = conn.execute(text("SELECT COUNT(*) FROM jobs WHERE ai_analyzed = TRUE")).scalar()
    total_skills = conn.execute(text("SELECT COUNT(*) FROM skills")).scalar()
    total_links = conn.execute(text("SELECT COUNT(*) FROM job_skills")).scalar()
    
    top_skills = conn.execute(text("""
        SELECT s.name, COUNT(js.job_id) as count
        FROM skills s
        JOIN job_skills js ON s.id = js.skill_id
        GROUP BY s.name
        ORDER BY count DESC
        LIMIT 20
    """)).fetchall()
    
    weird_skills = conn.execute(text("""
        SELECT name FROM skills 
        WHERE name ILIKE '%vodafone%' 
           OR LENGTH(name) > 40
           OR name ILIKE '%bank%'
           OR name ILIKE '%company%'
           OR name ILIKE '%egypt%'
        ORDER BY RANDOM()
        LIMIT 20
    """)).fetchall()

    print(f"--- Analysis Report ---")
    print(f"Total Jobs Analyzed: {analyzed_jobs}")
    print(f"Total Unique Skills: {total_skills}")
    print(f"Total Job-Skill Links: {total_links}")
    print(f"Avg Skills per Job: {total_links/analyzed_jobs if analyzed_jobs > 0 else 0:.1f}")
    
    print("\n--- Top 20 Skills ---")
    for s in top_skills:
        print(f"- {s[0]}: {s[1]}")
        
    print("\n--- Potentially Weird Skills (Noise) ---")
    for s in weird_skills:
        print(f"- {s[0]}")
