import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { TaskInstance, Client, Period, PaymentRecord, Staff, ActivityLog, TimeEntry } from "@shared/schema";
import { useState, useEffect, useMemo, useRef } from "react";
import {
  getWorkflow, isTaskBlocked, areAllSubtasksComplete, WORKFLOWS,
  type WorkflowTask, type TaskStatus
} from "@/lib/workflows";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  CheckCircle2, Circle, Flag, SkipForward, ChevronDown, ChevronUp,
  Lock, ArrowLeft, Printer, Plus, CheckSquare, Trash2, AlertCircle,
  ExternalLink, BookOpen, Clock, Activity, Upload, Filter
} from "lucide-react";

export default function WorkflowPage() {
  const { clientId, periodId, workflow } = useParams<{ clientId: string; periodId: string; workflow: string }>();
  const cId = Number(clientId);
  const pId = Number(periodId);
  const { toast } = useToast();

  const wf = getWorkflow(workflow);

  // Active tab: checklist | activity | time
  const [activeTab, setActiveTab] = useState<"checklist" | "activity" | "time">("checklist");
  // Status filter
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "flagged" | "skipped">("all");

  const { data: clients = [] } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
    queryFn: () => apiRequest("GET", "/api/clients").then((r) => r.json()),
  });
  const client = clients.find((c) => c.id === cId);

  const { data: staffList = [] } = useQuery<Staff[]>({
    queryKey: ["/api/staff"],
    queryFn: () => apiRequest("GET", "/api/staff").then((r) => r.json()),
  });

  const { data: periods = [] } = useQuery<Period[]>({
    queryKey: ["/api/clients", cId, "periods"],
    queryFn: () => apiRequest("GET", `/api/clients/${cId}/periods`).then((r) => r.json()),
  });
  const period = periods.find((p) => p.id === pId);

  const { data: taskInstances = [] } = useQuery<TaskInstance[]>({
    queryKey: ["/api/periods", pId, "tasks", workflow],
    queryFn: () => apiRequest("GET", `/api/periods/${pId}/tasks?workflow=${workflow}`).then((r) => r.json()),
  });

  const { data: payments = [] } = useQuery<PaymentRecord[]>({
    queryKey: ["/api/periods", pId, "payments"],
    queryFn: () => apiRequest("GET", `/api/periods/${pId}/payments`).then((r) => r.json()),
    enabled: workflow === "payment_reconciliation",
  });

  const { data: activityLogs = [] } = useQuery<ActivityLog[]>({
    queryKey: ["/api/periods", pId, "activity", workflow],
    queryFn: () => apiRequest("GET", `/api/periods/${pId}/activity?workflow=${workflow}`).then((r) => r.json()),
    enabled: activeTab === "activity",
  });

  const { data: timeEntries = [] } = useQuery<TimeEntry[]>({
    queryKey: ["/api/periods", pId, "time", workflow],
    queryFn: () => apiRequest("GET", `/api/periods/${pId}/time?workflow=${workflow}`).then((r) => r.json()),
    enabled: activeTab === "time",
  });

  // Active timer
  const { data: activeTimer } = useQuery<TimeEntry | null>({
    queryKey: ["/api/periods", pId, "time", workflow, "active"],
    queryFn: async () => {
      const entries = await apiRequest("GET", `/api/periods/${pId}/time?workflow=${workflow}`).then(r => r.json()) as TimeEntry[];
      return entries.find(t => !t.endedAt) ?? null;
    },
    refetchInterval: (data) => (data ? 15000 : false),
  });

  const bulkInit = useMutation({
    mutationFn: (tasks: any[]) => apiRequest("POST", "/api/tasks/bulk-init", tasks).then((r) => r.json()),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/periods", pId, "tasks", workflow] }),
  });

  useEffect(() => {
    if (wf && taskInstances.length === 0) {
      const allKeys = wf.tasks.flatMap((t) => [
        { periodId: pId, workflowType: workflow, taskKey: t.key, status: "pending" },
        ...(t.subTasks ?? []).map((s) => ({
          periodId: pId, workflowType: workflow, taskKey: s.key, status: "pending",
        })),
      ]);
      bulkInit.mutate(allKeys);
    }
  }, [wf, taskInstances.length]);

  const instanceMap = useMemo(() => {
    const m = new Map<string, TaskInstance>();
    for (const inst of taskInstances) m.set(inst.taskKey, inst);
    return m;
  }, [taskInstances]);

  const statusMap = useMemo(() => {
    const m = new Map<string, TaskStatus>();
    for (const [k, v] of instanceMap) m.set(k, v.status as TaskStatus);
    return m;
  }, [instanceMap]);

  const updateTask = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<TaskInstance> }) =>
      apiRequest("PATCH", `/api/tasks/${id}`, data).then((r) => r.json()),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/periods", pId, "tasks", workflow] }),
  });

  const upsertTask = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/tasks/upsert", data).then((r) => r.json()),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/periods", pId, "tasks", workflow] }),
  });

  const logActivity = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/activity", data).then((r) => r.json()),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/periods", pId, "activity", workflow] }),
  });

  const startTimer = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/time/start", data).then((r) => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/periods", pId, "time", workflow] });
      queryClient.invalidateQueries({ queryKey: ["/api/periods", pId, "time", workflow, "active"] });
    },
  });

  const stopTimer = useMutation({
    mutationFn: ({ id, endedAt, durationMinutes }: { id: number; endedAt: string; durationMinutes: number }) =>
      apiRequest("PATCH", `/api/time/${id}/stop`, { endedAt, durationMinutes }).then((r) => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/periods", pId, "time", workflow] });
      queryClient.invalidateQueries({ queryKey: ["/api/periods", pId, "time", workflow, "active"] });
      toast({ title: "Timer stopped" });
    },
  });

  const getTaskLabel = (taskKey: string) => {
    if (!wf) return taskKey;
    for (const t of wf.tasks) {
      if (t.key === taskKey) return t.label;
      for (const s of t.subTasks ?? []) {
        if (s.key === taskKey) return s.label;
      }
    }
    return taskKey;
  };

  const handleSetStatus = (taskKey: string, newStatus: TaskStatus, note?: string) => {
    const existing = instanceMap.get(taskKey);
    const now = new Date().toISOString();
    const data = {
      status: newStatus,
      note: note ?? existing?.note,
      completedAt: newStatus === "complete" ? now : existing?.completedAt,
    };
    const actionLabels: Record<string, string> = {
      complete: "completed", flagged: "flagged", skipped: "skipped", pending: "restored",
    };
    if (existing) {
      updateTask.mutate({ id: existing.id, data });
    } else {
      upsertTask.mutate({ periodId: pId, workflowType: workflow, taskKey, ...data });
    }
    // Log activity
    if (newStatus !== "pending") {
      logActivity.mutate({
        periodId: pId,
        clientId: cId,
        workflowType: workflow,
        taskKey,
        taskLabel: getTaskLabel(taskKey),
        action: actionLabels[newStatus] ?? newStatus,
        actor: "You",
        detail: note ?? "",
        timestamp: now,
      });
    }
  };

  const handleNoteSet = (taskKey: string, noteText: string, currentStatus: TaskStatus) => {
    handleSetStatus(taskKey, currentStatus, noteText);
    const now = new Date().toISOString();
    logActivity.mutate({
      periodId: pId,
      clientId: cId,
      workflowType: workflow,
      taskKey,
      taskLabel: getTaskLabel(taskKey),
      action: "note_added",
      actor: "You",
      detail: noteText,
      timestamp: now,
    });
  };

  const handleStartTimer = () => {
    startTimer.mutate({
      periodId: pId,
      clientId: cId,
      workflowType: workflow,
      startedAt: new Date().toISOString(),
      actor: "You",
    });
    toast({ title: "Timer started" });
  };

  const handleStopTimer = () => {
    if (!activeTimer) return;
    const endedAt = new Date().toISOString();
    const start = new Date(activeTimer.startedAt);
    const end = new Date(endedAt);
    const durationMinutes = (end.getTime() - start.getTime()) / 60000;
    stopTimer.mutate({ id: activeTimer.id, endedAt, durationMinutes });
  };

  if (!wf) return <div className="p-8 text-muted-foreground">Unknown workflow: {workflow}</div>;

  const completedParents = wf.tasks.filter((t) => {
    const s = statusMap.get(t.key);
    return s === "complete" || s === "skipped";
  }).length;
  const pct = Math.round((completedParents / wf.tasks.length) * 100);

  const flaggedTasks = wf.tasks.filter(t => statusMap.get(t.key) === "flagged");

  // Filter tasks for checklist tab
  const filteredTasks = wf.tasks.filter(t => {
    if (statusFilter === "all") return true;
    if (statusFilter === "pending") {
      const s = statusMap.get(t.key);
      return !s || s === "pending";
    }
    return statusMap.get(t.key) === statusFilter;
  });

  const categories = [...new Set(filteredTasks.map((t) => t.category))];

  // Timer display
  const timerElapsed = activeTimer
    ? Math.floor((Date.now() - new Date(activeTimer.startedAt).getTime()) / 60000)
    : 0;

  const totalMinutes = timeEntries
    .filter(t => t.durationMinutes != null)
    .reduce((s, t) => s + (t.durationMinutes ?? 0), 0);

  const isOverdue = period?.dueDate && period.status === "active" && new Date(period.dueDate) < new Date();

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground no-print">
        <Link href="/"><a className="hover:text-foreground flex items-center gap-1"><ArrowLeft size={14} /> Dashboard</a></Link>
        <span>/</span>
        <Link href={`/clients/${cId}`}><a className="hover:text-foreground">{client?.name ?? "Client"}</a></Link>
        <span>/</span>
        <span className="text-foreground font-medium">{period?.label}</span>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-bold font-display">{wf.label}</h1>
            {isOverdue && (
              <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 text-xs">Overdue</Badge>
            )}
          </div>
          <p className="text-muted-foreground text-sm">{client?.name} · {period?.label}</p>
          {period?.dueDate && (
            <p className="text-xs text-muted-foreground mt-0.5">
              Due {new Date(period.dueDate + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
            </p>
          )}
        </div>
        <div className="flex gap-2 flex-wrap no-print">
          {/* Timer button */}
          {activeTimer ? (
            <Button
              variant="outline" size="sm"
              onClick={handleStopTimer}
              className="gap-1.5 border-orange-300 text-orange-600 hover:bg-orange-50 dark:border-orange-700 dark:text-orange-400"
              disabled={stopTimer.isPending}
              data-testid="button-stop-timer"
            >
              <Clock size={14} />
              {timerElapsed}m — Stop
            </Button>
          ) : (
            <Button
              variant="outline" size="sm"
              onClick={handleStartTimer}
              disabled={startTimer.isPending}
              className="gap-1.5"
              data-testid="button-start-timer"
            >
              <Clock size={14} />
              Start Timer
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => window.print()} className="gap-1.5">
            <Printer size={14} />
            Print
          </Button>
        </div>
      </div>

      {/* Progress bar */}
      <div className="bg-card border border-border rounded-xl p-5 space-y-3">
        <div className="flex items-center justify-between">
          <span className="font-semibold text-sm font-display">Overall Progress</span>
          <div className="flex items-center gap-3">
            {totalMinutes > 0 && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock size={11} /> {totalMinutes < 60 ? `${Math.round(totalMinutes)}m` : `${(totalMinutes/60).toFixed(1)}h`} logged
              </span>
            )}
            <span className={cn(
              "text-sm font-bold",
              pct === 100 ? "text-green-600" : pct > 0 ? "text-[#f97316]" : "text-muted-foreground"
            )}>
              {pct}% — {completedParents}/{wf.tasks.length} tasks
            </span>
          </div>
        </div>
        <Progress
          value={pct}
          className="h-2.5"
          style={{ "--progress-color": pct === 100 ? "#22c55e" : "#f97316" } as any}
        />
        <div className="flex gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1"><CheckCircle2 size={11} className="text-green-500" /> Complete</span>
          <span className="flex items-center gap-1"><Flag size={11} className="text-orange-400" /> Flagged</span>
          <span className="flex items-center gap-1"><Lock size={11} className="text-muted-foreground" /> Blocked</span>
          <span className="flex items-center gap-1"><SkipForward size={11} className="text-muted-foreground" /> Skipped</span>
        </div>
      </div>

      {/* Flagged items digest */}
      {flaggedTasks.length > 0 && (
        <div className="border border-orange-200 dark:border-orange-800/50 bg-orange-50 dark:bg-orange-950/20 rounded-xl p-4 space-y-2">
          <div className="flex items-center gap-2">
            <Flag size={14} className="text-orange-500" />
            <span className="text-sm font-semibold text-orange-800 dark:text-orange-300">
              {flaggedTasks.length} flagged item{flaggedTasks.length !== 1 ? "s" : ""} need attention
            </span>
          </div>
          <ul className="space-y-1">
            {flaggedTasks.map(t => (
              <li key={t.key} className="text-xs text-orange-700 dark:text-orange-400 flex items-center gap-1.5">
                <span className="w-1 h-1 rounded-full bg-orange-400 flex-shrink-0" />
                {t.label}
                {instanceMap.get(t.key)?.note && (
                  <span className="text-orange-500/70 italic">— {instanceMap.get(t.key)?.note}</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Tabs: Checklist / Activity / Time */}
      <div className="flex gap-1 border-b border-border no-print">
        {[
          { id: "checklist", label: "Checklist" },
          { id: "activity", label: "Activity Log" },
          { id: "time", label: "Time Tracking" },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={cn(
              "px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px",
              activeTab === tab.id
                ? "border-[#f97316] text-[#f97316]"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
            data-testid={`tab-${tab.id}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── CHECKLIST TAB ── */}
      {activeTab === "checklist" && (
        <div className="space-y-6">
          {/* Status filter pills */}
          <div className="flex items-center gap-2 flex-wrap no-print">
            <Filter size={13} className="text-muted-foreground" />
            {(["all", "pending", "flagged", "skipped"] as const).map(f => (
              <button
                key={f}
                onClick={() => setStatusFilter(f)}
                className={cn(
                  "px-3 py-1 rounded-full text-xs font-medium transition-colors",
                  statusFilter === f
                    ? "bg-[#1a3a5c] text-white"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                )}
                data-testid={`filter-${f}`}
              >
                {f === "all" ? "All" : f.charAt(0).toUpperCase() + f.slice(1)}
                {f === "flagged" && flaggedTasks.length > 0 && (
                  <span className="ml-1 bg-orange-400 text-white rounded-full px-1 text-[10px]">{flaggedTasks.length}</span>
                )}
              </button>
            ))}
          </div>

          {filteredTasks.length === 0 && (
            <div className="text-center py-10 text-muted-foreground text-sm border-2 border-dashed rounded-xl">
              No {statusFilter} tasks
            </div>
          )}

          {categories.map((cat) => {
            const catTasks = filteredTasks.filter((t) => t.category === cat);
            return (
              <div key={cat} className="space-y-2">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-1">{cat}</h2>
                {catTasks.map((task) => (
                  <TaskCard
                    key={task.key}
                    task={task}
                    instance={instanceMap.get(task.key)}
                    subInstances={task.subTasks?.map((s) => instanceMap.get(s.key)) ?? []}
                    statusMap={statusMap}
                    staffList={staffList}
                    onSetStatus={handleSetStatus}
                    onSetNote={handleNoteSet}
                    periodId={pId}
                    workflowType={workflow}
                    clientId={cId}
                  />
                ))}
              </div>
            );
          })}

          {workflow === "payment_reconciliation" && (
            <PaymentReconciliationTable periodId={pId} payments={payments} />
          )}
        </div>
      )}

      {/* ── ACTIVITY LOG TAB ── */}
      {activeTab === "activity" && (
        <ActivityLogView logs={activityLogs} />
      )}

      {/* ── TIME TRACKING TAB ── */}
      {activeTab === "time" && (
        <TimeTrackingView entries={timeEntries} activeTimer={activeTimer ?? null} onStart={handleStartTimer} onStop={handleStopTimer} />
      )}
    </div>
  );
}

// ─── TASK CARD ─────────────────────────────────────────────────────────────────

function TaskCard({
  task, instance, subInstances, statusMap, staffList, onSetStatus, onSetNote, periodId, workflowType, clientId,
}: {
  task: WorkflowTask;
  instance: TaskInstance | undefined;
  subInstances: (TaskInstance | undefined)[];
  statusMap: Map<string, TaskStatus>;
  staffList: Staff[];
  onSetStatus: (key: string, status: TaskStatus, note?: string) => void;
  onSetNote: (key: string, note: string, status: TaskStatus) => void;
  periodId: number;
  workflowType: string;
  clientId: number;
}) {
  const status = (instance?.status ?? "pending") as TaskStatus;
  const [expanded, setExpanded] = useState(false);
  const [noteOpen, setNoteOpen] = useState(false);
  const [noteText, setNoteText] = useState(instance?.note ?? "");
  const [assignOpen, setAssignOpen] = useState(false);

  const assignTask = useMutation({
    mutationFn: ({ id, assignedTo }: { id: number; assignedTo: string }) =>
      apiRequest("PATCH", `/api/tasks/${id}`, { assignedTo }).then((r) => r.json()),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/periods", periodId, "tasks", workflowType] }),
  });

  const blocked = isTaskBlocked(task, statusMap);
  const allSubsDone = areAllSubtasksComplete(task, statusMap);
  const hasSubTasks = (task.subTasks?.length ?? 0) > 0;
  const subComplete = task.subTasks?.filter((s) => {
    const ss = statusMap.get(s.key);
    return ss === "complete" || ss === "skipped";
  }).length ?? 0;

  const handleToggleComplete = () => {
    if (blocked) return;
    if (status === "complete") {
      onSetStatus(task.key, "pending");
    } else if (!hasSubTasks || allSubsDone) {
      onSetStatus(task.key, "complete");
    } else {
      setExpanded(true);
    }
  };

  const assignedStaff = staffList.find(s => s.initials === instance?.assignedTo || s.name === instance?.assignedTo);

  const cardClass = cn(
    "border rounded-xl transition-all duration-200",
    status === "complete" && "task-card-complete",
    status === "flagged" && "task-card-flagged",
    status === "skipped" && "task-card-skipped",
    blocked && "task-card-blocked",
    status === "pending" && !blocked && "border-border bg-card hover:border-[#1a3a5c]/30",
  );

  return (
    <div className={cardClass} data-testid={`task-card-${task.key}`}>
      <div className="flex items-start gap-3 p-4">
        <button
          onClick={handleToggleComplete}
          disabled={blocked}
          className="mt-0.5 flex-shrink-0"
          aria-label={status === "complete" ? "Mark incomplete" : "Mark complete"}
          data-testid={`button-complete-${task.key}`}
        >
          {status === "complete" ? (
            <CheckCircle2 size={20} className="text-green-500" />
          ) : status === "flagged" ? (
            <Flag size={20} className="text-orange-400" />
          ) : blocked ? (
            <Lock size={20} className="text-muted-foreground/50" />
          ) : (
            <Circle size={20} className="text-muted-foreground hover:text-[#1a3a5c] transition-colors" />
          )}
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <p className={cn(
                "font-medium text-sm leading-snug",
                status === "complete" && "line-through text-muted-foreground",
                status === "skipped" && "text-muted-foreground",
              )}>
                {task.label}
              </p>
              {/* Assignee badge */}
              {instance?.assignedTo && (
                <div className="flex items-center gap-1 mt-1">
                  <div className="w-4 h-4 rounded-full bg-[#1a3a5c]/20 flex items-center justify-center text-[9px] font-bold text-[#1a3a5c] dark:text-blue-300">
                    {instance.assignedTo.slice(0, 2)}
                  </div>
                  <span className="text-xs text-muted-foreground">{instance.assignedTo}</span>
                </div>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-1 flex-shrink-0 no-print">
              {/* QBO link */}
              {task.qboLink && status !== "complete" && (
                <a
                  href={task.qboLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Open in QBO"
                  className="p-1 rounded text-muted-foreground hover:text-[#2CA01C] transition-colors"
                  onClick={(e) => e.stopPropagation()}
                  data-testid={`link-qbo-${task.key}`}
                >
                  <ExternalLink size={13} />
                </a>
              )}
              {/* Help link */}
              {task.qboHelpLink && status !== "complete" && (
                <a
                  href={task.qboHelpLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="QBO Help Center"
                  className="p-1 rounded text-muted-foreground hover:text-blue-500 transition-colors"
                  onClick={(e) => e.stopPropagation()}
                  data-testid={`link-help-${task.key}`}
                >
                  <BookOpen size={13} />
                </a>
              )}
              {/* Assign */}
              {!blocked && staffList.length > 0 && (
                <button
                  onClick={() => setAssignOpen(true)}
                  className="p-1 rounded text-muted-foreground hover:text-[#1a3a5c] transition-colors text-xs"
                  title="Assign to staff"
                  data-testid={`button-assign-${task.key}`}
                >
                  {instance?.assignedTo ? (
                    <div className="w-5 h-5 rounded-full bg-[#1a3a5c]/20 flex items-center justify-center text-[9px] font-bold text-[#1a3a5c] dark:text-blue-300">
                      {instance.assignedTo.slice(0, 2)}
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground/60">@</span>
                  )}
                </button>
              )}
              {!blocked && status !== "complete" && status !== "skipped" && (
                <button
                  onClick={() => onSetStatus(task.key, "flagged")}
                  className={cn(
                    "p-1 rounded text-muted-foreground hover:text-orange-500 transition-colors",
                    status === "flagged" && "text-orange-400"
                  )}
                  title="Flag for review"
                  data-testid={`button-flag-${task.key}`}
                >
                  <Flag size={13} />
                </button>
              )}
              {!blocked && (
                <button
                  onClick={() => { setNoteText(instance?.note ?? ""); setNoteOpen(true); }}
                  className="p-1 rounded text-muted-foreground hover:text-foreground transition-colors text-xs font-medium"
                  title="Add note"
                  data-testid={`button-note-${task.key}`}
                >
                  Note
                </button>
              )}
              {!blocked && status !== "skipped" && status !== "complete" && (
                <button
                  onClick={() => onSetStatus(task.key, "skipped")}
                  className="p-1 rounded text-muted-foreground hover:text-muted-foreground/80 transition-colors"
                  title="Skip this task"
                  data-testid={`button-skip-${task.key}`}
                >
                  <SkipForward size={13} />
                </button>
              )}
              {status === "skipped" && (
                <button
                  onClick={() => onSetStatus(task.key, "pending")}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  Restore
                </button>
              )}
            </div>
          </div>

          {/* Hint */}
          {task.hint && status !== "complete" && (
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{task.hint}</p>
          )}

          {/* Inline note */}
          {instance?.note && (
            <div className="mt-2 text-xs bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-800/40 rounded-md px-3 py-1.5 text-yellow-800 dark:text-yellow-300">
              Note: {instance.note}
            </div>
          )}

          {/* Subtask progress indicator */}
          {hasSubTasks && (
            <button
              onClick={() => setExpanded((e) => !e)}
              className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
              data-testid={`button-expand-${task.key}`}
            >
              {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              {subComplete}/{task.subTasks!.length} sub-steps
              {!allSubsDone && status !== "complete" && (
                <AlertCircle size={11} className="text-orange-400 ml-1" />
              )}
            </button>
          )}
        </div>
      </div>

      {/* Sub-tasks */}
      {hasSubTasks && expanded && (
        <div className="border-t border-border/60 px-4 pb-3 pt-2 space-y-1.5 subtask-row">
          {task.subTasks!.map((sub, i) => {
            const subInst = subInstances[i];
            const subStatus = (subInst?.status ?? "pending") as TaskStatus;
            return (
              <div key={sub.key} className="flex items-center gap-2.5 py-1" data-testid={`subtask-${sub.key}`}>
                <button
                  onClick={() => onSetStatus(sub.key, subStatus === "complete" ? "pending" : "complete")}
                  className="flex-shrink-0"
                  aria-label={subStatus === "complete" ? "Uncheck" : "Check"}
                  data-testid={`button-subtask-${sub.key}`}
                >
                  {subStatus === "complete" ? (
                    <CheckCircle2 size={16} className="text-green-500" />
                  ) : (
                    <Circle size={16} className="text-muted-foreground hover:text-[#1a3a5c]" />
                  )}
                </button>
                <span className={cn("text-xs", subStatus === "complete" && "line-through text-muted-foreground")}>
                  {sub.label}
                </span>
                {sub.hint && subStatus !== "complete" && (
                  <span className="text-muted-foreground/60 text-xs ml-1 hidden sm:block">— {sub.hint}</span>
                )}
              </div>
            );
          })}
          {allSubsDone && status !== "complete" && (
            <div className="pt-2">
              <Button
                size="sm"
                className="bg-green-600 hover:bg-green-700 text-white text-xs h-7 gap-1"
                onClick={() => onSetStatus(task.key, "complete")}
                data-testid={`button-complete-parent-${task.key}`}
              >
                <CheckSquare size={13} />
                Mark "{task.label}" Complete
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Note dialog */}
      <Dialog open={noteOpen} onOpenChange={setNoteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display text-sm">Note — {task.label}</DialogTitle>
          </DialogHeader>
          <Textarea
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            placeholder="Add your note here..."
            className="min-h-[80px]"
            data-testid={`textarea-note-${task.key}`}
          />
          <Button
            onClick={() => {
              onSetNote(task.key, noteText, status);
              setNoteOpen(false);
            }}
            className="bg-[#1a3a5c] hover:bg-[#153050] text-white"
          >
            Save Note
          </Button>
        </DialogContent>
      </Dialog>

      {/* Assign dialog */}
      <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display text-sm">Assign — {task.label}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 pt-2">
            <button
              className="w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-muted transition-colors text-muted-foreground"
              onClick={() => {
                if (instance) assignTask.mutate({ id: instance.id, assignedTo: "" });
                setAssignOpen(false);
              }}
            >
              Unassigned
            </button>
            {staffList.map(s => (
              <button
                key={s.id}
                className={cn(
                  "w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-muted transition-colors flex items-center gap-2",
                  instance?.assignedTo === s.initials && "bg-[#1a3a5c]/10 text-[#1a3a5c] dark:bg-[#1a3a5c]/20 dark:text-blue-300 font-medium"
                )}
                onClick={() => {
                  if (instance) assignTask.mutate({ id: instance.id, assignedTo: s.initials });
                  setAssignOpen(false);
                }}
              >
                <div className="w-6 h-6 rounded-full bg-[#1a3a5c]/20 flex items-center justify-center text-xs font-bold text-[#1a3a5c] dark:text-blue-300">
                  {s.initials}
                </div>
                {s.name}
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── ACTIVITY LOG VIEW ────────────────────────────────────────────────────────

function ActivityLogView({ logs }: { logs: ActivityLog[] }) {
  const actionColors: Record<string, string> = {
    completed: "text-green-600 dark:text-green-400",
    flagged: "text-orange-500 dark:text-orange-400",
    skipped: "text-muted-foreground",
    note_added: "text-blue-500 dark:text-blue-400",
    restored: "text-muted-foreground",
    assigned: "text-[#1a3a5c] dark:text-blue-300",
  };
  const actionIcons: Record<string, React.ReactNode> = {
    completed: <CheckCircle2 size={14} className="text-green-500" />,
    flagged: <Flag size={14} className="text-orange-400" />,
    skipped: <SkipForward size={14} className="text-muted-foreground" />,
    note_added: <Activity size={14} className="text-blue-400" />,
    restored: <Circle size={14} className="text-muted-foreground" />,
  };

  if (logs.length === 0) {
    return (
      <div className="text-center py-16 text-muted-foreground text-sm border-2 border-dashed rounded-xl border-border">
        <Activity size={28} className="mx-auto mb-3 opacity-30" />
        <p>No activity logged yet</p>
        <p className="text-xs mt-1">Actions on this workflow will appear here</p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {logs.map((log) => (
        <div key={log.id} className="flex items-start gap-3 py-2.5 border-b border-border/50 last:border-0" data-testid={`activity-log-${log.id}`}>
          <div className="mt-0.5 flex-shrink-0">{actionIcons[log.action] ?? <Activity size={14} />}</div>
          <div className="flex-1 min-w-0">
            <p className="text-sm">
              <span className="font-medium">{log.actor}</span>{" "}
              <span className={cn("font-medium", actionColors[log.action])}>
                {log.action.replace("_", " ")}
              </span>{" "}
              <span className="text-muted-foreground">{log.taskLabel}</span>
            </p>
            {log.detail && (
              <p className="text-xs text-muted-foreground mt-0.5 italic truncate">"{log.detail}"</p>
            )}
          </div>
          <span className="text-xs text-muted-foreground flex-shrink-0 tabular-nums">
            {new Date(log.timestamp).toLocaleString("en-US", {
              month: "short", day: "numeric",
              hour: "numeric", minute: "2-digit",
            })}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── TIME TRACKING VIEW ───────────────────────────────────────────────────────

function TimeTrackingView({
  entries, activeTimer, onStart, onStop
}: {
  entries: TimeEntry[];
  activeTimer: TimeEntry | null;
  onStart: () => void;
  onStop: () => void;
}) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!activeTimer) return;
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - new Date(activeTimer.startedAt).getTime()) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [activeTimer]);

  const completedEntries = entries.filter(e => e.durationMinutes != null);
  const totalMinutes = completedEntries.reduce((s, e) => s + (e.durationMinutes ?? 0), 0);

  const formatDuration = (mins: number) => {
    if (mins < 60) return `${Math.round(mins)}m`;
    const h = Math.floor(mins / 60);
    const m = Math.round(mins % 60);
    return `${h}h ${m}m`;
  };

  const formatElapsed = (secs: number) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    return h > 0
      ? `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`
      : `${m}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <div className="space-y-6">
      {/* Active timer */}
      <div className="bg-card border border-border rounded-xl p-5 text-center space-y-3">
        {activeTimer ? (
          <>
            <div className="text-3xl font-bold font-display text-[#f97316] tabular-nums">{formatElapsed(elapsed)}</div>
            <p className="text-sm text-muted-foreground">Timer running since {new Date(activeTimer.startedAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}</p>
            <Button onClick={onStop} className="bg-red-500 hover:bg-red-600 text-white gap-2" data-testid="button-stop-timer-panel">
              <Clock size={14} /> Stop Timer
            </Button>
          </>
        ) : (
          <>
            <div className="text-3xl font-bold font-display text-muted-foreground">0:00</div>
            <p className="text-sm text-muted-foreground">No timer running</p>
            <Button onClick={onStart} variant="outline" className="gap-2" data-testid="button-start-timer-panel">
              <Clock size={14} /> Start Timer
            </Button>
          </>
        )}
      </div>

      {/* Summary */}
      {totalMinutes > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div className="bg-card border border-border rounded-xl p-4">
            <p className="text-xs text-muted-foreground">Total Logged</p>
            <p className="text-lg font-bold font-display text-[#1a3a5c] dark:text-blue-300 mt-1">{formatDuration(totalMinutes)}</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-4">
            <p className="text-xs text-muted-foreground">Sessions</p>
            <p className="text-lg font-bold font-display mt-1">{completedEntries.length}</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-4">
            <p className="text-xs text-muted-foreground">Avg Session</p>
            <p className="text-lg font-bold font-display mt-1">
              {completedEntries.length > 0 ? formatDuration(totalMinutes / completedEntries.length) : "—"}
            </p>
          </div>
        </div>
      )}

      {/* Session history */}
      {completedEntries.length === 0 && !activeTimer ? (
        <div className="text-center py-12 text-muted-foreground text-sm border-2 border-dashed rounded-xl border-border">
          <Clock size={28} className="mx-auto mb-3 opacity-30" />
          <p>No time logged yet</p>
        </div>
      ) : (
        <div>
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Session History</h3>
          <div className="space-y-2">
            {completedEntries.map(e => (
              <div key={e.id} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0" data-testid={`time-entry-${e.id}`}>
                <div>
                  <p className="text-sm font-medium">{formatDuration(e.durationMinutes ?? 0)}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(e.startedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })} · {new Date(e.startedAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })} — {e.endedAt ? new Date(e.endedAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }) : "running"}
                  </p>
                </div>
                <span className="text-xs text-muted-foreground">{e.actor}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── PAYMENT RECONCILIATION TABLE ──────────────────────────────────────────────

function PaymentReconciliationTable({ periodId, payments }: { periodId: number; payments: PaymentRecord[] }) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [form, setForm] = useState({
    source: "factoring",
    referenceNumber: "",
    driverName: "",
    loadNumber: "",
    expectedAmount: "",
    actualAmount: "",
    depositDate: "",
    notes: "",
  });

  const createPayment = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/payments", data).then((r) => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/periods", periodId, "payments"] });
      toast({ title: "Payment record added" });
      setOpen(false);
      setForm({ source: "factoring", referenceNumber: "", driverName: "", loadNumber: "", expectedAmount: "", actualAmount: "", depositDate: "", notes: "" });
    },
  });

  const updatePayment = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      apiRequest("PATCH", `/api/payments/${id}`, data).then((r) => r.json()),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/periods", periodId, "payments"] }),
  });

  const deletePayment = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/payments/${id}`).then((r) => r.json()),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/periods", periodId, "payments"] }),
  });

  // CSV import
  const fileRef = useRef<HTMLInputElement>(null);
  const handleCsvImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const text = ev.target?.result as string;
      const lines = text.trim().split("\n").filter(l => l.trim());
      // Skip header row if it doesn't parse as a number
      const dataLines = lines.filter(l => {
        const parts = l.split(",");
        return parts.length >= 2 && !isNaN(parseFloat(parts[parts.length - 1]));
      });
      let imported = 0;
      for (const line of dataLines) {
        const parts = line.split(",").map(p => p.trim().replace(/^"|"$/g, ""));
        if (parts.length < 2) continue;
        const description = parts[0];
        const amount = parseFloat(parts[parts.length - 1]);
        if (isNaN(amount)) continue;
        await apiRequest("POST", "/api/payments", {
          periodId,
          source: "direct",
          referenceNumber: description,
          expectedAmount: amount,
          actualAmount: amount,
          reconciled: false,
        });
        imported++;
      }
      queryClient.invalidateQueries({ queryKey: ["/api/periods", periodId, "payments"] });
      toast({ title: `${imported} payment${imported !== 1 ? "s" : ""} imported from CSV` });
      setImportOpen(false);
      if (fileRef.current) fileRef.current.value = "";
    };
    reader.readAsText(file);
  };

  const totalExpected = payments.reduce((s, p) => s + p.expectedAmount, 0);
  const totalActual = payments.reduce((s, p) => s + (p.actualAmount ?? 0), 0);
  const totalVariance = totalActual - totalExpected;
  const reconciledCount = payments.filter((p) => p.reconciled).length;

  const sourceLabels: Record<string, string> = {
    factoring: "Factoring",
    direct: "Direct Pay",
    broker: "Broker",
    owner_op_settlement: "Owner-Op Settlement",
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold font-display uppercase tracking-wider text-muted-foreground">Payment Reconciliation</h2>
        <div className="flex gap-2 no-print">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setImportOpen(true)}
            className="gap-1.5 h-8"
            data-testid="button-import-csv"
          >
            <Upload size={13} />
            Import CSV
          </Button>
          <Button
            size="sm"
            onClick={() => setOpen(true)}
            className="bg-[#1a3a5c] hover:bg-[#153050] text-white gap-1.5 h-8"
            data-testid="button-add-payment"
          >
            <Plus size={13} />
            Add Payment
          </Button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <SummaryCard label="Expected" value={`$${totalExpected.toLocaleString("en-US", { minimumFractionDigits: 2 })}`} color="blue" />
        <SummaryCard label="Received" value={`$${totalActual.toLocaleString("en-US", { minimumFractionDigits: 2 })}`} color="green" />
        <SummaryCard
          label="Variance"
          value={`${totalVariance >= 0 ? "+" : ""}$${totalVariance.toLocaleString("en-US", { minimumFractionDigits: 2 })}`}
          color={totalVariance === 0 ? "green" : totalVariance > 0 ? "orange" : "red"}
        />
        <SummaryCard label="Reconciled" value={`${reconciledCount}/${payments.length}`} color="navy" />
      </div>

      {/* Table */}
      {payments.length === 0 ? (
        <div className="text-center py-10 border-2 border-dashed rounded-xl border-border text-muted-foreground text-sm">
          No payment records yet. Add a payment or import a CSV.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50 border-b border-border">
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Source</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Reference / Load</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground">Expected</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground">Actual</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground">Variance</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground">Rec.</th>
                <th className="px-4 py-3 no-print"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {payments.map((p) => {
                const variance = (p.actualAmount ?? 0) - p.expectedAmount;
                return (
                  <tr key={p.id} className="bg-card hover:bg-muted/30 transition-colors" data-testid={`payment-row-${p.id}`}>
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium">{sourceLabels[p.source] ?? p.source}</p>
                        {p.driverName && <p className="text-xs text-muted-foreground">{p.driverName}</p>}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">
                      {p.referenceNumber || p.loadNumber ? (
                        <span>{p.referenceNumber}{p.referenceNumber && p.loadNumber ? " / " : ""}{p.loadNumber}</span>
                      ) : "—"}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-xs">${p.expectedAmount.toFixed(2)}</td>
                    <td className="px-4 py-3 text-right font-mono text-xs">
                      {p.actualAmount != null ? `$${p.actualAmount.toFixed(2)}` : "—"}
                    </td>
                    <td className={cn(
                      "px-4 py-3 text-right font-mono text-xs font-semibold",
                      variance > 0 ? "text-green-600" : variance < 0 ? "text-red-500" : "text-muted-foreground"
                    )}>
                      {variance !== 0 ? `${variance > 0 ? "+" : ""}$${variance.toFixed(2)}` : "—"}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => updatePayment.mutate({ id: p.id, data: { reconciled: !p.reconciled } })}
                        className="mx-auto"
                        data-testid={`button-reconcile-${p.id}`}
                      >
                        {p.reconciled ? (
                          <CheckCircle2 size={18} className="text-green-500" />
                        ) : (
                          <Circle size={18} className="text-muted-foreground hover:text-green-500 transition-colors" />
                        )}
                      </button>
                    </td>
                    <td className="px-4 py-3 no-print">
                      <button
                        onClick={() => deletePayment.mutate(p.id)}
                        className="text-muted-foreground hover:text-destructive transition-colors"
                        data-testid={`button-delete-payment-${p.id}`}
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Add payment dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display">Add Payment Record</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <div className="space-y-1.5">
              <Label>Payment Source</Label>
              <Select value={form.source} onValueChange={(v) => setForm({ ...form, source: v })}>
                <SelectTrigger data-testid="select-payment-source"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="factoring">Factoring Advance</SelectItem>
                  <SelectItem value="direct">Direct Pay (Shipper)</SelectItem>
                  <SelectItem value="broker">Broker Payment</SelectItem>
                  <SelectItem value="owner_op_settlement">Owner-Op Settlement</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Driver Name (optional)</Label>
                <Input value={form.driverName} onChange={(e) => setForm({ ...form, driverName: e.target.value })} placeholder="Driver" data-testid="input-driver-name" />
              </div>
              <div className="space-y-1.5">
                <Label>Load # (optional)</Label>
                <Input value={form.loadNumber} onChange={(e) => setForm({ ...form, loadNumber: e.target.value })} placeholder="Load #" data-testid="input-load-number" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Reference / Invoice # (optional)</Label>
              <Input value={form.referenceNumber} onChange={(e) => setForm({ ...form, referenceNumber: e.target.value })} placeholder="INV-001" data-testid="input-reference-number" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Expected Amount ($)</Label>
                <Input type="number" step="0.01" value={form.expectedAmount} onChange={(e) => setForm({ ...form, expectedAmount: e.target.value })} placeholder="0.00" data-testid="input-expected-amount" />
              </div>
              <div className="space-y-1.5">
                <Label>Actual Received ($)</Label>
                <Input type="number" step="0.01" value={form.actualAmount} onChange={(e) => setForm({ ...form, actualAmount: e.target.value })} placeholder="0.00" data-testid="input-actual-amount" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Deposit Date (optional)</Label>
              <Input type="date" value={form.depositDate} onChange={(e) => setForm({ ...form, depositDate: e.target.value })} data-testid="input-deposit-date" />
            </div>
            <div className="space-y-1.5">
              <Label>Notes (optional)</Label>
              <Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="e.g. Factoring fee deducted" data-testid="input-payment-notes" />
            </div>
            <Button
              data-testid="button-save-payment"
              className="w-full bg-[#f97316] hover:bg-[#ea6c0a] text-white"
              onClick={() => createPayment.mutate({
                periodId, source: form.source,
                referenceNumber: form.referenceNumber,
                driverName: form.driverName,
                loadNumber: form.loadNumber,
                expectedAmount: parseFloat(form.expectedAmount) || 0,
                actualAmount: parseFloat(form.actualAmount) || 0,
                depositDate: form.depositDate || null,
                notes: form.notes,
                reconciled: false,
              })}
              disabled={createPayment.isPending}
            >
              {createPayment.isPending ? "Saving..." : "Add Payment"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* CSV Import dialog */}
      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display">Import Payments from CSV</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <p className="text-sm text-muted-foreground">
              Upload a CSV file with payment data. Expected format: two columns — <code className="bg-muted px-1 rounded text-xs">Description, Amount</code>. One row per payment. Header row is optional.
            </p>
            <div className="border-2 border-dashed border-border rounded-xl p-6 text-center space-y-3">
              <Upload size={24} className="mx-auto text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Select a CSV file to import</p>
              <input
                ref={fileRef}
                type="file"
                accept=".csv,text/csv"
                onChange={handleCsvImport}
                className="hidden"
                data-testid="input-csv-file"
              />
              <Button
                variant="outline"
                onClick={() => fileRef.current?.click()}
                className="gap-2"
              >
                <Upload size={14} />
                Choose File
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SummaryCard({ label, value, color }: { label: string; value: string; color: string }) {
  const colorMap: Record<string, string> = {
    blue: "text-blue-600 dark:text-blue-400",
    green: "text-green-600 dark:text-green-400",
    orange: "text-orange-500 dark:text-orange-400",
    red: "text-red-500 dark:text-red-400",
    navy: "text-[#1a3a5c] dark:text-blue-300",
  };
  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={cn("text-lg font-bold font-display mt-1", colorMap[color])}>{value}</p>
    </div>
  );
}
