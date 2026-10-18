import pandas as pd
from sqlalchemy.orm import Session
from database import engine, Base, SessionLocal
from models import JobListing
import os
import re

# Create tables
Base.metadata.create_all(bind=engine)

def clean_location(loc):
    if not isinstance(loc, str):
        return "Egypt"
    
    # Normalize some locations
    loc = loc.lower()
    if 'cairo' in loc or 'nasr city' in loc or 'heliopolis' in loc or 'maadi' in loc:
        return 'Cairo'
    elif 'giza' in loc or '6th of october' in loc or 'sheikh zayed' in loc:
        return 'Giza'
    elif 'alexandria' in loc:
        return 'Alexandria'
    elif 'mansoura' in loc or 'dakahlia' in loc:
        return 'Dakahlia'
    elif 'tanta' in loc or 'gharbia' in loc:
        return 'Gharbia'
    elif 'red sea' in loc or 'hurghada' in loc:
        return 'Red Sea'
    else:
        # Just return the first part before a comma capitalized
        return loc.split(',')[0].title()

def seed():
    db = SessionLocal()
    
    # Clear existing data
    db.query(JobListing).delete()
    db.commit()

    print("Seeding Wuzzuf data...")
    wuzzuf_path = r"d:\Hire Q Project\Egypt Jobs Scraper\data\wuzzuf_clean_data_v3.csv"
    if os.path.exists(wuzzuf_path):
        df_w = pd.read_csv(wuzzuf_path, on_bad_lines='skip')
        jobs_to_insert = []
        for _, row in df_w.iterrows():
            jobs_to_insert.append(JobListing(
                title=str(row.get('Job Title', '')),
                company=str(row.get('Company Name', '')),
                location=clean_location(row.get('Location', '')),
                job_type=str(row.get('Job Type', '')),
                work_type=str(row.get('Work Type', '')),
                experience_needed=str(row.get('Experience Needed', '')),
                salary=str(row.get('Salary', '')),
                skills=str(row.get('Skills', '')),
                description=str(row.get('Description', '')),
                source="Wuzzuf",
                url=str(row.get('Job URL', ''))
            ))
        db.bulk_save_objects(jobs_to_insert)
        db.commit()
        print(f"Inserted {len(jobs_to_insert)} Wuzzuf jobs.")

    print("Seeding LinkedIn data...")
    linkedin_path = r"d:\Hire Q Project\Egypt Jobs Scraper\data\linkedin_clean_data.csv"
    if os.path.exists(linkedin_path):
        df_l = pd.read_csv(linkedin_path, on_bad_lines='skip')
        jobs_to_insert = []
        for _, row in df_l.iterrows():
            jobs_to_insert.append(JobListing(
                title=str(row.get('Job Title', '')),
                company=str(row.get('Company Name', '')),
                location=clean_location(row.get('Location', '')),
                job_type=str(row.get('Job Type', '')),
                work_type=str(row.get('Work Type', '')),
                experience_needed=str(row.get('Experience Level', '')),
                salary="Confidential", # LinkedIn usually doesn't have salary in CSV
                skills=str(row.get('Industry', '')), # Fallback to industry
                description=str(row.get('Description', '')),
                source="LinkedIn",
                url=str(row.get('Job URL', ''))
            ))
        db.bulk_save_objects(jobs_to_insert)
        db.commit()
        print(f"Inserted {len(jobs_to_insert)} LinkedIn jobs.")
        
    db.close()
    print("Database seeded successfully!")

if __name__ == "__main__":
    seed()
