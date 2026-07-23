import { integer, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { tenantsTable } from "./tenants";

export const tenantSettingsTable = pgTable("tenant_settings", {
  tenantId:   uuid("tenant_id").primaryKey().references(() => tenantsTable.id, { onDelete: "cascade" }),
  logoBase64: text("logo_base64"),
  colors:     jsonb("colors").$type<string[]>().notNull().default([]),
  maxSeasons: integer("max_seasons").notNull().default(3),
  updatedAt:  timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type TenantSettings = typeof tenantSettingsTable.$inferSelect;
