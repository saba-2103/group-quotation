"use client";
import React from "react";
import { cn } from "@/lib/utils";
import { ChevronUp, Check, Shield, Users, Eye, Briefcase } from "lucide-react";

interface UserOption {
  id: string;
  name: string;
  role: string;
  email: string;
  policyScope: string[];
}

const ALL_USERS: UserOption[] = [
  { id: "usr-001", name: "Alice Sharma", role: "super-admin", email: "alice.hr@acmetech.com", policyScope: ["pol-gtl-001", "pol-gcl-002", "pol-sav-003"] },
  { id: "usr-002", name: "Bob Mehta", role: "maker", email: "bob.ops@acmetech.com", policyScope: ["pol-gtl-001", "pol-gcl-002", "pol-sav-003"] },
  { id: "usr-003", name: "Carol Nair", role: "maker", email: "carol.ops@acmetech.com", policyScope: ["pol-gtl-001"] },
  { id: "usr-004", name: "Dave Kulkarni", role: "approver", email: "dave.approver@acmetech.com", policyScope: ["pol-gtl-001", "pol-gcl-002", "pol-sav-003"] },
  { id: "usr-005", name: "Eve Patel", role: "approver", email: "eve.approver@acmetech.com", policyScope: ["pol-sav-003"] },
  { id: "usr-006", name: "Frank D'Souza", role: "viewer", email: "frank.viewer@acmetech.com", policyScope: ["pol-gtl-001", "pol-gcl-002", "pol-sav-003"] },
  { id: "usr-007", name: "Grace Iyer", role: "member", email: "grace.member@acmetech.com", policyScope: ["pol-gtl-001"] },
  { id: "usr-008", name: "Henry Thomas", role: "insurer-ops", email: "henry.ops@insuranceco.com", policyScope: ["pol-gtl-001", "pol-gcl-002", "pol-sav-003"] },
];

const ROLE_META: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  "super-admin": { label: "Super Admin", color: "bg-violet-100 text-violet-800", icon: <Shield className="h-3 w-3" /> },
  "maker":       { label: "Maker",       color: "bg-blue-100 text-blue-800",   icon: <Briefcase className="h-3 w-3" /> },
  "approver":    { label: "Approver",    color: "bg-green-100 text-green-800", icon: <Check className="h-3 w-3" /> },
  "viewer":      { label: "Viewer",      color: "bg-gray-100 text-gray-700",   icon: <Eye className="h-3 w-3" /> },
  "member":      { label: "Member",      color: "bg-orange-100 text-orange-800", icon: <Users className="h-3 w-3" /> },
  "insurer-ops": { label: "Insurer Ops", color: "bg-teal-100 text-teal-800",   icon: <Shield className="h-3 w-3" /> },
};

const POLICY_LABELS: Record<string, string> = {
  "pol-gtl-001": "GTL",
  "pol-gcl-002": "GCL",
  "pol-sav-003": "SAV",
};

const COOKIE_KEY = "mph-dev-user";

function getInitials(name: string): string {
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

function readCookie(): string {
  if (typeof document === "undefined") return "usr-001";
  const match = document.cookie.match(new RegExp(`(?:^|; )${COOKIE_KEY}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : "usr-001";
}

function writeCookie(userId: string): void {
  document.cookie = `${COOKIE_KEY}=${encodeURIComponent(userId)}; path=/; max-age=86400; SameSite=Lax`;
}

export function RoleSwitcher() {
  const [open, setOpen] = React.useState(false);
  const [activeId, setActiveId] = React.useState<string>(() => readCookie());
  const panelRef = React.useRef<HTMLDivElement>(null);

  const activeUser = ALL_USERS.find((u) => u.id === activeId) ?? ALL_USERS[0];
  const meta = ROLE_META[activeUser.role] ?? ROLE_META["viewer"];

  function selectUser(user: UserOption) {
    writeCookie(user.id);
    setActiveId(user.id);
    setOpen(false);
    // Reload so all server-side queries re-run with the new cookie
    window.location.reload();
  }

  // Close on outside click
  React.useEffect(() => {
    function handler(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div ref={panelRef} className="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-2">
      {/* Expanded panel */}
      {open && (
        <div className="w-72 rounded-xl border bg-background shadow-2xl overflow-hidden animate-in slide-in-from-bottom-2 duration-200">
          <div className="bg-muted/50 px-4 py-3 border-b">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Dev Role Switcher</p>
            <p className="text-xs text-muted-foreground mt-0.5">Changes reload the page</p>
          </div>
          <ul className="py-1 max-h-96 overflow-y-auto">
            {ALL_USERS.map((user) => {
              const m = ROLE_META[user.role] ?? ROLE_META["viewer"];
              const isActive = user.id === activeId;
              return (
                <li key={user.id}>
                  <button
                    onClick={() => selectUser(user)}
                    className={cn(
                      "flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/60",
                      isActive && "bg-muted"
                    )}
                  >
                    {/* Avatar */}
                    <span className={cn(
                      "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                      isActive ? "bg-primary text-primary-foreground" : "bg-muted-foreground/20 text-foreground"
                    )}>
                      {getInitials(user.name)}
                    </span>
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium leading-none truncate">{user.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">{user.email}</p>
                      <div className="flex items-center gap-1 mt-1 flex-wrap">
                        <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium", m.color)}>
                          {m.icon}{m.label}
                        </span>
                        {user.policyScope.map((pid) => (
                          <span key={pid} className="inline-flex rounded-full bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                            {POLICY_LABELS[pid] ?? pid}
                          </span>
                        ))}
                      </div>
                    </div>
                    {isActive && <Check className="h-4 w-4 text-primary shrink-0" />}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* Trigger chip */}
      <button
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex items-center gap-2.5 rounded-full border bg-background px-3 py-2 shadow-lg transition-all hover:shadow-xl",
          open && "ring-2 ring-primary ring-offset-1"
        )}
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-semibold">
          {getInitials(activeUser.name)}
        </span>
        <div className="flex flex-col items-start">
          <span className="text-xs font-semibold leading-tight">{activeUser.name.split(" ")[0]}</span>
          <span className={cn("inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-xs font-medium leading-none mt-0.5", meta.color)}>
            {meta.icon}{meta.label}
          </span>
        </div>
        <ChevronUp className={cn("h-3.5 w-3.5 text-muted-foreground transition-transform", !open && "rotate-180")} />
      </button>
    </div>
  );
}
