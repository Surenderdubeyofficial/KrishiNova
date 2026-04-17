import pool from "../config/db.js";

export async function ensureInvoiceTables() {
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS customer_invoices (
      invoice_id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      invoice_number VARCHAR(50) NOT NULL UNIQUE,
      customer_id INT NOT NULL,
      customer_name VARCHAR(255) NOT NULL,
      customer_email VARCHAR(255) NOT NULL,
      customer_phone VARCHAR(255) NOT NULL,
      customer_state VARCHAR(255) NOT NULL,
      customer_city VARCHAR(255) NOT NULL,
      customer_address VARCHAR(255) NOT NULL,
      customer_pincode VARCHAR(50) NOT NULL,
      payment_method VARCHAR(100) NOT NULL,
      payment_reference VARCHAR(255) DEFAULT NULL,
      subtotal DECIMAL(12, 2) NOT NULL,
      total DECIMAL(12, 2) NOT NULL,
      purchased_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS customer_invoice_items (
      item_id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      invoice_id INT NOT NULL,
      crop_name VARCHAR(255) NOT NULL,
      quantity INT NOT NULL,
      unit_price DECIMAL(12, 2) NOT NULL,
      line_total DECIMAL(12, 2) NOT NULL,
      INDEX idx_invoice_id (invoice_id)
    )
  `);
}
