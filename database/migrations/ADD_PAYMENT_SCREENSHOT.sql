-- Add payment_screenshot column to orders table
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS payment_screenshot TEXT,
ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'cod';

-- Add comment for documentation
COMMENT ON COLUMN orders.payment_screenshot IS 'Base64 encoded payment screenshot image for eSewa payments';
COMMENT ON COLUMN orders.payment_method IS 'Payment method: esewa or cod';
