import asyncHandler from "../utils/asyncHandler.js";
import pool from "../configs/database.js";
import { findUserByUsername } from "../models/user.model.js";
import {
  getAllMessagesForAdmin,
  getMessageStats,
  setMessageReadStatus,
  markAllMessagesAsRead,
  deleteMessageByAdmin,
  clearAllMessagesAdmin,
} from "../models/message.model.js";
import { ApiError } from "../utils/ApiError.js";

/** GET /api/admin/status — get message accepting status & summary for the current admin */
export const getAdminStatus = asyncHandler(async (req, res) => {
  const userId = req.user?.id;
  
  const { rows } = await pool.query(`SELECT is_accepting_messages FROM users WHERE id = $1`, [userId]);
  const isAccepting = rows[0]?.is_accepting_messages ?? true;

  const stats = await getMessageStats(userId);

  res.status(200).json({
    success: true,
    isAcceptingMessages: Boolean(isAccepting),
    stats,
    user: req.user,
  });
});

/** PATCH /api/admin/toggle-status — toggle accepting messages */
export const toggleAcceptingStatus = asyncHandler(async (req, res) => {
  const { isAcceptingMessages } = req.body;
  if (typeof isAcceptingMessages !== "boolean") {
    throw new ApiError(400, "isAcceptingMessages must be a boolean");
  }

  const userId = req.user?.id;

  await pool.query(
    `UPDATE users SET is_accepting_messages = $1, updated_at = NOW() WHERE id = $2`,
    [isAcceptingMessages, userId]
  );

  res.status(200).json({
    success: true,
    isAcceptingMessages,
    message: isAcceptingMessages
      ? "Message reception is now ACTIVE. Users can send messages."
      : "Message reception is now PAUSED. Users cannot send messages.",
  });
});

/**  - GET /api/admin/messages 
 *  - get all messages with timestamps & stats 
*/
export const getAdminMessages = asyncHandler(async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 100, 200);
  const offset = Number(req.query.offset) || 0;
  const status = req.query.status || "all";
  const userId = req.user?.id;

  const messages = await getAllMessagesForAdmin({ limit, offset, status, userId });
  const stats = await getMessageStats(userId);

  const { rows } = await pool.query(`SELECT is_accepting_messages FROM users WHERE id = $1`, [userId]);
  const isAccepting = rows[0]?.is_accepting_messages ?? true;

  res.status(200).json({
    success: true,
    messages,
    stats,
    isAcceptingMessages: Boolean(isAccepting),
  });
});

/** PATCH /api/admin/handle — customize personal message URL handle */
export const updateAdminHandle = asyncHandler(async (req, res) => {
  const { username } = req.body;
  if (!username || typeof username !== "string") {
    throw new ApiError(400, "Username handle is required");
  }

  const cleanHandle = username.trim().toLowerCase();
  if (cleanHandle.length < 3 || cleanHandle.length > 30) {
    throw new ApiError(400, "Handle must be between 3 and 30 characters");
  }

  if (!/^[a-zA-Z0-9_]+$/.test(cleanHandle)) {
    throw new ApiError(400, "Handle can only contain letters, numbers, and underscores");
  }

  const existing = await findUserByUsername(cleanHandle);
  if (existing && existing.id !== req.user.id) {
    throw new ApiError(409, "This handle is already taken. Please choose another.");
  }

  const { rows } = await pool.query(
    `UPDATE users SET username = $1, updated_at = NOW() WHERE id = $2
     RETURNING id, username, email, role, is_accepting_messages`,
    [cleanHandle, req.user.id]
  );

  res.status(200).json({
    success: true,
    message: `Your custom link is now: /?to=${encodeURIComponent(cleanHandle)}`,
    user: rows[0],
  });
});

/** PATCH /api/admin/messages/:id/read — mark single message as read/unread */
export const markMessageRead = asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const isRead = typeof req.body.isRead === "boolean" ? req.body.isRead : true;
  const userId = req.user?.id;

  const updated = await setMessageReadStatus(id, isRead, userId);
  if (!updated) throw new ApiError(404, "Message not found");

  res.status(200).json({
    success: true,
    message: updated,
  });
});

/** PATCH /api/admin/messages/read-all — mark all messages read */
export const markAllRead = asyncHandler(async (req, res) => {
  const userId = req.user?.id;
  const count = await markAllMessagesAsRead(userId);
  res.status(200).json({
    success: true,
    message: `Marked ${count} messages as read`,
  });
});

/** DELETE /api/admin/messages/:id — delete a message */
export const deleteMessage = asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const userId = req.user?.id;
  const deleted = await deleteMessageByAdmin(id, userId);
  if (!deleted) throw new ApiError(404, "Message not found");

  res.status(200).json({
    success: true,
    message: "Message deleted successfully",
  });
});

/** DELETE /api/admin/messages — clear all messages */
export const clearAllMessages = asyncHandler(async (req, res) => {
  const userId = req.user?.id;
  const count = await clearAllMessagesAdmin(userId);
  res.status(200).json({
    success: true,
    message: `Cleared ${count} messages`,
  });
});
