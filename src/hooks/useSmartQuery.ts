import { useContext, useEffect, useMemo, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { DataSourceConfig } from '@/types/widget';
import { useWidgetState } from './useWidgetState';
import { evaluateCondition } from '@/lib/conditions';
import { getNested } from '@/lib/objectPath';
import { ParentDataSourceContext } from '@/contexts/ParentDataSourceContext';

export function useSmartQuery(dataSource?: DataSourceConfig) {
    const {
        api,
        valueKey,
        select,
        fromParent,
        refreshInterval,
        pollSchedule,
        stopWhen,
        stateDependencies,
    } = dataSource || {};
    const { values } = useWidgetState();
    const parentQueryKey = useContext(ParentDataSourceContext);

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

    // Effective queryKey:
    // - own-fetch widgets compute their own key from api + dependentState
    // - fromParent widgets borrow the ancestor's key from context
    // - fromParent orphans (no ancestor) get a sentinel key so the query
    //   is disabled cleanly and the dev warning below points it out
    const ownKey: readonly unknown[] = api
        ? [api.endpoint, api.method, api.params, dependentState]
        : ['no-api'];
    const effectiveKey: readonly unknown[] = fromParent
        ? (parentQueryKey ?? ['fromParent:orphan'])
        : ownKey;

    // Dev-mode misconfiguration warnings. Fire from an effect so we don't
    // log on every render — only when the contributing config changes.
    const isOrphanFromParent = !!fromParent && !parentQueryKey;
    const ignoredFromParentFields = !!fromParent && (
        !!api || !!valueKey || !!refreshInterval || !!pollSchedule
        || !!stopWhen || !!(stateDependencies && stateDependencies.length)
    );
    useEffect(() => {
        if (process.env.NODE_ENV === 'production') return;
        if (isOrphanFromParent) {
            console.warn(
                'useSmartQuery: dataSource.fromParent is true but no ancestor '
                + 'widget has a dataSource in scope. The widget will receive '
                + 'data: undefined. Either remove fromParent or wrap this '
                + 'widget under a parent that owns a fetch.',
            );
        }
        if (ignoredFromParentFields) {
            console.warn(
                'useSmartQuery: dataSource.fromParent is true; ignoring `api`, '
                + '`valueKey`, `refreshInterval`, `pollSchedule`, `stopWhen`, '
                + 'and `stateDependencies`. These belong on the ancestor that '
                + 'owns the fetch — `select` is the only companion `fromParent` '
                + 'expects.',
            );
        }
    }, [isOrphanFromParent, ignoredFromParentFields]);

    // Memoise the select function so TanStack Query sees a stable reference.
    // With structural sharing on (the v5 default), this means subscribers
    // only re-render when the *selected slice* changes by reference, even if
    // unrelated parts of the envelope updated.
    //
    // Return type is cast to `any` deliberately. The framework's fetched
    // payloads are untyped JSON (queryFn awaits `res.json()`, which is
    // `any`), so the existing consumer contract is "data is any, the call
    // site knows the shape." Returning `unknown` from select would narrow
    // TData and break string-indexed access at every consumer that pre-dates
    // this hook. If consumers want narrower types, they should cast at the
    // call site, the same way they do today.
    const selectFn = useMemo(
        () => (select
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            ? (data: unknown): any => getNested(data, select)
            : undefined),
        [select],
    );

    const queryResult = useQuery({
        queryKey: effectiveKey as unknown[],
        queryFn: fromParent
            ? async () => {
                // fromParent widgets are observers — the parent's queryFn
                // populates the cache. This throw is a safety net: TanStack
                // only invokes queryFn when `enabled` is true and no cached
                // value exists, which our `enabled` guard prevents.
                throw new Error(
                    'useSmartQuery: fromParent observer should not fetch — '
                    + 'ancestor cache entry missing or enabled gate misfired',
                );
            }
            : async () => {
                if (!api) return null;

                // Build URL with state parameters if it's a GET request
                let url = api.endpoint;
                const allParams = { ...api.params, ...dependentState };

                if (api.method === 'GET' && Object.keys(allParams).length > 0) {
                    const searchParams = new URLSearchParams();
                    Object.entries(allParams).forEach(([key, val]) => {
                        if (val !== undefined && val !== null && val !== '') {
                            if (Array.isArray(val)) {
                                // Repeat the key per value: ?state=DRAFT&state=SUBMITTED
                                val.forEach((v) => {
                                    if (v !== undefined && v !== null && v !== '') {
                                        searchParams.append(key, String(v));
                                    }
                                });
                            } else if (typeof val === 'object') {
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
        // fromParent widgets never poll — they ride the parent's cadence.
        refetchInterval: fromParent || (!refreshInterval && !pollSchedule)
            ? false
            : (query) => {
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
        // fromParent: enable only when an ancestor key is in scope. Orphans
        // stay disabled so the safety-net queryFn never runs.
        enabled: fromParent ? !!parentQueryKey : !!api,
        select: selectFn,
    });

    // Expose the effective queryKey so WidgetRenderer can seed the
    // ParentDataSourceContext for descendants. Only own-fetch widgets seed
    // (the renderer checks `fromParent` before providing); for fromParent
    // widgets the context naturally falls through to whatever the real
    // ancestor provided.
    //
    // Trade-off: spreading the result here defeats TanStack Query's
    // "tracked queries" micro-optimisation (which detects accessed fields
    // via a Proxy and re-renders only when those fields change). The
    // practical effect for our consumers — which destructure `data`,
    // `isLoading`, `error` and now `queryKey` — is at most one extra
    // re-render when `isFetching` flips during polling. Acceptable given
    // the page-detail scale; revisit if a hot widget shows up in a profile.
    return { ...queryResult, queryKey: effectiveKey };
}
