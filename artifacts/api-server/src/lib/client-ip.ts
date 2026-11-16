import { isIP } from "node:net";
import type { Request } from "express";

// Express resolves forwarded headers only through trusted proxies (see app.ts).
// Never read X-Forwarded-For or X-Real-IP directly: clients can forge them.
export function getClientIp(req: Request): string | null {
  const ip = req.ip ?? req.socket.remoteAddress;
  if (!ip) return null;
  if (ip.startsWith("::ffff:") && isIP(ip.slice(7)) === 4) return ip.slice(7);
  return isIP(ip) ? ip : null;
}
