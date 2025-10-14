#!/bin/bash

echo "========================================"
echo "  All Strawhats - Production Startup"
echo "========================================"
echo ""

# Check if PM2 is installed
if ! command -v pm2 &> /dev/null; then
    echo "PM2 not found. Installing PM2 globally..."
    npm install -g pm2
    if [ $? -ne 0 ]; then
        echo "Failed to install PM2. Starting in standard mode..."
        NODE_ENV=production node server.js
        exit 1
    fi
fi

echo "Starting in PM2 cluster mode..."
echo "This will use all CPU cores for maximum performance."
echo ""

# Stop existing instance if running
pm2 stop allstrawhats 2>/dev/null

# Start with ecosystem config
pm2 start ecosystem.config.js

echo ""
echo "========================================"
echo "  Server started successfully!"
echo "========================================"
echo ""
echo "View logs:     pm2 logs allstrawhats"
echo "View status:   pm2 status"
echo "Restart:       pm2 restart allstrawhats"
echo "Stop:          pm2 stop allstrawhats"
echo ""
echo "Admin panel: http://localhost:3000/admin/"
echo ""

# Show logs
pm2 logs allstrawhats
