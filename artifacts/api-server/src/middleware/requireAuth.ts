import { type Request, type Response, type NextFunction } from "express";
import jwt from "jsonwebtoken";
import { db, usersTable, type UserRole } from "@workspace/db";
import { eq, and } from "drizzle-orm";

interface JwtPayload {
  userId: string;
  tenantId: string;
  role: UserRole;
  email: string;
  name: string;
  sessionVersion?: number;
}

const PUBLIC: Array<{ method: string; path: string }> = [
  { method: "POST", path: "/auth/login" },
  { method: "POST", path: "/lifts/sync" },
  { method: "GET",  path: "/healthz" },
  { method: "POST", path: "/setup/init" },
];

export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
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

  let payload: JwtPayload;
  try {
    payload = jwt.verify(token, secret) as JwtPayload;
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
    return;
  }
  try {
    const [account] = await db.select({
      id: usersTable.id, tenantId: usersTable.tenantId, role: usersTable.role,
      email: usersTable.email, name: usersTable.name, isActive: usersTable.isActive,
      mustChangePassword: usersTable.mustChangePassword, sessionVersion: usersTable.sessionVersion,
    }).from(usersTable).where(and(eq(usersTable.id, payload.userId), eq(usersTable.tenantId, payload.tenantId))).limit(1);
    if (!account?.isActive || account.sessionVersion !== (payload.sessionVersion ?? 0)) {
      res.status(401).json({ error: "Invalid or expired session" });
      return;
    }
    req.user = {
      userId: account.id, tenantId: account.tenantId, role: account.role,
      email: account.email, name: account.name,
    };
    const passwordRoute = (req.method === "GET" && req.path === "/auth/me")
      || (req.method === "POST" && req.path === "/auth/change-password");
    if (account.mustChangePassword && !passwordRoute) {
      res.status(403).json({ error: "Password change required", code: "PASSWORD_CHANGE_REQUIRED" });
      return;
    }
    next();
  } catch (error) {
    next(error);
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
