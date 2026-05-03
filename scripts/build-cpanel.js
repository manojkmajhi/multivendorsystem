const fs = require('fs');
const path = require('path');
const archiver = require('archiver');

// Set root directory (one level up from scripts)
const rootDir = path.join(__dirname, '..');
const zipPath = path.join(rootDir, 'deploy.zip');

console.log(`🚀 Preparing cPanel Deployment Package...`);
console.log(`📂 Root: ${rootDir}`);
console.log(`📦 Output: ${zipPath}`);

// Create zip
if (fs.existsSync(zipPath)) fs.unlinkSync(zipPath);
const output = fs.createWriteStream(zipPath);
const archive = archiver('zip', { zlib: { level: 9 } });

output.on('close', () => {
    console.log(`\n✅ Deployment Package Created!`);
    console.log(`📦 Size: ${(archive.pointer() / 1024 / 1024).toFixed(2)} MB`);
    console.log(`📍 Location: ${zipPath}`);
    console.log(`\n👉 NEXT STEPS:`);
    console.log(`1. Upload 'deploy.zip' to your cPanel File Manager.`);
    console.log(`2. Extract it into your application folder (e.g., 'animestore').`);
    console.log(`3. Go to "Setup Node.js App" in cPanel.`);
    console.log(`4. Click "Run NPM Install".`);
    console.log(`5. Click "Restart" application.`);
});

archive.on('error', (err) => {
    throw err;
});

archive.pipe(output);

// Files to include
const files = [
    'server.js',
    'package.json',
    'package-lock.json',
    '.env.example',
    'README.md'
];

// Directories to include
const dirs = [
    'public',
    'src',
    'views',
    'database'
];

// Add files
files.forEach(file => {
    const filePath = path.join(rootDir, file);
    if (fs.existsSync(filePath)) {
        archive.file(filePath, { name: file });
    } else {
        console.warn(`⚠️ Warning: ${file} not found.`);
    }
});

// Add directories
dirs.forEach(dir => {
    const dirPath = path.join(rootDir, dir);
    if (fs.existsSync(dirPath)) {
        archive.directory(dirPath, dir);
    } else {
        console.warn(`⚠️ Warning: directory ${dir} not found.`);
    }
});

archive.finalize();
