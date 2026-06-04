import { Link, useLocation } from "wouter";
import { useTheme } from "@/components/ThemeProvider";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { Client } from "@shared/schema";
import { Sun, Moon, LayoutDashboard, ChevronRight, Truck, Menu, X, Search, LogOut } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { useAuth, useLogout } from "@/lib/auth";

export default function Layout({ children }: { children: React.ReactNode }) {
  const { theme, toggle } = useTheme();
  const [location] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const { data: clients = [] } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
    queryFn: () => apiRequest("GET", "/api/clients").then((r) => r.json()),
  });

  return (
    <div className="flex min-h-screen bg-background">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 md:hidden no-print"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 w-64 flex-col flex bg-[#1a3a5c] text-white transition-transform duration-300 no-print",
          "md:translate-x-0 md:static md:flex",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-5 py-5 border-b border-white/10">
          <svg
            viewBox="0 0 40 32"
            fill="none"
            className="w-10 h-8 flex-shrink-0"
            aria-label="Trucker's Direct logo"
          >
            <rect width="40" height="32" rx="5" fill="#f97316" />
            {/* Truck silhouette */}
            <path d="M4 22h22v-4l-3-4H4v8z" fill="white" opacity="0.9" />
            <path d="M26 18h6l3 4H26v-4z" fill="white" opacity="0.7" />
            <circle cx="9" cy="23" r="2.5" fill="#1a3a5c" />
            <circle cx="21" cy="23" r="2.5" fill="#1a3a5c" />
            <circle cx="31" cy="23" r="2.5" fill="#1a3a5c" />
            {/* Checkmark */}
            <path d="M14 13 L17 16 L23 10" stroke="#f97316" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <div className="min-w-0">
            <p className="font-bold text-sm leading-tight font-display">Trucker's Direct</p>
            <p className="text-white/50 text-xs">QBO Checklist</p>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="ml-auto text-white/60 hover:text-white md:hidden"
            aria-label="Close menu"
          >
            <X size={18} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-4 px-3">
          <NavLink href="/" label="Dashboard" icon={<LayoutDashboard size={16} />} active={location === "/"} />
          <NavLink href="/search" label="Search Notes" icon={<Search size={16} />} active={location === "/search"} />

          {/* Clients section */}
          <div className="mt-5 mb-2 px-3">
            <p className="text-white/40 text-xs font-semibold uppercase tracking-wider">Clients</p>
          </div>
          {clients.map((c) => (
            <NavLink
              key={c.id}
              href={`/clients/${c.id}`}
              label={c.name}
              icon={<Truck size={14} />}
              active={location.startsWith(`/clients/${c.id}`)}
              sub
            />
          ))}
          {clients.length === 0 && (
            <p className="text-white/30 text-xs px-3 mt-1">No clients yet</p>
          )}
        </nav>

        {/* Footer */}
        <div className="px-4 py-4 border-t border-white/10 space-y-3">
          {/* User info + logout */}
          <UserFooter />
          <div className="flex items-center justify-between">
            <span className="text-white/40 text-xs">v2.0</span>
            <button
              onClick={toggle}
              aria-label="Toggle theme"
              className="text-white/60 hover:text-white transition-colors p-1 rounded"
            >
              {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar (mobile) */}
        <header className="md:hidden flex items-center gap-3 px-4 py-3 border-b border-border bg-card no-print">
          <button
            onClick={() => setSidebarOpen(true)}
            aria-label="Open menu"
            className="text-muted-foreground hover:text-foreground"
          >
            <Menu size={20} />
          </button>
          <span className="font-bold text-sm font-display">Trucker's Direct</span>
        </header>

        <main className="flex-1 p-4 md:p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}

function NavLink({
  href, label, icon, active, sub,
}: {
  href: string;
  label: string;
  icon: React.ReactNode;
  active?: boolean;
  sub?: boolean;
}) {
  return (
    <Link href={href}>
      <a
        className={cn(
          "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors mb-0.5",
          sub ? "text-white/70 hover:text-white hover:bg-white/8" : "text-white/80 hover:text-white hover:bg-white/10",
          active && "bg-white/15 text-white font-medium"
        )}
      >
        <span className="flex-shrink-0 opacity-80">{icon}</span>
        <span className="truncate">{label}</span>
        {active && <ChevronRight size={12} className="ml-auto opacity-60" />}
      </a>
    </Link>
  );
}

function UserFooter() {
  const { user } = useAuth();
  const logout = useLogout();

  if (!user) return null;

  return (
    <div className="flex items-center gap-2.5">
      {/* Avatar */}
      {user.picture ? (
        <img
          src={user.picture}
          alt={user.name}
          className="w-7 h-7 rounded-full flex-shrink-0 ring-1 ring-white/20"
          referrerPolicy="no-referrer"
        />
      ) : (
        <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0 text-white text-xs font-bold">
          {user.name?.charAt(0).toUpperCase()}
        </div>
      )}
      {/* Name + email */}
      <div className="flex-1 min-w-0">
        <p className="text-white text-xs font-medium truncate">{user.name}</p>
        <p className="text-white/40 text-[10px] truncate">{user.email}</p>
      </div>
      {/* Logout */}
      <button
        onClick={() => logout.mutate()}
        aria-label="Sign out"
        title="Sign out"
        className="text-white/40 hover:text-white transition-colors p-1 rounded flex-shrink-0"
        data-testid="button-logout"
      >
        <LogOut size={14} />
      </button>
    </div>
  );
}
