// Generic registry for entity-state labels + badge variants. Consumers register
// their domain's state map at module-load time (e.g. via a state-map.<domain>.ts
// file imported once at app boot); StateBadge / ReasonBanner / column cells
// read from the registry without knowing the underlying enum.

import type { BadgeProps } from '@/components/ui/badge';

export type Variant = NonNullable<BadgeProps['variant']>;

export type EntityKind = string;

export interface StateMeta {
  label: string;
  variant: Variant;
}

export interface ReasonMeta {
  label: string;
  variant: Variant;
}

export type ReasonGroup = string;

const STATE_MAPS: Record<EntityKind, Record<string, StateMeta>> = {};
const REASON_MAPS: Record<ReasonGroup, Record<string, ReasonMeta>> = {};
const FREE_TEXT_REASON_GROUPS = new Set<ReasonGroup>();
const REASON_GROUP_RESOLVERS: Array<
  (entity: EntityKind, state: string, hasFreeText: boolean) => ReasonGroup | undefined
> = [];

const FALLBACK_STATE: StateMeta = { label: 'Unknown', variant: 'outline' };
const FALLBACK_REASON: ReasonMeta = { label: 'Unknown reason', variant: 'outline' };

export function registerStateMap(
  entity: EntityKind,
  map: Record<string, StateMeta>,
): void {
  STATE_MAPS[entity] = { ...(STATE_MAPS[entity] ?? {}), ...map };
}

export function registerReasonMap(
  group: ReasonGroup,
  map: Record<string, ReasonMeta>,
  options?: { freeText?: boolean },
): void {
  REASON_MAPS[group] = { ...(REASON_MAPS[group] ?? {}), ...map };
  if (options?.freeText) FREE_TEXT_REASON_GROUPS.add(group);
}

export function registerReasonGroupResolver(
  resolver: (
    entity: EntityKind,
    state: string,
    hasFreeText: boolean,
  ) => ReasonGroup | undefined,
): void {
  REASON_GROUP_RESOLVERS.push(resolver);
}

export function getStateMeta(entity: EntityKind, state: string): StateMeta {
  return (
    STATE_MAPS[entity]?.[state] ?? {
      ...FALLBACK_STATE,
      label: state || FALLBACK_STATE.label,
    }
  );
}

export function getReasonMeta(group: ReasonGroup, value: string): ReasonMeta {
  if (FREE_TEXT_REASON_GROUPS.has(group)) {
    return { label: value, variant: 'destructive' };
  }
  return (
    REASON_MAPS[group]?.[value] ?? {
      ...FALLBACK_REASON,
      label: value || FALLBACK_REASON.label,
    }
  );
}

export function reasonGroupFor(
  entity: EntityKind,
  state: string,
  hasCancellationReason: boolean,
): ReasonGroup | undefined {
  for (const resolver of REASON_GROUP_RESOLVERS) {
    const group = resolver(entity, state, hasCancellationReason);
    if (group) return group;
  }
  return undefined;
}
