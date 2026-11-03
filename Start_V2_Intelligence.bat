@echo off
title Hire Q - Egypt Career Intelligence Platform V2
echo ========================================================
echo    Starting Hire Q - Career Intelligence V2 (New Design)
echo ========================================================
echo.

REM 1. Start FastAPI Backend if not already running
echo [1/2] Starting Backend API on port 8000...
cd /d "d:\Hire Q Project\Backend API & Integration"
start "Hire Q Backend API" cmd /k "python main.py"

REM 2. Start Next.js Frontend
echo [2/2] Starting Next.js Frontend on port 3005...
cd /d "d:\Hire Q Project\Frontend (Landing + Map + Auth)\frontend"
start "Hire Q Frontend V2" cmd /k "npm run dev -- -p 3005"

REM 3. Wait a moment and launch the browser directly to the new design
timeout /t 3 /nobreak >nul
echo.
echo Launching browser to the New Intelligence Design...
start http://localhost:3005/intelligence

echo.
echo ========================================================
echo SUCCESS: System is running!
echo URL: http://localhost:3005/intelligence
echo (The old design is still available at http://localhost:3005)
echo ========================================================
echo.
pause
