const db = require("../db/connection");
const fs = require("fs");
const path = require("path");
let QRCode;
try {
  QRCode = require("qrcode");
} catch {
  QRCode = null;
}

const getInvoiceBrand = () => {
  const brand = {
    name: process.env.INVOICE_BRAND_NAME || "Local Basket",
    gstin: process.env.INVOICE_GSTIN || "",
    support: process.env.INVOICE_SUPPORT || "support@localbasket.com",
    address: process.env.INVOICE_ADDRESS || "",
    logoPath: process.env.INVOICE_LOGO_PATH || path.join(__dirname, "..", "public", "logo2.png")
  };
  if (brand.logoPath && !fs.existsSync(brand.logoPath)) {
    brand.logoPath = "";
  }
  return brand;
};

let PDFDocument;
try {
  PDFDocument = require("pdfkit");
} catch {
  PDFDocument = null;
}

/* =====================================================
   1ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¯ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¸ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ£ CREATE ORDER
===================================================== */
exports.createOrder = (req, res) => {
  const {
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
    payment_id
  } = req.body;

  if (!seller_id || !customer_id || !Array.isArray(cart) || cart.length === 0) {
    return res.status(400).json({
      success: false,
      message: "Invalid order data"
    });
  }

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
      status
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

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
    "PLACED"
  ];

  db.query(sql, values, (err, result) => {
    if (err) {
      console.error("ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ ORDER CREATE ERROR:", err.sqlMessage);
      return res.status(500).json({
        success: false,
        message: "Order creation failed"
      });
    }

    res.json({
      success: true,
      order_id: result.insertId
    });
  });
};

const getInvoiceTerms = () => {
  return process.env.INVOICE_TERMS || "Goods once sold will not be taken back. Please retain invoice for returns/exchanges.";
};

const getInvoiceGstRate = () => {
  const raw = String(process.env.INVOICE_GST_RATE || "0");
  const n = Number(raw);
  return Number.isFinite(n) ? n : 0;
};

const getInvoiceQrText = (order, total) => {
  return process.env.INVOICE_QR_TEXT || `LB-ORDER:${order.id}|AMOUNT:${total.toFixed(2)}`;
};

/* =====================================================
   2ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¯ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¸ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ£ CUSTOMER ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ MY ORDERS (ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ FINAL FIX)
===================================================== */
exports.getCustomerOrders = (req, res) => {
  const { customerId } = req.params;

  const sql = `
    SELECT
      o.*,
      s.store_name,
      s.phone AS store_phone,
      s.address AS store_address
    FROM orders o
    LEFT JOIN sellers s ON o.seller_id = s.id
    WHERE o.customer_id = ?
    ORDER BY o.created_at DESC
  `;

  db.query(sql, [customerId], (err, rows) => {
    if (err) {
      console.error("ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ CUSTOMER ORDERS ERROR:", err);
      return res.status(500).json({
        success: false,
        message: err.sqlMessage || err.message || "Unable to load orders"
      });
    }

    const orders = (rows || []).map(o => {
      let parsedCart = [];
      if (Array.isArray(o.cart)) {
        parsedCart = o.cart;
      } else if (typeof o.cart === "string") {
        try {
          parsedCart = JSON.parse(o.cart);
        } catch {
          parsedCart = [];
        }
      }

      return {
        ...o,
        cart: parsedCart
      };
    });

    res.json({
      success: true,
      orders
    });
  });
};







/* =====================================================
   3ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¯ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¸ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ£ SELLER ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ ORDERS DASHBOARD
===================================================== */
exports.getSellerOrders = (req, res) => {
  const { sellerId } = req.params;

  const sql = `
    SELECT
      o.*,
      c.name AS customer_name,
      c.phone AS customer_phone
    FROM orders o
    LEFT JOIN customers c ON o.customer_id = c.id
    WHERE o.seller_id = ?
    ORDER BY o.created_at DESC
  `;

  db.query(sql, [sellerId], (err, rows) => {
    if (err) {
      console.error("ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ SELLER ORDERS ERROR:", err.sqlMessage);
      return res.status(500).json({
        success: false,
        orders: []
      });
    }

    const orders = (rows || []).map(o => ({
      ...o,
      cart: typeof o.cart === "string" ? JSON.parse(o.cart) : o.cart
    }));

    res.json({
      success: true,
      orders
    });
  });
};







/* =====================================================
   4ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¯ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¸ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ£ UPDATE ORDER STATUS
===================================================== */
exports.updateOrderStatus = (req, res) => {
  const {
    order_id,
    status,
    cancelled_by,
    cancelled_by_role,
    cancel_actor,
    rejected_by,
    rejected_by_role,
    status_updated_by,
    cancel_reason,
    customer_reason,
    seller_reason,
    status_reason,
    rejection_reason,
    reject_reason,
    cancellation_reason,
    reason
  } = req.body;

  const ALLOWED = ["PLACED", "CONFIRMED", "PACKED", "OUT_FOR_DELIVERY", "DELIVERED", "REJECTED", "CANCELLED"];
  if (!order_id || !ALLOWED.includes(status)) {
    return res.status(400).json({ success: false });
  }

  const normalizedStatus = String(status).toUpperCase();
  const inferredStatusReason = status_reason || reason || null;
  const inferredCancelReason =
    cancel_reason ||
    (normalizedStatus === "CANCELLED"
      ? (customer_reason || cancellation_reason || inferredStatusReason || null)
      : null);
  const inferredCustomerReason =
    customer_reason ||
    (normalizedStatus === "CANCELLED" && (inferredCancelReason || inferredStatusReason || null)) ||
    (String(cancelled_by || "").toUpperCase() === "CUSTOMER" && (inferredCancelReason || inferredStatusReason || null)) ||
    null;
  const inferredSellerReason =
    seller_reason ||
    (normalizedStatus === "REJECTED" && (reject_reason || rejection_reason || inferredStatusReason || null)) ||
    null;
  const inferredRejectReason =
    reject_reason ||
    (normalizedStatus === "REJECTED" ? (inferredSellerReason || rejection_reason || inferredStatusReason || null) : null);
  const inferredRejectionReason =
    rejection_reason ||
    (normalizedStatus === "REJECTED" ? (inferredSellerReason || inferredRejectReason || inferredStatusReason || null) : null);
  const inferredCancellationReason =
    cancellation_reason ||
    (normalizedStatus === "CANCELLED" ? (inferredCancelReason || inferredCustomerReason || inferredStatusReason || null) : null);

  const sql = `
    UPDATE orders
    SET
      status = ?,
      cancelled_by = COALESCE(?, cancelled_by),
      cancelled_by_role = COALESCE(?, cancelled_by_role),
      cancel_actor = COALESCE(?, cancel_actor),
      rejected_by = COALESCE(?, rejected_by),
      rejected_by_role = COALESCE(?, rejected_by_role),
      status_updated_by = COALESCE(?, status_updated_by),
      reason = COALESCE(?, reason),
      cancel_reason = COALESCE(?, cancel_reason),
      customer_reason = COALESCE(?, customer_reason),
      seller_reason = COALESCE(?, seller_reason),
      status_reason = COALESCE(?, status_reason),
      rejection_reason = COALESCE(?, rejection_reason),
      reject_reason = COALESCE(?, reject_reason),
      cancellation_reason = COALESCE(?, cancellation_reason)
    WHERE id = ?
  `;

  const params = [
    normalizedStatus,
    cancelled_by || null,
    cancelled_by_role || null,
    cancel_actor || null,
    rejected_by || null,
    rejected_by_role || null,
    status_updated_by || null,
    reason || inferredStatusReason,
    inferredCancelReason,
    inferredCustomerReason,
    inferredSellerReason,
    inferredStatusReason,
    inferredRejectionReason,
    inferredRejectReason,
    inferredCancellationReason,
    order_id
  ];

  db.query(sql, params, err => {
    if (err) {
      console.error("ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ STATUS UPDATE ERROR:", err.sqlMessage);
      return res.status(500).json({ success: false });
    }
    res.json({ success: true });
  });
};







/* =====================================================
   5ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¯ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¸ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ£ CANCEL ORDER (CUSTOMER)
===================================================== */
exports.cancelOrder = (req, res) => {
  const { orderId } = req.params;

  db.query(
    `UPDATE orders
     SET status = 'REJECTED', cancelled_by = 'CUSTOMER'
     WHERE id = ? AND status IN ('PLACED','CONFIRMED')`,
    [orderId],
    (err, result) => {
      if (err) {
        console.error("ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ CANCEL ERROR:", err.sqlMessage);
        return res.status(500).json({ success: false });
      }

      res.json({
        success: result.affectedRows > 0
      });
    }
  );
};







/* =====================================================
   6ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¯ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¸ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ£ ADMIN ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ ALL ORDERS
===================================================== */
exports.getAllOrders = (req, res) => {
  const sql = `
    SELECT
      o.*,
      s.store_name,
      s.phone AS store_phone,
      c.name AS customer_name,
      c.phone AS customer_phone
    FROM orders o
    LEFT JOIN sellers s ON o.seller_id = s.id
    LEFT JOIN customers c ON o.customer_id = c.id
    ORDER BY o.created_at DESC
  `;

  db.query(sql, (err, rows) => {
    if (err) {
      console.error("ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ¢ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ ADMIN ORDERS ERROR:", err.sqlMessage);
      return res.status(500).json({ success: false });
    }

    res.json({
      success: true,
      orders: rows || []
    });
  });
};







/* =====================================================
   7?? CUSTOMER ÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂÃÂ ORDER FEEDBACK
===================================================== */
exports.submitOrderFeedback = (req, res) => {
  const { orderId } = req.params;
  const { rating, comment } = req.body;
  const ratingNum = Number(rating);

  if (!orderId || !Number.isFinite(ratingNum) || ratingNum < 1 || ratingNum > 5) {
    return res.status(400).json({ success: false, message: "Invalid rating" });
  }

  const sqlOrder = `
    SELECT id, seller_id, customer_id, status
    FROM orders
    WHERE id = ?
    LIMIT 1
  `;

  db.query(sqlOrder, [orderId], (err, rows) => {
    if (err) {
      console.error("? FEEDBACK ORDER LOOKUP ERROR:", err.sqlMessage || err.message);
      return res.status(500).json({ success: false, message: "Database error" });
    }

    if (!rows || rows.length === 0) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    const order = rows[0];
    const status = String(order.status || "").toUpperCase();
    const allowed = ["DELIVERED", "DELIVERED_BY_RIDER", "COMPLETED", "SUCCESS"];
    if (!allowed.includes(status)) {
      return res.status(400).json({ success: false, message: "Feedback allowed only after delivery" });
    }

    const sqlInsert = `
      INSERT INTO store_ratings (order_id, store_id, customer_id, rating, comment)
      VALUES (?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        rating = VALUES(rating),
        comment = VALUES(comment),
        created_at = CURRENT_TIMESTAMP
    `;

    db.query(sqlInsert, [order.id, order.seller_id, order.customer_id, ratingNum, comment || null], (err2) => {
      if (err2) {
        console.error("? FEEDBACK SAVE ERROR:", err2.sqlMessage || err2.message);
        return res.status(500).json({ success: false, message: "Unable to save feedback" });
      }

      res.json({ success: true });
    });
  });
};


/* =====================================================
   8?? ORDER INVOICE (PDF)
   GET /api/orders/:orderId/invoice
===================================================== */
exports.getOrderInvoice = (req, res) => {
  const { orderId } = req.params;
  const id = Number(orderId);
  if (!id) {
    return res.status(400).json({ success: false, message: "Invalid order id" });
  }
  if (!PDFDocument) {
    return res.status(500).json({ success: false, message: "PDF generation not available" });
  }

  const sql = `
    SELECT
      o.*,
      s.store_name,
      s.phone AS store_phone,
      s.address AS store_address,
      c.name AS customer_name,
      c.phone AS customer_phone
    FROM orders o
    LEFT JOIN sellers s ON o.seller_id = s.id
    LEFT JOIN customers c ON o.customer_id = c.id
    WHERE o.id = ?
    LIMIT 1
  `;

  db.query(sql, [id], (err, rows) => {
    if (err) {
      console.error("? INVOICE FETCH ERROR:", err.sqlMessage || err.message);
      return res.status(500).json({ success: false, message: "Failed to generate invoice" });
    }

    if (!rows || rows.length === 0) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    const order = rows[0];
    let cart = [];
    if (Array.isArray(order.cart)) cart = order.cart;
    else if (typeof order.cart === "string") {
      try { cart = JSON.parse(order.cart); } catch { cart = []; }
    }

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="invoice-${id}.pdf"`);

    const doc = new PDFDocument({ size: "A4", margin: 40 });
    const brand = getInvoiceBrand();
    doc.pipe(res);

    
    // Header
    const startY = 40;
    if (brand.logoPath) {
      try {
        doc.image(brand.logoPath, 40, startY, { width: 46, height: 46 });
      } catch {}
    }
    doc.fontSize(18).text(brand.name || "Local Basket", 100, startY + 4);
    if (brand.gstin) {
      doc.fontSize(9).fillColor("#555").text(`GSTIN: ${brand.gstin}`, 100, startY + 24);
    }
    if (brand.support) {
      doc.fontSize(9).fillColor("#555").text(brand.support, 100, startY + 38);
    }

    doc.fillColor("#000");
    doc.fontSize(14).text("Invoice", 420, startY + 6, { align: "right" });

    const createdAt = order.created_at ? new Date(order.created_at).toLocaleString("en-IN") : "-";
    doc.fontSize(10).text(`Invoice #: LB-${order.id}`, 420, startY + 24, { align: "right" });
    doc.text(`Date: ${createdAt}`, 420, startY + 38, { align: "right" });

    // Divider
    doc.moveTo(40, 100).lineTo(550, 100).strokeColor("#e5e7eb").stroke();

    // Sold By + Bill To (two columns)
    const infoY = 112;
    doc.fontSize(11).text("Sold By", 40, infoY, { underline: true });
    doc.fontSize(10).text(order.store_name || "Store", 40, infoY + 14);
    if (order.store_phone) doc.text(`Phone: ${order.store_phone}`, 40, infoY + 28);
    if (order.store_address) doc.text(`Address: ${order.store_address}`, 40, infoY + 42, { width: 240 });

    doc.fontSize(11).text("Bill To", 320, infoY, { underline: true });
    doc.fontSize(10).text(order.customer_name || "Customer", 320, infoY + 14);
    if (order.customer_phone) doc.text(`Phone: ${order.customer_phone}`, 320, infoY + 28);
    if (order.address) doc.text(`Address: ${order.address}`, 320, infoY + 42, { width: 230 });

    // Items table
    const tableTop = 190;
    doc.fontSize(11).text("Items", 40, tableTop - 18);
    doc.moveTo(40, tableTop).lineTo(550, tableTop).strokeColor("#e5e7eb").stroke();

    doc.fontSize(10).text("Item", 40, tableTop + 8);
    doc.text("Qty", 330, tableTop + 8);
    doc.text("Price", 380, tableTop + 8);
    doc.text("Total", 470, tableTop + 8);

    doc.moveTo(40, tableTop + 24).lineTo(550, tableTop + 24).strokeColor("#e5e7eb").stroke();

    let subtotal = 0;
    let y = tableTop + 32;
    cart.forEach((item) => {
      const name = item.name || item.product_name || "Item";
      const qty = Number(item.qty || item.quantity || 1);
      const price = Number(item.price || 0);
      const lineTotal = qty * price;
      subtotal += lineTotal;

      doc.fontSize(10).text(String(name), 40, y, { width: 260 });
      doc.text(String(qty), 330, y);
      doc.text(`Rs. ${price.toFixed(2)}`, 380, y);
      doc.text(`Rs. ${lineTotal.toFixed(2)}`, 470, y);
      y += 18;
    });

    doc.moveTo(40, y + 6).lineTo(550, y + 6).strokeColor("#e5e7eb").stroke();

    // Totals box
    const boxY = y + 14;
    doc.roundedRect(360, boxY, 190, 68, 6).strokeColor("#e5e7eb").stroke();
    doc.strokeColor("#000");
// Totals box
    const total = Number(order.total_amount || subtotal);
    const gstRate = getInvoiceGstRate();
    if (gstRate > 0) {
      const base = total / (1 + gstRate);
      const gst = total - base;
      doc.fontSize(11).text(`Subtotal (Excl. GST): Rs. ${base.toFixed(2)}`, { align: "right" });
      doc.text(`GST (${(gstRate * 100).toFixed(0)}%): Rs. ${gst.toFixed(2)}`, { align: "right" });
      doc.text(`Total: Rs. ${total.toFixed(2)}`, { align: "right" });
    } else {
      doc.fontSize(11).text(`Subtotal: Rs. ${subtotal.toFixed(2)}`, { align: "right" });
      doc.text(`Total: Rs. ${total.toFixed(2)}`, { align: "right" });
    }
    doc.text(`Payment: ${order.payment_method || "COD"} ? ${order.payment_status || "PENDING"}`, { align: "right" });

    // QR + Terms
    const terms = getInvoiceTerms();
    const qrText = getInvoiceQrText(order, total);
    if (QRCode && qrText) {
      try {
        QRCode.toDataURL(qrText, { margin: 1, width: 120 }, (errQr, url) => {
          if (!errQr && url) {
            try {
              doc.addPage();
              doc.fontSize(12).text("Scan for Order Info", { align: "left" });
              doc.image(url, 40, 80, { width: 120, height: 120 });
              doc.fontSize(9).fillColor("#666").text(terms, 40, 220, { width: 520 });
              doc.end();
            } catch {
              doc.end();
            }
            return;
          }
          doc.moveDown(1);
          doc.fontSize(9).fillColor("#666").text(terms, { align: "left" });
          doc.end();
        });
        return;
      } catch {}
    }

    doc.moveDown(1);
    doc.fontSize(9).fillColor("#666").text(terms, { align: "left" });
    doc.moveDown(0.8);
    doc.text("Thank you for shopping with Local Basket!", { align: "center" });
    if (brand.support) {
      doc.moveDown(0.3);
      doc.text(`Support: ${brand.support}`, { align: "center" });
    }
    doc.end();
  });
};
