# Fix Farmer RLS Policy for Signup

Run this SQL in your Supabase SQL Editor to fix the RLS policy:

```sql
-- Drop existing restrictive policies on farmers table
DROP POLICY IF EXISTS "Public read approved farmers" ON public.farmers;
DROP POLICY IF EXISTS "Farmers can manage their own data" ON public.farmers;
DROP POLICY IF EXISTS "Admin can do anything" ON public.farmers;

-- Create new policies that allow service role to insert
-- Service role bypasses RLS, but we'll keep them for consistency

-- Policy 1: Public can view approved farmers
CREATE POLICY "Public read approved farmers" ON public.farmers 
  FOR SELECT 
  USING (status = 'approved');

-- Policy 2: Authenticated users can view their own profile
CREATE POLICY "Farmers can view own profile" ON public.farmers 
  FOR SELECT 
  USING (auth.uid()::text = id::text);

-- Policy 3: Authenticated farmers can update their own profile  
CREATE POLICY "Farmers can update own profile" ON public.farmers 
  FOR UPDATE 
  USING (auth.uid()::text = id::text)
  WITH CHECK (auth.uid()::text = id::text);

-- Note: Service role key will bypass all RLS policies
-- So inserts from the backend will work without explicit policy

-- Verify RLS is enabled
ALTER TABLE public.farmers ENABLE ROW LEVEL SECURITY;

-- Check the policies
SELECT * FROM pg_policies WHERE tablename = 'farmers';
```

## What This Does:

1. **Removes overly restrictive policies** that might block service role operations
2. **Adds public read policy** - anyone can see approved farmers
3. **Adds user-specific policies** - farmers can view/edit their own profile
4. **Service role bypasses RLS** - the backend (with service role key) can insert/update freely

## Important:

The issue is that the **RLS policy was blocking even the service role key**. 

Since we're using `supabase` client with service role key in the backend, it SHOULD bypass RLS, but if it's not working:

**Option 1: Run the SQL above** to fix the RLS policy

**Option 2: Check Supabase Dashboard:**
1. Go to Authentication → Policies
2. Make sure RLS policies for `farmers` table aren't too restrictive
3. Service role should bypass them automatically

**Option 3: Temporary Fix** - Temporarily disable RLS on farmers table:
```sql
ALTER TABLE public.farmers DISABLE ROW LEVEL SECURITY;
```

Then re-enable after signup works:
```sql
ALTER TABLE public.farmers ENABLE ROW LEVEL SECURITY;
```

## Testing:

After running the SQL:
1. Try signup again
2. Should complete without "violates row-level security policy" error
3. Data should save to database
4. User should redirect to dashboard
