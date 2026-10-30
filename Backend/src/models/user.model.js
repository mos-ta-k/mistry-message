import pool from "../configs/database.js";

export const createUsersTable = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id                    SERIAL       PRIMARY KEY,
      username              VARCHAR(50)  UNIQUE NOT NULL,
      email                 VARCHAR(255) UNIQUE NOT NULL,
      password              TEXT         NOT NULL,
      role                  VARCHAR(10)  NOT NULL DEFAULT 'user'
                              CHECK (role IN ('user', 'admin')),
      verify_code           CHAR(6),
      verify_code_expiry    TIMESTAMPTZ,
      verify_resend_count   SMALLINT     DEFAULT 0,
      verify_resend_reset   TIMESTAMPTZ  DEFAULT NOW(),
      is_verified           BOOLEAN      DEFAULT FALSE,
      is_accepting_messages BOOLEAN      DEFAULT TRUE,
      created_at            TIMESTAMPTZ  DEFAULT NOW(),
      updated_at            TIMESTAMPTZ  DEFAULT NOW()
    )
  `);
};

export const seedDefaultAdmin = async () => {
  await pool.query(
    `UPDATE users
     SET role = CASE WHEN is_verified THEN 'admin' ELSE 'user' END,
         updated_at = NOW()
     WHERE role <> CASE WHEN is_verified THEN 'admin' ELSE 'user' END`
  );
};

// Queries

export const createUser = async ({
  username,
  email,
  password,
  verifyCode = null,
  verifyCodeExpiry = null,
  role = "user",
  isVerified = false,
}) => {
  const { rows } = await pool.query(
    `INSERT INTO users (username, email, password, verify_code, verify_code_expiry, role, is_verified)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id, username, email, is_verified, is_accepting_messages, role, created_at`,
    [username, email, password, verifyCode, verifyCodeExpiry, role, isVerified]
  );
  return rows[0];
};

export const findUserByEmail = async (email) => {
  const { rows } = await pool.query(`SELECT * FROM users WHERE email = $1`, [email]);
  return rows[0] || null;
};

export const findUserById = async (id) => {
  const { rows } = await pool.query(
    `SELECT id, username, email, role, is_verified, is_accepting_messages, created_at
     FROM users WHERE id = $1`,
    [id]
  );
  return rows[0] || null;
};

export const findUserByUsername = async (username) => {
  const { rows } = await pool.query(
    `SELECT id, username, is_accepting_messages FROM users WHERE username = $1`,
    [username]
  );
  return rows[0] || null;
};

export const findDefaultAdmin = async () => {
  const { rows } = await pool.query(
    `SELECT id, username, is_accepting_messages
     FROM users
     WHERE role = 'admin' AND is_verified = TRUE
     ORDER BY id ASC
     LIMIT 1`
  );
  return rows[0] || null;
};

export const findUserByUsernameOrEmail = async (identifier) => {
  const { rows } = await pool.query(
    `SELECT * FROM users WHERE email = $1 OR username = $1 LIMIT 1`,
    [identifier]
  );
  return rows[0] || null;
};

/** Mark user as verified, clear verify fields */
export const verifyUser = async (email, code) => {
  const { rows } = await pool.query(
    `UPDATE users
     SET is_verified = TRUE,
         role = 'admin',
         verify_code = NULL,
         verify_code_expiry = NULL,
         verify_resend_count = 0,
         updated_at = NOW()
     WHERE email = $1
       AND verify_code = $2
       AND verify_code_expiry > NOW()
     RETURNING id, username, email, is_verified, role, is_accepting_messages`,
    [email, code]
  );
  return rows[0] || null;
};

export const activateUnverifiedUser = async (id) => {
  const { rows } = await pool.query(
    `UPDATE users
     SET is_verified = TRUE,
         role = 'admin',
         verify_code = NULL,
         verify_code_expiry = NULL,
         verify_resend_count = 0,
         updated_at = NOW()
     WHERE id = $1 AND is_verified = FALSE
     RETURNING id, username, email, is_verified, is_accepting_messages, role, created_at`,
    [id]
  );
  return rows[0] || null;
};

/** Set a fresh verify code (tracks resend count per hour) */
export const setVerifyCode = async (email, code, expiresAt) => {
  const { rows } = await pool.query(
    `UPDATE users
     SET verify_code = $1,
         verify_code_expiry = $2,
         verify_resend_count = CASE
           WHEN verify_resend_reset < NOW() - INTERVAL '1 hour'
             THEN 1
           ELSE verify_resend_count + 1
         END,
         verify_resend_reset = CASE
           WHEN verify_resend_reset < NOW() - INTERVAL '1 hour'
             THEN NOW()
           ELSE verify_resend_reset
         END,
         updated_at = NOW()
     WHERE email = $3
       AND is_verified = FALSE
     RETURNING id, email, verify_resend_count`,
    [code, expiresAt, email]
  );
  return rows[0] || null;
};

export const deleteUnverifiedUser = async (id) => {
  await pool.query(
    `DELETE FROM users WHERE id = $1 AND is_verified = FALSE`,
    [id]
  );
};

export const updatePassword = async (id, password) => {
  const { rows } = await pool.query(
    `UPDATE users SET password = $1, updated_at = NOW() WHERE id = $2 RETURNING id, email`,
    [password, id]
  );
  return rows[0] || null;
};

export const setAcceptingMessages = async (id, value) => {
  const { rows } = await pool.query(
    `UPDATE users SET is_accepting_messages = $1, updated_at = NOW()
     WHERE id = $2 RETURNING id, username, is_accepting_messages`,
    [value, id]
  );
  return rows[0] || null;
};

export const listAllUsers = async () => {
  const { rows } = await pool.query(
    `SELECT id, username, email, role, is_verified, is_accepting_messages, created_at
     FROM users ORDER BY created_at DESC`
  );
  return rows;
};
