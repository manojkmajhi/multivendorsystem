#!/usr/bin/env node
// Performance monitoring script for production
const http = require('http');
const https = require('https');

const config = {
  host: process.env.MONITOR_HOST || 'localhost',
  port: process.env.MONITOR_PORT || 3000,
  protocol: process.env.MONITOR_PROTOCOL || 'http',
  interval: parseInt(process.env.MONITOR_INTERVAL || '60000', 10) // 1 minute
};

const endpoints = [
  { name: 'Homepage', path: '/', critical: true },
  { name: 'Shop', path: '/shop/all/', critical: true },
  { name: 'Cart', path: '/cart/', critical: true },
  { name: 'Admin', path: '/admin/login', critical: false }
];

let stats = {
  checks: 0,
  failures: 0,
  avgResponseTime: 0,
  responseTimes: []
};

function checkEndpoint(endpoint) {
  return new Promise((resolve) => {
    const startTime = Date.now();
    const client = config.protocol === 'https' ? https : http;
    
    const options = {
      hostname: config.host,
      port: config.port,
      path: endpoint.path,
      method: 'GET',
      timeout: 10000
    };

    const req = client.request(options, (res) => {
      const responseTime = Date.now() - startTime;
      const success = res.statusCode >= 200 && res.statusCode < 400;
      
      resolve({
        endpoint: endpoint.name,
        success,
        statusCode: res.statusCode,
        responseTime,
        critical: endpoint.critical
      });
    });

    req.on('error', (err) => {
      resolve({
        endpoint: endpoint.name,
        success: false,
        error: err.message,
        responseTime: Date.now() - startTime,
        critical: endpoint.critical
      });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({
        endpoint: endpoint.name,
        success: false,
        error: 'Timeout',
        responseTime: 10000,
        critical: endpoint.critical
      });
    });

    req.end();
  });
}

async function runCheck() {
  const timestamp = new Date().toISOString();
  console.log(`\n[${ timestamp}] Running health check...`);
  
  const results = await Promise.all(endpoints.map(checkEndpoint));
  
  let allGood = true;
  let totalResponseTime = 0;
  
  results.forEach(result => {
    const icon = result.success ? '✅' : '❌';
    const time = result.responseTime ? `${result.responseTime}ms` : 'N/A';
    const status = result.statusCode || result.error || 'Unknown';
    
    console.log(`${icon} ${result.endpoint.padEnd(15)} - ${status.toString().padEnd(10)} - ${time}`);
    
    if (!result.success && result.critical) {
      allGood = false;
    }
    
    if (result.success && result.responseTime) {
      totalResponseTime += result.responseTime;
      stats.responseTimes.push(result.responseTime);
      if (stats.responseTimes.length > 100) {
        stats.responseTimes.shift();
      }
    }
  });
  
  stats.checks++;
  if (!allGood) stats.failures++;
  
  if (stats.responseTimes.length > 0) {
    stats.avgResponseTime = Math.round(
      stats.responseTimes.reduce((a, b) => a + b, 0) / stats.responseTimes.length
    );
  }
  
  const uptime = ((stats.checks - stats.failures) / stats.checks * 100).toFixed(2);
  
  console.log(`\nStats: ${stats.checks} checks, ${stats.failures} failures, ${uptime}% uptime, ${stats.avgResponseTime}ms avg response`);
  
  if (!allGood) {
    console.log('⚠️  ALERT: Critical endpoint(s) down!');
    // Here you could send alerts via email, Slack, etc.
  }
}

console.log('🔍 Performance Monitor Started');
console.log(`Target: ${config.protocol}://${config.host}:${config.port}`);
console.log(`Interval: ${config.interval / 1000}s`);
console.log(`Press Ctrl+C to stop\n`);

// Run immediately
runCheck();

// Then run at intervals
setInterval(runCheck, config.interval);

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n📊 Final Statistics:');
  console.log(`Total Checks: ${stats.checks}`);
  console.log(`Failures: ${stats.failures}`);
  console.log(`Uptime: ${((stats.checks - stats.failures) / stats.checks * 100).toFixed(2)}%`);
  console.log(`Avg Response Time: ${stats.avgResponseTime}ms`);
  console.log('\n👋 Monitor stopped');
  process.exit(0);
});
