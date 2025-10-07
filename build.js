const fs = require('fs');
const path = require('path');

console.log('🚀 Building production package...\n');

const OUTPUT_DIR = path.join(__dirname, 'dist');

// Files to exclude - ONLY runtime files included
const EXCLUDE = [
  '**/*.md',
  '**/*.sql',
  '**/*.txt',
  '**/*.zip',
  'docs/**',
  'node_modules/**',
  'dist/**',
  '.env',
  '.git/**',
  '.gitignore',
  'build.js',
  'allstrawhats/**',
  '**/legacy/**'
];

// Clean and create dist directory
if (fs.existsSync(OUTPUT_DIR)) {
  fs.rmSync(OUTPUT_DIR, { recursive: true, force: true });
}
fs.mkdirSync(OUTPUT_DIR, { recursive: true });

let fileCount = 0;

// Helper to check if path should be excluded
function shouldExclude(filePath) {
  const normalized = filePath.replace(/\\/g, '/');
  return EXCLUDE.some(pattern => {
    const regex = new RegExp(pattern.replace(/\*\*/g, '.*').replace(/\*/g, '[^/]*'));
    return regex.test(normalized);
  });
}

// Copy files recursively
function copyDirectory(srcDir, destDir, baseDir = '') {
  const files = fs.readdirSync(srcDir);
  
  files.forEach(file => {
    const srcPath = path.join(srcDir, file);
    const relativePath = path.join(baseDir, file);
    
    if (shouldExclude(relativePath)) {
      return;
    }
    
    const stat = fs.statSync(srcPath);
    const destPath = path.join(destDir, file);
    
    if (stat.isDirectory()) {
      fs.mkdirSync(destPath, { recursive: true });
      copyDirectory(srcPath, destPath, relativePath);
    } else {
      fs.copyFileSync(srcPath, destPath);
      fileCount++;
      console.log(`  ✓ ${relativePath}`);
    }
  });
}

// Copy essential files
console.log('📦 Copying files:\n');

// Copy root files
['server.js', 'package.json', 'package-lock.json', '.env.example'].forEach(file => {
  const srcPath = path.join(__dirname, file);
  if (fs.existsSync(srcPath)) {
    fs.copyFileSync(srcPath, path.join(OUTPUT_DIR, file));
    fileCount++;
    console.log(`  ✓ ${file}`);
  }
});

// Copy directories
['views', 'strawhats'].forEach(dir => {
  const srcPath = path.join(__dirname, dir);
  const destPath = path.join(OUTPUT_DIR, dir);
  if (fs.existsSync(srcPath)) {
    fs.mkdirSync(destPath, { recursive: true });
    copyDirectory(srcPath, destPath, dir);
  }
});

// Create empty uploads directory
const uploadsDir = path.join(OUTPUT_DIR, 'strawhats', 'media', 'uploads');
fs.mkdirSync(uploadsDir, { recursive: true });
fs.writeFileSync(path.join(uploadsDir, '.gitkeep'), '');

console.log(`\n✅ Production build complete!`);
console.log(`📁 Location: dist/`);
console.log(`📁 Files: ${fileCount}`);
console.log(`\n🚀 Ready for deployment!`);
console.log(`\nNext steps:`);
console.log(`1. Zip the dist/ folder`);
console.log(`2. Upload to server and extract`);
console.log(`3. Run: npm install --production`);
console.log(`4. Create .env file`);
console.log(`5. Run: npm start`);
