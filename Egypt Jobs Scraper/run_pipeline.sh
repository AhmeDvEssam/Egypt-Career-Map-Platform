#!/bin/bash
set -e

echo "=================================================="
echo "      🚀 EGYPT JOBS SCRAPER - PIPELINE RUN      "
echo "=================================================="

# 1. Run Indeed Scraper (Finite Batch)
echo ""
echo "[1/3] Running Indeed Scraper (V3)..."
echo "--------------------------------------------------"
npm run start:indeed

# 2. Ingest Data (All Sources)
echo ""
echo "[2/3] Ingesting Data into PostgreSQL..."
echo "--------------------------------------------------"
npx ts-node src/ingest_jobs.ts

# 3. Verify Database
echo ""
echo "[3/3] Verifying Database Statistics..."
echo "--------------------------------------------------"
npx ts-node src/check_stats.ts

echo ""
echo "=================================================="
echo "✅ PIPELINE FINISHED"
echo "=================================================="
echo "NOTE: LinkedIn & Wuzzuf scrapers run as continuous daemons."
echo "To run them: 'npm run start:linkedin' or 'npm run start'"
echo "=================================================="
