import type { Request, Response } from "express";
import { accessLogsTable, db, type User } from "@workspace/db";
import { logger } from "./logger";
import { getClientIp } from "./client-ip";

// Use an explicit allowlist: never persist the request body, headers, password or token.
export async function recordLogin(
  req: Request,
  res: Response,
  email: string,
  user: User | null,
  reason: "success" | "invalid_credentials" | "account_inactive",
): Promise<boolean> {
  try {
    await db.insert(accessLogsTable).values({
      tenantId: user?.tenantId ?? null,
      userId: user?.id ?? null,
      email: email.toLowerCase().trim().slice(0, 254),
      name: user?.name ?? null,
      success: reason === "success",
      reason,
      userAgent: (req.get("user-agent") ?? "").slice(0, 512),
      ipAddress: getClientIp(req),
    });
    return true;
  } catch {
    // Do not issue an unaudited session or silently drop audit failures.
    logger.error("Unable to persist login audit event");
    res.status(503).json({ error: "Login temporarily unavailable" });
    return false;
  }
}
