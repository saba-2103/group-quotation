'use client';

// Banner that surfaces in-flight async work to the user. Polls the configured
// endpoint via `useSmartQuery` (use `pollSchedule` + `stopWhen` on the
// dataSource) and renders an animated spinner with `pendingMessage` while
// polling is active.
//
// Activation:
//   - With `stateKey` declared: the banner is opt-in. It only shows (and only
//     polls) when `useWidgetState().values[stateKey]` is truthy — typically
//     flipped on by the triggering action's `onSuccess` `update-widget-state`
//     step. Once the response satisfies `pendingWhenMissing` (i.e. every
//     accessor resolves to a non-blank value), the banner clears the flag,
//     hides, and stops polling. Reload-resilient by design: a hard refresh
//     drops the flag, so we don't show "Pricing computing…" forever on a
//     stale request.
//   - Without `stateKey`: always-on. Poll runs as soon as the widget mounts;
//     the banner shows whenever every accessor in `pendingWhenMissing` is
//     blank. Useful for places where the page itself signals pendingness
//     (e.g. an entity in a transient state).
//
// On error, surfaces `errorMessage` so the user isn't left guessing.

import { useEffect } from 'react';
import { Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';

import { cn } from '@/lib/utils';
import { useSmartQuery } from '@/hooks/useSmartQuery';
import { useWidgetState } from '@/hooks/useWidgetState';
import type { WidgetConfig } from '@/types/widget';

interface PollingBannerProps {
  pendingMessage?: string;
  successMessage?: string;
  errorMessage?: string;
  // Dotted accessor paths. If every one resolves to a blank value
  // (null/undefined/0/""), the banner remains in the `pending` state.
  pendingWhenMissing?: string[];
  // Widget-state key consulted to gate the banner. When set, the banner
  // (and its polling) only activates while this key is truthy. The banner
  // clears the key when the response satisfies `pendingWhenMissing` so the
  // flag-flip lifecycle is self-contained.
  stateKey?: string;
}

function getNested(source: unknown, path: string): unknown {
  if (source == null || !path) return undefined;
  return path.split('.').reduce<unknown>(
    (acc, key) =>
      acc != null && typeof acc === 'object' && key in (acc as object)
        ? (acc as Record<string, unknown>)[key]
        : undefined,
    source,
  );
}

function isMissing(v: unknown): boolean {
  if (v === null || v === undefined) return true;
  if (v === 0) return true;
  if (typeof v === 'string' && v.length === 0) return true;
  if (Array.isArray(v) && v.length === 0) return true;
  return false;
}

export const PollingBanner: React.FC<{ config: WidgetConfig }> = ({ config }) => {
  const props = (config.props ?? {}) as PollingBannerProps;
  const {
    pendingMessage = 'Working…',
    successMessage,
    errorMessage = 'Failed to load status',
    pendingWhenMissing = [],
    stateKey,
  } = props;

  const { values, setValue } = useWidgetState();
  // When a stateKey is declared the banner is opt-in — the triggering action
  // sets the flag, we run while it's truthy. Without one, default to "always
  // active" so callers that *want* a passive monitor still work.
  const flagActive = stateKey ? Boolean(values[stateKey]) : true;

  const { data, error } = useSmartQuery(flagActive ? config.dataSource : undefined);

  const pending =
    flagActive &&
    (pendingWhenMissing.length === 0
      ? true
      : pendingWhenMissing.every((path) => isMissing(getNested(data, path))));

  // Clear the flag when the response says we're done. Wrapped in useEffect so
  // the state write doesn't fire inside render, which would otherwise loop
  // every other widget subscribed to the same store.
  useEffect(() => {
    if (
      stateKey &&
      flagActive &&
      pendingWhenMissing.length > 0 &&
      data != null &&
      pendingWhenMissing.every((path) => !isMissing(getNested(data, path)))
    ) {
      setValue(stateKey, false);
    }
  }, [stateKey, flagActive, data, pendingWhenMissing, setValue]);

  if (error) {
    return (
      <div
        role="alert"
        className="flex items-start gap-3 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive shadow-sm"
      >
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
        <p className="font-medium leading-tight">{errorMessage}</p>
      </div>
    );
  }

  if (pending) {
    return (
      <div
        role="status"
        aria-live="polite"
        className={cn(
          'flex items-center gap-3 rounded-md border border-primary/40 bg-primary/10 px-4 py-3 text-sm text-primary shadow-sm',
          'animate-in fade-in slide-in-from-top-1 duration-300',
        )}
      >
        <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
        <p className="font-medium leading-tight">{pendingMessage}</p>
      </div>
    );
  }

  if (flagActive && successMessage) {
    return (
      <div
        role="status"
        className="flex items-center gap-3 rounded-md border border-success/40 bg-success/10 px-4 py-3 text-sm text-success shadow-sm"
      >
        <CheckCircle2 className="h-4 w-4 shrink-0" />
        <p className="font-medium leading-tight">{successMessage}</p>
      </div>
    );
  }

  return null;
};
