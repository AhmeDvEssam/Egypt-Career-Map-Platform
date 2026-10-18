from sqlalchemy import create_engine, text
from database import PG_URL

engine = create_engine(PG_URL)
with engine.connect() as conn:
    print('Updating locations...')
    
    # Cairo
    conn.execute(text("UPDATE jobs SET location_normalized = 'Cairo' WHERE location_raw ILIKE '%cairo%' OR location_normalized ILIKE '%cairo%'"))
    
    # Giza & 6th of October
    conn.execute(text("UPDATE jobs SET location_normalized = 'Giza' WHERE location_raw ILIKE '%giza%' OR location_normalized ILIKE '%giza%' OR location_raw ILIKE '%6th of october%'"))
    
    # Alexandria
    conn.execute(text("UPDATE jobs SET location_normalized = 'Alexandria' WHERE location_raw ILIKE '%alex%' OR location_normalized ILIKE '%alex%'"))
    
    # Remote
    conn.execute(text("UPDATE jobs SET location_normalized = 'Remote' WHERE location_raw ILIKE '%remote%' OR location_normalized ILIKE '%remote%'"))
    
    # Mansoura & Dakahlia
    conn.execute(text("UPDATE jobs SET location_normalized = 'Dakahlia' WHERE location_raw ILIKE '%mansoura%' OR location_raw ILIKE '%dakahlia%'"))
    
    # Fallback to Remote if it contains Anywhere
    conn.execute(text("UPDATE jobs SET location_normalized = 'Remote' WHERE location_raw ILIKE '%anywhere%'"))
    
    # Normalize empty location_normalized
    conn.execute(text("UPDATE jobs SET location_normalized = 'Egypt' WHERE location_normalized IS NULL"))
    
    print('Updating titles...')
    conn.execute(text("UPDATE jobs SET title_normalized = title_raw WHERE title_normalized IS NULL"))
    
    conn.commit()
    
    res = conn.execute(text("SELECT location_normalized, count(*) FROM jobs GROUP BY location_normalized ORDER BY count(*) DESC LIMIT 5")).fetchall()
    print("Top Locations:", res)
    print('DB Transformations Complete.')
