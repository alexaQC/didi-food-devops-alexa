import express from "express";
import pkg from "pg";

const { Pool } = pkg;
const app = express();
app.use(express.json());

const pool = new Pool({
  host: process.env.DB_HOST || "orders-db",
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || "orders_user",
  password: process.env.DB_PASSWORD || "orders_pass",
  database: process.env.DB_NAME || "orders_db",
});

// ======================
// Ensure table exists
// ======================
async function ensureOrdersTable() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        total NUMERIC(10,2) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log("orders table ready");
  } catch (error) {
    console.error("failed to ensure orders table:", error);
  }
}

// health
app.get("/health", async (req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({ status: "ok" });
  } catch {
    res.status(500).json({ status: "error" });
  }
});

// POST /orders
app.post("/orders", async (req, res) => {
  try {
    const { user_id, total } = req.body;

    if (!user_id || !total) {
      return res.status(400).json({ error: "user_id and total required" });
    }

    const result = await pool.query(
      `INSERT INTO orders (user_id, total)
       VALUES ($1, $2)
       RETURNING *`,
      [user_id, total]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error("POST /orders error:", error);
    res.status(500).json({ error: "orders_insert_error" });
  }
});

// GET /orders
app.get("/orders", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM orders ORDER BY id DESC"
    );
    res.json(result.rows);
  } catch (error) {
    console.error("GET /orders error:", error);
    res.status(500).json({ error: "orders_fetch_error" });
  }
});

// ======================
// Start server
// ======================
async function start() {
  try {
    await ensureOrdersTable();
    app.listen(3000, () => console.log("orders-service on 3000"));
  } catch (error) {
    console.error("startup error:", error);
    process.exit(1);
  }
}

start();