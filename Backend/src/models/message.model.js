import pool from "../configs/database.js";
import { ApiError } from "../utils/ApiError.js";

export const createMessagesTable = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS messages (
      id         SERIAL      PRIMARY KEY,
      user_id    INTEGER     REFERENCES users(id) ON DELETE CASCADE,
      content    TEXT        NOT NULL CHECK (char_length(content) BETWEEN 1 AND 1000),
      is_read    BOOLEAN     DEFAULT FALSE,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  try {
    await pool.query(`ALTER TABLE messages ALTER COLUMN user_id DROP NOT NULL`);
  } catch {
    // Column already nullable
  }
};

/** Create an anonymous message (for public user submission to a specific admin or general) */
export const createAnonymousMessage = async (content, targetUserId = null) => {
  let recipientId = targetUserId;

  if (!recipientId) {
    const adminRes = await pool.query(
      `SELECT id FROM users
       WHERE role = 'admin' AND is_verified = TRUE AND is_accepting_messages = TRUE
       ORDER BY id ASC
       LIMIT 1`
    );
    recipientId = adminRes.rows[0]?.id || null;
  }

  if (!recipientId) {
    throw new ApiError(503, "No one is currently available to receive messages");
  }

  const { rows } = await pool.query(
    `INSERT INTO messages (user_id, content)
     VALUES ($1, $2)
     RETURNING id, user_id, content, is_read, created_at`,
    [recipientId, content]
  );
  return rows[0];
};

/** Queries for Admin Dashboard */
export const getAllMessagesForAdmin = async ({ limit = 100, offset = 0, status = "all", userId } = {}) => {
  const conditions = [];
  const values = [userId];
  let paramIdx = 2;
  conditions.push("user_id = $1");

  if (status === "unread") {
    conditions.push("is_read = FALSE");
  } else if (status === "read") {
    conditions.push("is_read = TRUE");
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  values.push(limit);
  const limitIdx = paramIdx++;
  values.push(offset);
  const offsetIdx = paramIdx++;

  const { rows } = await pool.query(
    `SELECT id, user_id, content, is_read, created_at
     FROM messages
     ${whereClause}
     ORDER BY created_at DESC
     LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
    values
  );
  return rows;
};

export const getMessageStats = async (userId) => {
  const { rows } = await pool.query(
    `SELECT 
      COUNT(*)::INTEGER AS total,
      COUNT(*) FILTER (WHERE is_read = FALSE)::INTEGER AS unread,
      COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE)::INTEGER AS today
    FROM messages
    WHERE user_id = $1`,
    [userId]
  );
  return rows[0] || { total: 0, unread: 0, today: 0 };
};

export const setMessageReadStatus = async (id, isRead = true, userId) => {
  const { rows } = await pool.query(
    `UPDATE messages
     SET is_read = $1
     WHERE id = $2 AND user_id = $3
     RETURNING id, is_read, created_at`,
    [isRead, id, userId]
  );
  return rows[0] || null;
};

export const markAllMessagesAsRead = async (userId) => {
  const { rowCount } = await pool.query(
    `UPDATE messages SET is_read = TRUE WHERE is_read = FALSE AND user_id = $1`,
    [userId]
  );
  return rowCount;
};

export const deleteMessageByAdmin = async (id, userId) => {
  const { rows } = await pool.query(
    `DELETE FROM messages WHERE id = $1 AND user_id = $2 RETURNING id`,
    [id, userId]
  );
  return rows[0] || null;
};

export const clearAllMessagesAdmin = async (userId) => {
  const { rowCount } = await pool.query(`DELETE FROM messages WHERE user_id = $1`, [userId]);
  return rowCount;
};

// Backward-compatible helpers
export const createMessage = async (userId, content) => {
  const { rows } = await pool.query(
    `INSERT INTO messages (user_id, content) VALUES ($1, $2) RETURNING *`,
    [userId, content]
  );
  return rows[0];
};

export const getMessagesByUserId = async (userId, { limit = 20, cursor } = {}) => {
  const values = [userId, limit];
  let cursorClause = "";

  if (cursor) {
    cursorClause = `AND id < $3`;
    values.push(cursor);
  }

  const { rows } = await pool.query(
    `SELECT * FROM messages
     WHERE user_id = $1 ${cursorClause}
     ORDER BY id DESC
     LIMIT $2`,
    values
  );
  return rows;
};

export const findMessageById = async (id) => {
  const { rows } = await pool.query(`SELECT * FROM messages WHERE id = $1`, [id]);
  return rows[0] || null;
};

export const markMessageRead = async (id, userId) => {
  const { rows } = await pool.query(
    `UPDATE messages SET is_read = TRUE
     WHERE id = $1 AND user_id = $2 RETURNING *`,
    [id, userId]
  );
  return rows[0] || null;
};

export const deleteMessageById = async (id, userId) => {
  const { rows } = await pool.query(
    `DELETE FROM messages WHERE id = $1 AND user_id = $2 RETURNING id`,
    [id, userId]
  );
  return rows[0] || null;
};
