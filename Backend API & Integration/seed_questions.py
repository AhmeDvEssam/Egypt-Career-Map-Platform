import os
import json
import uuid
import psycopg2
from sentence_transformers import SentenceTransformer
from dotenv import load_dotenv

load_dotenv()
PG_URL = os.getenv(
    "DATABASE_URL", 
    "postgresql://egypt_jobs:egypt_jobs_2026@localhost:5432/egypt_jobs_db"
)

def main():
    print("Connecting to DB...")
    conn = psycopg2.connect(PG_URL)
    conn.autocommit = True
    cursor = conn.cursor()

    print("Creating table...")
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS saved_questions (
        id UUID PRIMARY KEY,
        question TEXT NOT NULL,
        intent JSONB NOT NULL,
        embedding FLOAT[],
        created_at TIMESTAMPTZ DEFAULT NOW()
    );
    """)

    print("Loading SentenceTransformer...")
    model = SentenceTransformer('all-MiniLM-L6-v2')

    roles = ["Data Analyst", "Software Engineer", "Marketing Manager", "Accountant", "Project Manager"]
    locations = ["Cairo", "Alexandria", "Giza", "Mansoura", ""]

    questions = []
    
    for role in roles:
        for loc in locations:
            if loc:
                q1 = f"في كام وظيفة لـ {role} في {loc}؟"
                q2 = f"عايز اعرف الوظايف المتاحة للـ {role} في {loc}"
                intent1 = {"intentId": "job_count", "parameters": {"city": loc, "role": role}}
                
                q3 = f"ايه اهم المهارات المطلوبة للـ {role} في {loc}؟"
                q4 = f"مهارات الـ {role} المطلوبة في {loc} ايه؟"
                intent2 = {"intentId": "top_skills", "parameters": {"city": loc, "role": role}}
                
                questions.extend([(q1, intent1), (q2, intent1), (q3, intent2), (q4, intent2)])
            else:
                q1 = f"في كام وظيفة لـ {role} في مصر؟"
                q2 = f"عايز اعرف الوظايف المتاحة للـ {role}"
                intent1 = {"intentId": "job_count", "parameters": {"role": role}}
                
                q3 = f"ايه اهم المهارات المطلوبة للـ {role}؟"
                q4 = f"مهارات الـ {role} ايه؟"
                intent2 = {"intentId": "top_skills", "parameters": {"role": role}}
                
                questions.extend([(q1, intent1), (q2, intent1), (q3, intent2), (q4, intent2)])

    print(f"Generated {len(questions)} questions. Encoding embeddings...")
    texts = [q[0] for q in questions]
    embeddings = model.encode(texts)
    
    print("Inserting into DB...")
    for (q_text, intent), emb in zip(questions, embeddings):
        q_id = str(uuid.uuid4())
        intent_json = json.dumps(intent)
        emb_list = emb.tolist()
        
        cursor.execute(
            "INSERT INTO saved_questions (id, question, intent, embedding) VALUES (%s, %s, %s, %s)",
            (q_id, q_text, intent_json, emb_list)
        )
        
    print("Done!")
    cursor.close()
    conn.close()

if __name__ == "__main__":
    main()
