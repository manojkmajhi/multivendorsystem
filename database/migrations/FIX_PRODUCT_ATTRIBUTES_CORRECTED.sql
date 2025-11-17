-- Fix: Automatically link ALL products with variants to their attributes
DO $$
DECLARE
  prod RECORD;
  attr_key TEXT;
  attr_id UUID;
BEGIN
  FOR prod IN 
    SELECT DISTINCT v.product_id 
    FROM variants v
    WHERE v.active = true
  LOOP
    FOR attr_key IN 
      SELECT DISTINCT jsonb_object_keys(v2.attribute_combination) 
      FROM variants v2
      WHERE v2.product_id = prod.product_id
    LOOP
      SELECT a.id INTO attr_id FROM attributes a WHERE a.slug = attr_key;
      
      IF attr_id IS NOT NULL THEN
        INSERT INTO product_attributes (product_id, attribute_id)
        VALUES (prod.product_id, attr_id)
        ON CONFLICT (product_id, attribute_id) DO NOTHING;
      END IF;
    END LOOP;
  END LOOP;
END $$;
