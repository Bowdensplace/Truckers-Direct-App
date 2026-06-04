import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Client, Period, Staff } from "@shared/schema";
import { useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Plus, Truck, Users, CheckSquare, TrendingUp, ChevronRight, Trash2, AlertCircle, UserCog, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { WORKFLOWS } from "@/lib/workflows";

const SERVICE_LEVELS = [
  { value: "basic", label: "Basic (1–2 trucks)" },
  { value: "growth", label: "Growth (3–5 trucks)" },
  { value: "premium", label: "Premium (6+ trucks)" },
];

const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December"
];

export default function Dashboard() {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [open, setOpen] = useState(false);
  const [staffOpen, setStaffOpen] = useState(false);
  const [form, setForm] = useState({ name: "", serviceLevel: "basic", truckCount: 1, notes: "" });
  const [staffForm, setStaffForm] = useState({ name: "", initials: "" });

  const { data: clients = [], isLoading } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
    queryFn: () => apiRequest("GET", "/api/clients").then((r) => r.json()),
  });

  const { data: staffList = [] } = useQuery<Staff[]>({
    queryKey: ["/api/staff"],
    queryFn: () => apiRequest("GET", "/api/staff").then((r) => r.json()),
  });

  // Load all active periods for stats
  const { data: activePeriods = [] } = useQuery<Period[]>({
    queryKey: ["/api/periods/active"],
    queryFn: () => apiRequest("GET", "/api/periods/active").then((r) => r.json()),
  });

  // Count workflows with data this month
  const now = new Date();
  const thisMonth = now.getMonth() + 1;
  const thisYear = now.getFullYear();
  const thisMonthPeriods = activePeriods.filter(p => p.month === thisMonth && p.year === thisYear);

  // Check for clients without a current period (auto-period prompt)
  const clientsWithPeriod = new Set(thisMonthPeriods.map(p => p.clientId));
  const clientsMissingPeriod = clients.filter(c => !clientsWithPeriod.has(c.id));

  const createClient = useMutation({
    mutationFn: (data: typeof form) => apiRequest("POST", "/api/clients", data).then((r) => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      toast({ title: "Client added", description: `${form.name} is ready for setup.` });
      setOpen(false);
      setForm({ name: "", serviceLevel: "basic", truckCount: 1, notes: "" });
    },
  });

  const deleteClient = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/clients/${id}`).then((r) => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      toast({ title: "Client removed" });
    },
  });

  const createStaff = useMutation({
    mutationFn: (data: typeof staffForm) => apiRequest("POST", "/api/staff", data).then((r) => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/staff"] });
      toast({ title: "Staff member added" });
      setStaffForm({ name: "", initials: "" });
    },
  });

  const deleteStaff = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/staff/${id}`).then((r) => r.json()),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/staff"] }),
  });

  // Auto-create period for a client missing this month
  const createPeriod = useMutation({
    mutationFn: (clientId: number) => {
      const label = `${MONTHS[now.getMonth()]} ${now.getFullYear()}`;
      const dueDate = new Date(now.getFullYear(), now.getMonth() + 1, 10).toISOString().split("T")[0];
      return apiRequest("POST", "/api/periods", {
        clientId, label, month: thisMonth, year: thisYear, dueDate
      }).then(r => r.json());
    },
    onSuccess: (_, clientId) => {
      queryClient.invalidateQueries({ queryKey: ["/api/periods/active"] });
      queryClient.invalidateQueries({ queryKey: ["/api/clients", clientId, "periods"] });
      toast({ title: "Period created", description: `${MONTHS[now.getMonth()]} ${now.getFullYear()} period started.` });
    },
  });

  // Overdue periods
  const today = new Date().toISOString().split("T")[0];
  const overdueCount = activePeriods.filter(p => p.dueDate && p.dueDate < today).length;

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-display text-foreground">Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Manage clients and track workflow progress</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setStaffOpen(true)}
            className="gap-1.5 no-print"
            data-testid="button-manage-staff"
          >
            <UserCog size={14} />
            Staff
          </Button>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2 bg-[#1a3a5c] hover:bg-[#153050] text-white no-print" data-testid="button-add-client">
                <Plus size={16} />
                Add Client
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="font-display">Add New Client</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="space-y-1.5">
                  <Label>Business Name</Label>
                  <Input
                    data-testid="input-client-name"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="e.g. Smith Trucking LLC"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Service Level</Label>
                  <Select value={form.serviceLevel} onValueChange={(v) => setForm({ ...form, serviceLevel: v })}>
                    <SelectTrigger data-testid="select-service-level"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {SERVICE_LEVELS.map((s) => (
                        <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Number of Trucks</Label>
                  <Input
                    data-testid="input-truck-count"
                    type="number" min={1}
                    value={form.truckCount}
                    onChange={(e) => setForm({ ...form, truckCount: Number(e.target.value) })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Notes (optional)</Label>
                  <Input
                    data-testid="input-client-notes"
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    placeholder="Any setup notes..."
                  />
                </div>
                <Button
                  data-testid="button-save-client"
                  className="w-full bg-[#f97316] hover:bg-[#ea6c0a] text-white"
                  onClick={() => createClient.mutate(form)}
                  disabled={!form.name || createClient.isPending}
                >
                  {createClient.isPending ? "Adding..." : "Add Client"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={<Users size={20} />} label="Total Clients" value={clients.length} color="navy" />
        <StatCard icon={<Truck size={20} />} label="Total Trucks" value={clients.reduce((s, c) => s + c.truckCount, 0)} color="orange" />
        <StatCard
          icon={<CheckSquare size={20} />}
          label="Active Periods"
          value={activePeriods.length}
          color="green"
          alert={overdueCount > 0 ? `${overdueCount} overdue` : undefined}
        />
        <StatCard
          icon={<TrendingUp size={20} />}
          label="This Month"
          value={`${thisMonthPeriods.length}/${clients.length}`}
          color="blue"
          sublabel="clients have a period"
        />
      </div>

      {/* Auto-period prompt */}
      {clientsMissingPeriod.length > 0 && (
        <div className="border border-orange-200 dark:border-orange-800/50 bg-orange-50 dark:bg-orange-950/20 rounded-xl p-4 space-y-3 no-print">
          <div className="flex items-center gap-2">
            <AlertCircle size={16} className="text-orange-500 flex-shrink-0" />
            <p className="text-sm font-semibold text-orange-800 dark:text-orange-300">
              {clientsMissingPeriod.length} client{clientsMissingPeriod.length !== 1 ? "s" : ""} don't have a {MONTHS[now.getMonth()]} {now.getFullYear()} period yet
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {clientsMissingPeriod.map(c => (
              <Button
                key={c.id}
                variant="outline"
                size="sm"
                onClick={() => createPeriod.mutate(c.id)}
                disabled={createPeriod.isPending}
                className="text-xs h-7 border-orange-300 dark:border-orange-700 hover:bg-orange-100 dark:hover:bg-orange-900/30"
                data-testid={`button-auto-period-${c.id}`}
              >
                + {c.name}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Client list */}
      <div>
        <h2 className="text-base font-semibold font-display mb-3">Clients</h2>
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 rounded-xl bg-muted animate-pulse" />
            ))}
          </div>
        ) : clients.length === 0 ? (
          <div className="text-center py-16 border-2 border-dashed rounded-xl border-border">
            <Truck size={32} className="mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground font-medium">No clients yet</p>
            <p className="text-sm text-muted-foreground mt-1">Add your first client to get started.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {clients.map((client) => {
              const hasCurrentPeriod = clientsWithPeriod.has(client.id);
              return (
                <ClientRow
                  key={client.id}
                  client={client}
                  hasCurrentPeriod={hasCurrentPeriod}
                  onNavigate={() => navigate(`/clients/${client.id}`)}
                  onDelete={() => deleteClient.mutate(client.id)}
                />
              );
            })}
          </div>
        )}
      </div>

      {/* Staff management dialog */}
      <Dialog open={staffOpen} onOpenChange={setStaffOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display">Manage Staff</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              {staffList.length === 0 ? (
                <p className="text-sm text-muted-foreground">No staff members yet. Add your first.</p>
              ) : (
                staffList.map(s => (
                  <div key={s.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-[#1a3a5c]/10 dark:bg-[#1a3a5c]/30 flex items-center justify-center text-xs font-bold text-[#1a3a5c] dark:text-blue-300">
                        {s.initials}
                      </div>
                      <span className="text-sm font-medium">{s.name}</span>
                    </div>
                    <button
                      onClick={() => deleteStaff.mutate(s.id)}
                      className="text-muted-foreground hover:text-destructive transition-colors p-1"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))
              )}
            </div>
            <div className="pt-2 border-t border-border space-y-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Add Staff Member</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Name</Label>
                  <Input
                    data-testid="input-staff-name"
                    value={staffForm.name}
                    onChange={(e) => setStaffForm({ ...staffForm, name: e.target.value })}
                    placeholder="Jane Smith"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Initials</Label>
                  <Input
                    data-testid="input-staff-initials"
                    value={staffForm.initials}
                    onChange={(e) => setStaffForm({ ...staffForm, initials: e.target.value.toUpperCase().slice(0, 3) })}
                    placeholder="JS"
                    maxLength={3}
                  />
                </div>
              </div>
              <Button
                data-testid="button-add-staff"
                className="w-full bg-[#f97316] hover:bg-[#ea6c0a] text-white"
                onClick={() => createStaff.mutate(staffForm)}
                disabled={!staffForm.name || !staffForm.initials || createStaff.isPending}
              >
                {createStaff.isPending ? "Adding..." : "Add Staff Member"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatCard({ icon, label, value, color, alert, sublabel }: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  color: string;
  alert?: string;
  sublabel?: string;
}) {
  const colorMap: Record<string, string> = {
    navy: "bg-[#1a3a5c]/10 text-[#1a3a5c] dark:bg-[#1a3a5c]/30 dark:text-blue-300",
    orange: "bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400",
    green: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    blue: "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400",
  };
  return (
    <Card>
      <CardContent className="p-4">
        <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center mb-3", colorMap[color])}>
          {icon}
        </div>
        <p className="text-2xl font-bold font-display">{value}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
        {sublabel && <p className="text-xs text-muted-foreground/70 mt-0.5">{sublabel}</p>}
        {alert && <p className="text-xs text-red-500 font-medium mt-1">{alert}</p>}
      </CardContent>
    </Card>
  );
}

function ClientRow({ client, onNavigate, onDelete, hasCurrentPeriod }: {
  client: Client;
  onNavigate: () => void;
  onDelete: () => void;
  hasCurrentPeriod: boolean;
}) {
  const levelColors: Record<string, string> = {
    basic: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
    growth: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
    premium: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
  };

  return (
    <div
      className="flex items-center gap-4 p-4 bg-card border border-border rounded-xl hover:border-[#1a3a5c]/40 hover:shadow-sm transition-all cursor-pointer group"
      onClick={onNavigate}
      data-testid={`card-client-${client.id}`}
    >
      <div className="w-10 h-10 rounded-lg bg-[#1a3a5c]/10 dark:bg-[#1a3a5c]/30 flex items-center justify-center flex-shrink-0">
        <Truck size={18} className="text-[#1a3a5c] dark:text-blue-300" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold font-display text-sm truncate">{client.name}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{client.truckCount} truck{client.truckCount !== 1 ? "s" : ""}</p>
      </div>
      <div className="flex items-center gap-2">
        {!hasCurrentPeriod && (
          <Badge className="bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 text-xs hidden sm:flex">
            No period
          </Badge>
        )}
        <Badge className={cn("text-xs capitalize hidden sm:flex", levelColors[client.serviceLevel])}>
          {client.serviceLevel}
        </Badge>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all p-1 rounded"
          data-testid={`button-delete-client-${client.id}`}
          aria-label="Delete client"
        >
          <Trash2 size={14} />
        </button>
        <ChevronRight size={16} className="text-muted-foreground" />
      </div>
    </div>
  );
}
