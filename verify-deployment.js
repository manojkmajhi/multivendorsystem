#!/usr/bin/env node
// Deployment verification script
const http = require('http');
const https = require('https');

const config = {
  host: process.env.DEPLOY_HOST || 'localhost',
  port: process.env.DEPLOY_PORT || 3000,
  protocol: process.env.DEPLOY_PROTOCOL || 'http'
};

const tests = [
  { name: 'Homepage', path: '/' },
  { name: 'Shop All', path: '/shop/all/' },
  { name: 'Admin Login', path: '/admin/login' },
  { name: 'Cart', path: '/cart/' },
  { name: 'Track Order', path: '/track-order' },
  { name: 'Static CSS', path: '/staticfiles/style.blue.css' },
  { name: 'Static JS', path: '/staticfiles/front.js' }
];

console.log('🔍 Verifying deployment...\n');
console.log(`Target: ${config.protocol}://${config.host}:${config.port}\n`);

let passed = 0;
let failed = 0;

function testEndpoint(test) {
  return new Promise((resolve) => {
    const client = config.protocol === 'https' ? https : http;
    const options = {
      hostname: config.host,
      port: config.port,
      path: test.path,
      method: 'GET',
      timeout: 5000
    };

    const req = client.request(options, (res) => {
      if (res.statusCode >= 200 && res.statusCode < 400) {
        console.log(`✅ ${test.name.padEnd(20)} - ${res.statusCode}`);
        passed++;
      } else {
        console.log(`❌ ${test.name.padEnd(20)} - ${res.statusCode}`);
        failed++;
      }
      resolve();
    });

    req.on('error', (err) => {
      console.log(`❌ ${test.name.padEnd(20)} - ${err.message}`);
      failed++;
      resolve();
    });

    req.on('timeout', () => {
      console.log(`❌ ${test.name.padEnd(20)} - Timeout`);
      failed++;
      req.destroy();
      resolve();
    });

    req.end();
  });
}

async function runTests() {
  for (const test of tests) {
    await testEndpoint(test);
  }

  console.log(`\n${'='.repeat(50)}`);
  console.log(`Results: ${passed} passed, ${failed} failed`);
  console.log(`${'='.repeat(50)}\n`);

  if (failed === 0) {
    console.log('🎉 All tests passed! Deployment verified.');
    process.exit(0);
  } else {
    console.log('⚠️  Some tests failed. Check server logs.');
    process.exit(1);
  }
}

runTests();
