import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT
import os
from dotenv import load_dotenv

load_dotenv()

db_url = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/careermap")
# Parse out the base connection (to 'postgres' db instead of 'careermap')
# e.g. postgresql://postgres:postgres@localhost:5432
if db_url.startswith("sqlite"):
    print("Using SQLite, no need to create DB.")
    exit(0)

base_url = "/".join(db_url.split("/")[:-1]) + "/postgres"
db_name = db_url.split("/")[-1]

try:
    print(f"Connecting to {base_url} to check if {db_name} exists...")
    conn = psycopg2.connect(base_url)
    conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
    cur = conn.cursor()
    
    cur.execute(f"SELECT 1 FROM pg_catalog.pg_database WHERE datname = '{db_name}'")
    exists = cur.fetchone()
    if not exists:
        print(f"Database {db_name} does not exist. Creating...")
        cur.execute(f"CREATE DATABASE {db_name}")
        print("Database created successfully.")
    else:
        print(f"Database {db_name} already exists.")
        
    cur.close()
    conn.close()
except Exception as e:
    print(f"Error checking/creating database: {e}")
    print("Please ensure PostgreSQL is running and credentials are correct.")
