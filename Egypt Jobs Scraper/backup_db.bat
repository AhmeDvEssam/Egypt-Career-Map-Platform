@echo off
echo Backing up database...
set PGPASSWORD=egypt_jobs_2026
pg_dump -U egypt_jobs -h localhost -p 5432 -d egypt_jobs_db -F c -f "database_backup_%date:~-4,4%%date:~-10,2%%date:~-7,2%.dump"
echo Backup completed!
pause
