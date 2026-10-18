import os
import re
import json
import psycopg2
import numpy as np
from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity
from ai_worker import SmartAPIRouter, call_llm
def clean_json_string(s):
    return s.strip("```json").strip("```").strip()

# Global model loading (loaded once when module is imported)
print("Loading local embedding model for CV Matcher...")
embed_model = SentenceTransformer('all-MiniLM-L6-v2')
print("Model loaded.")

def extract_chunks(cv_text):
    raw_chunks = re.split(r'\n|•|-|\*', cv_text)
    chunks = [c.strip() for c in raw_chunks if len(c.strip()) > 15]
    return chunks

def verify_skills_batch(cv_text, skills_list, router):
    """
    If skills_list is empty, runs in extraction-only mode (no PART 1 verification).
    Always extracts new_skills_discovered and tools_used.
    """
    extraction_only = not skills_list

    if extraction_only:
        prompt = f"""Task: CV Intelligence Extraction

Here is the candidate's complete CV:
---
{cv_text}
---

Extract all skills, technologies, and tools mentioned in this CV.

Output ONLY a valid JSON object with this EXACT structure:
{{
  "verified_skills": {{}},
  "new_skills_discovered": ["Skill A", "Skill B"],
  "tools_used": ["Tool X", "Tool Y"]
}}

Rules:
- "new_skills_discovered": All notable skills, methodologies, competencies, and domain knowledge (e.g., "Machine Learning", "NLP", "Project Management", "Deep Learning").
- "tools_used": All named software, platforms, libraries, and frameworks (e.g., "Pandas", "Docker", "Tableau", "AWS").
- Keep the two lists SEPARATE. Do not mix tools into skills or vice versa.
"""
    else:
        prompt = f"""Task: Batch Skill Verification & Intelligence Extraction

Here is the candidate's complete CV:
---
{cv_text}
---

Your task has TWO parts:
PART 1: Verify the following required skills:
{', '.join(skills_list)}

CRITICAL RULES FOR PART 1:
1. Technical Tools & Software (e.g., BigQuery, Tableau, SQL): 
   - DO NOT INFER. Output NOT_FOUND unless the tool is explicitly named or a universally accepted synonym is present.
2. Soft Skills & Competencies (e.g., Problem Solving, Communication, Attention to detail, Statistics):
   - YOU MUST INFER. Read the achievements. 
   - E.g., "trained staff" -> Output PRESENT for Communication.
   - E.g., "automated a manual process" -> Output PRESENT for Problem Solving.

PART 2: Extract Market Intelligence
1. "new_skills_discovered": List any notable technical skills, methodologies, or soft skills the candidate has that are NOT in the required skills list.
2. "tools_used": List all software, platforms, or tools mentioned in the CV (e.g., Jira, AWS, Excel).

Output ONLY a valid JSON object matching this EXACT structure:
{{
  "verified_skills": {{
    "Skill1": "PRESENT",
    "Skill2": "UNCERTAIN",
    "Skill3": "NOT_FOUND"
  }},
  "new_skills_discovered": ["Skill A", "Skill B"],
  "tools_used": ["Tool X", "Tool Y"]
}}
"""
    import json
    import time
    from ai_worker import call_llm
    
    retries = 10
    for attempt in range(retries):
        try:
            key, provider = router.get_best_available_key(task_type='extraction')
            if not key:
                raise Exception("Rate limit reached. Please wait 1 minute before trying again.")
            raw_res = call_llm(prompt, key, provider)
            # Need a robust clean json function inline or imported, but we can assume clean_json_string is globally available in cv_matcher.py
            parsed = json.loads(clean_json_string(raw_res))
            
            verified_skills = parsed.get("verified_skills", {})
            new_skills_discovered = parsed.get("new_skills_discovered", [])
            tools_used = parsed.get("tools_used", [])
            
            # Ensure all skills are mapped
            for s in skills_list:
                if s not in verified_skills:
                    verified_skills[s] = "NOT_FOUND"
                    
            router.mark_key_success(key)
            return verified_skills, new_skills_discovered, tools_used, provider
        except Exception as e:
            if 'key' in locals() and key:
                print(f"Marking key {key[:10]} (Provider: {provider}) as failure due to {e}")
                router.mark_key_failure(key, retry_after=15)
            print(f"Batch LLM Verification attempt {attempt+1} failed: {e}")
            if attempt == retries - 1:
                raise Exception("API Keys are rate limited or failing. Please wait before retrying.")

def match_cv_to_job(cv_text, job_id, custom_skills=None, router=None):
    from config_manager import ConfigManager
    ConfigManager.log_event("CV_MATCH", f"Starting CV Match for job {job_id[:8] if job_id else 'market-eval'}")
    
    if custom_skills:
        skills = custom_skills
    else:
        conn = psycopg2.connect('postgresql://egypt_jobs:egypt_jobs_2026@localhost:5432/egypt_jobs_db')
        cur = conn.cursor()
        cur.execute("""
            SELECT s.name 
            FROM skills s
            JOIN job_skills js ON s.id = js.skill_id
            WHERE js.job_id = %s
        """, (job_id,))
        skills = [row[0] for row in cur.fetchall()]
        conn.close()

    if router is None:
        router = SmartAPIRouter()
    results = {}
    total_score = 0
    
    # Check for unreadable/image CV
    if len(cv_text.strip()) < 100:
        return {
            "job_id": job_id,
            "required_skills": len(skills),
            "overall_match_percentage": 0.0,
            "skill_breakdown": {s: 0.0 for s in skills},
            "error": "CV text is empty or unreadable. The PDF appears to be an image or is corrupted."
        }
        
    chunks = extract_chunks(cv_text)
    if not chunks:
        chunks = [cv_text]
        
    chunk_embeddings = embed_model.encode(chunks)
    skills_to_verify = []
    
    cv_clean = re.sub(r'\s+', ' ', cv_text)
    cv_clean_lower = cv_clean.lower()
    
    for skill in skills:
        escaped_skill = re.escape(skill)
        skill_lower = skill.lower()
        
        if re.search(r'\b' + escaped_skill + r'\b', cv_clean, re.IGNORECASE):
            results[skill] = 100.0
            total_score += 1.0
        elif skill_lower in cv_clean_lower and len(skill_lower) > 3:
            results[skill] = 100.0
            total_score += 1.0
        else:
            skills_to_verify.append(skill)
            
    llm_provider = "Local (Regex Only)"
    if skills_to_verify:
        verification_results, new_skills, tools_used, llm_provider = verify_skills_batch(cv_text, skills_to_verify, router)
        
        # Log to DB for feedback loop
        try:
            from sqlalchemy import create_engine, text
            from database import PG_URL
            import json
            engine = create_engine(PG_URL)
            with engine.connect() as conn:
                for skill in skills_to_verify:
                    decision = verification_results.get(skill, "NOT_FOUND")
                    evidence = json.dumps(["Full CV Context Provided"])
                    conn.execute(text('''
                        INSERT INTO ai_verification_logs (session_id, target_role, skill_name, evidence, ai_decision, llm_provider)
                        VALUES (:session_id, :target_role, :skill_name, :evidence, :ai_decision, :llm_provider)
                    '''), {
                        "session_id": "anon", 
                        "target_role": str(job_id) if job_id else "market-eval",
                        "skill_name": skill,
                        "evidence": evidence,
                        "ai_decision": str(decision),
                        "llm_provider": llm_provider
                    })
                
                # Market Intelligence System Log
                if new_skills or tools_used:
                    conn.execute(text('''
                        INSERT INTO cv_intelligence_records (session_id, target_role, extracted_new_skills, tools_used)
                        VALUES (:session_id, :target_role, :extracted_new_skills, :tools_used)
                    '''), {
                        "session_id": "anon",
                        "target_role": str(job_id) if job_id else "market-eval",
                        "extracted_new_skills": json.dumps(new_skills),
                        "tools_used": json.dumps(tools_used)
                    })
                
                # === KNOWLEDGE GRAPH: Real-time update on every CV upload ===
                # 1. Update skill supply trends (time-series)
                for skill in new_skills:
                    conn.execute(text('''
                        INSERT INTO market_skill_trends (skill_name, period_type, period_date, supply_count)
                        VALUES (:skill, 'monthly', date_trunc('month', CURRENT_DATE), 1)
                        ON CONFLICT (skill_name, period_type, period_date)
                        DO UPDATE SET supply_count = market_skill_trends.supply_count + 1
                    '''), {"skill": skill})
                
                # 2. Update Tool -> Skill co-occurrence graph
                for tool in tools_used:
                    for skill in new_skills:
                        conn.execute(text('''
                            INSERT INTO skill_tool_relationships (tool_name, related_skill, co_occurrence_count, last_seen)
                            VALUES (:tool, :skill, 1, CURRENT_DATE)
                            ON CONFLICT (tool_name, related_skill)
                            DO UPDATE SET 
                                co_occurrence_count = skill_tool_relationships.co_occurrence_count + 1,
                                last_seen = CURRENT_DATE
                        '''), {"tool": tool, "skill": skill})
                    
                conn.commit()
        except Exception as e:
            print("Failed to log verification:", e)

        for skill in skills_to_verify:
            decision = verification_results.get(skill, "NOT_FOUND")
            if isinstance(decision, str):
                decision = decision.upper()
                
            if decision == "PRESENT":
                results[skill] = 100.0
                total_score += 1.0
            elif decision == "UNCERTAIN":
                results[skill] = 30.0
                total_score += 0.3
            else:
                results[skill] = 0.0
                
    final_match_percentage = round((total_score / max(1, len(skills))) * 100, 2)
    
    return {
        "job_id": job_id,
        "required_skills": len(skills),
        "overall_match_percentage": final_match_percentage,
        "skill_breakdown": results,
        "llm_provider": llm_provider
    }

if __name__ == '__main__':
    print("Syntax OK")
