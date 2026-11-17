import { date, index, integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { tenantsTable } from "./tenants";
import { usersTable } from "./users";

export const operationalNotesTable = pgTable("operational_notes", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenantsTable.id, { onDelete: "cascade" }),
  date: date("date", { mode: "string" }).notNull(),
  // Snapshot attribution deliberately does not depend on a daily extraction.
  liftId: integer("lift_id"),
  liftName: text("lift_name"),
  category: text("category").notNull(),
  text: text("text").notNull(),
  authorId: uuid("author_id").references(() => usersTable.id, { onDelete: "set null" }),
  authorName: text("author_name").notNull(),
  updatedById: uuid("updated_by_id").references(() => usersTable.id, { onDelete: "set null" }),
  updatedByName: text("updated_by_name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, t => [index("operational_notes_tenant_date_idx").on(t.tenantId, t.date, t.id)]);

export const insertOperationalNoteSchema = createInsertSchema(operationalNotesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertOperationalNote = z.infer<typeof insertOperationalNoteSchema>;
export type OperationalNote = typeof operationalNotesTable.$inferSelect;
