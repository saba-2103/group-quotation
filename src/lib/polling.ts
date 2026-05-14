// Shared polling cadences. Use these instead of hardcoding intervals on
// `dataSource.pollSchedule` / `refreshInterval` so we can tune cadence in
// one place when backend behaviour changes.

import type { DataSourceConfig } from "@/types/widget";

/**
 * Backend-suggested cadence for polling after triggering an async action
 * (e.g. RequestQuotePrice, classify member, activate policy):
 * fast at first, then slower, then give up.
 *
 * 2s for the first 10s → 5s out to 60s → stop.
 */
export const STANDARD_POLL_SCHEDULE: NonNullable<DataSourceConfig["pollSchedule"]> = {
  initialIntervalMs: 2000,
  initialDurationMs: 10000,
  fallbackIntervalMs: 5000,
  maxDurationMs: 60000,
};
