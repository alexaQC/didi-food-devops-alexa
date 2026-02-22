import axios from "axios";
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { createPool, ensureSchema, isMemoryMode } from "./db.js";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const port = process.env.PORT || 3000;

let memItems = [{ id: 1, text: "Hello FinLab", created_at: new Date().toISOString() }];
let httpServer;

const memoryMode = isMemoryMode();
const pool = createPool();

const USERS_SERVICE_URL =
  process.env.USERS_SERVICE_URL || "http://localhost:3001";
  
const ORDERS_SERVICE_URL =
  process.env.ORDERS_SERVICE_URL || "http://orders-service:3000";

function parseIntOrDefault(value, fallback) {
  const parsed = Number.parseInt(String(value || ""), 10);
  return Number.isNaN(parsed) ? fallback : parsed;
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function initDatabase() {
  if (!pool) return;

  const maxAttempts = parseIntOrDefault(process.env.DB_INIT_MAX_ATTEMPTS, 30);
  const retryDelayMs = parseIntOrDefault(process.env.DB_INIT_RETRY_DELAY_MS, 1000);

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      await ensureSchema(pool);
      console.log(`DB schema ready (attempt ${attempt}/${maxAttempts})`);
      return;
    } catch (error) {
      if (attempt === maxAttempts) throw error;
      console.error(
        `DB init failed (attempt ${attempt}/${maxAttempts}), retrying in ${retryDelayMs}ms:`,
        error.message
      );
      await delay(retryDelayMs);
    }
  }
}

async function dbOk() {
  if (!pool) return true; // Memory mode is always ready.
  const res = await pool.query("SELECT 1 AS ok");
  return res?.rows?.[0]?.ok === 1;
}

app.get("/healthz", (req, res) => res.status(200).send("ok"));

app.get("/readyz", async (req, res) => {
  try {
    const ok = await dbOk();
    return ok ? res.status(200).send("ready") : res.status(503).send("not ready");
  } catch (e) {
    return res.status(503).send("not ready");
  }
});

app.get("/api/items", async (req, res) => {
  try {
    if (!pool) return res.json(memItems);
    const { rows } = await pool.query("SELECT id, text, created_at FROM items ORDER BY id DESC LIMIT 200");
    return res.json(rows);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "db_error" });
  }
});

app.post("/api/items", async (req, res) => {
  const text = String(req.body?.text || "").trim();
  if (!text) return res.status(400).json({ error: "text_required" });

  try {
    if (!pool) {
      const nextId = (memItems[0]?.id || 0) + 1;
      const item = { id: nextId, text, created_at: new Date().toISOString() };
      memItems = [item, ...memItems];
      return res.status(201).json(item);
    }
    const { rows } = await pool.query(
      "INSERT INTO items(text) VALUES($1) RETURNING id, text, created_at",
      [text]
    );
    return res.status(201).json(rows[0]);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "db_error" });
  }
});

// =====================
// Gateway → Orders Service
// =====================

app.get("/api/orders", async (req, res) => {
  try {
    const response = await axios.get(`${ORDERS_SERVICE_URL}/orders`);
    res.json(response.data);
  } catch (error) {
    console.error("Error calling orders-service:", error.message);
    res.status(500).json({ error: "orders_service_unavailable" });
  }
});

app.post("/api/orders", async (req, res) => {
  try {
    const response = await axios.post(
      `${ORDERS_SERVICE_URL}/orders`,
      req.body
    );
    res.status(201).json(response.data);
  } catch (error) {
    console.error("Error calling orders-service:", error.message);
    res.status(500).json({ error: "orders_service_unavailable" });
  }
});

// =====================
// Didi Food (básico): Restaurants + Menu
// =====================

let memRestaurants = [
  { id: 1, name: "Taquería Don Pepe", category: "Mexicana" },
  { id: 2, name: "Pizza Express", category: "Italiana" },
  { id: 3, name: "Sushi Rápido", category: "Japonesa" },
];

let memMenu = [
  { id: 1, restaurantId: 1, name: "Tacos al pastor", price: 80 },
  { id: 2, restaurantId: 1, name: "Gringa", price: 95 },
  { id: 3, restaurantId: 2, name: "Pizza pepperoni", price: 150 },
  { id: 4, restaurantId: 2, name: "Pizza hawaiana", price: 160 },
  { id: 5, restaurantId: 3, name: "Sushi roll", price: 140 },
  { id: 6, restaurantId: 3, name: "Yakimeshi", price: 120 },
];

// GET /api/restaurants -> lista de restaurantes
app.get("/api/restaurants", async (req, res) => {
  try {
    return res.json(memRestaurants);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "restaurants_error" });
  }
});

// GET /api/restaurants/:id/menu -> menú de un restaurante
app.get("/api/restaurants/:id/menu", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const restaurant = memRestaurants.find((r) => r.id === id);
    if (!restaurant) return res.status(404).json({ error: "restaurant_not_found" });

    const menu = memMenu.filter((m) => m.restaurantId === id);
    return res.json({ restaurant, menu });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "menu_error" });
  }
});

// =====================
// Gateway → Users Service
// =====================

app.get("/api/users", async (req, res) => {
  try {
    const response = await axios.get(`${USERS_SERVICE_URL}/users`);
    res.json(response.data);
  } catch (error) {
    console.error("Error calling users-service:", error.message);
    res.status(500).json({ error: "users_service_unavailable" });
  }
});

app.post("/api/users", async (req, res) => {
  try {
    const response = await axios.post(`${USERS_SERVICE_URL}/users`, req.body);
    res.status(201).json(response.data);
  } catch (error) {
    console.error("Error calling users-service:", error.message);
    res.status(500).json({ error: "users_service_unavailable" });
  }
});

async function start() {
  if (pool) {
    pool.on("error", (err) => console.error("Postgres pool error:", err));
    console.log("DB mode: postgres");
    await initDatabase();
  } else if (memoryMode) {
    console.warn("DB mode: memory (set DB_MODE=postgres to use PostgreSQL)");
  }

  httpServer = app.listen(port, () => {
    console.log(`API listening on 0.0.0.0:${port}`);
  });
}

async function shutdown(signal) {
  console.log(`${signal} received, shutting down`);

  if (httpServer) {
    await new Promise((resolve) => httpServer.close(resolve));
  }

  if (pool) {
    await pool.end();
  }
}

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => {
    shutdown(signal)
      .then(() => process.exit(0))
      .catch((error) => {
        console.error("Shutdown failed:", error);
        process.exit(1);
      });
  });
}

start().catch((error) => {
  console.error("Startup failed:", error);
  process.exit(1);
});
