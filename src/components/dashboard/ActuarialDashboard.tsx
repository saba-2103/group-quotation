'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useHandoffStore } from '@/stores/handoffStore';
import { useRole } from '@/hooks/useRole';
import { HandoffKind, HandoffStatus, type RfqBase } from '@/lib/types';
import { getRfqs } from '@/lib/api/quotation-client';
import { Button } from '@/components/ui/button';
import { WelcomeHeader } from './shared/WelcomeHeader';
import { NotificationStrip } from './shared/NotificationStrip';
import {
  KpiCard, Panel, EmptyState, GlobalQuickLinks, OutOfScopeBanner, isOverdue, slaCountdownLabel,
} from './shared/dashboardUtils';

const NEGOTIATION_REPRICE = 'NEGOTIATION_REPRICE';

export function ActuarialDashboard() {
  const { currentRole, salesLevel } = useRole();
  const tasks = useHandoffStore((s) => s.tasks);

  const [rfqs, setRfqs] = useState<RfqBase[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getRfqs().then(setRfqs).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const rfqMap = new Map(rfqs.map((r) => [r.rfqId, r]));

  const actuaryTasks = tasks.filter((t) => t.kind === HandoffKind.ACTUARY);
  const awaiting = actuaryTasks.filter((t) => t.status === HandoffStatus.REQUESTED && t.reason !== NEGOTIATION_REPRICE);
  const repricing = actuaryTasks.filter((t) => t.status === HandoffStatus.REQUESTED && t.reason === NEGOTIATION_REPRICE);
  const inProgress = actuaryTasks.filter((t) => t.status === HandoffStatus.IN_PROGRESS);
  const overdueAct = actuaryTasks.filter(isOverdue);

  const repriceQueue = [...repricing, ...actuaryTasks.filter((t) => t.status === HandoffStatus.IN_PROGRESS && t.reason === NEGOTIATION_REPRICE)];
  const pricingQueue = actuaryTasks.filter(
    (t) => t.reason !== NEGOTIATION_REPRICE && (t.status === HandoffStatus.REQUESTED || t.status === HandoffStatus.IN_PROGRESS)
  ).sort((a, b) => new Date(a.requestedAt).getTime() - new Date(b.requestedAt).getTime());

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      <WelcomeHeader />
      {!loading && <NotificationStrip rfqs={rfqs} />}
      <OutOfScopeBanner message="The full actuarial workbench is part of a separate module. This shows pricing requests from the quotation module." />

      {/* KPI Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KpiCard label="Awaiting pricing" value={awaiting.length} tone={awaiting.length > 0 ? 'warning' : 'default'} />
        <KpiCard label="Repricing requests" value={repricing.length} tone={repricing.length > 0 ? 'danger' : 'default'} />
        <KpiCard label="In progress" value={inProgress.length} />
        <KpiCard label="Overdue" value={overdueAct.length} tone={overdueAct.length > 0 ? 'danger' : 'default'} />
      </div>

      {/* Negotiation Reprice Queue (urgent — first) */}
      {repriceQueue.length > 0 && (
        <Panel title={`Negotiation Repricing — Urgent (${repriceQueue.length})`}>
          <div className="rounded-lg border border-amber-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-amber-50">
                <tr>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-amber-700">Client</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-amber-700 hidden md:table-cell">Version</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-amber-700 hidden md:table-cell">Note</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-amber-700">SLA</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-amber-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {repriceQueue.map((t) => {
                  const sla = slaCountdownLabel(t);
                  return (
                    <tr key={t.taskId} className="border-t border-amber-100">
                      <td className="px-4 py-3 text-xs">{rfqMap.get(t.rfqId)?.employerName ?? t.rfqId}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground hidden md:table-cell">{t.versionId}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground truncate max-w-[120px] hidden md:table-cell">{t.note ?? '—'}</td>
                      <td className={`px-4 py-3 text-xs font-medium ${sla === 'Overdue' ? 'text-destructive' : 'text-muted-foreground'}`}>{sla}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1.5">
                          <Button asChild variant="outline" size="xs"><Link href={`/rfqs/${t.rfqId}/negotiation`}>Negotiation</Link></Button>
                          <Button asChild variant="outline" size="xs"><Link href={`/rfqs/${t.rfqId}/commercial-rate-card`}>Rate card</Link></Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Panel>
      )}

      {/* Pricing Queue */}
      <Panel title="Pricing queue">
        {pricingQueue.length === 0 ? (
          <EmptyState message="No plans awaiting pricing" />
        ) : (
          <div className="rounded-lg border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Plan</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Client</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground hidden md:table-cell">Lives</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">SLA</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pricingQueue.map((t) => {
                  const sla = slaCountdownLabel(t);
                  return (
                    <tr key={t.taskId} className="border-t border-border">
                      <td className="px-4 py-3 text-xs font-mono">{t.planId}</td>
                      <td className="px-4 py-3 text-xs">{rfqMap.get(t.rfqId)?.employerName ?? t.rfqId}</td>
                      <td className="px-4 py-3 text-xs hidden md:table-cell">{t.lives.toLocaleString()}</td>
                      <td className={`px-4 py-3 text-xs font-medium ${sla === 'Overdue' ? 'text-destructive' : 'text-muted-foreground'}`}>{sla}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1.5">
                          <Button asChild variant="outline" size="xs"><Link href={`/rfqs/${t.rfqId}`}>Deal</Link></Button>
                          <Button asChild variant="outline" size="xs"><Link href={`/rfqs/${t.rfqId}/commercial-rate-card`}>Rate card</Link></Button>
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

      <GlobalQuickLinks role={currentRole} salesLevel={salesLevel} />
    </div>
  );
}
