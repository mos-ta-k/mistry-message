import express from "express";
import {
  getMessageReceptionStatus,
  sendPublicAnonymousMessage,
} from "../controllers/publicMessage.controller.js";

const router = express.Router();

// Public routes — no authentication required
router.get("/status", getMessageReceptionStatus);
router.post("/", sendPublicAnonymousMessage);

export default router;

