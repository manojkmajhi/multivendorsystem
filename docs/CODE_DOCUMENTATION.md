# Codebase Documentation

This document provides a detailed breakdown of the file structure and key code components of the Multivendor System project.

## Directory Structure

```text
├── database/            # SQL migrations and schema definitions
├── docs/                # Project documentation and reports
├── node_modules/        # Dependencies
├── public/              # Static assets (CSS, JS, Images)
│   ├── css/             # Stylesheets (Vanilla CSS)
│   ├── js/              # Client-side logic
│   └── uploads/         # Local temporary storage for file uploads
├── scripts/             # Build, cleanup, and deployment scripts
├── src/                 # Backend source code
│   ├── config/          # App configuration
│   ├── middleware/      # Express middlewares
│   └── services/        # Business logic services (Cache, Twilio)
├── views/               # EJS Templates
│   ├── admin/           # Admin Dashboard views
│   └── partials/        # Reusable UI components
├── server.js            # Main application entry point
├── package.json         # Project metadata and dependencies
└── .env.example         # Template for environment variables
```

## Key Files Analysis

### `server.js`
The heart of the application. It contains:
- **Port 3000**: Default listener.
- **Supabase Client**: Initialized for global use.
- **Route Groups**: 
  - `Admin`: Routes prefixed with `/admin`.
  - `Seller`: Routes related to `/farmer` and `/seller`.
  - `Public`: Home, category, and product detail routes.

### `src/services/cacheService.js`
Uses `node-cache` to store:
- `productCache`: 5-minute TTL.
- `categoryCache`: 1-hour TTL.
- `settingsCache`: Persistent until manual clear.
This significantly improves page load times for the homepage and product pages.

### `views/layout.ejs`
The master template. Every page is injected into this layout using `<%- body %>`. It contains:
- Common `<head>` tags (Bootstrap, Google Fonts, Custom CSS).
- Header and Footer (standardized across the site).
- Flash messages and modal triggers.

### `database/migrations/`
Contains versioned SQL files for:
- Creating tables (`sellers`, `products`, `orders`).
- Setting up RLS (Row Level Security) policies in Supabase.
- Seeding initial data.

## Implementation Details

### Multi-Vendor Logic
Sellers are managed via an application process. Once approved by the admin, they gain access to a dedicated dashboard (`views/farmer-dashboard.ejs`) to manage their specific inventory.

### Order Tracking
A custom service using Twilio and Supabase allows customers to track their order status (`views/track-order.ejs`) in real-time by entering their Order ID.

### Dynamic Theming
The project includes a `theme-customizer.ejs` which allows admins to update primary colors and site-wide styles, which are then saved to the database and cached for performance.
