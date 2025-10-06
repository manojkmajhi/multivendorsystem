# Product Variant System - Quick Reference

## 🚀 Quick Start (5 Minutes)

### 1. Run SQL (1 min)
```sql
-- Execute in Supabase SQL Editor
-- File: SUPABASE_VARIANT_SCHEMA.sql
```

### 2. Test with Sample Product (2 min)
```javascript
// Create product with variants via admin panel
Product: "Premium T-Shirt"
✓ Check "This product has variants"
Select: Size (S, M, L), Color (Black, White)
Generate: 6 variants automatically
```

### 3. View on Frontend (2 min)
```
Visit: /details/{product-id}
See: Dropdown selectors for Size & Color
Test: Select options → Price updates → Add to cart
```

---

## 📊 Data Model Cheat Sheet

```
products
├── has_variants (boolean)
├── base_sku (text)
└── stock (integer) - only for simple products

attributes (Size, Color, Material)
├── name
├── slug
└── type (select, color, text)

attribute_values (Small, Medium, Large)
├── attribute_id
└── value

variants
├── product_id
├── sku
├── price_adjustment (+/- from base price)
├── stock
├── image (optional)
└── attribute_combination (JSON: {size: "M", color: "Black"})
```

---

## 🎯 Key Concepts

### Simple Product
```json
{
  "has_variants": false,
  "price": 29.99,
  "stock": 100,
  "sku": "PROD-001"
}
```

### Product with Variants
```json
{
  "has_variants": true,
  "price": 29.99,  // Base price
  "variants": [
    {
      "sku": "TSH-M-BLK",
      "attribute_combination": {"size": "M", "color": "Black"},
      "price_adjustment": 0,
      "stock": 50
    },
    {
      "sku": "TSH-XL-BLK",
      "attribute_combination": {"size": "XL", "color": "Black"},
      "price_adjustment": 5,  // XL costs +$5
      "stock": 20
    }
  ]
}
```

---

## 🛠️ Admin Panel Workflow

### Creating Product with Variants

1. **Basic Info**
   - Name, Category, Description, Base Price

2. **Toggle Variants**
   - ✓ Check "This product has variants"

3. **Select Attributes**
   - Click attribute chips (Size, Color, etc.)

4. **Choose Values**
   - Select which values apply (S, M, L)

5. **Generate Variants**
   - Click "Generate Variants" button
   - All combinations created automatically

6. **Customize Each Variant**
   - Set SKU, Price Adjustment, Stock, Image
   - Example: XL = +$5, Stock = 20

7. **Save Product**

---

## 💻 Frontend Integration

### Product Page

```html
<!-- Container for variant selector -->
<div id="variantSelector"></div>

<!-- Initialize -->
<script src="/staticfiles/variant-selector.js"></script>
<script>
  const productData = <%- JSON.stringify(product) %>;
  initVariantSelector(productData);
</script>
```

### Quickview Modal

```html
<script src="/staticfiles/variant-quickview.js"></script>
<script>
  openQuickviewWithVariants(productData);
</script>
```

---

## 🛒 Cart Integration

### Add to Cart with Variant

```javascript
// Simple product
addToCart(productId, qty, showMessage, null);

// Product with variant
addToCart(productId, qty, showMessage, variantId);
```

### Cart Item Structure

```javascript
{
  productId: "uuid",
  variantId: "uuid or null",
  qty: 2,
  // Resolved on server:
  name: "T-Shirt",
  variant_label: "Size: M, Color: Black",
  price: 34.99  // base + adjustment
}
```

---

## 🔍 Search & Filter

### Search Variants

```javascript
// Search by attribute values
SELECT * FROM variants 
WHERE attribute_combination @> '{"color": "Black"}';

// Search products with specific variant
SELECT DISTINCT p.* 
FROM products p
JOIN variants v ON v.product_id = p.id
WHERE v.attribute_combination->>'size' = 'Large';
```

---

## 📦 Order Processing

### Order Item with Variant

```json
{
  "product_id": "uuid",
  "variant_id": "uuid",
  "name": "Premium T-Shirt",
  "variant_label": "Size: M, Color: Black",
  "sku": "TSH-M-BLK",
  "price": 29.99,
  "qty": 2,
  "subtotal": 59.98
}
```

---

## 🎨 Styling Variants

### Variant Selector CSS

```css
.variant-selector { margin: 1.5rem 0; }
.variant-label { font-weight: 600; font-size: 14px; }
.variant-select { 
  width: 100%; 
  padding: 0.5rem; 
  border: 1px solid #ddd; 
}
.variant-info { 
  background: #f8f9fa; 
  padding: 1rem; 
  border-radius: 4px; 
}
```

---

## 🔧 Common Tasks

### Add New Attribute

```sql
INSERT INTO attributes (name, slug, type) 
VALUES ('Material', 'material', 'select');

INSERT INTO attribute_values (attribute_id, value) 
VALUES 
  ('attr-uuid', 'Cotton'),
  ('attr-uuid', 'Polyester');
```

### Update Variant Stock

```sql
UPDATE variants 
SET stock = stock - 1 
WHERE id = 'variant-uuid';
```

### Get Low Stock Variants

```sql
SELECT v.*, p.name 
FROM variants v
JOIN products p ON p.id = v.product_id
WHERE v.stock < 10
ORDER BY v.stock ASC;
```

### Bulk Price Adjustment

```sql
-- Add $2 to all XL variants
UPDATE variants 
SET price_adjustment = price_adjustment + 2
WHERE attribute_combination->>'size' = 'X-Large';
```

---

## 🐛 Debugging

### Check Product Has Variants

```sql
SELECT id, name, has_variants 
FROM products 
WHERE id = 'product-uuid';
```

### List All Variants for Product

```sql
SELECT * FROM variants 
WHERE product_id = 'product-uuid';
```

### Verify Attribute Combination

```javascript
// In browser console
console.log(variantSelector.currentVariant);
console.log(variantSelector.selectedOptions);
```

---

## 📈 Performance Tips

1. **Index Variants**
   ```sql
   CREATE INDEX idx_variants_combination 
   ON variants USING GIN (attribute_combination);
   ```

2. **Cache Product Data**
   ```javascript
   // Cache products with variants in memory
   const productCache = new Map();
   ```

3. **Lazy Load Variants**
   ```javascript
   // Only fetch variants when product page loads
   if (product.has_variants) {
     fetchVariants(product.id);
   }
   ```

---

## 🎯 Best Practices

✅ **DO:**
- Use meaningful SKUs (TSH-M-BLK)
- Set realistic stock levels
- Add variant images when possible
- Test all combinations
- Keep attribute names consistent

❌ **DON'T:**
- Create too many attributes (max 3-4)
- Leave stock at 0 for active variants
- Forget to set price adjustments
- Mix simple and variant products in same category

---

## 📚 File Reference

| File | Purpose |
|------|---------|
| `SUPABASE_VARIANT_SCHEMA.sql` | Database setup |
| `product-form-variants.ejs` | Admin form |
| `variant-selector.js` | Frontend logic |
| `variant-quickview.js` | Modal support |
| `product-details-with-variants.ejs` | Product page |

---

## 🆘 Quick Fixes

### Variants Not Showing
```sql
UPDATE products SET has_variants = true WHERE id = 'uuid';
UPDATE variants SET active = true WHERE product_id = 'uuid';
```

### Price Not Updating
```javascript
// Check in browser console
console.log(parseFloat(basePrice) + parseFloat(adjustment));
```

### Can't Add to Cart
```javascript
// Ensure variant is selected
if (!variantSelector.currentVariant) {
  alert('Please select all options');
}
```

---

## 🎓 Learning Path

1. ✅ Create simple product (no variants)
2. ✅ Create product with 1 attribute (Size only)
3. ✅ Create product with 2 attributes (Size + Color)
4. ✅ Test variant selection on frontend
5. ✅ Add variant product to cart
6. ✅ Complete order with variants
7. ✅ Customize variant images
8. ✅ Implement bulk operations

---

**Need Help?** See `VARIANT_IMPLEMENTATION_GUIDE.md` for detailed steps.
