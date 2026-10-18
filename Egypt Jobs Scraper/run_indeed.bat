@echo off
cd /d "%~dp0"
echo Compiling TypeScript files...
call npx tsc
echo Running Indeed Scraper...
node dist/IndeedManager.js
pause
