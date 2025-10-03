-- Add description column to products table
-- Run this in Supabase SQL Editor if you already have products table

alter table public.products add column if not exists description text;

-- Optional: Set default description for existing products
-- update public.products 
-- set description = E'Waterproof\nPremium Quality\nNo Residue on Removal\nScratch Proof\nNo Fading'
-- where description is null;
