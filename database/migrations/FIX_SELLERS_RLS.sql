-- Fix sellers table RLS to allow service role full access
ALTER TABLE public.sellers ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies
DROP POLICY IF EXISTS "Public read approved sellers" ON public.sellers;
DROP POLICY IF EXISTS "Service role full access" ON public.sellers;

-- Allow public to read approved sellers
CREATE POLICY "Public read approved sellers" ON public.sellers 
  FOR SELECT USING (status = 'approved');

-- Allow service role (backend) full access for password resets and management
CREATE POLICY "Service role full access" ON public.sellers 
  FOR ALL USING (true);

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE ON public.sellers TO anon, authenticated;
