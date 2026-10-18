import numpy as np
import time
import re
import uuid
from sqlalchemy import create_engine, text
from sentence_transformers import SentenceTransformer, CrossEncoder

HARDWARE_PATTERNS = [
    r'\b\d+\s*gb\b', r'\b\d+\s*tb\b', r'\bram\b', r'\bintel\b', r'\bcore\s*i[3579]\b', 
    r'\bprocessor\b', r'\bhard\s*drive\b', r'\bssd\b', r'\bhdd\b', r'\bgpu\b', 
    r'\brtx\b', r'\bgtx\b', r'\bnvidia\b', r'\bmonitor\b', r'\bwindows\s*(7|8|10|11)\b',
    r'\blaptop\b', r'\bdesktop\s*pc\b', r'\bheadset\b', r'معالج', r'رامات', r'هارد'
]
SHIFT_PATTERNS = [
    r'\bnight\s*shift[s]?\b', r'\brotational\s*shift[s]?\b', r'\bday\s*shift[s]?\b', 
    r'\bmorning\s*shift[s]?\b', r'\bshifts?\b', r'شفت', r'وردية', r'دوام\s*ليلي', r'دوام\s*صباحي'
]
NOISE_PATTERNS = [
    r'year[s]?\s*experience', r'سنة\s*خبرة', r'سنوات\s*خبرة', r'salary', r'مرتب', r'راتب', 
    r'جنيه', r'egp', r'driving\s*licen[sc]e', r'رخصة\s*قيادة', r'رخصة\s*سياقة', r'رخصة\s*دراجة',
    r'us\s*visa', r'passport', r'تأشيرة', r'جواز\s*سفر', r'own\s*car', r'work\s*from\s*home',
    r'bachelor', r'master', r'phd', r'بكالوريوس', r'ليسانس', r'diploma', r'دبلوم', r'مؤهل'
]
ALL_NOISE_RE = re.compile('|'.join(HARDWARE_PATTERNS + SHIFT_PATTERNS + NOISE_PATTERNS), re.IGNORECASE)

def normalize_domain_string(dom):
    if not dom: return ""
    d = str(dom).lower().strip()
    d = d.replace('&', 'and').replace('/', 'and').replace('-', ' ')
    d = d.replace('software development', 'software engineering')
    d = d.replace('operations and administration', 'operations and management')
    d = d.replace('finance and accounting', 'business and finance')
    d = d.replace('accounting and finance', 'business and finance')
    d = d.replace('medical and healthcare', 'healthcare and medical')
    d = re.sub(r'\s+', ' ', d).strip()
    return d

def are_domains_compatible(jdom, sdom):
    if not jdom or not sdom: return True
    if jdom == "Other/Uncategorized" or sdom == "Other/Uncategorized": return True
    
    nj = normalize_domain_string(jdom)
    ns = normalize_domain_string(sdom)
    
    if nj == ns or nj in ns or ns in nj:
        return True
        
    words_j = set(w for w in nj.split() if w not in {'and', 'or', 'the', 'in', 'of'})
    words_s = set(w for w in ns.split() if w not in {'and', 'or', 'the', 'in', 'of'})
    
    return len(words_j.intersection(words_s)) > 0

class HybridSkillMatcher:
    def __init__(self, db_url):
        self.engine = create_engine(db_url)
        print("[*] Loading HybridSkillMatcher V3 (Domain-Gated Semantic Matcher + Local Cross-Encoder)...")
        self.model = SentenceTransformer('all-MiniLM-L6-v2')
        self.cross_encoder = CrossEncoder('cross-encoder/ms-marco-MiniLM-L-6-v2')
        
        self.canonical_skills = {}   # lower_name -> id
        self.canonical_names = {}    # id -> Original Name
        self.skill_domains = {}      # id -> domain
        self.skill_subcategories = {} # id -> sub_category
        self.skill_types = {}        # id -> skill_type
        self.aliases = {}            # lower_alias -> canonical_id
        
        self.vector_matrix = None    # Combined matrix of canonicals + aliases
        self.vector_targets = []     # Index -> canonical_id
        
        self.reload_data()
        
    def reload_data(self):
        print("[*] Loading skills, domains, skill_types, aliases, and vectors into RAM...")
        start_time = time.time()
        with self.engine.connect() as conn:
            # 1. Load Canonical Skills with Domains and Skill Types
            res = conn.execute(text("SELECT id, name, domain, sub_category, skill_type FROM skills")).fetchall()
            for row in res:
                sid = str(row[0])
                sname = str(row[1])
                sdom = row[2] or "Other/Uncategorized"
                ssub = row[3] or "General"
                stype = row[4] or "Hard Skill"
                
                self.canonical_skills[sname.lower()] = sid
                self.canonical_names[sid] = sname
                self.skill_domains[sid] = sdom
                self.skill_subcategories[sid] = ssub
                self.skill_types[sid] = stype
            
            # 2. Load Canonical Embeddings
            res_emb = conn.execute(text("SELECT skill_id, embedding FROM skill_embeddings")).fetchall()
            emb_dict = {str(row[0]): row[1] for row in res_emb}
            
            # 3. Load Aliases
            res_aliases = conn.execute(text("SELECT alias_name, skill_id FROM skill_aliases")).fetchall()
            self.aliases = {row[0].lower(): str(row[1]) for row in res_aliases}
            
        matrix_rows = []
        self.vector_targets = []
        
        # Add Canonical Vectors to Matrix from DB
        for skill_id, emb in emb_dict.items():
            if emb:
                matrix_rows.append(emb)
                self.vector_targets.append(skill_id)
            
        if matrix_rows:
            self.vector_matrix = np.array(matrix_rows, dtype=np.float32)
        else:
            self.vector_matrix = np.array([], dtype=np.float32)
            
        print(f"[+] Loaded V3 Semantic Space: {len(self.vector_targets)} canonical vectors in {time.time() - start_time:.2f}s.")

    def match_skill(self, raw_skill, job_domain=None, llm_validator_func=None):
        if not raw_skill or not str(raw_skill).strip():
            return None, None
            
        clean_skill = str(raw_skill).strip()
        lower_skill = clean_skill.lower()
        
        # Strict Pre-Gate: Eliminate hardware specs, shift timings, degrees, and noise
        if ALL_NOISE_RE.search(clean_skill) or lower_skill in ['belong', 'become', 'begin', 'equal opportunity employer']:
            return None, None
        
        # 1. Lexical O(1) Match against Canonicals
        if lower_skill in self.canonical_skills:
            target_id = self.canonical_skills[lower_skill]
            return target_id, self.canonical_names[target_id]
            
        # 2. Lexical O(1) Match against Aliases (With Domain Compatibility Check)
        if lower_skill in self.aliases:
            target_id = self.aliases[lower_skill]
            target_domain = self.skill_domains.get(target_id, "Other/Uncategorized")
            
            # Prevent short acronym collisions across mismatched domains (e.g. CPR in IT vs Medical)
            if are_domains_compatible(job_domain, target_domain) or len(clean_skill) > 5:
                return target_id, self.canonical_names[target_id]
            else:
                print(f"   [!] Blocked cross-domain alias collision: '{raw_skill}' in Job({job_domain}) vs Skill({target_domain})")
            
        # 3. Vector Semantic Match O(N) with Local Cross-Encoder & LLM Reranker
        if len(self.vector_matrix) > 0:
            vec = self.model.encode(clean_skill, normalize_embeddings=True)
            scores = np.dot(self.vector_matrix, vec)
            
            # Top candidates indices
            top_indices = np.argsort(scores)[::-1][:10]
            best_idx = top_indices[0]
            best_bi_score = float(scores[best_idx])
            best_candidate_id = self.vector_targets[best_idx]
            best_candidate_name = self.canonical_names[best_candidate_id]
            
            # Check if text is Arabic
            has_arabic = bool(re.search(r'[\u0600-\u06FF]', clean_skill))
            
            if not has_arabic and self.cross_encoder is not None:
                # Fast Local Cross-Encoder for English pairs
                top_5 = top_indices[:5]
                pairs = [[clean_skill, self.canonical_names[self.vector_targets[i]]] for i in top_5]
                ce_scores = self.cross_encoder.predict(pairs)
                best_ce_idx = int(np.argmax(ce_scores))
                best_ce_score = float(ce_scores[best_ce_idx])
                ce_candidate_id = self.vector_targets[top_5[best_ce_idx]]
                ce_candidate_name = self.canonical_names[ce_candidate_id]
                ce_domain = self.skill_domains.get(ce_candidate_id, "")
                
                # High Confidence Auto-Merge (0 tokens, 15ms)
                if best_ce_score >= 2.0 and (are_domains_compatible(job_domain, ce_domain) or len(clean_skill) > 5):
                    self._save_new_alias(clean_skill, ce_candidate_id)
                    return ce_candidate_id, ce_candidate_name
                    
                # Ambiguity Zone -> Fallback to LLM Reranker if provided
                if (best_ce_score >= -1.5 or best_bi_score >= 0.75) and llm_validator_func is not None:
                    seen_ids = set()
                    candidates = []
                    for idx in top_indices:
                        cid = self.vector_targets[idx]
                        if cid not in seen_ids:
                            cdom = self.skill_domains.get(cid, "")
                            if are_domains_compatible(job_domain, cdom):
                                candidates.append(self.canonical_names[cid])
                                seen_ids.add(cid)
                    if candidates:
                        best_match_doc, best_rerank_score = llm_validator_func(clean_skill, candidates)
                        if best_match_doc and best_rerank_score > 0.5:
                            best_id = self.canonical_skills.get(best_match_doc.lower())
                            if best_id:
                                self._save_new_alias(clean_skill, best_id)
                                return best_id, best_match_doc
            else:
                # Arabic / Fallback LLM Reranker
                if llm_validator_func is not None and best_bi_score >= 0.65:
                    candidates = [self.canonical_names[self.vector_targets[i]] for i in top_indices[:5]]
                    best_match_doc, best_rerank_score = llm_validator_func(clean_skill, candidates)
                    if best_match_doc and best_rerank_score > 0.5:
                        best_id = self.canonical_skills.get(best_match_doc.lower())
                        if best_id:
                            self._save_new_alias(clean_skill, best_id)
                            return best_id, best_match_doc
                    
        # 4. Fallback: Create New Skill if completely unknown
        return self._create_new_skill(clean_skill, domain=job_domain)
        
    def _save_new_alias(self, alias_name, canonical_id):
        lower_alias = alias_name.lower().strip()
        if lower_alias in self.aliases or lower_alias in self.canonical_skills:
            return
            
        self.aliases[lower_alias] = canonical_id
        
        # Dynamic RAM update
        vec = self.model.encode(alias_name, normalize_embeddings=True)
        if self.vector_matrix is not None and len(self.vector_matrix) > 0:
            self.vector_matrix = np.vstack([self.vector_matrix, vec])
        else:
            self.vector_matrix = np.array([vec], dtype=np.float32)
        self.vector_targets.append(canonical_id)
        
        # Persist to DB safely
        try:
            with self.engine.begin() as conn:
                conn.execute(text("""
                    INSERT INTO skill_aliases (skill_id, alias_name) 
                    VALUES (:cid, :name) 
                    ON CONFLICT DO NOTHING
                """), {"cid": canonical_id, "name": alias_name})
        except Exception as e:
            print(f"    [!] Error persisting alias: {e}")

    def _create_new_skill(self, name, domain=None, sub_category=None, normalized_name=None):
        clean_name = name.strip()
        clean_name = re.sub(r'^[\-\*\?\.\s]+', '', clean_name)
        clean_name = re.sub(r'[\.\,\-\:\;\s]+$', '', clean_name)
        # Strip trailing ')' ONLY if there is no opening '(' in the string
        if clean_name.endswith(')') and '(' not in clean_name:
            clean_name = clean_name[:-1].rstrip()
        # If open '(' exists but no closing ')', auto-close it
        elif '(' in clean_name and ')' not in clean_name:
            clean_name = clean_name + ')'
        if not clean_name:
            return None, None
            
        # Refined garbage rejection: Do not create skills from junk or pure numbers
        if len(clean_name) <= 1 or clean_name.isdigit() or len(clean_name) > 60:
            return None, None
            
        dom = domain or "Other/Uncategorized"
        sub = sub_category or "General"
        norm = normalized_name or clean_name
        
        # Determine skill_type for new skill
        lower_clean = clean_name.lower()
        if lower_clean in {'english', 'arabic', 'french', 'german', 'spanish', 'italian'} or 'language' in lower_clean:
            stype = "Language"
        elif any(w in lower_clean for w in ['communication', 'teamwork', 'leadership', 'problem solving', 'negotiation', 'time management']):
            stype = "Soft Skill"
        elif any(w in lower_clean for w in ['pmp', 'iso ', 'cpa', 'cfa', 'six sigma', 'certified']):
            stype = "Certification"
        elif any(w in lower_clean for w in ['.js', '.py', 'sql', 'python', 'java', 'react', 'docker', 'sap', 'excel', 'power bi', 'autocad', 'figma']) or any(lower_clean.endswith(sub) for sub in [' software', ' tool', ' platform', ' erp', ' crm']):
            stype = "Tool / Software"
        else:
            stype = "Hard Skill"
        
        new_id = str(uuid.uuid4())
        vec = self.model.encode(clean_name, normalize_embeddings=True)
        
        self.canonical_skills[clean_name.lower()] = new_id
        self.canonical_names[new_id] = clean_name
        self.skill_domains[new_id] = dom
        self.skill_subcategories[new_id] = sub
        self.skill_types[new_id] = stype
        
        # Dynamic RAM update
        if self.vector_matrix is not None and len(self.vector_matrix) > 0:
            self.vector_matrix = np.vstack([self.vector_matrix, vec])
        else:
            self.vector_matrix = np.array([vec], dtype=np.float32)
        self.vector_targets.append(new_id)
        
        # Persist to DB
        try:
            with self.engine.begin() as conn:
                conn.execute(text("""
                    INSERT INTO skills (id, name, domain, sub_category, normalized_name, skill_type) 
                    VALUES (:id, :name, :dom, :sub, :norm, :stype)
                    ON CONFLICT (name) DO UPDATE SET skill_type = EXCLUDED.skill_type
                """), {"id": new_id, "name": clean_name, "dom": dom, "sub": sub, "norm": norm, "stype": stype})
                
                conn.execute(text("""
                    INSERT INTO skill_embeddings (skill_id, embedding, model_name, dimension) 
                    VALUES (:id, :emb, 'all-MiniLM-L6-v2', 384)
                    ON CONFLICT (skill_id) DO NOTHING
                """), {"id": new_id, "emb": vec.tolist()})
        except Exception as e:
            print(f"    [!] Error creating skill in DB: {e}")
            
        return new_id, clean_name
