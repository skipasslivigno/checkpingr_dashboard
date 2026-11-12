import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

// One private sending identity per administrator; never selected by the users API.
export const emailSettingsTable = pgTable("email_settings", {
  userId: uuid("user_id").primaryKey().references(() => usersTable.id, { onDelete: "cascade" }),
  senderEmail: text("sender_email").notNull(),
  senderName: text("sender_name").notNull(),
  encryptedPassword: text("encrypted_password").notNull(),
  loginUrl: text("login_url").notNull(),
  subject: text("subject").notNull(),
  body: text("body").notNull(),
  lastTestAt: timestamp("last_test_at", { withTimezone: true }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertEmailSettingsSchema = createInsertSchema(emailSettingsTable);
export type InsertEmailSettings = z.infer<typeof insertEmailSettingsSchema>;
export type EmailSettingsRecord = typeof emailSettingsTable.$inferSelect;
