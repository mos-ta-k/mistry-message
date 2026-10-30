import jwt from "jsonwebtoken";
import crypto from "crypto";

/**
 * Generate a short-lived JWT access token (15 min).
 * Returned in the JSON response body — never stored in a cookie.
 */
export const generateAccessToken = (userId, role = "user") =>
  jwt.sign({ id: userId, role }, process.env.JWT_SECRET, { expiresIn: "15m" });

/**
 * Generate a long-lived opaque refresh token (random bytes).
 * The raw token goes into the httpOnly cookie; only its hash is stored in DB.
 */
export const generateRefreshToken = () =>
  crypto.randomBytes(40).toString("hex");

/**
 * SHA-256 hash of a refresh token for safe DB storage.
 */
export const hashToken = (token) =>
  crypto.createHash("sha256").update(token).digest("hex");

/**
 * Verify a JWT access token and return its payload.
 */
export const verifyAccessToken = (token) =>
  jwt.verify(token, process.env.JWT_SECRET);
