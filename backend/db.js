const mysql = require("mysql2");

const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "12345",   // your MySQL password
  database: "localbasket"
});

db.connect(err => {
  if (err) {
    console.error("❌ MySQL Connection Failed:", err);
    return;
  }
  console.log("MySQL Connected");
  initRatingsTable();
  initProductsMrp();
});


const initRatingsTable = () => {
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
    if (err) {
      console.error("store_ratings init failed:", err.sqlMessage || err.message);
    }
  });
};

const initProductsMrp = () => {
  const checkSql = `
    SELECT COUNT(*) AS cnt
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'products'
      AND COLUMN_NAME = 'mrp'
  `;
  db.query(checkSql, (err, rows) => {
    if (err) {
      console.error("mrp column check failed:", err.sqlMessage || err.message);
      return;
    }
    const exists = rows && rows[0] && Number(rows[0].cnt) > 0;
    if (exists) return;

    const sql = `ALTER TABLE products ADD COLUMN mrp DECIMAL(10,2) DEFAULT NULL`;
    db.query(sql, (err2) => {
      if (err2) {
        console.error("mrp column add failed:", err2.sqlMessage || err2.message);
      }
    });
  });
};
module.exports = db;



