-- Add location coordinates to orders table
-- Run this in Supabase SQL editor

-- Add latitude and longitude columns to orders table
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 8),
ADD COLUMN IF NOT EXISTS longitude DECIMAL(11, 8);

-- Add index for location-based queries (optional, for future features)
CREATE INDEX IF NOT EXISTS idx_orders_location ON public.orders(latitude, longitude);

-- Add comment for documentation
COMMENT ON COLUMN public.orders.latitude IS 'Delivery location latitude coordinate';
COMMENT ON COLUMN public.orders.longitude IS 'Delivery location longitude coordinate';