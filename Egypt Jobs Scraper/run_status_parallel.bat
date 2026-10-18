@echo off
echo ================================================
echo    Parallel Status Updater - All Sources
echo ================================================
echo.
echo Starting all sources in parallel...
echo.

:: LinkedIn - new window
start "Status Updater - LinkedIn" cmd /k "cd /d "%~dp0" && node node_modules/ts-node/dist/bin.js src/sync_status.ts --source LinkedIn"

:: Wuzzuf - new window
start "Status Updater - Wuzzuf" cmd /k "cd /d "%~dp0" && node node_modules/ts-node/dist/bin.js src/sync_status.ts --source Wuzzuf"

:: Indeed - new window
start "Status Updater - Indeed" cmd /k "cd /d "%~dp0" && node node_modules/ts-node/dist/bin.js src/sync_status.ts --source Indeed"

:: Forasna - new window
start "Status Updater - Forasna" cmd /k "cd /d "%~dp0" && node node_modules/ts-node/dist/bin.js src/sync_status.ts --source Forasna"

:: Bayt - new window (browser will open separately)
start "Status Updater - Bayt" cmd /k "cd /d "%~dp0" && node node_modules/ts-node/dist/bin.js src/sync_status.ts --source Bayt"

:: Glassdoor - new window
start "Status Updater - Glassdoor" cmd /k "cd /d "%~dp0" && node node_modules/ts-node/dist/bin.js src/sync_status.ts --source Glassdoor"

echo All workers launched in separate windows!
echo Close this window whenever you want.
pause
