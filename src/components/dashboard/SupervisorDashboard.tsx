'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Loader2, RefreshCw, Plus } from 'lucide-react';
import { getRfqs } from '@/lib/api/quotation-client';
import { useEscalationStore } from '@/stores/escalationStore';
import { useHandoffStore } from '@/stores/handoffStore';
import { useRole } from '@/hooks/useRole';
import { EscalationStatus, EscalationKind, RfqStatus, type RfqBase, type Escalation } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { WelcomeHeader } from './shared/WelcomeHeader';
import { NotificationStrip } from './shared/NotificationStrip';
import { NextActionHint } from './shared/NextActionHint';
import {
  KpiCard, Panel, EmptyState, GlobalQuickLinks, StageBadge, relativeTime, isOverdue,
} from './shared/dashboardUtils';

const KIND_LABELS: Record<EscalationKind, string> = {
  [EscalationKind.FREEZE_VERSION]: 'Freeze approval',
  [EscalationKind.EXTRA_DISCOUNT]: 'Discount override',
  [EscalationKind.POLICY_FLAG]:    'Policy flag',
};

function EscalationRow({
  esc,
  rfqMap,
}: {
  esc: Escalation;
  rfqMap: Map<string, RfqBase>;
}) {
  const { userName } = useRole();
  const decide = useEscalationStore((s) => s.decide);
  const [expanded, setExpanded] = useState(false);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  const isMaker = esc.requestedBy === userName;
  const employerName = rfqMap.get(esc.rfqId)?.employerName ?? esc.rfqId;

  async function handleDecide(approved: boolean) {
    if (!approved && !note.trim()) return;
    setSaving(true);
    decide(esc.id, {
      status: approved ? EscalationStatus.APPROVED : EscalationStatus.REJECTED,
      decidedBy: userName,
      decisionNote: note || undefined,
    });
    setSaving(false);
    setExpanded(false);
  }

  return (
    <>
      <tr
        className="border-t border-border hover:bg-muted/30 cursor-pointer"
        onClick={() => !isMaker && setExpanded((e) => !e)}
      >
        <td className="px-4 py-3 text-xs font-medium">{KIND_LABELS[esc.kind]}</td>
        <td className="px-4 py-3 text-xs">{employerName}</td>
        <td className="px-4 py-3 text-xs text-muted-foreground hidden md:table-cell">{esc.versionId ?? '—'}</td>
        <td className="px-4 py-3 text-xs text-muted-foreground hidden lg:table-cell">{esc.requestedBy}</td>
        <td className="px-4 py-3 text-xs text-muted-foreground hidden lg:table-cell">
          {new Date(esc.requestedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
        </td>
        <td className="px-4 py-3 text-xs max-w-[180px] truncate">{esc.subject}</td>
      </tr>
      {expanded && !isMaker && (
        <tr className="border-t border-border bg-muted/10">
          <td colSpan={6} className="px-4 py-3">
            <div className="space-y-2 max-w-lg">
              <Textarea
                placeholder="Decision note (required for rejection)"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={2}
                className="text-xs"
              />
              <div className="flex gap-2">
                <Button size="sm" disabled={saving} onClick={() => handleDecide(true)}>Approve</Button>
                <Button size="sm" variant="destructive" disabled={saving || !note.trim()} onClick={() => handleDecide(false)}>
                  Reject
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setExpanded(false)}>Cancel</Button>
              </div>
            </div>
          </td>
        </tr>
      )}
      {expanded && isMaker && (
        <tr className="border-t border-border bg-muted/10">
          <td colSpan={6} className="px-4 py-3 text-xs text-muted-foreground italic">
            You raised this request — another supervisor must decide
          </td>
        </tr>
      )}
    </>
  );
}

export function SupervisorDashboard() {
  const { currentRole, salesLevel, userName } = useRole();
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

  const openDeals = rfqs.filter(
    (r) => r.statusStage !== RfqStatus.ISSUED && r.statusStage !== RfqStatus.REJECTED
  );
  const pendingEscalations = escalations.filter((e) => e.status === EscalationStatus.PENDING);
  const overdueAll = tasks.filter(isOverdue);
  const atFinal = rfqs.filter((r) => r.statusStage === RfqStatus.FINAL);

  const topDeals = [...rfqs]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 8);

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      <WelcomeHeader />
      {!loading && !fetchError && <NotificationStrip rfqs={rfqs} />}

      {loading && (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          <span className="text-sm">Loading…</span>
        </div>
      )}
      {fetchError && (
        <div className="rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3 flex items-center justify-between">
          <span className="text-sm text-destructive">{fetchError}</span>
          <Button variant="outline" size="sm" onClick={load}><RefreshCw className="size-3.5 mr-1.5" />Retry</Button>
        </div>
      )}

      {/* KPI Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KpiCard label="Team open deals" value={loading ? '—' : openDeals.length} />
        <KpiCard label="Pending escalations" value={pendingEscalations.length} tone={pendingEscalations.length > 0 ? 'warning' : 'default'} />
        <KpiCard label="Team overdue SLAs" value={loading ? '—' : overdueAll.length} tone={overdueAll.length > 0 ? 'danger' : 'default'} />
        <KpiCard label="At FINAL" value={loading ? '—' : atFinal.length} tone={atFinal.length > 0 ? 'warning' : 'default'} />
      </div>

      {/* Escalations Inbox */}
      <Panel id="escalations-inbox" title={`Escalations awaiting your decision (${pendingEscalations.length})`}>
        {pendingEscalations.length === 0 ? (
          <EmptyState message="No pending escalations — your team is unblocked" />
        ) : (
          <div className="rounded-lg border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Kind</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Client</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground hidden md:table-cell">Version</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground hidden lg:table-cell">Requested by</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground hidden lg:table-cell">Requested at</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Subject</th>
                </tr>
              </thead>
              <tbody>
                {[...pendingEscalations]
                  .sort((a, b) => new Date(a.requestedAt).getTime() - new Date(b.requestedAt).getTime())
                  .map((esc) => (
                    <EscalationRow key={esc.id} esc={esc} rfqMap={rfqMap} />
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      {/* Team Deals */}
      <Panel title="Team deals">
        {!loading && topDeals.length === 0 ? (
          <EmptyState message="No deals in the book" />
        ) : (
          <div className="rounded-lg border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Client</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground hidden md:table-cell">Owner</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Stage</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground hidden md:table-cell">Next action</th>
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
                    <td className="px-4 py-3 text-xs text-muted-foreground hidden md:table-cell">{rfq.salesOwner?.name ?? '—'}</td>
                    <td className="px-4 py-3"><StageBadge status={rfq.statusStage} /></td>
                    <td className="px-4 py-3 text-xs text-muted-foreground hidden md:table-cell">
                      <NextActionHint status={rfq.statusStage} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="px-4 py-2.5 border-t border-border/40 bg-muted/20">
              <Link href="/rfqs" className="text-xs text-primary hover:underline">View full book →</Link>
            </div>
          </div>
        )}
      </Panel>

      <div className="flex flex-wrap gap-2">
        <Button asChild size="sm"><Link href="/sales-cockpit">Sales Cockpit</Link></Button>
        <Button asChild variant="outline" size="sm"><Link href="/rfqs/new"><Plus className="size-3.5 mr-1.5" />Create RFQ</Link></Button>
      </div>

      <GlobalQuickLinks role={currentRole} salesLevel={salesLevel} />
    </div>
  );
}
