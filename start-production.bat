@echo off
echo ========================================
echo   All Strawhats - Production Startup
echo ========================================
echo.

REM Check if PM2 is installed
where pm2 >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo PM2 not found. Installing PM2 globally...
    call npm install -g pm2
    if %ERRORLEVEL% NEQ 0 (
        echo Failed to install PM2. Starting in standard mode...
        set NODE_ENV=production
        node server.js
        exit /b
    )
)

echo Starting in PM2 cluster mode...
echo This will use all CPU cores for maximum performance.
echo.

REM Stop existing instance if running
pm2 stop allstrawhats 2>nul

REM Start with ecosystem config
pm2 start ecosystem.config.js

echo.
echo ========================================
echo   Server started successfully!
echo ========================================
echo.
echo View logs:     pm2 logs allstrawhats
echo View status:   pm2 status
echo Restart:       pm2 restart allstrawhats
echo Stop:          pm2 stop allstrawhats
echo.
echo Admin panel: http://localhost:3000/admin/
echo.

REM Show logs
pm2 logs allstrawhats
