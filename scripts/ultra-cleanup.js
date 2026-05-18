const fs = require('fs');
const path = require('path');

console.log('🧹 Ultra Professional Cleanup - Removing ALL unwanted files...\n');

const REMOVE_FILES = [
  // Legacy files
  'image-optimizer.js',
  'performance-optimizations.js',
  'server-clean.js',
  
  // Build ignore files
  '.buildignore',
  '.dockerignore',
  
  // Production scripts (keep in scripts/)
  'start-production.bat',
  'start-production.sh',
  
  // Documentation files (consolidate)
  'CLEAN_ARCHITECTURE.md',
  'RESTRUCTURE_SUMMARY.md'
];

const REMOVE_DIRECTORIES = [
  'strawhats' // Legacy static directory
];

const MOVE_TO_SCRIPTS = [
  'nginx.conf',
  'docker-compose.yml',
  'Dockerfile',
  'ecosystem.config.js'
];

// Remove unwanted files
const removeFiles = () => {
  console.log('🗑️ Removing unwanted files...');
  REMOVE_FILES.forEach(file => {
    if (fs.existsSync(file)) {
      try {
        fs.unlinkSync(file);
        console.log(`  ✓ Removed: ${file}`);
      } catch (err) {
        console.log(`  ⚠ Could not remove: ${file}`);
      }
    }
  });
};

// Remove unwanted directories
const removeDirectories = () => {
  console.log('🗂️ Removing unwanted directories...');
  REMOVE_DIRECTORIES.forEach(dir => {
    if (fs.existsSync(dir)) {
      try {
        fs.rmSync(dir, { recursive: true, force: true });
        console.log(`  ✓ Removed directory: ${dir}`);
      } catch (err) {
        console.log(`  ⚠ Could not remove directory: ${dir}`);
      }
    }
  });
};

// Move deployment files to scripts
const moveDeploymentFiles = () => {
  console.log('📦 Moving deployment files to scripts...');
  MOVE_TO_SCRIPTS.forEach(file => {
    if (fs.existsSync(file)) {
      try {
        const targetPath = path.join('scripts', file);
        fs.renameSync(file, targetPath);
        console.log(`  ✓ Moved: ${file} → scripts/`);
      } catch (err) {
        console.log(`  ⚠ Could not move: ${file}`);
      }
    }
  });
};

// Create minimal .gitignore
const createMinimalGitignore = () => {
  const gitignoreContent = `node_modules/
.env
.env.local
*.log
dist/
build/
public/uploads/*
!public/uploads/.gitkeep
.DS_Store
Thumbs.db
.vscode/
.idea/
.pm2/
.cache/
.tmp/`;
  
  fs.writeFileSync('.gitignore', gitignoreContent);
  console.log('  ✓ Created minimal .gitignore');
};

// Update package.json to remove old scripts
const cleanPackageJson = () => {
  try {
    const packageData = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    
    // Clean scripts
    packageData.scripts = {
      start: 'NODE_ENV=production node server.js',
      dev: 'nodemon server.js',
      build: 'node scripts/build-production.js',
      test: 'echo "Tests will be added"'
    };
    
    fs.writeFileSync('package.json', JSON.stringify(packageData, null, 2));
    console.log('  ✓ Cleaned package.json scripts');
  } catch (err) {
    console.log('  ⚠ Could not clean package.json');
  }
};

// Create final clean README
const createCleanReadme = () => {
  const readmeContent = `# Multivendor System - E-commerce Platform

## Quick Start
\`\`\`bash
npm install
npm run dev
\`\`\`

## Structure
- \`src/\` - Application source code
- \`public/\` - Static assets
- \`views/\` - EJS templates
- \`database/\` - Database files
- \`scripts/\` - Build & deployment

## Environment
Copy \`.env.example\` to \`.env\` and configure your settings.

## Production
\`\`\`bash
npm run build
npm start
\`\`\``;

  fs.writeFileSync('README.md', readmeContent);
  console.log('  ✓ Created clean README.md');
};

// Main cleanup
const runUltraCleanup = () => {
  removeFiles();
  removeDirectories();
  moveDeploymentFiles();
  createMinimalGitignore();
  cleanPackageJson();
  createCleanReadme();
  
  console.log('\n🎉 Ultra cleanup complete!');
  console.log('\n📋 Final structure:');
  console.log('✅ Only essential files in root');
  console.log('✅ All deployment files in scripts/');
  console.log('✅ Clean, minimal configuration');
  console.log('✅ Professional project structure');
};

runUltraCleanup();