'use client';

// Schema-driven action bar with state + role gating.
// Used on every detail page (Quote, Proposal, Policy, PolicyMember). The
// schema declares which actions exist and which states/roles unlock them; the
// widget renders disabled buttons with hover tooltips explaining the gate.
//
// V1 maker-checker overlay (preserved under new role names PROP-0009 2026-05-13):
// when `awaitingApproval` is true, the Sales user's editing/submit actions lock
// and the MPH user's Approve action becomes the primary CTA. The two-role
// asymmetry is the V1 demo theatre that survives the role-enum rename — when
// PROP-0010 ships the real MPH portal, this scaffolding can be dismantled
// since real cross-org acceptance takes its place
// (see context/ARCH_TRANSITION.md → "Maker-checker UI overlay").
//
// Backend-gap surfacing: any action with `disabledTooltip` set on its
// schema renders disabled (visible-but-inert) regardless of state. Used for
// affordances whose real backend support is missing (Rule Engine pricing)
// so the UI is honest rather than mock-simulated.

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
  // Field on the fetched entity that holds the lifecycle state. Defaults to
  // `state` (used by Proposal, Policy, PolicyMember, Member). Quote DTOs
  // expose this as `status`, so the quote-detail action-bar declares
  // `stateField: "status"`. Without this override the widget reads
  // `entity.state`, gets undefined for Quotes, applies an empty
  // stateActions[''] map, and disables every action.
  stateField?: string;
  // Maker-checker entity binding for the special action ids.
  entityType?: 'quote' | 'proposal';
  entityId?: string;
}

const SEND_FOR_APPROVAL_ID = 'send-for-approval';
const CLEAR_APPROVAL_ID = 'clear-approval';

// Actions the Maker can still take while their submission is awaiting checker
// approval (the rest are locked with the "Awaiting checker approval" tooltip).
// Plan task 1.9 table: Withdraw is available to both roles always.
const NOT_LOCKED_BY_APPROVAL = new Set([CLEAR_APPROVAL_ID, 'withdraw']);

// Approval-flow actions the Checker only sees once the Maker has actually
// submitted (mirrors the Maker lock — pre-submission there's nothing to act on).
const CHECKER_AWAITING_APPROVAL_ACTIONS = new Set(['submit', CLEAR_APPROVAL_ID]);

export const ActionBar: React.FC<ActionBarProps> = ({ config }) => {
  const props = (config.props ?? {}) as ActionBarPropsResolved;
  const {
    stateActions = {},
    roleActions,
    actions = [],
    stateKey,
    stateField = 'state',
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
  // Surface fetch errors instead of rendering a half-populated toolbar that
  // implies the entity exists. Only relevant when this widget owns the fetch
  // (config.dataSource set) and the parent didn't supply data.
  const ownsFetch = Boolean(config.dataSource && !fetchedFromRenderer);
  const fetchError = ownsFetch ? fetchedDirect.error : null;
  const liveEntity = stateKey
    ? (values[stateKey] as Record<string, unknown> | undefined)
    : undefined;

  const state =
    (liveEntity?.[stateField] as string | undefined) ??
    (fetchedEntity?.[stateField] as string | undefined) ??
    props.state ??
    '';
  const awaitingApproval = Boolean(
    (liveEntity as { awaitingApproval?: boolean } | undefined)?.awaitingApproval ??
      (fetchedEntity as { awaitingApproval?: boolean } | undefined)?.awaitingApproval ??
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
        //   - Backend-gap → render disabled with the schema-supplied tooltip
        //     so the UI is honest about what the real backend can't do yet.
        if (!roleOk) return null;

        // Symmetric to the Sales lock: when awaitingApproval is false, the
        // MPH user has nothing to act on for the Sales user's draft yet. Hide
        // the approval-flow actions to keep the bar uncluttered.
        const checkerWaiting =
          role === 'mph' &&
          !awaitingApproval &&
          CHECKER_AWAITING_APPROVAL_ACTIONS.has(id);
        if (checkerWaiting) return null;

        const lockedByApproval =
          awaitingApproval &&
          role === 'sales' &&
          !NOT_LOCKED_BY_APPROVAL.has(id);

        let disabledReason: string | undefined;
        if (action.disabledTooltip) {
          disabledReason = action.disabledTooltip;
        } else if (!stateOk) {
          disabledReason = `Not available in ${state || 'this state'}`;
        } else if (lockedByApproval) {
          disabledReason = 'Awaiting MPH approval';
        }

        return { action, disabled: Boolean(disabledReason), disabledReason };
      })
      .filter((entry): entry is NonNullable<typeof entry> => entry !== null);
  }, [actions, awaitingApproval, role, roleActions, state, stateActions]);

  if (fetchError) {
    const message = (fetchError as { message?: string }).message ?? 'Could not load actions';
    return (
      <div
        role="alert"
        className="flex items-center gap-2 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive shadow-sm"
      >
        <LucideIcon name="AlertCircle" className="h-4 w-4 shrink-0" />
        <span>Actions unavailable — {message}</span>
      </div>
    );
  }

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
