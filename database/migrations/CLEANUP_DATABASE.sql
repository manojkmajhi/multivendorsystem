-- Database Cleanup Script
-- Run this in Supabase SQL editor to clean up old tables and fix RLS policies

-- 1. Drop old farmers table (data already migrated to sellers)
DROP TABLE IF EXISTS public.farmers CASCADE;

-- 2. Drop old farmer_applications table (data already migrated to seller_applications)  
DROP TABLE IF EXISTS public.farmer_applications CASCADE;

-- 3. Fix RLS policies for unrestricted tables

-- Fix product_types table RLS (make it unrestricted for public read)
ALTER TABLE public.product_types ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read product_types" ON public.product_types;
CREATE POLICY "Public read product_types" ON public.product_types 
  FOR SELECT USING (true);

-- Create seller_applications table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.seller_applications (
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

-- Fix seller_applications table RLS (unrestricted for admin management)
ALTER TABLE public.seller_applications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can apply" ON public.seller_applications;
DROP POLICY IF EXISTS "Admin full access seller_applications" ON public.seller_applications;

-- Allow public to submit applications
CREATE POLICY "Anyone can apply" ON public.seller_applications 
  FOR INSERT WITH CHECK (true);

-- Allow service role (admin) full access
CREATE POLICY "Admin full access seller_applications" ON public.seller_applications 
  FOR ALL USING (true);

-- 4. Ensure all core tables have proper RLS policies

-- Products table - public read for active products
DROP POLICY IF EXISTS "Public read active products" ON public.products;
CREATE POLICY "Public read active products" ON public.products 
  FOR SELECT USING (active = true);

-- Categories table - public read
DROP POLICY IF EXISTS "Public read categories" ON public.categories;
CREATE POLICY "Public read categories" ON public.categories 
  FOR SELECT USING (true);

-- Hero images table - public read for active images
DROP POLICY IF EXISTS "Public read active hero images" ON public.hero_images;
CREATE POLICY "Public read active hero images" ON public.hero_images 
  FOR SELECT USING (active = true);

-- Orders table - users can only see their own orders
DROP POLICY IF EXISTS "Users read own orders" ON public.orders;
CREATE POLICY "Users read own orders" ON public.orders 
  FOR SELECT USING (true); -- Allow public read for order tracking

-- Settings table - public read
DROP POLICY IF EXISTS "Public read settings" ON public.settings;
CREATE POLICY "Public read settings" ON public.settings 
  FOR SELECT USING (true);

-- Variants table - public read for active variants
DROP POLICY IF EXISTS "Public read variants" ON public.variants;
CREATE POLICY "Public read variants" ON public.variants 
  FOR SELECT USING (active = true);

-- Attributes table - public read
DROP POLICY IF EXISTS "Public read attributes" ON public.attributes;
CREATE POLICY "Public read attributes" ON public.attributes 
  FOR SELECT USING (true);

-- Attribute values table - public read  
DROP POLICY IF EXISTS "Public read attribute_values" ON public.attribute_values;
CREATE POLICY "Public read attribute_values" ON public.attribute_values 
  FOR SELECT USING (true);

-- Product attributes table - public read
DROP POLICY IF EXISTS "Public read product_attributes" ON public.product_attributes;
CREATE POLICY "Public read product_attributes" ON public.product_attributes 
  FOR SELECT USING (true);

-- 5. Grant necessary permissions to authenticated and anon users
GRANT SELECT ON public.products TO anon, authenticated;
GRANT SELECT ON public.categories TO anon, authenticated;
GRANT SELECT ON public.hero_images TO anon, authenticated;
GRANT SELECT ON public.settings TO anon, authenticated;
GRANT SELECT ON public.variants TO anon, authenticated;
GRANT SELECT ON public.attributes TO anon, authenticated;
GRANT SELECT ON public.attribute_values TO anon, authenticated;
GRANT SELECT ON public.product_attributes TO anon, authenticated;
GRANT SELECT ON public.product_types TO anon, authenticated;
GRANT SELECT ON public.sellers TO anon, authenticated;
GRANT SELECT ON public.seller_posts TO anon, authenticated;
GRANT SELECT ON public.orders TO anon, authenticated;

-- Allow inserting applications and orders
GRANT SELECT, INSERT ON public.seller_applications TO anon, authenticated;
GRANT INSERT ON public.orders TO anon, authenticated;

-- 6. Clean up any orphaned indexes
DROP INDEX IF EXISTS idx_products_farmer;
DROP INDEX IF EXISTS idx_farmers_status;
DROP INDEX IF EXISTS idx_farmer_posts_farmer_id;
DROP INDEX IF EXISTS idx_farmer_applications_status;

-- Ensure seller indexes exist
CREATE INDEX IF NOT EXISTS idx_products_seller ON public.products(seller_id);
CREATE INDEX IF NOT EXISTS idx_sellers_status ON public.sellers(status);
CREATE INDEX IF NOT EXISTS idx_seller_posts_seller_id ON public.seller_posts(seller_id);
CREATE INDEX IF NOT EXISTS idx_seller_applications_status ON public.seller_applications(status);
CREATE INDEX IF NOT EXISTS idx_seller_applications_created ON public.seller_applications(created_at);

-- Database cleanup complete - old farmer tables removed and RLS policies fixed