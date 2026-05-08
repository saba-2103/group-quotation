'use client';

// Schema-driven action bar with state + role gating.
// Used on every detail page (Quote, Proposal, Policy, PolicyMember). The
// schema declares which actions exist and which states/roles unlock them; the
// widget renders disabled buttons with hover tooltips explaining the gate.
//
// Backend-gap surfacing: any action with `disabledTooltip` set on its
// schema renders disabled (visible-but-inert) regardless of state. Used for
// affordances whose real backend support is missing (Quote-level approval,
// Rule Engine pricing) so the UI is honest rather than mock-simulated.

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
  // When set, the widget pulls `state` from useWidgetState() under this key
  // (e.g. 'quote', 'proposal', 'policy').
  stateKey?: string;
  // Field on the fetched entity that holds the lifecycle state. Defaults to
  // `state` (used by Proposal, Policy, PolicyMember, Member). Quote DTOs
  // expose this as `status`, so the quote-detail action-bar declares
  // `stateField: "status"`. Without this override the widget reads
  // `entity.state`, gets undefined for Quotes, applies an empty
  // stateActions[''] map, and disables every action.
  stateField?: string;
}

export const ActionBar: React.FC<ActionBarProps> = ({ config }) => {
  const props = (config.props ?? {}) as ActionBarPropsResolved;
  const {
    stateActions = {},
    roleActions,
    actions = [],
    stateKey,
    stateField = 'state',
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
    (liveEntity?.[stateField] as string | undefined) ??
    (fetchedEntity?.[stateField] as string | undefined) ??
    props.state ??
    '';

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
        //   - Backend-gap → render disabled with the schema-supplied tooltip
        //     so the UI is honest about what the real backend can't do yet.
        if (!roleOk) return null;

        let disabledReason: string | undefined;
        if (action.disabledTooltip) {
          disabledReason = action.disabledTooltip;
        } else if (!stateOk) {
          disabledReason = `Not available in ${state || 'this state'}`;
        }

        return { action, disabled: Boolean(disabledReason), disabledReason };
      })
      .filter((entry): entry is NonNullable<typeof entry> => entry !== null);
  }, [actions, role, roleActions, state, stateActions]);

  if (decoratedActions.length === 0) return null;

  const onClick = async (action: ActionConfig) => {
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
