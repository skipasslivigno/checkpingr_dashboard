import { boolean, index, inet, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { tenantsTable } from "./tenants";
import { usersTable } from "./users";

export const accessLogsTable = pgTable("access_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").references(() => tenantsTable.id, { onDelete: "cascade" }),
  userId: uuid("user_id").references(() => usersTable.id, { onDelete: "set null" }),
  email: text("email").notNull(),
  name: text("name"),
  success: boolean("success").notNull(),
  reason: text("reason").notNull(),
  userAgent: text("user_agent").notNull(),
  ipAddress: inet("ip_address"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("access_logs_tenant_date_idx").on(table.tenantId, table.createdAt, table.id),
]);

export const insertAccessLogSchema = createInsertSchema(accessLogsTable).omit({ id: true, createdAt: true });
export type InsertAccessLog = z.infer<typeof insertAccessLogSchema>;
export type AccessLog = typeof accessLogsTable.$inferSelect;
