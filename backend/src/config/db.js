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
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
  ssl: toBool(process.env.DB_SSL) ? { rejectUnauthorized: false } : undefined,
});

function isTransientDisconnect(error) {
  return (
    ["PROTOCOL_CONNECTION_LOST", "ECONNRESET", "EPIPE"].includes(error.code) ||
    error.fatal === true ||
    /connection lost|server closed the connection|closed state/i.test(error.message || "")
  );
}

async function executeQuery(sql, params = []) {
  const connection = await pool.getConnection();
  let shouldRelease = true;
  try {
    const [rows] = await connection.execute(sql, params);
    return rows;
  } catch (error) {
    if (isTransientDisconnect(error) && typeof connection.destroy === "function") {
      connection.destroy();
      shouldRelease = false;
    } else {
      shouldRelease = true;
    }

    throw error;
  } finally {
    if (shouldRelease) {
      connection.release();
    }
  }
}

export async function query(sql, params = []) {
  try {
    return await executeQuery(sql, params);
  } catch (error) {
    if (isTransientDisconnect(error)) {
      return executeQuery(sql, params);
    }

    throw error;
  }
}

export default pool;
