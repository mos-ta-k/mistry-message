import asyncHandler from "../utils/asyncHandler.js";
import { setAcceptingMessages } from "../models/user.model.js";
import { getInbox, readMessage, removeMessage } from "../services/message.service.js";

/** GET /api/me */
export const getMe = asyncHandler(async (req, res) => {
  res.status(200).json({ success: true, user: req.user });
});

/** PATCH /api/me/settings — toggle isAcceptingMessages */
export const updateSettings = asyncHandler(async (req, res) => {
  const { isAcceptingMessages } = req.body;
  if (typeof isAcceptingMessages !== "boolean") {
    return res.status(400).json({ success: false, message: "isAcceptingMessages must be a boolean" });
  }
  const user = await setAcceptingMessages(req.user.id, isAcceptingMessages);
  res.status(200).json({ success: true, user });
});

/** GET /api/me/messages?cursor=&limit= */
export const getMessages = asyncHandler(async (req, res) => {
  const messages = await getInbox(req.user.id, req.query);
  const nextCursor = messages.length ? messages[messages.length - 1].id : null;
  res.status(200).json({ success: true, messages, nextCursor });
});

/** PATCH /api/me/messages/:id/read */
export const markRead = asyncHandler(async (req, res) => {
  const msg = await readMessage(Number(req.params.id), req.user.id);
  res.status(200).json({ success: true, message: msg });
});

/** DELETE /api/me/messages/:id */
export const deleteMessage = asyncHandler(async (req, res) => {
  await removeMessage(Number(req.params.id), req.user.id);
  res.status(204).send();
});
