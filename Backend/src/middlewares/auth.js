import { verifyAccessToken } from "../utils/tokens.js";
import { findUserById } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";

/**
 * Reads the Bearer access token from the Authorization header.
 * Access token is kept in JS memory on the client — never a cookie.
 */
const authenticate = async (req, res, next) => {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return next(new ApiError(401, "Unauthorized — no access token provided"));
  }

  const token = header.slice(7);

  try {
    const decoded = verifyAccessToken(token);
    const user = await findUserById(decoded.id);
    if (!user) return next(new ApiError(401, "Unauthorized — user not found"));
    req.user = user;
    next();
  } catch {
    next(new ApiError(401, "Unauthorized — invalid or expired access token"));
  }
};

export default authenticate;
