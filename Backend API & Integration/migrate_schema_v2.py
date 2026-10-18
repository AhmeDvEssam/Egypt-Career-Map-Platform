import os
import re
from sqlalchemy import text
from database import engine, SessionLocal, Base
from models import JobListing, CanonicalSkill, JobSkillOccurrence

# Dictionary for mapping locations to Egyptian Cities
EGYPTIAN_CITIES = [
    "Cairo", "Alexandria", "Giza", "Shubra El-Kheima", "Port Said", "Suez",
    "Luxor", "al-Mansura", "El-Mahalla El-Kubra", "Tanta", "Asyut", "Ismailia",
    "Faiyum", "Zagazig", "Aswan", "Damietta", "Damanhur", "al-Minya", "Beni Suef",
    "Qena", "Sohag", "Hurghada", "6th of October", "Shibin El Kom", "Banha",
    "Kafr el-Sheikh", "Arish", "Mallawi", "10th of Ramadan", "Bilbais", "Marsa Matruh",
    "Idfu", "Mit Ghamr", "Al-Hamidiyya", "Desouk", "Qalyub", "Abu Kabir", "Kafr el-Dawwar",
    "Girga", "Akhmim", "Matareya"
]

def add_columns_safely(engine):
    """Adds new columns to job_listings if they do not exist."""
    new_columns = [
        ("country", "VARCHAR DEFAULT 'Egypt'"),
        ("city", "VARCHAR"),
        ("district", "VARCHAR"),
        ("min_experience", "FLOAT"),
        ("max_experience", "FLOAT"),
        ("avg_experience", "FLOAT"),
        ("has_explicit_skills", "BOOLEAN DEFAULT FALSE"),
        ("skills_source", "VARCHAR"),
        ("source_job_id", "VARCHAR"),
        ("ai_analyzed", "BOOLEAN DEFAULT FALSE"),
        ("created_at", "TIMESTAMP"),
        ("updated_at", "TIMESTAMP")
    ]
    
    with engine.begin() as conn:
        for col_name, col_type in new_columns:
            try:
                conn.execute(text(f"ALTER TABLE job_listings ADD COLUMN {col_name} {col_type}"))
                print(f"[+] Added column {col_name}")
            except Exception as e:
                # Column likely already exists
                print(f"[-] Column {col_name} might already exist or error: {e}")

def parse_experience(exp_str):
    """Parses experience string and returns min, max, avg."""
    if not exp_str:
        return None, None, None
    
    exp_str = str(exp_str).lower()
    
    # Range: "1 to 3", "1-3"
    match_range = re.findall(r'(\d+)\s*(?:to|-)\s*(\d+)', exp_str)
    if match_range:
        min_val = float(match_range[0][0])
        max_val = float(match_range[0][1])
        return min_val, max_val, (min_val + max_val) / 2.0
    
    # Single number with "at least", "more than", "+" 
    # e.g., "3+ years", "at least 2"
    if "+" in exp_str or "at least" in exp_str or "more than" in exp_str:
        match = re.search(r'(\d+)', exp_str)
        if match:
            val = float(match.group(1))
            return val, val, val
            
    # Single number with "at most", "up to"
    if "at most" in exp_str or "up to" in exp_str or "maximum" in exp_str:
        match = re.search(r'(\d+)', exp_str)
        if match:
            val = float(match.group(1))
            return 0, val, val / 2.0
            
    # Just a number
    match = re.search(r'(\d+)', exp_str)
    if match:
        val = float(match.group(1))
        return val, val, val
        
    return None, None, None

def parse_location(loc_str):
    """Parses location string and returns city, district."""
    if not loc_str:
        return "Cairo", None  # Default fallback
        
    loc_str_lower = str(loc_str).lower()
    
    # 1. Check if it's exactly 'egypt'
    if loc_str_lower.strip() == "egypt":
        return "Cairo", None
        
    parts = [p.strip() for p in loc_str.split(",")]
    
    city = None
    district = None
    
    # Find matching city
    for part in parts:
        for c in EGYPTIAN_CITIES:
            if c.lower() in part.lower():
                city = c
                break
        if city:
            break
            
    # If no city found but there are parts, assume last part before Egypt is city, or fallback to Cairo
    if not city:
        city = "Cairo" # Default as requested
        
    # Find district (first part that isn't the city or Egypt)
    for part in parts:
        if part.lower() != city.lower() and part.lower() != "egypt":
            district = part
            break
            
    return city, district


def migrate_data():
    db = SessionLocal()
    try:
        jobs = db.query(JobListing).all()
        print(f"[*] Found {len(jobs)} jobs to migrate.")
        
        updated_count = 0
        for job in jobs:
            # 1. Normalize Experience
            if job.experience_needed and job.avg_experience is None:
                min_exp, max_exp, avg_exp = parse_experience(job.experience_needed)
                job.min_experience = min_exp
                job.max_experience = max_exp
                job.avg_experience = avg_exp
                
            # 2. Normalize Location
            if job.location and not job.city:
                job.country = "Egypt"
                c, d = parse_location(job.location)
                job.city = c
                job.district = d
                
            updated_count += 1
            
            # Commit in batches to prevent memory bloat
            if updated_count % 100 == 0:
                db.commit()
                print(f"    - Processed {updated_count} jobs...")
                
        db.commit()
        print(f"[+] Successfully migrated {updated_count} jobs.")
        
    except Exception as e:
        print(f"[!] Migration failed: {e}")
        db.rollback()
    finally:
        db.close()


if __name__ == "__main__":
    print("--- 1. Adding new columns to existing schema ---")
    add_columns_safely(engine)
    
    print("\n--- 2. Creating new tables (Canonical Skills, Job Occurrences) ---")
    Base.metadata.create_all(bind=engine)
    
    print("\n--- 3. Migrating existing data (Experience & Location Normalization) ---")
    migrate_data()
    print("\n[+] Migration Complete!")
