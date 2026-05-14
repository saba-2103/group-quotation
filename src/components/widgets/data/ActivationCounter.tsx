"use client";

import React from "react";
import { useParams } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { useSmartQuery } from "@/hooks/useSmartQuery";

// ActivationCounter — compact header tile for the Master Policy detail page.
//
// Combines `activeMembers / activationThreshold`, plus the policy `state` +
// `pendingReason` chips. activeMembers is derived client-side from the
// members list because the backend has no aggregate-count endpoint (verified
// against group-pas-dev OpenAPI on 2026-05-14; the previous mock-only
// /pending-breakdown route has been dropped).

interface PolicyDto {
  activationThreshold?: number | null;
  pendingReason?: string | null;
  state?: string | null;
}

interface MemberSummaryDto {
  state?: string | null;
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
  const membersQuery = useSmartQuery(
    id
      ? { api: { endpoint: `/api/policy-admin/policies/${id}/members`, method: "GET" } }
      : undefined,
  );

  if (!id) {
    return null;
  }

  const policy = policyQuery.data as PolicyDto | undefined;
  const state = policy?.state ?? null;

  if (state === "ACTIVE") {
    return null;
  }

  const pendingReason = policy?.pendingReason ?? null;
  const threshold = policy?.activationThreshold ?? null;
  const members = membersQuery.data as MemberSummaryDto[] | undefined;
  const activeMembers = members
    ? members.filter((m) => m?.state === "ACTIVE").length
    : undefined;

  return (
    <div className="rounded-lg border border-border/80 bg-card p-4 shadow-sm">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
        <div className="min-w-0">
          <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Activation
          </div>
          <div
            className="mt-1 flex items-baseline gap-1"
            title="Active members / minimum required to activate (activationThreshold on the master policy)"
          >
            <span className="text-2xl font-semibold tabular-nums text-foreground">
              {activeMembers ?? "—"}
            </span>
            <span className="text-2xl font-normal text-muted-foreground">/</span>
            <span className="text-2xl font-semibold tabular-nums text-foreground">
              {threshold ?? "—"}
            </span>
            <span className="ml-1 text-sm text-muted-foreground">
              members <span className="text-muted-foreground/70">(min to activate)</span>
            </span>
          </div>
          {policy && threshold == null && (
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
