@echo off
title HireQ Control Panel
color 0A
setlocal

:MAIN_MENU
cls
echo.
echo  =====================================================
echo      ___  ___  ___  ___ ________
echo     ^|  \/  ^|/ _ \^|   ^| __^|    ^|
echo     ^| .  . ^| ^| ^| ^| ^| ^| ^|__^|    ^|
echo     ^|_^|^|_^|^|^|_^|^|_^|^|_^|^|___^|____^|
echo.
echo         Hire Q -- Control Panel v2.0
echo  =====================================================
echo.
echo   [ 1 ]  Start All Services
echo   [ 2 ]  Start Backend API Only        (port 8000)
echo   [ 3 ]  Start Frontend Only           (port 3000)
echo   [ 4 ]  Start AI Dashboard (Streamlit)(port 8501)
echo   [ 5 ]  Run MLS Pipeline (Bulk Seed)
echo   [ 6 ]  Stop All Services
echo   [ 7 ]  Check Knowledge Graph Stats
echo   [ 8 ]  Open Frontend in Browser
echo   [ 9 ]  Open AI Dashboard in Browser
echo   [ W ]  Start AI Worker (Background Jobs)
echo   [ B ]  Run Job Categories Backfill
echo   [ 0 ]  Exit
echo.
echo  =====================================================
echo.
set /p CHOICE=   Enter your choice: 

if "%CHOICE%"=="1" goto START_ALL
if "%CHOICE%"=="2" goto START_BACKEND
if "%CHOICE%"=="3" goto START_FRONTEND
if "%CHOICE%"=="4" goto START_DASHBOARD
if "%CHOICE%"=="5" goto START_PIPELINE
if "%CHOICE%"=="6" goto STOP_ALL
if "%CHOICE%"=="7" goto CHECK_STATS
if "%CHOICE%"=="8" goto OPEN_FRONTEND
if "%CHOICE%"=="9" goto OPEN_DASHBOARD
if /I "%CHOICE%"=="W" goto START_AI_WORKER
if /I "%CHOICE%"=="B" goto RUN_BACKFILL
if "%CHOICE%"=="0" goto EXIT
goto MAIN_MENU

:START_ALL
cls
echo.
echo  [*] Starting All Services...
echo.
echo  [1/3] Starting Backend API (port 8000)...
cd /d "D:\Hire Q Project\Backend API & Integration"
start "HireQ - Backend API" cmd /k "python main.py"
timeout /t 3 /nobreak >nul

echo  [2/3] Starting Frontend (port 3000)...
cd /d "D:\Hire Q Project\Frontend (Landing + Map + Auth)\frontend"
start "HireQ - Frontend" cmd /k "npm run dev"
timeout /t 2 /nobreak >nul

echo  [3/3] Starting AI Dashboard (port 8501)...
cd /d "D:\Hire Q Project\Backend API & Integration"
start "HireQ - AI Dashboard" cmd /k "python -m streamlit run ai_dashboard.py --server.port 8501"
cd /d "%~dp0"

echo.
echo  [+] All services are starting!
echo.
echo      Backend  : http://localhost:8000
echo      Frontend : http://localhost:3000
echo      Dashboard: http://localhost:8501
echo.
pause
goto MAIN_MENU

:START_BACKEND
echo.
echo  [*] Starting Backend API on port 8000...
cd /d "D:\Hire Q Project\Backend API & Integration"
start "HireQ - Backend API" cmd /k "python main.py"
cd /d "%~dp0"
echo  [+] Done! Check: http://localhost:8000
echo.
pause
goto MAIN_MENU

:START_FRONTEND
echo.
echo  [*] Starting Frontend on port 3000...
cd /d "D:\Hire Q Project\Frontend (Landing + Map + Auth)\frontend"
start "HireQ - Frontend" cmd /k "npm run dev"
cd /d "%~dp0"
echo  [+] Done! Check: http://localhost:3000
echo.
pause
goto MAIN_MENU

:START_DASHBOARD
echo.
echo  [*] Starting AI Dashboard on port 8501...
cd /d "D:\Hire Q Project\Backend API & Integration"
start "HireQ - AI Dashboard" cmd /k "python -m streamlit run ai_dashboard.py --server.port 8501"
cd /d "%~dp0"
echo  [+] Done! Check: http://localhost:8501
echo.
pause
goto MAIN_MENU

:START_PIPELINE
echo.
echo  [*] Starting MLS Bulk Seed Pipeline...
echo      This will process all Kaggle resumes to seed the Knowledge Graph.
echo      The pipeline will run in a separate window.
echo.
cd /d "D:\Hire Q Project"
start "HireQ - MLS Pipeline" cmd /k "python mls_pipeline.py"
cd /d "%~dp0"
echo  [+] Pipeline started! Check the new window for progress.
echo.
pause
goto MAIN_MENU

:STOP_ALL
echo.
echo  [*] Stopping all HireQ services...
taskkill /FI "WINDOWTITLE eq HireQ - Backend API" /F >nul 2>&1
taskkill /FI "WINDOWTITLE eq HireQ - Frontend" /F >nul 2>&1
taskkill /FI "WINDOWTITLE eq HireQ - AI Dashboard" /F >nul 2>&1
taskkill /FI "WINDOWTITLE eq HireQ - MLS Pipeline" /F >nul 2>&1
echo  [+] All services stopped.
echo.
pause
goto MAIN_MENU

:CHECK_STATS
echo.
echo  [*] Fetching Knowledge Graph stats from database...
echo.
python -c "
from sqlalchemy import create_engine, text
engine = create_engine('postgresql://egypt_jobs:egypt_jobs_2026@localhost:5432/egypt_jobs_db')
with engine.connect() as conn:
    resumes = conn.execute(text('SELECT COUNT(*) FROM kaggle_raw_resumes')).scalar()
    processed = conn.execute(text('SELECT COUNT(*) FROM kaggle_raw_resumes WHERE processed = TRUE')).scalar()
    intel_records = conn.execute(text('SELECT COUNT(*) FROM cv_intelligence_records')).scalar()
    unique_skills = conn.execute(text('SELECT COUNT(DISTINCT skill_name) FROM market_skill_trends')).scalar()
    rel_count = conn.execute(text('SELECT COUNT(*) FROM skill_tool_relationships')).scalar()
    print(f'  Total Kaggle Resumes   : {resumes}')
    print(f'  Resumes Processed      : {processed}')
    print(f'  Intelligence Records   : {intel_records}')
    print(f'  Unique Skills Tracked  : {unique_skills}')
    print(f'  Tool-Skill Rel         : {rel_count}')
    print()
    print('  Top 10 Skills by Supply:')
    top = conn.execute(text('SELECT skill_name, supply_count FROM market_skill_trends ORDER BY supply_count DESC LIMIT 10')).fetchall()
    for s in top:
        name = s[0].encode('ascii','replace').decode()
        print(f'    {name}: {s[1]} CVs')
"
echo.
pause
goto MAIN_MENU

:OPEN_FRONTEND
start http://localhost:3000
goto MAIN_MENU

:OPEN_DASHBOARD
start http://localhost:8501
goto MAIN_MENU

:START_AI_WORKER
echo.
echo  [*] Starting AI Worker in Background...
echo      Speed is controlled via the AI Dashboard (Settings Tab).
echo.
cd /d "D:\Hire Q Project\Backend API & Integration"
start "HireQ - AI Worker Engine" cmd /k "python ai_worker.py"
cd /d "%~dp0"
echo  [+] AI Worker Engine started in a new window!
echo.
pause
goto MAIN_MENU

:RUN_BACKFILL
echo.
echo  [*] Starting Job Categories Backfill...
echo      This will categorize all old jobs in batches of 50.
echo.
cd /d "D:\Hire Q Project\Backend API & Integration"
start "HireQ - Categories Backfill" cmd /k "python backfill_categories.py"
cd /d "%~dp0"
echo  [+] Backfill started in a new window!
echo.
pause
goto MAIN_MENU

:EXIT
echo.
echo  Bye!
echo.
exit /b 0
