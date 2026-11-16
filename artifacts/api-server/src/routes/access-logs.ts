import { Router } from "express";
import { and, count, desc, eq, ilike, or } from "drizzle-orm";
import { accessLogsTable, db } from "@workspace/db";
import { GetAccessLogsQueryParams, GetAccessLogsResponse } from "@workspace/api-zod";
import { requireRole } from "../middleware/requireAuth";

const router = Router();
const PAGE_SIZE = 50;

router.get("/access-logs", requireRole("admin"), async (req, res): Promise<void> => {
  res.setHeader("Cache-Control", "no-store");
  const parsed = GetAccessLogsQueryParams.safeParse(req.query);
  if (!parsed.success || !Number.isInteger(parsed.data.page)) {
    res.status(400).json({ error: "Invalid access log filters" });
    return;
  }
  const { page = 1, outcome = "all", search } = parsed.data;
  // Unknown emails have tenantId NULL and must never be exposed to another organization.
  const term = search?.trim().replace(/[\\%_]/g, "\\$&");
  const where = and(
    eq(accessLogsTable.tenantId, req.user!.tenantId),
    outcome === "all" ? undefined : eq(accessLogsTable.success, outcome === "success"),
    term ? or(ilike(accessLogsTable.email, `%${term}%`), ilike(accessLogsTable.name, `%${term}%`)) : undefined,
  );
  const [items, [summary]] = await Promise.all([
    db.select({
      id: accessLogsTable.id, userId: accessLogsTable.userId, email: accessLogsTable.email,
      name: accessLogsTable.name, success: accessLogsTable.success, reason: accessLogsTable.reason,
      userAgent: accessLogsTable.userAgent, ipAddress: accessLogsTable.ipAddress, createdAt: accessLogsTable.createdAt,
    }).from(accessLogsTable).where(where)
      .orderBy(desc(accessLogsTable.createdAt), desc(accessLogsTable.id))
      .limit(PAGE_SIZE).offset((page - 1) * PAGE_SIZE),
    db.select({ total: count() }).from(accessLogsTable).where(where),
  ]);
  res.json(GetAccessLogsResponse.parse({
    items: items.map(item => ({ ...item, createdAt: item.createdAt.toISOString() })),
    total: summary.total, page, pageSize: PAGE_SIZE,
  }));
});

export default router;
