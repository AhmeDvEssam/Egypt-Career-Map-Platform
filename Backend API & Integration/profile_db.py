from sqlalchemy import create_engine, text
from database import PG_URL
engine = create_engine(PG_URL)

with engine.connect() as conn:
    sources = ['LinkedIn', 'Forasna', 'Bayt']
    
    for src in sources:
        print(f'\\n--- Profiling {src} ---')
        # Total jobs for this source
        total_q = text(f"SELECT count(id) FROM jobs WHERE source ilike '%{src}%'")
        total = conn.execute(total_q).scalar() or 0
        print(f'Total Jobs: {total}')
        
        if total == 0: continue
        
        # Jobs with a SKILLS chunk/field
        skills_q = text(f"SELECT count(DISTINCT j.id) FROM jobs j JOIN job_descriptions jd ON j.id = jd.job_id WHERE j.source ilike '%{src}%' AND jd.type ilike '%skill%'")
        skills_count = conn.execute(skills_q).scalar() or 0
        
        # Jobs with a REQUIREMENTS chunk/field
        req_q = text(f"SELECT count(DISTINCT j.id) FROM jobs j JOIN job_descriptions jd ON j.id = jd.job_id WHERE j.source ilike '%{src}%' AND jd.type ilike '%requirement%'")
        req_count = conn.execute(req_q).scalar() or 0
        
        # Jobs with a DESCRIPTION chunk
        desc_q = text(f"SELECT count(DISTINCT j.id) FROM jobs j JOIN job_descriptions jd ON j.id = jd.job_id WHERE j.source ilike '%{src}%' AND jd.type ilike '%description%'")
        desc_count = conn.execute(desc_q).scalar() or 0
        
        print(f'Has SKILLS: {skills_count} ({(skills_count/total)*100:.1f}%)')
        print(f'Has REQUIREMENTS: {req_count} ({(req_count/total)*100:.1f}%)')
        print(f'Has DESCRIPTION: {desc_count} ({(desc_count/total)*100:.1f}%)')
