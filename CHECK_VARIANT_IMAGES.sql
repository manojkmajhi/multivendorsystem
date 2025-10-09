-- =====================================================
-- CHECK AND FIX VARIANT IMAGES
-- =====================================================
-- Run this in Supabase SQL Editor to check variant images

-- 1. Check all variants and their images
SELECT 
  v.id,
  v.sku,
  v.image,
  v.price_adjustment,
  v.stock,
  v.attribute_combination,
  v.active,
  p.id as product_id,
  p.name as product_name,
  p.image as product_image
FROM variants v
JOIN products p ON v.product_id = p.id
ORDER BY p.name, v.sku;

-- 2. Find variants WITHOUT images
SELECT 
  v.id,
  v.sku,
  v.attribute_combination,
  p.name as product_name,
  p.image as product_image
FROM variants v
JOIN products p ON v.product_id = p.id
WHERE v.image IS NULL OR v.image = ''
ORDER BY p.name;

-- 3. Count variants with/without images
SELECT 
  COUNT(*) FILTER (WHERE image IS NOT NULL AND image != '') as with_image,
  COUNT(*) FILTER (WHERE image IS NULL OR image = '') as without_image,
  COUNT(*) as total
FROM variants
WHERE active = true;

-- 4. Set variant images to product image (if variant image is missing)
-- UNCOMMENT TO RUN:
-- UPDATE variants v
-- SET image = p.image
-- FROM products p
-- WHERE v.product_id = p.id
-- AND (v.image IS NULL OR v.image = '')
-- AND p.image IS NOT NULL;

-- 5. Check specific product's variants
-- Replace 'YOUR_PRODUCT_ID' with actual product ID
-- SELECT 
--   v.*,
--   p.name as product_name
-- FROM variants v
-- JOIN products p ON v.product_id = p.id
-- WHERE p.id = 'YOUR_PRODUCT_ID';

-- 6. Verify RLS policy for variants (public read access)
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'variants';

-- 7. Add public read policy if missing
-- UNCOMMENT TO RUN:
-- CREATE POLICY IF NOT EXISTS "Public read active variants" 
-- ON variants FOR SELECT 
-- USING (active = true);
