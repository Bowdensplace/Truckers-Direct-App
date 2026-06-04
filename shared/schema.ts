import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// ─── STAFF MEMBERS ────────────────────────────────────────────────────────────
export const staff = sqliteTable("staff", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  initials: text("initials").notNull(), // e.g. "RB"
  active: integer("active", { mode: "boolean" }).notNull().default(true),
});

export const insertStaffSchema = createInsertSchema(staff).omit({ id: true });
export type InsertStaff = z.infer<typeof insertStaffSchema>;
export type Staff = typeof staff.$inferSelect;

// ─── CLIENTS ──────────────────────────────────────────────────────────────────
export const clients = sqliteTable("clients", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  serviceLevel: text("service_level").notNull().default("basic"), // basic | growth | premium
  truckCount: integer("truck_count").notNull().default(1),
  notes: text("notes").default(""),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  // Workflow feature flags (JSON array of disabled workflow types)
  disabledWorkflows: text("disabled_workflows").default("[]"),
});

export const insertClientSchema = createInsertSchema(clients).omit({ id: true });
export type InsertClient = z.infer<typeof insertClientSchema>;
export type Client = typeof clients.$inferSelect;

// ─── PERIODS ──────────────────────────────────────────────────────────────────
export const periods = sqliteTable("periods", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  clientId: integer("client_id").notNull().references(() => clients.id),
  label: text("label").notNull(), // e.g. "June 2026"
  month: integer("month").notNull(), // 1-12
  year: integer("year").notNull(),
  status: text("status").notNull().default("active"), // active | closed
  dueDate: text("due_date"), // ISO date string
  assignedTo: text("assigned_to").default(""), // staff name or initials
});

export const insertPeriodSchema = createInsertSchema(periods).omit({ id: true });
export type InsertPeriod = z.infer<typeof insertPeriodSchema>;
export type Period = typeof periods.$inferSelect;

// ─── WORKFLOW TYPES ───────────────────────────────────────────────────────────
// monthly_close | payroll_run | new_client_onboarding | ar_collections | payment_reconciliation

// ─── TASK INSTANCES ──────────────────────────────────────────────────────────
// One row per checklist item per period per workflow
export const taskInstances = sqliteTable("task_instances", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  periodId: integer("period_id").notNull().references(() => periods.id),
  workflowType: text("workflow_type").notNull(),
  taskKey: text("task_key").notNull(), // stable ID from the workflow template
  status: text("status").notNull().default("pending"), // pending | complete | flagged | skipped
  note: text("note").default(""),
  completedAt: text("completed_at"), // ISO datetime
  completedBy: text("completed_by").default(""),
  assignedTo: text("assigned_to").default(""), // staff member
});

export const insertTaskInstanceSchema = createInsertSchema(taskInstances).omit({ id: true });
export type InsertTaskInstance = z.infer<typeof insertTaskInstanceSchema>;
export type TaskInstance = typeof taskInstances.$inferSelect;

// ─── ACTIVITY LOG ─────────────────────────────────────────────────────────────
export const activityLog = sqliteTable("activity_log", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  periodId: integer("period_id").notNull().references(() => periods.id),
  clientId: integer("client_id").notNull(),
  workflowType: text("workflow_type").notNull(),
  taskKey: text("task_key").notNull(),
  taskLabel: text("task_label").notNull(),
  action: text("action").notNull(), // "completed" | "flagged" | "skipped" | "note_added" | "restored" | "assigned"
  actor: text("actor").default("You"), // who did it
  detail: text("detail").default(""), // optional extra info (note text, assignee, etc.)
  timestamp: text("timestamp").notNull(), // ISO datetime
});

export const insertActivityLogSchema = createInsertSchema(activityLog).omit({ id: true });
export type InsertActivityLog = z.infer<typeof insertActivityLogSchema>;
export type ActivityLog = typeof activityLog.$inferSelect;

// ─── TIME ENTRIES ─────────────────────────────────────────────────────────────
export const timeEntries = sqliteTable("time_entries", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  periodId: integer("period_id").notNull().references(() => periods.id),
  clientId: integer("client_id").notNull(),
  workflowType: text("workflow_type").notNull(),
  startedAt: text("started_at").notNull(), // ISO datetime
  endedAt: text("ended_at"), // ISO datetime, null if still running
  durationMinutes: real("duration_minutes"), // computed on stop
  note: text("note").default(""),
  actor: text("actor").default("You"),
});

export const insertTimeEntrySchema = createInsertSchema(timeEntries).omit({ id: true });
export type InsertTimeEntry = z.infer<typeof insertTimeEntrySchema>;
export type TimeEntry = typeof timeEntries.$inferSelect;

// ─── PAYMENT RECONCILIATION ───────────────────────────────────────────────────
export const paymentRecords = sqliteTable("payment_records", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  periodId: integer("period_id").notNull().references(() => periods.id),
  source: text("source").notNull(), // factoring | direct | broker | owner_op_settlement
  referenceNumber: text("reference_number").notNull().default(""),
  expectedAmount: real("expected_amount").notNull().default(0),
  actualAmount: real("actual_amount").default(0),
  depositDate: text("deposit_date"), // ISO date
  reconciled: integer("reconciled", { mode: "boolean" }).notNull().default(false),
  notes: text("notes").default(""),
  driverName: text("driver_name").default(""),
  loadNumber: text("load_number").default(""),
});

export const insertPaymentRecordSchema = createInsertSchema(paymentRecords).omit({ id: true });
export type InsertPaymentRecord = z.infer<typeof insertPaymentRecordSchema>;
export type PaymentRecord = typeof paymentRecords.$inferSelect;
