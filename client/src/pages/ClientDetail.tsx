import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useLocation, Link } from "wouter";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Client, Period } from "@shared/schema";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { WORKFLOWS } from "@/lib/workflows";
import { Plus, Calendar, ChevronRight, CalendarCheck, DollarSign, UserPlus, ReceiptText, CreditCard, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December"
];
const YEARS = [2024, 2025, 2026, 2027];

const WORKFLOW_ICONS: Record<string, React.ReactNode> = {
  monthly_close: <CalendarCheck size={18} />,
  payroll_run: <DollarSign size={18} />,
  new_client_onboarding: <UserPlus size={18} />,
  ar_collections: <ReceiptText size={18} />,
  payment_reconciliation: <CreditCard size={18} />,
};

export default function ClientDetail() {
  const { clientId } = useParams<{ clientId: string }>();
  const id = Number(clientId);
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const now = new Date();
  const [form, setForm] = useState({
    month: now.getMonth() + 1,
    year: now.getFullYear(),
    dueDate: "",
  });

  const { data: client } = useQuery<Client>({
    queryKey: ["/api/clients", id],
    queryFn: () => apiRequest("GET", `/api/clients`).then((r) => r.json()).then((cs: Client[]) => cs.find((c) => c.id === id)),
  });

  const { data: periods = [] } = useQuery<Period[]>({
    queryKey: ["/api/clients", id, "periods"],
    queryFn: () => apiRequest("GET", `/api/clients/${id}/periods`).then((r) => r.json()),
  });

  const createPeriod = useMutation({
    mutationFn: (data: { clientId: number; label: string; month: number; year: number; dueDate?: string }) =>
      apiRequest("POST", "/api/periods", data).then((r) => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients", id, "periods"] });
      toast({ title: "Period created" });
      setOpen(false);
    },
  });

  const handleCreatePeriod = () => {
    createPeriod.mutate({
      clientId: id,
      label: `${MONTHS[form.month - 1]} ${form.year}`,
      month: form.month,
      year: form.year,
      dueDate: form.dueDate || undefined,
    });
  };

  const sortedPeriods = [...periods].sort((a, b) => {
    if (a.year !== b.year) return b.year - a.year;
    return b.month - a.month;
  });

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground no-print">
        <Link href="/"><a className="hover:text-foreground flex items-center gap-1"><ArrowLeft size={14} /> Dashboard</a></Link>
        <span>/</span>
        <span className="text-foreground font-medium">{client?.name ?? "Loading..."}</span>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-display">{client?.name ?? "..."}</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {client?.truckCount} truck{client?.truckCount !== 1 ? "s" : ""} · {client?.serviceLevel} plan
          </p>
        </div>
        <Button
          className="gap-2 bg-[#1a3a5c] hover:bg-[#153050] text-white no-print"
          onClick={() => setOpen(true)}
          data-testid="button-add-period"
        >
          <Plus size={16} />
          New Period
        </Button>
      </div>

      {/* Periods list */}
      <div>
        <h2 className="text-base font-semibold font-display mb-3">Billing Periods</h2>
        {sortedPeriods.length === 0 ? (
          <div className="text-center py-14 border-2 border-dashed rounded-xl border-border">
            <Calendar size={28} className="mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground font-medium">No periods yet</p>
            <p className="text-sm text-muted-foreground mt-1">Create a period to start a workflow checklist.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {sortedPeriods.map((period) => (
              <PeriodCard
                key={period.id}
                period={period}
                clientId={id}
                onNavigate={(wf) => navigate(`/clients/${id}/periods/${period.id}/${wf}`)}
              />
            ))}
          </div>
        )}
      </div>

      {/* New Period Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display">Create New Period</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Month</Label>
                <Select value={String(form.month)} onValueChange={(v) => setForm({ ...form, month: Number(v) })}>
                  <SelectTrigger data-testid="select-month"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {MONTHS.map((m, i) => (
                      <SelectItem key={m} value={String(i + 1)}>{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Year</Label>
                <Select value={String(form.year)} onValueChange={(v) => setForm({ ...form, year: Number(v) })}>
                  <SelectTrigger data-testid="select-year"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {YEARS.map((y) => (
                      <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Due Date (optional)</Label>
              <Input
                type="date"
                data-testid="input-due-date"
                value={form.dueDate}
                onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
              />
            </div>
            <Button
              data-testid="button-create-period"
              className="w-full bg-[#f97316] hover:bg-[#ea6c0a] text-white"
              onClick={handleCreatePeriod}
              disabled={createPeriod.isPending}
            >
              {createPeriod.isPending ? "Creating..." : "Create Period"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PeriodCard({
  period,
  clientId,
  onNavigate,
}: {
  period: Period;
  clientId: number;
  onNavigate: (workflow: string) => void;
}) {
  const statusColors: Record<string, string> = {
    active: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    closed: "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400",
  };

  const isOverdue = period.dueDate && period.status === "active" && new Date(period.dueDate) < new Date();

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        {/* Period header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-border bg-muted/30">
          <div className="flex items-center gap-3">
            <Calendar size={16} className="text-muted-foreground flex-shrink-0" />
            <span className="font-semibold font-display text-sm">{period.label}</span>
            {isOverdue && (
              <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 text-xs">Overdue</Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            {period.dueDate && (
              <span className="text-xs text-muted-foreground hidden sm:block">
                Due {new Date(period.dueDate).toLocaleDateString()}
              </span>
            )}
            <Badge className={cn("text-xs capitalize", statusColors[period.status])}>
              {period.status}
            </Badge>
          </div>
        </div>

        {/* Workflow buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-px bg-border">
          {WORKFLOWS.map((wf) => (
            <WorkflowButton
              key={wf.type}
              workflow={wf}
              periodId={period.id}
              clientId={clientId}
              onClick={() => onNavigate(wf.type)}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function WorkflowButton({
  workflow,
  periodId,
  clientId,
  onClick,
}: {
  workflow: typeof WORKFLOWS[0];
  periodId: number;
  clientId: number;
  onClick: () => void;
}) {
  const { data: tasks = [] } = useQuery({
    queryKey: ["/api/periods", periodId, "tasks", workflow.type],
    queryFn: () =>
      apiRequest("GET", `/api/periods/${periodId}/tasks?workflow=${workflow.type}`).then((r) => r.json()),
  });

  const total = workflow.tasks.length;
  const complete = (tasks as any[]).filter((t: any) => t.status === "complete" || t.status === "skipped").length;
  const pct = total === 0 ? 0 : Math.round((complete / total) * 100);
  const started = complete > 0;

  return (
    <button
      onClick={onClick}
      className="flex flex-col gap-2 p-4 bg-card hover:bg-muted/50 transition-colors text-left group"
      data-testid={`button-workflow-${workflow.type}-${periodId}`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-[#1a3a5c] dark:text-blue-300">
            {WORKFLOW_ICONS[workflow.type]}
          </span>
          <span className="font-medium text-sm">{workflow.label}</span>
        </div>
        <ChevronRight size={14} className="text-muted-foreground group-hover:text-foreground transition-colors" />
      </div>
      <div className="w-full bg-muted rounded-full h-1.5">
        <div
          className={cn(
            "h-1.5 rounded-full transition-all duration-500",
            pct === 100 ? "bg-green-500" : started ? "bg-[#f97316]" : "bg-[#1a3a5c]/30"
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-xs text-muted-foreground">
        {pct === 100 ? "Complete" : started ? `${complete}/${total} tasks` : "Not started"}
      </p>
    </button>
  );
}
