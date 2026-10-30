import express from "express";
import authenticate from "../middlewares/auth.js";
import { getMe, updateSettings, getMessages, markRead, deleteMessage } from "../controllers/me.controller.js";

const router = express.Router();

router.use(authenticate);

router.get("/",getMe);
router.patch("/settings",updateSettings);
router.get("/messages",getMessages);
router.patch("/messages/:id/read",markRead);
router.delete("/messages/:id",deleteMessage);

export default router;
