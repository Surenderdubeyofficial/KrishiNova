import pool from "../config/db.js";

export async function ensureRobotMemoryTables() {
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS ai_robot_memory (
      memory_id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      session_id VARCHAR(120) NOT NULL,
      user_role VARCHAR(40) NOT NULL DEFAULT 'guest',
      memory_key VARCHAR(120) NOT NULL,
      memory_value TEXT NOT NULL,
      confidence DECIMAL(4,3) NOT NULL DEFAULT 1,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uniq_robot_memory (session_id, memory_key),
      INDEX idx_robot_session (session_id)
    )
  `);

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS ai_robot_interactions (
      interaction_id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      session_id VARCHAR(120) NOT NULL,
      user_role VARCHAR(40) NOT NULL DEFAULT 'guest',
      language_code VARCHAR(20) NOT NULL DEFAULT 'en-IN',
      detected_language VARCHAR(20) DEFAULT NULL,
      intent_type VARCHAR(80) NOT NULL DEFAULT 'conversation',
      action_type VARCHAR(80) DEFAULT NULL,
      user_message TEXT NOT NULL,
      assistant_response TEXT DEFAULT NULL,
      action_payload JSON DEFAULT NULL,
      provider VARCHAR(80) DEFAULT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_robot_interactions_session (session_id, created_at),
      INDEX idx_robot_interactions_intent (intent_type)
    )
  `);
}

