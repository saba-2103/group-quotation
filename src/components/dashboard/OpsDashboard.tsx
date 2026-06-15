'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Loader2, RefreshCw, AlertTriangle } from 'lucide-react';
import { getRfqs } from '@/lib/api/quotation-client';
import { useHandoffStore } from '@/stores/handoffStore';
import { useRole } from '@/hooks/useRole';
import { HandoffKind, HandoffStatus, RfqStatus, type RfqBase } from '@/lib/types';
import { computeReadinessGates } from '@/lib/computations';
import { Button } from '@/components/ui/button';
import { WelcomeHeader } from './shared/WelcomeHeader';
import { NotificationStrip } from './shared/NotificationStrip';
import {
  KpiCard, Panel, EmptyState, GlobalQuickLinks, StageBadge,
} from './shared/dashboardUtils';

function sevenDaysAgo(): number {
  return Date.now() - 7 * 24 * 3600 * 1000;
}

function lightGateCheck(rfq: RfqBase): string {
  // Lightweight proxy — avoids full bundle load
  const hasFrozen = rfq.quoteVersions.some((v) => v.status === 'FROZEN');
  const hasMembers = (rfq.censusSummary?.totalLives ?? 0) > 0;
  const failCount = [!hasFrozen, !hasMembers].filter(Boolean).length;
  return failCount === 0 ? 'All passing' : `${failCount} failing`;
}

export function OpsDashboard() {
  const { currentRole, salesLevel } = useRole();
  const tasks = useHandoffStore((s) => s.tasks);
  const dispatchFailedRfqIds = useHandoffStore((s) => s.dispatchFailedRfqIds);
  const clearDispatchFailed = useHandoffStore((s) => s.clearDispatchFailed);

  const [rfqs, setRfqs] = useState<RfqBase[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  function load() {
    setLoading(true);
    setFetchError(null);
    getRfqs()
      .then(setRfqs)
      .catch((e: unknown) => setFetchError(e instanceof Error ? e.message : 'Failed to load'))
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  const rfqMap = new Map(rfqs.map((r) => [r.rfqId, r]));

  const opsRequests = tasks.filter((t) => t.kind === HandoffKind.OPS && t.status === HandoffStatus.REQUESTED);
  const atFinal = rfqs.filter((r) => r.statusStage === RfqStatus.FINAL);
  const issuedThisWeek = rfqs.filter(
    (r) => r.statusStage === RfqStatus.ISSUED && r.issuedAt && new Date(r.issuedAt).getTime() >= sevenDaysAgo()
  );

  // Issuance queue: OPS tasks (explicit requests) + FINAL deals without a request, deduplicated
  const requestedRfqIds = new Set(opsRequests.map((t) => t.rfqId));
  const finalWithoutRequest = atFinal.filter((r) => !requestedRfqIds.has(r.rfqId));
  const issuanceQueue: { rfqId: string; rfq: RfqBase | undefined; fromTask: boolean; taskRequestedAt?: string }[] = [
    ...opsRequests.map((t) => ({
      rfqId: t.rfqId,
      rfq: rfqMap.get(t.rfqId),
      fromTask: true,
      taskRequestedAt: t.requestedAt,
    })),
    ...finalWithoutRequest.map((r) => ({
      rfqId: r.rfqId,
      rfq: r,
      fromTask: false,
    })),
  ];

  const recentlyIssued = [...rfqs]
    .filter((r) => r.statusStage === RfqStatus.ISSUED && r.issuedAt)
    .sort((a, b) => new Date(b.issuedAt!).getTime() - new Date(a.issuedAt!).getTime())
    .slice(0, 5);

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      <WelcomeHeader />
      {!loading && !fetchError && <NotificationStrip rfqs={rfqs} />}

      {loading && <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="size-4 animate-spin" /><span className="text-sm">Loading…</span></div>}
      {fetchError && (
        <div className="rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3 flex items-center justify-between">
          <span className="text-sm text-destructive">{fetchError}</span>
          <Button variant="outline" size="sm" onClick={load}><RefreshCw className="size-3.5 mr-1.5" />Retry</Button>
        </div>
      )}

      {/* PAS Dispatch Alerts */}
      {dispatchFailedRfqIds.length > 0 && (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 space-y-2">
          <div className="flex items-center gap-2">
            <AlertTriangle className="size-4 text-amber-600 shrink-0" />
            <span className="text-sm font-medium text-amber-700">
              PAS dispatch failed for {dispatchFailedRfqIds.length} deal{dispatchFailedRfqIds.length > 1 ? 's' : ''} — re-dispatch from the issuance screen.
            </span>
          </div>
          <ul className="pl-6 space-y-1">
            {dispatchFailedRfqIds.map((id) => (
              <li key={id} className="text-xs">
                <Link href={`/rfqs/${id}/issuance`} className="text-amber-700 hover:underline font-medium">
                  {rfqMap.get(id)?.employerName ?? id}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* KPI Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KpiCard label="Issuance requests" value={opsRequests.length} tone={opsRequests.length > 0 ? 'warning' : 'default'} />
        <KpiCard label="At FINAL" value={loading ? '—' : atFinal.length} />
        <KpiCard label="Issued this week" value={loading ? '—' : issuedThisWeek.length} />
        <KpiCard label="Dispatch alerts" value={dispatchFailedRfqIds.length} tone={dispatchFailedRfqIds.length > 0 ? 'danger' : 'default'} />
      </div>

      {/* Issuance Queue */}
      <Panel id="issuance-queue" title={`Issuance Queue (${issuanceQueue.length})`}>
        {issuanceQueue.length === 0 ? (
          <EmptyState message="No deals ready for issuance" />
        ) : (
          <div className="rounded-lg border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Client</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Stage</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground hidden md:table-cell">Requested at</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground hidden md:table-cell">Frozen version</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground hidden lg:table-cell">Gates</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {issuanceQueue.map((item) => {
                  if (!item.rfq) return null;
                  const frozen = item.rfq.quoteVersions.find((v) => v.status === 'FROZEN');
                  return (
                    <tr key={item.rfqId} className="border-t border-border">
                      <td className="px-4 py-3 font-medium text-sm">{item.rfq.employerName}</td>
                      <td className="px-4 py-3"><StageBadge status={item.rfq.statusStage} /></td>
                      <td className="px-4 py-3 text-xs text-muted-foreground hidden md:table-cell">{item.taskRequestedAt ? new Date(item.taskRequestedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '—'}</td>
                      <td className="px-4 py-3 text-xs hidden md:table-cell">
                        {frozen ? frozen.name : <span className="text-amber-600 font-medium">No frozen version — check</span>}
                      </td>
                      <td className="px-4 py-3 text-xs hidden lg:table-cell">{lightGateCheck(item.rfq)}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1.5">
                          <Button asChild size="xs"><Link href={`/rfqs/${item.rfqId}/issuance`}>Issue</Link></Button>
                          <Button asChild variant="outline" size="xs"><Link href={`/rfqs/${item.rfqId}`}>Workspace</Link></Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      {/* Recently Issued */}
      {recentlyIssued.length > 0 && (
        <Panel title="Recently issued">
          <div className="rounded-lg border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Client</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Policy number</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground hidden md:table-cell">Issued at</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground hidden md:table-cell">Total lives</th>
                </tr>
              </thead>
              <tbody>
                {recentlyIssued.map((rfq) => (
                  <tr key={rfq.rfqId} className="border-t border-border">
                    <td className="px-4 py-3 text-sm">{rfq.employerName}</td>
                    <td className="px-4 py-3 text-xs font-mono">{rfq.masterPolicyNumber ?? '—'}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground hidden md:table-cell">
                      {rfq.issuedAt ? new Date(rfq.issuedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                    </td>
                    <td className="px-4 py-3 text-xs hidden md:table-cell">{rfq.censusSummary?.totalLives?.toLocaleString() ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      )}

      <GlobalQuickLinks role={currentRole} salesLevel={salesLevel} />
    </div>
  );
}
