import rateLimit from "express-rate-limit";

const json429 = (req, res) =>
  res.status(429).json({ message: "Too many requests, please try again later." });

/** General API limiter */
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 100,
  handler: json429,
  standardHeaders: true,
  legacyHeaders: false,
});

/** Strict limiter for auth endpoints */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  handler: json429,
  standardHeaders: true,
  legacyHeaders: false,
});

/** Very strict limiter for sending anonymous messages (per IP) */
export const messageLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20,
  handler: json429,
  standardHeaders: true,
  legacyHeaders: false,
});

/** Resend-verify-code limiter — 3 per hour */
export const resendLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
  handler: json429,
  standardHeaders: true,
  legacyHeaders: false,
});
