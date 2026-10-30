import pool from "../configs/database.js";

export const createRefreshTokensTable = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS refresh_tokens (
      id         SERIAL      PRIMARY KEY,
      user_id    INTEGER     NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token_hash TEXT        UNIQUE NOT NULL,
      expires_at TIMESTAMPTZ NOT NULL,
      revoked    BOOLEAN     DEFAULT FALSE,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
};

// Queries 

export const storeRefreshToken = async (userId, tokenHash, expiresAt) => {
  const { rows } = await pool.query(
    `INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
     VALUES ($1, $2, $3) RETURNING id`,
    [userId, tokenHash, expiresAt]
  );
  return rows[0];
};

/** Find a valid (non-revoked, non-expired) token by its hash */
export const findRefreshToken = async (tokenHash) => {
  const { rows } = await pool.query(
    `SELECT * FROM refresh_tokens
     WHERE token_hash = $1 AND revoked = FALSE AND expires_at > NOW()`,
    [tokenHash]
  );
  return rows[0] || null;
};

/** Revoke one specific token (rotation) */
export const revokeRefreshToken = async (tokenHash) => {
  await pool.query(
    `UPDATE refresh_tokens SET revoked = TRUE WHERE token_hash = $1`,
    [tokenHash]
  );
};

/** Revoke all tokens for a user (full logout) */
export const revokeAllUserTokens = async (userId) => {
  await pool.query(
    `UPDATE refresh_tokens SET revoked = TRUE WHERE user_id = $1`,
    [userId]
  );
};
