import jwt from "jsonwebtoken";
import User from "../models/User.js";

export const authMiddleware = async (req, res, next) => {
  try {
    const token = req.header("Authorization")?.replace("Bearer ", "");

    if (!token) {
      console.log("Auth failed: No token provided", {
        path: req.path,
        method: req.method,
        origin: req.headers.origin,
      });
      return res.status(401).json({ message: "No token provided" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select("-password");

    if (!user) {
      console.log("Auth failed: User not found for token", {
        path: req.path,
        userId: decoded.id,
      });
      return res.status(401).json({ message: "Invalid token" });
    }

    if (user.isBanned) {
      return res.status(403).json({ message: "Account is banned" });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error("Auth middleware error:", {
      message: error.message,
      path: req.path,
      hasToken: !!req.header("Authorization"),
    });
    res.status(401).json({ message: "Token is not valid" });
  }
};

export const requireRole = (roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.userType)) {
      return res
        .status(403)
        .json({ message: "Access denied. Insufficient permissions." });
    }
    next();
  };
};
