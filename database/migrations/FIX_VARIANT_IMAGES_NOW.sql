-- =====================================================
-- QUICK FIX: Set variant images to product images
-- =====================================================
-- Run this NOW in Supabase SQL Editor

-- Copy product image to all variants that don't have one
UPDATE variants v
SET image = p.image
FROM products p
WHERE v.product_id = p.id
AND (v.image IS NULL OR v.image = '')
AND p.image IS NOT NULL
AND p.image != '';

-- Verify the fix
SELECT 
  COUNT(*) FILTER (WHERE image IS NOT NULL AND image != '') as variants_with_image,
  COUNT(*) FILTER (WHERE image IS NULL OR image = '') as variants_without_image,
  COUNT(*) as total_variants
FROM variants
WHERE active = true;

-- Check a sample
SELECT 
  v.id,
  v.sku,
  v.image,
  v.attribute_combination,
  p.name as product_name
FROM variants v
JOIN products p ON v.product_id = p.id
WHERE v.active = true
LIMIT 10;
