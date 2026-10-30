import express from "express";
import authenticate from "../middlewares/auth.js";
import { authorize } from "../middlewares/rbac.js";
import {
  getAdminStatus,
  toggleAcceptingStatus,
  getAdminMessages,
  updateAdminHandle,
  markMessageRead,
  markAllRead,
  deleteMessage,
  clearAllMessages,
} from "../controllers/admin.controller.js";

const router = express.Router();

// All admin routes require a valid access token AND admin role
router.use(authenticate, authorize("admin"));

router.get("/status", getAdminStatus);
router.patch("/toggle-status", toggleAcceptingStatus);
router.patch("/handle", updateAdminHandle);

router.get("/messages", getAdminMessages);
router.patch("/messages/read-all", markAllRead);
router.patch("/messages/:id/read", markMessageRead);
router.delete("/messages/:id", deleteMessage);
router.delete("/messages", clearAllMessages);

export default router;
