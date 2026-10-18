@echo off
title Job Status Checker (Turbo Edition)
echo ================================================
echo    Database Job Status Checker (Turbo Edition)
echo ================================================
node node_modules/ts-node/dist/bin.js src/sync_status.ts %*
echo.
pause
