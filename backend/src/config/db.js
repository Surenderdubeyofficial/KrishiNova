import mysql from "mysql2/promise";

function toBool(value) {
  return ["1", "true", "yes", "on"].includes(String(value || "").trim().toLowerCase());
}

const pool = mysql.createPool({
  host: process.env.DB_HOST || "127.0.0.1",
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "agriculture_portal",
  connectionLimit: Number(process.env.DB_CONNECTION_LIMIT || 10),
  waitForConnections: true,
  queueLimit: 0,
  ssl: toBool(process.env.DB_SSL) ? { rejectUnauthorized: false } : undefined,
});

export async function query(sql, params = []) {
  const [rows] = await pool.execute(sql, params);
  return rows;
}

export default pool;
