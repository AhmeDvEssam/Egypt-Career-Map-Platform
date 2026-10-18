import os
import json
import time
import requests
import pandas as pd
from sqlalchemy import create_engine, text
from sqlalchemy.orm import Session
from database import PG_URL
from datetime import datetime
import re
import uuid
from sentence_transformers import SentenceTransformer, util

print("[*] Loading Semantic Burner Model (all-MiniLM-L6-v2)...")
st_model = SentenceTransformer('all-MiniLM-L6-v2')
anchor_text = "Job requirements, mandatory technical skills, required experience, programming languages, software tools, professional methodologies, auditing, problem solving."
anchor_emb = st_model.encode(anchor_text, convert_to_tensor=True)
print("[+] Semantic Burner Ready.")

engine = create_engine(PG_URL)

class SmartAPIRouter:
    # Provider capability tiers:
    #   Tier 1 (Strong): Zhipu GLM-4-Flash, Gemini 3.8 Flash — best for CV analysis & complex extraction
    #   Tier 2 (Medium): Groq Llama-4-Scout, Cohere Command, Together AI — good for skills extraction
    #   Tier 3 (Light):  OpenRouter (free), HuggingFace — good for simple normalization
    
    SUPPORTED_PROVIDERS = {'cleanapis', 'cloudflare', 'aionlabs', 'upstage', 'gemini', 'groq', 'zhipu', 'zhipuai', 'openrouter', 'cohere', 'hugging face', 'huggingface', 'deepseek', 'mistral', 'mistral ai', 'llm7', 'inceptionlabs', 'sambanova', 'sambanova ai', 'jina', 'jina ai', 'voyage', 'voyage ai', 'together', 'togther ai', 'together ai'}
    
    # Provider strength classification
    STRONG_PROVIDERS = {'gemini'}
    MEDIUM_PROVIDERS = {'cleanapis', 'groq', 'cohere', 'deepseek', 'zhipu', 'zhipuai', 'mistral', 'mistral ai', 'llm7', 'inceptionlabs', 'upstage', 'sambanova', 'sambanova ai', 'jina', 'jina ai', 'voyage', 'voyage ai', 'together', 'togther ai', 'together ai'}
    LIGHT_PROVIDERS = {'cleanapis', 'openrouter', 'hugging face', 'huggingface'}
    
    def __init__(self, excel_path="D:\\Hire Q Project\\API KEYS.xlsx", speed_mode='medium'):
        self.provider_state = {}
        
        # Define exact limits based on the user's Speed Strategy
        self.limit_profiles = {
            'slow': {
                'gemini': 5, 'groq': 15, 'zhipu': 20, 'zhipuai': 20,
                'cohere': 5, 'openrouter': 5, 'togther ai': 20, 'together ai': 20, 'runware': 100,
                'hugging face': 5, 'huggingface': 5, 'modelscope': 20, 'model scope': 20, 'deepseek': 30, 'jina': 30, 'jina ai': 30, 'jinaai': 30, 'sambanova': 20, 'sambanova ai': 20, 'voyage': 30, 'voyage ai': 30,
                'mistral': 20, 'mistral ai': 20, 'nvidia': 20, 'llm7': 20, 'llm7.io': 20, 'cleanapis': 60, 'cleanapis.com': 60
            },
            'medium': {
                'gemini': 10, 'groq': 25, 'zhipu': 45, 'zhipuai': 45,
                'cohere': 15, 'openrouter': 15, 'togther ai': 45, 'together ai': 45, 'runware': 200,
                'hugging face': 10, 'huggingface': 10, 'modelscope': 45, 'model scope': 45, 'deepseek': 80, 'jina': 80, 'jina ai': 80, 'jinaai': 80, 'sambanova': 45, 'sambanova ai': 45, 'voyage': 80, 'voyage ai': 80,
                'mistral': 50, 'mistral ai': 50, 'nvidia': 50, 'llm7': 50, 'llm7.io': 50, 'cleanapis': 80, 'cleanapis.com': 80
            },
            'fast': {
                'gemini': 13, 'groq': 28, 'zhipu': 58, 'zhipuai': 58,
                'cohere': 18, 'openrouter': 18, 'togther ai': 58, 'together ai': 58, 'runware': 300,
                'hugging face': 13, 'huggingface': 13, 'modelscope': 58, 'model scope': 58, 'deepseek': 95, 'jina': 95, 'jina ai': 95, 'jinaai': 95, 'sambanova': 75, 'sambanova ai': 75, 'voyage': 95, 'voyage ai': 95,
                'mistral': 80, 'mistral ai': 80, 'nvidia': 80, 'llm7': 80, 'llm7.io': 80, 'cleanapis': 120, 'cleanapis.com': 120
            },
            'max': {
                'gemini': 15, 'groq': 30, 'zhipu': 120, 'zhipuai': 120,
                'cohere': 20, 'openrouter': 20, 'togther ai': 60, 'together ai': 60, 'runware': 400,
                'hugging face': 15, 'huggingface': 15, 'modelscope': 60, 'model scope': 60, 'deepseek': 100, 'jina': 100, 'jina ai': 100, 'jinaai': 100, 'sambanova': 120, 'sambanova ai': 120, 'voyage': 100, 'voyage ai': 100,
                'mistral': 120, 'mistral ai': 120, 'nvidia': 120, 'llm7': 120, 'llm7.io': 120, 'cleanapis': 200, 'cleanapis.com': 200
            }
        }
        
        # Default to medium if an invalid speed is provided
        if speed_mode not in self.limit_profiles:
            speed_mode = 'medium'
            
        self.provider_limits = self.limit_profiles[speed_mode]
        print(f"[*] AI Router initialized in [{speed_mode.upper()}] speed mode.")
        
        self.load_keys_from_excel(excel_path)

    def load_keys_from_excel(self, path):
        try:
            df = pd.read_excel(path, engine='openpyxl')
            loaded_count = 0
            skipped = []
            for _, row in df.iterrows():
                if pd.isna(row.get('Api key')): continue
                key = str(row['Api key']).strip()
                provider = str(row.get('provider', '')).strip().lower()
                provider = self._normalize_provider(provider)
                
                # Skip unsupported providers
                if provider not in self.SUPPORTED_PROVIDERS:
                    skipped.append(provider)
                    continue
                
                # Check for expiration date
                expires_at = None
                if 'Expiration Date' in df.columns and not pd.isna(row.get('Expiration Date')):
                    try:
                        expires_at = pd.to_datetime(row['Expiration Date']).timestamp()
                    except:
                        pass
                
                self.provider_state[key] = {
                    "provider": provider, 
                    "cooldown_until": 0, 
                    "success_count": 0, 
                    "fail_count": 0,
                    "tokens_used_session": 0,
                    "tokens_used": 0,
                    "request_timestamps": [],
                    "expires_at": expires_at
                }
                loaded_count += 1
            
            if skipped:
                unique_skipped = set(skipped)
                print(f"[!] Skipped unsupported providers: {unique_skipped}")
            print(f"[+] Loaded {loaded_count} API keys with Quota-Aware capabilities.")
        except Exception as e:
            print(f"[!] Error loading API keys: {e}")

        # --- TOKEN TRACKING LOGIC ---
        self.rr_index = 0
        self.token_usage_path = "D:\\Hire Q Project\\Backend API & Integration\\token_usage.json"
        self._sync_token_usage()

    def _sync_token_usage(self):
        current_month = datetime.now().strftime("%Y-%m")
        try:
            with open(self.token_usage_path, "r") as f:
                data = json.load(f)
            if data.get("month") != current_month:
                data = {"month": current_month, "usage": {}}
        except:
            data = {"month": current_month, "usage": {}}
        
        # Apply loaded tokens to state
        for key in self.provider_state:
            if key in data["usage"]:
                self.provider_state[key]["tokens_used"] = data["usage"][key]
        
        with open(self.token_usage_path, "w") as f:
            json.dump(data, f)


    def _normalize_provider(self, provider):
        """Normalize provider name for comparison"""
        p = provider.lower().strip()
        if p in ('zhipu', 'zhipuai'): return 'zhipuai'
        if p in ('togther ai', 'together ai'): return 'together'
        if p in ('hugging face', 'huggingface'): return 'hugging face'
        if p in ('modelscope', 'model scope'): return 'modelscope'
        if p in ('jina', 'jina ai', 'jinaai'): return 'jina'
        if p in ('sambanova', 'sambanova ai'): return 'sambanova'
        if p in ('voyage', 'voyage ai'): return 'voyage'
        if p in ('llm7', 'llm7.io'): return 'llm7'
        if 'mistral' in p: return 'mistral ai'
        if 'nvidia' in p: return 'nvidia'
        if 'cloudflare' in p: return 'cloudflare'
        if 'upstage' in p: return 'upstage'
        if 'aion' in p: return 'aionlabs'
        if 'together' in p: return 'together ai'
        if 'cleanapis' in p: return 'cleanapis'
        if 'inceptionlabs' in p: return 'inceptionlabs'
        return p

    def get_best_available_key(self, task_type='extraction'):
        """
        task_type options:
          - 'cv_analysis': Complex task, needs strong model
          - 'extraction': Medium task
          - 'normalization': Light task
        """
        current_time = time.time()
        best_key = None
        best_score = -9999
        best_provider = None
        
        from config_manager import ConfigManager
        config = ConfigManager.load_config()
        speed_mode = config.get("global", {}).get("speed_mode", "medium")
        if speed_mode in self.limit_profiles:
            self.provider_limits = self.limit_profiles[speed_mode]
        
        import random
        candidates = []
        
        for key, state in self.provider_state.items():
            if current_time < state["cooldown_until"]:
                continue
            
            provider_norm = self._normalize_provider(state["provider"])
            
            # Check ConfigManager
            provider_config = config.get("providers", {}).get(provider_norm, {})
            if not provider_config.get("enabled", True):
                continue
            
            # PROTECT CLASSIFIER KEYS: Do not use Jina or Voyage for text extraction
            if task_type != 'classification' and provider_norm in ('jina', 'voyage'):
                continue
                
            # Proactive RPM check (Sliding Window of 60 seconds)
            state["request_timestamps"] = [ts for ts in state["request_timestamps"] if current_time - ts < 60]
            
            max_rpm = self.provider_limits.get(state["provider"], 15)
            
            if len(state["request_timestamps"]) >= max_rpm:
                continue # Rate limit reached for this key
                
            # Calculate Dynamic Score
            score = 0
            
            is_strong = state["provider"] in self.STRONG_PROVIDERS
            is_medium = state["provider"] in self.MEDIUM_PROVIDERS
            is_light = state["provider"] in self.LIGHT_PROVIDERS
            
            # 1. Task-Provider Match Score (most important)
            if task_type in ('cv_analysis', 'complex_extraction'):
                if is_strong:
                    score += 100  # Perfect: strong model for complex tasks
                elif is_medium:
                    score += 40  # Acceptable fallback
                else:
                    score += 10  # Last resort
            elif task_type == 'extraction':
                if is_strong:
                    score += 80  # Gemini is great for extraction too (Rank higher than Groq)
                elif is_medium:
                    score += 50  # Perfect: medium model for extraction
                else:
                    score += 20  # Light can do it but not ideal
            else:  # normalization
                if is_light:
                    score += 60  # Perfect: light model for normalization
                elif is_medium:
                    score += 50  # Good
                else:
                    score += 30  # Don't waste strong on normalization
            
            # 2. Expiration Urgency (Burn credits before they expire)
            if state["expires_at"]:
                days_left = (state["expires_at"] - current_time) / 86400
                if days_left < 7:
                    score += 100 # PANIC BURN
                elif days_left < 15:
                    score += 40
                    
            # 3. Rate limit headroom bonus (PERFECT RELATIVE LOAD BALANCING)
            # Use PERCENTAGE of available capacity, not absolute.
            # This ensures a provider with 15 max_rpm and 30 max_rpm are treated equally
            # when empty, firing them in perfect parallel round-robin!
            available_pct = max(0.0, 1.0 - (len(state["request_timestamps"]) / max(max_rpm, 1)))
            score += int(available_pct * 1000)  # Massive weight to guarantee load balancing
            
            candidates.append((score, key, state["provider"], state.get("tokens_used", 0)))
            
        if candidates:
            # Separate into normal and reserve (>= 4,000,000 tokens)
            normal_candidates = [c for c in candidates if c[3] < 4000000]
            reserve_candidates = [c for c in candidates if c[3] >= 4000000]
            
            working_set = normal_candidates if normal_candidates else reserve_candidates
            
            if not working_set:
                return None, None
                
            # Sort by score descending. Pick randomly from top 5% band
            # This ensures ALL providers get work when capacity is similar
            max_score = max(c[0] for c in working_set)
            threshold = max_score * 0.95  # 5% band
            top_candidates = [c for c in working_set if c[0] >= threshold]
            
            # Simple Round Robin to guarantee distribution instead of random choice
            self.rr_index += 1
            winner = top_candidates[self.rr_index % len(top_candidates)]
            
            best_key = winner[1]
            best_provider = winner[2]
            
            self.provider_state[best_key]["request_timestamps"].append(current_time)
            self._dump_metrics()
            return best_key, best_provider
            
        return None, None

    def mark_key_failure(self, key, error_type="generic"):
        if key in self.provider_state:
            if error_type == "rate_limit":
                cooldown = 120  # 2 minutes for rate limits
            elif error_type == "auth":
                cooldown = 600  # 10 minutes for auth errors (bad key)
            elif error_type == "timeout":
                cooldown = 30   # 30 seconds for timeouts
            else:
                cooldown = 60   # 1 minute for generic errors
            self.provider_state[key]["cooldown_until"] = time.time() + cooldown
            self.provider_state[key]["fail_count"] += 1
            self._dump_metrics()

    def mark_key_success(self, key, tokens_used=450):
        if key in self.provider_state:
            self.provider_state[key]["success_count"] += 1
            self.provider_state[key]["tokens_used_session"] = self.provider_state[key].get("tokens_used_session", 0) + tokens_used
            self.provider_state[key]["tokens_used"] = self.provider_state[key].get("tokens_used", 0) + tokens_used
            
            # Save token usage
            try:
                with open(self.token_usage_path, "r") as f:
                    data = json.load(f)
                data["usage"][key] = self.provider_state[key]["tokens_used"]
                with open(self.token_usage_path, "w") as f:
                    json.dump(data, f)
            except:
                pass
                
            self._dump_metrics()
            
    def _dump_metrics(self):
        # Dump every 5 seconds to avoid disk spam
        current_time = time.time()
        if not hasattr(self, '_last_dump') or current_time - self._last_dump > 5:
            self._last_dump = current_time
            metrics = {}
            for k, state in self.provider_state.items():
                # clean old timestamps for RPM calculation
                recent_reqs = [ts for ts in state["request_timestamps"] if current_time - ts < 60]
                metrics[k[:4] + "..." + k[-4:]] = {
                    "provider": state["provider"],
                    "success": state["success_count"],
                    "fails": state["fail_count"],
                    "rpm": len(recent_reqs),
                    "session_tokens": state.get("tokens_used_session", 0),
                    "monthly_tokens": state.get("tokens_used", 0),
                    "cooldown": max(0, int(state["cooldown_until"] - current_time))
                }
            try:
                with open("D:\\Hire Q Project\\Backend API & Integration\\live_metrics.json", "w") as f:
                    json.dump(metrics, f)
            except:
                pass



    def get_key_for_provider(self, provider_name):
        current_time = time.time()
        for key, state in self.provider_state.items():
            if self._normalize_provider(state["provider"]) == provider_name:
                if current_time >= state["cooldown_until"]:
                    state["request_timestamps"].append(current_time)
                    return key
        return None

    def call_reranker(self, query, documents):
        """Uses Jina or Voyage API to semantically rank the documents against the query."""
        from config_manager import ConfigManager
        providers_conf = ConfigManager.load_config().get("providers", {})
        
        rerank_providers = []
        if 'jina' in providers_conf and providers_conf['jina'].get('enabled'):
            rerank_providers.append('jina')
        if 'voyage' in providers_conf and providers_conf['voyage'].get('enabled'):
            rerank_providers.append('voyage')
            
        if not rerank_providers:
            rerank_providers = ['jina', 'voyage']
            
        for provider in rerank_providers:
            key = self.get_key_for_provider(provider)
            if not key:
                continue
                
            model = providers_conf.get(provider, {}).get('model')
            headers = {"Authorization": f"Bearer {key}", "Content-Type": "application/json"}
            
            try:
                if provider == 'jina':
                    if not model: model = 'jina-reranker-v2-base-multilingual'
                    url = "https://api.jina.ai/v1/rerank"
                    payload = {"model": model, "query": query, "documents": documents}
                    res = requests.post(url, headers=headers, json=payload, timeout=10)
                    if res.status_code == 200:
                        json_res = res.json()
                        self.mark_key_success(key, tokens_used=json_res.get('usage', {}).get('total_tokens', 10))
                        data = json_res.get('results', [])
                        if data:
                            best = data[0]
                            return best.get('document'), best.get('relevance_score', 0)
                            
                elif provider == 'voyage':
                    if not model: model = 'rerank-3-lite'
                    url = "https://api.voyageai.com/v1/rerank"
                    payload = {"model": model, "query": query, "documents": documents}
                    res = requests.post(url, headers=headers, json=payload, timeout=10)
                    if res.status_code == 200:
                        json_res = res.json()
                        self.mark_key_success(key, tokens_used=json_res.get('usage', {}).get('total_tokens', 10))
                        data = json_res.get('data', [])
                        if data:
                            best = data[0]
                            idx = best.get('index', 0)
                            return documents[idx], best.get('relevance_score', 0)
            except Exception as e:
                self.mark_key_failure(key, error_type="timeout" if "timeout" in str(e).lower() else "generic")
                continue
                
        return None, 0.0

    def semantic_filter_documents(self, query, documents, threshold=0.25):
        """Uses Jina or Voyage API to filter a list of sentences, keeping only those above threshold."""
        from config_manager import ConfigManager
        providers_conf = ConfigManager.load_config().get("providers", {})
        
        rerank_providers = []
        if 'jina' in providers_conf and providers_conf['jina'].get('enabled'):
            rerank_providers.append('jina')
        if 'voyage' in providers_conf and providers_conf['voyage'].get('enabled'):
            rerank_providers.append('voyage')
            
        if not rerank_providers:
            rerank_providers = ['jina', 'voyage']
            
        for provider in rerank_providers:
            key = self.get_key_for_provider(provider)
            if not key:
                continue
                
            model = providers_conf.get(provider, {}).get('model')
            headers = {"Authorization": f"Bearer {key}", "Content-Type": "application/json"}
            
            try:
                if provider == 'jina':
                    if not model: model = 'jina-reranker-v2-base-multilingual'
                    url = "https://api.jina.ai/v1/rerank"
                    payload = {"model": model, "query": query, "documents": documents}
                    res = requests.post(url, headers=headers, json=payload, timeout=10)
                    if res.status_code == 200:
                        json_res = res.json()
                        self.mark_key_success(key, tokens_used=json_res.get('usage', {}).get('total_tokens', 10))
                        data = json_res.get('results', [])
                        filtered = []
                        for item in data:
                            if item.get('relevance_score', 0) >= threshold:
                                filtered.append(item.get('document'))
                        return filtered if filtered else documents[-5:] # fallback if too strict
                        
                elif provider == 'voyage':
                    if not model: model = 'rerank-3-lite'
                    url = "https://api.voyageai.com/v1/rerank"
                    payload = {"model": model, "query": query, "documents": documents}
                    res = requests.post(url, headers=headers, json=payload, timeout=10)
                    if res.status_code == 200:
                        json_res = res.json()
                        self.mark_key_success(key, tokens_used=json_res.get('usage', {}).get('total_tokens', 10))
                        data = json_res.get('data', [])
                        filtered = []
                        for item in data:
                            if item.get('relevance_score', 0) >= threshold:
                                filtered.append(documents[item.get('index', 0)])
                        return filtered if filtered else documents[-5:]
            except Exception as e:
                self.mark_key_failure(key, error_type="timeout" if "timeout" in str(e).lower() else "generic")
                continue
                
        return documents

def get_job_text_by_priority(conn, job_id, source, router=None):
    res = conn.execute(text(f"SELECT type, content FROM job_descriptions WHERE job_id = '{job_id}'"))
    chunks = {row[0].upper(): row[1] for row in res}
    
    if 'SKILLS' in chunks and len(chunks['SKILLS'].strip()) > 10:
        if 'wuzzuf' in source.lower():
            return chunks['SKILLS'], 'AI_NORMALIZE_EXPLICIT_SKILLS'
        else:
            return chunks['SKILLS'], 'AI_EXTRACT_FROM_SENTENCES'
            
    if 'REQUIREMENTS' in chunks and len(chunks['REQUIREMENTS'].strip()) > 10:
        req = chunks['REQUIREMENTS'].strip()
        if len(req) < 50:
            return None, 'SKIP_INSUFFICIENT_TEXT'
        return req, 'AI_EXTRACT_FROM_SENTENCES'
        
    if 'DESCRIPTION' in chunks and len(chunks['DESCRIPTION'].strip()) > 10:
        desc = chunks['DESCRIPTION'].strip()
        if len(desc) < 60:
            return None, 'SKIP_INSUFFICIENT_TEXT'
        
        from config_manager import ConfigManager
        config = ConfigManager.load_config()
        strategy = config.get("global", {}).get("extraction_strategy", "legacy")
        threshold = float(config.get("global", {}).get("semantic_threshold", 0.25))

        if strategy == "legacy":
            return desc[-1500:], 'AI_EXTRACT_FROM_DESCRIPTION_BOTTOM_UP'
        else:
            sentences = [c.strip() for c in re.split(r'\n|\.', desc) if len(c.strip()) > 20]
            if not sentences:
                return desc[-1500:], 'AI_EXTRACT_FROM_DESCRIPTION_BOTTOM_UP'
                
            if router:
                broadcast_live_event("PRUNING", job_id, {"provider": "Voyage/Jina Reranker"})
                # Chunk documents into batches of 30 if too large to avoid Voyage/Jina token limits
                all_filtered = []
                query = "requirements technical skills programming languages qualifications experience"
                for i in range(0, len(sentences), 30):
                    batch = sentences[i:i+30]
                    filtered_batch = router.semantic_filter_documents(query, batch, threshold)
                    all_filtered.extend(filtered_batch)
                
                final_text = " ".join(all_filtered)
                
                sample_sentences = []
                for s in sentences[:10]:
                    sample_sentences.append({"text": s, "is_skill": s in all_filtered})
                broadcast_live_event("PRUNING_DATA", job_id, {"sentences": sample_sentences})
                
                if len(final_text) > 3000:
                    final_text = final_text[-3000:]
                    
                # Fallback to bottom up if everything was pruned
                if len(final_text.strip()) < 50:
                    return desc[-1500:], 'AI_EXTRACT_FROM_DESCRIPTION_BOTTOM_UP'
                return final_text, 'AI_EXTRACT_FROM_DESCRIPTION_BOTTOM_UP'
            else:
                return desc[-1500:], 'AI_EXTRACT_FROM_DESCRIPTION_BOTTOM_UP'
                
    return None, None


def refine_job_domain(title, predicted):
    t = str(title).lower()
    
    # 1. Software Engineering & IT
    if any(k in t for k in ['developer', 'software', 'frontend', 'front-end', 'backend', 'back-end', 'full stack', 'fullstack', 'devops', 'qa engineer', 'test engineer', 'system administrator', 'sysadmin', 'cloud engineer', 'data engineer', 'cyber security', 'infosec', 'net developer', 'java developer', 'python developer', 'ios developer', 'android developer', 'flutter', 'react developer', 'network engineer', 'it specialist', 'it support', 'technical support', 'embedded', 'firmware', 'linux']):
        return "Software Engineering & IT"
        
    # 2. Education & Training
    if any(k in t for k in ['teacher', 'instructor', 'professor', 'lecturer', 'teaching assistant', 'tutor', 'trainer', 'co-teacher', 'nursery', 'curriculum developer', 'academic manager']):
        return "Education & Training"
        
    # 3. Supply Chain & Logistics
    if any(k in t for k in ['supply chain', 'procurement', 'logistics', 'warehouse', 'inventory control', 'purchasing', 'shipping coordinator', 'customs clearance', 'fleet manager']):
        return "Supply Chain & Logistics"
        
    # 4. Business & Finance
    if any(k in t for k in ['accountant', 'accounting', 'auditor', 'audit supervisor', 'financial analyst', 'treasury', 'finance manager', 'cfo', 'payroll', 'tax specialist', 'actuary', 'banking', 'banker', 'credit officer', 'credit analyst', 'wealth management', 'investment']):
        return "Business & Finance"
        
    # 5. Human Resources
    if any(k in t for k in ['human resources', 'hr specialist', 'hr generalist', 'hr manager', 'talent acquisition', 'recruiter', 'recruitment', 'people operations', 'compensation and benefits', 'personnel']):
        return "Human Resources"
        
    # 6. Marketing & Sales
    if any(k in t for k in ['sales representative', 'sales manager', 'sales executive', 'account executive', 'telesales', 'b2b sales', 'outdoor sales', 'real estate', 'property consultant', 'seo ', 'seo manager', 'digital marketing', 'content creator', 'media buyer', 'social media', 'growth lead', 'brand manager', 'مندوب مبيعات', 'مسؤول مبيعات', 'اخصائي مبيعات']):
        return "Marketing & Sales"
        
    # 7. Engineering & Construction
    if any(k in t for k in ['civil engineer', 'mechanical engineer', 'electrical engineer', 'site engineer', 'mep engineer', 'bim engineer', 'bim architecture', 'architectural engineer', 'structural engineer', 'construction manager', 'planning engineer', 'surveyor', 'مهندس']):
        return "Engineering & Construction"
        
    # 8. Customer Service & Support
    if any(k in t for k in ['customer service', 'customer care', 'call center', 'contact center', 'client support', 'help desk', 'receptionist', 'خدمة عملاء']):
        return "Customer Service & Support"
        
    # 9. Hospitality & Tourism
    if any(k in t for k in ['chef', 'cook', 'waiter', 'barista', 'hotel manager', 'housekeeping', 'tour guide', 'bartender', 'food & beverage', 'f&b manager', 'front office', 'stewarding', 'baker']):
        return "Hospitality & Tourism"
        
    # 10. Healthcare & Medical
    if any(k in t for k in ['physician', 'doctor', 'nurse', 'pharmacist', 'medical representative', 'dentist', 'radiologist', 'laboratory technician', 'طبيب', 'صيدلي']):
        return "Healthcare & Medical"
        
    # 11. Data Science & Analytics
    if any(k in t for k in ['data scientist', 'data analyst', 'machine learning', 'deep learning', 'ai engineer', 'bi analyst', 'business intelligence']):
        return "Data Science & Analytics"

    # 12. Legal & Compliance
    if any(k in t for k in ['grc', 'compliance', 'privacy officer', 'legal counsel', 'lawyer', 'attorney', 'legal advisor', 'paralegal', 'شؤون قانونية', 'محامي']):
        return "Legal & Compliance"

    return predicted or "Other/Uncategorized"


def build_ai_prompt(content, method, title="Unknown", raw_category=""):
    base_prompt = f"""You are an expert HR Skill Extraction API.
Your ONLY job is to extract professional SKILLS mentioned in the job text and output a raw JSON object.

CONTEXT INFORMATION:
- Job Title: {title}
- Portal Category: {raw_category or 'Not Specified'}

WHAT IS A SKILL:
- Tools, software, programming languages, and cloud platforms (e.g. Python, Excel, AWS, Figma).
- Technical competencies, frameworks, and methodologies (e.g. Machine Learning, Agile, CI/CD, Accounting).
- Human languages (e.g. English, Arabic, German, French).
- Foundational soft skills (e.g. Communication, Problem Solving, Leadership, Team Leadership, Negotiation, Time Management).

CRITICAL DISTINCTION (REQUIREMENTS vs SKILLS):
- Job postings contain many general requirements (e.g., age, salary, years of experience, vehicle ownership, rotational shifts, gender).
- DO NOT extract requirement statements as skills!
- Look INSIDE the requirements ONLY to find the specific skills needed:
  * "Must have 3 years of experience in React and Node.js" -> Extract ONLY: "React", "Node.js".
  * "Age between 22-28 years old" -> NO skills! Extract nothing.
  * "1 year teaching experience" -> Extract ONLY: "Teaching".
  * "Fluent in English and Arabic" -> Extract: "English" (level: "Fluent"), "Arabic" (level: "Fluent").
  * "Analytical and problem solving mindset" -> Extract: "Problem Solving" (Soft Skill).

OUTPUT FORMAT:
{{
  "job_category": "Exact string from the PREDEFINED JOB CATEGORIES list below",
  "skills": [
    {{
      "raw_text": "The exact wording from text (e.g. 'Advanced Python scripting')",
      "canonical_name": "The pure standard skill name (e.g. 'Python')",
      "skill_level": "Level if mentioned (e.g. 'Senior', 'B2', 'Fluent', 'Beginner') or null",
      "skill_type": "One of: ['Tool / Software', 'Hard Skill', 'Soft Skill', 'Certification', 'Language']",
      "is_true_skill": true
    }}
  ]
}}

PREDEFINED JOB CATEGORIES:
["Software Engineering & IT", "Data Science & Analytics", "Business & Finance", "Marketing & Sales", "Human Resources", "Engineering & Construction", "Healthcare & Medical", "Design & Architecture", "Education & Training", "Legal & Compliance", "Supply Chain & Logistics", "Customer Service & Support", "Manufacturing & Production", "Operations & Management", "Hospitality & Tourism", "Media & Communications", "Science & Research", "Language & Localization", "Soft Skills & Personal Traits", "Other/Uncategorized"]
"""
    if method == 'AI_NORMALIZE_EXPLICIT_SKILLS':
        instruction = f"""
Task: Normalize this list of items to clean standard skills. Drop non-skills using the JSON format.
TEXT: {content}
"""
    else: 
        instruction = f"""
Task: Distill ONLY the true skills from the text. Ignore general requirements (age, experience duration, hardware).
TEXT: {content}
"""
    return base_prompt + instruction

def call_llm(prompt, key, provider):
    import requests
    import json
    from config_manager import ConfigManager
    
    config = ConfigManager.load_config()
    headers = {"Content-Type": "application/json"}
    provider_lower = provider.lower().strip()
    
    if 'gemini' in provider_lower: provider_norm = 'gemini'
    elif 'groq' in provider_lower: provider_norm = 'groq'
    elif 'zhipu' in provider_lower: provider_norm = 'zhipuai'
    elif 'openrouter' in provider_lower: provider_norm = 'openrouter'
    elif 'cohere' in provider_lower: provider_norm = 'cohere'
    elif 'tog' in provider_lower: provider_norm = 'together'
    elif 'hug' in provider_lower: provider_norm = 'hugging face'
    elif 'samba' in provider_lower: provider_norm = 'sambanova'
    elif 'mistral' in provider_lower: provider_norm = 'mistral ai'
    elif 'inceptionlabs' in provider_lower or 'inception' in provider_lower: provider_norm = 'inceptionlabs'
    elif 'llm7' in provider_lower: provider_norm = 'llm7'
    elif 'cleanapis' in provider_lower: provider_norm = 'cleanapis'
    elif 'upstage' in provider_lower: provider_norm = 'upstage'
    elif 'cloudflare' in provider_lower: provider_norm = 'cloudflare'
    elif 'aionlabs' in provider_lower: provider_norm = 'aionlabs'
    else: provider_norm = provider_lower

    provider_config = config.get("providers", {}).get(provider_norm, {})
    model = provider_config.get("model")
    
    url = None
    # Split prompt into system + user for better JSON compliance
    system_msg = "You are a strict HR Data Engineer API. Output ONLY valid JSON. No markdown, no explanation."
    payload = {
        "messages": [
            {"role": "system", "content": system_msg},
            {"role": "user", "content": prompt}
        ],
        "temperature": 0.1
    }

    # Define fallback models per provider
    fallbacks = {
        'gemini': [model or "gemini-3.5-flash", "gemini-3.8-flash", "gemini-3.7-flash", "gemini-3.5-flash-lite"],
        'openrouter': [model or "liquid/lfm-2.5-2.6b:free", "apodex/apodex-1.1-mini:free", "google/gemma-4-26b-a4b-it:free"],
        'mistral ai': [model or "ministral-8b-latest", "mistral-small-latest", "open-mistral-7b"],
        'upstage': [model or "solar-1-mini-chat", "solar-pro"],
        'groq': [model or "openai/gpt-oss-20b", "qwen/qwen3.8-27b", "openai/gpt-oss-120b", "allam-2-7b"],
        'cohere': [model or "command-r-plus-08-2024", "command-r-08-2024", "command-r-plus"],
        'hugging face': [model or "meta-llama/Llama-3.1-8B-Instruct", "mistralai/Mistral-7B-Instruct-v0.3", "Qwen/Qwen2.5-72B-Instruct"],
        'zhipuai': [model or "glm-4-flash", "glm-4-plus"],
        'cleanapis': [model or "deepseek-v4-flash-0731", "claude-3-5-sonnet-20240620"],
        'llm7': [model or "mistral-Nemo-Instruct-2407", "gpt-4o-mini", "claude-3-haiku"],
        'inceptionlabs': [model or "mercury-2.5", "mercury-3.0"],
        'sambanova': [model or "Meta-Llama-3.3-70B-Instruct", "Meta-Llama-3.2-90B-Vision-Instruct"],
        'together': [model or "meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo"],
        'deepseek': [model or "deepseek-chat"],
        'modelscope': [model or "Qwen/Qwen2.5-72B-Instruct"]
    }
    
    # Deduplicate and build try list
    provider_models = []
    seen = set()
    for m in fallbacks.get(provider_norm, [model]):
        if m and m not in seen:
            seen.add(m)
            provider_models.append(m)

    if not provider_models:
        raise Exception(f"No models configured for {provider_norm}")

    is_gemini_aq = (provider_norm == 'gemini' and str(key).startswith('AQ.'))
    if provider_norm == 'gemini' and not is_gemini_aq:
        provider_models = [m.replace("models/", "") for m in provider_models]
        payload = {"contents": [{"parts": [{"text": prompt}]}], "generationConfig": {"temperature": 0.0}}
    else:
        headers["Authorization"] = f"Bearer {key}"
        
    last_error = None
    
    for try_model in provider_models:
        # Determine URL
        if provider_norm == 'gemini':
            if is_gemini_aq:
                url = "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions"
                payload["model"] = try_model
            else:
                url = f"https://generativelanguage.googleapis.com/v1beta/models/{try_model}:generateContent?key={key}"
        elif provider_norm == 'groq': url = "https://api.groq.com/openai/v1/chat/completions"
        elif provider_norm == 'zhipuai': url = "https://open.bigmodel.cn/api/paas/v4/chat/completions"
        elif provider_norm == 'cleanapis': url = "https://cleanapis.com/v1/chat/completions"
        elif provider_norm == 'openrouter': url = "https://openrouter.ai/api/v1/chat/completions"
        elif provider_norm == 'cohere': url = "https://api.cohere.com/v2/chat"
        elif provider_norm == 'hugging face': url = "https://router.huggingface.co/v1/chat/completions"
        elif provider_norm == 'sambanova': url = "https://api.sambanova.ai/v1/chat/completions"
        elif provider_norm == 'mistral ai': url = "https://api.mistral.ai/v1/chat/completions"
        elif provider_norm == 'together': url = "https://api.together.xyz/v1/chat/completions"
        elif provider_norm == 'inceptionlabs': url = "https://api.inceptionlabs.ai/v1/chat/completions"
        elif provider_norm == 'upstage': url = "https://api.upstage.ai/v1/solar/chat/completions"
        elif provider_norm == 'llm7': url = "https://api.llm7.io/v1/chat/completions"
        elif provider_norm == 'aionlabs': url = "https://api.aionlabs.ai/v1/chat/completions"
        elif provider_norm == 'deepseek': url = "https://api.deepseek.com/chat/completions"
        elif provider_norm == 'modelscope': url = "https://api-inference.modelscope.cn/v1/chat/completions"
        else: raise Exception("UNSUPPORTED_PROVIDER")
        
        if provider_norm != 'gemini':
            payload["model"] = try_model
            
        try:
            response = requests.post(url, headers=headers, json=payload, timeout=30)
            
            # If 429 Rate Limit (and it's not model-specific), we could either fail immediately or try another model
            # For OpenRouter/Mistral, 429 can be model-specific. For Gemini, 503 is model-specific.
            if response.status_code == 200:
                result = response.json()
                if provider_norm == 'gemini' and not is_gemini_aq:
                    content = result.get("candidates", [{}])[0].get("content", {}).get("parts", [{}])[0].get("text", "")
                    usage = result.get("usageMetadata", {})
                    tokens = usage.get("totalTokenCount", int(len(prompt)/4 + len(content)/4))
                else:
                    if 'choices' in result and len(result['choices']) > 0:
                        content = result['choices'][0]['message'].get('content', '')
                    elif 'message' in result:
                        content = result['message'].get('content', '')
                    elif 'response' in result:
                        content = result['response']
                    else:
                        content = str(result)
                        
                    usage = result.get('usage', {})
                    tokens = usage.get('total_tokens', int(len(prompt)/4 + len(content)/4))
                    
                return content, tokens
            
            # On error, save it and try the next model
            last_error = f"{response.status_code}: {response.text[:100]}"
            if response.status_code == 401: 
                break # 401 is bad key, no point trying other models
            
        except requests.exceptions.Timeout:
            last_error = f"Timeout on {try_model}"
            continue
        except Exception as e:
            last_error = str(e)
            continue
            
    # If all models failed
    if "429" in str(last_error) or "Rate limit" in str(last_error):
        raise Exception("RATE_LIMIT")
    elif "401" in str(last_error):
        raise Exception("AUTH_ERROR")
    elif "Timeout" in str(last_error):
        raise Exception(f"TIMEOUT ({provider_norm})")
    else:
        raise Exception(f"All models failed for {provider_norm}. Last error: {last_error}")


def clean_json_string(raw_str):
    """Clean markdown backticks and extra text from LLM response"""
    raw_str = raw_str.strip()
    if raw_str.startswith("```json"):
        raw_str = raw_str[7:]
    elif raw_str.startswith("```"):
        raw_str = raw_str[3:]
    
    if raw_str.endswith("```"):
        raw_str = raw_str[:-3]
        
    # Find the first { or [ and last } or ]
    start_idx = -1
    end_idx = -1
    for i, char in enumerate(raw_str):
        if char in ('{', '['):
            start_idx = i
            break
    for i in range(len(raw_str)-1, -1, -1):
        if raw_str[i] in ('}', ']'):
            end_idx = i
            break
            
    if start_idx != -1 and end_idx != -1 and end_idx >= start_idx:
        return raw_str[start_idx:end_idx+1]
    
    return raw_str.strip()

def broadcast_live_event(event_type, job_id, data=None):
    """Sends a fast UDP-like HTTP packet to the live dashboard visualization"""
    try:
        payload = {"event": event_type, "job_id": str(job_id)}
        if data: payload.update(data)
        import requests
        requests.post('http://localhost:8765/emit', json=payload, timeout=0.1)
    except:
        pass # Ignore if dashboard is not running

def process_job(conn, job_id, text_content, router, matcher, method="FULL_EXTRACTION", title="Unknown", raw_category=""):
    """Analyze a single job description, extract category & skills"""
    prompt = build_ai_prompt(text_content, method, title, raw_category)
    
    broadcast_live_event("LLM", job_id, {"provider": "Waiting for LLM Router..."})
    
    attempts = 0
    success = False
    
    while attempts < 5 and not success:
        key, provider = router.get_best_available_key(task_type='extraction')
        if not key:
            print("    [!] Waiting for API quota...")
            time.sleep(5)
            continue
            
        broadcast_live_event("LLM", job_id, {"provider": provider})
        
        try:
            raw_response, actual_tokens = call_llm(prompt, key, provider)
            cleaned_json = clean_json_string(raw_response)
            parsed_data = json.loads(cleaned_json)
            
            if isinstance(parsed_data, list):
                skills_data = parsed_data
                job_category = None
            else:
                skills_data = parsed_data.get("skills", [])
                job_category = parsed_data.get("job_category")

            # Deterministic domain refinement from title if strong signal exists
            job_category = refine_job_domain(title, job_category)

            saved_count = 0
            
            broadcast_live_event("VERIFYING", job_id, {"title": title, "category": job_category})
            
            for skill in skills_data:
                is_true_skill = skill.get("is_true_skill")
                if is_true_skill is False:
                    continue

                name = skill.get("canonical_name", skill.get("extracted_text", skill.get("skill_name", ""))).strip()
                raw_text = skill.get("raw_text", skill.get("extracted_text", name)).strip()
                if not name: continue
                if len(name) > 60: continue
                if name.isdigit(): continue

                level = skill.get("skill_level", "Not Specified")
                category = skill.get("category", "General")
                lower_name = name.lower()

                # 1. Intercept leaked experience -> route to jobs.min/max_experience
                if any(w in lower_name for w in ['year experience', 'years experience', 'years of experience', 'experience required', 'minimum experience', 'سنوات خبرة', 'سنة خبرة']):
                    nums = re.findall(r'\d+', name)
                    if len(nums) == 1:
                        conn.execute(text("UPDATE jobs SET min_experience = :exp WHERE id = :jid AND min_experience IS NULL"), {"exp": int(nums[0]), "jid": job_id})
                    elif len(nums) >= 2:
                        conn.execute(text("UPDATE jobs SET min_experience = :min_e, max_experience = :max_e WHERE id = :jid AND min_experience IS NULL"), {"min_e": int(nums[0]), "max_e": int(nums[1]), "jid": job_id})
                    continue

                if lower_name in ['experience', 'خبرة', 'work experience', 'previous experience', 'خبرة سابقة', 'الخبرة', 'years of experience']:
                    continue

                # 2. Intercept leaked salary -> route to jobs.salary_min/max
                if any(w in lower_name for w in ['راتب', 'جنيه مصري', 'salary', 'egp', 'مرتب']):
                    nums = re.findall(r'\d+', name.replace(',', ''))
                    if len(nums) == 1:
                        conn.execute(text("UPDATE jobs SET salary_min = :s WHERE id = :jid AND salary_min IS NULL"), {"s": float(nums[0]), "jid": job_id})
                    elif len(nums) >= 2:
                        conn.execute(text("UPDATE jobs SET salary_min = :s1, salary_max = :s2 WHERE id = :jid AND salary_min IS NULL"), {"s1": float(nums[0]), "s2": float(nums[1]), "jid": job_id})
                    continue

                # 3. Intercept leaked education -> route to jobs.education_level
                if (any(w in lower_name for w in ['bachelor', 'master', 'phd', 'doctoral', 'secondary education', 'higher education', 'high school', 'diploma', 'degree', 'مؤهل عالي', 'مؤهل متوسط', 'مؤهل', 'دبلوم', 'ثانوية', 'بكالوريوس', 'ليسانس', 'ماجستير'])) and ('360' not in lower_name):
                    conn.execute(text("UPDATE jobs SET education_level = :edu WHERE id = :jid AND (education_level IS NULL OR education_level = 'Not Specified')"), {"edu": name, "jid": job_id})
                    continue

                # 4. Intercept driving license and vehicles
                if any(w in lower_name for w in ['driving license', 'driving licence', "driver's license", 'driver license', 'drivers license', 'motorcycle', 'دراجة نارية', 'موتوسيكل', 'يمتلك سيارة', 'own car', 'رخصة قيادة', 'رخصة سياقة', 'رخصة مهنية', 'رخصة خاصة', 'درجة أولى', 'درجة اولى', 'درجة ثانية', 'درجة ثانيه', 'درجة ثالثة', 'درجة ثالثه', 'third grade', 'second grade', 'first grade']):
                    continue

                # 5. Intercept locations, military service, gender, marital status
                if any(w in lower_name for w in ['location:', 'military service', 'military status', 'marital status', 'gender:', 'الخدمة العسكرية', 'الموقف من التجنيد', 'الحالة الاجتماعية', 'محل السكن']):
                    continue

                # 6. Intercept career level (fresh graduate, entry level, mid-level) -> route to jobs.career_level
                if any(w in lower_name for w in ['fresh graduate', 'fresh grad', 'حديث التخرج', 'حديث تخرج', 'entry level', 'entry-level', 'beginner', 'mid-level experience', 'intermediate experience', 'entry-level experience', 'senior-level experience']):
                    lvl = 'Entry Level' if ('entry' in lower_name or 'beginner' in lower_name) else 'Fresh graduate'
                    if 'mid-level' in lower_name or 'intermediate' in lower_name: lvl = 'Mid-Senior level'
                    elif 'senior-level' in lower_name: lvl = 'Senior Management'
                    conn.execute(text("UPDATE jobs SET career_level = :lvl WHERE id = :jid AND (career_level IS NULL OR career_level = 'Not Specified')"), {"lvl": lvl, "jid": job_id})
                    continue

                # 7. Intercept "not required", negative qualifications, and age requirements
                if any(w in lower_name for w in ['not required', 'not needed', 'لا يشترط', 'غير مطلوب', 'age', 'السن', 'العمر']):
                    continue

                # Call V3 Domain-Gated Matcher
                skill_id, canonical_name = matcher.match_skill(name, job_domain=job_category, llm_validator_func=router.call_reranker)
                if not skill_id:
                    broadcast_live_event("VERIFYING_SKILL", job_id, {
                        "skill_name": name,
                        "status": "REJECTED_DOMAIN_GATE",
                        "domain": job_category
                    })
                    continue

                broadcast_live_event("VERIFYING_SKILL", job_id, {
                    "skill_name": canonical_name or name,
                    "raw_name": name,
                    "status": "APPROVED",
                    "domain": job_category,
                    "level": level
                })

                link_q = text("""
                    INSERT INTO job_skills (job_id, skill_id, skill_level, confidence, extracted_from, raw_skill_text)
                    VALUES (:jid, :sid, :lvl, 1.0, 'llm_extraction', :raw_text)
                    ON CONFLICT (job_id, skill_id) DO UPDATE SET 
                        skill_level = COALESCE(EXCLUDED.skill_level, job_skills.skill_level),
                        raw_skill_text = COALESCE(EXCLUDED.raw_skill_text, job_skills.raw_skill_text)
                """)
                conn.execute(link_q, {"jid": job_id, "sid": skill_id, "lvl": level, "raw_text": raw_text or name})
                saved_count += 1

            if job_category and isinstance(job_category, str):
                update_q = text("UPDATE jobs SET ai_analyzed = TRUE, updated_at = NOW(), internal_category = :cat WHERE id = :job_id")
                conn.execute(update_q, {"job_id": job_id, "cat": job_category})
            else:
                update_q = text("UPDATE jobs SET ai_analyzed = TRUE, updated_at = NOW() WHERE id = :job_id")
                conn.execute(update_q, {"job_id": job_id})
            
            conn.commit()

            print(f"    [+] Saved successfully for {job_id}! ({saved_count} valid skills, Category: {job_category})")
            broadcast_live_event("DONE", job_id, {"category": job_category, "skills": [{"name": s.get("extracted_text")} for s in skills_data if s.get("is_true_skill")]})
            success = True
            router.mark_key_success(key, tokens_used=actual_tokens)
            
        except Exception as e:
            err_str = str(e)
            print(f"    [-] ERROR with {provider}: {err_str}")
            # Classify error for smart cooldown
            if "RATE_LIMIT" in err_str:
                router.mark_key_failure(key, error_type="rate_limit")
            elif "401" in err_str or "Unauthorized" in err_str or "auth" in err_str.lower():
                router.mark_key_failure(key, error_type="auth")
            elif "TIMEOUT" in err_str or "timed out" in err_str.lower():
                router.mark_key_failure(key, error_type="timeout")
            else:
                router.mark_key_failure(key)
            attempts += 1
            
    if not success:
        print(f"    [!] Job {job_id} failed completely. Adding to session ignore list.")
        return False
    return True


def _process_single_job_thread(job_tuple, engine, router, matcher, failed_jobs_session):
    job_id, title, source, company, raw_category = job_tuple
    
    # Check for scraper login walls or non-jobs
    lower_t = str(title).lower()
    if any(k in lower_t for k in ['sign up | linkedin', 'linkedin login', 'security verification']):
        print(f"    [-] Skipping login wall: {title}")
        try:
            with engine.connect() as conn:
                conn.execute(text("UPDATE jobs SET ai_analyzed = TRUE, internal_category = 'Other/Uncategorized' WHERE id = :jid"), {"jid": job_id})
                conn.commit()
        except:
            pass
        return

    # Safe encoding for printing
    safe_title = str(title).encode('ascii', 'replace').decode('ascii')
    safe_company = str(company).encode('ascii', 'replace').decode('ascii')
    print(f"[*] Analyzing Job: {safe_title} ({safe_company})")
    
    # Broadcast start
    broadcast_live_event("START", job_id, {"title": title, "source": source, "company": company, "text": "Fetching descriptions and preparing for AI..."})
    
    text_content = ""
    method = "FULL_EXTRACTION"
    
    try:
        with engine.connect() as conn:
            result = get_job_text_by_priority(conn, job_id, source, router)
            if result[0]:
                text_content = result[0]
                method = result[1]
    except Exception as e:
        print(f"    [-] Error fetching desc: {e}")
        
    if not text_content:
        print("    [-] Skipping: Insufficient or missing description.")
        try:
            with engine.connect() as conn:
                conn.execute(text("UPDATE jobs SET ai_analyzed = TRUE, updated_at = NOW() WHERE id = :job_id"), {"job_id": job_id})
                conn.commit()
        except:
            pass
        return
        
    try:
        with engine.connect() as conn:
            success = process_job(conn, job_id, text_content, router, matcher, method, title, raw_category)
            if not success:
                failed_jobs_session.add(job_id)
    except Exception as e:
        print(f"    [!] Error in thread: {e}")
        failed_jobs_session.add(job_id)


def run_worker():
    from database import PG_URL
    from skill_matcher import HybridSkillMatcher
    import concurrent.futures
    
    engine = create_engine(PG_URL, pool_size=20, max_overflow=40)
    router = SmartAPIRouter()
    matcher = HybridSkillMatcher(PG_URL)
    
    print("[+] Worker Engine Ready (Multithreaded).")
    
    failed_jobs_session = set()
    MAX_WORKERS = 15  # 15 concurrent threads
    
    while True:
        try:
            with engine.connect() as conn:
                query = "SELECT id, title_raw, source, company_name, job_category FROM jobs WHERE ai_analyzed = FALSE"
                if failed_jobs_session:
                    formatted_ids = ", ".join([f"'{jid}'" for jid in failed_jobs_session])
                    query += f" AND id NOT IN ({formatted_ids})"
                query += f" ORDER BY created_at DESC LIMIT {MAX_WORKERS * 2}"
                
                res = conn.execute(text(query)).fetchall()
                
            if not res:
                print("[*] No pending jobs. Sleeping...")
                time.sleep(5)
                continue
                
            with concurrent.futures.ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
                futures = [
                    executor.submit(_process_single_job_thread, job_tuple, engine, router, matcher, failed_jobs_session) 
                    for job_tuple in res
                ]
                concurrent.futures.wait(futures)
                
        except Exception as e:
            print(f"[!] Worker Loop Error: {e}")
            time.sleep(5)

if __name__ == '__main__':
    import subprocess
    import sys
    import os
    import socket
    
    # Check if Live Dashboard is already running
    dashboard_running = False
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            s.settimeout(0.5)
            if s.connect_ex(('127.0.0.1', 8765)) == 0:
                dashboard_running = True
    except:
        pass
        
    if not dashboard_running:
        dashboard_path = os.path.join(os.path.dirname(__file__), 'live_dashboard.py')
        print("[+] Starting Live Dashboard automatically...")
        subprocess.Popen([sys.executable, dashboard_path], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    else:
        print("[+] Live Dashboard is already active on http://localhost:8765")
    
    run_worker()
