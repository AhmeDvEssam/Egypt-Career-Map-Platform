from sqlalchemy import create_engine, text
from database import PG_URL
engine = create_engine(PG_URL)

with engine.begin() as conn:
    print('--- DELETING INDEED JOBS ---')
    res = conn.execute(text("DELETE FROM jobs WHERE source ilike '%indeed%'"))
    print(f'Deleted {res.rowcount} Indeed jobs.')

    print('\n--- INSPECTING NEW WUZZUF DATA ---')
    w_q = text("""
        SELECT j.id, jd.type, jd.content 
        FROM jobs j 
        JOIN job_descriptions jd ON j.id = jd.job_id 
        WHERE j.source ilike '%wuzzuf%' 
        LIMIT 5
    """)
    res = conn.execute(w_q)
    for row in res:
        print(f'Job ID: {row[0]}, Chunk Type: {row[1]}, Chunk Length: {len(row[2])}')
        
    print('\n--- CHECKING WUZZUF SKILLS RAW ---')
    s_q = text("""
        SELECT j.id, jd.content
        FROM jobs j 
        JOIN job_descriptions jd ON j.id = jd.job_id 
        WHERE j.source ilike '%wuzzuf%' AND jd.type ilike '%skill%'
        LIMIT 3
    """)
    s_res = conn.execute(s_q)
    for row in s_res:
        print(f'Job ID: {row[0]}\nSkills Text: {row[1]}\n---')
