# Variant System Flow Diagram

## Create Product Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    ADMIN PRODUCT FORM                        │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  1. User checks "This product has variants"                 │
│     ├─ Shows variant section                                │
│     └─ Hides simple stock/SKU fields                        │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  2. User selects attributes (Size, Color, etc.)             │
│     ├─ Clicks attribute buttons                             │
│     ├─ Buttons become active (blue)                         │
│     └─ Attribute config section appears                     │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  3. User adds values for each attribute                     │
│     ├─ Size: XS, S, M, L, XL, XXL                          │
│     ├─ Color: Black, White, Red                            │
│     └─ Values appear as chips/badges                        │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  4. User clicks "⚡ Generate All Combinations"              │
│     ├─ JavaScript calculates cartesian product             │
│     ├─ Creates variant for each combination                │
│     └─ Generates unique SKUs with timestamp                │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  5. Variant list appears                                    │
│     ├─ Each variant shows: SKU, Price, Stock, Image        │
│     ├─ User can edit values                                │
│     └─ Example: "size: Small, color: Black"                │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  6. User clicks "Create Product"                            │
│     ├─ Form submits with product data                      │
│     └─ Includes variants array                             │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    SERVER (server.js)                        │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  7. Parse form data                                         │
│     ├─ Extract product fields                              │
│     ├─ Extract variants array                              │
│     └─ Convert object to array if needed                   │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  8. Insert product into database                            │
│     ├─ INSERT INTO products (...)                          │
│     ├─ Set has_variants = true                             │
│     └─ Get product.id from response                        │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  9. Process variants                                        │
│     ├─ Loop through variant array                          │
│     ├─ Build variant payload for each                      │
│     │   ├─ product_id: product.id                          │
│     │   ├─ sku: v.sku.trim()                               │
│     │   ├─ price_adjustment: parseFloat(v.price_adj)       │
│     │   ├─ stock: parseInt(v.stock)                        │
│     │   └─ attribute_combination: JSON object              │
│     └─ Collect all in variantsToInsert array               │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  10. Batch insert variants                                  │
│      ├─ INSERT INTO variants (...) VALUES (...)            │
│      ├─ Single query for all variants                      │
│      ├─ Returns inserted data                              │
│      └─ Throws error if fails                              │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  11. Success!                                               │
│      ├─ Log: "✓ Variants inserted: X"                      │
│      ├─ Redirect to products list                          │
│      └─ Show success message                               │
└─────────────────────────────────────────────────────────────┘
```

## Update Product Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    EDIT PRODUCT PAGE                         │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  1. Load existing product data                              │
│     ├─ Fetch product from database                         │
│     ├─ Fetch existing variants                             │
│     └─ Populate form fields                                │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  2. Auto-load existing variants (JavaScript)                │
│     ├─ Parse variant data from server                      │
│     ├─ Extract unique attributes                           │
│     ├─ Click attribute buttons automatically               │
│     ├─ Populate attribute values                           │
│     └─ Generate variant list                               │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  3. User modifies variants                                  │
│     ├─ Change stock values                                 │
│     ├─ Adjust prices                                       │
│     ├─ Add/remove attribute values                         │
│     └─ Regenerate if needed                                │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  4. User clicks "Update Product"                            │
│     └─ Form submits with updated data                      │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    SERVER (server.js)                        │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  5. Update product in database                              │
│     ├─ UPDATE products SET ... WHERE id = ?                │
│     └─ Update has_variants flag                            │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  6. Delete old variants                                     │
│     ├─ DELETE FROM variants WHERE product_id = ?           │
│     ├─ Check for errors                                    │
│     └─ Log: "✓ Old variants deleted"                       │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  7. Process new variants                                    │
│     ├─ Same as create flow (steps 9-10)                    │
│     └─ Build and batch insert                              │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  8. Success!                                                │
│     ├─ Log: "✓ Variants inserted: X"                       │
│     ├─ Redirect to products list                           │
│     └─ Show success message                                │
└─────────────────────────────────────────────────────────────┘
```

## SKU Generation Flow

```
┌─────────────────────────────────────────────────────────────┐
│  Generate Unique SKU                                        │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  1. Get current timestamp                                   │
│     └─ timestamp = Date.now()                              │
│        Example: 1704123456789                              │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  2. Extract attribute abbreviations                         │
│     ├─ For each attribute in combination:                  │
│     │   └─ Take first 3 chars, uppercase                   │
│     ├─ Example: "Small" → "SMA"                            │
│     ├─ Example: "Black" → "BLA"                            │
│     └─ Join with hyphens                                   │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  3. Add index number                                        │
│     └─ idx + 1 (1-based indexing)                          │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  4. Combine into final SKU                                  │
│     └─ Format: VAR-{timestamp}-{attrs}-{idx}               │
│        Example: VAR-1704123456789-SMA-BLA-1                │
└─────────────────────────────────────────────────────────────┘
```

## Error Handling Flow

```
┌─────────────────────────────────────────────────────────────┐
│  Variant Insert Attempt                                     │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
                    ┌───────┴───────┐
                    │               │
                    ▼               ▼
            ┌───────────┐   ┌───────────┐
            │  Success  │   │   Error   │
            └───────────┘   └───────────┘
                    │               │
                    │               ▼
                    │   ┌─────────────────────────────┐
                    │   │  Log error details          │
                    │   │  ├─ Error message           │
                    │   │  ├─ Error code              │
                    │   │  └─ Affected SKUs           │
                    │   └─────────────────────────────┘
                    │               │
                    │               ▼
                    │   ┌─────────────────────────────┐
                    │   │  Throw error                │
                    │   │  └─ Stops execution         │
                    │   └─────────────────────────────┘
                    │               │
                    │               ▼
                    │   ┌─────────────────────────────┐
                    │   │  Catch in route handler     │
                    │   │  └─ Show error to user      │
                    │   └─────────────────────────────┘
                    │               │
                    ▼               ▼
            ┌───────────────────────────┐
            │  User sees result         │
            │  ├─ Success: Redirect     │
            │  └─ Error: Error page     │
            └───────────────────────────┘
```

## Data Structure

### Product Object
```javascript
{
  id: "uuid",
  name: "Test Pillow",
  price: 450,
  category: "Anime",
  type: "Pillow",
  has_variants: true,
  base_sku: null,
  stock: 0  // Always 0 when has_variants = true
}
```

### Variant Object
```javascript
{
  id: "uuid",
  product_id: "product-uuid",
  sku: "VAR-1704123456789-SMA-BLA-1",
  price_adjustment: 0,
  stock: 10,
  image: null,
  active: true,
  attribute_combination: {
    "size": "Small",
    "color": "Black"
  },
  created_at: "2024-01-01T12:00:00Z"
}
```

### Form Submission Data
```javascript
{
  name: "Test Pillow",
  price: "450",
  has_variants: "on",
  variants: {
    "0": {
      sku: "VAR-1704123456789-SMA-BLA-1",
      combination: '{"size":"Small","color":"Black"}',
      price_adjustment: "0",
      stock: "10",
      image: ""
    },
    "1": {
      sku: "VAR-1704123456789-MED-WHI-2",
      combination: '{"size":"Medium","color":"White"}',
      price_adjustment: "0",
      stock: "10",
      image: ""
    }
  }
}
```

## Database Schema

```
┌─────────────────────────────────────────────────────────────┐
│                        products                              │
├─────────────────────────────────────────────────────────────┤
│ id (UUID, PK)                                               │
│ name (TEXT)                                                 │
│ price (DECIMAL)                                             │
│ has_variants (BOOLEAN) ← Controls variant system            │
│ base_sku (TEXT)        ← Only for simple products          │
│ stock (INTEGER)        ← Only for simple products          │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ 1:N
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                        variants                              │
├─────────────────────────────────────────────────────────────┤
│ id (UUID, PK)                                               │
│ product_id (UUID, FK) → products.id                         │
│ sku (TEXT, UNIQUE) ← Must be unique across all variants    │
│ price_adjustment (DECIMAL)                                  │
│ stock (INTEGER)                                             │
│ image (TEXT)                                                │
│ active (BOOLEAN)                                            │
│ attribute_combination (JSONB) ← {"size":"S","color":"Red"}  │
│ created_at (TIMESTAMPTZ)                                    │
└─────────────────────────────────────────────────────────────┘
```

## Key Points

1. **Unique SKUs**: Timestamp ensures uniqueness across products and updates
2. **Batch Insert**: All variants inserted in single query for performance
3. **Error Handling**: Errors thrown immediately, not silently logged
4. **Delete-Then-Insert**: Old variants deleted before inserting new ones
5. **Validation**: SKU field is required, values are trimmed
6. **Logging**: Comprehensive logging at each step for debugging
