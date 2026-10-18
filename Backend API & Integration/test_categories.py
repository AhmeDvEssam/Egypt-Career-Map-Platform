import os
import json
import time
import requests
import pandas as pd
from sqlalchemy import create_engine, text
import sys

sys.path.append("D:\\Hire Q Project\\Backend API & Integration")
from ai_worker import SmartAPIRouter, call_llm, clean_json_string

DB_URL = "postgresql://egypt_jobs:egypt_jobs_2026@localhost:5432/egypt_jobs_db"

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

def fetch_sample_jobs():
    engine = create_engine(DB_URL)
    jobs = []
    with engine.connect() as conn:
        for source in ['wuzzuf', 'linkedin', 'forasna']:
            res = conn.execute(text(f"SELECT title_raw, source FROM jobs WHERE source ILIKE '%{source}%' ORDER BY RANDOM() LIMIT 10")).fetchall()
            jobs.extend([{"title": r[0], "source": r[1]} for r in res])
    return jobs

def test_batch_llm(jobs, router):
    key, provider = None, None
    # Let's force a fast and capable one like Groq Llama-3 or Mistral
    for k, v in router.provider_state.items():
        prov = v['provider'].lower()
        if ('groq' in prov or 'cleanapis' in prov or 'mistral' in prov) and v['success_count'] > -1:
            key, provider = k, prov
            break
            
    if not key:
        return {"error": "No key found"}, 0, 0
        
    titles = [j['title'] for j in jobs]
    
    prompt = f"""You are an expert HR classifier. Categorize the following job titles into exactly one of the predefined categories.
    
Predefined Categories:
{json.dumps(CATEGORIES, indent=2)}

Job Titles to Categorize:
{json.dumps(titles, indent=2)}

Respond ONLY with a valid JSON object where keys are the exact job titles and values are the chosen category string from the list above. Do not include any other text or markdown.
"""
    
    start_time = time.time()
    try:
        raw_res, tokens = call_llm(prompt, key, provider)
        cleaned = clean_json_string(raw_res)
        result_map = json.loads(cleaned)
        latency = time.time() - start_time
        return result_map, latency, tokens
    except Exception as e:
        print(f"LLM Error: {e}")
        return {}, time.time() - start_time, 0

def test_reranker(jobs, router):
    key, prov = None, None
    for k, v in router.provider_state.items():
        if 'voyage' in v['provider'].lower() or 'jina' in v['provider'].lower():
            key, prov = k, v['provider'].lower()
            break
            
    if not key:
        return {}, 0, 0
        
    results = {}
    total_tokens = 0
    start_time = time.time()
    
    for job in jobs:
        title = job['title']
        if 'voyage' in prov:
            url = 'https://api.voyageai.com/v1/rerank'
            headers = {'Content-Type': 'application/json', 'Authorization': f'Bearer {key}'}
            data = {'model': 'rerank-2', 'query': title, 'documents': CATEGORIES}
        else:
            url = 'https://api.jina.ai/v1/rerank'
            headers = {'Content-Type': 'application/json', 'Authorization': f'Bearer {key}'}
            data = {'model': 'jina-reranker-v2-base-multilingual', 'query': title, 'documents': CATEGORIES}
            
        try:
            resp = requests.post(url, headers=headers, json=data, timeout=5.0)
            if resp.status_code == 200:
                if 'voyage' in prov:
                    best_idx = resp.json()['data'][0]['index']
                    total_tokens += 2
                else:
                    best_idx = resp.json()['results'][0]['index']
                    total_tokens += 14
                results[title] = CATEGORIES[best_idx]
            else:
                results[title] = "API_ERROR"
        except Exception as e:
            results[title] = "TIMEOUT_ERROR"
            
    latency = time.time() - start_time
    return results, latency, total_tokens

if __name__ == "__main__":
    print("[*] Fetching 30 sample jobs...")
    jobs = fetch_sample_jobs()
    
    print("[*] Initializing Router...")
    router = SmartAPIRouter()
    
    print(f"[*] Testing Batch LLM on {len(jobs)} jobs...")
    llm_map, llm_time, llm_tokens = test_batch_llm(jobs, router)
    
    print(f"[*] Testing Re-ranker on {len(jobs)} jobs...")
    rerank_map, rerank_time, rerank_tokens = test_reranker(jobs, router)
    
    df_data = []
    for job in jobs:
        t = job['title']
        df_data.append({
            "Job Title": t,
            "Source": job['source'],
            "Batch LLM Category": llm_map.get(t, "MISSING"),
            "Re-ranker Category": rerank_map.get(t, "MISSING")
        })
        
    df = pd.DataFrame(df_data)
    
    df.loc[len(df)] = ["--- METRICS ---", "-----------", "-----------", "-----------"]
    df.loc[len(df)] = ["Latency (Seconds)", "", f"{llm_time:.2f} s", f"{rerank_time:.2f} s"]
    df.loc[len(df)] = ["Tokens Used", "", str(llm_tokens), str(rerank_tokens)]
    df.loc[len(df)] = ["Cost (Est)", "", "Almost Zero", "Almost Zero"]
    
    out_path = "D:\\Hire Q Project\\Categorization_Test_Results.xlsx"
    df.to_excel(out_path, index=False)
    print(f"[+] Done! Results saved to {out_path}")
