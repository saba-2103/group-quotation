'use client';

// Schema-driven action bar with state + role gating.
// Used on every detail page (Quote, Proposal, Policy, PolicyMember). The
// schema declares which actions exist and which states/roles unlock them; the
// widget renders disabled buttons with hover tooltips explaining the gate.
//
// V1 maker-checker overlay: when `awaitingApproval` is true, the Maker's
// editing/submit actions lock and the Checker's Approve action becomes the
// primary CTA (see context/ARCH_TRANSITION.md → "Maker-checker UI overlay").

import { useMemo } from 'react';

import { Button } from '@/components/ui/button';
import { LucideIcon } from '@/components/ui/lucide-icon';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useActionHandler } from '@/hooks/useActionHandler';
import { useRole } from '@/hooks/useRole';
import { useWidgetState } from '@/hooks/useWidgetState';
import { clearApproval, sendForApproval } from '@/lib/maker-checker';
import type { ActionConfig, WidgetConfig } from '@/types/widget';
import type { Role } from '@/types/group-pas/roles';

type StateActions = Record<string, string[]>;
type RoleActions = Record<string, string[]>;

interface ActionBarProps {
  config: WidgetConfig;
}

interface ActionBarPropsResolved {
  state: string;
  stateActions: StateActions;
  roleActions?: RoleActions;
  actions: ActionConfig[];
  awaitingApproval?: boolean;
  // When set, the widget pulls `state` / `awaitingApproval` from
  // useWidgetState() under this key (e.g. 'quote', 'proposal', 'policy').
  stateKey?: string;
  // Maker-checker entity binding for the special action ids.
  entityType?: 'quote' | 'proposal';
  entityId?: string;
}

const SEND_FOR_APPROVAL_ID = 'send-for-approval';
const CLEAR_APPROVAL_ID = 'clear-approval';

function rolesAllowingAction(
  roleActions: RoleActions | undefined,
  actionId: string,
): string[] {
  if (!roleActions) return [];
  return Object.entries(roleActions)
    .filter(([, ids]) => ids.includes(actionId))
    .map(([role]) => role);
}

function describeRoles(roles: string[]): string {
  if (roles.length === 0) return 'no role';
  if (roles.length === 1) return roles[0];
  return `${roles.slice(0, -1).join(', ')} or ${roles[roles.length - 1]}`;
}

export const ActionBar: React.FC<ActionBarProps> = ({ config }) => {
  const props = (config.props ?? {}) as ActionBarPropsResolved;
  const {
    stateActions = {},
    roleActions,
    actions = [],
    stateKey,
    entityType,
    entityId,
  } = props;

  const { role } = useRole();
  const handleAction = useActionHandler();
  const { values } = useWidgetState();

  // Pull live entity state from a sibling widget when stateKey is set;
  // otherwise fall back to the literal prop.
  const liveEntity = stateKey ? (values[stateKey] as Record<string, unknown> | undefined) : undefined;
  const state = (liveEntity?.state as string | undefined) ?? props.state ?? '';
  const awaitingApproval = Boolean(
    liveEntity?.awaitingApproval ?? props.awaitingApproval,
  );

  const decoratedActions = useMemo(() => {
    return actions.map((action) => {
      const id = action.id ?? '';
      const allowedStates = stateActions[state] ?? [];
      const stateOk = allowedStates.includes(id);
      const roleOk =
        !roleActions || (roleActions[role as Role] ?? []).includes(id);

      // Maker-checker overlay rules (UI-only):
      //   - When awaitingApproval=true, the maker's normal editing actions
      //     (submit, send-for-approval, etc.) lock so the checker can act.
      //   - Approve / clear-approval are still allowed for the checker.
      const lockedByApproval =
        awaitingApproval &&
        role === 'maker' &&
        id !== CLEAR_APPROVAL_ID;

      let disabledReason: string | undefined;
      if (!stateOk) disabledReason = `Not available in ${state || 'this state'}`;
      else if (!roleOk) {
        const roles = rolesAllowingAction(roleActions, id);
        disabledReason = `Requires ${describeRoles(roles)} role`;
      } else if (lockedByApproval) {
        disabledReason = 'Awaiting checker approval';
      }

      return { action, disabled: Boolean(disabledReason), disabledReason };
    });
  }, [actions, awaitingApproval, role, roleActions, state, stateActions]);

  if (decoratedActions.length === 0) return null;

  const onClick = async (action: ActionConfig) => {
    const id = action.id ?? '';
    if (id === SEND_FOR_APPROVAL_ID) {
      if (entityType && entityId) await sendForApproval(entityType, entityId);
      return;
    }
    if (id === CLEAR_APPROVAL_ID) {
      if (entityType && entityId) await clearApproval(entityType, entityId);
      return;
    }
    await handleAction(action);
  };

  return (
    <TooltipProvider delayDuration={150}>
      <div
        className="flex flex-wrap items-center gap-2"
        role="toolbar"
        aria-label="Entity actions"
      >
        {decoratedActions.map(({ action, disabled, disabledReason }) => {
          const button = (
            <Button
              variant={action.variant ?? 'default'}
              size="sm"
              disabled={disabled}
              onClick={() => onClick(action)}
              data-action-id={action.id}
              data-disabled-reason={disabledReason}
            >
              {action.icon && (
                <LucideIcon name={action.icon} className="mr-1 h-4 w-4" />
              )}
              {action.label ?? action.id}
            </Button>
          );

          if (!disabled) return <div key={action.id}>{button}</div>;
          return (
            <Tooltip key={action.id}>
              {/* Wrap so disabled <button> still triggers tooltip. */}
              <TooltipTrigger asChild>
                <span className="inline-block">{button}</span>
              </TooltipTrigger>
              <TooltipContent>{disabledReason}</TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </TooltipProvider>
  );
};
