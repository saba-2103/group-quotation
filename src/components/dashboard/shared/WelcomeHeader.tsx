'use client';

import { useRole } from '@/hooks/useRole';

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

function formatDate(d: Date): string {
  return d.toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function roleBadgeLabel(role: string, salesLevel: number): string {
  if (role === 'SALES') {
    const tier = salesLevel >= 5 ? 'Head' : salesLevel >= 4 ? 'Supervisor' : `L${salesLevel}`;
    return `Sales · ${tier}`;
  }
  const MAP: Record<string, string> = {
    UNDERWRITER: 'Underwriter',
    ACTUARY: 'Actuarial',
    ACTUARIAL: 'Actuarial',
    OPS: 'Operations',
    ADMIN: 'Administrator',
  };
  return MAP[role] ?? role;
}

export function WelcomeHeader() {
  const { userName, currentRole, salesLevel } = useRole();
  const today = new Date();

  return (
    <div className="flex items-start justify-between gap-4">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold tracking-tight">
          {greeting()}, {userName}
        </h1>
        <p className="text-sm text-muted-foreground">{formatDate(today)}</p>
      </div>
      <span className="shrink-0 inline-flex items-center rounded-full border border-border bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
        {roleBadgeLabel(currentRole, salesLevel)}
      </span>
    </div>
  );
}
