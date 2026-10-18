import time
import json
import uuid
from concurrent.futures import ThreadPoolExecutor, as_completed
from sqlalchemy import create_engine, text
from ai_worker import SmartAPIRouter, call_llm
import os
from dotenv import load_dotenv

load_dotenv()

PG_URL = os.getenv("DATABASE_URL", "postgresql://egypt_jobs:egypt_jobs_2026@localhost:5432/egypt_jobs_db")
engine = create_engine(PG_URL)
router = SmartAPIRouter(speed_mode='max')

def get_all_skills():
    with engine.connect() as conn:
        result = conn.execute(text("SELECT id, name FROM skills"))
        return {r[1]: str(r[0]) for r in result.fetchall()}

def process_batch(batch_names):
    prompt = f"""
    You are an expert Data Engineer cleaning a jobs database.
    Below is a list of raw, messy skill strings extracted from CVs.
    
    Your task:
    1. Standardize formatting (e.g. 'PowerBI' -> 'Power BI').
    2. Extract the core skill from full sentences (e.g. 'Strong written communication skills' -> 'Communication Skills').
    3. If a string is meaningless garbage, map it to 'DELETE'.
    
    Raw Skills:
    {json.dumps(batch_names, ensure_ascii=False)}
    
    Output ONLY a valid JSON object mapping the exact Original string to the Clean Canonical string.
    Example: {{"PowerBI": "Power BI", "hjklhjkl": "DELETE"}}
    """
    key = None
    try:
        key, provider = router.get_best_available_key("cv_analysis")
        response = call_llm(prompt, key, provider)
    except Exception as e:
        if key:
            router.mark_key_failure(key, retry_after=10)
        return {}
        
    # We must mark success/failure for the router to track limits!
    if not response or "Error:" in response:
        router.mark_key_failure(key, retry_after=10)
        return {}
    else:
        router.mark_key_success(key)
        
    try:
        if "```json" in response:
            response = response.split("```json")[1].split("```")[0]
        elif "```" in response:
            response = response.split("```")[1].split("```")[0]
        return json.loads(response.strip())
    except Exception as e:
        # Silently ignore JSON parse errors and return empty dict
        return {}

def apply_mapping_to_db(mapping, original_skills_dict):
    with engine.begin() as conn:
        for old_name, canonical_name in mapping.items():
            if old_name not in original_skills_dict:
                continue
            
            old_id = original_skills_dict[old_name]
            
            if canonical_name == "DELETE":
                conn.execute(text("DELETE FROM job_skills WHERE skill_id = :old_id"), {"old_id": old_id})
                conn.execute(text("DELETE FROM skills WHERE id = :old_id"), {"old_id": old_id})
                continue
                
            if old_name == canonical_name:
                continue # Already clean

            # Check if canonical exists
            res = conn.execute(text("SELECT id FROM skills WHERE name = :c_name"), {"c_name": canonical_name}).fetchone()
            if res:
                canonical_id = res[0]
            else:
                canonical_id = str(uuid.uuid4())
                conn.execute(text("INSERT INTO skills (id, name) VALUES (:cid, :c_name)"), {"cid": canonical_id, "c_name": canonical_name})
            
            # Safely Update Jobs (Handle duplicate keys if a job had two messy versions of the same skill)
            conn.execute(text("""
                INSERT INTO job_skills (job_id, skill_id)
                SELECT job_id, :cid FROM job_skills WHERE skill_id = :old_id
                ON CONFLICT DO NOTHING
            """), {"cid": canonical_id, "old_id": old_id})
            
            conn.execute(text("DELETE FROM job_skills WHERE skill_id = :old_id"), {"old_id": old_id})
            
            # Add to Aliases
            conn.execute(text("INSERT INTO skill_aliases (skill_id, alias_name) VALUES (:cid, :old_name) ON CONFLICT DO NOTHING"), {"cid": canonical_id, "old_name": old_name})
            
            # Delete old skill
            conn.execute(text("DELETE FROM skills WHERE id = :old_id"), {"old_id": old_id})

def run_cleaning():
    skills_dict = get_all_skills()
    all_names = list(skills_dict.keys())
    print(f"Total skills to clean: {len(all_names)}")
    
    batch_size = 20
    batches = [all_names[i:i + batch_size] for i in range(0, len(all_names), batch_size)]
    print(f"Created {len(batches)} batches.")
    
    # Process 5 batches concurrently
    completed = 0
    with ThreadPoolExecutor(max_workers=5) as executor:
        future_to_batch = {executor.submit(process_batch, b): b for b in batches}
        for future in as_completed(future_to_batch):
            result_map = future.result()
            if result_map:
                apply_mapping_to_db(result_map, skills_dict)
            completed += 1
            print(f"Progress: {completed}/{len(batches)} batches completed. ({completed * 50} skills normalized)")

if __name__ == "__main__":
    run_cleaning()
