@echo off
title AI Worker Orchestrator
color 0B
cls
echo ========================================================
echo       Hire Q - AI Worker Orchestrator (Multi-Agent)
echo ========================================================
echo.
echo This tool distributes the AI analysis workload across
echo multiple terminals and sub-agents to maximize rate limits.
echo.
echo Select routing strategy:
echo 1. Master Agent (All sources, high thread count)
echo 2. Split by Site (Wuzzuf, LinkedIn, Bayt - parallel windows)
echo 3. Split by Order (Top and Bottom - parallel windows)
echo.
set /p mode="Enter choice (1/2/3): "

if "%mode%"=="1" goto opt1
if "%mode%"=="2" goto opt2
if "%mode%"=="3" goto opt3
goto end

:opt1
echo.
echo [Rate Limit Info] Maximum total threads for all your API keys combined.
echo Recommended: 10 to 15 threads total.
set /p threads="Enter total sub-agents (threads): "
echo.
echo [i] Deploying Master Agent...
start cmd /k "title Master Agent & python ai_worker.py --threads %threads%"
goto end

:opt2
echo.
echo [Rate Limit Info] Total RPM shared across all APIs determines max threads.
echo Recommended: 3 to 5 threads PER SITE (total 9-15 threads).
set /p threads="Enter sub-agents (threads) per site: "
echo.
echo [i] Deploying Wuzzuf Agent...
start cmd /k "title Wuzzuf Agent & python ai_worker.py --source wuzzuf --threads %threads%"
echo [i] Deploying LinkedIn Agent...
start cmd /k "title LinkedIn Agent & python ai_worker.py --source linkedin --threads %threads%"
echo [i] Deploying Bayt Agent...
start cmd /k "title Bayt Agent & python ai_worker.py --source bayt --threads %threads%"
goto end

:opt3
echo.
echo [Rate Limit Info] Recommended: 5 to 10 threads PER AGENT.
set /p threads="Enter sub-agents (threads) per agent: "
echo.
echo [i] Deploying Ascending Agent (Oldest jobs)...
start cmd /k "title Ascending Agent & python ai_worker.py --order asc --threads %threads%"
echo [i] Deploying Descending Agent (Newest jobs)...
start cmd /k "title Descending Agent & python ai_worker.py --order desc --threads %threads%"
goto end

:end
echo.
echo [!] All requested AI Workers deployed successfully!
pause
