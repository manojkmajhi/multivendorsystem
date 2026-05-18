const fs = require('fs');
const path = require('path');

console.log('🔍 Verifying Production Build\n');
console.log('='.repeat(60));

const distDir = path.join(__dirname, 'dist-production');
const zipFile = path.join(__dirname, 'dist.zip');

let passed = 0;
let failed = 0;

// Check if dist directory exists
console.log('\n📁 Checking Build Artifacts...');
if (fs.existsSync(distDir)) {
  console.log('  ✓ dist-production/ directory exists');
  passed++;
} else {
  console.log('  ✗ dist-production/ directory missing');
  failed++;
}

// Check if zip file exists
if (fs.existsSync(zipFile)) {
  const stats = fs.statSync(zipFile);
  const sizeMB = (stats.size / 1024 / 1024).toFixed(2);
  console.log(`  ✓ dist.zip exists (${sizeMB} MB)`);
  passed++;
} else {
  console.log('  ✗ dist.zip missing');
  failed++;
}

// Check critical files in dist
const criticalFiles = [
  'server.js',
  'package.json',
  'package-lock.json',
  '.env',
  'ecosystem.config.js',
  'performance-optimizations.js',
  'README.txt',
  'DEPLOY.txt',
  'start.bat'
];

console.log('\n📄 Checking Critical Files in Build...');
criticalFiles.forEach(file => {
  const filePath = path.join(distDir, file);
  if (fs.existsSync(filePath)) {
    const stats = fs.statSync(filePath);
    const sizeKB = (stats.size / 1024).toFixed(1);
    console.log(`  ✓ ${file} (${sizeKB} KB)`);
    passed++;
  } else {
    console.log(`  ✗ ${file} - MISSING`);
    failed++;
  }
});

// Check directories in dist
const criticalDirs = [
  'views',
  'views/admin',
  'views/partials',
  'strawhats',
  'strawhats/staticfiles',
  'strawhats/media',
  'strawhats/media/uploads'
];

console.log('\n📂 Checking Directories in Build...');
criticalDirs.forEach(dir => {
  const dirPath = path.join(distDir, dir);
  if (fs.existsSync(dirPath)) {
    const files = fs.readdirSync(dirPath);
    console.log(`  ✓ ${dir}/ (${files.length} items)`);
    passed++;
  } else {
    console.log(`  ✗ ${dir}/ - MISSING`);
    failed++;
  }
});

// Check package.json in dist
console.log('\n📦 Verifying package.json...');
try {
  const pkgPath = path.join(distDir, 'package.json');
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  
  if (pkg.name === 'multivendor-system') {
    console.log('  ✓ Package name correct');
    passed++;
  }
  
  if (pkg.version) {
    console.log(`  ✓ Version: ${pkg.version}`);
    passed++;
  }
  
  const depCount = Object.keys(pkg.dependencies || {}).length;
  console.log(`  ✓ Dependencies: ${depCount}`);
  passed++;
  
  if (pkg.scripts && pkg.scripts.start) {
    console.log(`  ✓ Start script configured`);
    passed++;
  }
} catch (e) {
  console.log('  ✗ Failed to verify package.json');
  failed++;
}

// Check .env in dist
console.log('\n🔐 Verifying Environment Configuration...');
try {
  const envPath = path.join(distDir, '.env');
  const envContent = fs.readFileSync(envPath, 'utf8');
  
  const checks = [
    { key: 'NODE_ENV', label: 'NODE_ENV' },
    { key: 'SUPABASE_URL', label: 'Supabase URL' },
    { key: 'SUPABASE_SERVICE_ROLE_KEY', label: 'Service Role Key' },
    { key: 'ADMIN_TOKEN', label: 'Admin Token' }
  ];
  
  checks.forEach(check => {
    if (envContent.includes(check.key + '=')) {
      console.log(`  ✓ ${check.label} configured`);
      passed++;
    } else {
      console.log(`  ⚠ ${check.label} not configured`);
    }
  });
} catch (e) {
  console.log('  ✗ Failed to verify .env');
  failed++;
}

// Count files in build
console.log('\n📊 Build Statistics...');
try {
  function countFiles(dir) {
    let count = 0;
    const items = fs.readdirSync(dir);
    items.forEach(item => {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        count += countFiles(fullPath);
      } else {
        count++;
      }
    });
    return count;
  }
  
  const totalFiles = countFiles(distDir);
  console.log(`  ✓ Total files in build: ${totalFiles}`);
  passed++;
  
  // Calculate total size
  function getDirSize(dir) {
    let size = 0;
    const items = fs.readdirSync(dir);
    items.forEach(item => {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        size += getDirSize(fullPath);
      } else {
        size += stat.size;
      }
    });
    return size;
  }
  
  const totalSize = getDirSize(distDir);
  const totalSizeMB = (totalSize / 1024 / 1024).toFixed(2);
  console.log(`  ✓ Total build size: ${totalSizeMB} MB`);
  passed++;
} catch (e) {
  console.log('  ⚠ Could not calculate statistics');
}

// Summary
console.log('\n' + '='.repeat(60));
console.log('\n📊 VERIFICATION SUMMARY\n');
console.log(`✓ Passed: ${passed}`);
console.log(`✗ Failed: ${failed}`);

if (failed > 0) {
  console.log('\n❌ BUILD VERIFICATION FAILED');
  console.log('Some critical files or directories are missing.');
  console.log('Please run: npm run build');
  process.exit(1);
} else {
  console.log('\n✅ BUILD VERIFICATION SUCCESSFUL!');
  console.log('\n📦 Your production build is ready for deployment!');
  console.log('\nDeployment package: dist.zip');
  console.log('\nNext steps:');
  console.log('  1. Upload dist.zip to your server');
  console.log('  2. Extract: unzip dist.zip');
  console.log('  3. Install: cd dist-production && npm install --production');
  console.log('  4. Start: npm start or pm2 start ecosystem.config.js');
  console.log('\nFor detailed instructions, see DEPLOYMENT_READY.md');
  process.exit(0);
}
