# Email Configuration Setup

The server uses Cropsa domain email with Supabase authentication for sending OTP emails for farmer password resets and notifications.

## Cropsa Email Configuration

**Update your `.env` file:**
```env
SMTP_HOST=smtp.cropsa.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=noreply@cropsa.com
SMTP_PASS=your-cropsa-email-password
SMTP_FROM_EMAIL=noreply@cropsa.com
```

## Supabase Auth Integration

The system uses Supabase authentication for:
- Farmer signup with @cropsa.com email verification
- OTP generation and verification
- Password reset functionality

Ensure your Supabase project is configured with:
- Email templates for OTP verification
- Proper redirect URLs for email confirmation

## Test Configuration

After setting up, restart your server. You should see:
```
✓ Email transporter configured with custom SMTP
```

Instead of:
```
⚠ Email transporter not configured. OTP emails will be logged to console only.
```

## Disable Email (Development Only)

If you don't want to set up email right now, the system will work but OTP codes will only be logged to the console instead of being sent via email.