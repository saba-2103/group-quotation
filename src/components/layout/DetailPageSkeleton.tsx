// Shared Suspense fallback for Group PAS detail routes (quote, proposal,
// policy, member, policy-member). Mirrors the page-header + first widget
// shape so the load-to-content transition doesn't feel jarring. Replaced the
// per-route "Loading…" text on 2026-05-11.

import { Skeleton } from '@/components/ui/skeleton';

export function DetailPageSkeleton() {
  return (
    <div className="space-y-6 p-6">
      <div className="space-y-3">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-8 w-72" />
        <Skeleton className="h-4 w-96" />
      </div>
      <div className="rounded-lg border border-border/60 bg-card/40 p-6 shadow-sm">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <SkeletonField />
          <SkeletonField />
          <SkeletonField />
          <SkeletonField />
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <Skeleton className="h-9 w-28" />
        <Skeleton className="h-9 w-28" />
        <Skeleton className="h-9 w-32" />
      </div>
    </div>
  );
}

function SkeletonField() {
  return (
    <div className="space-y-2">
      <Skeleton className="h-3 w-16" />
      <Skeleton className="h-5 w-32" />
    </div>
  );
}
