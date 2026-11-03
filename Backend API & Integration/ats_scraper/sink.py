import os
import csv
import uuid
import json
import psycopg2
from typing import List, Dict, Any, Tuple
from datetime import datetime

DATABASE_URL = os.getenv(
    "DATABASE_URL", 
    "postgresql://egypt_jobs:egypt_jobs_2026@localhost:5432/egypt_jobs_db"
)

CSV_EXPORT_PATH = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "../../../Egypt Jobs Scraper/data/egypt_ats_jobs.csv")
)

class AtsSink:
    def __init__(self, db_url: str = DATABASE_URL, csv_path: str = CSV_EXPORT_PATH):
        self.db_url = db_url
        self.csv_path = csv_path
        os.makedirs(os.path.dirname(self.csv_path), exist_ok=True)

    def save_jobs(self, jobs: List[Dict[str, Any]]) -> Tuple[int, int]:
        """
        Saves normalized ATS jobs into PostgreSQL with Upsert and updates the CSV.
        Returns: (inserted_count, updated_count)
        """
        if not jobs:
            return 0, 0

        # 1. Database Upsert
        inserted = 0
        updated = 0
        
        try:
            conn = psycopg2.connect(self.db_url, connect_timeout=5)
            cur = conn.cursor()

            query = """
                INSERT INTO jobs (
                    id, source, source_job_id, title_raw, title_normalized, 
                    company_name, company_url, location_raw, location_normalized, 
                    job_type, work_type, career_level, min_experience, max_experience, avg_experience,
                    education_level, job_category, internal_category, job_url, 
                    salary_min, salary_max, currency, posted_date, scraped_at, status, 
                    created_at, updated_at
                ) VALUES (
                    %s, %s, %s, %s, %s, 
                    %s, %s, %s, %s, 
                    %s, %s, %s, %s, %s, %s,
                    %s, %s, %s, %s, 
                    %s, %s, %s, %s, NOW(), 'Open', 
                    NOW(), NOW()
                )
                ON CONFLICT (source, source_job_id) DO UPDATE SET
                    title_raw = EXCLUDED.title_raw,
                    title_normalized = EXCLUDED.title_normalized,
                    company_name = EXCLUDED.company_name,
                    company_url = COALESCE(EXCLUDED.company_url, jobs.company_url),
                    location_raw = EXCLUDED.location_raw,
                    location_normalized = EXCLUDED.location_normalized,
                    job_type = COALESCE(EXCLUDED.job_type, jobs.job_type),
                    work_type = COALESCE(EXCLUDED.work_type, jobs.work_type),
                    career_level = COALESCE(EXCLUDED.career_level, jobs.career_level),
                    min_experience = COALESCE(EXCLUDED.min_experience, jobs.min_experience),
                    max_experience = COALESCE(EXCLUDED.max_experience, jobs.max_experience),
                    avg_experience = COALESCE(EXCLUDED.avg_experience, jobs.avg_experience),
                    education_level = COALESCE(EXCLUDED.education_level, jobs.education_level),
                    job_category = COALESCE(EXCLUDED.job_category, jobs.job_category),
                    internal_category = EXCLUDED.internal_category,
                    job_url = EXCLUDED.job_url,
                    salary_min = COALESCE(EXCLUDED.salary_min, jobs.salary_min),
                    salary_max = COALESCE(EXCLUDED.salary_max, jobs.salary_max),
                    currency = COALESCE(EXCLUDED.currency, jobs.currency),
                    posted_date = COALESCE(EXCLUDED.posted_date, jobs.posted_date),
                    status = 'Open',
                    updated_at = NOW()
                RETURNING (xmax = 0);
            """

            for j in jobs:
                job_uuid = str(uuid.uuid4())
                source = j["source"]
                source_job_id = j["source_job_id"]
                title_raw = j["title_raw"]
                title_norm = j["title_normalized"]
                company_name = j["company_name"]
                company_url = j.get("company_url", "")
                loc_raw = j["location_raw"]
                loc_norm = j["location_normalized"]
                job_type = j.get("job_type", "Full-time")
                work_type = j.get("work_type", "On-site")
                career_level = j.get("career_level", "Mid-Level")
                min_exp = j.get("min_experience")
                max_exp = j.get("max_experience")
                avg_exp = j.get("avg_experience")
                edu_level = j.get("education_level")
                job_category = j.get("job_category", "Other / Uncategorized")
                internal_cat = job_category
                job_url = j["job_url"]
                sal_min = j.get("salary_min")
                sal_max = j.get("salary_max")
                currency = j.get("currency")
                posted_date = j.get("posted_date") or datetime.utcnow().isoformat()

                cur.execute(query, (
                    job_uuid, source, source_job_id, title_raw, title_norm,
                    company_name, company_url, loc_raw, loc_norm,
                    job_type, work_type, career_level, min_exp, max_exp, avg_exp,
                    edu_level, job_category, internal_cat, job_url,
                    sal_min, sal_max, currency, posted_date
                ))

                row = cur.fetchone()
                is_new = row[0] if row else False
                if is_new:
                    inserted += 1
                else:
                    updated += 1

                # Save Description if present
                desc = j.get("description")
                if desc:
                    cur.execute("SELECT id FROM jobs WHERE source = %s AND source_job_id = %s", (source, source_job_id))
                    jrow = cur.fetchone()
                    if jrow:
                        actual_id = jrow[0]
                        cur.execute("DELETE FROM job_descriptions WHERE job_id = %s", (actual_id,))
                        cur.execute("""
                            INSERT INTO job_descriptions (id, job_id, type, content, is_primary)
                            VALUES (%s, %s, 'DESCRIPTION', %s, TRUE)
                        """, (str(uuid.uuid4()), actual_id, desc))

            conn.commit()
            cur.close()
            conn.close()

        except Exception as e:
            print(f"[!] Warning: PostgreSQL Upsert skipped/failed ({e}). Proceeding with CSV export.")

        # 2. CSV Export
        self._export_to_csv(jobs)

        return inserted, updated

    def _export_to_csv(self, jobs: List[Dict[str, Any]]):
        """Appends/updates normalized jobs in CSV format."""
        file_exists = os.path.exists(self.csv_path) and os.path.getsize(self.csv_path) > 0
        fieldnames = [
            "source", "source_job_id", "title_raw", "company_name", 
            "location_raw", "location_normalized", "work_type", "career_level", 
            "min_experience", "max_experience", "salary_min", "salary_max", 
            "currency", "job_url", "posted_date", "dedup_hash"
        ]

        # Read existing to prevent CSV dupes
        existing_hashes = set()
        if file_exists:
            try:
                with open(self.csv_path, mode="r", encoding="utf-8-sig") as f:
                    reader = csv.DictReader(f)
                    for r in reader:
                        if r.get("dedup_hash"):
                            existing_hashes.add(r["dedup_hash"])
            except Exception:
                pass

        with open(self.csv_path, mode="a" if file_exists else "w", newline="", encoding="utf-8-sig") as f:
            writer = csv.DictWriter(f, fieldnames=fieldnames, extrasaction="ignore")
            if not file_exists:
                writer.writeheader()
            for j in jobs:
                if j["dedup_hash"] not in existing_hashes:
                    writer.writerow(j)
                    existing_hashes.add(j["dedup_hash"])
