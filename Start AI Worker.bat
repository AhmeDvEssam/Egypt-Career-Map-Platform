@echo off
title Hire Q - AI Worker + Dashboard
color 0A

echo.
echo  ==========================================
echo   Hire Q AI System - Starting...
echo  ==========================================
echo.

cd /d "D:\Hire Q Project\Backend API & Integration"

:: Kill any existing python workers on port 8000
echo [1/3] Cleaning up old processes...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":8000" ^| findstr "LISTENING"') do (
    taskkill /F /PID %%a >nul 2>&1
)

:: Kill any stale python ai_worker processes
taskkill /F /IM python.exe >nul 2>&1
timeout /t 2 /nobreak >nul

:: Start the FastAPI Dashboard Server in background
echo [2/3] Starting Dashboard Server on port 8000...
start "Hire Q Dashboard" /min cmd /c "python main.py"
timeout /t 5 /nobreak >nul

:: Open the browser
echo [3/3] Opening Dashboard in browser...
start "" http://localhost:8000/dashboard

echo.
echo  Dashboard is live at: http://localhost:8000/dashboard
echo.
echo  ==========================================
echo   Starting AI Worker (reads worker_config.json)
echo   Press Ctrl+C to stop.
echo  ==========================================
echo.

:: Start the AI Worker (foreground so you can see live output)
python ai_worker.py

echo.
echo  [!] AI Worker stopped.
pause
