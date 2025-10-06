-- =====================================================
-- PRODUCT VARIANT SYSTEM - SUPABASE SCHEMA
-- =====================================================

-- 1. Add variant support to existing products table
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS has_variants BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS base_sku TEXT,
ADD COLUMN IF NOT EXISTS stock INTEGER DEFAULT 0;

-- 2. Attributes table (global attribute definitions)
CREATE TABLE IF NOT EXISTS attributes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  type TEXT NOT NULL DEFAULT 'select', -- select, color, text, number
  display_order INTEGER DEFAULT 0,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Attribute values table
CREATE TABLE IF NOT EXISTS attribute_values (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attribute_id UUID REFERENCES attributes(id) ON DELETE CASCADE,
  value TEXT NOT NULL,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Product attributes (links products to attributes)
CREATE TABLE IF NOT EXISTS product_attributes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  attribute_id UUID REFERENCES attributes(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(product_id, attribute_id)
);

-- 5. Variants table
CREATE TABLE IF NOT EXISTS variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  sku TEXT UNIQUE,
  price_adjustment DECIMAL(10,2) DEFAULT 0,
  stock INTEGER DEFAULT 0,
  image TEXT,
  active BOOLEAN DEFAULT TRUE,
  attribute_combination JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_variants_product_id ON variants(product_id);
CREATE INDEX IF NOT EXISTS idx_variants_active ON variants(active);
CREATE INDEX IF NOT EXISTS idx_attribute_values_attribute_id ON attribute_values(attribute_id);
CREATE INDEX IF NOT EXISTS idx_product_attributes_product_id ON product_attributes(product_id);
CREATE INDEX IF NOT EXISTS idx_variants_combination ON variants USING GIN (attribute_combination);

-- RLS Policies (allow service role full access, public read)
ALTER TABLE attributes ENABLE ROW LEVEL SECURITY;
ALTER TABLE attribute_values ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_attributes ENABLE ROW LEVEL SECURITY;
ALTER TABLE variants ENABLE ROW LEVEL SECURITY;

-- Public read access
CREATE POLICY "Public read attributes" ON attributes FOR SELECT USING (active = TRUE);
CREATE POLICY "Public read attribute_values" ON attribute_values FOR SELECT USING (TRUE);
CREATE POLICY "Public read product_attributes" ON product_attributes FOR SELECT USING (TRUE);
CREATE POLICY "Public read variants" ON variants FOR SELECT USING (active = TRUE);

-- Service role full access (admin operations)
CREATE POLICY "Service role all attributes" ON attributes FOR ALL USING (TRUE);
CREATE POLICY "Service role all attribute_values" ON attribute_values FOR ALL USING (TRUE);
CREATE POLICY "Service role all product_attributes" ON product_attributes FOR ALL USING (TRUE);
CREATE POLICY "Service role all variants" ON variants FOR ALL USING (TRUE);

-- Sample data for testing
INSERT INTO attributes (name, slug, type, display_order) VALUES
  ('Size', 'size', 'select', 1),
  ('Color', 'color', 'color', 2),
  ('Material', 'material', 'select', 3)
ON CONFLICT (slug) DO NOTHING;

-- Get attribute IDs for sample values
DO $$
DECLARE
  size_id UUID;
  color_id UUID;
  material_id UUID;
BEGIN
  SELECT id INTO size_id FROM attributes WHERE slug = 'size';
  SELECT id INTO color_id FROM attributes WHERE slug = 'color';
  SELECT id INTO material_id FROM attributes WHERE slug = 'material';

  -- Size values
  INSERT INTO attribute_values (attribute_id, value, display_order) VALUES
    (size_id, 'Small', 1),
    (size_id, 'Medium', 2),
    (size_id, 'Large', 3),
    (size_id, 'X-Large', 4)
  ON CONFLICT DO NOTHING;

  -- Color values
  INSERT INTO attribute_values (attribute_id, value, display_order) VALUES
    (color_id, 'Black', 1),
    (color_id, 'White', 2),
    (color_id, 'Red', 3),
    (color_id, 'Blue', 4)
  ON CONFLICT DO NOTHING;

  -- Material values
  INSERT INTO attribute_values (attribute_id, value, display_order) VALUES
    (material_id, 'Cotton', 1),
    (material_id, 'Polyester', 2),
    (material_id, 'Blend', 3)
  ON CONFLICT DO NOTHING;
END $$;

-- Helper function to get product with variants
CREATE OR REPLACE FUNCTION get_product_with_variants(product_uuid UUID)
RETURNS JSON AS $$
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
$$ LANGUAGE plpgsql;

COMMENT ON TABLE attributes IS 'Global attribute definitions (Size, Color, etc.)';
COMMENT ON TABLE attribute_values IS 'Possible values for each attribute';
COMMENT ON TABLE product_attributes IS 'Links products to their applicable attributes';
COMMENT ON TABLE variants IS 'Product variants with specific attribute combinations';
