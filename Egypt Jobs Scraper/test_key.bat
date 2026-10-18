@echo off
title Gemini API Key Tester
color 0A
echo ========================================================
echo                 Gemini API Key Tester
echo ========================================================
echo.
set /p API_KEY="Please paste your Gemini API Key here and press Enter: "

if "%API_KEY%"=="" (
    echo.
    echo [ERROR] You didn't enter an API Key!
    echo.
    pause
    exit /b
)

echo.
echo Running tests...
node test_key.js %API_KEY%

echo.
pause
