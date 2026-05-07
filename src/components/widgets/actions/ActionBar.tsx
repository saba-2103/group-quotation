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
import { useSmartQuery } from '@/hooks/useSmartQuery';
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

  // Two ways to get live entity state into the bar:
  //   1. dataSource on the widget's WidgetConfig — useSmartQuery fetches and
  //      WidgetRenderer injects the result onto config.props.data, which we
  //      read here. React Query dedupes across siblings sharing the same key.
  //   2. stateKey — read from a sibling-published useWidgetState slot.
  // Falls back to the literal prop if neither yields data.
  const fetchedFromRenderer = (config.props as { data?: Record<string, unknown> } | undefined)?.data;
  const fetchedDirect = useSmartQuery(config.dataSource);
  const fetchedEntity = fetchedFromRenderer ?? fetchedDirect.data ?? undefined;
  const liveEntity = stateKey
    ? (values[stateKey] as Record<string, unknown> | undefined)
    : undefined;

  const state =
    (liveEntity?.state as string | undefined) ??
    (fetchedEntity?.state as string | undefined) ??
    props.state ??
    '';
  const awaitingApproval = Boolean(
    liveEntity?.awaitingApproval ??
      fetchedEntity?.awaitingApproval ??
      props.awaitingApproval,
  );

  const decoratedActions = useMemo(() => {
    return actions
      .map((action) => {
        const id = action.id ?? '';
        const allowedStates = stateActions[state] ?? [];
        const stateOk = allowedStates.includes(id);
        const roleOk =
          !roleActions || (roleActions[role as Role] ?? []).includes(id);

        // Spec resolution (see docs/V1_DEMO_ISSUES.md):
        //   - Role-gated → action is HIDDEN entirely (deck v2: "they never see
        //     an Approve button"). Returning null filters it out below.
        //   - State-gated → render disabled with tooltip ("Not available in
        //     <state>") so the user understands the lifecycle.
        //   - Awaiting-approval lock → render disabled with tooltip ("Awaiting
        //     checker approval") since the lock is temporary.
        if (!roleOk) return null;

        const lockedByApproval =
          awaitingApproval &&
          role === 'maker' &&
          id !== CLEAR_APPROVAL_ID;

        let disabledReason: string | undefined;
        if (!stateOk) disabledReason = `Not available in ${state || 'this state'}`;
        else if (lockedByApproval) {
          disabledReason = 'Awaiting checker approval';
        }

        return { action, disabled: Boolean(disabledReason), disabledReason };
      })
      .filter((entry): entry is NonNullable<typeof entry> => entry !== null);
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
    // Pass the live entity as rowData so endpoints with `:id` substitute
    // correctly (used by overlay forms opened via open-modal).
    const rowData = (fetchedEntity ?? undefined) as
      | Record<string, unknown>
      | undefined;
    await handleAction(action, rowData);
  };

  return (
    <TooltipProvider delayDuration={150}>
      <div
        className="flex flex-wrap items-center gap-2 rounded-lg border border-border/60 bg-card/40 p-3 shadow-sm transition-all duration-200 hover:shadow-md animate-in fade-in slide-in-from-bottom-2 duration-300"
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
