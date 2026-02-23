import express from "express";
import pkg from "pg";
import dotenv from "dotenv";
import cors from "cors";

dotenv.config();

const { Pool } = pkg;

const app = express();
app.use(cors());
app.use(express.json());

const port = process.env.PORT || 3002;

const pool = new Pool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT,
});

// crear tabla payments
async function initDB() {
  const retries = 30;
  for (let i = 1; i <= retries; i++) {
    try {
      await pool.query("SELECT 1");
      break;
    } catch {
      console.log(`waiting for payments postgres... (${i}/${retries})`);
      await new Promise((r) => setTimeout(r, 1000));
    }
  }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS payments (
      id SERIAL PRIMARY KEY,
      order_id INTEGER NOT NULL,
      amount NUMERIC(10,2) NOT NULL,
      status BOOLEAN NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

app.get("/payments", async (req, res) => {
  const { rows } = await pool.query("SELECT * FROM payments ORDER BY id DESC");
  res.json(rows);
});

app.post("/payments", async (req, res) => {
  try {
    const { orderId, amount } = req.body;

    if (!orderId || !amount) {
      return res.status(400).json({ success: false });
    }

    // lógica fake: siempre aprobado
    const status = true;

    const { rows } = await pool.query(
      "INSERT INTO payments(order_id, amount, status) VALUES($1, $2, $3) RETURNING *",
      [orderId, amount, status]
    );

    res.status(201).json({
      success: status,
      payment: rows[0],
    });
  } catch (err) {
    console.error("POST /payments error:", err.message);
    res.status(500).json({ success: false });
  }
});

app.get("/health", (req, res) => res.send("ok"));
app.get("/healthz", (req, res) => res.send("ok"));

initDB().then(() => {
  app.listen(port, () => {
    console.log(`payments-service running on port ${port}`);
  });
}).catch((err) => {
  console.error("payments-service initDB failed:", err.message);
  process.exit(1);
});