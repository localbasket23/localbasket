const mysql = require("mysql2");

const connectionUri = String(process.env.DATABASE_URL || "").trim();
let parsedConnectionMeta = null;

if (!connectionUri) {
  console.error("DATABASE_URL is not configured");
}

const buildPoolConfig = () => {
  if (!connectionUri) {
    return {
      waitForConnections: true,
      connectionLimit: 1
    };
  }

  try {
    const parsed = new URL(connectionUri);
    parsedConnectionMeta = {
      host: parsed.hostname,
      port: Number(parsed.port || 3306),
      user: decodeURIComponent(parsed.username || ""),
      database: String(parsed.pathname || "").replace(/^\/+/, "")
    };
    return {
      host: parsed.hostname,
      port: Number(parsed.port || 3306),
      user: decodeURIComponent(parsed.username || ""),
      password: decodeURIComponent(parsed.password || ""),
      database: String(parsed.pathname || "").replace(/^\/+/, ""),
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      enableKeepAlive: true,
      keepAliveInitialDelay: 0
    };
  } catch (err) {
    console.error("Invalid DATABASE_URL format", err.message || err);
    return {
      waitForConnections: true,
      connectionLimit: 1
    };
  }
};

const pool = mysql.createPool(buildPoolConfig());

pool.on("connection", () => {
  if (parsedConnectionMeta) {
    console.log(
      `MySQL pool connected to ${parsedConnectionMeta.host}:${parsedConnectionMeta.port}/${parsedConnectionMeta.database}`
    );
  }
});

pool.on("error", (err) => {
  console.error("MySQL pool error", {
    message: err.message || String(err),
    code: err.code || null,
    errno: err.errno || null,
    address: err.address || parsedConnectionMeta?.host || null,
    port: err.port || parsedConnectionMeta?.port || null
  });
});

let initStarted = false;

function runQuery(sql) {
  return new Promise((resolve) => {
    pool.query(sql, (err, rows) => resolve({ err, rows }));
  });
}

async function initCoreTables() {
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
      hero_title VARCHAR(200) DEFAULT 'Freshness from your {{highlight}}, to your doorstep.',
      hero_highlight VARCHAR(120) DEFAULT 'Local Market',
      hero_subtitle VARCHAR(260) DEFAULT 'Discover trusted neighborhood stores and connect directly with local sellers in minutes.',
      hero_image VARCHAR(255) DEFAULT NULL,
      hero_images_json TEXT NULL,
      hero_images_mobile_json TEXT NULL,
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
    INSERT INTO settings (
      id, global_commission_enabled, global_commission_percent,
      payout_cycle, min_payout, system_mode,
      hero_title, hero_highlight, hero_subtitle, hero_image
    )
    VALUES (1, 1, 10, 'Weekly', 0, 'active',
      'Freshness from your {{highlight}}, to your doorstep.',
      'Local Market',
      'Discover trusted neighborhood stores and connect directly with local sellers in minutes.',
      NULL
    )
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

  for (const sql of statements) {
    const { err } = await runQuery(sql);
    if (err) console.error("core schema init failed:", err.message);
  }
}

async function ensureColumn(table, column, sql) {
  const checkSql = `
    SELECT COUNT(*) AS cnt
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = '${table}'
      AND COLUMN_NAME = '${column}'
  `;
  const { err, rows } = await runQuery(checkSql);
  if (err) {
    console.error(`${column} column check failed:`, err.message);
    return;
  }
  if (rows && rows[0] && rows[0].cnt) return;
  const { err: alterErr } = await runQuery(sql);
  if (alterErr) console.error(`${column} column add failed:`, alterErr.message);
}

async function initDb() {
  if (initStarted || !connectionUri) return;
  initStarted = true;

  pool.getConnection(async (err, connection) => {
    if (err) {
      console.error("Database connection failed", {
        message: err.message || String(err),
        code: err.code || null,
        errno: err.errno || null,
        address: err.address || parsedConnectionMeta?.host || null,
        port: err.port || parsedConnectionMeta?.port || null,
        database: parsedConnectionMeta?.database || null,
        user: parsedConnectionMeta?.user || null
      });
      return;
    }

    console.log("MySQL Connected");
    connection.release();

    await initCoreTables();
    await ensureColumn("orders", "payment_id", "ALTER TABLE orders ADD COLUMN payment_id VARCHAR(80) NULL");
    await ensureColumn("products", "mrp", "ALTER TABLE products ADD COLUMN mrp DECIMAL(10,2) DEFAULT NULL");
    await ensureColumn("products", "description", "ALTER TABLE products ADD COLUMN description TEXT NULL");
    await ensureColumn("sellers", "minimum_order", "ALTER TABLE sellers ADD COLUMN minimum_order DECIMAL(10,2) NOT NULL DEFAULT 100.00");

    const extraStatements = [
      `
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
      `,
      `
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
      `,
      `
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
      `
    ];

    for (const sql of extraStatements) {
      const { err: extraErr } = await runQuery(sql);
      if (extraErr) console.error("table init failed:", extraErr.message);
    }
  });
}

initDb();

module.exports = pool;
