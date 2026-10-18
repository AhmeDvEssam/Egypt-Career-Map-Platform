@echo off
title Glassdoor Egypt Scraper (Jobs + Salaries)
echo ================================================
echo    Glassdoor Egypt Scraper (Jobs + Salaries)
echo ================================================
cd /d "%~dp0"
node node_modules/ts-node/dist/bin.js --transpile-only src/GlassdoorManager.ts
pause
