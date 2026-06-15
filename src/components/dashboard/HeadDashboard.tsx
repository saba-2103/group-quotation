'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Loader2, RefreshCw } from 'lucide-react';
import { getRfqs } from '@/lib/api/quotation-client';
import { useEscalationStore } from '@/stores/escalationStore';
import { useRole } from '@/hooks/useRole';
import { EscalationStatus, EscalationKind, RfqStatus, CensusQuality, type RfqBase, type Escalation } from '@/lib/types';
import { useHandoffStore } from '@/stores/handoffStore';
import { Button } from '@/components/ui/button';
import { WelcomeHeader } from './shared/WelcomeHeader';
import { NotificationStrip } from './shared/NotificationStrip';
import {
  KpiCard, Panel, EmptyState, GlobalQuickLinks, StageBadge, CensusQualityBadge, isOverdue,
} from './shared/dashboardUtils';
import { EscalationKind as EK } from '@/lib/types';
import { Textarea } from '@/components/ui/textarea';
import { useEscalationStore as useEsc } from '@/stores/escalationStore';

const KIND_LABELS: Record<EscalationKind, string> = {
  [EscalationKind.FREEZE_VERSION]: 'Freeze approval',
  [EscalationKind.EXTRA_DISCOUNT]: 'Discount override',
  [EscalationKind.POLICY_FLAG]:    'Policy flag',
};

const FUNNEL_BUCKETS: { label: string; statuses: RfqStatus[] }[] = [
  { label: 'Intake',  statuses: [RfqStatus.DATA_PENDING, RfqStatus.CENSUS_CLEANED, RfqStatus.EXPERIENCE_NORMALIZED, RfqStatus.BENEFITS_READY] },
  { label: 'Pricing', statuses: [RfqStatus.PRICING, RfqStatus.PRICING_IN_PROGRESS, RfqStatus.UW_REVIEW] },
  { label: 'Quoted',  statuses: [RfqStatus.QUOTE_GENERATED, RfqStatus.SHARED, RfqStatus.NEGOTIATION] },
  { label: 'Won',     statuses: [RfqStatus.FINAL, RfqStatus.ISSUED] },
  { label: 'Lost',    statuses: [RfqStatus.REJECTED] },
];

function EscRow({ esc, rfqMap }: { esc: Escalation; rfqMap: Map<string, RfqBase> }) {
  const { userName } = useRole();
  const decide = useEsc((s) => s.decide);
  const [expanded, setExpanded] = useState(false);
  const [note, setNote] = useState('');
  const isMaker = esc.requestedBy === userName;
  const employer = rfqMap.get(esc.rfqId)?.employerName ?? esc.rfqId;

  function handleDecide(approved: boolean) {
    if (!approved && !note.trim()) return;
    decide(esc.id, {
      status: approved ? EscalationStatus.APPROVED : EscalationStatus.REJECTED,
      decidedBy: userName,
      decisionNote: note || undefined,
    });
    setExpanded(false);
  }

  return (
    <>
      <tr className="border-t border-border hover:bg-muted/30 cursor-pointer" onClick={() => !isMaker && setExpanded((e) => !e)}>
        <td className="px-4 py-3 text-xs font-medium">{KIND_LABELS[esc.kind]}</td>
        <td className="px-4 py-3 text-xs">{employer}</td>
        <td className="px-4 py-3 text-xs text-muted-foreground hidden md:table-cell">{esc.requestedBy}</td>
        <td className="px-4 py-3 text-xs max-w-[160px] truncate">{esc.subject}</td>
      </tr>
      {expanded && (
        <tr className="border-t border-border bg-muted/10">
          <td colSpan={4} className="px-4 py-3">
            {isMaker ? (
              <p className="text-xs text-muted-foreground italic">You raised this request — another supervisor must decide</p>
            ) : (
              <div className="space-y-2 max-w-lg">
                <Textarea placeholder="Decision note (required for rejection)" value={note} onChange={(e) => setNote(e.target.value)} rows={2} className="text-xs" />
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => handleDecide(true)}>Approve</Button>
                  <Button size="sm" variant="destructive" disabled={!note.trim()} onClick={() => handleDecide(false)}>Reject</Button>
                  <Button size="sm" variant="ghost" onClick={() => setExpanded(false)}>Cancel</Button>
                </div>
              </div>
            )}
          </td>
        </tr>
      )}
    </>
  );
}

export function HeadDashboard() {
  const { currentRole, salesLevel } = useRole();
  const escalations = useEscalationStore((s) => s.escalations);
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

  const rfqMap = new Map(rfqs.map((r) => [r.rfqId, r]));
  const pendingEscs = escalations.filter((e) => e.status === EscalationStatus.PENDING);

  const funnelCounts = FUNNEL_BUCKETS.map((b) => ({
    ...b,
    count: rfqs.filter((r) => b.statuses.includes(r.statusStage)).length,
  }));
  const totalActive = funnelCounts.reduce((s, b) => s + b.count, 0);

  const topDeals = [...rfqs]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 10);

  function slaHealth(rfqId: string): { label: string; style: string } {
    const count = tasks.filter((t) => t.rfqId === rfqId && isOverdue(t)).length;
    if (count === 0) return { label: 'G', style: 'bg-green-100 text-green-700' };
    if (count === 1) return { label: 'A', style: 'bg-amber-100 text-amber-700' };
    return { label: 'R', style: 'bg-red-100 text-red-700' };
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
      <WelcomeHeader />
      {!loading && !fetchError && <NotificationStrip rfqs={rfqs} />}

      {loading && <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="size-4 animate-spin" /><span className="text-sm">Loading…</span></div>}
      {fetchError && (
        <div className="rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3 flex items-center justify-between">
          <span className="text-sm text-destructive">{fetchError}</span>
          <Button variant="outline" size="sm" onClick={load}><RefreshCw className="size-3.5 mr-1.5" />Retry</Button>
        </div>
      )}

      {/* Funnel KPI */}
      <div className="grid grid-cols-5 gap-2">
        {funnelCounts.map((b) => (
          <div key={b.label} className="rounded-lg border border-border bg-card p-3 flex flex-col gap-1">
            <span className="text-[11px] text-muted-foreground">{b.label}</span>
            <span className="text-xl font-bold tabular-nums">{loading ? '—' : b.count}</span>
            {!loading && totalActive > 0 && (
              <div className="h-1.5 rounded-full bg-muted overflow-hidden mt-1">
                <div
                  className="h-full rounded-full bg-primary/60"
                  style={{ width: `${Math.round((b.count / totalActive) * 100)}%` }}
                />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Escalations Inbox */}
      <Panel id="escalations-inbox" title={`Escalations awaiting your decision (${pendingEscs.length})`}>
        {pendingEscs.length === 0 ? (
          <EmptyState message="No pending escalations" />
        ) : (
          <div className="rounded-lg border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Kind</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Client</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground hidden md:table-cell">Requested by</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Subject</th>
                </tr>
              </thead>
              <tbody>
                {[...pendingEscs]
                  .sort((a, b) => new Date(a.requestedAt).getTime() - new Date(b.requestedAt).getTime())
                  .map((esc) => <EscRow key={esc.id} esc={esc} rfqMap={rfqMap} />)}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      {/* Book Health */}
      <Panel title="Book health">
        <div className="rounded-lg border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Client</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground hidden md:table-cell">Owner</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Stage</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Census</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">SLA</th>
              </tr>
            </thead>
            <tbody>
              {topDeals.map((rfq) => {
                const health = slaHealth(rfq.rfqId);
                return (
                  <tr
                    key={rfq.rfqId}
                    className="border-t border-border hover:bg-muted/30 cursor-pointer"
                    onClick={() => { window.location.href = `/rfqs/${rfq.rfqId}`; }}
                  >
                    <td className="px-4 py-3 font-medium">{rfq.employerName}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground hidden md:table-cell">{rfq.salesOwner?.name ?? '—'}</td>
                    <td className="px-4 py-3"><StageBadge status={rfq.statusStage} /></td>
                    <td className="px-4 py-3"><CensusQualityBadge rfq={rfq} /></td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-bold ${health.style}`}>{health.label}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div className="px-4 py-2.5 border-t border-border/40 bg-muted/20 flex gap-4">
            <Link href="/rfqs" className="text-xs text-primary hover:underline">View full book →</Link>
            <Link href="/sales-cockpit" className="text-xs text-primary hover:underline">Sales Cockpit →</Link>
          </div>
        </div>
      </Panel>

      <GlobalQuickLinks role={currentRole} salesLevel={salesLevel} />
    </div>
  );
}
