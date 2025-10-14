# 🚀 cPanel Deployment Guide - All Strawhats

## Quick Deploy (15 minutes)

### Step 1: Upload Files (5 min)

1. **Login to cPanel**
2. **Open File Manager**
3. **Navigate to your domain directory** (e.g., `public_html` or `yourdomain.com`)
4. **Upload `dist-production.zip`**
5. **Right-click → Extract**
6. **Move contents from `dist/` folder to root** (or keep in subdirectory)

### Step 2: Setup Node.js App (5 min)

1. **In cPanel, find "Setup Node.js App"**
2. **Click "Create Application"**
3. **Configure:**
   - **Node.js version:** 16.x or higher
   - **Application mode:** Production
   - **Application root:** `yourdomain.com` (or your directory)
   - **Application URL:** `yourdomain.com` (or subdomain)
   - **Application startup file:** `server.js`
   - **Passenger log file:** Leave default

4. **Click "Create"**

### Step 3: Configure Environment (3 min)

1. **In Node.js App settings, click "Edit" on your app**
2. **Scroll to "Environment Variables"**
3. **Add these variables:**

```
NODE_ENV=production
PORT=3000
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_key
ADMIN_TOKEN=your_secure_password
```

4. **Click "Save"**

### Step 4: Install Dependencies (2 min)

1. **In Node.js App page, find your app**
2. **Click "Run NPM Install"** button
3. **Wait for completion** (shows green checkmark)

### Step 5: Start Application

1. **Click "Start App"** or "Restart"
2. **Wait 10-20 seconds**
3. **Visit your domain** - Site should load!

---

## 📁 File Structure in cPanel

```
yourdomain.com/
├── server.js
├── package.json
├── package-lock.json
├── .env (create this manually)
├── views/
├── strawhats/
└── node_modules/ (created by npm install)
```

---

## 🔧 Create .env File in cPanel

1. **File Manager → Your domain directory**
2. **Click "+ File"**
3. **Name it:** `.env`
4. **Right-click → Edit**
5. **Paste this content:**

```env
NODE_ENV=production
PORT=3000
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJxxx...
ADMIN_TOKEN=your_secure_password

# Optional
GOOGLE_MAPS_API_KEY=
OTPLESS_APP_ID=
OTPLESS_CLIENT_ID=
OTPLESS_CLIENT_SECRET=
```

6. **Save Changes**

---

## ⚙️ cPanel Node.js Settings

### Recommended Configuration

**Application Mode:** Production  
**Node.js Version:** 18.x (or latest available)  
**Passenger Log:** Enabled  
**Auto-restart:** Enabled (if available)

### Environment Variables to Set

| Variable | Value | Required |
|----------|-------|----------|
| NODE_ENV | production | Yes |
| PORT | 3000 | Yes |
| SUPABASE_URL | Your Supabase URL | Yes |
| SUPABASE_SERVICE_ROLE_KEY | Your service key | Yes |
| ADMIN_TOKEN | Secure password | Yes |

---

## 🔄 Restart Application

After making changes:

1. **Go to "Setup Node.js App"**
2. **Find your application**
3. **Click "Restart"**
4. **Wait 10-20 seconds**

---

## 📊 Check Application Status

### In cPanel
- **Setup Node.js App** → Shows "Running" status
- **Passenger log file** → Check for errors

### Test Endpoints
- Homepage: `https://yourdomain.com`
- Admin: `https://yourdomain.com/admin/`
- Cart: `https://yourdomain.com/cart/`

---

## 🐛 Troubleshooting

### App Shows "Stopped"
1. Check Passenger log file for errors
2. Verify .env file exists and has correct values
3. Ensure all files uploaded correctly
4. Click "Restart" again

### "Cannot find module" Error
1. Go to Node.js App settings
2. Click "Run NPM Install"
3. Wait for completion
4. Restart app

### Database Connection Error
1. Verify SUPABASE_URL in .env
2. Check SUPABASE_SERVICE_ROLE_KEY is correct
3. Test Supabase project is active
4. Restart app

### Images Not Loading
1. Check `strawhats/media/uploads/` folder exists
2. Set folder permissions to 755
3. Verify image paths in database

### Port Already in Use
- cPanel automatically assigns ports
- Don't change PORT in .env
- Use default 3000

---

## 📝 Quick Commands via Terminal (Optional)

If cPanel provides SSH/Terminal access:

```bash
# Navigate to app directory
cd ~/yourdomain.com

# Install dependencies
npm install --production

# Check Node version
node --version

# Test app locally
node server.js

# View logs
tail -f logs/passenger.log
```

---

## ✅ Verification Checklist

- [ ] Files uploaded and extracted
- [ ] Node.js app created in cPanel
- [ ] .env file created with credentials
- [ ] Environment variables set in cPanel
- [ ] NPM install completed
- [ ] App status shows "Running"
- [ ] Homepage loads successfully
- [ ] Admin panel accessible
- [ ] Images display correctly
- [ ] Cart functionality works

---

## 🎯 Common cPanel Hosting Providers

- **Hostinger** - Node.js support, easy setup
- **A2 Hosting** - Fast, Node.js optimized
- **SiteGround** - Good support, reliable
- **Bluehost** - Popular, Node.js available
- **InMotion** - Business-grade hosting

---

## 📞 Need Help?

1. **Check Passenger log** in cPanel Node.js App section
2. **Verify .env file** has correct credentials
3. **Test Supabase connection** in Supabase dashboard
4. **Contact hosting support** if app won't start

---

## 🚀 Performance Tips for cPanel

1. **Enable caching** in cPanel (if available)
2. **Use Cloudflare** for CDN (free)
3. **Optimize images** before uploading
4. **Enable Gzip** in .htaccess (already in code)
5. **Monitor resource usage** in cPanel metrics

---

## 📈 Expected Performance on cPanel

- **Shared Hosting:** 50-100 concurrent users
- **VPS/Cloud:** 200-500 concurrent users
- **Dedicated:** 1000+ concurrent users

---

**Your All Strawhats store is ready for cPanel deployment!** 🎉

**Deployment Time:** 15 minutes  
**Difficulty:** Easy  
**Cost:** $5-20/month (typical cPanel hosting)
