-- =====================================================
-- VARIANT SYSTEM DIAGNOSTICS
-- Run these queries to diagnose variant save issues
-- =====================================================

-- 1. Check if products table has variant columns
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'products' 
  AND column_name IN ('has_variants', 'base_sku', 'stock')
ORDER BY column_name;

-- 2. Check if variants table exists and has correct structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'variants'
ORDER BY ordinal_position;

-- 3. Check for duplicate SKUs (should return 0 rows)
SELECT sku, COUNT(*) as count
FROM variants
GROUP BY sku
HAVING COUNT(*) > 1;

-- 4. List all products with variants enabled
SELECT 
  id,
  name,
  has_variants,
  base_sku,
  stock,
  (SELECT COUNT(*) FROM variants WHERE product_id = products.id) as variant_count
FROM products
WHERE has_variants = true
ORDER BY name;

-- 5. View all variants with their combinations
SELECT 
  p.name as product_name,
  v.id as variant_id,
  v.sku,
  v.attribute_combination,
  v.price_adjustment,
  v.stock,
  v.active,
  v.created_at
FROM variants v
JOIN products p ON v.product_id = p.id
ORDER BY p.name, v.created_at;

-- 6. Check RLS policies on variants table
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'variants';

-- 7. Find products with variants enabled but no variants saved
SELECT 
  p.id,
  p.name,
  p.has_variants,
  COUNT(v.id) as variant_count
FROM products p
LEFT JOIN variants v ON p.product_id = v.product_id
WHERE p.has_variants = true
GROUP BY p.id, p.name, p.has_variants
HAVING COUNT(v.id) = 0;

-- 8. Check for orphaned variants (variants without products)
SELECT 
  v.id,
  v.sku,
  v.product_id,
  v.created_at
FROM variants v
LEFT JOIN products p ON v.product_id = p.id
WHERE p.id IS NULL;

-- 9. View variant attribute combinations in readable format
SELECT 
  p.name as product_name,
  v.sku,
  jsonb_pretty(v.attribute_combination) as attributes,
  v.stock,
  v.price_adjustment,
  v.active
FROM variants v
JOIN products p ON v.product_id = p.id
ORDER BY p.name, v.sku;

-- 10. Check if service role can insert variants (test query)
-- This will fail if RLS is blocking, which is the issue
-- Run this as service role user
INSERT INTO variants (
  product_id,
  sku,
  price_adjustment,
  stock,
  attribute_combination
) VALUES (
  (SELECT id FROM products LIMIT 1),
  'TEST-SKU-' || floor(random() * 1000000),
  0,
  10,
  '{"test": "value"}'::jsonb
) RETURNING *;

-- Clean up test variant
DELETE FROM variants WHERE sku LIKE 'TEST-SKU-%';

-- 11. Check for constraint violations
SELECT 
  conname as constraint_name,
  contype as constraint_type,
  pg_get_constraintdef(oid) as definition
FROM pg_constraint
WHERE conrelid = 'variants'::regclass;

-- 12. View recent variant activity (last 24 hours)
SELECT 
  p.name as product_name,
  v.sku,
  v.created_at,
  v.active,
  EXTRACT(EPOCH FROM (NOW() - v.created_at))/3600 as hours_ago
FROM variants v
JOIN products p ON v.product_id = p.id
WHERE v.created_at > NOW() - INTERVAL '24 hours'
ORDER BY v.created_at DESC;

-- =====================================================
-- CLEANUP QUERIES (use with caution)
-- =====================================================

-- Remove all variants for a specific product
-- DELETE FROM variants WHERE product_id = 'YOUR_PRODUCT_ID';

-- Remove all inactive variants
-- DELETE FROM variants WHERE active = false;

-- Remove duplicate SKUs (keeps the most recent)
-- DELETE FROM variants v1
-- WHERE EXISTS (
--   SELECT 1 FROM variants v2
--   WHERE v2.sku = v1.sku
--     AND v2.created_at > v1.created_at
-- );

-- =====================================================
-- REPAIR QUERIES
-- =====================================================

-- Fix products that have variants but has_variants is false
UPDATE products
SET has_variants = true
WHERE id IN (
  SELECT DISTINCT product_id 
  FROM variants 
  WHERE active = true
)
AND has_variants = false;

-- Deactivate variants for products that have has_variants = false
UPDATE variants
SET active = false
WHERE product_id IN (
  SELECT id FROM products WHERE has_variants = false
)
AND active = true;

-- =====================================================
-- PERFORMANCE QUERIES
-- =====================================================

-- Check index usage on variants table
SELECT 
  schemaname,
  tablename,
  indexname,
  idx_scan as index_scans,
  idx_tup_read as tuples_read,
  idx_tup_fetch as tuples_fetched
FROM pg_stat_user_indexes
WHERE tablename = 'variants'
ORDER BY idx_scan DESC;

-- Check table size
SELECT 
  pg_size_pretty(pg_total_relation_size('variants')) as total_size,
  pg_size_pretty(pg_relation_size('variants')) as table_size,
  pg_size_pretty(pg_indexes_size('variants')) as indexes_size,
  (SELECT COUNT(*) FROM variants) as row_count;
