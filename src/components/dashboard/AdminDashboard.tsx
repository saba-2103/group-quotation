'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Loader2, RefreshCw } from 'lucide-react';
import { getRfqs } from '@/lib/api/quotation-client';
import { useEscalationStore } from '@/stores/escalationStore';
import { useHandoffStore } from '@/stores/handoffStore';
import { useRole } from '@/hooks/useRole';
import {
  EscalationStatus, EscalationKind, HandoffStatus, RfqStatus,
  type RfqBase, type Escalation,
} from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { WelcomeHeader } from './shared/WelcomeHeader';
import { NotificationStrip } from './shared/NotificationStrip';
import { KpiCard, Panel, EmptyState, GlobalQuickLinks, StageBadge } from './shared/dashboardUtils';

const KIND_LABELS: Record<EscalationKind, string> = {
  [EscalationKind.FREEZE_VERSION]: 'Freeze approval',
  [EscalationKind.EXTRA_DISCOUNT]: 'Discount override',
  [EscalationKind.POLICY_FLAG]:    'Policy flag',
};

const STATUS_TONE: Record<EscalationStatus, string> = {
  [EscalationStatus.PENDING]:  'bg-amber-100 text-amber-700',
  [EscalationStatus.APPROVED]: 'bg-green-100 text-green-700',
  [EscalationStatus.REJECTED]: 'bg-red-100 text-red-700',
};

const LIFECYCLE_ORDER: RfqStatus[] = [
  RfqStatus.DATA_PENDING, RfqStatus.CENSUS_CLEANED, RfqStatus.EXPERIENCE_NORMALIZED,
  RfqStatus.BENEFITS_READY, RfqStatus.PRICING, RfqStatus.PRICING_IN_PROGRESS,
  RfqStatus.UW_REVIEW, RfqStatus.QUOTE_GENERATED, RfqStatus.SHARED,
  RfqStatus.NEGOTIATION, RfqStatus.FINAL, RfqStatus.ISSUED, RfqStatus.REJECTED,
];

const STATUS_LABELS: Record<RfqStatus, string> = {
  [RfqStatus.DATA_PENDING]:           'Data Pending',
  [RfqStatus.CENSUS_CLEANED]:         'Census Cleaned',
  [RfqStatus.EXPERIENCE_NORMALIZED]:  'Experience Normalised',
  [RfqStatus.BENEFITS_READY]:         'Benefits Ready',
  [RfqStatus.PRICING]:                'Pricing',
  [RfqStatus.PRICING_IN_PROGRESS]:    'Pricing In Progress',
  [RfqStatus.UW_REVIEW]:              'UW Review',
  [RfqStatus.QUOTE_GENERATED]:        'Quote Generated',
  [RfqStatus.SHARED]:                 'Quote Shared',
  [RfqStatus.NEGOTIATION]:            'Negotiation',
  [RfqStatus.FINAL]:                  'Final',
  [RfqStatus.ISSUED]:                 'Issued',
  [RfqStatus.REJECTED]:               'Rejected',
};

export function AdminDashboard() {
  const { currentRole, salesLevel } = useRole();
  const escalations = useEscalationStore((s) => s.escalations);
  const tasks = useHandoffStore((s) => s.tasks);

  const [rfqs, setRfqs] = useState<RfqBase[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [escalationFilter, setEscalationFilter] = useState<'ALL' | EscalationStatus>('ALL');

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

  const active = rfqs.filter((r) => r.statusStage !== RfqStatus.ISSUED && r.statusStage !== RfqStatus.REJECTED);
  const pendingEscs = escalations.filter((e) => e.status === EscalationStatus.PENDING);
  const openTasks = tasks.filter((t) => t.status === HandoffStatus.REQUESTED || t.status === HandoffStatus.IN_PROGRESS);

  const byStage = LIFECYCLE_ORDER.map((s) => ({
    status: s,
    label: STATUS_LABELS[s],
    count: rfqs.filter((r) => r.statusStage === s).length,
  }));

  const filteredEscs = [...escalations]
    .filter((e) => escalationFilter === 'ALL' || e.status === escalationFilter)
    .sort((a, b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime());

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

      {/* System Overview KPI */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KpiCard label="Total deals" value={loading ? '—' : rfqs.length} />
        <KpiCard label="Active deals" value={loading ? '—' : active.length} />
        <KpiCard label="Pending escalations" value={pendingEscs.length} tone={pendingEscs.length > 0 ? 'warning' : 'default'} />
        <KpiCard label="Open handoff tasks" value={openTasks.length} />
      </div>

      {/* Deals by Stage */}
      <Panel title="Deals by stage">
        <div className="rounded-lg border border-border overflow-hidden">
          <table className="w-full text-sm">
            <tbody>
              {byStage.map((row) => (
                <tr key={row.status} className="border-t border-border first:border-0">
                  <td className="px-4 py-2 text-xs text-muted-foreground">{row.label}</td>
                  <td className="px-4 py-2 text-xs font-tabular-nums font-semibold text-right">{loading ? '—' : row.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      {/* All Escalations */}
      <Panel title="All escalations">
        <div className="flex justify-end mb-2">
          <Select value={escalationFilter} onValueChange={(v) => setEscalationFilter(v as typeof escalationFilter)}>
            <SelectTrigger className="w-40 h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All</SelectItem>
              <SelectItem value={EscalationStatus.PENDING}>Pending</SelectItem>
              <SelectItem value={EscalationStatus.APPROVED}>Approved</SelectItem>
              <SelectItem value={EscalationStatus.REJECTED}>Rejected</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {filteredEscs.length === 0 ? (
          <EmptyState message="No escalations" />
        ) : (
          <div className="rounded-lg border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Kind</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Client</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground hidden md:table-cell">Requested by</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Status</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground hidden lg:table-cell">Decided by</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground hidden lg:table-cell">Note</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredEscs.map((esc) => (
                  <tr key={esc.id} className="border-t border-border">
                    <td className="px-4 py-3 text-xs font-medium">{KIND_LABELS[esc.kind]}</td>
                    <td className="px-4 py-3 text-xs">{rfqMap.get(esc.rfqId)?.employerName ?? esc.rfqId}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground hidden md:table-cell">{esc.requestedBy}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium ${STATUS_TONE[esc.status]}`}>
                        {esc.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground hidden lg:table-cell">{esc.decidedBy ?? '—'}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground truncate max-w-[140px] hidden lg:table-cell">{esc.decisionNote ?? '—'}</td>
                    <td className="px-4 py-3">
                      <Button asChild variant="outline" size="xs"><Link href={`/rfqs/${esc.rfqId}`}>Open deal</Link></Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      {/* Quick links */}
      <Panel title="Quick links">
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" size="sm"><Link href="/plan-templates">Plan Templates</Link></Button>
          <Button asChild variant="outline" size="sm"><Link href="/sales-cockpit/assignment">Assignment</Link></Button>
          <Button asChild variant="outline" size="sm"><Link href="/rfqs">RFQ Inbox</Link></Button>
        </div>
      </Panel>

      <GlobalQuickLinks role={currentRole} salesLevel={salesLevel} />
    </div>
  );
}
