# 🚀 Quick Start - Order Management Setup

## Step-by-Step Setup Guide

### 1️⃣ Database Setup (REQUIRED)

Open your Supabase Dashboard and run the SQL:

1. Go to: https://app.supabase.com
2. Select your project
3. Click **SQL Editor** in the left sidebar
4. Click **New Query**
5. Copy all contents from `ORDERS_SCHEMA.sql`
6. Paste into the SQL editor
7. Click **Run** (or press Ctrl+Enter)

✅ You should see "Success. No rows returned" - this means the tables, functions, and triggers were created!

---

### 2️⃣ Test the System

#### Test Order Placement (Customer Flow)

1. Start your server:
   ```bash
   node server.js
   ```

2. Open browser: `http://localhost:3000`

3. Add a product to cart

4. Go to cart and click "Proceed to Checkout"

5. Fill in the form:
   - Name: Test Customer
   - Mobile: 9812345678
   - Email: test@example.com (optional)
   - Region: Inside Valley
   - Area: Kathmandu
   - Address: Test Address, Thamel
   - Notes: This is a test order

6. Click "Place Order"

7. You should see:
   - Confetti animation 🎉
   - Success message
   - Redirect to homepage after 6 seconds

#### Test Admin Panel

1. Go to: `http://localhost:3000/admin/`

2. Login with your admin credentials

3. Click **"Orders"** in the navigation (🛒 icon)

4. You should see:
   - Your test order in the table
   - Statistics showing 1 total order, 1 pending
   - Order number like: ORD-20251002-0001

5. Click on the order number to view details

6. Try updating the status:
   - Change from "pending" to "confirmed"
   - Click "Update Status"
   - Modal closes and page refreshes
   - Status badge should now show "confirmed"

---

### 3️⃣ Verify Database

Check that the order was saved:

1. In Supabase Dashboard
2. Go to **Table Editor**
3. Select **orders** table
4. You should see your test order with all details

---

### 4️⃣ Navigation Check

The admin panel should now have:

- 📊 Dashboard
- 🛒 **Orders** (NEW!)
- 📦 Products
- 📁 Categories
- 🖼️ Hero Images
- ⚙️ Settings
- 🚪 Logout

---

## Common Issues & Solutions

### Issue: "Orders table does not exist"
**Solution:** Run `ORDERS_SCHEMA.sql` in Supabase SQL Editor

### Issue: "Failed to place order"
**Solution:** 
- Check `.env` has correct Supabase credentials
- Verify `SUPABASE_SERVICE_ROLE_KEY` is set
- Check browser console for errors

### Issue: "Order number not generated"
**Solution:**
- Ensure database functions were created
- Check for errors in SQL execution
- Verify plpgsql extension is enabled

### Issue: "Admin can't see orders"
**Solution:**
- Verify you're logged in as admin
- Check RLS policies allow authenticated access
- Use service role key for admin operations

### Issue: Order shows but cart not cleared
**Solution:**
- Check server response in Network tab
- Verify order creation was successful
- Clear browser cookies and try again

---

## Testing Checklist

Before going live, test these scenarios:

### Customer Tests
- [ ] Add item to cart
- [ ] View cart
- [ ] Proceed to checkout
- [ ] Leave required field empty (should show validation)
- [ ] Fill all fields and submit
- [ ] See success animation
- [ ] Cart is empty after order
- [ ] Order appears in admin

### Admin Tests
- [ ] View orders page
- [ ] See test order
- [ ] Click order to view details
- [ ] All customer info displayed
- [ ] All order items shown with images
- [ ] Update status to "confirmed"
- [ ] Status updates successfully
- [ ] Filter by "confirmed" status
- [ ] Test order appears in filtered view
- [ ] Delete test order
- [ ] Order removed from list

### Edge Cases
- [ ] Try checkout with empty cart (should redirect)
- [ ] Submit order with very long address
- [ ] Submit order with special characters in name
- [ ] Change region and verify delivery fee updates
- [ ] Place multiple orders in sequence
- [ ] Verify order numbers increment correctly

---

## Quick Commands

### Start Server
```bash
node server.js
```

### View Logs
Server logs will show:
- `✓ Supabase client initialized`
- `✓ Server running on http://localhost:3000`
- Order creation: `ORDER_CREATE_ERROR` or success
- Order updates: `ORDER_UPDATE_ERROR` or success

### Access Points
- **Customer Site:** http://localhost:3000
- **Admin Panel:** http://localhost:3000/admin/
- **Orders Page:** http://localhost:3000/admin/orders

---

## What's Been Added

### New Files
1. `ORDERS_SCHEMA.sql` - Database schema for orders table
2. `views/admin/orders.ejs` - Admin orders management page
3. `views/partials/admin-nav.ejs` - Navigation with Orders link
4. `ORDER_MANAGEMENT_COMPLETE.md` - Full documentation
5. `ORDERS_QUICKSTART.md` - This file

### Modified Files
1. `server.js` - Added order routes and checkout POST endpoint
2. `views/checkout.ejs` - Added order submission logic

### New Routes
- `GET /admin/orders` - View all orders
- `GET /admin/orders/:id` - Get single order (JSON)
- `POST /admin/orders/:id/status` - Update order status
- `POST /admin/orders/:id/delete` - Delete order
- `POST /checkout/` - Submit new order

---

## Next Steps

### Immediate
1. ✅ Run database migration
2. ✅ Test order placement
3. ✅ Test admin panel
4. ✅ Verify all features work

### Optional Enhancements
1. 📧 Email notifications on order
2. 📱 SMS notifications
3. 📊 Analytics dashboard
4. 🔍 Advanced search/filter
5. 💳 Payment integration
6. 📦 Inventory tracking
7. 👤 Customer accounts
8. 🖨️ Print invoices

---

## Support & Resources

- **Full Documentation:** `ORDER_MANAGEMENT_COMPLETE.md`
- **Database Schema:** `ORDERS_SCHEMA.sql`
- **Server Code:** `server.js` (lines with ORDER comments)
- **Frontend:** `views/checkout.ejs` and `views/admin/orders.ejs`

---

## 🎉 You're All Set!

The order management system is now fully integrated and ready to use. Customers can place orders, and you can manage them from the admin panel.

**Happy selling! 🛒✨**
