import { ApiError } from "../utils/ApiError.js";

/**
 * Role-based access control.
 * Usage: router.get("/admin/users", authenticate, authorize("admin"), handler)
 */
export const authorize = (...roles) =>
  (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(new ApiError(403, "Forbidden — insufficient permissions"));
    }
    next();
  };
