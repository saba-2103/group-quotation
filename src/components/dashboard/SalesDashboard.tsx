'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Loader2, RefreshCw, Plus } from 'lucide-react';
import { getRfqs } from '@/lib/api/quotation-client';
import { useHandoffStore } from '@/stores/handoffStore';
import { useRole } from '@/hooks/useRole';
import { RfqStatus, HandoffStatus, type RfqBase } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { WelcomeHeader } from './shared/WelcomeHeader';
import { NotificationStrip } from './shared/NotificationStrip';
import { NextActionHint } from './shared/NextActionHint';
import {
  KpiCard, Panel, EmptyState, GlobalQuickLinks, StageBadge,
  relativeTime, isOverdue,
} from './shared/dashboardUtils';

const ACTIONABLE = new Set<RfqStatus>([
  RfqStatus.DATA_PENDING, RfqStatus.BENEFITS_READY,
  RfqStatus.QUOTE_GENERATED, RfqStatus.NEGOTIATION, RfqStatus.FINAL,
]);

const COACHING_ORDER: RfqStatus[] = [
  RfqStatus.NEGOTIATION, RfqStatus.FINAL,
  RfqStatus.BENEFITS_READY, RfqStatus.DATA_PENDING,
];

const COACHING_CTA: Partial<Record<RfqStatus, string>> = {
  [RfqStatus.NEGOTIATION]:   'log the latest counter',
  [RfqStatus.FINAL]:         'freeze the aligned version',
  [RfqStatus.BENEFITS_READY]:'dispatch for pricing',
  [RfqStatus.DATA_PENDING]:  'complete census & data',
};

interface Props { level: number; }

export function SalesDashboard({ level }: Props) {
  const { userId, currentRole, salesLevel } = useRole();
  const tasks = useHandoffStore((s) => s.tasks);

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

  const myRfqs = rfqs.filter((r) => r.salesOwner?.userId === userId);
  const myOpen = myRfqs.filter((r) => r.statusStage !== RfqStatus.ISSUED && r.statusStage !== RfqStatus.REJECTED);
  const needsAction = myOpen.filter((r) => ACTIONABLE.has(r.statusStage));
  const myTasks = tasks.filter((t) => myRfqs.some((r) => r.rfqId === t.rfqId));
  const pendingDispatches = myTasks.filter((t) => t.status === HandoffStatus.REQUESTED);
  const overdueTasks = myTasks.filter(isOverdue);

  const topDeals = [...myRfqs].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  ).slice(0, 5);

  // Coaching prompts
  const coachingLines = COACHING_ORDER.flatMap((status) => {
    const count = needsAction.filter((r) => r.statusStage === status).length;
    if (count === 0) return [];
    return [`${count} deal${count > 1 ? 's' : ''} ${COACHING_CTA[status] ? `— ${COACHING_CTA[status]}` : ''}`];
  }).slice(0, 3);

  // L2–L3 extras
  const readyToFreeze = level >= 2 ? rfqs.filter((r) => {
    const hasSelected = r.quoteVersions.some((v) => v.status === 'SELECTED');
    const hasFrozen = r.quoteVersions.some((v) => v.status === 'FROZEN');
    return (
      [RfqStatus.FINAL, RfqStatus.QUOTE_GENERATED, RfqStatus.SHARED].includes(r.statusStage) &&
      hasSelected && !hasFrozen
    );
  }) : [];

  const activeNegotiations = level >= 2
    ? myRfqs.filter((r) => r.statusStage === RfqStatus.NEGOTIATION)
    : [];

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      <WelcomeHeader />

      {!loading && !fetchError && <NotificationStrip rfqs={rfqs} />}

      {loading && (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          <span className="text-sm">Loading your deals…</span>
        </div>
      )}

      {fetchError && (
        <div className="rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3 flex items-center justify-between">
          <span className="text-sm text-destructive">{fetchError}</span>
          <Button variant="outline" size="sm" onClick={load}>
            <RefreshCw className="size-3.5 mr-1.5" /> Retry
          </Button>
        </div>
      )}

      {/* KPI Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KpiCard label="My open deals" value={loading ? '—' : myOpen.length} />
        <KpiCard label="Needs action" value={loading ? '—' : needsAction.length} tone={needsAction.length > 0 ? 'warning' : 'default'} />
        <KpiCard label="Pending dispatches" value={loading ? '—' : pendingDispatches.length} />
        <KpiCard label="Overdue SLAs" value={loading ? '—' : overdueTasks.length} tone={overdueTasks.length > 0 ? 'danger' : 'default'} />
      </div>

      {/* My Deals */}
      <Panel title="My deals">
        {!loading && topDeals.length === 0 ? (
          <div className="text-center py-10 space-y-4 border border-dashed border-border rounded-lg">
            <p className="text-sm text-muted-foreground">No deals yet — create your first RFQ</p>
            <Button asChild size="sm">
              <Link href="/rfqs/new"><Plus className="size-3.5 mr-1.5" /> Create RFQ</Link>
            </Button>
          </div>
        ) : (
          <div className="rounded-lg border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Client</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Stage</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground hidden md:table-cell">Next action</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Updated</th>
                </tr>
              </thead>
              <tbody>
                {topDeals.map((rfq) => (
                  <tr
                    key={rfq.rfqId}
                    className="border-t border-border hover:bg-muted/30 cursor-pointer"
                    onClick={() => { window.location.href = `/rfqs/${rfq.rfqId}`; }}
                  >
                    <td className="px-4 py-3 font-medium">{rfq.employerName}</td>
                    <td className="px-4 py-3"><StageBadge status={rfq.statusStage} /></td>
                    <td className="px-4 py-3 text-muted-foreground text-xs hidden md:table-cell">
                      <NextActionHint status={rfq.statusStage} />
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{relativeTime(rfq.updatedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="px-4 py-2.5 border-t border-border/40 bg-muted/20">
              <Link href="/my-desk" className="text-xs text-primary hover:underline">View all →</Link>
            </div>
          </div>
        )}
      </Panel>

      {/* Coaching prompts */}
      {coachingLines.length > 0 && (
        <Panel title="Suggested next steps">
          <ul className="space-y-1.5">
            {coachingLines.map((line, i) => (
              <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                <span className="mt-0.5 inline-flex size-4 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">{i + 1}</span>
                {line}
              </li>
            ))}
          </ul>
        </Panel>
      )}

      {/* L2–L3: Ready to freeze */}
      {level >= 2 && readyToFreeze.length > 0 && (
        <Panel title={`Ready to freeze (${readyToFreeze.length})`}>
          <div className="rounded-lg border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Client</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Stage</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground hidden md:table-cell">Aligned version</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Action</th>
                </tr>
              </thead>
              <tbody>
                {readyToFreeze.map((rfq) => {
                  const selected = rfq.quoteVersions.find((v) => v.status === 'SELECTED');
                  return (
                    <tr key={rfq.rfqId} className="border-t border-border">
                      <td className="px-4 py-3 font-medium">{rfq.employerName}</td>
                      <td className="px-4 py-3"><StageBadge status={rfq.statusStage} /></td>
                      <td className="px-4 py-3 text-xs text-muted-foreground hidden md:table-cell">{selected?.name ?? '—'}</td>
                      <td className="px-4 py-3">
                        <Button asChild variant="outline" size="xs">
                          <Link href={`/rfqs/${rfq.rfqId}/versions`}>Freeze now</Link>
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Panel>
      )}

      {/* L2–L3: Active negotiations */}
      {level >= 2 && activeNegotiations.length > 0 && (
        <Panel title={`Active negotiations (${activeNegotiations.length})`}>
          <div className="rounded-lg border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Client</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Latest broker ask</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Rounds</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Action</th>
                </tr>
              </thead>
              <tbody>
                {activeNegotiations.map((rfq) => {
                  const latestBroker = [...rfq.negotiationLog]
                    .reverse()
                    .find((r) => r.party === 'BROKER');
                  return (
                    <tr key={rfq.rfqId} className="border-t border-border">
                      <td className="px-4 py-3 font-medium">{rfq.employerName}</td>
                      <td className="px-4 py-3 text-xs">
                        {latestBroker?.askDiscountPct != null ? `${latestBroker.askDiscountPct}%` : '—'}
                      </td>
                      <td className="px-4 py-3 text-xs">{rfq.negotiationLog.length}</td>
                      <td className="px-4 py-3">
                        <Button asChild variant="outline" size="xs">
                          <Link href={`/rfqs/${rfq.rfqId}/negotiation`}>Continue</Link>
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Panel>
      )}

      {/* Quick actions */}
      <div className="flex flex-wrap gap-2">
        <Button asChild size="sm">
          <Link href="/rfqs/new"><Plus className="size-3.5 mr-1.5" />Create RFQ</Link>
        </Button>
        <Button asChild variant="outline" size="sm">
          <Link href="/my-desk">My Desk</Link>
        </Button>
      </div>

      <GlobalQuickLinks role={currentRole} salesLevel={salesLevel} />
    </div>
  );
}
