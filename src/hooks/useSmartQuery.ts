import { useEffect, useMemo, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { DataSourceConfig } from '@/types/widget';
import { useWidgetState } from './useWidgetState';
import { evaluateCondition } from '@/lib/conditions';

export function useSmartQuery(dataSource?: DataSourceConfig) {
    const { api, valueKey, refreshInterval, pollSchedule, stopWhen, stateDependencies } = dataSource || {};
    const { values } = useWidgetState();

    // Tracks when the current polling cycle started, so a backoff schedule
    // can switch from initialIntervalMs to fallbackIntervalMs after
    // initialDurationMs and stop after maxDurationMs. Reset to null when
    // polling halts (stopWhen satisfied or maxDurationMs elapsed) so the
    // next cycle starts fresh.
    const pollStartRef = useRef<number | null>(null);

    // Reset the backoff clock whenever the inputs that drive queryKey change
    // (endpoint, method, params, dependent state, schedule on/off). Without
    // this, if a component stays mounted while the entity id flips, elapsed
    // time from the previous cycle would carry over — skipping the fast phase
    // or hitting maxDurationMs early.
    const pollResetSignal = useMemo(
        () => JSON.stringify([api?.endpoint, api?.method, api?.params, stateDependencies, !!pollSchedule]),
        [api?.endpoint, api?.method, api?.params, stateDependencies, pollSchedule],
    );
    useEffect(() => {
        pollStartRef.current = null;
    }, [pollResetSignal]);

    // Extract relevant state for dependencies
    const dependentState = stateDependencies?.reduce((acc, key) => {
        acc[key] = values[key];
        return acc;
    }, {} as Record<string, any>) || {};

    return useQuery({
        queryKey: api ? [api.endpoint, api.method, api.params, dependentState] : ['no-api'],
        queryFn: async () => {
            if (!api) return null;

            // Build URL with state parameters if it's a GET request
            let url = api.endpoint;
            const allParams = { ...api.params, ...dependentState };

            if (api.method === 'GET' && Object.keys(allParams).length > 0) {
                const searchParams = new URLSearchParams();
                Object.entries(allParams).forEach(([key, val]) => {
                    if (val !== undefined && val !== null && val !== '') {
                        if (typeof val === 'object') {
                            // If it's an object (like filters), spread it
                            Object.entries(val).forEach(([innerKey, innerVal]) => {
                                if (innerVal !== undefined && innerVal !== null && innerVal !== '') {
                                    searchParams.append(innerKey, String(innerVal));
                                }
                            });
                        } else {
                            searchParams.append(key, String(val));
                        }
                    }
                });
                const queryString = searchParams.toString();
                if (queryString) {
                    url += (url.includes('?') ? '&' : '?') + queryString;
                }
            }

      const res = await fetch(url, {
                method: api.method,
                body: api.method !== 'GET' ? JSON.stringify(allParams) : undefined,
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            if (!res.ok) {
                throw new Error(`Failed to fetch: ${res.statusText}`);
            }
      const jsonData = await res.json();

      // If valueKey is specified, extract that nested property
      if (valueKey && jsonData && typeof jsonData === "object") {
        return (jsonData as Record<string, any>)[valueKey] ?? jsonData;
      }

      return jsonData;
    },
        // Function form so we can:
        //   1. stop polling once `stopWhen` is satisfied by the latest response
        //      (e.g. wait for `premium` to populate after RequestQuotePrice);
        //   2. apply a backoff schedule (fast cadence first, then slower) and
        //      enforce a hard cap.
        // Returns false to stop, or the next interval in ms.
        refetchInterval: (!refreshInterval && !pollSchedule) ? false : (query) => {
            const data = query.state.data;

            // Stop early if the response satisfies stopWhen.
            if (stopWhen && data && evaluateCondition(stopWhen, data)) {
                pollStartRef.current = null;
                return false;
            }

            // Schedule-based polling: track elapsed time since first poll.
            if (pollSchedule) {
                if (pollStartRef.current === null) {
                    pollStartRef.current = Date.now();
                }
                const elapsedMs = Date.now() - pollStartRef.current;

                if (pollSchedule.maxDurationMs && elapsedMs >= pollSchedule.maxDurationMs) {
                    pollStartRef.current = null;
                    return false;
                }
                return elapsedMs < pollSchedule.initialDurationMs
                    ? pollSchedule.initialIntervalMs
                    : pollSchedule.fallbackIntervalMs;
            }

            // Fixed-interval polling.
            return refreshInterval ?? false;
        },
        enabled: !!api,
    });
}
