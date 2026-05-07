'use client';

// Top-shell widget for picking the active V1 demo role. Backed by RoleProvider;
// changes propagate via useRole() to every consumer (ActionBar gating etc).

import { ChevronDown, ShieldCheck, UserCog, UserRound, Wrench } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useRole } from '@/hooks/useRole';
import type { Role } from '@/types/group-pas/roles';

interface RoleMeta {
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}

const ROLE_META: Record<Role, RoleMeta> = {
  maker: {
    label: 'Maker — Sales',
    description: 'Builds quotes and proposals; submits to advance state.',
    icon: UserRound,
  },
  checker: {
    label: 'Checker — Approver',
    description: 'Sends to client, accepts, rejects, finalizes.',
    icon: ShieldCheck,
  },
  ops: {
    label: 'Ops',
    description: 'Repairs members, archives, manages issuance follow-up.',
    icon: Wrench,
  },
  viewer: {
    label: 'Viewer',
    description: 'Read-only access across all modules.',
    icon: UserCog,
  },
};

const ROLE_ORDER: Role[] = ['maker', 'checker', 'ops', 'viewer'];

export function RoleSwitcher() {
  const { role, setRole } = useRole();
  const active = ROLE_META[role];
  const ActiveIcon = active.icon;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          aria-label={`Active role: ${active.label}. Click to change.`}
        >
          <ActiveIcon className="h-4 w-4" />
          <span className="hidden sm:inline">{active.label}</span>
          <ChevronDown className="h-4 w-4 opacity-60" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel>Switch active role</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {ROLE_ORDER.map((r) => {
          const meta = ROLE_META[r];
          const Icon = meta.icon;
          const isCurrent = r === role;
          return (
            <DropdownMenuItem
              key={r}
              onSelect={() => setRole(r)}
              className="flex items-start gap-2"
            >
              <Icon className="mt-0.5 h-4 w-4 shrink-0" />
              <div className="flex flex-col">
                <span className="font-medium">
                  {meta.label}
                  {isCurrent && (
                    <span className="ml-2 text-xs text-muted-foreground">
                      (active)
                    </span>
                  )}
                </span>
                <span className="text-xs text-muted-foreground">
                  {meta.description}
                </span>
              </div>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
