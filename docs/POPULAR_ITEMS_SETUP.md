# Popular Items Management

## Setup

1. Run migration in Supabase SQL Editor:
```sql
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_popular BOOLEAN DEFAULT false;
CREATE INDEX IF NOT EXISTS idx_products_is_popular ON products(is_popular) WHERE is_popular = true;
```

2. Go to `/admin/popular-items`
3. Click button to mark products as popular
4. Popular products show on home page

That's it!
