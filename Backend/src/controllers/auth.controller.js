import asyncHandler from "../utils/asyncHandler.js";
import * as authService from "../services/auth.service.js";

export const register = asyncHandler(async (req, res) => {
  const result = await authService.registerUser(req.body);
  res.status(201).json({
    success: true,
    message: "Registration successful. Please enter the verification code sent to your email.",
    requiresVerification: true,
    email: result.email,
    username: result.username,
  });
});

export const verify = asyncHandler(async (req, res) => {
  const result = await authService.verifyEmail(req.body, res);
  res.status(200).json({
    success: true,
    message: "Email verified successfully! You are now logged in.",
    accessToken: result.accessToken,
    user: result.user,
  });
});

export const resendCode = asyncHandler(async (req, res) => {
  await authService.resendCode(req.body);
  res.status(200).json({
    success: true,
    message: "A new verification code has been sent to your email.",
  });
});

export const login = asyncHandler(async (req, res) => {
  const { accessToken, user } = await authService.loginUser(req.body, res);
  res.status(200).json({
    success: true,
    accessToken,
    user
  });
});

export const refresh = asyncHandler(async (req, res) => {
  const rawToken = req.cookies?.refreshToken;
  const { accessToken } = await authService.refreshTokens(rawToken, res);
  res.status(200).json({
    success: true,
    accessToken
  });
});

export const logout = asyncHandler(async (req, res) => {
  await authService.logoutUser(req.cookies?.refreshToken, res);
  res.status(204).send();
});

export const changePassword = asyncHandler(async (req, res) => {
  await authService.changeUserPassword(req.user.id, req.body);
  res.status(200).json({
    success: true,
    message: "Password changed. please log in again"
  });
});
