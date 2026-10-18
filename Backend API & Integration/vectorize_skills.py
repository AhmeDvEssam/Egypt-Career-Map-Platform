import time
import os
from sqlalchemy import create_engine, text
from sentence_transformers import SentenceTransformer
from dotenv import load_dotenv

load_dotenv()
PG_URL = os.getenv("DATABASE_URL", "postgresql://egypt_jobs:egypt_jobs_2026@localhost:5432/egypt_jobs_db")
engine = create_engine(PG_URL)

def run_vectorization():
    print("[+] Loading local sentence-transformers model (all-MiniLM-L6-v2)...")
    model = SentenceTransformer('all-MiniLM-L6-v2')
    dimension = 384
    model_name = "sentence-transformers/all-MiniLM-L6-v2"
    
    with engine.connect() as conn:
        print("[+] Fetching canonical skills from database...")
        query = text("""
            SELECT s.id, s.name 
            FROM skills s 
            LEFT JOIN skill_embeddings e ON s.id = e.skill_id
            WHERE e.skill_id IS NULL
        """)
        result = conn.execute(query).fetchall()
        skills = [{"id": r[0], "name": r[1]} for r in result]
        
    if not skills:
        print("[-] All skills are already vectorized! Exiting.")
        return
        
    print(f"[*] Found {len(skills)} new skills to vectorize.")
    names = [s["name"] for s in skills]
    
    print(f"[*] Encoding {len(names)} skills locally... (This is blazing fast)")
    start_time = time.time()
    # Normalize embeddings to 1.0 length so we can use Dot Product for Cosine Similarity later!
    embeddings = model.encode(names, normalize_embeddings=True)
    end_time = time.time()
    print(f"[+] Encoding finished in {end_time - start_time:.2f} seconds!")
    
    print("[*] Storing vectors in PostgreSQL (skill_embeddings)...")
    with engine.begin() as conn:
        for i, s in enumerate(skills):
            emb_list = embeddings[i].tolist()
            conn.execute(
                text("""
                INSERT INTO skill_embeddings (skill_id, embedding, model_name, dimension) 
                VALUES (:sid, :emb, :mname, :dim)
                """), 
                {
                    "sid": s["id"], 
                    "emb": emb_list, 
                    "mname": model_name, 
                    "dim": dimension
                }
            )
            
    print(f"[+] Successfully vectorized and stored {len(skills)} skills!")

if __name__ == "__main__":
    run_vectorization()
