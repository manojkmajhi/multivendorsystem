@echo off
echo Starting All Strawhats Production Server...
where pm2 >nul 2>nul || npm install -g pm2
pm2 stop allstrawhats 2>nul
pm2 start ecosystem.config.js
echo.
echo Server started! Visit http://localhost:3000
echo Logs: pm2 logs allstrawhats
pm2 logs allstrawhats
