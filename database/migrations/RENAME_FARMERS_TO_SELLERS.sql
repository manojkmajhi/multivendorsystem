-- Migration: Rename farmers to sellers
-- This migration renames all farmer-related tables and columns to seller terminology

-- Rename tables
ALTER TABLE public.farmers RENAME TO sellers;
ALTER TABLE public.farmer_applications RENAME TO seller_applications;
ALTER TABLE public.farmer_posts RENAME TO seller_posts;

-- Update column references
ALTER TABLE public.products RENAME COLUMN farmer_id TO seller_id;
ALTER TABLE public.seller_posts RENAME COLUMN farmer_id TO seller_id;

-- Update indexes
DROP INDEX IF EXISTS idx_products_farmer;
DROP INDEX IF EXISTS idx_farmers_status;
DROP INDEX IF EXISTS idx_farmer_posts_farmer_id;
DROP INDEX IF EXISTS idx_farmer_applications_status;

CREATE INDEX idx_products_seller ON public.products(seller_id);
CREATE INDEX idx_sellers_status ON public.sellers(status);
CREATE INDEX idx_seller_posts_seller_id ON public.seller_posts(seller_id);
CREATE INDEX idx_seller_applications_status ON public.seller_applications(status);

-- Update foreign key constraints
ALTER TABLE public.products DROP CONSTRAINT IF EXISTS products_farmer_id_fkey;
ALTER TABLE public.seller_posts DROP CONSTRAINT IF EXISTS farmer_posts_farmer_id_fkey;

ALTER TABLE public.products ADD CONSTRAINT products_seller_id_fkey 
  FOREIGN KEY (seller_id) REFERENCES public.sellers(id) ON DELETE SET NULL;
ALTER TABLE public.seller_posts ADD CONSTRAINT seller_posts_seller_id_fkey 
  FOREIGN KEY (seller_id) REFERENCES public.sellers(id) ON DELETE CASCADE;

-- Update RLS policies
DROP POLICY IF EXISTS "Public read approved farmers" ON public.sellers;
DROP POLICY IF EXISTS "Public read farmer posts" ON public.seller_posts;
DROP POLICY IF EXISTS "Anyone can apply" ON public.seller_applications;

CREATE POLICY "Public read approved sellers" ON public.sellers 
  FOR SELECT USING (status = 'approved');

CREATE POLICY "Public read seller posts" ON public.seller_posts 
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.sellers WHERE id = seller_posts.seller_id AND status = 'approved')
  );

CREATE POLICY "Anyone can apply" ON public.seller_applications 
  FOR INSERT WITH CHECK (true);

-- Update comments
COMMENT ON TABLE public.sellers IS 'Sellers/Farmers who sell products on the platform';
COMMENT ON TABLE public.seller_applications IS 'Applications from potential sellers';
COMMENT ON TABLE public.seller_posts IS 'Posts/updates from sellers';