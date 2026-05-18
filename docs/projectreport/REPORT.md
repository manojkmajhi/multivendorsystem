# Multivendor System: A MULTIVENDOR E-COMMERCE PLATFORM
## A Project Report submitted to the Department of Computer Science
## In partial fulfillment of the requirements for the Fourth Semester of Bachelor in Computer Applications (BCA)

**Submitted By:**
[Manoj Majhi and Nitu Kushwaha]
[Exam Roll No: XXXXXX]
[T.U. Regd. No: XXXXXX]

**Supervisor:**
[Supervisor Name]

**Date:** May 12, 2026

---

## ABSTRACT
The "Multivendor System" project is a comprehensive multivendor e-commerce platform designed to bridge the gap between niche sellers and online shoppers. Built using the Node.js ecosystem, the platform provides a robust environment where multiple sellers can manage their inventories, while customers enjoy a high-performance shopping experience. The system leverages Supabase for scalable data management, Twilio for secure OTP-based authentication and WhatsApp notifications, and advanced server-side caching to ensure sub-second page loads. This report details the full development lifecycle, from problem identification and system analysis to design, implementation, and rigorous testing.

---

## TABLE OF CONTENTS
1. [Chapter 1: Introduction](#chapter-1-introduction)
2. [Chapter 2: Background Study and Literature Review](#chapter-2-background-study-and-literature-review)
3. [Chapter 3: System Analysis and Design](#chapter-3-system-analysis-and-design)
4. [Chapter 4: Implementation and Testing](#chapter-4-implementation-and-testing)
5. [Chapter 5: Conclusion and Future Recommendations](#chapter-5-conclusion-and-future-recommendations)

---

## Chapter 1: Introduction

### 1.1 Introduction
The rapid digitization of commerce has created a demand for specialized marketplaces. "Multivendor System" is a dedicated multivendor platform that allows independent sellers to reach customers through a centralized portal. Unlike generic marketplaces, this platform focuses on community-driven niches, providing specialized features like variant management and real-time WhatsApp order tracking.

### 1.2 Problem Statement
Traditional e-commerce setups for small-scale niche sellers often face hurdles such as:
- High cost of maintaining independent platforms.
- Lack of integrated multivendor management tools.
- Poor performance and slow loading times on traditional PHP/MySQL setups.
- Inefficient customer communication channels for order tracking.

### 1.3 Objectives
- To design and develop a scalable multivendor e-commerce architecture.
- To implement a secure role-based access control (RBAC) for Admins and Sellers.
- To optimize frontend performance using server-side caching (Node-cache).
- To integrate modern communication APIs (Twilio) for real-time tracking.

### 1.4 Scope and Limitation
- **Scope**: Includes seller registration, product management, admin approval workflow, checkout system, and order tracking.
- **Limitation**: Currently lacks an integrated automated payment gateway (Stripe/Khalti) and advanced machine learning-based product recommendations.

---

## Chapter 2: Background Study and Literature Review

### 2.1 Background Study
The project relies on the **MEEN Stack** (Modified: Node, Express, EJS, and Supabase). Key terminologies include:
- **Supabase (BaaS)**: Used for PostgreSQL hosting and Row Level Security (RLS).
- **EJS (Embedded JavaScript)**: A templating engine that allows dynamic HTML generation.
- **JWT (JSON Web Token)**: Used for stateless authentication.

### 2.2 Literature Review
Existing platforms like Daraz or Amazon provide general-purpose marketplace features. However, research shows that niche markets benefit from specialized UI/UX and focused community features. This project improves upon existing open-source e-commerce scripts by focusing on performance through aggressive caching and modern cloud-native storage.

---

## Chapter 3: System Analysis and Design

### 3.1 System Analysis

#### 3.1.1 Requirement Analysis
**i. Functional Requirements:**
- **Seller Management**: Registration, Login, Dashboard, Product CRUD.
- **Customer Management**: Browse products, Cart management, Checkout, Order Tracking.
- **Admin Management**: User approval, Category management, Site-wide settings.
- **Security**: OTP-based verification for critical actions.

**ii. Non-Functional Requirements:**
- **Performance**: Homepage load time under 800ms.
- **Scalability**: Database should handle thousands of products across multiple sellers.
- **Usability**: Fully responsive design for mobile and desktop.

#### 3.1.2 Feasibility Analysis
- **Technical**: Node.js and Supabase provide the necessary tools for rapid development.
- **Operational**: The platform is intuitive for sellers with minimal technical knowledge.
- **Economic**: Open-source tools and cloud-free tiers make the project cost-effective.

#### 3.1.3 Data Modelling (ER-Diagram)
The system uses a relational schema:
- **Users**: (id, email, password, role)
- **Sellers**: (id, user_id, store_name, status, documents)
- **Products**: (id, seller_id, name, price, variants, stock)
- **Orders**: (id, customer_id, status, total_amount, tracking_id)

### 3.2 System Design

#### 3.2.1 Architectural Design
The platform follows a **Layered Architecture**:
1. **Client Layer**: EJS Templates, CSS, Vanilla JS.
2. **Server Layer**: Express.js, JWT Middleware.
3. **Service Layer**: Twilio API, Nodemailer, Cache Service.
4. **Data Layer**: Supabase PostgreSQL.

#### 3.2.2 Database Schema Design
Primary tables are defined in PostgreSQL with strict RLS (Row Level Security) policies ensuring that sellers can only access their own products and orders.

---

## Chapter 4: Implementation and Testing

### 4.1 Implementation

#### 4.1.1 Tools Used
- **Programming Language**: JavaScript (Node.js)
- **Web Framework**: Express.js
- **Database**: Supabase (PostgreSQL)
- **CASE Tools**: VS Code, Git/GitHub, Draw.io (for Diagrams).

#### 4.1.2 Implementation Details of Modules
- **`cacheService.js`**: Implements TTL-based memory caching to serve static products instantly.
- **`auth.js`**: Middleware that decodes JWT from HTTP-only cookies for role verification.
- **Twilio Module**: Handles the `twilio.messages.create` calls for WhatsApp OTPs.

### 4.2 Testing

#### 4.2.1 Test Cases for Unit Testing
- **Auth Test**: Verify that incorrect passwords return 401 Unauthorized.
- **Cache Test**: Verify that subsequent GET requests for the same product do not hit the database.

#### 4.2.2 Test Cases for System Testing
- **Multivendor Flow**: Verify that a product added by Seller A is not editable by Seller B.
- **Checkout Flow**: Verify that total amount calculation matches the sum of cart items.

---

## Chapter 5: Conclusion and Future Recommendations

### 5.1 Lesson Learnt / Outcome
Successfully implemented a complex multivendor architecture. Learnt the importance of server-side caching and secure cloud database management.

### 5.2 Conclusion
The "Multivendor System" platform meets all specified objectives. It provides a robust, fast, and secure marketplace for niche communities, demonstrating the power of modern JavaScript backend technologies.

### 5.3 Future Recommendations
- Integration of a live chat feature between buyers and sellers.
- Implementation of a progressive web app (PWA) for better mobile accessibility.
- Addition of an AI-driven image recognition tool for automated product categorization.
