import express from "express";
import { messageLimiter } from "../middlewares/rateLimit.js";
import { validate } from "../middlewares/validate.js";
import { sendMessageSchema } from "../validators/message.validator.js";
import { getPublicProfile, sendMessage } from "../controllers/user.controller.js";

const router = express.Router();

// GET /api/users/:username
router.get("/:username", getPublicProfile);

// POST /api/users/:username/messages — anonymous, strictly rate-limited
router.post("/:username/messages", messageLimiter, validate(sendMessageSchema), sendMessage);

export default router;