@echo off
title AI Worker Engine (25 Threads)
echo =======================================================
echo          AI WORKER SPEED SELECTION MENU
echo =======================================================
echo [1] SLOW   (Extremely safe, 5 RPM for Gemini)
echo [2] MEDIUM (Normal breathing room, 10 RPM) [DEFAULT]
echo [3] FAST   (Pushing limits, 13 RPM)
echo [4] MAX    (No safety margin, 15 RPM - May cause 429 errors!)
echo =======================================================
set /p speed_choice="Select Speed Mode (1-4) or press ENTER for MEDIUM: "

set SPEED=medium
if "%speed_choice%"=="1" set SPEED=slow
if "%speed_choice%"=="2" set SPEED=medium
if "%speed_choice%"=="3" set SPEED=fast
if "%speed_choice%"=="4" set SPEED=max

echo.
echo Starting AI Worker Engine with 25 parallel agents in [%SPEED%] mode...
cd "D:\Hire Q Project\Backend API & Integration"
python -u ai_worker.py --threads 25 --speed %SPEED%
pause
