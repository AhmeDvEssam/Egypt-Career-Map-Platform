@echo off
echo Starting Egypt's Career Map Platform...

REM Start FastAPI Backend
echo Starting FastAPI Backend on port 8000...
cd "Backend API & Integration"
start cmd /k "python main.py"
cd ..

REM Start Next.js Frontend on port 3005 to avoid conflicts
echo Starting Next.js Frontend on port 3005...
cd "Frontend (Landing + Map + Auth)/frontend"
start cmd /k "npm run dev -- -p 3005"

echo.
echo ========================================================
echo SUCCESS: Both servers are starting in separate windows!
echo.
echo [IMPORTANT] The Frontend is now at: http://localhost:3005
echo [IMPORTANT] Do NOT use port 3000 anymore!
echo ========================================================
echo.
pause
