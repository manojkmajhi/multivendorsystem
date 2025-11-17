-- Add test seller for password reset testing
INSERT INTO public.sellers (
  email, 
  full_name, 
  phone, 
  business_name, 
  status
) VALUES (
  'organicnepal@cropsay.com',
  'Organic Nepal',
  '+977-9841234567',
  'Organic Nepal Store',
  'approved'
) ON CONFLICT (email) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  business_name = EXCLUDED.business_name,
  status = EXCLUDED.status;