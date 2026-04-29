import pool from "../config/db.js";

export async function ensureAuthTables() {
  await pool.execute(`
    ALTER TABLE admin
      ADD COLUMN IF NOT EXISTS admin_email VARCHAR(255) DEFAULT NULL,
      ADD COLUMN IF NOT EXISTS admin_mobile VARCHAR(20) DEFAULT NULL
  `);

  await pool.execute(`
    UPDATE admin
    SET admin_email = COALESCE(NULLIF(admin_email, ''), 'surenderdubey9582@gmail.com'),
        admin_mobile = COALESCE(NULLIF(admin_mobile, ''), '9582514339')
    WHERE admin_id = 1
  `);

  await pool.execute(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_admin_email_unique ON admin (admin_email)
  `);

  await pool.execute(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_admin_mobile_unique ON admin (admin_mobile)
  `);

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
