# Fix Supabase Auth Security Warnings

## 1. Enable Leaked Password Protection

**Steps:**
1. Go to your Supabase Dashboard
2. Navigate to **Authentication** → **Policies** (or **Settings**)
3. Find **Password Security** section
4. Enable **"Check for leaked passwords"** or **"Leaked password protection"**
5. Save changes

This checks passwords against HaveIBeenPwned.org database.

## 2. Enable Additional MFA Options

**Steps:**
1. Go to your Supabase Dashboard
2. Navigate to **Authentication** → **Providers**
3. Scroll to **Multi-Factor Authentication (MFA)** section
4. Enable at least one additional method:
   - **TOTP (Time-based One-Time Password)** - Recommended
   - **Phone/SMS** (if available)
5. Save changes

**Note:** Since your app uses custom admin authentication (not Supabase Auth), these warnings may not apply to your use case. However, enabling them improves security if you ever add Supabase Auth for users.
