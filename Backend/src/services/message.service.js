import { ApiError } from "../utils/ApiError.js";
import { findUserByUsername } from "../models/user.model.js";
import {
  createMessage,
  getMessagesByUserId,
  findMessageById,
  markMessageRead,
  deleteMessageById,
  deleteMessageByAdmin,
} from "../models/message.model.js";

export const sendAnonymousMessage = async (username, content) => {
  const recipient = await findUserByUsername(username);
  if (!recipient) throw new ApiError(404, "User not found");
  if (!recipient.is_accepting_messages) throw new ApiError(403, "This user is not accepting messages");

  return createMessage(recipient.id, content);
};

export const getInbox = async (userId, { limit, cursor }) => {
  const limitNum = Math.min(Number(limit) || 20, 100);
  const cursorNum = cursor ? Number(cursor) : undefined;
  return getMessagesByUserId(userId, { limit: limitNum, cursor: cursorNum });
};

export const readMessage = async (messageId, userId) => {
  const msg = await markMessageRead(messageId, userId);
  if (!msg) throw new ApiError(404, "Message not found");
  return msg;
};

export const removeMessage = async (messageId, userId) => {
  const msg = await deleteMessageById(messageId, userId);
  if (!msg) throw new ApiError(404, "Message not found");
  return msg;
};

export const adminRemoveMessage = async (messageId) => {
  const msg = await deleteMessageByAdmin(messageId);
  if (!msg) throw new ApiError(404, "Message not found");
  return msg;
};
