import { integer, pgTable, serial, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const liftSnapshotsTable = pgTable(
  "lift_snapshots",
  {
    id: serial("id").primaryKey(),
    idin: text("idin"),
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
    nomeSocieta: text("nome_societa"),
    descrGrp: text("descr_grp"),
    idSocieta: integer("id_societa"),
    codgrp: text("codgrp"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("lift_snapshots_dupd_ggnr_idx").on(t.dupd, t.ggnr)]
);

export const insertLiftSnapshotSchema = createInsertSchema(liftSnapshotsTable).omit({
  id: true,
  createdAt: true,
});
export type InsertLiftSnapshot = z.infer<typeof insertLiftSnapshotSchema>;
export type LiftSnapshot = typeof liftSnapshotsTable.$inferSelect;
