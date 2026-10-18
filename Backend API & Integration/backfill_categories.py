import os
import sys
import json
import time
from sqlalchemy import create_engine, text
import requests
import concurrent.futures

sys.path.append('D:/Hire Q Project/Backend API & Integration')
from ai_worker import SmartAPIRouter, call_llm
from database import PG_URL

DB_URL = PG_URL

CATEGORIES = [
    "Software Engineering & IT",
    "Sales & Business Development",
    "Marketing & PR",
    "Finance & Accounting",
    "Human Resources & Recruiting",
    "Engineering & Construction",
    "Manufacturing & Production",
    "Operations & Logistics",
    "Customer Service & Support",
    "Administrative & Office",
    "Healthcare & Medical",
    "Education & Training",
    "Hospitality & Travel",
    "Blue Collar & Manual Labor",
    "Other / Uncategorized"
]

def process_batch(batch, batch_index, total_batches, router, engine):
    print(f"\n[*] Processing batch {batch_index}/{total_batches} ({len(batch)} jobs)...")
    
    # Build prompt map
    titles_map = {}
    for row in batch:
        job_id, title, src, company = row
        titles_map[str(job_id)] = f"{title} (Company: {company}, Source: {src})"
        
    prompt = f"""You are an expert HR job classifier.
We have a list of job IDs and their titles/context.
Categorize each job into EXACTLY ONE of the predefined categories.

Predefined Categories:
{json.dumps(CATEGORIES, indent=2)}

Jobs to Categorize:
{json.dumps(titles_map, indent=2)}

CRITICAL INSTRUCTIONS:
- Respond ONLY with a valid JSON object.
- The keys MUST be the exact Job IDs provided above.
- The values MUST be the exact category string from the predefined list.
- Do not wrap in markdown or include any other text.
"""
    
    attempts = 0
    success = False
    while attempts < 30 and not success:
        key, provider = router.get_best_available_key(task_type='normalization')
        if not key:
            time.sleep(5)
            continue
            
        try:
            raw_res, tokens = call_llm(prompt, key, provider)
            
            # Strip markdown
            raw_res = raw_res.replace("```json", "").replace("```", "").strip()
            
            try:
                result_map = json.loads(raw_res)
            except json.JSONDecodeError as e:
                print(f"    [-] Batch {batch_index}: LLM returned invalid JSON. Retrying...")
                router.mark_key_failure(key)
                attempts += 1
                continue
                
            router.mark_key_success(key, tokens_used=tokens)
            
            # Update DB
            with engine.connect() as conn:
                updates = 0
                for jid, category in result_map.items():
                    if category in CATEGORIES:
                        conn.execute(
                            text("UPDATE jobs SET internal_category = :cat WHERE id = :jid"),
                            {"cat": category, "jid": jid}
                        )
                        updates += 1
                    else:
                        conn.execute(
                            text("UPDATE jobs SET internal_category = 'Other / Uncategorized' WHERE id = :jid"),
                            {"jid": jid}
                        )
                conn.commit()
                
            print(f"    [+] Batch {batch_index} Success: {updates}/{len(batch)} jobs using {provider} ({tokens} tokens).")
            success = True
            
        except Exception as e:
            # print(f"    [-] Batch {batch_index}: Error with {provider}: {e}")
            router.mark_key_failure(key)
            attempts += 1
            
    if not success:
        print(f"    [!] Batch {batch_index} Failed after 30 attempts.")


def backfill_jobs(batch_size=50, limit=None, threads=10):
    engine = create_engine(DB_URL)
    router = SmartAPIRouter()
    
    with engine.connect() as conn:
        print("[*] Fetching jobs that need backfilling...")
        query = text("""
            SELECT id, title_raw, source, company_name 
            FROM jobs 
            WHERE ai_analyzed = TRUE 
              AND internal_category IS NULL
            ORDER BY created_at DESC
        """)
        
        if limit:
            query = text(str(query) + f" LIMIT {limit}")
            
        jobs = conn.execute(query).fetchall()
        
    total_jobs = len(jobs)
    print(f"[+] Found {total_jobs} jobs to backfill.")
    if total_jobs == 0:
        return
        
    batches = [jobs[i:i + batch_size] for i in range(0, total_jobs, batch_size)]
    total_batches = len(batches)
    
    print(f"[*] Starting {threads} threads for {total_batches} batches...")
    
    with concurrent.futures.ThreadPoolExecutor(max_workers=threads) as executor:
        futures = []
        for i, batch in enumerate(batches):
            futures.append(
                executor.submit(process_batch, batch, i + 1, total_batches, router, engine)
            )
        
        for future in concurrent.futures.as_completed(futures):
            try:
                future.result()
            except Exception as e:
                print(f"[-] Thread error: {e}")

if __name__ == "__main__":
    print("=== HireQ Job Category Backfill ===")
    
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--batch", type=int, default=50, help="Batch size")
    parser.add_argument("--limit", type=int, default=None, help="Max jobs to process")
    parser.add_argument("--threads", type=int, default=15, help="Number of concurrent threads")
    args = parser.parse_args()
    
    backfill_jobs(batch_size=args.batch, limit=args.limit, threads=args.threads)
