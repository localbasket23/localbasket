const mysql = require("mysql2");

const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT,
  ssl: {
    rejectUnauthorized: false
  }
});

db.connect((err) => {
  if (err) {
    console.error("❌ Database connection failed:", err);
  } else {
    console.log("✅ MySQL Connected");

    initRatingsTable();
    initProductReviewsTable();
    initProductsMrp();
    initProductsDescription();
    initSellersMinimumOrder();
  }
});

/* ================= TABLE INIT FUNCTIONS ================= */

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
  db.query(sql, (err) => {
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
  db.query(sql, (err) => {
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

  db.query(checkSql, (err, rows) => {
    if (err) return console.error("mrp column check failed:", err.message);

    if (!rows[0].cnt) {
      db.query(
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

  db.query(checkSql, (err, rows) => {
    if (err) return console.error("description column check failed:", err.message);

    if (!rows[0].cnt) {
      db.query(
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

  db.query(checkSql, (err, rows) => {
    if (err) return console.error("minimum_order column check failed:", err.message);

    if (!rows[0].cnt) {
      db.query(
        `ALTER TABLE sellers ADD COLUMN minimum_order DECIMAL(10,2) NOT NULL DEFAULT 100.00`,
        (err2) => {
          if (err2) console.error("minimum_order column add failed:", err2.message);
        }
      );
    }
  });
}

module.exports = db;