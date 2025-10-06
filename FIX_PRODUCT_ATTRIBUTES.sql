-- Fix missing product_attributes links
-- This script links products with variants to their attributes

-- First, let's see what attributes exist in your variants
-- Run this to check what attributes your variants are using:
-- SELECT DISTINCT jsonb_object_keys(attribute_combination) as attribute_key 
-- FROM variants 
-- WHERE product_id = 'e1473326-f48b-4791-a71f-aebcb24cff39';

-- Example: If your variants use 'size' attribute, link it to the product
-- Replace 'YOUR_PRODUCT_ID' with the actual product ID
-- Replace 'size' with the actual attribute slug from your attributes table

-- Get the size attribute ID
DO $$
DECLARE
  size_attr_id UUID;
  product_id UUID := 'e1473326-f48b-4791-a71f-aebcb24cff39'; -- Replace with your product ID
BEGIN
  -- Get size attribute ID
  SELECT id INTO size_attr_id FROM attributes WHERE slug = 'size';
  
  -- Link product to size attribute
  INSERT INTO product_attributes (product_id, attribute_id)
  VALUES (product_id, size_attr_id)
  ON CONFLICT (product_id, attribute_id) DO NOTHING;
  
  RAISE NOTICE 'Linked product % to size attribute', product_id;
END $$;

-- If you have multiple attributes (e.g., size and color), add them all:
-- DO $$
-- DECLARE
--   size_attr_id UUID;
--   color_attr_id UUID;
--   product_id UUID := 'YOUR_PRODUCT_ID';
-- BEGIN
--   SELECT id INTO size_attr_id FROM attributes WHERE slug = 'size';
--   SELECT id INTO color_attr_id FROM attributes WHERE slug = 'color';
--   
--   INSERT INTO product_attributes (product_id, attribute_id)
--   VALUES 
--     (product_id, size_attr_id),
--     (product_id, color_attr_id)
--   ON CONFLICT (product_id, attribute_id) DO NOTHING;
-- END $$;

-- To automatically link ALL products with variants to their attributes:
DO $$
DECLARE
  prod RECORD;
  attr_key TEXT;
  attr_id UUID;
BEGIN
  -- Loop through all products with variants
  FOR prod IN 
    SELECT DISTINCT product_id 
    FROM variants 
    WHERE active = true
  LOOP
    -- Get unique attribute keys from this product's variants
    FOR attr_key IN 
      SELECT DISTINCT jsonb_object_keys(attribute_combination) 
      FROM variants 
      WHERE product_id = prod.product_id
    LOOP
      -- Get attribute ID by slug
      SELECT id INTO attr_id FROM attributes WHERE slug = attr_key;
      
      IF attr_id IS NOT NULL THEN
        -- Link product to attribute
        INSERT INTO product_attributes (product_id, attribute_id)
        VALUES (prod.product_id, attr_id)
        ON CONFLICT (product_id, attribute_id) DO NOTHING;
        
        RAISE NOTICE 'Linked product % to attribute %', prod.product_id, attr_key;
      END IF;
    END LOOP;
  END LOOP;
END $$;
