@echo off
title LinkedIn Scraper V2 (Parallel Mode)

REM Check if node_modules exists, if not run npm install
IF NOT EXIST "node_modules\" (
    echo [Setup] First time setup: Installing dependencies...
    npm install
)

REM Compile TypeScript files to JavaScript
echo [Build] Compiling TypeScript files...
call npx tsc

REM Check if compilation succeeded
IF %ERRORLEVEL% NEQ 0 (
    echo.
    echo [Error] TypeScript compilation failed! Please fix the errors.
    pause
    exit /b %ERRORLEVEL%
)

REM Run the generated JavaScript file
echo [Run] Starting LinkedIn Scraper V2...
node dist/LinkedInManagerV2.js

echo.
pause
