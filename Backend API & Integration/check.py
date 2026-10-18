from sqlalchemy import create_engine, text
from database import PG_URL
engine = create_engine(PG_URL)
with engine.connect() as conn:
    res = conn.execute(text("SELECT conname, pg_get_constraintdef(c.oid) FROM pg_constraint c JOIN pg_namespace n ON n.oid = c.connamespace WHERE c.conrelid = 'job_skills'::regclass AND c.contype = 'p'"))
    for row in res:
        print(row[0], row[1])
