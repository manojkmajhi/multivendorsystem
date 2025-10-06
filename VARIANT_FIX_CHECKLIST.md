# Variant Fix Verification Checklist

Use this checklist to verify the variant system is working correctly after applying the fix.

## ✅ Pre-Flight Checks

- [ ] Server is running (`npm run dev`)
- [ ] No errors in server startup logs
- [ ] Supabase connection confirmed (check `__debug_env` endpoint)
- [ ] `.env` file has `SUPABASE_SERVICE_ROLE_KEY`
- [ ] Browser console is open (F12) for debugging

## ✅ Test 1: Create Simple Product (No Variants)

- [ ] Navigate to `/admin/products`
- [ ] Click "New Product"
- [ ] Fill in: Name, Price, Category
- [ ] Leave "This product has variants" UNCHECKED
- [ ] Fill in SKU and Stock
- [ ] Click "Create Product"
- [ ] **Expected**: Product created successfully
- [ ] **Verify**: Product appears in list
- [ ] **Verify**: Edit page shows SKU and Stock fields

## ✅ Test 2: Create Product with Single Attribute

- [ ] Navigate to `/admin/products`
- [ ] Click "New Product"
- [ ] Fill in: Name, Price, Category
- [ ] Check "This product has variants"
- [ ] Click "📏 Size" button
- [ ] Button turns blue (active)
- [ ] Select "Clothing" from dropdown
- [ ] 6 size options appear (XS, S, M, L, XL, XXL)
- [ ] Click "⚡ Generate All Combinations"
- [ ] 6 variants appear in list
- [ ] Each variant has unique SKU (format: `VAR-{timestamp}-{size}-{index}`)
- [ ] Click "Create Product"
- [ ] **Expected**: Success message, redirect to products list
- [ ] **Verify**: Edit product, variants are loaded
- [ ] **Verify**: SKUs are unique and contain timestamp

## ✅ Test 3: Create Product with Multiple Attributes

- [ ] Navigate to `/admin/products`
- [ ] Click "New Product"
- [ ] Fill in: Name, Price, Category
- [ ] Check "This product has variants"
- [ ] Click "📏 Size" button
- [ ] Select "Clothing" (6 sizes)
- [ ] Click "🎨 Color" button
- [ ] Add colors: "Black", "White", "Red"
- [ ] Click "⚡ Generate All Combinations"
- [ ] **Expected**: 18 variants (6 sizes × 3 colors)
- [ ] Each variant shows combination (e.g., "size: Small, color: Black")
- [ ] Each variant has unique SKU
- [ ] Click "Create Product"
- [ ] **Expected**: Success message
- [ ] **Verify**: Edit product, all 18 variants loaded
- [ ] **Verify**: Database query shows 18 variants

## ✅ Test 4: Edit Product and Update Variants

- [ ] Open product with variants in edit mode
- [ ] Variants are loaded automatically
- [ ] Attribute buttons are active
- [ ] Variant list shows existing data
- [ ] Modify stock value for first variant
- [ ] Modify price adjustment for second variant
- [ ] Click "Update Product"
- [ ] **Expected**: Success message
- [ ] **Verify**: Refresh page, changes persist
- [ ] **Verify**: Database shows updated values

## ✅ Test 5: Regenerate Variants

- [ ] Open product with variants in edit mode
- [ ] Add a new color value
- [ ] Click "⚡ Generate All Combinations"
- [ ] **Expected**: More variants appear
- [ ] **Expected**: New SKUs generated (different timestamp)
- [ ] Click "Update Product"
- [ ] **Expected**: Success message
- [ ] **Verify**: Old variants deleted, new ones saved
- [ ] **Verify**: No duplicate SKU errors

## ✅ Test 6: Disable Variants

- [ ] Open product with variants in edit mode
- [ ] Uncheck "This product has variants"
- [ ] Variant section disappears
- [ ] Simple SKU and Stock fields appear
- [ ] Fill in SKU and Stock
- [ ] Click "Update Product"
- [ ] **Expected**: Success message
- [ ] **Verify**: Database shows no variants for product
- [ ] **Verify**: Product has `has_variants = false`

## ✅ Test 7: Frontend Display

- [ ] Create product with variants
- [ ] Note the product ID
- [ ] Visit `/details/{PRODUCT_ID}/`
- [ ] **Expected**: Variant selector appears
- [ ] Select different size
- [ ] **Expected**: Price updates if adjustment exists
- [ ] **Expected**: Stock shows correctly
- [ ] Select different color
- [ ] **Expected**: Combination updates
- [ ] Add to cart
- [ ] **Expected**: Correct variant added

## ✅ Test 8: Large Variant Set

- [ ] Create product with 3 attributes
- [ ] Size: 5 values
- [ ] Color: 4 values
- [ ] Material: 3 values
- [ ] Click "Generate All Combinations"
- [ ] **Expected**: 60 variants (5 × 4 × 3)
- [ ] Page handles smoothly (no freeze)
- [ ] Click "Create Product"
- [ ] **Expected**: Saves within 5 seconds
- [ ] **Verify**: All 60 variants in database

## ✅ Test 9: Error Handling

- [ ] Create product with variants
- [ ] Manually edit SKU to duplicate existing SKU
- [ ] Click "Create Product"
- [ ] **Expected**: Error message shown
- [ ] **Expected**: User can fix and retry
- [ ] Fix SKU to be unique
- [ ] Click "Create Product"
- [ ] **Expected**: Success

## ✅ Test 10: Concurrent Edits

- [ ] Open same product in two browser tabs
- [ ] Edit variants in first tab
- [ ] Save in first tab
- [ ] Edit variants in second tab
- [ ] Save in second tab
- [ ] **Expected**: Second save overwrites first
- [ ] **Verify**: Latest changes persist

## ✅ Database Verification

Run these queries in Supabase SQL editor:

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
- [ ] **Expected**: Count matches generated variants

### Check for Duplicate SKUs
```sql
SELECT sku, COUNT(*) 
FROM variants 
GROUP BY sku 
HAVING COUNT(*) > 1;
```
- [ ] **Expected**: 0 rows (no duplicates)

### Check Variant Structure
```sql
SELECT 
  v.sku,
  v.attribute_combination,
  v.stock,
  v.price_adjustment
FROM variants v
LIMIT 5;
```
- [ ] **Expected**: Valid JSON in attribute_combination
- [ ] **Expected**: Numeric values for stock and price

### Check Orphaned Variants
```sql
SELECT v.* 
FROM variants v 
LEFT JOIN products p ON v.product_id = p.id 
WHERE p.id IS NULL;
```
- [ ] **Expected**: 0 rows (no orphans)

## ✅ Server Log Verification

Check server logs for these messages:

### Success Messages
- [ ] `✓ Supabase client initialized`
- [ ] `📝 Creating new product...`
- [ ] `Processing variants...`
- [ ] `Inserting X variants`
- [ ] `✓ Variants inserted: X`
- [ ] `✓ Old variants deleted`

### No Error Messages
- [ ] No `❌ Variant insert error`
- [ ] No `💥 SUPABASE_PRODUCT_LOOKUP_EXCEPTION`
- [ ] No `duplicate key value violates unique constraint`

## ✅ Browser Console Verification

Check browser console for these messages:

### Success Messages
- [ ] `Variant system loaded`
- [ ] `Binding attribute buttons`
- [ ] `Found buttons: 5`
- [ ] `generateVariants called`

### No Error Messages
- [ ] No JavaScript errors
- [ ] No `Uncaught TypeError`
- [ ] No `Cannot read property`

## ✅ Performance Checks

- [ ] Product with 10 variants saves in < 1 second
- [ ] Product with 50 variants saves in < 2 seconds
- [ ] Product with 100 variants saves in < 5 seconds
- [ ] Edit page loads variants in < 1 second
- [ ] No browser lag when generating variants
- [ ] No server timeout errors

## ✅ Edge Cases

### Empty Variants
- [ ] Check "has variants" but don't generate any
- [ ] Click "Create Product"
- [ ] **Expected**: Product created with no variants

### Special Characters in Values
- [ ] Add color with special chars: "Red & Blue"
- [ ] Generate variants
- [ ] **Expected**: SKU handles special chars correctly

### Very Long Attribute Names
- [ ] Add custom attribute with long name
- [ ] Generate variants
- [ ] **Expected**: SKU truncates to 3 chars

### Decimal Price Adjustments
- [ ] Set price adjustment to 12.50
- [ ] Save product
- [ ] **Expected**: Decimal preserved in database

### Zero Stock
- [ ] Set stock to 0 for a variant
- [ ] Save product
- [ ] **Expected**: 0 stock saved correctly

## ✅ Cleanup

After testing:

- [ ] Delete test products
- [ ] Check database for orphaned variants
- [ ] Clear test data if needed
- [ ] Verify production data unaffected

## 📊 Results Summary

| Test | Status | Notes |
|------|--------|-------|
| Simple Product | ⬜ | |
| Single Attribute | ⬜ | |
| Multiple Attributes | ⬜ | |
| Edit Variants | ⬜ | |
| Regenerate Variants | ⬜ | |
| Disable Variants | ⬜ | |
| Frontend Display | ⬜ | |
| Large Variant Set | ⬜ | |
| Error Handling | ⬜ | |
| Concurrent Edits | ⬜ | |
| Database Checks | ⬜ | |
| Server Logs | ⬜ | |
| Browser Console | ⬜ | |
| Performance | ⬜ | |
| Edge Cases | ⬜ | |

## 🎯 Pass Criteria

- [ ] All tests pass
- [ ] No errors in logs
- [ ] Variants persist after save
- [ ] No duplicate SKU errors
- [ ] Frontend displays correctly
- [ ] Performance acceptable

## 🚨 If Tests Fail

1. **Check Documentation**:
   - `VARIANT_TESTING_GUIDE.md` for detailed steps
   - `VARIANT_SAVE_FIX.md` for technical details

2. **Run Diagnostics**:
   - Execute queries from `DIAGNOSE_VARIANTS.sql`
   - Check server logs for errors
   - Verify Supabase connection

3. **Common Fixes**:
   - Restart server
   - Clear browser cache
   - Check `.env` configuration
   - Verify RLS policies

4. **Get Help**:
   - Review error messages
   - Check database constraints
   - Verify table structure

## ✅ Sign-Off

- [ ] All tests completed
- [ ] All tests passed
- [ ] Documentation reviewed
- [ ] Ready for production

**Tested By**: _______________
**Date**: _______________
**Status**: ⬜ Pass / ⬜ Fail
**Notes**: _______________________________________________
