#!/usr/bin/env node
/**
 * Build / packaging script for cPanel style deployment.
 * Creates a ./dist directory with a production copy of the app:
 * - Copies server.js, package.json (trimmed dev deps), .env.example (if exists)
 * - Copies views/, strawhats/ (static root), SQL schema files, README
 * - Installs production dependencies into dist/node_modules (optional via flag)
 * - Produces a zip archive dist/allstrawhats-deploy.zip ready for upload
 *
 * Usage:
 *   node build.js            -> build + zip (no install)
 *   INSTALL_DEPS=1 node build.js  -> also install production deps inside dist
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const archiver = require('archiver');

const ROOT = __dirname;
const DIST = path.join(ROOT, 'dist');

function log(msg){ console.log(`[build] ${msg}`); }
function copyRecursive(src, dest, filterFn){
  if(!fs.existsSync(src)) return;
  const stat = fs.statSync(src);
  if(stat.isDirectory()){
    if(!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
    for(const entry of fs.readdirSync(src)){
      copyRecursive(path.join(src, entry), path.join(dest, entry), filterFn);
    }
  } else {
    if(filterFn && !filterFn(src)) return;
    fs.copyFileSync(src, dest);
  }
}

function cleanDir(dir){
  if(fs.existsSync(dir)){
    fs.rmSync(dir, { recursive:true, force:true });
  }
  fs.mkdirSync(dir, { recursive:true });
}

function build(){
  cleanDir(DIST);
  log('Created fresh dist folder');

  // Read and prune package.json
  const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
  delete pkg.devDependencies; // omit dev deps
  pkg.scripts = { start: 'node server.js' };
  fs.writeFileSync(path.join(DIST, 'package.json'), JSON.stringify(pkg, null, 2));
  log('Wrote production package.json');

  // Copy root server + schema + README
  const rootFiles = fs.readdirSync(ROOT).filter(f => /^(server\.js|README\.md|.*schema.*\.sql|SUPABASE_SCHEMA\.sql|ORDERS_SCHEMA\.sql|ADD_.*\.sql|DROP_.*\.sql)$/i.test(f));
  for(const f of rootFiles){
    fs.copyFileSync(path.join(ROOT, f), path.join(DIST, f));
  }
  log('Copied root application files');

  // Copy views
  copyRecursive(path.join(ROOT, 'views'), path.join(DIST, 'views'));
  log('Copied views/');

  // Copy static folder(s) - prefer strawhats
  // Only copy the latest static folder (strawhats), exclude any legacy or unused folders
  const staticSrc = path.join(ROOT, 'strawhats');
  const staticDest = path.join(DIST, 'strawhats');
  if(fs.existsSync(staticSrc)){
    copyRecursive(staticSrc, staticDest, src => {
      // Exclude any legacy subfolders or files
      if(src.includes('legacy')) return false;
      return true;
    });
    log('Copied static folder: strawhats (excluding legacy)');
  }

  // Only copy views folder, exclude any legacy subfolders
  const viewsSrc = path.join(ROOT, 'views');
  const viewsDest = path.join(DIST, 'views');
  if(fs.existsSync(viewsSrc)){
    copyRecursive(viewsSrc, viewsDest, src => {
      if(src.includes('legacy')) return false;
      return true;
    });
    log('Copied views folder (excluding legacy)');
  }

  // Create minimal .env.example if missing
  const envTarget = path.join(DIST, '.env.example');
  if(!fs.existsSync(envTarget)){
    fs.writeFileSync(envTarget, `# Rename to .env and fill values\nPORT=3000\nSUPABASE_URL=\nSUPABASE_SERVICE_ROLE_KEY=\nSUPABASE_ANON_KEY=\nADMIN_TOKEN=change-me\n`);
  }

  // Optionally install production dependencies
  if(process.env.INSTALL_DEPS === '1'){
    log('Installing production dependencies inside dist (this may take a bit)...');
    execSync('npm install --production', { cwd: DIST, stdio: 'inherit' });
  } else {
    log('Skipped npm install (set INSTALL_DEPS=1 to include node_modules in zip)');
  }

  // Zip it
  const zipPath = path.join(DIST, 'allstrawhats-deploy.zip');
  const output = fs.createWriteStream(zipPath);
  const archive = archiver('zip', { zlib: { level: 9 } });
  archive.pipe(output);
  archive.directory(DIST + '/', false, entry => {
    // Avoid including the zip itself inside itself
    if(entry.name === 'allstrawhats-deploy.zip') return false;
    return entry;
  });
  output.on('close', ()=> log(`Created zip (${archive.pointer()} bytes): ${zipPath}`));
  archive.finalize();
}

try { build(); } catch(e){
  console.error('Build failed:', e);
  process.exit(1);
}
