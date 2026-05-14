'use client';

// Banner that surfaces in-flight async work to the user. Polls the configured
// endpoint via `useSmartQuery` (use `pollSchedule` + `stopWhen` on the
// dataSource) and renders one of three messages based on the latest response:
//
//   - `pending`: response carries the "not yet computed" signal — shown as an
//     animated spinner with the configured `pendingMessage`. This is the
//     state the user sees from the moment polling starts (request fired,
//     waiting for the workflow to land).
//   - `idle`: response is fetched and `pending` is false — shows nothing by
//     default so a completed-state page stays clean. Set `successMessage` to
//     show a brief confirmation chip.
//   - `error`: fetch failed — surfaces the error so the user isn't left
//     guessing.
//
// "Pending" is decided by checking that one of `pendingWhenMissing` accessors
// is empty (null/undefined/0/""). That mirrors `stopWhen` on the dataSource:
// poll until the value lands, then stop and hide the banner.

import { Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';

import { cn } from '@/lib/utils';
import { useSmartQuery } from '@/hooks/useSmartQuery';
import type { WidgetConfig } from '@/types/widget';

interface PollingBannerProps {
  pendingMessage?: string;
  successMessage?: string;
  errorMessage?: string;
  // Dotted accessor paths. If every one resolves to a blank value
  // (null/undefined/0/""), the banner enters the `pending` state.
  pendingWhenMissing?: string[];
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
  } = props;

  const { data, error, isFetching } = useSmartQuery(config.dataSource);

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

  const pending =
    pendingWhenMissing.length === 0
      ? isFetching
      : pendingWhenMissing.every((path) => isMissing(getNested(data, path)));

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

  if (successMessage) {
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
