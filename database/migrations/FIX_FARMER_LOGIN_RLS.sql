-- Fix RLS policies for farmer login
-- Run this in Supabase SQL editor

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Public read approved farmers" ON public.farmers;
DROP POLICY IF EXISTS "Admin full access farmers" ON public.farmers;

-- Create proper policies for farmer login
CREATE POLICY "Service role full access" ON public.farmers 
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Farmers can read own data" ON public.farmers 
  FOR SELECT USING (auth.uid()::text = id::text);

-- Ensure service role can bypass RLS entirely
ALTER TABLE public.farmers FORCE ROW LEVEL SECURITY;

-- Grant proper permissions
GRANT ALL ON public.farmers TO service_role;
GRANT USAGE ON SCHEMA public TO service_role;