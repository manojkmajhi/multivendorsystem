-- Orders table with tracking support
-- Run this in Supabase SQL editor

-- Create orders table if not exists
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text unique not null,
  customer_name text not null,
  customer_mobile text not null,
  customer_email text,
  region text not null,
  area text not null,
  address text not null,
  notes text,
  items jsonb not null default '[]',
  subtotal numeric(10,2) not null default 0,
  delivery_fee numeric(10,2) not null default 0,
  total numeric(10,2) not null default 0,
  status text not null default 'pending',
  tracking_info jsonb default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Add tracking_info column if it doesn't exist (for existing tables)
alter table public.orders add column if not exists tracking_info jsonb default '{}';

-- Add order_number column if it doesn't exist
alter table public.orders add column if not exists order_number text;

-- Create unique index on order_number
create unique index if not exists idx_orders_order_number on public.orders(order_number);

-- Create index on status for filtering
create index if not exists idx_orders_status on public.orders(status);

-- Create index on created_at for sorting
create index if not exists idx_orders_created_at on public.orders(created_at desc);

-- Function to generate order number
create or replace function generate_order_number()
returns text as $$
declare
  new_order_number text;
  date_part text;
  counter int;
begin
  date_part := to_char(now(), 'YYYYMMDD');
  
  -- Get the count of orders today
  select count(*) + 1 into counter
  from public.orders
  where order_number like 'ORD-' || date_part || '-%';
  
  new_order_number := 'ORD-' || date_part || '-' || lpad(counter::text, 3, '0');
  
  return new_order_number;
end;
$$ language plpgsql;

-- Trigger to auto-generate order_number if not provided
create or replace function set_order_number()
returns trigger as $$
begin
  if new.order_number is null or new.order_number = '' then
    new.order_number := generate_order_number();
  end if;
  return new;
end;
$$ language plpgsql;

-- Create trigger
drop trigger if exists trigger_set_order_number on public.orders;
create trigger trigger_set_order_number
  before insert on public.orders
  for each row
  execute function set_order_number();

-- Enable RLS
alter table public.orders enable row level security;

-- Policy: Public can insert orders (for checkout)
create policy "Public can create orders" on public.orders
  for insert
  with check (true);

-- Policy: Public can read their own orders by order_number (for tracking)
create policy "Public can track orders" on public.orders
  for select
  using (true);

-- Policy: Authenticated users (admin) can do everything
create policy "Admin full access" on public.orders
  for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');

-- Update existing orders to have order_numbers if they don't
do $$
declare
  r record;
  new_num text;
begin
  for r in select id from public.orders where order_number is null or order_number = ''
  loop
    new_num := generate_order_number();
    update public.orders set order_number = new_num where id = r.id;
  end loop;
end $$;

-- Sample tracking_info structure:
-- {
--   "pending": {
--     "estimated_date": "1-2 days",
--     "note": "Your order has been received and is being processed.",
--     "updated_at": "2024-01-15T10:30:00Z"
--   },
--   "confirmed": {
--     "estimated_date": "2-3 days",
--     "note": "Your order has been confirmed!",
--     "updated_at": "2024-01-15T11:00:00Z"
--   }
-- }
