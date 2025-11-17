-- Cropsay Farmers/Sellers Schema
-- Run this in Supabase SQL editor

-- Farmers/Sellers table
create table if not exists public.farmers (
  id uuid primary key default gen_random_uuid(),
  email text unique, -- xxxx@cropsay.com domain email, can be null initially
  password_hash text, -- Hashed password for login
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

-- Farmer applications (before approval)
create table if not exists public.farmer_applications (
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

-- Farmer posts/notices (like Instagram feed)
create table if not exists public.farmer_posts (
  id uuid primary key default gen_random_uuid(),
  farmer_id uuid references public.farmers(id) on delete cascade,
  content text,
  media_type text check (media_type in ('image', 'video', 'link')),
  media_url text not null,
  thumbnail_url text, -- for videos
  created_at timestamptz default now()
);

-- Link products to farmers (many-to-many)
alter table public.products add column if not exists farmer_id uuid references public.farmers(id) on delete set null;
create index if not exists idx_products_farmer on public.products(farmer_id);

-- RLS Policies
alter table public.farmers enable row level security;
alter table public.farmer_applications enable row level security;
alter table public.farmer_posts enable row level security;

-- Public can view approved farmers
create policy "Public read approved farmers" on public.farmers 
  for select using (status = 'approved');

-- Public can view farmer posts
create policy "Public read farmer posts" on public.farmer_posts 
  for select using (
    exists (select 1 from public.farmers where id = farmer_posts.farmer_id and status = 'approved')
  );

-- Public can submit applications
create policy "Anyone can apply" on public.farmer_applications 
  for insert with check (true);

-- Farmers can manage their own data (authenticated via service role in backend)
-- Admin manages via service role key

-- Indexes for performance
create index if not exists idx_farmers_status on public.farmers(status);
create index if not exists idx_farmer_posts_farmer_id on public.farmer_posts(farmer_id);
create index if not exists idx_farmer_applications_status on public.farmer_applications(status);
