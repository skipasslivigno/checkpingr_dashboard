import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const tenantsTable = pgTable("tenants", {
  id:        uuid("id").primaryKey().defaultRandom(),
  name:      text("name").notNull(),
  slug:      text("slug").notNull().unique(),
  apiKey:    text("api_key").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertTenantSchema = createInsertSchema(tenantsTable).omit({ id: true, createdAt: true });
export const selectTenantSchema = createSelectSchema(tenantsTable);
export type InsertTenant = z.infer<typeof insertTenantSchema>;
export type Tenant = typeof tenantsTable.$inferSelect;
