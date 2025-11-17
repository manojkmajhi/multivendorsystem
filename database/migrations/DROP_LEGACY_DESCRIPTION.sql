-- Migration: Drop legacy 'description' column from products (after confirming data migrated)
-- 1. (Optional safety) Backfill first if you have not:
--    update public.products
--    set long_description = coalesce(long_description, description),
--        short_description = coalesce(short_description,
--            regexp_replace(trim(split_part(description,'\n',1)),'\s+',' ','g'))
--    where description is not null and description <> '';
-- 2. Then drop the column:
alter table public.products drop column if exists description;

-- 3. (Optional) Add an index to speed up listing by active + category if not present
create index if not exists idx_products_category_active on public.products(category, active);

-- 4. Verify
--    select id,name,short_description,long_description from public.products limit 20;
