import express from "express";
import pkg from "pg";
import dotenv from "dotenv";
import cors from "cors";

dotenv.config();

const { Pool } = pkg;

const app = express();
app.use(cors());
app.use(express.json());

const port = process.env.PORT || 3001;

const pool = new Pool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT,
});

// Crear tabla si no existe
async function initDB() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL
    )
  `);
}

// Endpoints
app.get("/users", async (req, res) => {
  const { rows } = await pool.query("SELECT * FROM users ORDER BY id DESC");
  res.json(rows);
});

app.post("/users", async (req, res) => {
  const { name, email } = req.body;

  const { rows } = await pool.query(
    "INSERT INTO users(name, email) VALUES($1, $2) RETURNING *",
    [name, email]
  );

  console.log("USER_CREATED", rows[0].id);

  res.status(201).json(rows[0]);
});

app.get("/healthz", (req, res) => res.send("ok"));

initDB().then(() => {
  app.listen(port, () => {
    console.log(`users-service running on port ${port}`);
  });
});
