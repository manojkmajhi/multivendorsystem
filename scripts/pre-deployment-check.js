const fs = require('fs');
const path = require('path');

console.log('🔍 Pre-Deployment Verification\n');
console.log('='.repeat(60));

let errors = [];
let warnings = [];
let passed = 0;

// Check critical files
const criticalFiles = [
  'server.js',
  'package.json',
  'performance-optimizations.js',
  'ecosystem.config.js',
  '.env',
  'views/home.ejs',
  'views/cart.ejs',
  'views/checkout.ejs',
  'views/admin/dashboard.ejs',
  'strawhats/staticfiles/style.blue.css'
];

console.log('\n📁 Checking Critical Files...');
criticalFiles.forEach(file => {
  const filePath = path.join(__dirname, file);
  if (fs.existsSync(filePath)) {
    console.log(`  ✓ ${file}`);
    passed++;
  } else {
    console.log(`  ✗ ${file} - MISSING`);
    errors.push(`Missing critical file: ${file}`);
  }
});

// Check directories
const criticalDirs = [
  'views',
  'views/admin',
  'views/partials',
  'strawhats',
  'strawhats/staticfiles',
  'strawhats/media',
  'strawhats/media/uploads'
];

console.log('\n📂 Checking Directories...');
criticalDirs.forEach(dir => {
  const dirPath = path.join(__dirname, dir);
  if (fs.existsSync(dirPath)) {
    console.log(`  ✓ ${dir}/`);
    passed++;
  } else {
    console.log(`  ✗ ${dir}/ - MISSING`);
    errors.push(`Missing directory: ${dir}`);
  }
});

// Check package.json
console.log('\n📦 Checking package.json...');
try {
  const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json'), 'utf8'));
  
  if (pkg.name === 'multivendor-system') {
    console.log('  ✓ Package name correct');
    passed++;
  }
  
  if (pkg.version) {
    console.log(`  ✓ Version: ${pkg.version}`);
    passed++;
  }
  
  const requiredDeps = [
    'express',
    '@supabase/supabase-js',
    'ejs',
    'multer',
    'bcryptjs',
    'compression',
    'node-cache',
    'archiver'
  ];
  
  requiredDeps.forEach(dep => {
    if (pkg.dependencies[dep]) {
      console.log(`  ✓ ${dep}: ${pkg.dependencies[dep]}`);
      passed++;
    } else {
      console.log(`  ✗ ${dep} - MISSING`);
      errors.push(`Missing dependency: ${dep}`);
    }
  });
  
  if (pkg.scripts.start) {
    console.log(`  ✓ Start script: ${pkg.scripts.start}`);
    passed++;
  }
  
  if (pkg.scripts.build) {
    console.log(`  ✓ Build script: ${pkg.scripts.build}`);
    passed++;
  }
} catch (e) {
  console.log('  ✗ Failed to parse package.json');
  errors.push('Invalid package.json: ' + e.message);
}

// Check .env file
console.log('\n🔐 Checking Environment Configuration...');
try {
  const envContent = fs.readFileSync(path.join(__dirname, '.env'), 'utf8');
  
  if (envContent.includes('NODE_ENV=production')) {
    console.log('  ✓ NODE_ENV set to production');
    passed++;
  } else {
    console.log('  ⚠ NODE_ENV not set to production');
    warnings.push('NODE_ENV should be set to production');
  }
  
  if (envContent.includes('SUPABASE_URL=')) {
    console.log('  ✓ SUPABASE_URL configured');
    passed++;
  } else {
    console.log('  ⚠ SUPABASE_URL not configured');
    warnings.push('SUPABASE_URL not configured - app will use fallback data');
  }
  
  if (envContent.includes('SUPABASE_SERVICE_ROLE_KEY=')) {
    console.log('  ✓ SUPABASE_SERVICE_ROLE_KEY configured');
    passed++;
  } else {
    console.log('  ⚠ SUPABASE_SERVICE_ROLE_KEY not configured');
    warnings.push('SUPABASE_SERVICE_ROLE_KEY recommended for admin features');
  }
  
  if (envContent.includes('ADMIN_TOKEN=')) {
    console.log('  ✓ ADMIN_TOKEN configured');
    passed++;
  } else {
    console.log('  ⚠ ADMIN_TOKEN not configured');
    warnings.push('ADMIN_TOKEN not set - using default');
  }
} catch (e) {
  console.log('  ✗ Failed to read .env file');
  errors.push('.env file missing or unreadable');
}

// Check server.js
console.log('\n⚙️  Checking Server Configuration...');
try {
  const serverContent = fs.readFileSync(path.join(__dirname, 'server.js'), 'utf8');
  
  if (serverContent.includes('compression')) {
    console.log('  ✓ Compression enabled');
    passed++;
  }
  
  if (serverContent.includes('productCache')) {
    console.log('  ✓ Caching enabled');
    passed++;
  }
  
  if (serverContent.includes('adminGuard')) {
    console.log('  ✓ Admin authentication configured');
    passed++;
  }
  
  if (serverContent.includes('multer')) {
    console.log('  ✓ File upload configured');
    passed++;
  }
} catch (e) {
  console.log('  ✗ Failed to read server.js');
  errors.push('server.js missing or unreadable');
}

// Check build scripts
console.log('\n🔨 Checking Build Scripts...');
const buildScripts = ['build.js', 'build-production.js'];
buildScripts.forEach(script => {
  if (fs.existsSync(path.join(__dirname, script))) {
    console.log(`  ✓ ${script}`);
    passed++;
  } else {
    console.log(`  ⚠ ${script} - MISSING`);
    warnings.push(`Build script ${script} not found`);
  }
});

// Summary
console.log('\n' + '='.repeat(60));
console.log('\n📊 VERIFICATION SUMMARY\n');
console.log(`✓ Passed: ${passed}`);
console.log(`⚠ Warnings: ${warnings.length}`);
console.log(`✗ Errors: ${errors.length}`);

if (warnings.length > 0) {
  console.log('\n⚠️  WARNINGS:');
  warnings.forEach(w => console.log(`  - ${w}`));
}

if (errors.length > 0) {
  console.log('\n❌ ERRORS:');
  errors.forEach(e => console.log(`  - ${e}`));
  console.log('\n❌ DEPLOYMENT BLOCKED - Fix errors before building');
  process.exit(1);
} else {
  console.log('\n✅ ALL CHECKS PASSED - Ready for deployment!');
  console.log('\nNext steps:');
  console.log('  1. Run: npm run build');
  console.log('  2. Upload dist-production.zip to server');
  console.log('  3. Extract and run: npm install --production');
  console.log('  4. Start with: npm start or pm2 start ecosystem.config.js');
  process.exit(0);
}
