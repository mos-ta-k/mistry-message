import { ApiError } from "../utils/ApiError.js";

/**
 * Validates req.body against a Zod schema.
 * Usage: router.post("/register", validate(registerSchema), handler)
 */
export const validate = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.body);
  if (!result.success) {
    const message = result.error.errors.map((e) => e.message).join(", ");
    return next(new ApiError(400, message));
  }
  req.body = result.data; // replace with parsed + coerced data
  next();
};
