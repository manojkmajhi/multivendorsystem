-- Add short_description and long_description to products (idempotent)
alter table public.products add column if not exists short_description text; -- <=30 words target
alter table public.products add column if not exists long_description text;   -- HTML capable

-- OPTIONAL one-time backfill: take first non-empty line of legacy description as short
-- and move full legacy description into long_description if long_description empty.
-- Uncomment to use:
-- update public.products p
-- set long_description = coalesce(p.long_description, p.description),
--     short_description = coalesce(p.short_description,
--       left(
--         regexp_replace(trim(split_part(coalesce(p.description,''),'\n',1)),'\s+',' ','g')
--       , 300) -- safety cap
--     )
-- where coalesce(p.description,'') <> '';

-- (Optional) enforce a soft limit via a check (commented out because existing rows may violate)
-- alter table public.products add constraint short_description_word_limit
--   check (short_description is null OR array_length(regexp_split_to_array(trim(short_description),'\s+'),1) <= 35);
