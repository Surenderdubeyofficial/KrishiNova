import pool from "../config/db.js";

export async function ensureAuthTables() {
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS user_login_history (
      login_id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      user_role VARCHAR(50) NOT NULL,
      user_id INT NOT NULL,
      user_name VARCHAR(255) NOT NULL,
      identifier VARCHAR(255) DEFAULT NULL,
      login_method VARCHAR(100) NOT NULL,
      logged_in_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_user_role (user_role),
      INDEX idx_logged_in_at (logged_in_at)
    )
  `);
}
