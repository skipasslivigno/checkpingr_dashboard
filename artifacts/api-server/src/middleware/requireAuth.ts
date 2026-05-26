import { type Request, type Response, type NextFunction } from "express";
import jwt from "jsonwebtoken";

const PUBLIC: Array<{ method: string; path: string }> = [
  { method: "POST", path: "/auth/login" },
  { method: "POST", path: "/lifts/sync" },
  { method: "GET",  path: "/healthz" },
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
    jwt.verify(token, secret);
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
  }
}
