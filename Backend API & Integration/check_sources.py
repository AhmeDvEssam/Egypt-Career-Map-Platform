from sqlalchemy import create_engine, text
from database import PG_URL
engine = create_engine(PG_URL)
with engine.connect() as conn:
    print('--- SOURCES ---')
    res = conn.execute(text("SELECT source, count(*) FROM jobs GROUP BY source;"))
    for row in res: print(row)
    
    print('\n--- SAMPLE WUZZUF JOB ---')
    res = conn.execute(text("SELECT id, source_raw FROM jobs WHERE source ilike '%wuzzuf%' LIMIT 1;"))
    w_id = None
    for row in res:
        w_id = row[0]
        print('Source Raw keys:', row[1].keys() if row[1] else 'None')
    if w_id:
        res2 = conn.execute(text(f"SELECT type, length(content) FROM job_descriptions WHERE job_id = '{w_id}';"))
        for row in res2: print(f'Type: {row[0]}, length: {row[1]}')
        
    print('\n--- SAMPLE LINKEDIN JOB ---')
    res = conn.execute(text("SELECT id FROM jobs WHERE source ilike '%linkedin%' LIMIT 1;"))
    l_id = None
    for row in res: l_id = row[0]
    if l_id:
        res2 = conn.execute(text(f"SELECT type, length(content) FROM job_descriptions WHERE job_id = '{l_id}';"))
        for row in res2: print(f'Type: {row[0]}, length: {row[1]}')
