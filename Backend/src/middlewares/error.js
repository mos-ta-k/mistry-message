import { ApiError } from "../utils/ApiError.js";

// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  // Known operational error
  if (err.isOperational) {
    return res.status(err.statusCode).json({ success: false, message: err.message });
  }

  // JWT errors
  if (err.name === "JsonWebTokenError" || err.name === "TokenExpiredError") {
    return res.status(401).json({ success: false, message: "Invalid or expired token" });
  }

  // Zod error (shouldn't reach here, handled by validate middleware, but just in case)
  if (err.name === "ZodError") {
    return res.status(400).json({ success: false, message: err.issues.map((issue) => issue.message).join(", ") });
  }

  // Unknown / programming error — log and send generic message
  console.error("Unhandled error:", err);
  res.status(500).json({ success: false, message: "Internal server error" });
};

export default errorHandler;
