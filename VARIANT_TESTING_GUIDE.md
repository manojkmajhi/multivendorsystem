# Variant System Testing Guide

## Quick Test Checklist

### ✅ Test 1: Create Product with Variants

1. Navigate to `http://localhost:3000/admin/products`
2. Click "New Product"
3. Fill in basic details:
   - Name: "Test Pillow"
   - Price: 450
   - Category: Select any
   - Type: "Pillow"
4. Check "This product has variants"
5. Click "📏 Size" button
6. Select "Clothing" from dropdown
7. Click "⚡ Generate All Combinations"
8. Verify 6 variants appear (XS, S, M, L, XL, XXL)
9. Click "Create Product"
10. **Expected**: Success message, redirected to products list
11. **Verify**: Click edit on the product, variants should be loaded

### ✅ Test 2: Edit Product Variants

1. Go to product edit page
2. Modify stock values for some variants
3. Click "Update Product"
4. **Expected**: Success message
5. **Verify**: Refresh page, changes should persist

### ✅ Test 3: Multiple Attributes

1. Create new product with variants
2. Select both "📏 Size" and "🎨 Color"
3. For Size: Select "Clothing"
4. For Color: Add "Black", "White", "Red"
5. Click "Generate All Combinations"
6. **Expected**: 18 variants (6 sizes × 3 colors)
7. Save product
8. **Verify**: All 18 variants saved

### ✅ Test 4: SKU Uniqueness

1. Create product with variants
2. Note the SKU format (e.g., `VAR-1704123456789-SMA-1`)
3. Edit the same product
4. Regenerate variants
5. **Expected**: New SKUs generated with different timestamp
6. **Verify**: No duplicate SKU errors

### ✅ Test 5: Variant Display on Frontend

1. Create product with variants
2. Visit product details page: `http://localhost:3000/details/PRODUCT_ID/`
3. **Expected**: Variant selector appears
4. Select different variants
5. **Expected**: Price updates, stock shows correctly

## Common Issues & Solutions

### Issue 1: Variants Not Saving

**Symptoms**: Form submits successfully but variants don't appear when editing

**Check**:
```bash
# Check server logs
npm run dev
# Look for these messages:
# ✓ Variants inserted: X
# ❌ Variant insert error: ...
```

**Solutions**:
1. Verify Supabase connection in `.env`
2. Check RLS policies allow service role writes
3. Run diagnostic queries from `DIAGNOSE_VARIANTS.sql`

### Issue 2: Duplicate SKU Error

**Symptoms**: Error message about duplicate SKU

**Solution**:
1. The fix generates unique SKUs with timestamps
2. If still occurring, manually edit SKUs to be unique
3. Check for orphaned variants: Run query #8 from `DIAGNOSE_VARIANTS.sql`

### Issue 3: Variants Not Loading on Edit

**Symptoms**: Edit page doesn't show existing variants

**Check**:
```sql
-- Run in Supabase SQL editor
SELECT * FROM variants WHERE product_id = 'YOUR_PRODUCT_ID';
```

**Solutions**:
1. Verify `has_variants` is true on product
2. Check variants exist in database
3. Verify RLS policies allow reading variants

### Issue 4: Form Doesn't Submit

**Symptoms**: Clicking submit does nothing

**Check**:
- Browser console for JavaScript errors
- Network tab for failed requests

**Solutions**:
1. Clear browser cache
2. Check for JavaScript errors in console
3. Verify form has required fields filled

## Browser Console Debugging

Open browser console (F12) and look for these messages:

### Success Messages
```
Variant system loaded
Binding attribute buttons
Found buttons: 5
✓ Variants inserted: 6
```

### Error Messages
```
❌ Variant insert error: duplicate key value violates unique constraint
❌ Error deleting old variants: ...
```

## Server Log Debugging

Watch server logs while testing:

```bash
npm run dev
```

### Success Logs
```
📝 Creating new product...
Processing variants...
Variant array length: 6
Preparing variant: { product_id: '...', sku: 'VAR-...', ... }
Inserting 6 variants
✓ Variants inserted: 6
```

### Error Logs
```
❌ Variant insert error: { message: '...', code: '...' }
💥 SUPABASE_PRODUCT_LOOKUP_EXCEPTION
```

## Database Verification

### Check Variant Count
```sql
SELECT 
  p.name,
  COUNT(v.id) as variant_count
FROM products p
LEFT JOIN variants v ON p.id = v.product_id
WHERE p.has_variants = true
GROUP BY p.id, p.name;
```

### View Variant Details
```sql
SELECT 
  p.name as product,
  v.sku,
  v.attribute_combination,
  v.stock,
  v.price_adjustment
FROM variants v
JOIN products p ON v.product_id = p.id
ORDER BY p.name, v.sku;
```

### Check for Issues
```sql
-- Duplicate SKUs
SELECT sku, COUNT(*) 
FROM variants 
GROUP BY sku 
HAVING COUNT(*) > 1;

-- Orphaned variants
SELECT v.* 
FROM variants v 
LEFT JOIN products p ON v.product_id = p.id 
WHERE p.id IS NULL;

-- Products with variants flag but no variants
SELECT p.* 
FROM products p 
LEFT JOIN variants v ON p.id = v.product_id 
WHERE p.has_variants = true 
  AND v.id IS NULL;
```

## API Testing

### Test Variant Fetch
```bash
curl http://localhost:3000/api/product-variants/PRODUCT_ID
```

**Expected Response**:
```json
{
  "variants": [
    {
      "id": "...",
      "sku": "VAR-...",
      "attribute_combination": {"size": "Small"},
      "stock": 10,
      "price_adjustment": 0
    }
  ],
  "attributes": [
    {
      "name": "Size",
      "slug": "size",
      "values": [{"value": "Small"}, {"value": "Medium"}]
    }
  ]
}
```

## Performance Testing

### Test Large Variant Sets

1. Create product with 3 attributes
2. Add 5 values each (5 × 5 × 5 = 125 variants)
3. Generate combinations
4. **Expected**: Page should handle smoothly
5. Save product
6. **Expected**: Should save within 5 seconds

### Stress Test

1. Create 10 products with variants
2. Edit each multiple times
3. **Expected**: No SKU conflicts
4. **Expected**: No performance degradation

## Rollback Plan

If issues persist after the fix:

1. **Backup current state**:
   ```sql
   -- Export variants
   COPY (SELECT * FROM variants) TO '/tmp/variants_backup.csv' CSV HEADER;
   ```

2. **Revert code changes**:
   ```bash
   git checkout HEAD~1 server.js views/admin/product-form.ejs
   ```

3. **Clear problematic variants**:
   ```sql
   DELETE FROM variants WHERE created_at > '2024-01-XX';
   ```

4. **Restore from backup** (if needed):
   ```sql
   COPY variants FROM '/tmp/variants_backup.csv' CSV HEADER;
   ```

## Success Criteria

✅ All tests pass
✅ No console errors
✅ No server errors
✅ Variants persist after save
✅ Variants load correctly on edit
✅ No duplicate SKU errors
✅ Frontend displays variants correctly
✅ Stock and price adjustments work

## Next Steps After Testing

1. Test on staging environment
2. Monitor production logs for errors
3. Set up alerts for variant save failures
4. Document any edge cases discovered
5. Consider adding automated tests

## Support

If you encounter issues not covered here:

1. Check `VARIANT_SAVE_FIX.md` for detailed explanation
2. Run queries from `DIAGNOSE_VARIANTS.sql`
3. Check server logs for detailed error messages
4. Verify Supabase dashboard for RLS policy issues
5. Test with a fresh product to isolate the issue
