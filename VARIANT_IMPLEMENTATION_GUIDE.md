# Product Variant System - Implementation Guide

## 📋 Overview

This guide covers implementing a flexible product + variant system for your eCommerce template. The system supports both simple products (no variants) and complex products with multiple attributes (size, color, material, etc.).

---

## 🗄️ Step 1: Database Setup

### Execute SQL Schema

Run the SQL file in Supabase SQL Editor:

```bash
File: SUPABASE_VARIANT_SCHEMA.sql
```

This creates:
- `attributes` - Global attribute definitions (Size, Color, etc.)
- `attribute_values` - Possible values for each attribute
- `product_attributes` - Links products to their attributes
- `variants` - Product variants with specific combinations
- Adds `has_variants`, `base_sku`, `stock` columns to `products` table

### Sample Data Included

The schema includes sample attributes:
- Size: Small, Medium, Large, X-Large
- Color: Black, White, Red, Blue
- Material: Cotton, Polyester, Blend

---

## 🎨 Step 2: Admin Panel Integration

### A. Create Attribute Management Routes

Add to `server.js`:

```javascript
// Attribute Management
app.get('/admin/attributes', requireAdmin, async (req, res) => {
  const { data: attributes } = await supabase
    .from('attributes')
    .select('*, attribute_values(*)')
    .order('display_order');
  
  res.render('admin/attributes', { attributes, siteSetting });
});

app.post('/admin/attributes/new', requireAdmin, async (req, res) => {
  const { name, type } = req.body;
  const slug = name.toLowerCase().replace(/\s+/g, '-');
  
  await supabase.from('attributes').insert({ name, slug, type });
  res.redirect('/admin/attributes');
});

app.post('/admin/attributes/:id/values', requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { value } = req.body;
  
  await supabase.from('attribute_values').insert({ attribute_id: id, value });
  res.redirect('/admin/attributes');
});
```

### B. Update Product Routes

Modify product form route to include attributes:

```javascript
app.get('/admin/products/new', requireAdmin, async (req, res) => {
  const { data: categories } = await supabase.from('categories').select('*');
  const { data: attributes } = await supabase
    .from('attributes')
    .select('*, attribute_values(*)')
    .eq('active', true)
    .order('display_order');
  
  // Build attribute values lookup
  const attributeValues = {};
  attributes.forEach(attr => {
    attributeValues[attr.id] = attr.attribute_values;
  });
  
  res.render('admin/product-form-variants', {
    item: null,
    categories,
    attributes,
    attributeValues,
    siteSetting
  });
});

app.post('/admin/products/new', requireAdmin, upload.single('imageFile'), async (req, res) => {
  const { name, price, category, has_variants, base_sku, stock, variants } = req.body;
  
  // Insert product
  const { data: product } = await supabase
    .from('products')
    .insert({
      name,
      price,
      category,
      has_variants: has_variants === 'on',
      base_sku,
      stock: has_variants ? 0 : stock,
      image: req.file ? `/media/uploads/${req.file.filename}` : req.body.image
    })
    .select()
    .single();
  
  // If has variants, insert them
  if (has_variants === 'on' && variants) {
    const variantArray = Array.isArray(variants) ? variants : [variants];
    
    for (const v of variantArray) {
      await supabase.from('variants').insert({
        product_id: product.id,
        sku: v.sku,
        price_adjustment: v.price_adjustment || 0,
        stock: v.stock || 0,
        image: v.image || null,
        attribute_combination: JSON.parse(v.combination)
      });
    }
  }
  
  res.redirect('/admin/products');
});
```

---

## 🎯 Step 3: Frontend Product Display

### A. Update Product Details Route

Modify product details route to fetch variants:

```javascript
app.get('/details/:id', async (req, res) => {
  const { id } = req.params;
  
  const { data: product } = await supabase
    .from('products')
    .select('*')
    .eq('id', id)
    .single();
  
  if (!product) return res.status(404).render('404');
  
  // Fetch variants if product has them
  if (product.has_variants) {
    const { data: variants } = await supabase
      .from('variants')
      .select('*')
      .eq('product_id', id)
      .eq('active', true);
    
    product.variants = variants;
  }
  
  res.render('product-details-with-variants', { product, siteSetting });
});
```

### B. Include Variant Selector Script

In `product-details-with-variants.ejs`, the variant selector is automatically initialized:

```html
<script src="/staticfiles/variant-selector.js"></script>
<script>
  const productData = <%- JSON.stringify(product) %>;
  initVariantSelector(productData);
</script>
```

---

## 🛒 Step 4: Cart Integration

### Update Cart Structure

Modify cart to support variant IDs:

```javascript
// Cart item structure
{
  productId: 'uuid',
  variantId: 'uuid or null',
  qty: 2
}

// When adding to cart
function addToCart(productId, qty, showMessage, variantId = null) {
  const cartItem = {
    productId,
    variantId,
    qty: parseInt(qty)
  };
  
  // Send to server
  fetch('/cart/add', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(cartItem)
  });
}
```

### Server-side Cart Handler

```javascript
app.post('/cart/add', (req, res) => {
  const { productId, variantId, qty } = req.body;
  const deviceId = req.cookies.device_id;
  
  if (!cart[deviceId]) cart[deviceId] = [];
  
  const existing = cart[deviceId].find(
    item => item.productId === productId && item.variantId === variantId
  );
  
  if (existing) {
    existing.qty += qty;
  } else {
    cart[deviceId].push({ productId, variantId, qty });
  }
  
  res.json({ success: true });
});
```

---

## 🔍 Step 5: Search & Filter Enhancement

### Update Search to Include Variants

```javascript
app.get('/search/all', async (req, res) => {
  const { q } = req.query;
  
  // Search products
  const { data: products } = await supabase
    .from('products')
    .select('*, variants(*)')
    .ilike('name', `%${q}%`);
  
  // Also search variant attributes
  const { data: variantMatches } = await supabase
    .from('variants')
    .select('*, products(*)')
    .contains('attribute_combination', { /* search logic */ });
  
  res.render('search-results', { products, query: q });
});
```

---

## 📦 Step 6: Order Processing

### Update Order Schema

Orders should store variant information:

```javascript
{
  order_number: 'ORD-12345',
  items: [
    {
      product_id: 'uuid',
      variant_id: 'uuid',
      name: 'T-Shirt',
      variant_label: 'Size: M, Color: Black',
      price: 29.99,
      qty: 2
    }
  ]
}
```

---

## 🎨 Step 7: Quickview Modal Support

### Include Variant Quickview Script

In your layout or product pages:

```html
<script src="/staticfiles/variant-quickview.js"></script>
```

### Update Quick View Buttons

```javascript
$('.quick-view-btn').on('click', function() {
  const productId = $(this).data('id');
  
  // Fetch full product data with variants
  fetch(`/api/product/${productId}`)
    .then(r => r.json())
    .then(productData => {
      openQuickviewWithVariants(productData);
    });
});
```

---

## 🚀 Step 8: Testing Checklist

- [ ] Create a simple product (no variants)
- [ ] Create a product with Size variants
- [ ] Create a product with Size + Color variants
- [ ] Test variant selection on product page
- [ ] Test variant selection in quickview modal
- [ ] Add variant product to cart
- [ ] Verify cart shows correct variant info
- [ ] Complete checkout with variant products
- [ ] Verify order stores variant data

---

## 📊 Step 9: Admin Dashboard Enhancements

### Variant Stock Overview

```javascript
app.get('/admin/inventory', requireAdmin, async (req, res) => {
  const { data: lowStock } = await supabase
    .from('variants')
    .select('*, products(name)')
    .lt('stock', 10)
    .order('stock');
  
  res.render('admin/inventory', { lowStock });
});
```

---

## 🔧 Step 10: Advanced Features (Optional)

### A. Bulk Variant Generation

Create all combinations automatically:

```javascript
function generateVariantCombinations(attributes) {
  const keys = Object.keys(attributes);
  const combinations = keys.reduce((acc, key) => {
    return acc.flatMap(combo => 
      attributes[key].map(val => ({ ...combo, [key]: val }))
    );
  }, [{}]);
  
  return combinations;
}
```

### B. Variant Images

Allow uploading unique images per variant:

```javascript
app.post('/admin/variants/:id/image', upload.single('image'), async (req, res) => {
  const { id } = req.params;
  const imagePath = `/media/uploads/${req.file.filename}`;
  
  await supabase
    .from('variants')
    .update({ image: imagePath })
    .eq('id', id);
  
  res.json({ success: true, image: imagePath });
});
```

### C. Conditional Pricing

Add price rules based on attributes:

```javascript
// Example: XL sizes cost +$5
if (selectedSize === 'X-Large') {
  priceAdjustment += 5;
}
```

### D. Import/Export

CSV format for bulk variant management:

```csv
product_id,sku,size,color,price_adjustment,stock
uuid-123,TSH-M-BLK,Medium,Black,0,50
uuid-123,TSH-L-BLK,Large,Black,2,30
```

---

## 📝 Notes

- **Fallback**: System gracefully handles products without variants
- **Performance**: Variants are indexed for fast lookups
- **Scalability**: Supports unlimited custom attributes
- **SEO**: Each variant can have unique metadata
- **Analytics**: Track which variants sell best

---

## 🆘 Troubleshooting

### Variants Not Showing
- Check `has_variants` is TRUE in products table
- Verify variants exist in `variants` table
- Ensure `active` is TRUE for variants

### Price Not Updating
- Check `price_adjustment` column in variants
- Verify JavaScript is calculating: `basePrice + adjustment`

### Out of Stock Issues
- Check `stock` column in variants table
- Ensure stock decrements on order

---

## 📚 Files Created

1. `SUPABASE_VARIANT_SCHEMA.sql` - Database schema
2. `views/admin/product-form-variants.ejs` - Admin form with variant builder
3. `strawhats/staticfiles/variant-selector.js` - Frontend variant selection
4. `strawhats/staticfiles/variant-quickview.js` - Quickview modal support
5. `views/product-details-with-variants.ejs` - Product page with variants
6. `VARIANT_SYSTEM_ARCHITECTURE.md` - System architecture docs

---

## ✅ Next Steps

1. Execute `SUPABASE_VARIANT_SCHEMA.sql` in Supabase
2. Replace product form with `product-form-variants.ejs`
3. Update product routes to handle variants
4. Test with sample products
5. Customize styling to match your theme

---

**Questions?** Refer to `VARIANT_SYSTEM_ARCHITECTURE.md` for detailed data model and relationships.
