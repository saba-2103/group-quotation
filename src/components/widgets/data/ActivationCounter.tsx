"use client";

import React from "react";
import { useParams } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { useSmartQuery } from "@/hooks/useSmartQuery";

// ActivationCounter — compact header tile for the Master Policy detail page.
//
// Composes `activeMembers / activationThreshold` from two existing endpoints,
// then surfaces `state` (badge) + `pendingReason` (chip) alongside.
//
// Why bespoke: a single key-value-grid can only read from one dataSource, but
// the counter combines values from /policies/{id} (threshold + state +
// reason) and /policies/{id}/pending-breakdown (active count). Building a
// generic per-field dataSource primitive is a bigger lift (tracked under the
// schema-engine extraction PR convergence note in ARCH_TRANSITION); this
// widget is the narrow, header-shaped consumer that unblocks the demo today.

interface PolicyDto {
  activationThreshold?: number | null;
  pendingReason?: string | null;
  state?: string | null;
}

interface PendingBreakdownDto {
  activeMembers?: number | null;
  totalMembers?: number | null;
  policyState?: string | null;
  policyPendingReason?: string | null;
}

interface ActivationCounterProps {
  policyId?: string;
}

const STATE_TO_VARIANT: Record<string, Parameters<typeof Badge>[0]["variant"]> = {
  CREATED: "secondary",
  PENDING: "warning",
  ACTIVE: "success",
  CANCELLED: "destructive",
};

const REASON_LABEL: Record<string, string> = {
  AWAITING_MIN_MEMBERS: "Awaiting min members",
  AWAITING_COMPLIANCE: "Awaiting compliance",
};

export const ActivationCounter: React.FC<ActivationCounterProps & { config?: { props?: ActivationCounterProps } }> = (
  incoming,
) => {
  const flat = incoming as ActivationCounterProps;
  const policyId = flat.policyId ?? incoming.config?.props?.policyId;
  const params = useParams<{ id?: string }>();
  const id = policyId ?? params?.id;

  const policyQuery = useSmartQuery(
    id ? { api: { endpoint: `/api/policy-admin/policies/${id}`, method: "GET" } } : undefined,
  );
  const breakdownQuery = useSmartQuery(
    id
      ? { api: { endpoint: `/api/policy-admin/policies/${id}/pending-breakdown`, method: "GET" } }
      : undefined,
  );

  const isLoading = policyQuery.isLoading || breakdownQuery.isLoading;

  if (!id) {
    return null;
  }

  const policy = policyQuery.data as PolicyDto | undefined;
  const breakdown = breakdownQuery.data as PendingBreakdownDto | undefined;
  // Prefer top-level PolicyDto fields; fall back to the breakdown's mirror
  // (the existing overview tab populates those from the same data).
  const state = policy?.state ?? breakdown?.policyState ?? null;
  const pendingReason = policy?.pendingReason ?? breakdown?.policyPendingReason ?? null;
  const activeMembers = breakdown?.activeMembers ?? 0;
  const threshold = policy?.activationThreshold ?? null;

  return (
    <div className="rounded-lg border border-border/80 bg-card p-4 shadow-sm">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
        <div className="min-w-0">
          <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Activation
          </div>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-2xl font-semibold tabular-nums text-foreground">
              {isLoading ? "—" : activeMembers}
            </span>
            <span className="text-2xl font-normal text-muted-foreground">/</span>
            <span className="text-2xl font-semibold tabular-nums text-foreground">
              {threshold != null ? threshold : "—"}
            </span>
            <span className="ml-1 text-sm text-muted-foreground">members</span>
          </div>
          {threshold == null && !isLoading && (
            <p className="mt-1 text-xs text-muted-foreground">Activation threshold not set</p>
          )}
        </div>

        {state && (
          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              State
            </span>
            <Badge variant={STATE_TO_VARIANT[state] ?? "outline"}>{state}</Badge>
          </div>
        )}

        {pendingReason && (
          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Pending reason
            </span>
            <Badge variant="warning">
              {REASON_LABEL[pendingReason] ?? pendingReason}
            </Badge>
          </div>
        )}
      </div>
    </div>
  );
};
