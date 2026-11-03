@echo off
title Hire Q - Direct ATS Public Ingestion (Egypt Scope)
color 0A
echo ==========================================================================
echo        HIRE Q - DIRECT ATS INGESTION PIPELINE (EGYPT SCOPE)
echo ==========================================================================
echo Target Platforms: Lever, Workable, Greenhouse, Ashby, SmartRecruiters
echo Speed: Direct JSON REST APIs (Zero Browser Overhead)
echo.

cd /d "%~dp0"
python run_ats_scraper.py %*

echo.
echo ==========================================================================
echo Execution Finished.
pause
