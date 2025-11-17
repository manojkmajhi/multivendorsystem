const fs = require('fs');
const path = require('path');

console.log('🧹 Starting Professional Project Cleanup...\n');

// Files and directories to remove
const CLEANUP_TARGETS = {
  // Temporary and status files
  temporaryFiles: [
    'BUILD_SUMMARY.txt', 'BUILD-COMPLETE.txt', 'CONFIGURE_SUPABASE_EMAIL_NOW.txt',
    'COPY_PASTE_OTP_TEMPLATE.txt', 'CPANEL_QUICK_START.txt', 'CROPSAY_SUMMARY.txt',
    'DEPLOY_NOW.txt', 'FARMER_SIGNUP_COMPLETE.md', 'FARMER_SIGNUP_COMPLETE.txt',
    'FARMER_SIGNUP_ROUTES.txt', 'FILES_SUMMARY.txt', 'FINAL-SUMMARY.txt',
    'FIX_FARMER_RLS_POLICY.md', 'IMPLEMENTATION_COMPLETE.txt', 'NEXT_STEPS.txt',
    'PRODUCTION-CHECKLIST.txt', 'PRODUCTION-READY.txt', 'QUICK_REFERENCE.txt',
    'SIMPLE_EMAIL_TEMPLATE_UPDATE.txt', 'STATUS_READY_TO_COMPLETE.txt',
    'PROJECT_RESTRUCTURE_PLAN.md', 'README-NEW-STRUCTURE.md', 'RESTRUCTURE_COMPLETE.md'
  ],
  
  // SQL migration files (move to database folder)
  sqlFiles: [
    'ADD_DESCRIPTION_COLUMN.sql', 'ADD_LOCATION_COORDINATES.sql', 'ADD_PAYMENT_SCREENSHOT.sql',
    'ADD_SHORT_LONG_DESCRIPTION.sql', 'CHECK_VARIANT_IMAGES.sql', 'CROPSAY_FARMERS_SCHEMA.sql',
    'DIAGNOSE_VARIANTS.sql', 'DROP_LEGACY_DESCRIPTION.sql', 'FIX_FARMER_SIGNUP_SCHEMA.sql',
    'FIX_PRODUCT_ATTRIBUTES_CORRECTED.sql', 'FIX_PRODUCT_ATTRIBUTES.sql', 'FIX_RLS_COPY_PASTE.sql',
    'FIX_SECURITY_WARNINGS.sql', 'FIX_VARIANT_IMAGES_NOW.sql', 'ORDERS_SCHEMA.sql',
    'SUPABASE_ORDERS_TRACKING.sql', 'SUPABASE_SCHEMA.sql', 'SUPABASE_VARIANT_SCHEMA.sql'
  ],
  
  // Duplicate directories
  duplicateDirectories: [
    'dist-production'
  ],
  
  // Build and utility files to organize
  buildFiles: [
    'build-production.js', 'build.js', 'verify-build.js', 'verify-deployment.js',
    'pre-deployment-check.js', 'performance-monitor.js'
  ],
  
  // Archive files
  archiveFiles: [
    'dist.zip'
  ]
};

// Create necessary directories
const createDirectories = () => {
  const dirs = [
    'database/migrations', 'database/seeds', 'database/schema',
    'tests/unit', 'tests/integration', 'tests/fixtures',
    'docs/api', 'docs/deployment',
    'config',
    'public/css/themes', 'public/js/admin', 'public/js/public', 'public/js/vendor',
    'public/images/categories', 'public/images/heroes', 'public/images/icons'
  ];
  
  dirs.forEach(dir => {
    const fullPath = path.join(process.cwd(), dir);
    if (!fs.existsSync(fullPath)) {
      fs.mkdirSync(fullPath, { recursive: true });
      console.log(`📁 Created directory: ${dir}`);
    }
  });
};

// Remove temporary files
const removeTemporaryFiles = () => {
  console.log('🗑️ Removing temporary files...');
  CLEANUP_TARGETS.temporaryFiles.forEach(file => {
    if (fs.existsSync(file)) {
      try {
        fs.unlinkSync(file);
        console.log(`  ✓ Removed: ${file}`);
      } catch (err) {
        console.log(`  ⚠ Could not remove: ${file} - ${err.message}`);
      }
    }
  });
};

// Move SQL files to database directory
const organizeSqlFiles = () => {
  console.log('📊 Organizing SQL files...');
  CLEANUP_TARGETS.sqlFiles.forEach(file => {
    if (fs.existsSync(file)) {
      try {
        const targetPath = path.join('database', 'migrations', file);
        fs.renameSync(file, targetPath);
        console.log(`  ✓ Moved: ${file} → database/migrations/`);
      } catch (err) {
        console.log(`  ⚠ Could not move: ${file} - ${err.message}`);
      }
    }
  });
};

// Remove duplicate directories
const removeDuplicateDirectories = () => {
  console.log('🗂️ Removing duplicate directories...');
  CLEANUP_TARGETS.duplicateDirectories.forEach(dir => {
    if (fs.existsSync(dir)) {
      try {
        fs.rmSync(dir, { recursive: true, force: true });
        console.log(`  ✓ Removed directory: ${dir}`);
      } catch (err) {
        console.log(`  ⚠ Could not remove directory: ${dir} - ${err.message}`);
      }
    }
  });
};

// Move build files to scripts directory
const organizeBuildFiles = () => {
  console.log('🔧 Organizing build files...');
  CLEANUP_TARGETS.buildFiles.forEach(file => {
    if (fs.existsSync(file)) {
      try {
        const targetPath = path.join('scripts', file);
        fs.renameSync(file, targetPath);
        console.log(`  ✓ Moved: ${file} → scripts/`);
      } catch (err) {
        console.log(`  ⚠ Could not move: ${file} - ${err.message}`);
      }
    }
  });
};

// Remove archive files
const removeArchiveFiles = () => {
  console.log('📦 Removing archive files...');
  CLEANUP_TARGETS.archiveFiles.forEach(file => {
    if (fs.existsSync(file)) {
      try {
        fs.unlinkSync(file);
        console.log(`  ✓ Removed: ${file}`);
      } catch (err) {
        console.log(`  ⚠ Could not remove: ${file} - ${err.message}`);
      }
    }
  });
};

// Consolidate static assets
const consolidateStaticAssets = () => {
  console.log('🎨 Consolidating static assets...');
  
  const sourceDir = 'strawhats';
  if (!fs.existsSync(sourceDir)) {
    console.log('  ⚠ Source directory not found: strawhats');
    return;
  }
  
  // Move staticfiles to public
  const staticFilesPath = path.join(sourceDir, 'staticfiles');
  if (fs.existsSync(staticFilesPath)) {
    const files = fs.readdirSync(staticFilesPath);
    files.forEach(file => {
      const ext = path.extname(file).toLowerCase();
      let targetDir = '';
      
      if (ext === '.css') targetDir = 'public/css';
      else if (ext === '.js') targetDir = 'public/js';
      else if (['.jpg', '.jpeg', '.png', '.gif', '.svg', '.webp'].includes(ext)) targetDir = 'public/images';
      
      if (targetDir) {
        try {
          const sourcePath = path.join(staticFilesPath, file);
          const targetPath = path.join(targetDir, file);
          
          if (!fs.existsSync(targetPath)) {
            fs.copyFileSync(sourcePath, targetPath);
            console.log(`  ✓ Copied: ${file} → ${targetDir}/`);
          }
        } catch (err) {
          console.log(`  ⚠ Could not copy: ${file} - ${err.message}`);
        }
      }
    });
  }
  
  // Move media uploads
  const mediaPath = path.join(sourceDir, 'media', 'uploads');
  if (fs.existsSync(mediaPath)) {
    const targetPath = 'public/uploads';
    try {
      const files = fs.readdirSync(mediaPath);
      files.forEach(file => {
        const sourcePath = path.join(mediaPath, file);
        const targetFilePath = path.join(targetPath, file);
        
        if (!fs.existsSync(targetFilePath)) {
          fs.copyFileSync(sourcePath, targetFilePath);
        }
      });
      console.log(`  ✓ Consolidated media uploads to public/uploads/`);
    } catch (err) {
      console.log(`  ⚠ Could not consolidate media: ${err.message}`);
    }
  }
};

// Create essential configuration files
const createConfigFiles = () => {
  console.log('⚙️ Creating configuration files...');
  
  // Create .gitignore if it doesn't exist or update it
  const gitignoreContent = `# Dependencies
node_modules/
npm-debug.log*

# Environment variables
.env
.env.local

# Logs
logs
*.log

# Build outputs
dist/
build/

# Uploads
public/uploads/*
!public/uploads/.gitkeep

# OS generated files
.DS_Store
Thumbs.db

# IDE files
.vscode/
.idea/

# PM2
.pm2/

# Cache
.cache/
.tmp/
`;
  
  fs.writeFileSync('.gitignore', gitignoreContent);
  console.log('  ✓ Created/Updated .gitignore');
  
  // Create uploads .gitkeep
  const gitkeepPath = 'public/uploads/.gitkeep';
  if (!fs.existsSync(gitkeepPath)) {
    fs.writeFileSync(gitkeepPath, '');
    console.log('  ✓ Created uploads/.gitkeep');
  }
};

// Generate summary report
const generateSummary = () => {
  console.log('\n📋 Cleanup Summary:');
  console.log('✅ Removed temporary and status files');
  console.log('✅ Organized SQL files into database/migrations/');
  console.log('✅ Removed duplicate directories');
  console.log('✅ Moved build files to scripts/');
  console.log('✅ Consolidated static assets to public/');
  console.log('✅ Created professional directory structure');
  console.log('✅ Updated configuration files');
  
  console.log('\n🎯 Next Steps:');
  console.log('1. Review the new structure in CLEAN_ARCHITECTURE.md');
  console.log('2. Move your existing code into the new structure');
  console.log('3. Update import paths in your files');
  console.log('4. Test the application thoroughly');
  console.log('5. Update documentation and README');
  
  console.log('\n🚀 Your project is now professionally structured!');
};

// Main cleanup function
const runCleanup = () => {
  try {
    createDirectories();
    removeTemporaryFiles();
    organizeSqlFiles();
    removeDuplicateDirectories();
    organizeBuildFiles();
    removeArchiveFiles();
    consolidateStaticAssets();
    createConfigFiles();
    generateSummary();
  } catch (error) {
    console.error('❌ Cleanup failed:', error.message);
    process.exit(1);
  }
};

// Run the cleanup
runCleanup();