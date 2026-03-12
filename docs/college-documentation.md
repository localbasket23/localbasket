# LocalBasket — College Documentation (Important Code + Flow Notes)

**Project:** LocalBasket (Customer + Seller + Admin grocery ordering system)  
**Doc date:** 12 Mar 2026  
**Print target:** A4, 12pt font, ~25–30 pages (see “Print/Page Estimate” at end)

---

## Table of Contents
1. Overview & Modules  
2. Tech Stack  
3. Folder Structure (Important)  
4. Core Database (Orders + OTP columns)  
5. Core User Flows (Customer → Seller → Admin)  
6. Important APIs (Quick reference)  
7. Key Code Snippets (Backend)  
8. Key Code Snippets (Frontend)  
9. Print/Page Estimate (A4, 12pt)

---

## 1) Overview & Modules
LocalBasket is a role-based local grocery ordering system:
- **Customer:** browse stores/products, cart, checkout, track orders, invoice, feedback.
- **Seller:** onboarding, product CRUD, order pipeline (Accept → Packed → Out for Delivery → Cash/OTP → Delivered).
- **Admin:** approve sellers, manage settings/categories, reports, payouts, admin OTP login.

---

## 2) Tech Stack
- **Frontend:** Static HTML/CSS/JS (`frontend/`)
- **Backend:** Node.js + Express (`backend/`)
- **Database:** MySQL (`mysql2`)
- **OTP:** Email/WhatsApp OTP (login) + **4-digit Delivery OTP** (order delivery verification)
- **Payments:** Razorpay (online), COD tracking
- **Invoice:** PDF generation (pdfkit)

---

## 3) Folder Structure (Important)
- `backend/`
  - `server.js` — Express app bootstrap + route mounting
  - `config/db.js` — MySQL pool + table creation/migrations
  - `controllers/` — business logic (orders, OTP, admin, etc.)
  - `routes/` — API endpoints
- `frontend/`
  - `index.html` — landing page / launcher
  - `js/include.js` — header/footer + **AI widget**
  - `js/auth.js` — auth overlay open/bind
  - `welcome/customer/` — customer flows
  - `welcome/seller/` — seller panel (orders, products, dashboard)
  - `welcome/admin/` — admin panel
- `docs/college-documentation.md` — (this file)

---

## 4) Core Database (Orders + OTP Columns)
Main table for this feature is `orders`.

### Orders table: delivery OTP columns
- `delivery_otp` (VARCHAR(4), nullable)  
- `delivery_otp_verified_at` (DATETIME, nullable)  
- `delivered_at` (DATETIME, nullable)

**Important file:** `backend/config/db.js`  
**Snippet (orders table columns)** — Lines **145–190**
```js
CREATE TABLE IF NOT EXISTS orders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  customer_id INT NULL,
  seller_id INT NULL,
  customer_name VARCHAR(160) NULL,
  phone VARCHAR(20) NULL,
  address TEXT NULL,
  pincode VARCHAR(10) NULL,
  total_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  payment_method VARCHAR(30) DEFAULT 'COD',
  payment_status VARCHAR(30) DEFAULT 'PENDING',
  payment_id VARCHAR(80) NULL,
  delivery_otp VARCHAR(4) NULL,
  delivery_otp_verified_at DATETIME NULL,
  delivered_at DATETIME NULL,
  status VARCHAR(30) DEFAULT 'PLACED',
  ...
  cart JSON NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  KEY idx_order_customer (customer_id),
  KEY idx_order_seller (seller_id),
  KEY idx_order_status (status)
)
```

### Auto-migrations (ensureColumn)
**Important file:** `backend/config/db.js`  
**Snippet (startup migrations)** — Lines **270–310**
```js
await initCoreTables();
await ensureColumn("orders", "payment_id", "ALTER TABLE orders ADD COLUMN payment_id VARCHAR(80) NULL");
await ensureColumn("orders", "delivery_otp", "ALTER TABLE orders ADD COLUMN delivery_otp VARCHAR(4) NULL");
await ensureColumn("orders", "delivery_otp_verified_at", "ALTER TABLE orders ADD COLUMN delivery_otp_verified_at DATETIME NULL");
await ensureColumn("orders", "delivered_at", "ALTER TABLE orders ADD COLUMN delivered_at DATETIME NULL");
```

---

## 5) Core User Flows (Customer → Seller → Admin)

### 5.1 Customer places order (Delivery OTP generated)
1. Customer presses **Place Order**
2. Backend creates `orders` row and generates **4-digit** `delivery_otp`
3. Customer sees OTP on **Thank You** page + **My Orders**

### 5.2 Seller order pipeline + COD
Statuses:
- `ACCEPTED` → `PACKED` → `OUT_FOR_DELIVERY` → `COLLECT_CASH` (COD) → `DELIVERED`

Rules:
- **COLLECT_CASH:** Seller confirms cash collected; marks payment as `PAID` (and sets status `COLLECT_CASH`)
- **DELIVERED:** Seller must enter **4-digit OTP**; wrong OTP => delivery rejected
- If COD is unpaid, Delivered requires checkbox confirmation (in UI)

### 5.3 Admin OTP (email)
Admin OTP default email is:
- `localbasket.helpdesk@gmail.com` (override with `ADMIN_OTP_EMAIL` in env)

---

## 6) Important APIs (Quick Reference)
Backend mounts everything under `/api` in `backend/server.js`.

### Orders
- `POST /api/orders/create`
- `GET /api/orders/customer/:customerId`
- `GET /api/orders/:orderId/invoice`
- `PUT /api/orders/:orderId/status`

### Seller orders
- `GET /api/seller/orders/:sellerId`
- `PUT /api/seller/orders/:orderId/status`  
  Body examples:
  - Collect cash: `{ status:"COLLECT_CASH", collect_cash:true, cod_paid:true }`
  - Delivered: `{ status:"DELIVERED", delivery_otp:"1234", cod_paid:true }`

---

# 7) Key Code Snippets (Backend)

## 7.1 Express bootstrap + route mounting
**File:** `backend/server.js`  
**Lines:** **50–140**
```js
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

// Maintenance mode guard (blocks most /api routes when enabled).
app.use(maintenanceGuard);
 
app.use("/api/customer", customerRoutes); 
app.use("/api/seller", sellerRoutes); 
app.use("/api/admin", adminRoutes); 
app.use("/api/system", systemRoutes);
app.use("/api/stores", storeRoutes); 
app.use("/api/products", productRoutes); 
app.use("/api/location", locationRoutes); 
app.use("/api/orders", orderRoutes); 
app.use("/api/payment", paymentRoutes); 
app.use("/api/auth", authRoutes); 

app.use("/api", (req, res) => {
  res.status(404).json({
    success: false,
    message: "API route not found"
  });
});
```

---

## 7.2 OTP helpers (Delivery OTP + schema ensure at runtime)
**File:** `backend/controllers/orderController.js`  
**Lines:** **30–90**
```js
const generateDeliveryOtp = () => String(Math.floor(1000 + Math.random() * 9000));
const normalizeOtp4 = (value) => {
  const digits = String(value == null ? "" : value).replace(/\D/g, "");
  if (digits.length !== 4) return "";
  return digits;
};

let deliveryOtpSchemaReady = false;
let deliveryOtpSchemaEnsuring = null;
const ensureDeliveryOtpSchema = async () => {
  if (deliveryOtpSchemaReady) return;
  if (deliveryOtpSchemaEnsuring) return deliveryOtpSchemaEnsuring;

  deliveryOtpSchemaEnsuring = (async () => {
    const [rows] = await db.promise().query(
      `
      SELECT COLUMN_NAME
      FROM information_schema.columns
      WHERE table_schema = DATABASE()
        AND table_name = 'orders'
        AND COLUMN_NAME IN ('delivery_otp', 'delivery_otp_verified_at', 'delivered_at')
      `
    );
    ...
    if (!present.has("delivery_otp")) stmts.push("ALTER TABLE orders ADD COLUMN delivery_otp VARCHAR(4) NULL");
    if (!present.has("delivery_otp_verified_at")) stmts.push("ALTER TABLE orders ADD COLUMN delivery_otp_verified_at DATETIME NULL");
    if (!present.has("delivered_at")) stmts.push("ALTER TABLE orders ADD COLUMN delivered_at DATETIME NULL");
    ...
  })().finally(() => {
    deliveryOtpSchemaEnsuring = null;
  });

  return deliveryOtpSchemaEnsuring;
};
```

---

## 7.3 Create order (generates 4-digit delivery OTP)
**File:** `backend/controllers/orderController.js`  
**Lines:** **120–190**
```js
const sql = `
  INSERT INTO orders (
    seller_id,
    customer_id,
    customer_name,
    phone,
    address,
    pincode,
    cart,
    total_amount,
    payment_method,
    payment_status,
    payment_id,
    delivery_otp,
    status
  )
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`;

const deliveryOtp = generateDeliveryOtp();
const values = [
  seller_id,
  customer_id,
  customer_name || null,
  phone || null,
  address || null,
  pincode || null,
  JSON.stringify(cart),
  total_amount,
  payment_method || "COD",
  payment_status || "PENDING",
  payment_id || null,
  deliveryOtp,
  "PLACED"
];

res.json({
  success: true,
  order_id: result.insertId,
  delivery_otp: deliveryOtp
});
```

---

## 7.4 Order status update (Collect Cash + Delivered OTP enforcement)
**File:** `backend/controllers/orderController.js`  
**Lines:** **312–515**
```js
const ALLOWED = ["PLACED", "CONFIRMED", "PACKED", "OUT_FOR_DELIVERY", "COLLECT_CASH", "DELIVERED", "REJECTED", "CANCELLED"];
...

if (["1", "true", "yes", "y", "on"].includes(String(collect_cash ?? "").trim().toLowerCase())) {
  return db.query(
    "SELECT status, payment_method, payment_status FROM orders WHERE id = ? LIMIT 1",
    [order_id],
    (err0, rows0) => {
      ...
      return db.query(
        "UPDATE orders SET status = 'COLLECT_CASH', payment_status = 'PAID', status_updated_by = COALESCE(?, status_updated_by) WHERE id = ?",
        [status_updated_by || "SELLER", order_id],
        ...
      );
    }
  );
}

if (normalizedStatus === "DELIVERED") {
  const providedOtp = normalizeOtp4(delivery_otp);
  if (!providedOtp) return res.status(400).json({ success: false, message: "delivery_otp (4 digit) is required to mark DELIVERED" });

  return db.query(
    "SELECT delivery_otp, payment_method, payment_status FROM orders WHERE id = ? LIMIT 1",
    [order_id],
    (err0, rows0) => {
      const expectedOtp = normalizeOtp4(current.delivery_otp);
      if (!expectedOtp || expectedOtp !== providedOtp) return res.status(400).json({ success: false, message: "Invalid delivery OTP" });

      const nextPaymentStatus =
        paymentMethod === "COD"
          ? (isTruthy(cod_paid) ? "PAID" : (safeText(current.payment_status || "PENDING").toUpperCase() || "PENDING"))
          : (safeText(current.payment_status || "PENDING").toUpperCase() || "PENDING");

      // Update delivered_at + verify + clear OTP
      delivered_at = NOW();
      delivery_otp_verified_at = NOW();
      delivery_otp = NULL;
    }
  );
}
```

---

## 7.5 Seller route (Collect Cash + Delivered OTP)
**File:** `backend/routes/sellerRoutes.js`  
**Lines:** **314–490**
```js
router.put("/orders/:orderId/status", (req, res) => {
  const orderId = Number(req.params.orderId);
  const { status, delivery_otp, cod_paid, collect_cash } = req.body;

  const isTruthy = (v) => ["1", "true", "yes", "y", "on"].includes(String(v ?? "").trim().toLowerCase());

  if (isTruthy(collect_cash)) {
    // Only COD + only after OUT_FOR_DELIVERY
    return db.query(
      "SELECT status, payment_method, payment_status FROM orders WHERE id = ? LIMIT 1",
      [orderId],
      (err0, rows0) => {
        ...
        return db.query(
          "UPDATE orders SET status = 'COLLECT_CASH', payment_status = 'PAID', status_updated_by = COALESCE(?, status_updated_by) WHERE id = ?",
          [status_updated_by || \"SELLER\", orderId],
          ...
        );
      }
    );
  }

  if (normalizedStatus === "DELIVERED") {
    const providedOtp = String(delivery_otp == null ? \"\" : delivery_otp).replace(/\\D/g, \"\");
    if (providedOtp.length !== 4) return res.status(400).json({ success: false, message: \"delivery_otp (4 digit) is required to mark DELIVERED\" });

    // Fetch expected OTP and compare
    // If match: set delivered_at + verified_at, clear delivery_otp
  }
});
```

---

## 7.6 Invoice generation (PDF download)
**File:** `backend/controllers/orderController.js`  
**Lines:** **658–725**
```js
exports.getOrderInvoice = async (req, res) => {
  const id = Number(req.params.orderId);
  if (!id) return res.status(400).json({ success: false, message: "Invalid order id" });
  if (!PDFDocument) return res.status(500).json({ success: false, message: "PDF generation not available" });

  const [result] = await db.promise().query(sql, [id]);
  ...

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="invoice-${id}.pdf"`);

  const doc = new PDFDocument({ size: "A4", margin: 40 });
  doc.pipe(res);

  // Draw header + items + totals
  doc.end();
};
```

---

## 7.7 OTP API (6-digit login OTP via /api/auth)
**File:** `backend/controllers/authController.js`  
**Lines:** **170–330**
```js
exports.sendOtp = async (req, res) => {
  const phone = normalizePhone(String(req.body.phone || "").trim());
  const email = String(req.body.email || "").trim().toLowerCase();
  if (!phone) return res.status(400).json({ success: false, message: "Valid phone is required" });
  if (!isEmail(email)) return res.status(400).json({ success: false, message: "Valid email is required" });

  const otp = generateOtp(); // 6-digit
  const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);

  const [waResult, emailResult] = await Promise.allSettled([
    sendWhatsappOtp({ phone, otp }),
    sendEmailOtp({ email, otp })
  ]);

  await query("DELETE FROM otp_verifications WHERE expires_at < NOW()");
  await query(
    `INSERT INTO otp_verifications (phone, email, otp, expires_at)
     VALUES (?, ?, ?, ?)`,
    [phone, email, otp, expiresAt]
  );

  return res.json({ success: true, message: "OTP sent" });
};

exports.verifyOtp = async (req, res) => {
  const otp = String(req.body.otp || "").trim();
  if (!/^\d{6}$/.test(otp)) return res.status(400).json({ success: false, message: "phone, email and 6-digit otp are required" });
  ...
  return res.json({ success: true, message: "OTP verified successfully" });
};
```

---

## 7.8 Admin OTP (email default: localbasket.helpdesk@gmail.com)
**File:** `backend/controllers/adminAuthController.js`  
**Lines:** **1–130**
```js
const ADMIN_EMAIL = String(process.env.ADMIN_OTP_EMAIL || "localbasket.helpdesk@gmail.com").trim().toLowerCase();

exports.requestAdminOtp = async (req, res) => {
  const email = String(req.body?.email || "").trim().toLowerCase();
  if (email !== ADMIN_EMAIL) return res.status(403).json({ success: false, message: "Unauthorized admin email" });

  const otp = generateOtp(); // 6-digit
  const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);
  await sendOtpEmail({ to: ADMIN_EMAIL, otp, subject: "LocalBasket Admin OTP", ... });
  await query(`INSERT INTO otp_verifications (phone, email, otp, expires_at) VALUES (?, ?, ?, ?)`, [ADMIN_OTP_PHONE_KEY, ADMIN_EMAIL, otp, expiresAt]);
  return res.json({ success: true, message: `OTP sent to ${ADMIN_EMAIL}` });
};

exports.verifyAdminOtp = async (req, res) => {
  const otp = String(req.body?.otp || "").trim();
  if (!/^\d{6}$/.test(otp)) return res.status(400).json({ success: false, message: "6-digit otp is required" });
  ...
  return res.json({ success: true, message: "Admin OTP verified", admin_email: ADMIN_EMAIL });
};
```

---

## 7.12 Admin routes (seller approval/rejection + settings)
**File:** `backend/routes/adminRoutes.js`  
**Lines:** **1–120**
```js
const { requestAdminOtp, verifyAdminOtp } = require("../controllers/adminAuthController");
const {
  getDashboardStats,
  getFullReport,
  getPayments,
  getAllSellers,
  getPendingSellers,
  approveSeller,
  rejectSeller,
  getAllOrders,
  getOrderDetails,
  getAllSettings,
  getSellerAuditLogs,
  getCategories,
  addCategory
} = require("../controllers/adminController");

// Seller verification
router.get("/sellers", getAllSellers);
router.get("/sellers/pending", getPendingSellers);
router.post("/sellers/:id/approve", (req, res) =>
  approveSeller({ ...req, body: { seller_id: req.params.id } }, res)
);
router.post("/sellers/:id/reject", (req, res) =>
  rejectSeller({ ...req, body: { seller_id: req.params.id, reason: req.body.reason } }, res)
);
```

**File:** `backend/controllers/adminController.js`  
**Lines:** **350–470**
```js
exports.approveSeller = async (req, res) => {
  const { seller_id } = req.body;
  if (!seller_id) return res.status(400).json({ success:false, message:"seller_id required" });

  // Optional bank-details validation (if columns exist in this DB)
  const cols = await getSellerColumns();
  const needsBankCheck = ["bank_holder","bank_account","bank_ifsc","bank_passbook"].every(c => cols.has(c));
  if (needsBankCheck) {
    const rows = await query("SELECT bank_holder, bank_account, bank_ifsc, bank_passbook FROM sellers WHERE id = ?", [seller_id]);
    ...
  }

  const result = await query("UPDATE sellers SET status='APPROVED', reject_reason=NULL WHERE id=?", [seller_id]);
  if (result.affectedRows === 0) return res.status(404).json({ success:false, message:"Seller not found" });
  return res.json({ success:true });
};

exports.rejectSeller = async (req, res) => {
  const { seller_id, reason } = req.body;
  if (!seller_id || !reason) return res.status(400).json({ success:false, message:"seller_id & reason required" });
  const result = await query("UPDATE sellers SET status='REJECTED', reject_reason=? WHERE id=?", [reason, seller_id]);
  return res.json({ success: result.affectedRows > 0 });
};
```

---

# 8) Key Code Snippets (Frontend)

## 8.1 Landing / Launcher (Home page)
**File:** `frontend/index.html`  
**Lines:** **1–120**
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <script src="/js/config.js"></script>
  <base href="/" />
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="theme-color" content="#ff8a1a">
  <title>Local Basket - Online Grocery Store in Mumbai</title>
  <meta name="description" content="Local Basket is an online grocery store offering fresh vegetables, fruits and daily essentials with fast delivery in Mumbai." />
  ...
  <style>
    :root { --accent: #ff8a1a; ... }
    html, body { height: 100%; overflow: hidden; }
    body { display: grid; place-items: center; ... }
  </style>
</head>
```

---

## 8.2 Auth overlay open/bind (login button opens modal)
**File:** `frontend/js/auth.js`  
**Lines:** **1–120**
```js
(function () {
  var OPEN_AUTH_FLAG = "lbOpenAuthAfterRedirect";

  function getAuthContainer() {
    return document.getElementById("authOverlay") || document.getElementById("authModal");
  }

  function openAuthPopup() {
    var authContainer = getAuthContainer();
    if (authContainer) {
      authContainer.style.display = "flex";
      authContainer.classList.add("active");
      return true;
    }
    return false;
  }

  function bindLoginButtons() {
    var triggers = document.querySelectorAll("#loginBtn, [data-login]");
    triggers.forEach(function (btn) {
      if (!btn || btn.dataset.lbAuthBound) return;
      btn.addEventListener("click", function (e) {
        if (e) e.preventDefault();
        var opened = openAuthPopup();
        if (!opened) {
          try { sessionStorage.setItem(OPEN_AUTH_FLAG, "1"); } catch (err) {}
          window.location.href = "/welcome/customer/index.html";
        }
      });
      btn.dataset.lbAuthBound = "1";
    });
  }
  ...
})();
```

---

## 8.3 AI widget (mobile overflow fix — prevent sideways scroll)
**File:** `frontend/js/include.js`  
**Lines:** **476–515**
```js
style.textContent = `
  #lb-ai-panel, #lb-ai-btn{
    font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif;
  }
  #lb-ai-panel, #lb-ai-panel *{
    box-sizing: border-box;
    max-width: 100%;
  }
  ...
`;
```

**File:** `frontend/js/include.js`  
**Lines:** **695–740**
```css
#lb-ai-body{
  padding: 12px;
  overflow-y: auto;
  overflow-x: hidden;
  display: grid;
  gap: 10px;
}
.lb-ai-msg{
  max-width: 86%;
  white-space: pre-wrap;
}
```

**File:** `frontend/js/include.js`  
**Lines:** **820–850**
```css
.lb-ai-chips{
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  max-width: 100%;
  overflow-x: auto;
  overflow-y: hidden;
  -webkit-overflow-scrolling: touch;
}
```

---

## 8.4 Checkout → order create (stores delivery OTP for Thank You page)
**File:** `frontend/welcome/customer/checkout/checkout-fixed.js`  
**Lines:** **205–250**
```js
async function saveOrder(orderData) {
  const data = await fetchJsonWithFallback("/api/orders/create", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(orderData),
  });

  if (!data.success) {
    alert(`Order failed: ${data.message || "Unable to save order"}`);
    return;
  }

  try {
    const lastOrder = {
      order_id: data.order_id ?? data.orderId ?? null,
      delivery_otp: data.delivery_otp ?? null,
      ts: Date.now()
    };
    sessionStorage.setItem("lb_last_order", JSON.stringify(lastOrder));
  } catch {}

  window.location.href = "/welcome/customer/checkout/thankyou.html";
}
```

---

## 8.5 Thank You page — shows Delivery OTP + Copy
**File:** `frontend/welcome/customer/checkout/thankyou.html`  
**Lines:** **250–340**
```html
<div id="deliveryOtpWrap" style="display:none; margin:18px auto 0; max-width:420px;">
  <div style="background:#f8fffe; border:1px dashed #c7ebe4; border-radius:18px; padding:14px 14px 12px; text-align:left;">
    <div style="display:flex; align-items:center; justify-content:space-between; gap:10px; flex-wrap:wrap;">
      <div>
        <div style="font-size:12px; font-weight:800; letter-spacing:.4px; color:#0f766e; text-transform:uppercase;">Delivery OTP</div>
        <div id="deliveryOtpValue" style="font-size:26px; font-weight:900; letter-spacing:6px; color:#0f172a; margin-top:4px;">----</div>
      </div>
      <button id="deliveryOtpCopy" class="ty-btn ghost" type="button">Copy OTP</button>
    </div>
  </div>
</div>

<script>
  (function () {
    var raw = sessionStorage.getItem("lb_last_order");
    var last = JSON.parse(raw || "null");
    var otp = last && last.delivery_otp ? String(last.delivery_otp).replace(/\\D/g, "") : "";
    if (otp.length !== 4) return;
    document.getElementById("deliveryOtpWrap").style.display = "block";
    document.getElementById("deliveryOtpValue").textContent = otp;
  })();
</script>
```

---

## 8.6 Customer Orders — show OTP in order card + invoice download every click
**File:** `frontend/welcome/customer/order/customer-orders.js`  
**Lines:** **960–1045**
```js
async function downloadInvoice(orderId) {
  const id = normalizeOrderIdKey(orderId);
  const url = `${API_URL}/orders/${encodeURIComponent(String(id))}/invoice`;

  const res = await fetch(url, { method: "GET", cache: "no-store" });
  const blob = await res.blob();
  const uniqueSuffix = Date.now();

  const blobUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = blobUrl;
  a.download = `invoice-${id}-${uniqueSuffix}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
}
window.downloadInvoice = downloadInvoice;
```

**File:** `frontend/welcome/customer/order/customer-orders.js`  
**Lines:** **1180–1325**
```js
// OTP line shown in collapsed card summary
${
  showDeliveryOtp
    ? `<div class="order-otp-row">
         <span class="order-otp-label">Delivery OTP</span>
         <span class="order-otp-code">${escapeHtml(deliveryOtp)}</span>
       </div>`
    : ""
}

// Invoice button triggers programmatic download (works every click)
${
  isDelivered || isPrepaid
    ? `<button class="btn invoice" type="button"
         onclick='downloadInvoice(${safeOrderIdLiteral})'>
         Invoice
       </button>`
    : ""
}
```

---

## 8.6.1 Customer Orders — OTP UI CSS (badge + code)
**File:** `frontend/welcome/customer/order/customer-orders.html`  
**Lines:** **185–250**
```css
.order-otp-row {
  margin-top: 8px;
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.order-otp-label {
  font-size: 11px;
  font-weight: 900;
  letter-spacing: 0.4px;
  text-transform: uppercase;
  color: #0f766e;
  background: rgba(15, 118, 110, 0.1);
  border: 1px solid rgba(15, 118, 110, 0.22);
  padding: 4px 8px;
  border-radius: 999px;
}
.order-otp-code {
  font-size: 14px;
  font-weight: 900;
  letter-spacing: 3px;
  border: 1px dashed #c7ebe4;
  padding: 5px 10px;
  border-radius: 12px;
}
```

---

## 8.7 Seller Orders — refresh + Collect Cash + OTP verify delivery
### Refresh button (fallback: reload)
**File:** `frontend/welcome/seller/seller-orders.html`  
**Line:** **71**
```html
<button class="btn-refresh" id="refreshOrdersBtn" type="button" title="Sync Data"
  onclick="window.fetchOrders ? window.fetchOrders() : location.reload()">
  <i class="fas fa-sync-alt"></i>
</button>
```

### Action modal UI (OTP input + checkbox)
**File:** `frontend/welcome/seller/seller-orders.html`  
**Lines:** **170–205**
```html
<div id="actionModal" class="modal action-modal" aria-hidden="true">
  <div class="modal-content">
    <h3 id="actionModalTitle">Confirm Action</h3>
    <p id="actionModalMessage"></p>

    <div id="actionModalOtpWrap" class="action-otp" style="display:none;">
      <label for="actionModalOtp" class="action-otp-label">Delivery OTP</label>
      <input id="actionModalOtp" class="action-otp-input" inputmode="numeric" maxlength="4" placeholder="Enter 4-digit OTP" />
      <small id="actionModalOtpError" class="action-error">Please enter a valid 4-digit OTP</small>
    </div>

    <label id="actionModalCheckWrap" class="action-check" style="display:none;">
      <input id="actionModalCheck" type="checkbox" />
      <span id="actionModalCheckLabel">I confirm</span>
    </label>
    <small id="actionModalCheckError" class="action-error">Please confirm to continue</small>
    ...
  </div>
</div>
```

### Seller Collect Cash + Delivered OTP flow
**File:** `frontend/welcome/seller/seller-orders.js`  
**Lines:** **610–760**
```js
if (status === "COLLECT_CASH") {
  const result = await showActionModal({
    title: "Collect Cash (COD)",
    message: `Collect amount: Rs. ${Number(currentOrder?.total_amount || 0)}\n\nTick the checkbox to confirm you've collected cash from the customer.`,
    requireCheck: true,
    checkLabel: "I have collected COD cash from the customer",
    confirmText: "Confirm Cash Collected"
  });

  await fetch(`${API_BASE}/seller/orders/${orderId}/status`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status:"COLLECT_CASH", collect_cash:true, cod_paid:true, status_updated_by:"SELLER" })
  });
}

if (status === "DELIVERED") {
  const result = await showActionModal({
    title: "Verify OTP & Deliver",
    requireOtp: true,
    otpPlaceholder: "Enter OTP",
    requireCheck: needsCodConfirm,
    checkLabel: "COD cash collected (customer paid)",
    confirmText: "Verify & Deliver"
  });

  await fetch(`${API_BASE}/seller/orders/${orderId}/status`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status:"DELIVERED", delivery_otp: result.otp, cod_paid: result.checked, status_updated_by:"SELLER" })
  });
}
```

### Refresh binding (JS)
**File:** `frontend/welcome/seller/seller-orders.js`  
**Lines:** **380–430**
```js
// Fetch Initial Data
fetchOrders();

// Auto Refresh every 20 seconds
setInterval(fetchOrders, 20000);

// Manual refresh button
if (els.refreshBtn) {
  els.refreshBtn.addEventListener("click", async () => {
    try {
      els.refreshBtn.disabled = true;
      els.refreshBtn.style.opacity = "0.7";
      await fetchOrders();
    } finally {
      els.refreshBtn.disabled = false;
      els.refreshBtn.style.opacity = "";
    }
  });
}
```

---

## 8.8 Seller Orders — modal controller (OTP validation + checkbox validation)
**File:** `frontend/welcome/seller/seller-orders.js`  
**Lines:** **240–350**
```js
function showActionModal({
  title,
  message,
  requireReason = false,
  requireCheck = false,
  requireOtp = false,
  otpPlaceholder = "Enter 4-digit OTP",
  confirmText = "Confirm"
}) {
  const otpWrap = document.getElementById("actionModalOtpWrap");
  const otpInput = document.getElementById("actionModalOtp");
  const otpErrorEl = document.getElementById("actionModalOtpError");
  const checkWrap = document.getElementById("actionModalCheckWrap");
  const checkEl = document.getElementById("actionModalCheck");
  const checkErrorEl = document.getElementById("actionModalCheckError");

  if (otpWrap) otpWrap.style.display = requireOtp ? "block" : "none";
  if (checkWrap) checkWrap.style.display = requireCheck ? "flex" : "none";

  okBtn.onclick = () => {
    const otp = String(otpInput?.value || "").replace(/\\D/g, "");
    if (requireOtp && otp.length !== 4) { otpErrorEl?.classList.add("show"); return; }
    if (requireCheck && !checkEl?.checked) { checkErrorEl?.classList.add("show"); return; }
    close({ confirmed: true, checked: Boolean(checkEl?.checked), otp });
  };
}
```

---

# 8.9 Seller Orders — preparation time, elapsed time, delay (SLA)
This helps seller to see **order time**, **elapsed minutes**, and **delay** (prep/dispatch target).

**File:** `frontend/welcome/seller/seller-orders.js`  
**Lines:** **460–560**
```js
const orderedAt = order.created_at || order.createdAt || order.order_time || order.orderTime || null;
const elapsedMins = toElapsedMinutes(orderedAt);
const stage = getStageTargetMinutes(status);
const delayMins = Math.max(0, elapsedMins - Number(stage.mins || 0));
const isDelayed = delayMins > 0 && !["DELIVERED", "CANCELLED", "REJECTED"].includes(status);

return `
  <td data-label="Order ID">
    <b>#${order.id}</b>
    <div class="order-time-meta">
      <div class="order-time-line">Ordered: ${formatOrderDateTime(orderedAt)}</div>
      <div class="order-time-badges">
        <span class="time-badge">Elapsed: ${humanizeMinutes(elapsedMins)}</span>
        <span class="time-badge soft">${stage.label}: ${stage.mins}m</span>
        ${isDelayed ? `<span class="time-badge danger">Delay +${humanizeMinutes(delayMins)}</span>` : ""}
      </div>
    </div>
  </td>
`;
```

**File:** `frontend/welcome/seller/seller-orders.css`  
**Lines:** **340–410**
```css
.order-time-meta { margin-top: 6px; }
.order-time-line { font-size: 12px; color: var(--text-light); }
.order-time-badges { margin-top: 6px; display:flex; flex-wrap:wrap; gap:6px; }
.time-badge {
  display:inline-flex; align-items:center;
  padding:4px 8px; border-radius:999px;
  font-size:11px; font-weight:800;
  border:1px solid var(--border-color);
}
.time-badge.soft { background: rgba(255, 138, 26, 0.14); border-color: rgba(255, 138, 26, 0.32); }
.time-badge.danger { background: rgba(239, 68, 68, 0.14); border-color: rgba(239, 68, 68, 0.35); }
```

---

# 8.10 Frontend config — API base URL selection (local vs production)
**File:** `frontend/js/config.js`  
**Lines:** **1–29**
```js
(() => {
  const stored = (() => {
    try { return (typeof localStorage !== "undefined" && localStorage.getItem("lbApiBase")) || ""; } catch { return ""; }
  })();

  const queryOverride = (() => {
    try {
      const sp = new URLSearchParams(String(window.location && window.location.search || ""));
      return String(sp.get("apiBase") || sp.get("api") || "").trim();
    } catch { return ""; }
  })();

  const byWindow = window.API_BASE_URL || window.LB_API_BASE || queryOverride || stored;
  const host = String(window.location && window.location.hostname || "").trim();
  const isLocal = window.location && (window.location.protocol === "file:" || host === "localhost" || host === "127.0.0.1");

  const byOrigin = isLocal ? "http://localhost:5000" : (window.location && window.location.origin) || "";
  const fallback = String(byWindow || byOrigin).trim().replace(/\/+$/, "");

  window.API_BASE_URL = fallback;
  window.LB_API_BASE = fallback;
})();
```

---

# 8.11 Admin panel — auth guard + sidebar layout
**File:** `frontend/welcome/admin/admin-layout.js`  
**Lines:** **1–220**
```js
(function () {
  const ADMIN_AUTH_KEY = "lbAdminAuth";
  const isAdminAuthenticated = () => {
    try {
      const raw = localStorage.getItem(ADMIN_AUTH_KEY);
      if (!raw) return false;
      const parsed = JSON.parse(raw);
      const expiresAt = Number(parsed.expiresAt || 0);
      if (expiresAt && Date.now() > expiresAt) {
        localStorage.removeItem(ADMIN_AUTH_KEY);
        return false;
      }
      return true;
    } catch {
      return false;
    }
  };

  if (!isAdminAuthenticated()) {
    localStorage.removeItem(ADMIN_AUTH_KEY);
    localStorage.removeItem("admin_token");
    window.location.replace("/welcome/customer/index.html");
    return;
  }

  const menu = [
    { file: "admin.html", icon: "fa-chart-pie", label: "Dashboard" },
    { file: "admin-sellers.html", icon: "fa-user-check", label: "Seller Verification" },
    { file: "admin-orders.html", icon: "fa-shopping-cart", label: "Orders" },
    { file: "admin-settings.html", icon: "fa-cog", label: "Settings" }
  ];

  function renderSidebar() {
    const sidebar = document.querySelector(".sidebar");
    if (!sidebar) return;
    sidebar.innerHTML = menu.map(item => `<button data-link="${item.file}">${item.label}</button>`).join("");
  }
})();
```

---

# 7.9 Maintenance mode guard (blocks /api while maintenance)
**File:** `backend/middlewares/maintenanceGuard.js`  
**Lines:** **1–55**
```js
const readSystemMode = async () => {
  const rows = await query("SELECT system_mode FROM settings WHERE id=1");
  return normalizeMode(rows && rows[0] && rows[0].system_mode);
};

module.exports = async function maintenanceGuard(req, res, next) {
  const url = String(req.originalUrl || req.url || "");
  if (!url.startsWith("/api/")) return next();

  // Whitelist critical endpoints
  if (url.startsWith("/api/health") || url.startsWith("/api/system") || url.startsWith("/api/admin")) {
    return next();
  }

  const ttlMs = Number(process.env.MAINTENANCE_CACHE_MS || 15000);
  const mode = await getCachedSystemMode(ttlMs);
  if (mode !== "maintenance") return next();

  return res.status(503).json({ success: false, maintenance: true, message: "Maintenance mode" });
};
```

---

# 7.10 Upload middleware (local disk vs Cloudinary)
**File:** `backend/middlewares/upload.js`  
**Lines:** **1–66**
```js
const { hasCloudinary } = require("../config/cloudinary");
const mustUseCloudinary = process.env.NODE_ENV === "production" || !!process.env.VERCEL;

let storage = null;
if (hasCloudinary) {
  storage = multer.memoryStorage();
} else if (!mustUseCloudinary) {
  storage = multer.diskStorage({ destination: ..., filename: ... });
} else {
  storage = multer.memoryStorage();
}

const multerInstance = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }
});
```

---

# 7.11 Order routes (API contract)
**File:** `backend/routes/orderRoutes.js`  
**Lines:** **1–120**
```js
const router = require("express").Router();
const {
  createOrder,
  getCustomerOrders,
  getSellerOrders,
  getAllOrders,
  updateOrderStatus,
  submitOrderFeedback,
  getOrderInvoice
} = require("../controllers/orderController");

router.post("/create", createOrder);
router.get("/customer/:customerId", getCustomerOrders);
router.get("/seller/:sellerId", getSellerOrders);
router.get("/all", getAllOrders);
router.get("/:orderId/invoice", getOrderInvoice);
router.post("/:orderId/feedback", submitOrderFeedback);
router.put("/:orderId/status", (req, res, next) => {
  req.body.order_id = Number(req.params.orderId);
  req.body.status = String(req.body.status).toUpperCase();
  next();
}, updateOrderStatus);
```

---

# 9) Print/Page Estimate (A4, 12pt)
This document is intentionally long and code-heavy for college submission.  

**Suggested print settings**
- Paper: A4
- Font: 12pt (body), code blocks can stay monospaced
- Margins: Normal

**Current size (repo copy)**
- Approx lines: ~1120+ (depends on editor/wrapping)
- Estimated pages (12pt): ~25 pages (assuming ~45 lines/page)

**How to ensure 25–30 pages**
- Keep this file as-is.
- If your PDF is short, add extra screenshots (UI + DB tables) at the end as Appendix.
