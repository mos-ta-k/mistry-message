import pool from "../configs/database.js";
import jwt from "jsonwebtoken";

const protect = async (req, res, next) => {
  const token =
    req.cookies?.accessToken ||
    req.headers.authorization?.replace("Bearer ", "");

  if (!token) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized — no token provided",
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const { rows } = await pool.query(
      "SELECT id, name, email, is_verified, is_accepting_messages FROM users WHERE id = $1",
      [decoded.id]
    );

    if (rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized — user not found",
      });
    }

    req.user = rows[0];
    next();
  } catch (error) {
    console.error("protect middleware error:", error.message);
    res.status(401).json({
      success: false,
      message: "Unauthorized — invalid or expired token",
    });
  }
};

export default protect;
