import express from "express";
import pkg from "pg";
import dotenv from "dotenv";
import cors from "cors";

dotenv.config();

const { Pool } = pkg;

const app = express();
app.use(cors());
app.use(express.json());

const port = process.env.PORT || 3000;

const pool = new Pool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT,
});

// Crear tabla si no existe
async function initDB() {
  // Espera DB con retry para evitar race condition
  const retries = 30;
  for (let i = 1; i <= retries; i++) {
    try {
      await pool.query("SELECT 1");
      break;
    } catch (err) {
      console.log(`waiting for orders postgres... (${i}/${retries})`);
      await new Promise((r) => setTimeout(r, 1000));
      if (i === retries) throw err;
    }
  }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS orders (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL,
      total NUMERIC(10,2) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

// GET /orders → lista órdenes
app.get("/orders", async (req, res) => {
  try {
    const { rows } = await pool.query("SELECT * FROM orders ORDER BY id DESC");
    res.json(rows);
  } catch (err) {
    console.error("GET /orders error:", err.message);
    res.status(500).json({ error: "orders_fetch_error" });
  }
});

// POST /orders → crea orden
app.post("/orders", async (req, res) => {
  try {
    // Aceptar ambos formatos:
    // 1) { "user_id": 1, "total": 199.99 }
    // 2) { "userId": 1, "items": [...] } donde total = items.length

    const userId = req.body.userId ?? req.body.user_id;

    let total = req.body.total;

    if ((total === undefined || total === null || total === "") && Array.isArray(req.body.items)) {
      total = req.body.items.length;
    }

    // Validaciones mínimas (permitimos total=0? normalmente no; aquí lo exigimos > 0)
    const totalNumber = Number(total);

    if (!userId || Number.isNaN(totalNumber) || totalNumber <= 0) {
      return res.status(400).json({
        error: "userId/user_id and total (or items) required; total must be > 0",
      });
    }

    const { rows } = await pool.query(
      "INSERT INTO orders(user_id, total) VALUES($1, $2) RETURNING *",
      [userId, totalNumber]
    );

    console.log("ORDER_CREATED", rows[0].id);

    res.status(201).json(rows[0]);
  } catch (err) {
    console.error("POST /orders error:", err.message);
    res.status(500).json({ error: "orders_insert_error" });
  }
});

// Healthcheck (tu Helm de orders usa /health, NO lo cambies)
app.get("/health", (req, res) => res.send("ok"));
app.get("/healthz", (req, res) => res.send("ok"));

initDB().then(() => {
  app.listen(port, () => {
    console.log(`orders-service running on port ${port}`);
  });
}).catch((err) => {
  console.error("orders-service initDB failed:", err.message);
  process.exit(1);
});