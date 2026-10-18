"""
Market Learning System - Bulk Intelligence Pipeline
====================================================
Reads all resumes from kaggle_raw_resumes, sends them to the LLM
to extract Skills, Tools, and Relationships, then writes them to:
  - cv_intelligence_records   (raw intelligence per CV)
  - market_skill_trends       (skill supply over time by period)
  - skill_tool_relationships  (Tool -> Skill co-occurrence graph)
"""
import sys
import json
import time
import logging
from datetime import date
from sqlalchemy import create_engine, text

sys.path.append('D:/Hire Q Project/Backend API & Integration')
from cv_matcher import verify_skills_batch
from ai_worker import SmartAPIRouter

# --- Config ---
PG_URL = 'postgresql://egypt_jobs:egypt_jobs_2026@localhost:5432/egypt_jobs_db'
BATCH_SIZE = 10        # process N resumes per round
SLEEP_BETWEEN_CALLS = 3  # seconds between LLM calls (rate limit protection)
PERIOD_DATE = date.today().isoformat()   # stamp all records with today as supply snapshot

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler('D:/Hire Q Project/mls_pipeline.log', encoding='utf-8')
    ]
)
log = logging.getLogger(__name__)

engine = create_engine(PG_URL)
router = SmartAPIRouter()

# ---------- Helpers ----------

def upsert_skill_trend(conn, skill_name: str, delta_supply: int = 1):
    conn.execute(text('''
        INSERT INTO market_skill_trends (skill_name, period_type, period_date, supply_count)
        VALUES (:skill, 'monthly', date_trunc('month', CURRENT_DATE), :delta)
        ON CONFLICT (skill_name, period_type, period_date)
        DO UPDATE SET supply_count = market_skill_trends.supply_count + EXCLUDED.supply_count
    '''), {"skill": skill_name, "delta": delta_supply})


def upsert_tool_relationship(conn, tool_name: str, skill_name: str):
    conn.execute(text('''
        INSERT INTO skill_tool_relationships (tool_name, related_skill, co_occurrence_count, last_seen)
        VALUES (:tool, :skill, 1, CURRENT_DATE)
        ON CONFLICT (tool_name, related_skill)
        DO UPDATE SET 
            co_occurrence_count = skill_tool_relationships.co_occurrence_count + 1,
            last_seen = CURRENT_DATE
    '''), {"tool": tool_name, "skill": skill_name})


def mark_resume_processed(conn, resume_id: int):
    conn.execute(text(
        "UPDATE kaggle_raw_resumes SET processed = TRUE WHERE id = :id"
    ), {"id": resume_id})


# ---------- Main Pipeline ----------

def run_pipeline():
    with engine.connect() as conn:
        # Add processed flag if not exists
        conn.execute(text('''
            ALTER TABLE kaggle_raw_resumes 
            ADD COLUMN IF NOT EXISTS id SERIAL, 
            ADD COLUMN IF NOT EXISTS processed BOOLEAN DEFAULT FALSE
        '''))
        conn.commit()

    log.info("=== MLS Pipeline Started ===")

    while True:
        with engine.connect() as conn:
            rows = conn.execute(text(
                "SELECT id, category, resume_text FROM kaggle_raw_resumes WHERE processed = FALSE LIMIT :n"
            ), {"n": BATCH_SIZE}).fetchall()

        if not rows:
            log.info("=== All resumes processed! Pipeline complete. ===")
            break

        log.info(f"Processing batch of {len(rows)} resumes...")

        for row in rows:
            resume_id, category, cv_text = row[0], row[1], row[2]
            log.info(f"  Processing resume #{resume_id} | Category: {category}")

            try:
                # We pass an empty skills list - the LLM will focus entirely on extraction
                verified_skills, new_skills, tools_used, provider = verify_skills_batch(
                    cv_text, [], router
                )

                with engine.connect() as conn:
                    # 1. Save raw intelligence record
                    conn.execute(text('''
                        INSERT INTO cv_intelligence_records 
                            (session_id, target_role, extracted_new_skills, tools_used, category, period_date)
                        VALUES (:session_id, :target_role, :skills, :tools, :category, :period)
                    '''), {
                        "session_id": f"mls-pipeline-{resume_id}",
                        "target_role": category,
                        "skills": json.dumps(new_skills),
                        "tools": json.dumps(tools_used),
                        "category": category,
                        "period": PERIOD_DATE
                    })

                    # 2. Update skill supply trends
                    for skill in new_skills:
                        upsert_skill_trend(conn, skill, delta_supply=1)

                    # 3. Record Tool -> Skill relationships (tool seen alongside skill in same CV)
                    for tool in tools_used:
                        for skill in new_skills:
                            upsert_tool_relationship(conn, tool, skill)

                    # 4. Mark as processed
                    mark_resume_processed(conn, resume_id)
                    conn.commit()

                log.info(f"    -> Discovered {len(new_skills)} skills, {len(tools_used)} tools via {provider}")

            except Exception as e:
                log.error(f"    -> Failed resume #{resume_id}: {e}")

            time.sleep(SLEEP_BETWEEN_CALLS)

        log.info(f"Batch done. Sleeping 5s before next batch...")
        time.sleep(5)

    # --- Final summary ---
    with engine.connect() as conn:
        total_skills = conn.execute(text("SELECT COUNT(DISTINCT skill_name) FROM market_skill_trends")).scalar()
        total_tools = conn.execute(text("SELECT COUNT(DISTINCT tool_name) FROM skill_tool_relationships")).scalar()
        top_skills = conn.execute(text(
            "SELECT skill_name, supply_count FROM market_skill_trends ORDER BY supply_count DESC LIMIT 10"
        )).fetchall()

    log.info(f"\n=== PIPELINE SUMMARY ===")
    log.info(f"Total unique skills discovered: {total_skills}")
    log.info(f"Total unique tools mapped: {total_tools}")
    log.info(f"Top 10 skills by supply:")
    for s in top_skills:
        log.info(f"  {s[0]}: {s[1]} CVs")


if __name__ == "__main__":
    run_pipeline()
