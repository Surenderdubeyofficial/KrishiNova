import jwt from "jsonwebtoken";

export function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Missing authentication token" });
  }

  const token = authHeader.replace("Bearer ", "");

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET || "change-this-secret");
    next();
  } catch {
    return res.status(401).json({ message: "Invalid authentication token" });
  }
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: "Access denied" });
    }
    next();
  };
}
