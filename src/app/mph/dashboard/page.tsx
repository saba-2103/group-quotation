import { cookies } from "next/headers";
import { getStore } from "@/mocks/mph/store";

const ROLE_CAPS: Record<string, string[]> = {
  "super-admin": ["Full access: policies, members, claims, renewals, billing, admin"],
  "maker":       ["Create and submit endorsements, claims, service requests", "Cannot approve own submissions"],
  "approver":    ["Approve or reject maker submissions", "Cannot create new endorsements"],
  "viewer":      ["Read-only access to all modules"],
  "member":      ["View own policy certificate and coverage details"],
  "insurer-ops": ["Manage claims, renewals, and documents on behalf of insurer"],
};

export default async function MPHDashboard() {
  const store = getStore();
  const cookieStore = await cookies();
  const userId = cookieStore.get("mph-dev-user")?.value ?? "usr-001";
  const user = store.users.find((u) => u.id === userId) ?? store.users[0];

  const policies = store.policies.filter((p) => user.policyScope.includes(p.id));
  const openTasks = store.tasks.filter(
    (t) => (t.assignedTo === user.id || user.role === "super-admin" || user.role === "insurer-ops") &&
    (t.status === "Open" || t.status === "Overdue")
  );
  const unreadNotifs = store.notifications.filter(
    (n) => n.userId === user.id && !n.isRead
  );

  const caps = ROLE_CAPS[user.role] ?? [];

  return (
    <div className="flex flex-col gap-6 max-w-5xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold">MPH Portal</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Signed in as <span className="font-medium text-foreground">{user.name}</span>
          {" "}· <span className="font-medium text-foreground capitalize">{user.role}</span>
          {" "}· {user.email}
        </p>
      </div>

      {/* Summary metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Policies in scope", value: policies.length },
          { label: "Open tasks", value: openTasks.length, warn: openTasks.some((t) => t.status === "Overdue") },
          { label: "Unread alerts", value: unreadNotifs.length },
          { label: "Active members", value: store.members.filter((m) => m.status === "Active" && policies.some((p) => p.id === m.policyId)).length },
        ].map((stat) => (
          <div key={stat.label} className="rounded-xl border bg-card p-4">
            <p className={`text-3xl font-bold ${stat.warn ? "text-red-600" : ""}`}>{stat.value}</p>
            <p className="text-sm text-muted-foreground mt-1">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Policies in scope */}
      <section className="flex flex-col gap-3">
        <h2 className="font-semibold">Policies in scope</h2>
        <div className="grid gap-3 md:grid-cols-3">
          {policies.map((pol) => (
            <div key={pol.id} className="rounded-xl border bg-card p-4 flex flex-col gap-2">
              <div className="flex items-start justify-between gap-2">
                <span className="font-medium text-sm leading-tight">{pol.schemeName}</span>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                  pol.status === "Active" ? "bg-green-100 text-green-800" :
                  pol.status === "Renewing" ? "bg-yellow-100 text-yellow-800" :
                  "bg-gray-100 text-gray-700"
                }`}>{pol.status}</span>
              </div>
              <p className="text-xs font-mono text-muted-foreground">{pol.policyNumber}</p>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span>{pol.activeLives.toLocaleString("en-IN")} lives</span>
                <span>·</span>
                <span className={`font-medium ${pol.billingStatus === "Overdue" ? "text-red-600" : ""}`}>
                  {pol.billingStatus}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Open tasks */}
      {openTasks.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="font-semibold">Open tasks</h2>
          <ul className="flex flex-col gap-2">
            {openTasks.slice(0, 6).map((task) => (
              <li key={task.id} className="flex items-start gap-3 rounded-lg border bg-card px-4 py-3">
                <span className={`mt-0.5 h-2 w-2 shrink-0 rounded-full ${
                  task.status === "Overdue" ? "bg-red-500" :
                  task.priority === "Critical" ? "bg-red-400" :
                  task.priority === "High" ? "bg-yellow-500" :
                  "bg-muted-foreground"
                }`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium leading-tight">{task.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">{task.description}</p>
                </div>
                <div className="text-right shrink-0">
                  <span className={`text-xs font-medium ${task.status === "Overdue" ? "text-red-600" : "text-muted-foreground"}`}>
                    Due {new Date(task.dueDate).toLocaleDateString("en-IN")}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Role capabilities */}
      <section className="rounded-xl border bg-muted/30 p-4">
        <h2 className="font-semibold text-sm mb-2">What you can do as <span className="capitalize">{user.role}</span></h2>
        <ul className="flex flex-col gap-1">
          {caps.map((cap, i) => (
            <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
              {cap}
            </li>
          ))}
        </ul>
        <p className="text-xs text-muted-foreground mt-3">
          Use the <strong>role switcher</strong> in the bottom-right corner to switch users and explore different workflows.
        </p>
      </section>
    </div>
  );
}
