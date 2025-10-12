# Google Maps API Setup Guide

## Free Tier Information

Google Maps Platform offers a **FREE tier** with:
- **$200 monthly credit** (automatically applied)
- Covers approximately **28,000 map loads per month**
- **No automatic charges** - you must manually upgrade to paid plan
- Perfect for small to medium e-commerce sites

---

## Step-by-Step Setup

### 1. Create Google Cloud Account
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Sign in with your Google account
3. Accept terms of service

### 2. Create a New Project
1. Click the project dropdown at the top
2. Click **"New Project"**
3. Enter project name: `AllStrawhats` (or your store name)
4. Click **"Create"**

### 3. Enable Required APIs
1. Go to **"APIs & Services"** > **"Library"**
2. Search and enable these APIs:
   - **Maps JavaScript API** (for map display)
   - **Places API** (for address autocomplete)
   - **Geocoding API** (for address lookup)

### 4. Create API Key
1. Go to **"APIs & Services"** > **"Credentials"**
2. Click **"Create Credentials"** > **"API Key"**
3. Your API key will be generated (looks like: `AIzaSyDEFh_Mh1sCeCYpylFcIVBhEQtB1WmggcE`)
4. **IMPORTANT:** Click **"Restrict Key"** immediately

### 5. Secure Your API Key (CRITICAL!)
1. Under **"Application restrictions"**:
   - Select **"HTTP referrers (websites)"**
   - Add your domains:
     ```
     http://localhost:3000/*
     https://yourdomain.com/*
     https://www.yourdomain.com/*
     ```

2. Under **"API restrictions"**:
   - Select **"Restrict key"**
   - Check only:
     - Maps JavaScript API
     - Places API
     - Geocoding API

3. Click **"Save"**

### 6. Add to Your Project
1. Open your `.env` file in the project root
2. Add this line:
   ```
   GOOGLE_MAPS_API_KEY=AIzaSyDEFh_Mh1sCeCYpylFcIVBhEQtB1WmggcE
   ```
   (Replace with your actual key)

3. Restart your server:
   ```bash
   npm run dev
   ```

---

## Verify Setup

1. Go to `http://localhost:3000/checkout/`
2. Click the map pin icon next to "Detailed Address"
3. Map should load successfully
4. Test features:
   - Search for locations
   - Click "Use My Current Location"
   - Click/drag marker on map
   - Confirm location

---

## Cost Monitoring

### Check Usage
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to **"Billing"** > **"Reports"**
3. View your API usage and costs

### Set Budget Alerts
1. Go to **"Billing"** > **"Budgets & alerts"**
2. Click **"Create Budget"**
3. Set budget: `$10` (well below free tier)
4. Add email alerts at 50%, 90%, 100%

---

## Pricing Breakdown (After Free $200 Credit)

| API | Cost per 1,000 requests | Free Tier Coverage |
|-----|------------------------|-------------------|
| Maps JavaScript API | $7.00 | ~28,000 loads/month |
| Places Autocomplete | $2.83 | ~70,000 requests/month |
| Geocoding API | $5.00 | ~40,000 requests/month |

**For most small stores:** You'll stay within the free tier indefinitely!

---

## Troubleshooting

### Map Not Loading?
1. Check browser console for errors
2. Verify API key is in `.env` file
3. Ensure server was restarted after adding key
4. Check API restrictions match your domain

### "This page can't load Google Maps correctly"
- API key restrictions are too strict
- Add your domain to HTTP referrers
- Ensure required APIs are enabled

### "RefererNotAllowedMapError"
- Your domain is not in the allowed referrers list
- Add `http://localhost:3000/*` for development

---

## Security Best Practices

✅ **DO:**
- Keep API key in `.env` file (never commit to Git)
- Restrict key to specific domains
- Restrict key to only needed APIs
- Set up billing alerts
- Monitor usage regularly

❌ **DON'T:**
- Share API key publicly
- Commit `.env` to version control
- Use unrestricted API keys
- Skip domain restrictions

---

## Alternative: OpenStreetMap (Completely Free)

If you prefer a 100% free solution with no limits, consider using **Leaflet.js** with OpenStreetMap:

```html
<!-- Replace Google Maps with Leaflet -->
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
```

**Pros:**
- Completely free, no API key needed
- No usage limits
- Open source

**Cons:**
- Less features than Google Maps
- No built-in address autocomplete
- Requires more manual setup

---

## Support

- [Google Maps Platform Documentation](https://developers.google.com/maps/documentation)
- [Pricing Calculator](https://mapsplatform.google.com/pricing/)
- [Support Forum](https://stackoverflow.com/questions/tagged/google-maps)

---

**Your current API key (from your message):**
```
AIzaSyDEFh_Mh1sCeCYpylFcIVBhEQtB1WmggcE
```

⚠️ **IMPORTANT:** This key is now public. Please:
1. Go to Google Cloud Console
2. Delete this key
3. Create a new one
4. Add proper restrictions
5. Never share it publicly again
