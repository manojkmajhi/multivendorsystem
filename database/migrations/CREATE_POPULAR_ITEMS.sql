-- Add is_popular column to products table
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_popular BOOLEAN DEFAULT false;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_products_is_popular ON products(is_popular) WHERE is_popular = true;
