-- Create farmers table for sellers
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

-- Enable RLS
ALTER TABLE public.farmers ENABLE ROW LEVEL SECURITY;

-- Create policy for public read of approved farmers
CREATE POLICY "Public read approved farmers" ON public.farmers 
  FOR SELECT USING (status = 'approved');

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.farmers TO authenticated;