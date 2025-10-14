# Dynamic eSewa QR Code Implementation

## Overview
Admin can now change the eSewa QR code from the admin settings panel. The QR code is stored in the database and dynamically loaded on the checkout page.

## Features

### Admin Panel
- Upload QR code image file OR enter URL
- Preview current QR code
- Stored in `settings` table under key `payment`

### Checkout Page
- QR code loaded dynamically via API
- Fallback to default QR if not set
- No hardcoded QR code URL

## How to Use

### For Admin:
1. Go to `/admin/settings`
2. Scroll to "💳 Payment Settings" section
3. Either:
   - Enter eSewa QR code URL, OR
   - Upload QR code image file
4. Click "Save Settings"
5. QR code will appear on checkout page

### For Developers:
- QR code stored in: `settings.payment.esewa_qr`
- API endpoint: `GET /api/payment-settings`
- Returns: `{ esewa_qr: "url" }`

## Database Structure

```json
{
  "key": "payment",
  "value": {
    "esewa_qr": "/media/uploads/qr-code-123.jpg"
  }
}
```

## Files Modified

1. `server.js` - Added payment settings handling and API endpoint
2. `views/admin/settings.ejs` - Added QR upload UI
3. `views/checkout.ejs` - Dynamic QR loading

## API Endpoint

```javascript
GET /api/payment-settings

Response:
{
  "esewa_qr": "/media/uploads/qr-code.jpg"
}
```

## Default Fallback

If no QR code is set, uses:
```
https://i.postimg.cc/mDPmcWp9/Whats-App-Image-2025-10-14-at-16-17-59-1cdf0cb6.jpg
```

## Testing

1. Upload new QR code in admin settings
2. Go to checkout page
3. Verify new QR code appears
4. Test with URL instead of file upload
5. Verify fallback works if settings not found

---

**Status**: ✅ Complete
