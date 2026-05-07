'use client';

// Banner shown above detail headers when an entity carries a pendingReason,
// voidReason, or free-text cancellationReason. Pulls live entity from
// useWidgetState() under the schema-supplied stateKey, falling back to
// literal props for direct rendering.

import { AlertCircle, AlertTriangle, Ban, Clock } from 'lucide-react';

import { cn } from '@/lib/utils';
import { useSmartQuery } from '@/hooks/useSmartQuery';
import { useWidgetState } from '@/hooks/useWidgetState';
import type { WidgetConfig } from '@/types/widget';

import {
  type EntityKind,
  type ReasonGroup,
  getReasonMeta,
  reasonGroupFor,
} from './state-map';

interface ReasonBannerProps {
  config?: WidgetConfig;
}

interface BannerSourceProps {
  entity: EntityKind;
  state?: string;
  pendingReason?: string;
  voidReason?: string;
  cancellationReason?: string;
}

const ICON_BY_GROUP: Record<ReasonGroup, React.ComponentType<{ className?: string }>> = {
  policyPending: Clock,
  memberPending: Clock,
  memberVoid: Ban,
  memberCancellation: AlertTriangle,
};

const VARIANT_CLASSES: Record<string, string> = {
  warning:
    'border-yellow-500/30 bg-yellow-500/10 text-yellow-900 dark:text-yellow-200',
  destructive:
    'border-destructive/30 bg-destructive/10 text-destructive dark:text-destructive',
  outline: 'border-border bg-muted text-foreground',
};

export const ReasonBanner: React.FC<ReasonBannerProps> = ({ config }) => {
  const props = (config?.props ?? {}) as BannerSourceProps & { stateKey?: string };
  const { values } = useWidgetState();
  const live = props.stateKey
    ? (values[props.stateKey] as Record<string, unknown> | undefined)
    : undefined;
  const fetchedFromRenderer = (config?.props as { data?: Record<string, unknown> } | undefined)?.data;
  const fetchedDirect = useSmartQuery(config?.dataSource);
  const fetched = fetchedFromRenderer ?? fetchedDirect.data ?? undefined;

  const entity = props.entity ?? ('member' as EntityKind);
  const state =
    (live?.state as string | undefined) ??
    (fetched?.state as string | undefined) ??
    props.state ??
    '';
  const pendingReason =
    (live?.pendingReason as string | undefined) ??
    (fetched?.pendingReason as string | undefined) ??
    props.pendingReason;
  const voidReason =
    (live?.voidReason as string | undefined) ??
    (fetched?.voidReason as string | undefined) ??
    props.voidReason;
  const cancellationReason =
    (live?.cancellationReason as string | undefined) ??
    (fetched?.cancellationReason as string | undefined) ??
    props.cancellationReason;

  const group = reasonGroupFor(entity, state, Boolean(cancellationReason));
  if (!group) return null;

  const value =
    group === 'policyPending' || group === 'memberPending'
      ? pendingReason
      : group === 'memberVoid'
        ? voidReason
        : cancellationReason;

  if (!value) return null;

  const meta = getReasonMeta(group, value);
  const Icon = ICON_BY_GROUP[group] ?? AlertCircle;
  const variantClass = VARIANT_CLASSES[meta.variant] ?? VARIANT_CLASSES.outline;

  return (
    <div
      role="status"
      className={cn(
        'flex items-start gap-3 rounded-md border px-4 py-3 text-sm',
        variantClass,
      )}
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0" />
      <div className="flex-1">
        <p className="font-medium leading-tight">{meta.label}</p>
      </div>
    </div>
  );
};
