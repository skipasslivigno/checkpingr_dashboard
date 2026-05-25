import { integer, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const liftSnapshotsTable = pgTable("lift_snapshots", {
  id: serial("id").primaryKey(),
  idin: text("idin").notNull().unique(),
  dupd: text("dupd").notNull(),
  dtgg: text("dtgg").notNull(),
  ggnr: integer("ggnr").notNull(),
  ggbz: text("ggbz").notNull(),
  nsoc: integer("nsoc"),
  npin: integer("npin"),
  npic: integer("npic"),
  nuin: integer("nuin"),
  npas: integer("npas"),
  eser: text("eser").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertLiftSnapshotSchema = createInsertSchema(liftSnapshotsTable).omit({
  id: true,
  createdAt: true,
});
export type InsertLiftSnapshot = z.infer<typeof insertLiftSnapshotSchema>;
export type LiftSnapshot = typeof liftSnapshotsTable.$inferSelect;
