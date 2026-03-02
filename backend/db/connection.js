const mysql = require("mysql2");

const pool = mysql.createPool(process.env.DATABASE_URL);

pool.getConnection((err, connection) => {
  if (err) {
    console.error("? Database connection failed", err);
    return;
  }

  console.log("? MySQL Connected");
  connection.release();

  initCoreTables(() => {
    ensureOrdersPaymentIdColumn();
    initRatingsTable();
    initProductReviewsTable();
    initProductsMrp();
    initProductsDescription();
    initSellersMinimumOrder();
    initOtpVerificationsTable();
  });
});

/* ================= TABLE INIT FUNCTIONS ================= */

function initCoreTables(done) {
  const statements = [
    `
    CREATE TABLE IF NOT EXISTS categories (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(120) NOT NULL UNIQUE,
      slug VARCHAR(140) NOT NULL UNIQUE,
      icon VARCHAR(255) DEFAULT '',
      is_active TINYINT(1) NOT NULL DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    `,
    `
    CREATE TABLE IF NOT EXISTS customers (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(140) NOT NULL,
      email VARCHAR(190) NOT NULL UNIQUE,
      phone VARCHAR(20) NOT NULL UNIQUE,
      password VARCHAR(255) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    `,
    `
    CREATE TABLE IF NOT EXISTS sellers (
      id INT AUTO_INCREMENT PRIMARY KEY,
      store_name VARCHAR(180) NOT NULL,
      owner_name VARCHAR(160) NOT NULL,
      email VARCHAR(190) NULL,
      phone VARCHAR(20) NOT NULL UNIQUE,
      address TEXT NULL,
      pincode VARCHAR(10) NULL,
      password VARCHAR(255) NOT NULL,
      owner_id_doc VARCHAR(255) NULL,
      license_doc VARCHAR(255) NULL,
      bank_passbook VARCHAR(255) NULL,
      store_photo VARCHAR(255) NULL,
      category_id INT NULL,
      alt_phone VARCHAR(20) NULL,
      bank_holder VARCHAR(160) NULL,
      bank_account VARCHAR(64) NULL,
      bank_ifsc VARCHAR(32) NULL,
      bank_name VARCHAR(160) NULL,
      bank_branch VARCHAR(160) NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
      reject_reason TEXT NULL,
      is_online TINYINT(1) NOT NULL DEFAULT 0,
      account_status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
      minimum_order DECIMAL(10,2) NOT NULL DEFAULT 100.00,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      KEY idx_seller_status (status),
      KEY idx_seller_category (category_id),
      CONSTRAINT fk_seller_category
        FOREIGN KEY (category_id) REFERENCES categories(id)
        ON DELETE SET NULL
    )
    `,
    `
    CREATE TABLE IF NOT EXISTS products (
      id INT AUTO_INCREMENT PRIMARY KEY,
      seller_id INT NOT NULL,
      name VARCHAR(180) NOT NULL,
      category VARCHAR(120) NOT NULL,
      unit VARCHAR(60) NOT NULL,
      price DECIMAL(10,2) NOT NULL,
      mrp DECIMAL(10,2) DEFAULT NULL,
      stock INT NOT NULL DEFAULT 0,
      image VARCHAR(255) DEFAULT NULL,
      images_json TEXT NULL,
      sub_category VARCHAR(160) NULL,
      description TEXT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      KEY idx_product_seller (seller_id),
      CONSTRAINT fk_product_seller
        FOREIGN KEY (seller_id) REFERENCES sellers(id)
        ON DELETE CASCADE
    )
    `,
    `
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
      status VARCHAR(30) DEFAULT 'PLACED',
      cancelled_by VARCHAR(80) NULL,
      cancelled_by_role VARCHAR(30) NULL,
      cancel_actor VARCHAR(80) NULL,
      rejected_by VARCHAR(80) NULL,
      rejected_by_role VARCHAR(30) NULL,
      status_updated_by VARCHAR(80) NULL,
      reason TEXT NULL,
      cancel_reason TEXT NULL,
      customer_reason TEXT NULL,
      seller_reason TEXT NULL,
      status_reason TEXT NULL,
      reject_reason TEXT NULL,
      rejection_reason TEXT NULL,
      cancellation_reason TEXT NULL,
      cart JSON NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      KEY idx_order_customer (customer_id),
      KEY idx_order_seller (seller_id),
      KEY idx_order_status (status)
    )
    `,
    `
    CREATE TABLE IF NOT EXISTS settings (
      id INT PRIMARY KEY,
      global_commission_enabled TINYINT(1) NOT NULL DEFAULT 1,
      global_commission_percent DECIMAL(6,2) NOT NULL DEFAULT 10,
      payout_cycle VARCHAR(20) DEFAULT 'Weekly',
      min_payout DECIMAL(10,2) DEFAULT 0,
      system_mode VARCHAR(20) DEFAULT 'active',
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
    `,
    `
    CREATE TABLE IF NOT EXISTS seller_commission (
      seller_id INT PRIMARY KEY,
      commission_percent DECIMAL(6,2) NOT NULL DEFAULT 10,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
    `,
    `
    INSERT INTO settings (id, global_commission_enabled, global_commission_percent, payout_cycle, min_payout, system_mode)
    VALUES (1, 1, 10, 'Weekly', 0, 'active')
    ON DUPLICATE KEY UPDATE id = id
    `,
    `
    INSERT INTO categories (name, slug, icon, is_active)
    VALUES
      ('Grocery', 'grocery', 'fa-store', 1),
      ('Fruits & Vegetables', 'fruits-vegetables', 'fa-apple-whole', 1),
      ('Dairy', 'dairy', 'fa-cheese', 1)
    ON DUPLICATE KEY UPDATE
      name = VALUES(name),
      icon = VALUES(icon),
      is_active = VALUES(is_active)
    `
  ];

  const runNext = (index) => {
    if (index >= statements.length) {
      if (typeof done === "function") done();
      return;
    }

    pool.query(statements[index], (err) => {
      if (err) {
        console.error("core schema init failed:", err.message);
      }
      runNext(index + 1);
    });
  };

  runNext(0);
}

function ensureOrdersPaymentIdColumn() {
  const checkSql = `
    SELECT COLUMN_NAME
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'orders'
      AND COLUMN_NAME = 'payment_id'
    LIMIT 1
  `;
  pool.query(checkSql, (err, rows) => {
    if (err) {
      console.error("payment_id column check failed:", err.message);
      return;
    }
    if (rows && rows.length) return;

    const alterSql = `ALTER TABLE orders ADD COLUMN payment_id VARCHAR(80) NULL`;
    pool.query(alterSql, (alterErr) => {
      if (alterErr) {
        console.error("payment_id column add failed:", alterErr.message);
        return;
      }
      console.log("payment_id column added to orders");
    });
  });
}

function initRatingsTable() {
  const sql = `
    CREATE TABLE IF NOT EXISTS store_ratings (
      id INT AUTO_INCREMENT PRIMARY KEY,
      order_id INT NOT NULL UNIQUE,
      store_id INT NOT NULL,
      customer_id INT NOT NULL,
      rating DECIMAL(3,2) NOT NULL,
      comment TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      KEY idx_store (store_id)
    )
  `;
  pool.query(sql, (err) => {
    if (err) console.error("store_ratings init failed:", err.message);
  });
}

function initProductReviewsTable() {
  const sql = `
    CREATE TABLE IF NOT EXISTS product_reviews (
      id INT AUTO_INCREMENT PRIMARY KEY,
      product_id INT NOT NULL,
      store_id INT NOT NULL,
      customer_id INT NULL,
      customer_name VARCHAR(120) NULL,
      rating DECIMAL(3,2) NOT NULL,
      comment TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      KEY idx_product (product_id),
      KEY idx_store (store_id)
    )
  `;
  pool.query(sql, (err) => {
    if (err) console.error("product_reviews init failed:", err.message);
  });
}

function initProductsMrp() {
  const checkSql = `
    SELECT COUNT(*) AS cnt
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'products'
      AND COLUMN_NAME = 'mrp'
  `;

  pool.query(checkSql, (err, rows) => {
    if (err) return console.error("mrp column check failed:", err.message);

    if (!rows[0].cnt) {
      pool.query(
        `ALTER TABLE products ADD COLUMN mrp DECIMAL(10,2) DEFAULT NULL`,
        (err2) => {
          if (err2) console.error("mrp column add failed:", err2.message);
        }
      );
    }
  });
}

function initProductsDescription() {
  const checkSql = `
    SELECT COUNT(*) AS cnt
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'products'
      AND COLUMN_NAME = 'description'
  `;

  pool.query(checkSql, (err, rows) => {
    if (err) return console.error("description column check failed:", err.message);

    if (!rows[0].cnt) {
      pool.query(
        `ALTER TABLE products ADD COLUMN description TEXT NULL`,
        (err2) => {
          if (err2) console.error("description column add failed:", err2.message);
        }
      );
    }
  });
}

function initSellersMinimumOrder() {
  const checkSql = `
    SELECT COUNT(*) AS cnt
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'sellers'
      AND COLUMN_NAME = 'minimum_order'
  `;

  pool.query(checkSql, (err, rows) => {
    if (err) return console.error("minimum_order column check failed:", err.message);

    if (!rows[0].cnt) {
      pool.query(
        `ALTER TABLE sellers ADD COLUMN minimum_order DECIMAL(10,2) NOT NULL DEFAULT 100.00`,
        (err2) => {
          if (err2) console.error("minimum_order column add failed:", err2.message);
        }
      );
    }
  });
}

function initOtpVerificationsTable() {
  const sql = `
    CREATE TABLE IF NOT EXISTS otp_verifications (
      id INT AUTO_INCREMENT PRIMARY KEY,
      phone VARCHAR(20) NOT NULL,
      email VARCHAR(255) NOT NULL,
      otp VARCHAR(6) NOT NULL,
      expires_at DATETIME NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      KEY idx_phone_email (phone, email),
      KEY idx_expires (expires_at)
    )
  `;
  pool.query(sql, (err) => {
    if (err) console.error("otp_verifications init failed:", err.message);
  });
}

module.exports = pool;


