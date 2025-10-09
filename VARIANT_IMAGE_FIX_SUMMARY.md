# Variant Image Fix - Quick Summary

## What Was Done

Added debug logging to trace variant image issues in cart popup and checkout.

## Files Modified

1. **server.js** - Added logging to variant fetch in `/get_cart/` endpoint
2. **cart-optimized.js** - Added logging to cart rendering

## How to Debug

### Step 1: Check Database
Run `CHECK_VARIANT_IMAGES.sql` in Supabase SQL Editor to verify variants have images.

### Step 2: Test Add to Cart
1. Open product quick view
2. Select variant options
3. Click "Add to Cart"
4. **Check server console** for:
   ```
   🛒 ADD_TO_CART request { productid: '...', qty: '1', variantid: '...' }
   ```

### Step 3: Test Cart Popup
1. Click cart icon to open popup
2. **Check server console** for:
   ```
   Variant found: { id: '...', image: '/media/...', price_adj: 0 }
   ```
3. **Check browser console** for:
   ```
   Cart item: { id: '...', name: '...', image: '/media/...', variantId: '...' }
   ```

## Common Issues

### Issue 1: Variant Image is NULL
**Symptom**: Server logs show `image: null`

**Fix**: Set variant images in admin panel or run:
```sql
UPDATE variants v
SET image = p.image
FROM products p
WHERE v.product_id = p.id
AND (v.image IS NULL OR v.image = '');
```

### Issue 2: Variant ID Not Passed
**Symptom**: `variantid: undefined` in server logs

**Fix**: Already fixed in code - quick view now passes variant ID

### Issue 3: Old Cart Items
**Symptom**: Cart items added before fix don't have variant IDs

**Fix**: Clear cart by running in browser console:
```javascript
document.cookie = 'device=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
location.reload();
```

## Testing Steps

1. ✅ Run `CHECK_VARIANT_IMAGES.sql` to verify variant images exist
2. ✅ Clear cart (delete device cookie)
3. ✅ Add variant product to cart from quick view
4. ✅ Check server console for variant ID
5. ✅ Open cart popup
6. ✅ Check server console for variant image
7. ✅ Check browser console for cart item data
8. ✅ Verify image displays correctly
9. ✅ Go to cart page - verify image
10. ✅ Go to checkout - verify image
11. ✅ Place order - verify variant info saved

## Expected Console Output

### When Adding to Cart:
```
🛒 ADD_TO_CART request { productid: 'abc-123', qty: '1', variantid: 'def-456' }
✓ Product found, adding to cart { productid: 'abc-123', device: '...', productName: 'Shirt', variantid: 'def-456' }
✓ Cart updated { device: '...', itemCount: 1, totalQty: 1 }
```

### When Loading Cart:
```
📋 GET_CART request { device: '...', itemCount: 1 }
Variant found: { id: 'def-456', image: '/media/uploads/shirt-blue.jpg', price_adj: 0 }
✓ Product loaded { id: 'abc-123', name: 'Shirt (Blue / Large)', price: 1450, variantId: 'def-456' }
✓ GET_CART response { mappedCount: 1 }
```

### In Browser Console:
```
Cart item: { 
  id: 'abc-123', 
  name: 'Shirt (Blue / Large)', 
  image: '/media/uploads/shirt-blue.jpg', 
  variantId: 'def-456' 
}
```

## If Still Not Working

1. Check `VARIANT_IMAGE_DEBUG.md` for detailed troubleshooting
2. Verify variant images exist in database
3. Verify image files exist in `strawhats/media/uploads/`
4. Check browser Network tab for 404 errors
5. Verify RLS policies allow public read on variants table

## Quick Fix SQL

If variants don't have images, run this to copy from product:

```sql
-- Copy product image to all variants that don't have one
UPDATE variants v
SET image = p.image
FROM products p
WHERE v.product_id = p.id
AND (v.image IS NULL OR v.image = '')
AND p.image IS NOT NULL
AND p.image != '';

-- Verify the update
SELECT 
  COUNT(*) FILTER (WHERE image IS NOT NULL AND image != '') as with_image,
  COUNT(*) FILTER (WHERE image IS NULL OR image = '') as without_image
FROM variants
WHERE active = true;
```

## Success Criteria

✅ Server logs show variant ID when adding to cart
✅ Server logs show variant image when loading cart  
✅ Browser console shows correct image path
✅ Cart popup displays variant image
✅ Cart page displays variant image
✅ Checkout displays variant image
✅ Admin orders show variant info
✅ No console errors
✅ No 404 errors in Network tab

## Next Steps

1. Run the SQL checks
2. Test with a fresh cart (clear device cookie)
3. Check all console logs
4. Verify images display correctly
5. Test complete flow: quick view → cart → checkout → order

## Support Files

- `VARIANT_IMAGE_DEBUG.md` - Detailed debugging guide
- `CHECK_VARIANT_IMAGES.sql` - SQL queries to check/fix images
- Server console - Real-time debugging
- Browser console - Frontend debugging
