from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.declarative import declarative_base
import os
import psycopg2
from dotenv import load_dotenv

load_dotenv()

# We prefer PostgreSQL for long-term scalability and vector/JSON support.
PG_URL = os.getenv(
    "DATABASE_URL", 
    "postgresql://egypt_jobs:egypt_jobs_2026@localhost:5432/egypt_jobs_db"
)

# SQLite fallback
DB_PATH = os.path.join(os.path.dirname(__file__), "jobs.db")
SQLITE_URL = f"sqlite:///{DB_PATH}"

# Test PostgreSQL connection first
use_pg = False
try:
    if PG_URL.startswith("postgresql"):
        # Connect directly to the target database to verify access
        conn = psycopg2.connect(PG_URL, connect_timeout=2)
        conn.close()
        use_pg = True
except Exception as e:
    print(f"[!] PostgreSQL connection failed: {e}")
    print("[!] Falling back to SQLite for now. Please start PostgreSQL for optimal performance.")

if use_pg:
    DATABASE_URL = PG_URL
    connect_args = {}
    print("[+] Using PostgreSQL Database")
else:
    DATABASE_URL = SQLITE_URL
    connect_args = {"check_same_thread": False}
    print("[+] Using SQLite Database (Fallback)")

engine = create_engine(DATABASE_URL, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
