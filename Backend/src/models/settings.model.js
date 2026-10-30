import pool from "../configs/database.js";

export const createSettingsTable = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS system_settings (
      key VARCHAR(50) PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  // Initialize default is_accepting_messages to true if not set
  await pool.query(`
    INSERT INTO system_settings (key, value)
    VALUES ('is_accepting_messages', 'true')
    ON CONFLICT (key) DO NOTHING
  `);
};

export const getSetting = async (key, defaultValue = null) => {
  const { rows } = await pool.query(
    `SELECT value FROM system_settings WHERE key = $1`,
    [key]
  );
  return rows[0] ? rows[0].value : defaultValue;
};

export const setSetting = async (key, value) => {
  const { rows } = await pool.query(
    `INSERT INTO system_settings (key, value, updated_at)
     VALUES ($1, $2, NOW())
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()
     RETURNING key, value`,
    [key, String(value)]
  );
  return rows[0].value;
};

export const isAcceptingMessagesSetting = async () => {
  const val = await getSetting("is_accepting_messages", "true");
  return val === "true" || val === true;
};

export const setAcceptingMessagesSetting = async (boolVal) => {
  const strVal = boolVal ? "true" : "false";
  await setSetting("is_accepting_messages", strVal);

  // Sync to users table where role = 'admin' if any exist
  await pool.query(
    `UPDATE users SET is_accepting_messages = $1, updated_at = NOW() WHERE role = 'admin'`,
    [Boolean(boolVal)]
  );

  return Boolean(boolVal);
};

