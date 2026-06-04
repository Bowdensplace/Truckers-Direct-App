import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { Client, Period } from "@shared/schema";
import { useLocation } from "wouter";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, StickyNote, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { WORKFLOWS } from "@/lib/workflows";

interface NoteResult {
  task: {
    id: number;
    periodId: number;
    workflowType: string;
    taskKey: string;
    status: string;
    note: string;
    completedAt?: string;
    completedBy?: string;
  };
  periodId: number;
  clientId: number;
}

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [, navigate] = useLocation();

  const { data: clients = [] } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
    queryFn: () => apiRequest("GET", "/api/clients").then((r) => r.json()),
  });

  const { data: allPeriods = [] } = useQuery<Period[]>({
    queryKey: ["/api/periods/active"],
    queryFn: () => apiRequest("GET", "/api/periods/active").then((r) => r.json()),
  });

  const { data: results = [], isFetching } = useQuery<NoteResult[]>({
    queryKey: ["/api/search/notes", query],
    queryFn: () => apiRequest("GET", `/api/search/notes?q=${encodeURIComponent(query)}`).then((r) => r.json()),
    enabled: query.trim().length >= 2,
  });

  const clientMap = new Map(clients.map((c) => [c.id, c]));
  // Build ALL periods map — need periods from all clients
  const { data: periodsAll = [] } = useQuery<Period[]>({
    queryKey: ["/api/periods/all"],
    queryFn: async () => {
      const all: Period[] = [];
      for (const c of clients) {
        const ps = await apiRequest("GET", `/api/clients/${c.id}/periods`).then(r => r.json());
        all.push(...ps);
      }
      return all;
    },
    enabled: clients.length > 0,
  });
  const periodMap = new Map(periodsAll.map((p) => [p.id, p]));

  const getWorkflowLabel = (type: string) => WORKFLOWS.find(w => w.type === type)?.label ?? type;

  const getTaskLabel = (taskKey: string, workflowType: string) => {
    const wf = WORKFLOWS.find(w => w.type === workflowType);
    if (!wf) return taskKey;
    for (const t of wf.tasks) {
      if (t.key === taskKey) return t.label;
      for (const s of t.subTasks ?? []) {
        if (s.key === taskKey) return s.label;
      }
    }
    return taskKey;
  };

  const statusColors: Record<string, string> = {
    complete: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    pending: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
    flagged: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
    skipped: "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400",
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-bold font-display">Search Notes</h1>
        <p className="text-muted-foreground text-sm mt-0.5">Search across all client notes from every workflow</p>
      </div>

      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          data-testid="input-search-notes"
          className="pl-9"
          placeholder="Search note text... (2+ characters)"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoFocus
        />
      </div>

      {query.trim().length >= 2 && (
        <div className="space-y-3">
          {isFetching ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => <div key={i} className="h-16 rounded-xl bg-muted animate-pulse" />)}
            </div>
          ) : results.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground text-sm border-2 border-dashed rounded-xl border-border">
              No notes found matching "{query}"
            </div>
          ) : (
            <>
              <p className="text-xs text-muted-foreground">{results.length} result{results.length !== 1 ? "s" : ""}</p>
              {results.map((r) => {
                const client = clientMap.get(r.clientId);
                const period = periodMap.get(r.periodId);
                const taskLabel = getTaskLabel(r.task.taskKey, r.task.workflowType);
                const highlighted = r.task.note?.replace(
                  new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi"),
                  "**$1**"
                );
                return (
                  <div
                    key={r.task.id}
                    className="border border-border rounded-xl bg-card p-4 hover:border-[#1a3a5c]/30 hover:shadow-sm transition-all cursor-pointer group"
                    onClick={() => navigate(`/clients/${r.clientId}/periods/${r.periodId}/${r.task.workflowType}`)}
                    data-testid={`search-result-${r.task.id}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="font-semibold text-sm font-display truncate">{client?.name ?? "Unknown"}</span>
                          <span className="text-muted-foreground text-xs">·</span>
                          <span className="text-xs text-muted-foreground">{period?.label}</span>
                          <span className="text-muted-foreground text-xs">·</span>
                          <span className="text-xs text-muted-foreground">{getWorkflowLabel(r.task.workflowType)}</span>
                        </div>
                        <p className="text-sm font-medium">{taskLabel}</p>
                        <div className="flex items-start gap-1.5 mt-1.5">
                          <StickyNote size={12} className="text-yellow-500 flex-shrink-0 mt-0.5" />
                          <p className="text-xs text-muted-foreground leading-relaxed">
                            {highlighted?.split("**").map((part, i) =>
                              i % 2 === 1 ? (
                                <mark key={i} className="bg-yellow-200 dark:bg-yellow-800/50 text-foreground rounded px-0.5">{part}</mark>
                              ) : part
                            )}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Badge className={cn("text-xs capitalize", statusColors[r.task.status])}>{r.task.status}</Badge>
                        <ChevronRight size={14} className="text-muted-foreground group-hover:text-foreground transition-colors" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </>
          )}
        </div>
      )}

      {query.trim().length < 2 && (
        <div className="text-center py-16 text-muted-foreground text-sm">
          <Search size={28} className="mx-auto mb-3 opacity-30" />
          <p>Type at least 2 characters to search notes</p>
        </div>
      )}
    </div>
  );
}
