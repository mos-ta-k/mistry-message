import crypto from "crypto";
import { ApiError } from "../utils/ApiError.js";
import { hashPassword, comparePassword } from "../utils/hash.js";
import { generateAccessToken, generateRefreshToken, hashToken } from "../utils/tokens.js";
import {
  createUser,
  findUserByEmail,
  findUserById,
  findUserByUsername,
  findUserByUsernameOrEmail,
  activateUnverifiedUser,
  verifyUser,
  setVerifyCode,
  updatePassword,
} from "../models/user.model.js";
import {
  storeRefreshToken,
  findRefreshToken,
  revokeRefreshToken,
  revokeAllUserTokens,
} from "../models/token.model.js";
import { sendVerificationEmail } from "./mail.service.js";

const REFRESH_TOKEN_EXPIRY_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const VERIFY_CODE_EXPIRY_MIN  = 15;

export const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure:   process.env.NODE_ENV === "production",
  sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
  maxAge:   REFRESH_TOKEN_EXPIRY_MS,
};

/** Generate a random 6-digit string */
const generateVerifyCode = () =>
  crypto.randomInt(100000, 999999).toString();

/** Issue tokens, store refresh hash, return access token + set cookie */
export const issueTokens = async (userId, role, res) => {
  const accessToken  = generateAccessToken(userId, role);
  const refreshToken = generateRefreshToken();
  const tokenHash    = hashToken(refreshToken);
  const expiresAt    = new Date(Date.now() + REFRESH_TOKEN_EXPIRY_MS);

  await storeRefreshToken(userId, tokenHash, expiresAt);
  res.cookie("refreshToken", refreshToken, REFRESH_COOKIE_OPTIONS);

  return accessToken; // returned in JSON body — client keeps in memory
};

// Auth operations

export const registerUser = async ({ username, email, password }, res) => {
  let user;
  const existingEmail = await findUserByEmail(email);

  if (existingEmail) {
    const sameAccount =
      !existingEmail.is_verified &&
      existingEmail.username === username &&
      await comparePassword(password, existingEmail.password);
    if (!sameAccount) throw new ApiError(409, "Email already in use");

    user = await activateUnverifiedUser(existingEmail.id);
    if (!user) throw new ApiError(409, "Account could not be activated. Please try again.");
  } else {
    const existingUsername = await findUserByUsername(username);
    if (existingUsername) throw new ApiError(409, "Username already taken");

    const hashed = await hashPassword(password);
    user = await createUser({
      username,
      email,
      password: hashed,
      role: "admin",
      isVerified: true,
    });
  }

  const accessToken = await issueTokens(user.id, user.role, res);
  return { accessToken, user };
};

export const verifyEmail = async ({ email, code }, res) => {
  const user = await verifyUser(email, code);
  if (!user) throw new ApiError(400, "Invalid or expired verification code");

  const accessToken = await issueTokens(user.id, user.role, res);
  const { password: _, verify_code, verify_code_expiry, verify_resend_count, verify_resend_reset, ...safeUser } = user;
  return { accessToken, user: safeUser };
};

export const resendCode = async ({ email }) => {
  const user = await findUserByEmail(email);
  if (!user) throw new ApiError(404, "User with this email not found");
  if (user.is_verified) throw new ApiError(400, "Email is already verified");

  if (user.verify_resend_count >= 6) {
    throw new ApiError(429, "Too many resend requests — please try again later");
  }

  const code = generateVerifyCode();
  const expiresAt = new Date(Date.now() + VERIFY_CODE_EXPIRY_MIN * 60 * 1000);

  await sendVerificationEmail(email, user.username, code);
  const updatedUser = await setVerifyCode(email, code, expiresAt);
  if (!updatedUser) throw new ApiError(400, "Email is already verified or no longer available");

  return {
    success: true,
  };
};

export const loginUser = async ({ email, password, username }, res) => {
  const identifier = email || username;
  if (!identifier) throw new ApiError(400, "Email or username is required");

  const user = await findUserByUsernameOrEmail(identifier);
  if (!user) throw new ApiError(401, "Invalid credentials");

  if (!user.is_verified) {
    throw new ApiError(403, "Please verify your email before logging in. Enter your verification code.");
  }

  const match = await comparePassword(password, user.password);
  if (!match) throw new ApiError(401, "Invalid credentials");

  const accessToken = await issueTokens(user.id, user.role, res);

  const { password: _, verify_code, verify_code_expiry, verify_resend_count, verify_resend_reset, ...safeUser } = user;
  return { accessToken, user: safeUser };
};

export const refreshTokens = async (rawToken, res) => {
  if (!rawToken) throw new ApiError(401, "No refresh token");

  const tokenHash = hashToken(rawToken);
  const stored    = await findRefreshToken(tokenHash);
  if (!stored) throw new ApiError(401, "Invalid or expired refresh token");

  // Rotate: revoke old, issue new
  await revokeRefreshToken(tokenHash);

  const user = await findUserById(stored.user_id);
  if (!user) throw new ApiError(401, "User no longer exists");

  const accessToken = await issueTokens(user.id, user.role, res);
  return { accessToken };
};

export const logoutUser = async (rawToken, res) => {
  if (rawToken) {
    const tokenHash = hashToken(rawToken);
    await revokeRefreshToken(tokenHash);
  }
  res.clearCookie("refreshToken", REFRESH_COOKIE_OPTIONS);
};

export const changeUserPassword = async (userId, currentPassword, newPassword) => {
  const user = await findUserById(userId);
  if (!user) throw new ApiError(404, "User not found");

  const match = await comparePassword(currentPassword, user.password);
  if (!match) throw new ApiError(400, "Current password is incorrect");

  const hashed = await hashPassword(newPassword);
  await updatePassword(userId, hashed);

  // Revoke all existing sessions so old tokens become useless
  await revokeAllUserTokens(userId);
};
