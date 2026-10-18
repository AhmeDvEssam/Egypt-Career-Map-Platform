#!/bin/bash

# LinkedIn Data Repair & Cleanup Tool
# Usage: ./run_repair.sh

echo "🚀 Starting Unified LinkedIn Repair..."
echo "----------------------------------------"
echo "Target: data/linkedin_clean_data.csv"
echo "----------------------------------------"

# Run the unified repair script
# Ensure ts-node is available
if ! command -v npx &> /dev/null; then
    echo "❌ npx is not installed. Please install Node.js."
    exit 1
fi

npx ts-node src/scrapers/linkedin/LinkedInDataRepair.ts

echo "----------------------------------------"
echo "✅ Repair Process Finished."
