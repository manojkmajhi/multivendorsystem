-- Migration: Create seller applications table
-- This creates the missing farmer_applications table and seller_applications view

-- Create applications table
CREATE TABLE IF NOT EXISTS public.farmer_applications (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  phone text not null,
  email text,
  business_name text,
  location text,
  message text,
  status text default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz default now(),
  reviewed_at timestamptz,
  reviewed_by text
);

-- Enable RLS
ALTER TABLE public.farmer_applications ENABLE ROW LEVEL SECURITY;

-- Create policy for public insert
CREATE POLICY "Anyone can apply" ON public.farmer_applications 
  FOR INSERT WITH CHECK (true);

-- Drop existing seller_applications if it exists as table
DROP TABLE IF EXISTS public.seller_applications CASCADE;

-- Create view for seller_applications
CREATE VIEW public.seller_applications AS 
SELECT * FROM public.farmer_applications;

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.farmer_applications TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.seller_applications TO authenticated; 