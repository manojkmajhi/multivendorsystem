# 🗑️ File Cleanup Analysis - All Strawhats

## Files to be REMOVED (Safe to delete)

### 1. **CDN Mirror Folders** ❌ (8 folders)
These are offline copies of CDN resources, but the site uses ONLINE CDN links.
- `ajax.googleapis.com/` - jQuery CDN (site uses online version)
- `cdnjs.cloudflare.com/` - Bootstrap, Lightbox, Owl Carousel CDN (site uses online)
- `fonts.googleapis.com/` - Google Fonts CDN (site uses online)
- `fonts.gstatic.com/` - Google Fonts assets (site uses online)
- `ka-f.fontawesome.com/` - FontAwesome CDN (unused)
- `kit.fontawesome.com/` - FontAwesome kit (unused)
- `maxcdn.bootstrapcdn.com/` - Bootstrap CDN (unused)
- `use.fontawesome.com/` - FontAwesome CDN (unused)

**Reason**: All external resources are loaded from CDN URLs in index.html, not from local files.

### 2. **Documentation/Preview Files** ❌ (6 files)
- `admin-preview.html` - Component preview (development only)
- `ADMIN_DESIGN_SYSTEM.md` - Documentation (optional)
- `ADMIN_IMPROVEMENTS.md` - Documentation (optional)
- `ADMIN_QUICKSTART.md` - Documentation (optional)
- `ADMIN_TRANSFORMATION_SUMMARY.md` - Documentation (optional)
- `ADMIN_UI_IMPROVEMENTS.md` - Documentation (optional)
- `ADMIN_UPDATE_COMPLETE.md` - Documentation (optional)

**Reason**: These are documentation files, not required for running the website.

### 3. **Data URI Folder** ❌
- `_DataURI/` - Contains data URI conversion file (unused)

**Reason**: Not referenced anywhere in the codebase.

### 4. **Empty Staticfiles Folder** ❌
- `staticfiles/` (root level) - Only contains `admin-style.css` which was moved

**Reason**: The actual staticfiles are in `allstrawhats/staticfiles/` (renamed from stickersnepal.com)

---

## Files to KEEP (Essential for website) ✅

### Core Application Files
- ✅ `server.js` - Main Node.js server
- ✅ `package.json` - Dependencies
- ✅ `package-lock.json` - Dependency lock file
- ✅ `.env` - Environment variables (contains secrets)
- ✅ `.env.example` - Example environment file
- ✅ `.gitignore` - Git ignore rules
- ✅ `README.md` - Project documentation

### Database
- ✅ `SUPABASE_SCHEMA.sql` - Database schema (important!)

### Application Folders
- ✅ `node_modules/` - Node.js dependencies (essential)
- ✅ `views/` - EJS templates (essential)
  - ✅ `views/admin/` - Admin panel templates
  - ✅ `views/partials/` - Reusable components
  - ✅ All .ejs files
- ✅ `allstrawhats/` - Frontend files (essential)
  - ✅ `allstrawhats/index.html` - Main frontend page
  - ✅ `allstrawhats/staticfiles/` - CSS, JS, images (essential)
  - ✅ `allstrawhats/media/` - Product images (if exists)

### Git Repository
- ✅ `.git/` - Git repository (keep if using version control)

---

## Estimated Space Savings

- CDN folders: ~50-100 MB
- Documentation: ~0.1 MB
- Other: ~0.1 MB
- **Total savings: ~50-100 MB**

---

## Safety Checks Before Deletion

✅ Site uses ONLINE CDN links (verified in index.html)
✅ All essential files identified
✅ No dependencies on local CDN files
✅ Documentation files are optional
✅ Server configuration checked

---

## Action Plan

1. Remove CDN mirror folders (8 folders)
2. Remove documentation files (6 files) - OPTIONAL
3. Remove unused data folder (1 folder)
4. Remove empty staticfiles folder (1 folder)

**Total items to remove: 16 items**
