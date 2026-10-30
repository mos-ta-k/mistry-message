import asyncHandler from "../utils/asyncHandler.js";
import { findUserByUsername } from "../models/user.model.js";
import { sendAnonymousMessage } from "../services/message.service.js";
import { ApiError } from "../utils/ApiError.js";

/** GET /api/users/:username — public profile */
export const getPublicProfile = asyncHandler(async (req, res) => {
  const user = await findUserByUsername(req.params.username);
  if (!user) throw new ApiError(404, "User not found");

  res.status(200).json({
    success: true,
    user: {
      username: user.username,
      isAcceptingMessages: user.is_accepting_messages,
    },
  });
});

/** POST /api/users/:username/messages — send anonymous message */
export const sendMessage = asyncHandler(async (req, res) => {
  const message = await sendAnonymousMessage(req.params.username, req.body.content);
  res.status(201).json({ success: true, message });
});
