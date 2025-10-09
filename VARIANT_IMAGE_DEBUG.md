# Variant Image Debugging Guide

## Issue
Variant images not showing in cart popup and checkout even though variant is selected.

## Debug Steps

### 1. Check if Variant Has Image in Database

Run this SQL in Supabase SQL Editor:

```sql
-- Check all variants and their images
SELECT 
  v.id,
  v.sku,
  v.image,
  v.attribute_combination,
  p.name as product_name
FROM variants v
JOIN products p ON v.product_id = p.id
WHERE v.active = true
ORDER BY p.name;
```

**Expected Result**: Each variant should have an `image` value (URL path)

**If image is NULL**: You need to set variant images in admin panel

### 2. Check Server Logs When Adding to Cart

When you add a variant product to cart, check the server console for:

```
🛒 ADD_TO_CART request { productid: '...', qty: '1', variantid: '...' }
✓ Product found, adding to cart { productid: '...', variantid: '...' }
```

**If variantid is missing**: The quick view is not passing variant ID correctly

### 3. Check Server Logs When Loading Cart

When you open the cart popup, check server console for:

```
📋 GET_CART request { device: '...', itemCount: 1 }
Variant found: { id: '...', image: '/media/...', price_adj: 0 }
✓ Product loaded { id: '...', name: '... (Variant)', price: 1450, variantId: '...' }
```

**If "Variant not found"**: The variant ID in cart doesn't match database
**If image is null**: The variant doesn't have an image set in database

### 4. Check Browser Console

Open browser DevTools Console and look for:

```
Cart item: { id: '...', name: '... (Variant)', image: '/media/...', variantId: '...' }
```

**If image is wrong**: Server is not returning correct image
**If variantId is null**: Cart is not storing variant ID

## Common Issues & Fixes

### Issue 1: Variant Image is NULL in Database

**Symptom**: Server logs show `image: null` for variant

**Fix**: 
1. Go to Admin Panel → Products
2. Edit the product with variants
3. For each variant, set the image URL or upload image
4. Save product

### Issue 2: Variant ID Not Being Passed

**Symptom**: Server logs show `variantid: undefined` when adding to cart

**Fix**: Check that quick view is calling:
```javascript
addToCart(productId, qty, true, variantId);  // ← variantId must be passed
```

### Issue 3: Cart Not Storing Variant ID

**Symptom**: Cart items don't have variantId field

**Fix**: Clear cart and add items again. Old cart items won't have variant IDs.

To clear cart, run in browser console:
```javascript
document.cookie = 'device=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
location.reload();
```

### Issue 4: Variant Image Path is Wrong

**Symptom**: Image path exists but image doesn't load (404 error)

**Fix**: Check that image path starts with `/media/uploads/` and file exists in:
```
e:\allstrawhats\strawhats\media\uploads\
```

## Testing Checklist

- [ ] Variant has image set in database (check SQL query above)
- [ ] Quick view passes variant ID when adding to cart
- [ ] Server logs show variant found with image
- [ ] Browser console shows correct image path
- [ ] Image file exists in uploads folder
- [ ] Cart popup displays variant image
- [ ] Cart page displays variant image
- [ ] Checkout displays variant image
- [ ] Order confirmation shows variant image

## Quick Test

1. **Add variant to cart from quick view**
   - Select variant options
   - Click "Add to Cart"
   - Check server console for variant ID

2. **Open cart popup**
   - Click cart icon
   - Check browser console for cart items
   - Verify image path is correct

3. **Check image in cart**
   - Should show variant-specific image
   - Should show variant label in name

## SQL to Set Variant Images Manually

If you need to set variant images manually:

```sql
-- Update variant image
UPDATE variants
SET image = '/media/uploads/your-variant-image.jpg'
WHERE sku = 'YOUR-VARIANT-SKU';

-- Or update all variants for a product
UPDATE variants v
SET image = '/media/uploads/default-variant.jpg'
FROM products p
WHERE v.product_id = p.id
AND p.name = 'Your Product Name'
AND v.image IS NULL;
```

## Expected Behavior

### When Variant Selected in Quick View:
1. Image switches to variant image
2. Price updates (base + adjustment)
3. Variant ID stored when added to cart

### In Cart Popup:
1. Shows variant-specific image
2. Shows variant label in name: "Product (Option1 / Option2)"
3. Shows correct price with adjustment

### In Cart Page:
1. Same as cart popup
2. Quantity updates work correctly
3. Remove works correctly

### In Checkout:
1. Shows variant image in order summary
2. Shows variant label in product name
3. Correct price in totals

### In Admin Orders:
1. Order items show variant label in name
2. Order items show variant image
3. Variant info saved in order record

## Still Not Working?

If variant images still don't show after checking all above:

1. **Check RLS Policies**: Ensure variants table has public read access
   ```sql
   -- Add this policy if missing
   CREATE POLICY "Public read variants" ON variants FOR SELECT USING (active = true);
   ```

2. **Check Image Permissions**: Ensure uploaded images are readable
   - Check file permissions in uploads folder
   - Try accessing image directly in browser

3. **Clear All Caches**:
   - Clear browser cache
   - Restart server
   - Clear cart (delete device cookie)

4. **Check Network Tab**: 
   - Open DevTools → Network
   - Look for failed image requests
   - Check if image URLs are correct

## Debug Commands

Run these in browser console to debug:

```javascript
// Check cart data
fetch('/get_cart/')
  .then(r => r.json())
  .then(d => console.log('Cart:', d));

// Check variant data for product
fetch('/api/product-variants/YOUR_PRODUCT_ID')
  .then(r => r.json())
  .then(d => console.log('Variants:', d));

// Check current cart items
console.log('Cart items:', document.querySelectorAll('.cart-item, .col-3'));
```

## Success Indicators

✅ Server logs show variant ID when adding to cart
✅ Server logs show variant image when loading cart
✅ Browser console shows correct image path
✅ Cart popup displays variant image
✅ Cart page displays variant image
✅ Checkout displays variant image
✅ No 404 errors for images in Network tab
✅ Admin orders show variant info correctly
