import type { Express, Request, Response, NextFunction } from "express";
import { type Server } from "http";
import { storage } from "./storage";
import { requireAuth } from "./auth";
import {
  insertClientSchema, insertPeriodSchema, insertTaskInstanceSchema,
  insertPaymentRecordSchema, insertActivityLogSchema, insertTimeEntrySchema,
  insertStaffSchema,
} from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(httpServer: Server, app: Express): Promise<Server> {
  // Health check — always 200, used by Railway
  app.get("/health", (_req, res) => res.json({ status: "ok" }));

  // AUTH TEMPORARILY DISABLED FOR QA
  // app.use("/api", requireAuth);

  // ─── STAFF ──────────────────────────────────────────────────────────────
  app.get("/api/staff", (req, res) => {
    res.json(storage.getStaff());
  });
  app.post("/api/staff", (req, res) => {
    const parsed = insertStaffSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    res.status(201).json(storage.createStaff(parsed.data));
  });
  app.patch("/api/staff/:id", (req, res) => {
    const id = Number(req.params.id);
    const s = storage.updateStaff(id, req.body);
    if (!s) return res.status(404).json({ error: "Staff not found" });
    res.json(s);
  });
  app.delete("/api/staff/:id", (req, res) => {
    storage.deleteStaff(Number(req.params.id));
    res.json({ success: true });
  });

  // ─── CLIENTS ────────────────────────────────────────────────────────────
  app.get("/api/clients", (req, res) => {
    res.json(storage.getClients());
  });
  app.get("/api/clients/:id", (req, res) => {
    const client = storage.getClient(Number(req.params.id));
    if (!client) return res.status(404).json({ error: "Client not found" });
    res.json(client);
  });
  app.post("/api/clients", (req, res) => {
    const parsed = insertClientSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    res.status(201).json(storage.createClient(parsed.data));
  });
  app.patch("/api/clients/:id", (req, res) => {
    const id = Number(req.params.id);
    const client = storage.updateClient(id, req.body);
    if (!client) return res.status(404).json({ error: "Client not found" });
    res.json(client);
  });
  app.delete("/api/clients/:id", (req, res) => {
    storage.deleteClient(Number(req.params.id));
    res.json({ success: true });
  });

  // ─── PERIODS ────────────────────────────────────────────────────────────
  app.get("/api/clients/:clientId/periods", (req, res) => {
    res.json(storage.getPeriodsByClient(Number(req.params.clientId)));
  });
  app.get("/api/periods/active", (req, res) => {
    res.json(storage.getAllActivePeriods());
  });
  app.post("/api/periods", (req, res) => {
    const parsed = insertPeriodSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    res.status(201).json(storage.createPeriod(parsed.data));
  });
  app.patch("/api/periods/:id", (req, res) => {
    const id = Number(req.params.id);
    const period = storage.updatePeriod(id, req.body);
    if (!period) return res.status(404).json({ error: "Period not found" });
    res.json(period);
  });

  // ─── TASKS ──────────────────────────────────────────────────────────────
  app.get("/api/periods/:periodId/tasks", (req, res) => {
    const periodId = Number(req.params.periodId);
    const workflowType = req.query.workflow as string | undefined;
    res.json(storage.getTasksByPeriod(periodId, workflowType));
  });
  app.post("/api/tasks/bulk-init", (req, res) => {
    const tasks = z.array(insertTaskInstanceSchema).safeParse(req.body);
    if (!tasks.success) return res.status(400).json({ error: tasks.error.flatten() });
    storage.bulkInitTasks(tasks.data);
    res.json({ success: true });
  });
  app.patch("/api/tasks/:id", (req, res) => {
    const id = Number(req.params.id);
    const task = storage.updateTask(id, req.body);
    if (!task) return res.status(404).json({ error: "Task not found" });
    res.json(task);
  });
  app.post("/api/tasks/upsert", (req, res) => {
    const parsed = insertTaskInstanceSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    res.json(storage.upsertTask(parsed.data));
  });

  // ─── ACTIVITY LOG ────────────────────────────────────────────────────────
  app.get("/api/periods/:periodId/activity", (req, res) => {
    const wf = req.query.workflow as string | undefined;
    res.json(storage.getActivityLog(Number(req.params.periodId), wf));
  });
  app.get("/api/activity/recent", (req, res) => {
    const limit = req.query.limit ? Number(req.query.limit) : 50;
    res.json(storage.getRecentActivity(limit));
  });
  app.post("/api/activity", (req, res) => {
    const parsed = insertActivityLogSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    res.status(201).json(storage.createActivityLog(parsed.data));
  });

  // ─── TIME TRACKING ───────────────────────────────────────────────────────
  app.get("/api/periods/:periodId/time", (req, res) => {
    const wf = req.query.workflow as string | undefined;
    res.json(storage.getTimeEntries(Number(req.params.periodId), wf));
  });
  app.get("/api/time/stats", (req, res) => {
    res.json(storage.getWorkflowStats());
  });
  app.post("/api/time/start", (req, res) => {
    const parsed = insertTimeEntrySchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    res.status(201).json(storage.startTimer(parsed.data));
  });
  app.patch("/api/time/:id/stop", (req, res) => {
    const id = Number(req.params.id);
    const { endedAt, durationMinutes } = req.body;
    const entry = storage.stopTimer(id, endedAt, durationMinutes);
    if (!entry) return res.status(404).json({ error: "Time entry not found" });
    res.json(entry);
  });

  // ─── SEARCH ──────────────────────────────────────────────────────────────
  app.get("/api/search/notes", (req, res) => {
    const q = (req.query.q as string) ?? "";
    res.json(storage.searchNotes(q));
  });

  // ─── PAYMENT RECORDS ────────────────────────────────────────────────────
  app.get("/api/periods/:periodId/payments", (req, res) => {
    res.json(storage.getPaymentsByPeriod(Number(req.params.periodId)));
  });
  app.post("/api/payments", (req, res) => {
    const parsed = insertPaymentRecordSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    res.status(201).json(storage.createPayment(parsed.data));
  });
  app.patch("/api/payments/:id", (req, res) => {
    const id = Number(req.params.id);
    const payment = storage.updatePayment(id, req.body);
    if (!payment) return res.status(404).json({ error: "Payment not found" });
    res.json(payment);
  });
  app.delete("/api/payments/:id", (req, res) => {
    storage.deletePayment(Number(req.params.id));
    res.json({ success: true });
  });

  return httpServer;
}
