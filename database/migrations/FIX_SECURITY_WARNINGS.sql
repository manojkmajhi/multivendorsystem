-- =====================================================
-- FIX SUPABASE SECURITY & PERFORMANCE WARNINGS
-- =====================================================
-- Run this SQL in your Supabase SQL Editor

-- PART 1: Fix function_search_path_mutable warnings

-- Fix: get_product_with_variants
CREATE OR REPLACE FUNCTION get_product_with_variants(product_uuid UUID)
RETURNS JSON 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'product', row_to_json(p.*),
    'variants', COALESCE(
      (SELECT json_agg(row_to_json(v.*))
       FROM variants v
       WHERE v.product_id = p.id AND v.active = TRUE),
      '[]'::json
    ),
    'attributes', COALESCE(
      (SELECT json_agg(
        json_build_object(
          'attribute', row_to_json(a.*),
          'values', (
            SELECT json_agg(row_to_json(av.*))
            FROM attribute_values av
            WHERE av.attribute_id = a.id
            ORDER BY av.display_order
          )
        )
      )
      FROM product_attributes pa
      JOIN attributes a ON pa.attribute_id = a.id
      WHERE pa.product_id = p.id AND a.active = TRUE
      ORDER BY a.display_order),
      '[]'::json
    )
  ) INTO result
  FROM products p
  WHERE p.id = product_uuid;
  
  RETURN result;
END;
$$;

-- Fix: generate_order_number
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS text 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  new_number text;
  counter int;
BEGIN
  SELECT count(*) + 1 INTO counter
  FROM public.orders
  WHERE date(created_at) = current_date;
  
  new_number := 'ORD-' || to_char(current_date, 'YYYYMMDD') || '-' || lpad(counter::text, 4, '0');
  RETURN new_number;
END;
$$;

-- Fix: set_order_number
CREATE OR REPLACE FUNCTION set_order_number()
RETURNS trigger 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.order_number IS NULL OR NEW.order_number = '' THEN
    NEW.order_number := generate_order_number();
  END IF;
  RETURN NEW;
END;
$$;

-- Fix: update_updated_at_column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS trigger 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- =====================================================
-- PART 2: Fix auth_rls_initplan warnings (Performance)
-- =====================================================

-- Drop old policies
DROP POLICY IF EXISTS "Admin read all orders" ON orders;
DROP POLICY IF EXISTS "Admin can update orders" ON orders;
DROP POLICY IF EXISTS "Admin can delete orders" ON orders;

-- Recreate with optimized auth checks
CREATE POLICY "Admin read all orders" ON orders FOR SELECT 
  USING ((SELECT auth.role()) = 'authenticated');

CREATE POLICY "Admin can update orders" ON orders FOR UPDATE 
  USING ((SELECT auth.role()) = 'authenticated') 
  WITH CHECK ((SELECT auth.role()) = 'authenticated');

CREATE POLICY "Admin can delete orders" ON orders FOR DELETE 
  USING ((SELECT auth.role()) = 'authenticated');

-- =====================================================
-- PART 3: Fix multiple_permissive_policies warnings
-- =====================================================

-- Drop all existing policies to start fresh
DROP POLICY IF EXISTS "Service role all attributes" ON attributes;
DROP POLICY IF EXISTS "Service role all attribute_values" ON attribute_values;
DROP POLICY IF EXISTS "Service role all product_attributes" ON product_attributes;
DROP POLICY IF EXISTS "Service role all variants" ON variants;
DROP POLICY IF EXISTS "Auth upsert products" ON products;
DROP POLICY IF EXISTS "Auth manage hero images" ON hero_images;
DROP POLICY IF EXISTS "Read settings authenticated" ON settings;
DROP POLICY IF EXISTS "Write settings authenticated" ON settings;

-- Consolidate products policies
DROP POLICY IF EXISTS "Auth upsert products" ON products;
DROP POLICY IF EXISTS "Public read products" ON products;
DROP POLICY IF EXISTS "Authenticated manage products" ON products;
CREATE POLICY "Public read products" ON products FOR SELECT USING (active);
CREATE POLICY "Authenticated insert products" ON products FOR INSERT 
  WITH CHECK ((SELECT auth.role()) = 'authenticated');
CREATE POLICY "Authenticated update products" ON products FOR UPDATE 
  USING ((SELECT auth.role()) = 'authenticated') 
  WITH CHECK ((SELECT auth.role()) = 'authenticated');
CREATE POLICY "Authenticated delete products" ON products FOR DELETE 
  USING ((SELECT auth.role()) = 'authenticated');

-- Consolidate hero_images policies
DROP POLICY IF EXISTS "Auth manage hero images" ON hero_images;
DROP POLICY IF EXISTS "Public read hero images" ON hero_images;
DROP POLICY IF EXISTS "Authenticated manage hero images" ON hero_images;
CREATE POLICY "Public read hero images" ON hero_images FOR SELECT USING (active);
CREATE POLICY "Authenticated insert hero images" ON hero_images FOR INSERT 
  WITH CHECK ((SELECT auth.role()) = 'authenticated');
CREATE POLICY "Authenticated update hero images" ON hero_images FOR UPDATE 
  USING ((SELECT auth.role()) = 'authenticated') 
  WITH CHECK ((SELECT auth.role()) = 'authenticated');
CREATE POLICY "Authenticated delete hero images" ON hero_images FOR DELETE 
  USING ((SELECT auth.role()) = 'authenticated');

-- Consolidate settings policies
DROP POLICY IF EXISTS "Read settings authenticated" ON settings;
DROP POLICY IF EXISTS "Write settings authenticated" ON settings;
DROP POLICY IF EXISTS "Authenticated read settings" ON settings;
DROP POLICY IF EXISTS "Authenticated write settings" ON settings;
DROP POLICY IF EXISTS "Authenticated update settings" ON settings;
DROP POLICY IF EXISTS "Authenticated delete settings" ON settings;
CREATE POLICY "Authenticated read settings" ON settings FOR SELECT 
  USING ((SELECT auth.role()) = 'authenticated');
CREATE POLICY "Authenticated insert settings" ON settings FOR INSERT 
  WITH CHECK ((SELECT auth.role()) = 'authenticated');
CREATE POLICY "Authenticated update settings" ON settings FOR UPDATE 
  USING ((SELECT auth.role()) = 'authenticated') 
  WITH CHECK ((SELECT auth.role()) = 'authenticated');
CREATE POLICY "Authenticated delete settings" ON settings FOR DELETE 
  USING ((SELECT auth.role()) = 'authenticated');

-- =====================================================
-- PART 4: Fix unindexed_foreign_keys (Performance)
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_product_attributes_attribute_id 
  ON product_attributes(attribute_id);

-- =====================================================
-- PART 5: Unused indexes (INFO - optional cleanup)
-- =====================================================
-- Uncomment to remove unused indexes:
-- DROP INDEX IF EXISTS idx_variants_combination;
-- DROP INDEX IF EXISTS idx_orders_order_number;
-- DROP INDEX IF EXISTS idx_orders_tracking;
-- DROP INDEX IF EXISTS idx_variants_active;
