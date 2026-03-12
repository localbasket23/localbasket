# LocalBasket - College Documentation (Important Notes)

## 1) Project Overview
LocalBasket is a role-based local grocery ordering system with:
- **Customer**: browse stores/products, place orders, track status, rate/review.
- **Seller**: register, manage store/products, accept/reject & update orders.
- **Admin**: approve sellers, manage categories/settings, view reports & payouts.

## 2) Tech Stack
- **Frontend**: Static HTML/CSS/JS (`frontend/`)
- **Backend**: Node.js + Express (`backend/`)
- **Database**: MySQL (`mysql2`) using `DATABASE_URL`
- **Auth**: JWT + OTP flows
- **Uploads**: Multer + (optional) Cloudinary
- **Payments**: Razorpay order creation
- **Email**: Nodemailer SMTP for OTP

## 3) Architecture (High Level)
- Vercel routes `/api/*` to the Express app via `api/index.js`.
- Express serves the frontend statically (useful for local + simple deployments).
- MySQL schema is auto-initialized on server start (see `backend/config/db.js`).

## 4) Important Folders / Files (Code List)

### Backend (Most Important)
- `backend/server.js` — Express bootstrap, CORS, static frontend hosting, route mounting.
- `backend/config/db.js` — MySQL pool + **table creation** and seed settings/categories.
- `backend/db/connection.js` — exports the configured MySQL pool.
- `backend/middlewares/maintenanceGuard.js` — blocks `/api/*` when maintenance is enabled.
- `backend/middlewares/upload.js` — file upload config (local disk vs Cloudinary memory storage).
- `backend/config/cloudinary.js` — Cloudinary config + `uploadToCloudinary()`.
- `backend/config/razorpay.js` — Razorpay client factory.

### Backend Routes (Where APIs are defined)
- `backend/routes/customerRoutes.js` — customer auth/profile (password + OTP).
- `backend/routes/sellerRoutes.js` — seller auth, product CRUD, seller dashboard/orders.
- `backend/routes/adminRoutes.js` — admin dashboard, sellers, categories, settings, reports.
- `backend/routes/storeRoutes.js` — create & list stores.
- `backend/routes/productRoutes.js` — list products by store + product reviews.
- `backend/routes/orderRoutes.js` — create order, status updates, invoice, feedback.
- `backend/routes/paymentRoutes.js` — Razorpay order creation + key status.
- `backend/routes/locationRoutes.js` — pincode/geo helpers.
- `backend/routes/systemRoutes.js` — public system status (maintenance overlay).

### Frontend (Most Important)
- `frontend/index.html` — main landing page.
- `frontend/js/config.js` — frontend config (API base, etc.).
- `frontend/welcome/` — customer/seller/admin UI pages.

## 5) API Endpoints (Quick Reference)
Base is mounted under `/api` in `backend/server.js`.

### Health
- `GET /api/health`
- `GET /api/health/cloudinary`

### Customer (`/api/customer`)
- `POST /register`
- `POST /login`
- `POST /login-otp/request` + `POST /login-otp/verify`
- `POST /password-reset/request` + `POST /password-reset/verify`
- `PUT /profile` (JWT protected)

### Seller (`/api/seller`)
- `POST /register` (multipart)
- `POST /login`
- `POST /login-otp/request` + `POST /login-otp/verify`
- `PUT /resubmit/:id` (multipart)
- `PUT /status`
- `POST /update-profile` (multipart)
- `POST /remove-store-image`
- `POST /products` (multipart, images)
- `GET /products?seller_id=...`
- `PUT /products/:id` (multipart)
- `DELETE /products/:id`
- `GET /dashboard/:id`
- `GET /orders/:sellerId`

### Admin (`/api/admin`)
- `GET /dashboard`
- `GET /full-report` + `GET /full-report/pdf`
- `GET /payments` + `POST /payments/release`
- `GET /sellers` + `GET /sellers/pending`
- `POST /sellers/:id/approve` + `POST /sellers/:id/reject`
- `POST /sellers/status` + `POST /sellers/block` + `POST /sellers/commission`
- `GET /orders` + `GET /orders/:id`
- `GET /settings` + multiple `POST /settings/*`
- `POST /auth/otp/request` + `POST /auth/otp/verify`
- Categories: `GET /categories`, `POST /categories`, `PUT /categories/:id/status`, `DELETE /categories/:id`

### Stores (`/api/stores`)
- `POST /create` (multipart)
- `GET /`
- `GET /:id`

### Products (`/api/products`)
- `GET /?storeId=...`
- `GET /:id/reviews`
- `POST /:id/reviews`

### Orders (`/api/orders`)
- `POST /create`
- `GET /customer/:customerId`
- `GET /seller/:sellerId`
- `GET /all`
- `GET /:orderId/invoice`
- `POST /:orderId/feedback`
- `PUT /:orderId/status`

### Payments (`/api/payment`)
- `GET /status`
- `POST /create` (alias: `/create-order`)

### Location (`/api/location`)
- `GET /area?pincode=...`
- `POST /nearby-stores`

### System (`/api/system`)
- `GET /status`

## 6) Database Schema (Tables)
Core schema is created/ensured by `backend/config/db.js` on startup.
Main tables:
- `categories`, `customers`, `sellers`, `products`, `orders`, `settings`
- `seller_commission`, `seller_payouts`, `seller_audit_logs`
- `store_ratings`, `product_reviews`, `otp_verifications`

## 7) Environment Setup (IMPORTANT)
- Do **not** commit secrets. Keep real values in `backend/.env`.
- Use the template: `backend/.env.example`

## 8) Run Locally
From repo root:
1. Install deps: `npm install`
2. Add env: copy `backend/.env.example` → `backend/.env`
3. Start server: `npm start`
4. Open: `http://localhost:<PORT>/`
