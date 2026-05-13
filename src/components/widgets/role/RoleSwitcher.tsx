'use client';

// Top-shell widget for picking the active V1 demo role. Backed by RoleProvider;
// changes propagate via useRole() to every consumer (ActionBar gating + menu
// re-fetch via AppContextProvider + Inbox visibleRoles).
//
// All 6 narrative personas (PROP-0009 stopgap, 2026-05-13) are selectable here
// until their dedicated portals (PROP-0010..PROP-0013) land. When a portal
// ships, drop its entry from ROLE_ORDER — the Role type itself stays untouched.

import {
  Building2,
  ChevronDown,
  Stethoscope,
  UserCog,
  UserRound,
  Users,
  Wrench,
} from 'lucide-react';

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
  sales: {
    label: 'Sales',
    description: 'Builds quotes and proposals; submits, sends to client, finalizes.',
    icon: UserRound,
  },
  partner_agent: {
    label: 'Partner Agent',
    description: 'Onboards members; uploads census; runs the post-issuance Add Member flow.',
    icon: Users,
  },
  mph: {
    label: 'MPH',
    description: 'Master Policyholder — accepts (or rejects) quotes sent by Sales.',
    icon: Building2,
  },
  member: {
    label: 'Member',
    description: 'Self-service: confirms enrolment via the MAF link.',
    icon: UserCog,
  },
  uw: {
    label: 'Underwriter',
    description: 'Reviews referred members and approves or rejects them.',
    icon: Stethoscope,
  },
  ops: {
    label: 'Ops',
    description: 'Repairs flagged members and resubmits them to classification.',
    icon: Wrench,
  },
};

// Order = canonical demo walkthrough order from DEMO_NARRATIVE_GTL_GCL.md.
const ROLE_ORDER: Role[] = [
  'sales',
  'partner_agent',
  'mph',
  'member',
  'uw',
  'ops',
];

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
      <DropdownMenuContent align="end" className="w-72">
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
