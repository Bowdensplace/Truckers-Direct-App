import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import { eq, and, desc } from "drizzle-orm";
import {
  clients, insertClientSchema, type Client, type InsertClient,
  periods, type Period, type InsertPeriod,
  taskInstances, type TaskInstance, type InsertTaskInstance,
  paymentRecords, type PaymentRecord, type InsertPaymentRecord,
  activityLog, type ActivityLog, type InsertActivityLog,
  timeEntries, type TimeEntry, type InsertTimeEntry,
  staff, type Staff, type InsertStaff,
} from "@shared/schema";

const sqlite = new Database("data.db");
const db = drizzle(sqlite);

// Run migrations inline — additive only (safe to re-run)
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS staff (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    initials TEXT NOT NULL,
    active INTEGER NOT NULL DEFAULT 1
  );
  CREATE TABLE IF NOT EXISTS clients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    service_level TEXT NOT NULL DEFAULT 'basic',
    truck_count INTEGER NOT NULL DEFAULT 1,
    notes TEXT DEFAULT '',
    active INTEGER NOT NULL DEFAULT 1,
    disabled_workflows TEXT DEFAULT '[]'
  );
  CREATE TABLE IF NOT EXISTS periods (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_id INTEGER NOT NULL REFERENCES clients(id),
    label TEXT NOT NULL,
    month INTEGER NOT NULL,
    year INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'active',
    due_date TEXT,
    assigned_to TEXT DEFAULT ''
  );
  CREATE TABLE IF NOT EXISTS task_instances (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    period_id INTEGER NOT NULL REFERENCES periods(id),
    workflow_type TEXT NOT NULL,
    task_key TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    note TEXT DEFAULT '',
    completed_at TEXT,
    completed_by TEXT DEFAULT '',
    assigned_to TEXT DEFAULT ''
  );
  CREATE TABLE IF NOT EXISTS activity_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    period_id INTEGER NOT NULL REFERENCES periods(id),
    client_id INTEGER NOT NULL,
    workflow_type TEXT NOT NULL,
    task_key TEXT NOT NULL,
    task_label TEXT NOT NULL,
    action TEXT NOT NULL,
    actor TEXT DEFAULT 'You',
    detail TEXT DEFAULT '',
    timestamp TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS time_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    period_id INTEGER NOT NULL REFERENCES periods(id),
    client_id INTEGER NOT NULL,
    workflow_type TEXT NOT NULL,
    started_at TEXT NOT NULL,
    ended_at TEXT,
    duration_minutes REAL,
    note TEXT DEFAULT '',
    actor TEXT DEFAULT 'You'
  );
  CREATE TABLE IF NOT EXISTS payment_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    period_id INTEGER NOT NULL REFERENCES periods(id),
    source TEXT NOT NULL,
    reference_number TEXT NOT NULL DEFAULT '',
    expected_amount REAL NOT NULL DEFAULT 0,
    actual_amount REAL DEFAULT 0,
    deposit_date TEXT,
    reconciled INTEGER NOT NULL DEFAULT 0,
    notes TEXT DEFAULT '',
    driver_name TEXT DEFAULT '',
    load_number TEXT DEFAULT ''
  );
`);

// Additive column migrations (safe to re-run — ALTER TABLE IF NOT exists isn't standard SQLite, so we try/catch)
const addColumnIfMissing = (table: string, column: string, def: string) => {
  try { sqlite.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${def}`); } catch {}
};
addColumnIfMissing("clients", "disabled_workflows", "TEXT DEFAULT '[]'");
addColumnIfMissing("periods", "assigned_to", "TEXT DEFAULT ''");
addColumnIfMissing("task_instances", "assigned_to", "TEXT DEFAULT ''");

export interface IStorage {
  // Staff
  getStaff(): Staff[];
  createStaff(data: InsertStaff): Staff;
  updateStaff(id: number, data: Partial<InsertStaff>): Staff | undefined;
  deleteStaff(id: number): void;

  // Clients
  getClients(): Client[];
  getClient(id: number): Client | undefined;
  createClient(data: InsertClient): Client;
  updateClient(id: number, data: Partial<InsertClient>): Client | undefined;
  deleteClient(id: number): void;

  // Periods
  getPeriodsByClient(clientId: number): Period[];
  getAllActivePeriods(): Period[];
  getPeriod(id: number): Period | undefined;
  createPeriod(data: InsertPeriod): Period;
  updatePeriod(id: number, data: Partial<InsertPeriod>): Period | undefined;

  // Task Instances
  getTasksByPeriod(periodId: number, workflowType?: string): TaskInstance[];
  getTaskByKey(periodId: number, workflowType: string, taskKey: string): TaskInstance | undefined;
  upsertTask(data: InsertTaskInstance): TaskInstance;
  updateTask(id: number, data: Partial<InsertTaskInstance>): TaskInstance | undefined;
  bulkInitTasks(tasks: InsertTaskInstance[]): void;

  // Activity Log
  getActivityLog(periodId: number, workflowType?: string): ActivityLog[];
  getRecentActivity(limit?: number): ActivityLog[];
  createActivityLog(data: InsertActivityLog): ActivityLog;

  // Time Entries
  getTimeEntries(periodId: number, workflowType?: string): TimeEntry[];
  getActiveTimer(periodId: number, workflowType: string): TimeEntry | undefined;
  startTimer(data: InsertTimeEntry): TimeEntry;
  stopTimer(id: number, endedAt: string, durationMinutes: number): TimeEntry | undefined;
  getWorkflowStats(): { clientId: number; workflowType: string; avgMinutes: number; count: number }[];

  // Payment Records
  getPaymentsByPeriod(periodId: number): PaymentRecord[];
  createPayment(data: InsertPaymentRecord): PaymentRecord;
  updatePayment(id: number, data: Partial<InsertPaymentRecord>): PaymentRecord | undefined;
  deletePayment(id: number): void;

  // Search
  searchNotes(query: string): { task: TaskInstance; periodId: number; clientId: number }[];
}

export class SQLiteStorage implements IStorage {
  // ─── STAFF ────────────────────────────────────────────────────────────
  getStaff(): Staff[] {
    return db.select().from(staff).where(eq(staff.active, true)).all();
  }
  createStaff(data: InsertStaff): Staff {
    return db.insert(staff).values(data).returning().get();
  }
  updateStaff(id: number, data: Partial<InsertStaff>): Staff | undefined {
    return db.update(staff).set(data).where(eq(staff.id, id)).returning().get();
  }
  deleteStaff(id: number): void {
    db.update(staff).set({ active: false }).where(eq(staff.id, id)).run();
  }

  // ─── CLIENTS ──────────────────────────────────────────────────────────
  getClients(): Client[] {
    return db.select().from(clients).where(eq(clients.active, true)).all();
  }
  getClient(id: number): Client | undefined {
    return db.select().from(clients).where(eq(clients.id, id)).get();
  }
  createClient(data: InsertClient): Client {
    return db.insert(clients).values(data).returning().get();
  }
  updateClient(id: number, data: Partial<InsertClient>): Client | undefined {
    return db.update(clients).set(data).where(eq(clients.id, id)).returning().get();
  }
  deleteClient(id: number): void {
    db.update(clients).set({ active: false }).where(eq(clients.id, id)).run();
  }

  // ─── PERIODS ──────────────────────────────────────────────────────────
  getPeriodsByClient(clientId: number): Period[] {
    return db.select().from(periods).where(eq(periods.clientId, clientId)).all();
  }
  getAllActivePeriods(): Period[] {
    return db.select().from(periods).where(eq(periods.status, "active")).all();
  }
  getPeriod(id: number): Period | undefined {
    return db.select().from(periods).where(eq(periods.id, id)).get();
  }
  createPeriod(data: InsertPeriod): Period {
    return db.insert(periods).values(data).returning().get();
  }
  updatePeriod(id: number, data: Partial<InsertPeriod>): Period | undefined {
    return db.update(periods).set(data).where(eq(periods.id, id)).returning().get();
  }

  // ─── TASK INSTANCES ───────────────────────────────────────────────────
  getTasksByPeriod(periodId: number, workflowType?: string): TaskInstance[] {
    if (workflowType) {
      return db.select().from(taskInstances)
        .where(and(eq(taskInstances.periodId, periodId), eq(taskInstances.workflowType, workflowType)))
        .all();
    }
    return db.select().from(taskInstances).where(eq(taskInstances.periodId, periodId)).all();
  }
  getTaskByKey(periodId: number, workflowType: string, taskKey: string): TaskInstance | undefined {
    return db.select().from(taskInstances)
      .where(and(
        eq(taskInstances.periodId, periodId),
        eq(taskInstances.workflowType, workflowType),
        eq(taskInstances.taskKey, taskKey)
      )).get();
  }
  upsertTask(data: InsertTaskInstance): TaskInstance {
    const existing = this.getTaskByKey(data.periodId, data.workflowType, data.taskKey);
    if (existing) {
      return db.update(taskInstances).set(data).where(eq(taskInstances.id, existing.id)).returning().get()!;
    }
    return db.insert(taskInstances).values(data).returning().get();
  }
  updateTask(id: number, data: Partial<InsertTaskInstance>): TaskInstance | undefined {
    return db.update(taskInstances).set(data).where(eq(taskInstances.id, id)).returning().get();
  }
  bulkInitTasks(tasks: InsertTaskInstance[]): void {
    for (const t of tasks) {
      const existing = this.getTaskByKey(t.periodId, t.workflowType, t.taskKey);
      if (!existing) {
        db.insert(taskInstances).values(t).run();
      }
    }
  }

  // ─── ACTIVITY LOG ─────────────────────────────────────────────────────
  getActivityLog(periodId: number, workflowType?: string): ActivityLog[] {
    if (workflowType) {
      return db.select().from(activityLog)
        .where(and(eq(activityLog.periodId, periodId), eq(activityLog.workflowType, workflowType)))
        .orderBy(desc(activityLog.id))
        .all();
    }
    return db.select().from(activityLog)
      .where(eq(activityLog.periodId, periodId))
      .orderBy(desc(activityLog.id))
      .all();
  }
  getRecentActivity(limit = 50): ActivityLog[] {
    return db.select().from(activityLog).orderBy(desc(activityLog.id)).limit(limit).all();
  }
  createActivityLog(data: InsertActivityLog): ActivityLog {
    return db.insert(activityLog).values(data).returning().get();
  }

  // ─── TIME ENTRIES ─────────────────────────────────────────────────────
  getTimeEntries(periodId: number, workflowType?: string): TimeEntry[] {
    if (workflowType) {
      return db.select().from(timeEntries)
        .where(and(eq(timeEntries.periodId, periodId), eq(timeEntries.workflowType, workflowType)))
        .orderBy(desc(timeEntries.id))
        .all();
    }
    return db.select().from(timeEntries).where(eq(timeEntries.periodId, periodId)).all();
  }
  getActiveTimer(periodId: number, workflowType: string): TimeEntry | undefined {
    return db.select().from(timeEntries)
      .where(and(
        eq(timeEntries.periodId, periodId),
        eq(timeEntries.workflowType, workflowType),
      ))
      .all()
      .find(t => t.endedAt === null);
  }
  startTimer(data: InsertTimeEntry): TimeEntry {
    return db.insert(timeEntries).values(data).returning().get();
  }
  stopTimer(id: number, endedAt: string, durationMinutes: number): TimeEntry | undefined {
    return db.update(timeEntries).set({ endedAt, durationMinutes }).where(eq(timeEntries.id, id)).returning().get();
  }
  getWorkflowStats(): { clientId: number; workflowType: string; avgMinutes: number; count: number }[] {
    const rows = db.select().from(timeEntries).all().filter(t => t.durationMinutes != null && t.durationMinutes > 0);
    const map = new Map<string, { sum: number; count: number; clientId: number }>();
    for (const r of rows) {
      const key = `${r.clientId}__${r.workflowType}`;
      const existing = map.get(key) ?? { sum: 0, count: 0, clientId: r.clientId };
      map.set(key, { sum: existing.sum + (r.durationMinutes ?? 0), count: existing.count + 1, clientId: r.clientId });
    }
    return [...map.entries()].map(([key, val]) => ({
      clientId: val.clientId,
      workflowType: key.split("__")[1],
      avgMinutes: val.sum / val.count,
      count: val.count,
    }));
  }

  // ─── PAYMENT RECORDS ──────────────────────────────────────────────────
  getPaymentsByPeriod(periodId: number): PaymentRecord[] {
    return db.select().from(paymentRecords).where(eq(paymentRecords.periodId, periodId)).all();
  }
  createPayment(data: InsertPaymentRecord): PaymentRecord {
    return db.insert(paymentRecords).values(data).returning().get();
  }
  updatePayment(id: number, data: Partial<InsertPaymentRecord>): PaymentRecord | undefined {
    return db.update(paymentRecords).set(data).where(eq(paymentRecords.id, id)).returning().get();
  }
  deletePayment(id: number): void {
    db.delete(paymentRecords).where(eq(paymentRecords.id, id)).run();
  }

  // ─── SEARCH ───────────────────────────────────────────────────────────
  searchNotes(query: string): { task: TaskInstance; periodId: number; clientId: number }[] {
    if (!query.trim()) return [];
    const lower = query.toLowerCase();
    const allTasks = db.select().from(taskInstances).all();
    const periodMap = new Map<number, number>(); // periodId → clientId
    const allPeriods = db.select().from(periods).all();
    for (const p of allPeriods) periodMap.set(p.id, p.clientId);

    return allTasks
      .filter(t => t.note && t.note.toLowerCase().includes(lower))
      .map(t => ({ task: t, periodId: t.periodId, clientId: periodMap.get(t.periodId) ?? 0 }));
  }
}

export const storage = new SQLiteStorage();
