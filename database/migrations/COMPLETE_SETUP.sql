-- Complete setup for sellers and applications
-- Run this in Supabase SQL editor

-- Create farmers table
CREATE TABLE IF NOT EXISTS public.farmers (
  id uuid primary key default gen_random_uuid(),
  email text unique,
  password_hash text,
  full_name text not null,
  phone text not null unique,
  business_name text,
  location text,
  bio text,
  profile_image text,
  cover_image text,
  status text default 'pending' check (status in ('pending', 'approved', 'suspended')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Create farmer_applications table
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
ALTER TABLE public.farmers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.farmer_applications ENABLE ROW LEVEL SECURITY;

-- Create policies (skip if exists)
DO $$ BEGIN
  CREATE POLICY "Public read approved farmers" ON public.farmers 
    FOR SELECT USING (status = 'approved');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Admin full access farmers" ON public.farmers 
    FOR ALL USING (auth.role() = 'service_role');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Anyone can apply" ON public.farmer_applications 
    FOR INSERT WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Drop existing seller_applications if exists
DROP VIEW IF EXISTS public.seller_applications CASCADE;
DROP TABLE IF EXISTS public.seller_applications CASCADE;

-- Create view for seller_applications
CREATE VIEW public.seller_applications AS 
SELECT * FROM public.farmer_applications;

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.farmers TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.farmer_applications TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.seller_applications TO authenticated;