import express from "express";
import { validate } from "../middlewares/validate.js";
import { authLimiter, resendLimiter } from "../middlewares/rateLimit.js";
import authenticate from "../middlewares/auth.js";
import {
  registerSchema,
  verifySchema,
  resendCodeSchema,
  loginSchema,
  changePasswordSchema,
} from "../validators/auth.validator.js";
import {
  register,
  verify,
  resendCode,
  login,
  refresh,
  logout,
  changePassword,
} from "../controllers/auth.controller.js";

const router = express.Router();

// Public
router.post("/register",authLimiter,validate(registerSchema),register);
router.post("/verify",authLimiter,validate(verifySchema),verify);
router.post("/resend-code",resendLimiter,validate(resendCodeSchema),resendCode);
router.post("/login",authLimiter,validate(loginSchema),login);
router.post("/refresh",refresh);
router.post("/logout",logout);

// Protected 
router.put("/change-password", authenticate, validate(changePasswordSchema), changePassword);

export default router;
