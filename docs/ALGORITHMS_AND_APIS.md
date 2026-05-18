# Custom Algorithms & APIs — Multivendor System

> **Document Scope:** All algorithms and API endpoints that are custom-built (not library/framework defaults) in this project. File references point to `server.js` unless noted otherwise.

---

## Table of Contents

1. [Custom Algorithms](#1-custom-algorithms)
2. [Public REST APIs](#2-public-rest-apis)
3. [Admin REST APIs](#3-admin-rest-apis)
4. [Seller / Farmer APIs](#4-seller--farmer-apis)
5. [Internal Middleware & Helpers](#5-internal-middleware--helpers)

---

## 1. Custom Algorithms

### 1.1 Multi-Layer Caching System

**File:** `src/services/cacheService.js` + `server.js`

The project implements a **four-tier caching architecture** using `node-cache` (in-memory TTL cache) plus a custom HTTP response cache:

| Cache Layer        | TTL     | Purpose                              |
|--------------------|---------|--------------------------------------|
| `productCache`     | 300s    | Individual product lookups & queries |
| `categoryCache`    | 600s    | Category list (fetched once, shared) |
| `settingsCache`    | 300s    | Site settings (name, logo, theme)    |
| `heroCache`        | 600s    | Hero banner images                   |
| `responseCache`    | Dynamic | Full rendered HTML response cache    |

**Response Cache Middleware Algorithm** (`cacheMiddleware`):
```
1. Generate cache key from request URL
2. Check if cached response exists AND is within TTL window
3. If HIT → return cached HTML immediately (set X-Cache: HIT header)
4. If MISS → intercept res.send(), store rendered HTML in Map with timestamp
5. Return response (set X-Cache: MISS header)
```

**Cache Invalidation Strategy:**
- Every admin write operation (create/update/delete product, category, hero image) calls `flushAll()` on relevant caches + `clearResponseCache()`
- Settings changes trigger `loadSiteSetting(true)` to force-refresh
- Admin can manually clear all caches via `GET /__clear_cache`

---

### 1.2 Product Search Algorithm

**Location:** `server.js` — `GET /search/:category/`

A **full-text search** algorithm that searches across multiple product fields with HTML entity normalization:

```
Algorithm: Normalized Multi-Field Text Search
─────────────────────────────────────────────
Input: query string, category filter

1. Normalize search query → lowercase
2. Fetch all products (or filtered by category)
3. For each product, build a searchable text blob:
   - Normalize each field: name, category, type, short_description, long_description
   - Normalization includes:
     a. Lowercase conversion
     b. HTML entity decoding (&#39; → ', &quot; → ", &amp; → &, etc.)
     c. Whitespace collapse (multiple spaces → single space)
     d. Trim
   - Concatenate all normalized fields into one string
4. Filter: check if searchableText.includes(normalizedQuery)
5. Apply pagination (pageSize = 32)
6. Return paginated results
```

**Complexity:** O(n) where n = total active products

---

### 1.3 Search Autocomplete / Suggestions Algorithm

**Location:** `server.js` — `GET /api/search-suggestions`

Uses the same normalization logic as full search but returns only top 10 matches with minimal payload (id, name, price, image, category) for fast typeahead UX.

```
1. Reject queries < 2 characters (return empty)
2. Fetch all products
3. Apply same normalize + includes filter
4. Slice first 10 matches
5. Map to lightweight response objects
```

---

### 1.4 OTP Generation & Verification Algorithm

**Location:** `server.js` — Multiple endpoints

Two OTP mechanisms are implemented:

#### A. WhatsApp OTP (via Twilio)
```
Generate: Math.floor(100000 + Math.random() * 900000) → 6-digit code
Store:    otpStore[phone] = { otp, expiry: now + 5min, sid }
Verify:   Compare stored.otp === submitted && now < stored.expiry
Cleanup:  Delete from otpStore after successful verification or expiry
```

#### B. Email OTP (via Supabase Auth)
```
Send:    supabase.auth.signInWithOtp({ email, options: { shouldCreateUser } })
Verify:  supabase.auth.verifyOtp({ email, token, type: 'email' })
Store:   otpStore[email] = { verified: true, supabaseUser } (for signup flow)
```

Both use an **in-memory `otpStore` object** (not persisted — cleared on server restart).

---

### 1.5 Admin Authentication Algorithm

**Location:** `server.js` — `adminGuard` middleware

A **hash-based session** system using bcrypt:

```
Login Flow:
1. Fetch stored password_hash from Supabase settings table (key: 'admin_auth')
2. bcrypt.compare(submittedPassword, storedHash)
3. If match → set cookie 'admin_session' = hash value (7-day expiry)
4. Fallback: if no hash set, accept ADMIN_TOKEN env var (dev mode)

Guard Flow:
1. Read admin_session cookie
2. Compare cookie value === stored hash (direct string comparison)
3. If match → allow; else → redirect to /admin/login
```

---

### 1.6 Seller Authentication Algorithm (JWT-Based)

**Location:** `server.js` — `sellerGuard` middleware

```
Login Flow:
1. Find seller by email in 'sellers' table
2. Check account status === 'approved'
3. bcrypt.compare(password, seller.password_hash)
4. If match → sign JWT with { farmer_id, email, name, type: 'farmer' }
5. Set cookie 'farmer_session' = JWT token (7-day expiry, httpOnly)

Guard Flow:
1. Read farmer_session cookie
2. jwt.verify(token, JWT_SECRET)
3. Check decoded.type === 'farmer'
4. Attach decoded payload to req.farmer
5. If invalid → clear cookie, redirect to login
```

---

### 1.7 Dynamic Theme CSS Generation

**Location:** `server.js` — `GET /custom-theme.css`

Generates CSS dynamically from database-stored color values:

```
1. Fetch 'theme_colors' setting from Supabase (with defaults)
2. Interpolate color values into CSS template string
3. Apply to: buttons, links, navbar, cards, footer, alerts, badges
4. Serve with Cache-Control: no-cache (always fresh)
```

---

### 1.8 Cart Management Algorithm (In-Memory)

**Location:** `server.js`

Server-side cart using device cookie as identifier:

```
Data Structure: carts = { deviceId: [{ productId, variantId, qty }] }

Add to Cart:
1. Validate productId exists via getCachedProduct()
2. Find existing entry with same productId + variantId
3. If exists → increment qty; else → push new entry
4. Return total item count

Get Cart (Batch Loading):
1. Collect unique productIds and variantIds from cart
2. Promise.all() → parallel fetch all products
3. Batch fetch variants via supabase.from('variants').in('id', variantIds)
4. Build response by merging product + variant data (price adjustment, image override, label)

Price Calculation with Variants:
  finalPrice = basePrice + variant.price_adjustment
  finalName  = productName + " (" + variant attributes joined by " / " + ")"
```

---

### 1.9 Order Statistics Aggregation

**Location:** `server.js` — `GET /admin/orders`

```
1. Fetch all orders from database
2. Aggregate in-memory:
   - total, pending, confirmed, processing, shipped, delivered, cancelled counts
   - revenue = sum of total for non-cancelled orders
3. Apply filter (by status) for the displayed list
```

---

### 1.10 CSV Export Algorithm

**Location:** `server.js` — `GET /admin/sellers/export`

```
1. Fetch all sellers ordered by created_at DESC
2. Build CSV header row
3. Map each seller to CSV row with quoted string fields
4. Join rows with newline
5. Set Content-Type: text/csv and Content-Disposition: attachment
```

---

### 1.11 Static Root Resolution Algorithm

**Location:** `server.js` (lines 446-449)

```
STATIC_ROOT_CANDIDATES = ['strawhats', 'mugiwara', 'allstrawhats']
For each candidate:
  if fs.existsSync(path.join(__dirname, candidate)):
    use it as staticRoot
Fallback: 'public'
```
Allows renaming legacy static bundles without code changes.

---

### 1.12 Variant Attribute Extraction Algorithm

**Location:** `server.js` — `GET /api/product-variants/:id`

```
1. Fetch all active variants for a product
2. For each variant, iterate attribute_combination object
3. Collect unique keys (e.g., "size", "color") and their values into a Set
4. Convert to array format: [{ name, slug, values: [{value}] }]
5. Return alongside raw variant data
```

---

### 1.13 Related Products / Recommendation Algorithm

**Location:** `server.js` — `GET /details/:id/`

Currently, the platform uses a **very basic, category-based recommendation** system rather than a complex machine learning algorithm.

```
Algorithm: Same-Category Latest Items
─────────────────────────────────────
Input: current product ID, current product category

1. Fetch product details for the requested ID
2. Query products database where category === current product category
3. Sort results by 'created_at' descending (newest first)
4. Filter out the current product from the results array
5. Slice the first 6 items
6. Return as 'related' products
```

There are no advanced collaborative filtering (user-behavior-based) or content-based filtering algorithms implemented at this time. Recommendations rely strictly on category matching and recency.

---

### 1.14 File Upload & Sanitization Algorithm

**Location:** `server.js` — Multer configuration

```
Filename: sanitize(originalName) + '-' + timestamp + '-' + random + ext
Filter:   Allow only jpeg|jpg|png|gif|webp (check both mimetype and extension)
Limit:    5MB max file size
Storage:  public/uploads/ directory (created on startup if missing)
```

---

## 2. Public REST APIs

All public APIs are unauthenticated.

### 2.1 Cart APIs

| Method | Endpoint | Description | Parameters |
|--------|----------|-------------|------------|
| `GET` | `/add_to_cart/` | Add item to cart | `?productid=X&qty=N&variantid=V` |
| `GET` | `/get_cart/` | Get current cart with full product details | (uses device cookie) |
| `GET` | `/remove_from_cart/` | Remove specific item | `?productid=X&variantid=V` |
| `GET` | `/set_cart_qty/` | Set exact quantity for an item | `?productid=X&qty=N&variantid=V` |

### 2.2 Checkout / Order API

| Method | Endpoint | Description | Body |
|--------|----------|-------------|------|
| `POST` | `/checkout/` | Submit order | `{ name, mobile, email, region, area, address, notes, subtotal, deliveryFee, total, paymentMethod, paymentScreenshot }` |

**Response:** `{ success, orderId, orderNumber, message }`

### 2.3 Order Tracking API

| Method | Endpoint | Description | Parameters |
|--------|----------|-------------|------------|
| `GET` | `/api/track-order` | Track orders by phone | `?phone=98xxxxxxxx` |

**Response:** `{ success, orders: [...] }`

### 2.4 Search APIs

| Method | Endpoint | Description | Parameters |
|--------|----------|-------------|------------|
| `GET` | `/api/search-suggestions` | Autocomplete (top 10) | `?q=query` |
| `GET` | `/search/:category/` | Full search with pagination | `?q=query&page=1` |

### 2.5 Product Variants API

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/product-variants/:id` | Get variants & attributes for a product |

**Response:** `{ variants: [...], attributes: [{ name, slug, values }] }`

### 2.6 OTP APIs (WhatsApp)

| Method | Endpoint | Description | Body |
|--------|----------|-------------|------|
| `POST` | `/api/send-otp` | Send OTP via WhatsApp (Twilio) | `{ phone }` |
| `POST` | `/api/verify-otp` | Verify WhatsApp OTP | `{ phone, otp }` |

### 2.7 Other Public APIs

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/payment-settings` | Get eSewa QR code URL |
| `GET` | `/api/otpless-config` | Get OTPless app ID |
| `GET` | `/custom-theme.css` | Dynamic CSS from DB settings |

---

## 3. Admin REST APIs

All admin APIs require `adminGuard` authentication.

### 3.1 Product CRUD

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/admin/products` | List all products (with seller info) |
| `GET` | `/admin/products/new` | New product form |
| `POST` | `/admin/products/new` | Create product (with variants support) |
| `GET` | `/admin/products/:id/edit` | Edit product form |
| `POST` | `/admin/products/:id/edit` | Update product (with variants sync) |
| `POST` | `/admin/products/:id/delete` | Delete product |
| `POST` | `/admin/products/:id/toggle-active` | Toggle product active status |
| `POST` | `/admin/products/:id/toggle-popular` | Toggle popular flag |

### 3.2 Category CRUD

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/admin/categories` | List categories |
| `POST` | `/admin/categories/new` | Create category (image file or URL) |
| `POST` | `/admin/categories/:id/edit` | Update category |
| `POST` | `/admin/categories/:id/delete` | Delete category |

### 3.3 Hero Images CRUD

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/admin/hero-images` | List hero banners |
| `POST` | `/admin/hero-images/new` | Create hero image |
| `POST` | `/admin/hero-images/:id/edit` | Update hero image |
| `POST` | `/admin/hero-images/:id/delete` | Delete hero image |
| `POST` | `/admin/hero-images/:id/toggle-active` | Toggle active status |

### 3.4 Order Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/admin/orders` | List orders (with stats & filter) |
| `GET` | `/admin/orders/:id` | Get single order (JSON) |
| `POST` | `/admin/orders/:id/status` | Update order status |
| `POST` | `/admin/orders/:id/tracking` | Update tracking info |
| `POST` | `/admin/orders/:id/delete` | Delete order |

**Valid statuses:** `pending`, `confirmed`, `processing`, `shipped`, `delivered`, `cancelled`

### 3.5 Settings & Theme

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/admin/settings` | Settings page (site, SEO, social, payment) |
| `POST` | `/admin/settings` | Save all settings + optional password change |
| `POST` | `/admin/settings/reset-theme` | Reset colors to defaults |
| `GET` | `/admin/theme-customizer` | Theme color customizer page |
| `POST` | `/admin/theme-customizer/save` | Save theme colors (JSON) |

### 3.6 Seller Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/admin/sellers` | Paginated seller list with search/filter/sort |
| `GET` | `/admin/sellers/export` | CSV export of all sellers |
| `GET` | `/admin/sellers/:id` | Get single seller (JSON) |
| `POST` | `/admin/sellers/add` | Add new seller (generates temp password) |
| `GET` | `/admin/sellers/:id/edit` | Edit seller form |
| `POST` | `/admin/sellers/:id/edit` | Update seller |
| `POST` | `/admin/sellers/:id/approve` | Approve seller |
| `POST` | `/admin/sellers/:id/suspend` | Suspend seller |
| `POST` | `/admin/sellers/:id/reactivate` | Reactivate seller |
| `POST` | `/admin/sellers/:id/delete` | Delete seller (nullifies product refs) |

### 3.7 Application Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/admin/farmer-applications` | List farmer applications |
| `POST` | `/admin/farmer-applications/approve` | Approve + create seller account |
| `POST` | `/admin/farmer-applications/reject` | Reject application |
| `GET` | `/admin/seller-applications` | List seller applications |
| `POST` | `/admin/seller-applications/approve` | Approve + create seller account |
| `POST` | `/admin/seller-applications/reject` | Reject application |

### 3.8 Cache & Debug

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/__clear_cache` | Flush all caches |
| `GET` | `/__cache_stats` | View cache hit/miss stats |

---

## 4. Seller / Farmer APIs

### 4.1 Authentication APIs

| Method | Endpoint | Description | Body |
|--------|----------|-------------|------|
| `POST` | `/api/farmers/send-otp` | Send signup OTP (Supabase Auth) | `{ email }` |
| `POST` | `/api/farmers/verify-otp` | Verify signup OTP | `{ email, otp }` |
| `POST` | `/api/farmers/complete-signup` | Complete registration | `{ email, name, phone, password, businessName }` |
| `POST` | `/api/sellers/signup-send-otp` | Seller signup OTP | `{ email }` |
| `POST` | `/api/sellers/signup-verify` | Verify + create seller account | `{ email, otp, password }` |
| `POST` | `/farmers/login` | Login (bcrypt compare) | `{ email, password }` |
| `POST` | `/farmers/logout` | Logout (clear cookie) | — |

### 4.2 Password Reset APIs

| Method | Endpoint | Description | Body |
|--------|----------|-------------|------|
| `POST` | `/api/farmers/forgot-password` | Send reset OTP (creates account if missing) | `{ email }` |
| `POST` | `/api/farmers/verify-reset-otp` | Verify reset OTP | `{ email, otp }` |
| `POST` | `/api/farmers/reset-password` | Set new password (after OTP verified) | `{ email, password }` |

### 4.3 Seller Dashboard APIs (require `sellerGuard`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/farmers/dashboard` | Seller dashboard (products + posts) |
| `GET` | `/farmers/products` | List seller's own products |
| `GET` | `/farmers/products/new` | New product form |
| `POST` | `/farmers/products/new` | Create product (auto-approved) |
| `GET` | `/farmers/products/:id/edit` | Edit product form (ownership check) |
| `POST` | `/farmers/products/:id/edit` | Update product (ownership check) |
| `POST` | `/farmers/products/:id/delete` | Delete product (ownership check) |
| `POST` | `/farmers/profile/update` | Update profile (name, bio, images) |
| `POST` | `/farmers/posts/add` | Add social post (text + media) |

### 4.4 Public Seller APIs

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/sellers/` | List all approved sellers |
| `GET` | `/sellers/:id` | Public seller profile + products + posts |
| `POST` | `/api/farmer-applications` | Submit farmer application |
| `POST` | `/api/seller-applications` | Submit seller application |

---

## 5. Internal Middleware & Helpers

### 5.1 Middleware Stack

| Middleware | Purpose |
|------------|---------|
| `compression({ level: 6 })` | Gzip all responses > 1KB |
| `cookieParser()` | Parse cookies for session/device tracking |
| Security headers middleware | X-Content-Type-Options, X-Frame-Options, X-XSS-Protection, Referrer-Policy |
| `loadSiteSetting()` injection | Injects siteSetting, customColors, socialLinks, seo into every response |
| `cacheMiddleware(duration)` | Applied to `/shop/:category/` (30s) and `/details/:id/` (60s) |
| `adminGuard` | Protects all `/admin/*` routes |
| `sellerGuard` | Protects all `/farmers/dashboard`, `/farmers/products/*` routes |
| `handleMulterError` | Graceful error handling for file uploads |

### 5.2 Helper Functions

| Function | Purpose |
|----------|---------|
| `getSetting(key, fallback)` | Fetch setting from DB with cache |
| `setSetting(key, value)` | Upsert setting + invalidate cache |
| `loadSiteSetting(force)` | Load site name/logo with 60s cache |
| `loadTheme(force)` | Load theme name with 60s cache |
| `getCachedProduct(id)` | Product lookup with per-ID cache |
| `getAnyProductById(id)` | DB-first lookup with in-memory fallback |
| `dbFetchProducts(filter)` | Query products with filter & cache |
| `dbFetchCategories(force)` | Query categories with cache |
| `getCart(device)` | Get or create cart bucket by device ID |
| `normalizeType(t)` | Normalize legacy 'Sticker' → 'Product' |
| `getAdminHash()` | Fetch & cache admin password hash |
| `sendOTPEmail(email, otp)` | Send OTP via Nodemailer (SMTP/Gmail) |

---

## Technology Dependencies

| Technology | Usage |
|------------|-------|
| **Express.js** | HTTP server & routing |
| **EJS** | Server-side template rendering |
| **Supabase** | PostgreSQL database & Auth (OTP) |
| **bcryptjs** | Password hashing (10 salt rounds) |
| **jsonwebtoken** | Seller session tokens (7-day expiry) |
| **node-cache** | In-memory TTL caching |
| **Twilio** | WhatsApp OTP delivery |
| **Nodemailer** | Email OTP delivery (SMTP/Gmail) |
| **Multer** | File upload handling |
| **compression** | Gzip response compression |

---

*Generated from source analysis of `server.js` (3,500 lines) and `src/services/cacheService.js`.*
