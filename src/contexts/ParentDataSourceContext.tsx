"use client";

import { createContext } from "react";

/**
 * QueryKey of the nearest ancestor widget that owns a fetch. Children declare
 * `dataSource: { fromParent: true, select: "path.to.slice" }` to subscribe to
 * that ancestor's cache entry instead of fetching their own envelope.
 *
 * Used by the page-envelope pattern: one widget at the page root fetches the
 * fat read DTO (e.g. `GET /api/v1/policies/{id}` returning policy + plans +
 * members + documents), and sibling widgets consume slices of it. Network
 * cost stays at one fetch; per-subscriber re-renders are bounded by TanStack
 * Query's structural sharing + the `select` slice — a widget that reads
 * `policy.plans` does not re-render when `policy.members` changes.
 *
 * The value is the exact queryKey tuple TanStack Query uses internally —
 * `[endpoint, method, params, dependentState]` — so a child `useQuery({
 * queryKey: parentKey })` subscribes to the same cache entry the parent
 * populated. `null` means no ancestor with a dataSource is in scope.
 */
export const ParentDataSourceContext = createContext<readonly unknown[] | null>(
    null,
);
