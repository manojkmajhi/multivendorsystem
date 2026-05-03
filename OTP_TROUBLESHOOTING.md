# OTP Not Received - Troubleshooting

## Quick Checks

1. **Restart your server** (important!)
   ```bash
   npm run dev
   ```

2. **Check server logs** - Look for:
   ```
   📱 OTP REQUEST
   Original phone: 9814789009
   Formatted phone: +9779814789009
   ```

3. **Verify WhatsApp number**
   - Is WhatsApp installed on `+9779814789009`?
   - Is WhatsApp active (not banned)?
   - Can you receive normal WhatsApp messages?

## Test Your Number

Run this to test YOUR specific number:

```bash
# Edit test-my-number.js first - change the phone number to yours
node test-my-number.js
```

## Common Issues

### Issue 1: Wrong Phone Number
- You're entering: `9814789009`
- System adds: `+977` → `+9779814789009`
- **Is this YOUR WhatsApp number?**

### Issue 2: Free Tier Limits
- OTPless free tier: **10 OTPs per day**
- Check if you've exceeded the limit
- Check OTPless dashboard: https://otpless.com/dashboard

### Issue 3: WhatsApp Not Active
- WhatsApp must be installed and active
- Number must not be banned
- Must be able to receive messages

### Issue 4: Test Mode
- Free tier uses "test mode"
- Some numbers may not work in test mode
- Try a different number or upgrade plan

## What to Check in Server Logs

When you submit the form, you should see:
```
📱 OTP REQUEST
Original phone: 9814789009
Formatted phone: +9779814789009
Sending WhatsApp OTP...
OTPless API Status: 200
OTPless Response: {"orderId":"Otp_XXX..."}
✅ OTP sent! Order ID: Otp_XXX...
📱 Check WhatsApp on: +9779814789009
```

If you see this but NO WhatsApp message:
1. Wrong number (not your WhatsApp)
2. WhatsApp not active on that number
3. Free tier limitations
4. Check OTPless dashboard for delivery status

## Solution: Use Different Number

If `+9779814789009` is not your WhatsApp number:

1. **Find your WhatsApp number:**
   - Open WhatsApp
   - Settings → Profile
   - Note your number with country code

2. **Test with your number:**
   - Edit `test-my-number.js`
   - Change: `const myWhatsAppNumber = '+977XXXXXXXXXX';`
   - Run: `node test-my-number.js`

3. **Use that number in checkout**

## Still Not Working?

Check OTPless dashboard:
- Login: https://otpless.com/dashboard
- Check delivery logs
- Check daily limit
- Verify credentials are correct
