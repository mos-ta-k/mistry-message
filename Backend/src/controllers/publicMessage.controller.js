import asyncHandler from "../utils/asyncHandler.js";
import { createAnonymousMessage } from "../models/message.model.js";
import { findDefaultAdmin, findUserByUsername } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";

/** GET /api/messages/status — check whether message reception is active (globally or for a specific username) */
export const getMessageReceptionStatus = asyncHandler(async (req, res) => {
  const { username } = req.query;

  if (username) {
    const user = await findUserByUsername(username.trim());
    if (!user) {
      throw new ApiError(404, `User @${username} not found`);
    }

    return res.status(200).json({
      success: true,
      username: user.username,
      isAcceptingMessages: Boolean(user.is_accepting_messages),
    });
  }

  const defaultRecipient = await findDefaultAdmin();
  const isAccepting = Boolean(defaultRecipient?.is_accepting_messages);
  res.status(200).json({
    success: true,
    isAcceptingMessages: isAccepting,
  });
});

/** POST /api/messages — send anonymous message (no account required) */
export const sendPublicAnonymousMessage = asyncHandler(async (req, res) => {
  const { content, username } = req.body;

  if (!content || typeof content !== "string" || content.trim().length === 0) {
    throw new ApiError(400, "Message content is required");
  }

  const trimmed = content.trim();
  if (trimmed.length > 1000) {
    throw new ApiError(400, "Message cannot exceed 1000 characters");
  }

  let targetUserId = null;
  let recipientName = "Admin";

  if (username && username.trim().length > 0) {
    const targetUser = await findUserByUsername(username.trim());
    if (!targetUser) {
      throw new ApiError(404, `Recipient @${username} does not exist`);
    }

    if (!targetUser.is_accepting_messages) {
      throw new ApiError(
        403,
        `@${targetUser.username} is currently not accepting new messages. Please try again later.`
      );
    }

    targetUserId = targetUser.id;
    recipientName = targetUser.username;
  } else {
    const defaultRecipient = await findDefaultAdmin();
    if (!defaultRecipient) {
      throw new ApiError(503, "No one is currently available to receive messages");
    }

    if (!defaultRecipient.is_accepting_messages) {
      throw new ApiError(
        403,
        `@${defaultRecipient.username} is currently not accepting new messages. Please try again later.`
      );
    }

    targetUserId = defaultRecipient.id;
    recipientName = defaultRecipient.username;
  }

  const message = await createAnonymousMessage(trimmed, targetUserId);

  res.status(201).json({
    success: true,
    message: `Your message to ${recipientName} was sent anonymously!`,
    data: message,
  });
});
