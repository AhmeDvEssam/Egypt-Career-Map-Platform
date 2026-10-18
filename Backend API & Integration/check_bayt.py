from sqlalchemy import create_engine, text
from database import PG_URL
engine = create_engine(PG_URL)

with engine.connect() as conn:
    print('--- CHECKING BAYT SKILLS RAW ---')
    s_q = text("""
        SELECT j.id, jd.content
        FROM jobs j 
        JOIN job_descriptions jd ON j.id = jd.job_id 
        WHERE j.source ilike '%bayt%' AND jd.type ilike '%skill%'
        LIMIT 2
    """)
    s_res = conn.execute(s_q)
    for row in s_res:
        print(f'Job ID: {row[0]}\nBayt SKILLS chunk: {row[1][:300]}...\n---')
