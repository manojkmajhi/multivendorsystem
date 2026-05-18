const fs = require('fs');
const path = require('path');
const archiver = require('archiver');

console.log('🚀 Building optimized production package...\n');

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
  'multivendor-system/**',
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

// Create production .env template
const envTemplate = `# Production Environment Variables
NODE_ENV=production
PORT=3000

# Supabase Configuration
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
SUPABASE_ANON_KEY=your_anon_key

# Admin Authentication
ADMIN_TOKEN=change_this_secure_token

# Optional: Google Maps API
GOOGLE_MAPS_API_KEY=your_google_maps_key

# Optional: OTPless Authentication
OTPLESS_APP_ID=your_otpless_app_id
OTPLESS_CLIENT_ID=your_otpless_client_id
OTPLESS_CLIENT_SECRET=your_otpless_client_secret
`;
fs.writeFileSync(path.join(OUTPUT_DIR, '.env.production'), envTemplate);

// Create deployment README
const deployReadme = `# Multivendor System - Production Deployment

## Quick Deploy

1. **Install dependencies:**
   \`\`\`bash
   npm install --production
   \`\`\`

2. **Configure environment:**
   - Copy \`.env.production\` to \`.env\`
   - Update with your actual credentials

3. **Start server:**
   \`\`\`bash
   npm start
   \`\`\`

## Performance Features

✅ Gzip compression enabled
✅ Static asset caching (365 days)
✅ Security headers configured
✅ Production optimizations active
✅ Image lazy loading
✅ Minified responses

## Server Requirements

- Node.js >= 16.0.0
- npm >= 8.0.0
- 512MB RAM minimum
- 1GB disk space

## Environment Variables

See \`.env.production\` for all configuration options.

## Support

For issues, check server logs and ensure all environment variables are set correctly.
`;
fs.writeFileSync(path.join(OUTPUT_DIR, 'DEPLOY.md'), deployReadme);

console.log(`\n✅ Production build complete!`);
console.log(`📁 Location: dist/`);
console.log(`📁 Files: ${fileCount}`);

// Create zip archive
console.log(`\n📦 Creating deployment archive...`);
const output = fs.createWriteStream(path.join(__dirname, 'dist-production.zip'));
const archive = archiver('zip', { zlib: { level: 9 } });

output.on('close', () => {
  const sizeMB = (archive.pointer() / 1024 / 1024).toFixed(2);
  console.log(`✅ Archive created: dist-production.zip (${sizeMB} MB)`);
  console.log(`\n🚀 Ready for deployment!`);
  console.log(`\nDeploy steps:`);
  console.log(`1. Upload dist-production.zip to server`);
  console.log(`2. Extract: unzip dist-production.zip`);
  console.log(`3. Install: npm install --production`);
  console.log(`4. Configure: cp .env.production .env (and edit)`);
  console.log(`5. Start: npm start`);
  console.log(`\n💡 For PM2: pm2 start server.js --name multivendor-system`);
});

archive.on('error', (err) => { throw err; });
archive.pipe(output);
archive.directory(OUTPUT_DIR, false);
archive.finalize();
