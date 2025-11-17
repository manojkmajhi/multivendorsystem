-- Fixes for farmer signup process
-- 1. Add password_hash column for authentication
-- 2. Make email column nullable as it is not provided during initial signup
-- 3. Add unique constraint to phone number as it's used for login/identification

-- Add password_hash column, nullable to support existing records
ALTER TABLE public.farmers ADD COLUMN IF NOT EXISTS password_hash TEXT;

-- Make email nullable
ALTER TABLE public.farmers ALTER COLUMN email DROP NOT NULL;

-- Add unique constraint to phone if it doesn't exist
-- Note: This will fail if there are duplicate phone numbers already in the table.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'farmers_phone_key' AND conrelid = 'public.farmers'::regclass
  ) THEN
    ALTER TABLE public.farmers ADD CONSTRAINT farmers_phone_key UNIQUE (phone);
  END IF;
END;
$$;
