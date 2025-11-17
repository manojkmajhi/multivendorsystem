-- COPY AND PASTE THIS INTO SUPABASE SQL EDITOR
-- Go to: https://app.supabase.com → Your Project → SQL Editor

-- Step 1: Drop the problematic RLS policy that blocks service role
DROP POLICY IF EXISTS "Public read approved farmers" ON public.farmers;

-- Step 2: Create a new policy that allows service role to insert
-- Service role key bypasses RLS, but let's recreate the policy properly
CREATE POLICY "Anyone can apply" ON public.farmers 
  FOR INSERT 
  WITH CHECK (true);

-- Step 3: Create policy for public to read approved farmers
CREATE POLICY "Public read approved farmers" ON public.farmers 
  FOR SELECT 
  USING (status = 'approved');

-- Step 4: Ensure RLS is enabled (it should be)
ALTER TABLE public.farmers ENABLE ROW LEVEL SECURITY;

-- That's it! Now service role key can insert new farmers
-- The policy "Anyone can apply" allows inserts to bypass RLS