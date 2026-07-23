import { type Request, type Response, type NextFunction } from "express";
import jwt from "jsonwebtoken";
import type { UserRole } from "@workspace/db";

interface JwtPayload {
  userId: string;
  tenantId: string;
  role: UserRole;
  email: string;
  name: string;
}

const PUBLIC: Array<{ method: string; path: string }> = [
  { method: "POST", path: "/auth/login" },
  { method: "POST", path: "/lifts/sync" },
  { method: "GET",  path: "/healthz" },
  { method: "POST", path: "/setup/init" },
];

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const isPublic = PUBLIC.some(
    (r) => r.method === req.method && req.path === r.path,
  );

  if (isPublic) {
    next();
    return;
  }

  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const token = authHeader.slice(7);
  const secret = process.env.SESSION_SECRET;

  if (!secret) {
    res.status(500).json({ error: "Server misconfiguration: SESSION_SECRET not set" });
    return;
  }

  try {
    const payload = jwt.verify(token, secret) as JwtPayload;
    req.user = {
      userId:   payload.userId,
      tenantId: payload.tenantId,
      role:     payload.role,
      email:    payload.email,
      name:     payload.name,
    };
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
  }
}

export function requireRole(...roles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    if (!roles.includes(req.user.role)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    next();
  };
}
