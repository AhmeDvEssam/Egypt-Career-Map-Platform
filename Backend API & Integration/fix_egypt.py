from sqlalchemy import create_engine, text
from database import PG_URL

engine = create_engine(PG_URL)
with engine.connect() as conn:
    print('Updating Egypt to Cairo...')
    conn.execute(text("UPDATE jobs SET location_normalized = 'Cairo' WHERE location_normalized ILIKE '%egypt%'"))
    conn.commit()
    
    res = conn.execute(text("SELECT location_normalized, count(*) FROM jobs GROUP BY location_normalized ORDER BY count(*) DESC LIMIT 5")).fetchall()
    print('Top Locations after update:', res)
