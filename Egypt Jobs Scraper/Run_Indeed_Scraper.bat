@echo off
title Indeed Global Scraper (Jobs + Salaries)
echo ========================================================
echo      Indeed Scraper (Stealth Playwright + Salaries)
echo ========================================================
echo Starting Indeed scraper...
cd /d "%~dp0"
node node_modules/ts-node/dist/bin.js --transpile-only src/IndeedManager.ts
echo.
echo ========================================================
echo Scraper execution finished.
pause
