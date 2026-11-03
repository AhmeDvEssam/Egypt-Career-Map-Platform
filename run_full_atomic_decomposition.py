"""
Full Production Atomic Skill Decomposition
===========================================
Runs the Atomic Decomposition Engine over all 28,824 raw skills from skills.csv,
enriches each with empirical job frequency from PostgreSQL egypt_jobs_db,
and exports the complete relational graph to egypt_skills_decomposed_graph.csv.
"""

import sys
import io
import time
import psycopg2
import pandas as pd
from scratch.atomic_decomposition_engine import AtomicDecompositionEngine

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

def main():
    print("=" * 80)
    print("  PRODUCTION RUN: ATOMIC SKILL DECOMPOSITION & RELATIONAL GRAPH")
    print("=" * 80)
    
    # 1. Fetch Empirical Job Counts from PostgreSQL
    print("[1/4] Fetching job frequencies from PostgreSQL egypt_jobs_db...")
    freq_map = {}
    try:
        conn = psycopg2.connect("postgresql://postgres:postgres@localhost:5432/egypt_jobs_db")
        cur = conn.cursor()
        cur.execute("""
            SELECT s.name, COUNT(js.job_id) as job_count
            FROM skills s
            LEFT JOIN job_skills js ON s.id = js.skill_id
            GROUP BY s.name;
        """)
        for name, cnt in cur.fetchall():
            freq_map[str(name).strip().lower()] = cnt
        cur.close()
        conn.close()
        print(f"  [+] Loaded job counts for {len(freq_map):,} skills from PostgreSQL.")
    except Exception as e:
        print(f"  [!] Database connection failed: {e}. Falling back to default frequency=1.")

    # 2. Load Raw Skills from skills.csv
    print("[2/4] Loading skills.csv...")
    df_raw = pd.read_csv("skills.csv")
    raw_skills = df_raw["name"].dropna().unique().tolist()
    total_raw = len(raw_skills)
    print(f"  [+] Total unique raw skills to decompose: {total_raw:,}")

    # 3. Initialize Decomposition Engine
    print("[3/4] Initializing Atomic Decomposition Engine...")
    engine = AtomicDecompositionEngine("standard_skills_catalog.csv")

    # 4. Process all skills in batches
    print(f"[4/4] Decomposing {total_raw:,} raw skills into atomic graph rows...")
    t0 = time.time()
    
    all_decomposed_rows = []
    status_counts = {}
    rejected_count = 0
    
    for idx, raw in enumerate(raw_skills):
        raw_clean = str(raw).strip()
        job_cnt = freq_map.get(raw_clean.lower(), 1)
        
        rows = engine.decompose(raw_clean)
        for r in rows:
            r["job_count"] = job_cnt
            all_decomposed_rows.append(r)
            
            st = r["match_status"]
            status_counts[st] = status_counts.get(st, 0) + 1
            if st == "REJECTED_NOISE":
                rejected_count += 1
                
        if (idx + 1) % 5000 == 0 or (idx + 1) == total_raw:
            elapsed = time.time() - t0
            speed = (idx + 1) / elapsed
            print(f"  -> Processed {idx+1:,} / {total_raw:,} skills ({((idx+1)/total_raw)*100:.1f}%) | Speed: {speed:.1f} skills/s | Rows generated: {len(all_decomposed_rows):,}")

    t_total = time.time() - t0
    print("\n" + "=" * 80)
    print(f"  DECOMPOSITION COMPLETE IN {t_total:.1f} SECONDS ({t_total/60:.2f} MINUTES)!")
    print("=" * 80)
    print(f"Total raw skills processed:      {total_raw:,}")
    print(f"Total decomposed rows generated:  {len(all_decomposed_rows):,}")
    print(f"Total noise rows rejected:        {rejected_count:,}")
    print("\nBreakdown by Match Status:")
    for st, cnt in sorted(status_counts.items(), key=lambda x: -x[1]):
        print(f"  - {st:<30}: {cnt:>7,} ({cnt/len(all_decomposed_rows)*100:>5.1f}%)")

    # 5. Export to CSV
    output_path = "egypt_skills_decomposed_graph.csv"
    print(f"\n[*] Exporting decomposed graph to: {output_path}...")
    df_out = pd.DataFrame(all_decomposed_rows)
    # Reorder columns
    cols = [
        "raw_skill",
        "atomic_skill",
        "matched_atomic_skill",
        "separated_by",
        "separated_from_before",
        "separated_from_after",
        "skill_level",
        "skill_type",
        "domain",
        "sub_category",
        "job_count",
        "match_status",
        "rejection_reason"
    ]
    df_out = df_out[cols]
    df_out.to_csv(output_path, index=False, encoding="utf-8-sig")
    print(f"[+] Successfully saved {len(df_out):,} rows to {output_path}!")

if __name__ == "__main__":
    main()
