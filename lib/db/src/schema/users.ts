import { boolean, pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { tenantsTable } from "./tenants";

export const userRoleEnum = pgEnum("user_role", ["admin", "operator", "viewer"]);
export type UserRole = typeof userRoleEnum.enumValues[number];

export const usersTable = pgTable("users", {
  id:           uuid("id").primaryKey().defaultRandom(),
  tenantId:     uuid("tenant_id").notNull().references(() => tenantsTable.id, { onDelete: "cascade" }),
  email:        text("email").notNull(),
  passwordHash: text("password_hash"),
  googleId:     text("google_id"),
  name:         text("name").notNull(),
  role:         userRoleEnum("role").notNull().default("viewer"),
  isActive:     boolean("is_active").notNull().default(true),
  createdAt:    timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertUserSchema = createInsertSchema(usersTable).omit({ id: true, createdAt: true });
export const selectUserSchema = createSelectSchema(usersTable).omit({ passwordHash: true });
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof usersTable.$inferSelect;
export type PublicUser = Omit<User, "passwordHash">;
