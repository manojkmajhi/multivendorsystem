# 📸 cPanel Visual Deployment Guide

## Step-by-Step with Screenshots

---

## 🔐 Step 1: Login to cPanel

1. Go to: `https://yourdomain.com:2083` or `https://yourdomain.com/cpanel`
2. Enter your cPanel username and password
3. Click "Log in"

---

## 📁 Step 2: Upload Files

### 2.1 Open File Manager
- Find "File Manager" icon in cPanel dashboard
- Click to open

### 2.2 Navigate to Directory
- Click on your domain folder (e.g., `public_html` or `yourdomain.com`)
- This is where your app will live

### 2.3 Upload ZIP File
- Click "Upload" button at top
- Select `dist-production.zip`
- Wait for upload to complete (shows 100%)
- Close upload window

### 2.4 Extract Files
- Find `dist-production.zip` in file list
- Right-click → "Extract"
- Click "Extract Files" button
- Wait for completion

### 2.5 Move Files (Important!)
- Open the extracted `dist/` folder
- Select ALL files inside (Ctrl+A)
- Click "Move" at top
- Move to parent directory (remove `/dist` from path)
- Click "Move Files"
- Delete empty `dist/` folder and `dist-production.zip`

**Final structure should be:**
```
yourdomain.com/
├── server.js
├── package.json
├── views/
└── strawhats/
```

---

## ⚙️ Step 3: Setup Node.js Application

### 3.1 Find Node.js App Manager
- Go back to cPanel home
- Search for "Node.js" or "Setup Node.js App"
- Click the icon

### 3.2 Create Application
- Click "Create Application" button

### 3.3 Configure Application
Fill in these fields:

**Node.js version:** Select `18.x` or highest available

**Application mode:** Select `Production`

**Application root:** Type your directory path
- Example: `public_html` or `yourdomain.com`

**Application URL:** Your domain
- Example: `yourdomain.com` or `subdomain.yourdomain.com`

**Application startup file:** Type `server.js`

**Passenger log file:** Leave default

### 3.4 Create App
- Click "Create" button
- Wait for success message

---

## 🔧 Step 4: Set Environment Variables

### 4.1 Edit Application
- In Node.js App list, find your app
- Click "Edit" (pencil icon)

### 4.2 Add Environment Variables
Scroll down to "Environment variables" section

Click "Add Variable" for each:

**Variable 1:**
- Name: `NODE_ENV`
- Value: `production`

**Variable 2:**
- Name: `PORT`
- Value: `3000`

**Variable 3:**
- Name: `SUPABASE_URL`
- Value: `https://xxxxx.supabase.co` (your actual URL)

**Variable 4:**
- Name: `SUPABASE_SERVICE_ROLE_KEY`
- Value: `eyJxxx...` (your actual key)

**Variable 5:**
- Name: `ADMIN_TOKEN`
- Value: `your_secure_password_here`

### 4.3 Save
- Click "Save" at bottom

---

## 📦 Step 5: Install Dependencies

### 5.1 Run NPM Install
- In Node.js App page, find your app
- Look for "Run NPM Install" button
- Click it
- Wait for green checkmark (may take 1-2 minutes)

---

## ▶️ Step 6: Start Application

### 6.1 Start/Restart App
- Click "Restart" button (or "Start" if stopped)
- Wait 10-20 seconds
- Status should show "Running" with green indicator

### 6.2 Verify
- Open new browser tab
- Go to: `https://yourdomain.com`
- Your store should load!

---

## 🎯 Quick Reference

### File Manager Path
```
cPanel → File Manager → yourdomain.com/
```

### Node.js App Path
```
cPanel → Setup Node.js App → Your Application
```

### Required Files
```
✓ server.js
✓ package.json
✓ package-lock.json
✓ views/ folder
✓ strawhats/ folder
```

### Environment Variables
```
✓ NODE_ENV=production
✓ PORT=3000
✓ SUPABASE_URL=your_url
✓ SUPABASE_SERVICE_ROLE_KEY=your_key
✓ ADMIN_TOKEN=your_password
```

---

## ✅ Success Indicators

### In cPanel Node.js App:
- ✅ Status: "Running" (green)
- ✅ No errors in log
- ✅ NPM install completed

### In Browser:
- ✅ Homepage loads
- ✅ Images display
- ✅ No console errors (F12)
- ✅ Admin panel accessible

---

## 🐛 Common Issues & Fixes

### Issue: App shows "Stopped"
**Fix:**
1. Check Passenger log for errors
2. Verify all files uploaded
3. Click "Restart" again

### Issue: "Cannot find module"
**Fix:**
1. Click "Run NPM Install"
2. Wait for completion
3. Restart app

### Issue: Database error
**Fix:**
1. Verify SUPABASE_URL is correct
2. Check SUPABASE_SERVICE_ROLE_KEY
3. Test Supabase project is active

### Issue: 404 errors
**Fix:**
1. Verify files in correct directory
2. Check Application root path
3. Ensure server.js in root

---

## 📞 Support

**cPanel Documentation:** Check your hosting provider's knowledge base

**Hosting Support:** Contact via ticket/chat if app won't start

**Application Logs:** Check Passenger log file in Node.js App settings

---

## 🎉 You're Done!

Your All Strawhats store is now live on cPanel!

**Access:**
- Store: `https://yourdomain.com`
- Admin: `https://yourdomain.com/admin/`

**Next Steps:**
1. Login to admin panel
2. Add your products
3. Configure settings
4. Start selling!

---

**Deployment Time:** 15 minutes  
**Difficulty:** ⭐⭐ Easy  
**Cost:** $5-20/month
