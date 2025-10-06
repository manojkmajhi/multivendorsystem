# 📦 Order Tracking System

## Overview
Complete order tracking system that allows customers to track their orders and admins to manage order status with custom messages and estimated delivery dates.

## Features

### For Customers
- **Track Order Page**: `/track-order`
- Enter mobile number to see ALL their orders
- Beautiful timeline showing order progress for each order
- View estimated delivery dates
- Read custom messages from admin
- See order items and delivery information
- Orders sorted by newest first

### For Admins
- **Order Management**: `/admin/orders`
- Update order status (pending → confirmed → processing → shipped → delivered)
- Set custom tracking info for each status:
  - Estimated delivery date/days
  - Custom message for customers
- Filter orders by status
- View order statistics and revenue
- Delete orders if needed

## Order Status Flow

1. **Pending** - Order received, awaiting confirmation
2. **Confirmed** - Order confirmed, being prepared
3. **Processing** - Order being packed
4. **Shipped** - Order dispatched, on the way
5. **Delivered** - Order successfully delivered
6. **Cancelled** - Order cancelled (optional)

## Default Messages

Each status has a sweet default message:
- **Pending**: "Your order has been received and is being processed."
- **Confirmed**: "Your order has been confirmed and is being prepared."
- **Processing**: "Your order is being packed and prepared for shipment."
- **Shipped**: "Your order is on the way! Our delivery partner will contact you soon."
- **Delivered**: "Your order has been delivered. Thank you for shopping with us!"
- **Cancelled**: "This order has been cancelled."

## Setup Instructions

### 1. Database Setup
Run the SQL migration in your Supabase SQL editor:
```bash
# File: SUPABASE_ORDERS_TRACKING.sql
```

This will:
- Create/update the `orders` table
- Add `tracking_info` JSONB column
- Add `order_number` with auto-generation
- Set up triggers for automatic order numbering
- Configure RLS policies

### 2. Test the System

#### Customer Side:
1. Place a test order through checkout
2. Note the mobile number used (e.g., 9814789009)
3. Visit `/track-order`
4. Enter the mobile number
5. See all orders for that number with tracking timelines

#### Admin Side:
1. Go to `/admin/orders`
2. Click on any order to view details
3. Update the status using the dropdown
4. Add custom tracking info:
   - Set estimated date (e.g., "2-3 days" or "Jan 20, 2024")
   - Add a custom note for the customer
5. Click "Save Tracking Info"
6. Customer will see this info when tracking

## Tracking Info Structure

The `tracking_info` column stores JSONB data:
```json
{
  "pending": {
    "estimated_date": "1-2 days",
    "note": "Your order is being processed",
    "updated_at": "2024-01-15T10:30:00Z"
  },
  "confirmed": {
    "estimated_date": "Jan 20, 2024",
    "note": "We've confirmed your order!",
    "updated_at": "2024-01-15T11:00:00Z"
  }
}
```

## Footer Integration

The "Track Order" link is automatically added to all page footers:
- Home page
- Shop/Category pages
- Product details pages
- Cart and checkout pages

## Design Features

✨ **Beautiful Timeline UI**
- Animated status indicators
- Color-coded progress (green = completed, blue = active, gray = pending)
- Smooth transitions and hover effects
- Responsive design for mobile

🎨 **Theme Consistency**
- Matches your site's navbar and footer
- Uses same fonts and colors
- Consistent spacing and layout

📱 **Mobile Optimized**
- Touch-friendly interface
- Responsive timeline
- Easy-to-read on small screens

## API Endpoints

### Public
- `GET /track-order` - Track order page
- `GET /api/track-order?phone=XXXXXXXXXX` - Get all orders for phone number (JSON)

### Admin
- `GET /admin/orders` - Orders management page
- `GET /admin/orders/:id` - Get single order (JSON)
- `POST /admin/orders/:id/status` - Update order status
- `POST /admin/orders/:id/tracking` - Update tracking info
- `POST /admin/orders/:id/delete` - Delete order

## Tips for Admins

1. **Update status regularly** - Keep customers informed
2. **Add personal notes** - Make customers feel valued
3. **Be realistic with dates** - Better to under-promise and over-deliver
4. **Use the tracking system** - Reduces customer support queries

## Customization

### Change Default Messages
Edit `track-order.ejs` line ~90:
```javascript
const statusConfig = {
  pending: { 
    icon: 'fa-clock', 
    label: 'Order Placed', 
    defaultMsg: 'Your custom message here',
    defaultDays: '1-2 days' 
  },
  // ... other statuses
};
```

### Add More Status Steps
1. Add new status to `statusOrder` array
2. Add configuration to `statusConfig`
3. Update admin dropdown in `orders.ejs`

## Troubleshooting

**Orders not found?**
- Check phone number is correct (must match exactly)
- Ensure orders exist in database for that number
- Verify RLS policies allow public read
- Phone number must match what was entered at checkout

**Tracking info not saving?**
- Check admin is logged in
- Verify Supabase service role key is set
- Check browser console for errors

**Timeline not showing correctly?**
- Clear browser cache
- Check order has valid status
- Verify tracking_info JSON structure

## Support

For issues or questions:
- Check server logs for errors
- Verify database schema is up to date
- Test with sample orders first
