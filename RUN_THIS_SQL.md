# 📋 Quick SQL Setup for Orders Table

## Copy and paste this entire code into your Supabase SQL Editor:

```sql
-- Orders table schema for Stickers Nepal
-- Run this in Supabase SQL Editor

-- Orders table to store customer orders
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
  subtotal numeric(10,2) not null default 0,
  delivery_fee numeric(10,2) not null default 0,
  total numeric(10,2) not null default 0,
  status text not null default 'pending',
  items jsonb not null default '[]',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Index for faster queries
create index if not exists idx_orders_status on public.orders(status);
create index if not exists idx_orders_created_at on public.orders(created_at desc);
create index if not exists idx_orders_order_number on public.orders(order_number);

-- Enable RLS
alter table public.orders enable row level security;

-- Policy: Authenticated users (admin) can read all orders
create policy "Admin read all orders" 
  on public.orders for select 
  using ( auth.role() = 'authenticated' );

-- Policy: Anyone can insert orders (public checkout)
create policy "Public can create orders" 
  on public.orders for insert 
  with check ( true );

-- Policy: Authenticated users can update orders
create policy "Admin can update orders" 
  on public.orders for update 
  using ( auth.role() = 'authenticated' )
  with check ( auth.role() = 'authenticated' );

-- Policy: Authenticated users can delete orders
create policy "Admin can delete orders" 
  on public.orders for delete 
  using ( auth.role() = 'authenticated' );

-- Function to generate order number
create or replace function generate_order_number()
returns text as $$
declare
  new_number text;
  counter int;
begin
  select count(*) + 1 into counter
  from public.orders
  where date(created_at) = current_date;
  
  new_number := 'ORD-' || to_char(current_date, 'YYYYMMDD') || '-' || lpad(counter::text, 4, '0');
  return new_number;
end;
$$ language plpgsql;

-- Trigger to auto-generate order number if not provided
create or replace function set_order_number()
returns trigger as $$
begin
  if NEW.order_number is null or NEW.order_number = '' then
    NEW.order_number := generate_order_number();
  end if;
  return NEW;
end;
$$ language plpgsql;

create trigger trigger_set_order_number
  before insert on public.orders
  for each row
  execute function set_order_number();

-- Trigger to update updated_at timestamp
create or replace function update_updated_at_column()
returns trigger as $$
begin
  NEW.updated_at = now();
  return NEW;
end;
$$ language plpgsql;

create trigger trigger_update_orders_updated_at
  before update on public.orders
  for each row
  execute function update_updated_at_column();
```

---

## Steps to Run:

1. **Open Supabase Dashboard:**
   - Go to: https://app.supabase.com
   - Select your project

2. **Open SQL Editor:**
   - Click **SQL Editor** in the left sidebar
   - Click **New Query**

3. **Paste the Code:**
   - Copy ALL the SQL code above
   - Paste it into the SQL editor

4. **Run the Code:**
   - Click the **Run** button (or press Ctrl+Enter / Cmd+Enter)
   - Wait for completion

5. **Verify Success:**
   - You should see: "Success. No rows returned"
   - Go to **Table Editor** → You should see a new **orders** table

6. **Check the Table:**
   - Click on the **orders** table
   - You should see columns: id, order_number, customer_name, customer_mobile, etc.

---

## What This Creates:

✅ **orders** table with all necessary columns
✅ Indexes for fast queries
✅ Row Level Security (RLS) policies
✅ Auto-generate order numbers (format: ORD-20251002-0001)
✅ Auto-update timestamps
✅ Functions and triggers

---

## After Running SQL:

1. Refresh your admin dashboard at: http://localhost:3000/admin/
2. You should now see the **Orders** button in the navigation 🛒
3. Test by placing an order from the website
4. Check the admin panel to see the order

---

## Troubleshooting:

**Error: "relation already exists"**
- This is okay! It means the table is already created

**Error: "permission denied"**
- Make sure you're using the correct project
- Check that you have admin access

**Orders button still not showing:**
- Clear browser cache
- Hard refresh (Ctrl+Shift+R or Cmd+Shift+R)
- Check that server is running

---

**Done! Your orders system is ready to use! 🎉**
