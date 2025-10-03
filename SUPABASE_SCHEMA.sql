-- Suggested Supabase schema for Stickers Nepal
-- Run this in the SQL editor (ensure pgcrypto extension for UUID gen_random_uuid())
create extension if not exists "pgcrypto";

-- Categories table
create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text unique not null,
  image_url text,
  created_at timestamptz default now()
);

-- Product types (optional)
create table if not exists public.product_types (
  id uuid primary key default gen_random_uuid(),
  name text unique not null,
  created_at timestamptz default now()
);

-- Products
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  legacy_id text, -- optional to map old numeric ids
  name text not null,
  price numeric(10,2) not null default 0,
  image text,
  type text, -- or FK to product_types.id
  category text, -- or FK to categories.name / categories.id
  short_description text, -- <= ~30 words, plain text summary
  long_description text, -- rich / HTML capable extended description
  tags text[] default '{}',
  active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Ensure columns exist (idempotent for deployments)
alter table public.products add column if not exists short_description text;
alter table public.products add column if not exists long_description text;

-- Legacy backfill helper (if an old 'description' column still exists temporarily)
-- update public.products
-- set long_description = coalesce(long_description, description),
--     short_description = coalesce(short_description,
--         regexp_replace(trim(split_part(description,'\n',1)),'\s+',' ','g'))
-- where description is not null and description <> '';

-- Hero / carousel images for homepage banners
create table if not exists public.hero_images (
  id uuid primary key default gen_random_uuid(),
  title text,
  image_url text not null,
  link_url text,
  position int default 0,
  active boolean default true,
  description text,
  cta_label text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Settings (general key/value config)
create table if not exists public.settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz default now()
);

-- Basic Row Level Security enabling
alter table public.categories enable row level security;
alter table public.product_types enable row level security;
alter table public.products enable row level security;
alter table public.settings enable row level security;
alter table public.hero_images enable row level security;

-- Public read policies (adjust as needed)
create policy "Public read categories" on public.categories for select using ( true );
create policy "Public read products" on public.products for select using ( active );
create policy "Public read hero images" on public.hero_images for select using ( active );

-- Authenticated insert/update/delete policies (example)
create policy "Auth upsert products" on public.products for all using ( auth.role() = 'authenticated' ) with check ( auth.role() = 'authenticated' );
create policy "Auth manage hero images" on public.hero_images for all using ( auth.role() = 'authenticated' ) with check ( auth.role() = 'authenticated' );

-- Settings should be restricted; no public select unless desired
create policy "Read settings authenticated" on public.settings for select using ( auth.role() = 'authenticated' );
create policy "Write settings authenticated" on public.settings for all using ( auth.role() = 'authenticated' ) with check ( auth.role() = 'authenticated' );

-- Admin password will be stored (hashed) inside settings table under key 'admin_auth'
-- Structure example:
-- { "password_hash": "<bcrypt hash>", "updated_at": "2025-09-27T00:00:00Z" }

-- Helpful indexes
create index if not exists idx_products_category_active on public.products(category, active);
create index if not exists idx_hero_images_position on public.hero_images(position);

-- NOTE: For server-side admin writes, use the service role key in your backend (.env SUPABASE_SERVICE_ROLE_KEY)
-- To add new fields (run once if upgrading):
-- alter table public.hero_images add column if not exists description text;
-- alter table public.hero_images add column if not exists cta_label text;
-- To store accent color in settings site object, include { "accent_color": "#2b90d9" }
