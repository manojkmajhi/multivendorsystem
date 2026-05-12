# Technical Architecture & System Design

This document provides a deep dive into the technical architecture of the All Strawhats multivendor e-commerce platform.

## 1. System Overview
The platform is built as a monolithic Node.js application with a decoupled database layer using Supabase. It follows an MVC-lite pattern, using EJS for templating and Express for routing and business logic.

## 2. Technology Stack

### Backend
- **Runtime**: Node.js (>= 16.0.0)
- **Framework**: Express.js
- **View Engine**: EJS (Embedded JavaScript)
- **Authentication**: JWT (JSON Web Tokens) & Cookie-based sessions
- **Caching**: `node-cache` for high-frequency data (products, categories, settings)

### Database & Storage
- **Primary Database**: PostgreSQL (via Supabase)
- **Object Storage**: Supabase Storage (for product images, hero banners, and seller verification documents)
- **Real-time**: Supabase Real-time (configured but used primarily for standard CRUD)

### External Services
- **OTP/Messaging**: Twilio (WhatsApp & SMS integration)
- **Email**: Nodemailer (SMTP integration for notifications)
- **Image Processing**: `multer` for local handling before Supabase upload

## 3. Core Architecture Components

### A. The Server (`server.js`)
The central entry point that handles:
- Express middleware configuration (Compression, Cookie Parsing, Static files).
- Caching strategy initialization.
- Route definitions for Admin, Seller, and Customer portals.
- Error handling and 404 management.

### B. Service Layer (`src/services/`)
- **`cacheService.js`**: Implements a TTL-based caching strategy to reduce database load. It manages separate caches for products, categories, and settings.
- **Twilio Integration**: Handles multi-factor authentication (OTP) and order notifications via WhatsApp.

### C. Configuration (`src/config/`)
- **`database.js`**: Handles the Supabase client initialization with connection pooling.
- **`constants.js`**: Stores application-wide settings and magic strings.

### D. Middleware (`src/middleware/`)
- **`auth.js`**: Protects routes by verifying JWT tokens and user roles (Admin vs. Seller).

## 4. Data Flow
1. **Request**: User interacts with the UI (EJS template).
2. **Controller**: Express route in `server.js` processes the request.
3. **Cache Check**: If it's a GET request for products/categories, the `cacheService` is checked.
4. **Database**: If cache miss, a query is sent to Supabase.
5. **Response**: Data is passed to the EJS engine, rendered into HTML, and sent to the client with Gzip compression.

## 5. Security Architecture
- **JWT Protection**: Sensitive routes are guarded by JWTs stored in HTTP-only cookies.
- **Bcrypt Hashing**: Passwords for sellers/admins are hashed before storage.
- **Environment Variables**: All API keys and secrets are managed via `.env`.
- **Express Security**: `x-powered-by` is disabled, and `trust proxy` is configured for production.
