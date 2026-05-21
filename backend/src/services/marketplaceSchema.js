import pool from "../config/db.js";

async function ensureColumn(table, column, definition) {
  const [columns] = await pool.execute(
    `SELECT COLUMN_NAME
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    [table, column],
  );
  if (!columns.length) {
    await pool.execute(`ALTER TABLE \`${table}\` ADD COLUMN ${definition}`);
  }
}

export async function ensureMarketplaceTables() {
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS users (
      user_id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      legacy_id INT NOT NULL,
      role ENUM('farmer','customer','admin') NOT NULL,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) DEFAULT NULL,
      phone VARCHAR(50) DEFAULT NULL,
      is_blocked TINYINT(1) NOT NULL DEFAULT 0,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uniq_legacy_role (legacy_id, role),
      INDEX idx_role (role)
    )
  `);

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS farmer_profiles (
      profile_id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      farmer_id INT NOT NULL UNIQUE,
      farm_name VARCHAR(255) DEFAULT NULL,
      bio TEXT DEFAULT NULL,
      location VARCHAR(255) DEFAULT NULL,
      district VARCHAR(255) DEFAULT NULL,
      state VARCHAR(255) DEFAULT NULL,
      documents_note VARCHAR(255) DEFAULT NULL,
      verification_status ENUM('PENDING','VERIFIED','REJECTED') NOT NULL DEFAULT 'PENDING',
      rating DECIMAL(3,2) NOT NULL DEFAULT 0,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS customer_profiles (
      profile_id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      customer_id INT NOT NULL UNIQUE,
      address VARCHAR(255) DEFAULT NULL,
      city VARCHAR(255) DEFAULT NULL,
      state VARCHAR(255) DEFAULT NULL,
      pincode VARCHAR(30) DEFAULT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS products (
      product_id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      farmer_id INT NOT NULL,
      name VARCHAR(255) NOT NULL,
      category VARCHAR(120) NOT NULL DEFAULT 'Crop',
      description TEXT DEFAULT NULL,
      location VARCHAR(255) DEFAULT NULL,
      price_per_kg DECIMAL(12,2) NOT NULL,
      stock_kg INT NOT NULL,
      status ENUM('PENDING','APPROVED','REJECTED','INACTIVE') NOT NULL DEFAULT 'PENDING',
      is_featured TINYINT(1) NOT NULL DEFAULT 0,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_farmer (farmer_id),
      INDEX idx_product_status (status),
      INDEX idx_product_search (name, location, category)
    )
  `);

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS orders (
      order_id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      customer_id INT NOT NULL,
      farmer_id INT NOT NULL,
      status ENUM('pending','accepted','packed','shipped','delivered','cancelled','rejected') NOT NULL DEFAULT 'pending',
      payment_status ENUM('PENDING','PAID','HELD','RELEASED','REFUNDED','FAILED') NOT NULL DEFAULT 'PENDING',
      total_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
      platform_commission DECIMAL(12,2) NOT NULL DEFAULT 0,
      farmer_payout DECIMAL(12,2) NOT NULL DEFAULT 0,
      delivery_confirmed_at DATETIME DEFAULT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_customer (customer_id),
      INDEX idx_farmer (farmer_id),
      INDEX idx_status (status)
    )
  `);

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS order_items (
      item_id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      order_id INT NOT NULL,
      product_id INT NOT NULL,
      product_name VARCHAR(255) NOT NULL,
      quantity_kg INT NOT NULL,
      unit_price DECIMAL(12,2) NOT NULL,
      line_total DECIMAL(12,2) NOT NULL,
      INDEX idx_order (order_id)
    )
  `);

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS payments (
      payment_id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      order_id INT NOT NULL UNIQUE,
      provider VARCHAR(80) NOT NULL DEFAULT 'Razorpay',
      provider_order_id VARCHAR(255) DEFAULT NULL,
      provider_payment_id VARCHAR(255) DEFAULT NULL,
      amount DECIMAL(12,2) NOT NULL,
      status ENUM('PENDING','PAID','HELD','RELEASED','REFUNDED','FAILED') NOT NULL DEFAULT 'PENDING',
      raw_response JSON DEFAULT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_payment_status (status)
    )
  `);

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS payouts (
      payout_id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      order_id INT NOT NULL UNIQUE,
      farmer_id INT NOT NULL,
      amount DECIMAL(12,2) NOT NULL,
      status ENUM('PENDING','RELEASED','ON_HOLD','REFUNDED') NOT NULL DEFAULT 'PENDING',
      released_at DATETIME DEFAULT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_farmer_payout (farmer_id),
      INDEX idx_payout_status (status)
    )
  `);

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS chats (
      chat_id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      order_id INT NOT NULL UNIQUE,
      customer_id INT NOT NULL,
      farmer_id INT NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS messages (
      message_id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      chat_id INT NOT NULL,
      sender_role ENUM('farmer','customer','admin') NOT NULL,
      sender_id INT NOT NULL,
      message TEXT NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_chat_messages (chat_id, created_at)
    )
  `);

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS reviews (
      review_id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      order_id INT NOT NULL,
      product_id INT DEFAULT NULL,
      farmer_id INT NOT NULL,
      customer_id INT NOT NULL,
      rating INT NOT NULL,
      comment TEXT DEFAULT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uniq_order_review (order_id, customer_id)
    )
  `);

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS disputes (
      dispute_id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      order_id INT NOT NULL,
      customer_id INT NOT NULL,
      farmer_id INT NOT NULL,
      reason VARCHAR(255) NOT NULL,
      details TEXT DEFAULT NULL,
      status ENUM('OPEN','VALID','REJECTED','REFUNDED','CLOSED') NOT NULL DEFAULT 'OPEN',
      admin_note TEXT DEFAULT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_dispute_status (status)
    )
  `);

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS notifications (
      notification_id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      user_role ENUM('farmer','customer','admin') NOT NULL,
      user_id INT NOT NULL,
      title VARCHAR(255) NOT NULL,
      message TEXT NOT NULL,
      is_read TINYINT(1) NOT NULL DEFAULT 0,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_notification_user (user_role, user_id, is_read)
    )
  `);

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS featured_listings (
      featured_id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      product_id INT NOT NULL UNIQUE,
      title VARCHAR(255) DEFAULT NULL,
      active TINYINT(1) NOT NULL DEFAULT 1,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS admin_settings (
      setting_key VARCHAR(100) NOT NULL PRIMARY KEY,
      setting_value VARCHAR(255) NOT NULL,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS invoices (
      invoice_id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      order_id INT NOT NULL UNIQUE,
      invoice_number VARCHAR(60) NOT NULL UNIQUE,
      customer_snapshot JSON NOT NULL,
      farmer_snapshot JSON NOT NULL,
      items_snapshot JSON NOT NULL,
      subtotal DECIMAL(12,2) NOT NULL,
      platform_commission DECIMAL(12,2) NOT NULL,
      total DECIMAL(12,2) NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await pool.execute(`
    INSERT INTO admin_settings (setting_key, setting_value)
    VALUES ('commission_percentage', '10')
    ON DUPLICATE KEY UPDATE setting_key = setting_key
  `);

  await ensureColumn("users", "is_blocked", "is_blocked TINYINT(1) NOT NULL DEFAULT 0");
}
