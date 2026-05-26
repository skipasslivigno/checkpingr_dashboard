import { Router } from "express";
import jwt from "jsonwebtoken";

const router = Router();

function parseUsers(): Map<string, string> {
  const raw = process.env.AUTH_USERS ?? "";
  const map = new Map<string, string>();
  for (const pair of raw.split(",")) {
    const colonIdx = pair.indexOf(":");
    if (colonIdx < 1) continue;
    const user = pair.slice(0, colonIdx).trim();
    const pass = pair.slice(colonIdx + 1).trim();
    if (user && pass) map.set(user, pass);
  }
  return map;
}

router.post("/auth/login", (req, res) => {
  const { username, password } = req.body as { username?: string; password?: string };

  if (!username || !password) {
    res.status(400).json({ error: "Username and password required" });
    return;
  }

  const users = parseUsers();

  if (!users.size) {
    res.status(503).json({ error: "No users configured. Set AUTH_USERS env var." });
    return;
  }

  const expected = users.get(username);
  if (!expected || expected !== password) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    res.status(500).json({ error: "Server misconfiguration: SESSION_SECRET not set" });
    return;
  }

  const token = jwt.sign({ username }, secret, { expiresIn: "30d" });
  res.json({ token });
});

export default router;
