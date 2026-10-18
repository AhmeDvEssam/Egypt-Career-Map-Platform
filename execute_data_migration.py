import sys
sys.stdout.reconfigure(encoding='utf-8')
import re
from sqlalchemy import create_engine, text
sys.path.append('Backend API & Integration')
from database import PG_URL

engine = create_engine(PG_URL)

def run_migration_and_cleanup():
    print("[*] Starting Data Migration & Skill Cleanup...")
    
    with engine.begin() as conn:
        # ---------------------------------------------------------
        # 1. SALARY MIGRATION
        # ---------------------------------------------------------
        print("\n--- 1. Migrating Salaries ---")
        salary_skills = [
            ('85e2f9ca-181a-4428-bc73-e04c9b91da81', 'راتب 15000 - 15000 جنيه مصري', 15000, 15000),
            # Search for '5000 - 8000 جنيه مصري'
        ]
        
        # Find all salary-like skills
        rows = conn.execute(text("""
            SELECT id, name FROM skills 
            WHERE name ILIKE '%راتب%' OR name ILIKE '%جنيه مصري%'
        """)).fetchall()
        
        for sid, sname in rows:
            # Extract numbers
            nums = re.findall(r'\d+', sname)
            if len(nums) >= 2:
                s_min, s_max = float(nums[0]), float(nums[1])
            elif len(nums) == 1:
                s_min, s_max = float(nums[0]), float(nums[0])
            else:
                s_min, s_max = None, None
                
            if s_min is not None:
                # Find linked jobs
                job_ids = [r[0] for r in conn.execute(text("SELECT job_id FROM job_skills WHERE skill_id = :sid"), {"sid": sid}).fetchall()]
                for jid in job_ids:
                    # Update job if salary is null
                    conn.execute(text("""
                        UPDATE jobs 
                        SET salary_min = COALESCE(salary_min, :smin),
                            salary_max = COALESCE(salary_max, :smax),
                            currency = COALESCE(currency, 'EGP')
                        WHERE id = :jid
                    """), {"jid": jid, "smin": s_min, "smax": s_max})
                    print(f"  [Salary] Updated Job {jid} with {s_min}-{s_max} EGP from '{sname}'")
            
            # Delete job_skills, embeddings, and skill
            conn.execute(text("DELETE FROM job_skills WHERE skill_id = :sid"), {"sid": sid})
            conn.execute(text("DELETE FROM skill_embeddings WHERE skill_id = :sid"), {"sid": sid})
            conn.execute(text("DELETE FROM skill_aliases WHERE skill_id = :sid"), {"sid": sid})
            conn.execute(text("DELETE FROM skills WHERE id = :sid"), {"sid": sid})
            print(f"  [Cleaned] Removed salary skill '{sname}' ({sid})")

        # ---------------------------------------------------------
        # 2. EXPERIENCE MIGRATION
        # ---------------------------------------------------------
        print("\n--- 2. Migrating Experience ---")
        exp_skills = conn.execute(text("""
            SELECT id, name FROM skills 
            WHERE name ILIKE '%years experience%' OR name ILIKE 'minimum % experience'
        """)).fetchall()
        
        for sid, sname in exp_skills:
            nums = re.findall(r'\d+', sname)
            if len(nums) >= 2:
                e_min, e_max = float(nums[0]), float(nums[1])
            elif len(nums) == 1:
                e_min, e_max = float(nums[0]), float(nums[0])
            else:
                e_min, e_max = None, None
                
            if e_min is not None:
                job_ids = [r[0] for r in conn.execute(text("SELECT job_id FROM job_skills WHERE skill_id = :sid"), {"sid": sid}).fetchall()]
                for jid in job_ids:
                    conn.execute(text("""
                        UPDATE jobs 
                        SET min_experience = COALESCE(min_experience, :emin),
                            max_experience = COALESCE(max_experience, :emax),
                            avg_experience = COALESCE(avg_experience, :eavg)
                        WHERE id = :jid
                    """), {"jid": jid, "emin": e_min, "emax": e_max, "eavg": (e_min + e_max) / 2})
                    print(f"  [Exp] Updated Job {jid} with Exp: {e_min}-{e_max} yrs from '{sname}'")
                    
                    # If skill mentions a real tool like Revit, link to Revit
                    if 'revit' in sname.lower():
                        revit_skill = conn.execute(text("SELECT id FROM skills WHERE name ILIKE 'revit' LIMIT 1")).fetchone()
                        if revit_skill:
                            conn.execute(text("""
                                INSERT INTO job_skills (job_id, skill_id, is_required, extracted_from)
                                VALUES (:jid, :sid, true, 'ai_migrated')
                                ON CONFLICT (job_id, skill_id) DO NOTHING
                            """), {"jid": jid, "sid": revit_skill[0]})
                            print(f"  [Linked] Preserved real tool 'Revit' on Job {jid}")

            conn.execute(text("DELETE FROM job_skills WHERE skill_id = :sid"), {"sid": sid})
            conn.execute(text("DELETE FROM skill_embeddings WHERE skill_id = :sid"), {"sid": sid})
            conn.execute(text("DELETE FROM skill_aliases WHERE skill_id = :sid"), {"sid": sid})
            conn.execute(text("DELETE FROM skills WHERE id = :sid"), {"sid": sid})
            print(f"  [Cleaned] Removed experience skill '{sname}' ({sid})")

        # ---------------------------------------------------------
        # 3. EDUCATION / DEGREE MIGRATION
        # ---------------------------------------------------------
        print("\n--- 3. Migrating Education / Degrees ---")
        degree_patterns = [
            "Bachelor's Degree", "Bachelor of Science", "Bachelor's Degree in Education",
            "Bachelor’s degree in Pharmacy", "Bachelor of Social Work", "Bachelor of Agricultural Sciences",
            "Bachelor's Degree in Commerce", "Bachelor of Business Studies", "Bachelor of Laws",
            "Bachelor's Degree in English", "Bachelor of Science in English", "Bachelor of Science Degree",
            "Master's Degree", "Master of Business Administration", "Master's"
        ]
        
        for deg_name in degree_patterns:
            deg_rows = conn.execute(text("SELECT id, name FROM skills WHERE name = :dname"), {"dname": deg_name}).fetchall()
            for sid, sname in deg_rows:
                # Update education_level for all linked jobs missing education_level
                res = conn.execute(text("""
                    UPDATE jobs j
                    SET education_level = :ed_val
                    FROM job_skills js
                    WHERE j.id = js.job_id
                      AND js.skill_id = :sid
                      AND (j.education_level IS NULL OR j.education_level IN ('None', 'Not Specified'))
                """), {"ed_val": sname, "sid": sid})
                print(f"  [Education] Enriched {res.rowcount} jobs with education_level='{sname}'")
                
                # Clean up the skill
                conn.execute(text("DELETE FROM job_skills WHERE skill_id = :sid"), {"sid": sid})
                conn.execute(text("DELETE FROM skill_embeddings WHERE skill_id = :sid"), {"sid": sid})
                conn.execute(text("DELETE FROM skill_aliases WHERE skill_id = :sid"), {"sid": sid})
                conn.execute(text("DELETE FROM skills WHERE id = :sid"), {"sid": sid})
                print(f"  [Cleaned] Removed degree skill '{sname}' ({sid})")

        # ---------------------------------------------------------
        # 4. WORK TYPE MIGRATION
        # ---------------------------------------------------------
        print("\n--- 4. Migrating Work Type (Remote / Hybrid) ---")
        remote_skills = conn.execute(text("SELECT id, name FROM skills WHERE name = 'Remote Work'")).fetchall()
        for sid, sname in remote_skills:
            res = conn.execute(text("""
                UPDATE jobs j
                SET work_type = 'Remote'
                FROM job_skills js
                WHERE j.id = js.job_id
                  AND js.skill_id = :sid
                  AND (j.work_type IS NULL OR j.work_type IN ('None', 'Not Specified', 'On-site'))
            """), {"sid": sid})
            print(f"  [WorkType] Updated {res.rowcount} jobs to work_type='Remote'")
            # Remove link and skill
            conn.execute(text("DELETE FROM job_skills WHERE skill_id = :sid"), {"sid": sid})
            conn.execute(text("DELETE FROM skill_embeddings WHERE skill_id = :sid"), {"sid": sid})
            conn.execute(text("DELETE FROM skill_aliases WHERE skill_id = :sid"), {"sid": sid})
            conn.execute(text("DELETE FROM skills WHERE id = :sid"), {"sid": sid})
            print(f"  [Cleaned] Removed work-type skill '{sname}'")

        hybrid_skills = conn.execute(text("SELECT id, name FROM skills WHERE name IN ('Hybrid', 'Hybrid work', 'Hybrid Work Model', 'Remote & Hybrid Work')")).fetchall()
        for sid, sname in hybrid_skills:
            res = conn.execute(text("""
                UPDATE jobs j
                SET work_type = 'Hybrid'
                FROM job_skills js
                WHERE j.id = js.job_id
                  AND js.skill_id = :sid
                  AND (j.work_type IS NULL OR j.work_type IN ('None', 'Not Specified', 'On-site'))
            """), {"sid": sid})
            print(f"  [WorkType] Updated {res.rowcount} jobs to work_type='Hybrid'")
            conn.execute(text("DELETE FROM job_skills WHERE skill_id = :sid"), {"sid": sid})
            conn.execute(text("DELETE FROM skill_embeddings WHERE skill_id = :sid"), {"sid": sid})
            conn.execute(text("DELETE FROM skill_aliases WHERE skill_id = :sid"), {"sid": sid})
            conn.execute(text("DELETE FROM skills WHERE id = :sid"), {"sid": sid})
            print(f"  [Cleaned] Removed work-type skill '{sname}'")

        # ---------------------------------------------------------
        # 5. DRIVING LICENSE CLEANUP
        # (It's already preserved in job_descriptions type='REQUIREMENTS')
        # ---------------------------------------------------------
        print("\n--- 5. Cleaning Driving License from Skills ---")
        dl_skills = conn.execute(text("SELECT id, name FROM skills WHERE name = 'Driving license'")).fetchall()
        for sid, sname in dl_skills:
            cnt = conn.execute(text("SELECT count(*) FROM job_skills WHERE skill_id = :sid"), {"sid": sid}).scalar()
            print(f"  [Notice] 'Driving license' was linked to {cnt} jobs. Requirements are safely stored in job_descriptions table.")
            conn.execute(text("DELETE FROM job_skills WHERE skill_id = :sid"), {"sid": sid})
            conn.execute(text("DELETE FROM skill_embeddings WHERE skill_id = :sid"), {"sid": sid})
            conn.execute(text("DELETE FROM skill_aliases WHERE skill_id = :sid"), {"sid": sid})
            conn.execute(text("DELETE FROM skills WHERE id = :sid"), {"sid": sid})
            print(f"  [Cleaned] Removed 'Driving license' from skills table.")

    print("\n[+] MIGRATION AND CLEANUP COMPLETE!")

if __name__ == '__main__':
    run_migration_and_cleanup()
