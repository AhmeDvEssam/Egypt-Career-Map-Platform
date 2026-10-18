from fastapi import FastAPI, Depends, HTTPException, Query, UploadFile, File, Form, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse
from sqlalchemy.orm import Session
from sqlalchemy import text, func, desc
from typing import List, Optional
import io
import json
import time
import os
import requests
import pandas as pd
from database import SessionLocal, get_db, engine
from models import Job, Skill, JobSkill
from pydantic import BaseModel
from ai_worker import SmartAPIRouter, build_ai_prompt, call_llm, clean_json_string
from sentence_transformers import SentenceTransformer
import uuid

app = FastAPI(title="Egypt Career Map AI Backend")

# Initialize Router Globally
ai_router = SmartAPIRouter()

print("Loading embedding model...")
embed_model = SentenceTransformer('all-MiniLM-L6-v2')


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def get_chat_llm_key():
    try:
        df = pd.read_excel("D:\\Hire Q Project\\API KEYS.xlsx")
        for _, row in df.iterrows():
            if pd.isna(row.get('Api key')): continue
            key = str(row['Api key']).strip()
            provider = str(row.get('provider', '')).lower()
            if 'groq' in provider:
                return key, 'groq'
            if 'deepseek' in provider:
                return key, 'deepseek'
    except Exception as e:
        print("Could not load API Key for Chat", e)
    return None, None

from typing import Optional, List

class ChatRequest(BaseModel):
    message: str
    
class ChatResponse(BaseModel):
    reply: str
    chart_config: Optional[dict] = None

@app.get("/")
def read_root():
    return {"message": "Welcome to Egypt's Career Map AI Backend"}

@app.post("/api/ai/chat", response_model=ChatResponse)
def ai_chat(request: ChatRequest, db: Session = Depends(get_db)):
    """
    Takes the user's natural language question, processes it, 
    and returns an answer + a JSON config to render a chart on the frontend.
    """
    user_msg = request.message
    
    # --- SEMANTIC CACHE ROUTER ---
    user_emb = None
    try:
        user_emb = embed_model.encode([user_msg])[0].tolist()
        cache_query = text("""
            SELECT question, intent, cosine_similarity(embedding, :user_emb) AS similarity
            FROM saved_questions
            WHERE cosine_similarity(embedding, :user_emb) > 0.90
            ORDER BY similarity DESC
            LIMIT 1
        """)
        result = db.execute(cache_query, {"user_emb": user_emb}).fetchone()
        
        if result:
            cached_intent = result[1]
            if isinstance(cached_intent, str):
                cached_intent = json.loads(cached_intent)
            reply_content = "زي ما طلبت، دي البيانات اللي بتدور عليها بناءً على بحثك:"
            return ChatResponse(reply=reply_content, chart_config=cached_intent)
    except Exception as e:
        print("Semantic Cache Error:", e)
    # -----------------------------
    
    active_statuses = ['Open', 'open', 'Active', 'active']
    
    total_jobs = db.query(func.count(Job.id)).filter(Job.status.in_(active_statuses)).scalar()
    cairo_jobs = db.query(func.count(Job.id)).filter(
        Job.location_normalized == 'Cairo', 
        Job.status.in_(active_statuses)
    ).scalar()
    
    sources = db.query(Job.source, func.count(Job.id)).filter(Job.status.in_(active_statuses)).group_by(Job.source).all()
    source_stats_str = ", ".join([f"{s[0]}: {s[1]}" for s in sources if s[0]])
    
    system_prompt = f"""
    You are an expert AI Career Coach and Market Analyst for Egypt.
    
    LIVE DATA CONTEXT:
    - Total Jobs in Database: {total_jobs}
    - Jobs in Cairo: {cairo_jobs}
    - Source Breakdown: {source_stats_str}
    
    If the user asks for specific market analysis (like job counts in a city, or top skills for a role), you MUST NEVER output any conversational text outside the JSON. You MUST ONLY output a JSON block. DO NOT say "Hello" or anything else outside the JSON block. Just the JSON block. If the user asks a conversational question or you need to include a "reply" in the JSON, you MUST write the reply in the SAME LANGUAGE as the user (English if they wrote English, Arabic if Arabic). Make sure to accurately extract the requested city in English (CRITICAL: Translate Arabic governorate names to English! الإسكندرية -> Alexandria, القاهرة -> Cairo, الجيزة -> Giza, الدقهلية -> Dakahlia) (e.g., if user says "الإسكندرية", extract "Alexandria"; if "القاهرة", extract "Cairo"; if "الجيزة", extract "Giza").
    
    Available Intents:
    1. job_count (for questions about number of jobs or salaries)
    2. top_skills (for questions about skills needed)
    
    For BOTH intents, you MUST extract any of the following parameters if the user mentions them:
       - parameters: {{"city": "string (optional in English)", "role": "string (optional in English)"}}
    
    You MUST include a friendly, conversational 'reply' in Egyptian Arabic inside the JSON.
    
    Example response 1:
    ```json
    {{
      "reply": "طبعاً! لقيتلك شوية وظايف كويسة جداً لـ Data Analyst في إسكندرية، بص كده على الخريطة.",
      "intentId": "job_count",
      "parameters": {{
        "city": "Alexandria",
        "role": "Data Analyst"
      }}
    }}
    ```
    
    Example response 2:
    ```json
    {{
      "reply": "أهم المهارات المطلوبة حالياً لـ Software Engineer في مصر هي دي، ركز عليها جداً في الـ CV بتاعك.",
      "intentId": "top_skills",
      "parameters": {{
        "role": "Software Engineer"
      }}
    }}
    ```
    Keep the JSON fully compliant. If the user just says "Hello" or asks a general non-market question, you can reply normally in Egyptian Arabic WITHOUT JSON. But for MARKET QUERIES, output ONLY JSON containing the 'reply', 'intentId', and 'parameters'.
    """
    
    key, provider = ai_router.get_best_available_key(task_type='extraction')
    if not key:
        raise HTTPException(status_code=500, detail="No LLM API key available.")
        
    try:
        reply_content = call_llm(system_prompt + "\n\nUser Question: " + user_msg, key, provider)
        ai_router.mark_key_success(key)
        
        chart_config = None
        cleaned_json = clean_json_string(reply_content)
        try:
            parsed = json.loads(cleaned_json)
            if "intentId" in parsed:
                chart_config = parsed
                reply_content = parsed.get("reply", "")
        except Exception as e:
            print("Failed to parse chart JSON:", e)
            
        if chart_config and user_emb:
            try:
                insert_query = text("""
                    INSERT INTO saved_questions (id, question, intent, embedding)
                    VALUES (:id, :question, :intent, :embedding)
                """)
                db.execute(insert_query, {
                    "id": str(uuid.uuid4()),
                    "question": user_msg,
                    "intent": json.dumps(chart_config),
                    "embedding": user_emb
                })
                db.commit()
            except Exception as e:
                print("Failed to save new question:", e)
                db.rollback()
                
        return ChatResponse(reply=reply_content, chart_config=chart_config)
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/ai/stt")
async def ai_stt(audio: UploadFile = File(...)):
    # Extract audio and use Groq Whisper
    try:
        import requests
        # Find a Groq key from router
        groq_key = None
        for key, state in ai_router.provider_state.items():
            if 'groq' in state.get('provider', '').lower():
                groq_key = key
                break
                
        if not groq_key:
            raise HTTPException(status_code=500, detail="No Groq key available for STT")
            
        audio_bytes = await audio.read()
        
        url = "https://api.groq.com/openai/v1/audio/transcriptions"
        headers = {"Authorization": f"Bearer {groq_key}"}
        files = {
            "file": (audio.filename, audio_bytes, audio.content_type),
        }
        data = {
            "model": "whisper-large-v3",
            "language": "ar"
        }
        
        resp = requests.post(url, headers=headers, files=files, data=data)
        resp.raise_for_status()
        
        return {"text": resp.json().get("text", "")}
    except Exception as e:
        print("STT Error:", e)
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/cv/analyze")
async def analyze_cv(file: UploadFile = File(...), target_role: Optional[str] = Form(None), db: Session = Depends(get_db)):
    """
    Analyzes an uploaded CV PDF.
    Step 1: Uses LLM to guess the Job Title (if not provided).
    Step 2: Uses Hybrid CV Matcher (Reranker) to score the skills.
    """
    import fitz
    from cv_matcher import match_cv_to_job
    
    # 1. Read PDF
    try:
        pdf_bytes = await file.read()
        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
        cv_text = ""
        for page in doc:
            cv_text += page.get_text() + "\n"
        doc.close()
        
        # OCR Fallback for Flattened/Image PDFs
        if len(cv_text.strip()) < 100:
            print("PDF text is empty or too short. Falling back to EasyOCR...")
            import pypdfium2 as pdfium
            import easyocr
            import numpy as np
            
            reader = easyocr.Reader(['en'], verbose=False)
            pdf = pdfium.PdfDocument(pdf_bytes)
            full_text = []
            for i in range(len(pdf)):
                page = pdf[i]
                bitmap = page.render(scale=2)  # Scale for better OCR resolution
                pil_image = bitmap.to_pil()
                img_array = np.array(pil_image)
                results = reader.readtext(img_array, detail=0)
                full_text.append('\n'.join(results))
            cv_text = '\n'.join(full_text)
            print("OCR Extraction Complete. Text length:", len(cv_text))
            
        if not cv_text.strip():
            raise HTTPException(status_code=400, detail="PDF contains no readable text, even after OCR.")
            
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to read PDF: {e}")
        
    cv_text = cv_text[:10000] 
    inferred_role = target_role

    # 2. Use LLM to infer Job Title if not provided
    if not inferred_role:
        filename = file.filename if file.filename else ""
        
        # Try to guess from filename first using a very cheap regex/logic or small LLM prompt
        prompt = f"""
You are an expert HR AI. Extract the job title from this CV text. 
If the text is a filename, try to find the job title in it (e.g., 'Ahmed_Essam(DataAnalyst).pdf' -> 'Data Analyst').
If it's CV text, read the summary/profile and extract the exact Job Title.
Keep it simple (e.g., 'Data Engineer', 'Accountant'). Output ONLY JSON: {{"inferred_role": "Title"}}

TEXT:
{filename}
{cv_text[:1000]}
"""
        attempts = 0
        while attempts < 5 and not inferred_role:
            key, provider = ai_router.get_best_available_key(task_type='extraction')
            if not key:
                import time
                time.sleep(1)
                attempts += 1
                continue
            try:
                raw_response = call_llm(prompt, key, provider)
                cleaned_json = clean_json_string(raw_response)
                import json
                parsed = json.loads(cleaned_json)
                inferred_role = parsed.get("inferred_role", "Software Engineer")
                ai_router.mark_key_success(key)
            except:
                ai_router.mark_key_failure(key, retry_after=10)
                attempts += 1
                
        if not inferred_role:
            inferred_role = "Data Analyst" # Ultimate fallback if all APIs are dead, do not crash.

    # 3. Fetch Market Skills for Target Role
    query = text("""
        SELECT s.name, COUNT(js.job_id) as demand
        FROM skills s
        JOIN job_skills js ON s.id = js.skill_id
        JOIN jobs j ON j.id = js.job_id
        WHERE j.title_raw ILIKE :role OR j.title_normalized ILIKE :role
        GROUP BY s.id, s.name
        HAVING COUNT(js.job_id) > 1
        ORDER BY demand DESC
        LIMIT 20
    """)
    market_res = db.execute(query, {"role": f"%{inferred_role}%"}).fetchall()
    market_skills = [{"name": row[0], "demand": row[1]} for row in market_res]
    
    if not market_skills:
        first_word = inferred_role.split()[0]
        if len(first_word) > 2:
            query = text("""
                SELECT s.name, COUNT(js.job_id) as demand
                FROM skills s
                JOIN job_skills js ON s.id = js.skill_id
                JOIN jobs j ON j.id = js.job_id
                WHERE j.title_raw ILIKE :role OR j.title_normalized ILIKE :role
                GROUP BY s.id, s.name
                HAVING COUNT(js.job_id) > 1
                ORDER BY demand DESC
                LIMIT 20
            """)
            market_res = db.execute(query, {"role": f"%{first_word}%"}).fetchall()
            market_skills = [{"name": row[0], "demand": row[1]} for row in market_res]
            
    if not market_skills:
        # Fallback to general top skills
        query = text("""
            SELECT s.name, COUNT(js.job_id) as demand
            FROM skills s
            JOIN job_skills js ON s.id = js.skill_id
            GROUP BY s.id, s.name
            ORDER BY demand DESC
            LIMIT 20
        """)
        market_res = db.execute(query).fetchall()
        market_skills = [{"name": row[0], "demand": row[1]} for row in market_res]

    # 4. Run Hybrid Matcher
    skill_names = [m["name"] for m in market_skills]
    try:
        match_result = match_cv_to_job(cv_text, job_id="market-eval", custom_skills=skill_names, router=ai_router)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
        
    if "error" in match_result:
        raise HTTPException(status_code=500, detail=match_result["error"])
        
    # 5. Format Output for Frontend
    top_marketable = []
    missing_skills = []
    
    skill_scores = match_result["skill_breakdown"]
    
    cv_text_lower = cv_text.lower()
    
    for m in market_skills:
        skill_name = m["name"]
        skill_name_lower = skill_name.lower()
        score = skill_scores.get(skill_name, 0)
        
        # 1. Exact Text Match (Bulletproof Ctrl+F)
        is_exact_match = False
        
        import re
        cv_clean = re.sub(r'\s+', ' ', cv_text_lower)
        # Escape the skill name to avoid regex errors, then wrap in word boundaries
        pattern = r"\b" + re.escape(skill_name_lower) + r"\b"
        if re.search(pattern, cv_clean):
            is_exact_match = True
        elif skill_name_lower in cv_clean and len(skill_name_lower) > 3:
            # Fallback for multi-word or non-standard characters
            is_exact_match = True
            
        # 2. Semantic Match (Reranker)
        # If not exact match, maybe the Reranker found strong semantic evidence (> 40%)
        is_semantic_match = score > 40.0
        
        if is_exact_match or is_semantic_match:
            top_marketable.append(m)
        else:
            missing_skills.append(m)
            
    final_score = 0
    if len(market_skills) > 0:
        final_score = int((len(top_marketable) / len(market_skills)) * 100)
        
    try:
        import json
        db.execute(text('''
            INSERT INTO candidate_vectors (session_id, target_role, readiness_score, top_skills, missing_skills)
            VALUES (:session_id, :target_role, :readiness_score, :top_skills, :missing_skills)
        '''), {
            "session_id": "anon",
            "target_role": inferred_role,
            "readiness_score": final_score,
            "top_skills": json.dumps([m["name"] for m in top_marketable]),
            "missing_skills": json.dumps([m["name"] for m in missing_skills])
        })
        db.commit()
    except Exception as e:
        print("Failed to insert candidate vector:", e)

    return {
        "readiness_score": final_score,
        "target_role": inferred_role,
        "top_marketable": top_marketable,
        "missing_skills": missing_skills,
        "llm_provider": match_result.get("llm_provider", "Unknown"),
        "raw_cv_skills": [] 
    }


from cv_matcher import match_cv_to_job
import fitz

@app.post("/api/cv/match-job")
async def match_cv_to_job_endpoint(
    job_id: str = Form(...),
    file: UploadFile = File(...)
):
    """
    Hybrid CV Matcher: Compares a CV PDF against a specific job's skills using AI Rerankers.
    """
    try:
        pdf_bytes = await file.read()
        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
        cv_text = ""
        for page in doc:
            cv_text += page.get_text() + "\n"
        doc.close()
        
        # OCR Fallback for Flattened/Image PDFs
        if len(cv_text.strip()) < 100:
            print("PDF text is empty or too short. Falling back to EasyOCR...")
            import pypdfium2 as pdfium
            import easyocr
            import numpy as np
            
            reader = easyocr.Reader(['en'], verbose=False)
            pdf = pdfium.PdfDocument(pdf_bytes)
            full_text = []
            for i in range(len(pdf)):
                page = pdf[i]
                bitmap = page.render(scale=2)  # Scale for better OCR resolution
                pil_image = bitmap.to_pil()
                img_array = np.array(pil_image)
                results = reader.readtext(img_array, detail=0)
                full_text.append('\n'.join(results))
            cv_text = '\n'.join(full_text)
            print("OCR Extraction Complete. Text length:", len(cv_text))
            
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to read PDF: {str(e)}")
        
    if not cv_text.strip():
        raise HTTPException(status_code=400, detail="PDF contains no readable text, even after OCR.")
        
    try:
        match_result = match_cv_to_job(cv_text, job_id)
        if 'error' in match_result:
            raise HTTPException(status_code=404, detail=match_result['error'])
        return match_result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Matcher failed: {str(e)}")
@app.get('/dashboard', response_class=HTMLResponse)
async def dashboard_ui():
    html = """
    <!DOCTYPE html>
    <html lang='en'>
    <head>
        <meta charset='UTF-8'>
        <meta name='viewport' content='width=device-width, initial-scale=1.0'>
        <title>HireQ AI Dashboard</title>
        <script src='https://cdn.tailwindcss.com'></script>
        <style>
            body { background-color: #0f172a; color: #f8fafc; font-family: monospace; }
            .card { background-color: #1e293b; border-radius: 8px; padding: 1rem; border: 1px solid #334155; }
            .active-dot { height: 10px; width: 10px; background-color: #22c55e; border-radius: 50%; display: inline-block; }
            .idle-dot { height: 10px; width: 10px; background-color: #64748b; border-radius: 50%; display: inline-block; }
            .limit-dot { height: 10px; width: 10px; background-color: #eab308; border-radius: 50%; display: inline-block; }
        </style>
    </head>
    <body class='p-6'>
        <div class='max-w-7xl mx-auto'>
            <h1 class='text-3xl font-bold mb-6 text-blue-400'>⚡ Egypt Career Map - AI Worker Live Dashboard</h1>
            
            <div class='grid grid-cols-1 lg:grid-cols-3 gap-6'>
                <div class='lg:col-span-2 space-y-6'>
                    <div class='card' id='progress-card'>
                        <h2 class='text-xl font-semibold mb-4 text-orange-400'>🔥 Job Processing Progress</h2>
                        <div class='w-full bg-slate-700 rounded-full h-6 mb-2 overflow-hidden'>
                            <div id='progress-bar' class='bg-blue-500 h-6' style='width: 0%'></div>
                        </div>
                        <div class='flex justify-between text-sm text-slate-300' id='progress-stats'>
                            Loading stats...
                        </div>
                    </div>
                    
                    <div class='card'>
                        <h2 class='text-xl font-semibold mb-4 text-green-400'>📡 Quota-Aware API Router</h2>
                        <div class='overflow-x-auto'>
                            <table class='w-full text-left text-sm'>
                                <thead class='border-b border-slate-600 text-slate-400'>
                                    <tr>
                                        <th class='pb-2'>PROVIDER</th>
                                        <th class='pb-2'>RPM</th>
                                        <th class='pb-2'>TOKENS</th>
                                        <th class='pb-2'>SUCCESS</th>
                                        <th class='pb-2'>FAILS</th>
                                        <th class='pb-2'>STATUS</th>
                                    </tr>
                                </thead>
                                <tbody id='api-table' class='divide-y divide-slate-700/50'>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
                
                <div class='card'>
                    <h2 class='text-xl font-semibold mb-4 text-purple-400'>🧠 Active Models & Layers</h2>
                    
                    <div class='mb-6'>
                        <h3 class='text-md text-slate-400 mb-2'>[ LLM Extraction Layer ]</h3>
                        <ul class='space-y-1 text-sm'>
                            <li><span class='text-blue-300'>SambaNova:</span> Llama-3.3-70B-Inst</li>
                            <li><span class='text-blue-300'>Groq:</span> Llama-3.1-8B (Proxy)</li>
                            <li><span class='text-blue-300'>Gemini:</span> Gemini-3.1-Flash-Lite</li>
                            <li><span class='text-blue-300'>Cohere:</span> Command-R-Plus</li>
                            <li><span class='text-blue-300'>Together:</span> Llama-3.3-70B</li>
                            <li><span class='text-blue-300'>OpenRouter:</span> Gemini-2.5-Flash</li>
                            <li><span class='text-blue-300'>ZhipuAI:</span> GLM-4-Flash</li>
                            <li><span class='text-blue-300'>HuggingFace:</span> Llama-3.1-8B</li>
                            <li><span class='text-blue-300'>Mistral AI:</span> Open-Mistral-Nemo</li>
                            <li><span class='text-blue-300'>NVIDIA NIM:</span> Llama-3.2-11B-Vision</li>
                        </ul>
                    </div>
                    
                    <div>
                        <h3 class='text-md text-slate-400 mb-2'>[ Classifier / Reranker Layer ]</h3>
                        <ul class='space-y-1 text-sm'>
                            <li><span class='text-teal-300'>Voyage AI:</span> Rerank-2</li>
                            <li><span class='text-teal-300'>Jina AI:</span> Jina-Reranker-v2-Base</li>
                            <li><span class='text-teal-300'>Cohere:</span> Rerank-Multilingual-v3</li>
                        </ul>
                    </div>
                </div>
            </div>
            
            <div style="display: flex; gap: 20px; margin-top: 20px;">
                <div class="card" style="flex: 1;">
                    <h3 style="font-size: 0.85rem; color: #94a3b8; text-transform: uppercase;">⚡ Worker Speed Control</h3>
                    <div style="display: flex; gap: 12px; align-items: center; margin-top: 14px; flex-wrap: wrap;">
                        <div>
                            <label style="font-size: 0.75rem; color: #64748b; display: block; margin-bottom: 4px;">Speed Mode</label>
                            <select id="speed-select" style="background: #1e293b; color: #e2e8f0; border: 1px solid #334155; border-radius: 6px; padding: 6px 10px; font-size: 0.9rem;">
                                <option value="slow">🐢 Slow</option>
                                <option value="medium">🚗 Medium</option>
                                <option value="fast" selected>🚀 Fast</option>
                                <option value="max">⚡ Max</option>
                            </select>
                        </div>
                        <div>
                            <label style="font-size: 0.75rem; color: #64748b; display: block; margin-bottom: 4px;">Threads</label>
                            <input id="threads-input" type="number" min="1" max="50" value="15" style="width: 70px; background: #1e293b; color: #e2e8f0; border: 1px solid #334155; border-radius: 6px; padding: 6px 10px; font-size: 0.9rem;">
                        </div>
                        <div style="margin-top: 18px;">
                            <button id="save-btn" onclick="saveConfig()" style="background: #3b82f6; color: white; border: none; border-radius: 6px; padding: 7px 18px; font-size: 0.9rem; cursor: pointer; font-weight: 600; transition: background 0.2s;">Apply</button>
                        </div>
                    </div>
                    <div style="font-size: 0.75rem; color: #64748b; margin-top: 10px;">Config is saved to file. Restart the worker BAT to apply.</div>
                </div>
                <div class="card" style="flex: 1;">
                    <h3 style="font-size: 0.85rem; color: #94a3b8; text-transform: uppercase;">Model Layer Usage</h3>
                    <div style="display: flex; justify-content: space-between; font-size: 1.2rem; font-weight: bold; margin-top: 10px;">
                        <div style="color: #4ade80;"><span id="llm-calls">0</span><br><span style="font-size: 0.8rem; color: #94a3b8; font-weight: normal;">LLM Generations</span></div>
                        <div style="color: #60a5fa; text-align: right;"><span id="classifier-calls">0</span><br><span style="font-size: 0.8rem; color: #94a3b8; font-weight: normal;">Classifier Validations</span></div>
                    </div>
                </div>
                <div class="card" style="flex: 1;">
                    <h3 style="font-size: 0.85rem; color: #94a3b8; text-transform: uppercase;">Free Trial Quotas</h3>
                    <div class="progress-container" style="margin-top: 15px;">
                        <div class="progress-bar" id="quota-bar" style="width: 0%; background: linear-gradient(90deg, #a855f7, #ec4899);"></div>
                    </div>
                    <div style="display: flex; justify-content: space-between; font-size: 0.8rem; color: #94a3b8; margin-top: 5px;" id="quota-stats">
                        <span>Tokens Used: 0</span>
                        <span>Available Trial Limit: 0</span>
                    </div>
                    <div style="font-size: 0.75rem; color: #64748b; margin-top: 10px;">
                        *Forever Free models (Groq, Gemini, SambaNova, Cohere, Zhipu, HuggingFace) are excluded from this limit.
                    </div>
                </div>
            </div>
        </div>

        <script>
            async function fetchData() {
                try {
                    const res = await fetch('/api/dashboard-stats');
                    const data = await res.json();
                    
                    const total = data.total_jobs || 1;
                    const analyzed = data.analyzed_jobs || 0;
                    const pending = data.pending_jobs || 0;
                    const pct = ((analyzed / total) * 100).toFixed(1);
                    
                    document.getElementById('progress-bar').style.width = pct + '%';
                    document.getElementById('progress-stats').innerHTML = `
                        <span>Analyzed: ${analyzed.toLocaleString()}</span>
                        <span>Pending: ${pending.toLocaleString()}</span>
                        <span>Skills Extracted: ${data.total_skills.toLocaleString()}</span>
                    `;
                    
                    document.getElementById('llm-calls').textContent = (data.llm_calls || 0).toLocaleString();
                    document.getElementById('classifier-calls').textContent = (data.classifier_calls || 0).toLocaleString();
                    
                    const tokensUsed = data.tokens_used || 0;
                    const trialLimit = data.free_trial_tokens_limit || 260000000;
                    const quotaPct = Math.min(100, (tokensUsed / trialLimit) * 100).toFixed(2);
                    
                    document.getElementById('quota-bar').style.width = quotaPct + '%';
                    document.getElementById('quota-stats').innerHTML = `
                        <span>Tokens Used: ${tokensUsed.toLocaleString()}</span>
                        <span>Available Trial Limit: ${trialLimit.toLocaleString()}</span>
                    `;

                    const table = document.getElementById('api-table');
                    if (data.ai_metrics && Object.keys(data.ai_metrics).length > 0) {
                        let rows = '';
                        let i = 1;
                        let lastProvider = '';
                        
                        const sortedKeys = Object.keys(data.ai_metrics).sort((a, b) => {
                            const pA = (data.ai_metrics[a].provider || '').toLowerCase();
                            const pB = (data.ai_metrics[b].provider || '').toLowerCase();
                            if (pA < pB) return -1;
                            if (pA > pB) return 1;
                            return 0;
                        });

                        for (const k of sortedKeys) {
                            const v = data.ai_metrics[k];
                            const provider = (v.provider || 'UNKNOWN').toUpperCase();
                            
                            if (provider !== lastProvider) {
                                i = 1;
                                lastProvider = provider;
                            }
                            const name = `${provider} (Key ${i++})`;

                            let status = '<span class="px-2 py-1 bg-gray-700 text-gray-300 rounded-full text-xs">IDLE</span>';
                            if (v.cooldown > 3000) {
                                status = '<span class="px-2 py-1 bg-red-900/50 text-red-400 rounded-full text-xs">ERROR</span>';
                            } else if (v.cooldown > 0) {
                                status = `<span class="px-2 py-1 bg-yellow-900/50 text-yellow-400 rounded-full text-xs">LIMIT (${v.cooldown}s)</span>`;
                            } else if (v.rpm > 0 || v.success > 0) {
                                status = '<span class="px-2 py-1 bg-emerald-900/50 text-emerald-400 rounded-full text-xs border border-emerald-800">ACTIVE</span>';
                            }

                            rows += `
                                <tr class="hover:bg-gray-700/20 transition-colors">
                                    <td class="px-6 py-3 font-medium text-gray-300">${name}</td>
                                    <td class="px-6 py-3"><span class="text-blue-400 font-mono">${v.rpm || 0}</span></td>
                                    <td class="px-6 py-3"><span class="text-purple-400 font-mono">${(v.tokens || 0).toLocaleString()}</span></td>
                                    <td class="px-6 py-3 text-emerald-400">${v.success || 0}</td>
                                    <td class="px-6 py-3 text-red-400">${v.fails || 0}</td>
                                    <td class="px-6 py-3 text-right">${status}</td>
                                </tr>
                            `;
                        }
                        table.innerHTML = rows;
                    }

                } catch(e) {
                    console.error(e);
                }
            }

            async function loadConfig() {
                const res = await fetch('/api/worker-config');
                const cfg = await res.json();
                document.getElementById('speed-select').value = cfg.speed || 'fast';
                document.getElementById('threads-input').value = cfg.threads || 15;
            }

            async function saveConfig() {
                const speed = document.getElementById('speed-select').value;
                const threads = parseInt(document.getElementById('threads-input').value);
                const btn = document.getElementById('save-btn');
                btn.textContent = 'Saving...';
                btn.disabled = true;
                const res = await fetch('/api/set-speed', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({speed, threads})
                });
                const data = await res.json();
                btn.textContent = data.status === 'ok' ? '✓ Saved! Restart Worker' : 'Error!';
                btn.style.background = data.status === 'ok' ? '#16a34a' : '#dc2626';
                setTimeout(() => {
                    btn.textContent = 'Apply';
                    btn.disabled = false;
                    btn.style.background = '';
                }, 3000);
            }

            fetchData();
            loadConfig();
            setInterval(fetchData, 3000);
        </script>
    </body>
    </html>
    """
    return HTMLResponse(content=html)

@app.get('/api/dashboard-stats')
async def get_dashboard_stats(db: Session = Depends(get_db)):
    try:
        total_jobs = db.execute(text("SELECT count(*) FROM jobs WHERE source not ilike '%indeed%'")).scalar() or 1
        analyzed_jobs = db.execute(text("SELECT count(*) FROM jobs WHERE ai_analyzed = TRUE AND source not ilike '%indeed%'")).scalar() or 0
        pending_jobs = total_jobs - analyzed_jobs
        total_skills = db.execute(text("SELECT count(*) FROM job_skills")).scalar() or 0
        
        metrics_path = "live_metrics.json"
        ai_metrics = {}
        if os.path.exists(metrics_path):
            try:
                with open(metrics_path, "r") as f:
                    ai_metrics = json.load(f)
            except: pass

        classifier_calls = 0
        llm_calls = 0
        tokens_used = 0
        
        for k, v in ai_metrics.items():
            if v.get('cooldown_until'):
                v['cooldown'] = max(0, v['cooldown_until'] - time.time())
            else:
                v['cooldown'] = 0
            
            p = str(v.get('provider', '')).lower()
            if 'jina' in p or 'voyage' in p:
                classifier_calls += v.get('success', 0)
            else:
                llm_calls += v.get('success', 0)
                
            tokens_used += v.get('tokens', 0)

        # Free Trial Tokens Limits
        # Voyage AI: 50M per key * 5 = 250,000,000
        # Jina AI: 1M per key * 10 = 10,000,000
        # Total trial tokens: 260,000,000
        free_trial_tokens_limit = 260000000

        return {
            "total_jobs": total_jobs,
            "analyzed_jobs": analyzed_jobs,
            "pending_jobs": pending_jobs,
            "total_skills": total_skills,
            "classifier_calls": classifier_calls,
            "llm_calls": llm_calls,
            "tokens_used": tokens_used,
            "free_trial_tokens_limit": free_trial_tokens_limit,
            "ai_metrics": ai_metrics
        }
    except Exception as e:
        return {"error": str(e)}

@app.post('/api/set-speed')
async def set_speed(request: Request):
    try:
        body = await request.json()
        speed = body.get('speed', 'fast')
        threads = body.get('threads', 15)
        if speed not in ('slow', 'medium', 'fast', 'max'):
            return {"error": "Invalid speed. Use: slow, medium, fast, max"}
        
        config = {"speed": speed, "threads": int(threads), "updated_at": time.time()}
        with open("worker_config.json", "w") as f:
            json.dump(config, f)
        return {"status": "ok", "speed": speed, "threads": threads, "message": f"Config saved. Restart worker to apply."}
    except Exception as e:
        return {"error": str(e)}

@app.get('/api/worker-config')
async def get_worker_config():
    try:
        if os.path.exists("worker_config.json"):
            with open("worker_config.json") as f:
                return json.load(f)
        return {"speed": "fast", "threads": 15}
    except:
        return {"speed": "fast", "threads": 15}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
