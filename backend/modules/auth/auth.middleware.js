import jwt from "jsonwebtoken";
import User from "../user/user.schema.js";

const protect = async (req, res, next) => {
  let token;

  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer")) {
    try {
      token = authHeader.split(" ")[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = await User.findById(decoded.id).select("-password");
      next();
    } catch (err) {
      return res.status(401).json({ message: "Invalid Token" });
    }
  } else {
    return res.status(401).json({ message: "No token provided" });
  }
};

const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ message: "No authenticated user" });
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: "Access denied" });
    }
    next();
  };
};

// Require a single exact role
const requireRole = (role) => {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ message: "No authenticated user" });
    if (req.user.role !== role) return res.status(403).json({ message: "Forbidden: insufficient role" });
    next();
  };
};

// Require any of the provided roles (alias for authorizeRoles)
const requireAnyRole = (...roles) => authorizeRoles(...roles);

export { protect, authorizeRoles, requireRole, requireAnyRole };
