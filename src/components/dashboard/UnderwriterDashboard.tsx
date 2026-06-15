'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import { getRfqs } from '@/lib/api/quotation-client';
import { useHandoffStore } from '@/stores/handoffStore';
import { useRole } from '@/hooks/useRole';
import { HandoffKind, HandoffStatus, type RfqBase } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { WelcomeHeader } from './shared/WelcomeHeader';
import { NotificationStrip } from './shared/NotificationStrip';
import {
  KpiCard, Panel, EmptyState, GlobalQuickLinks, OutOfScopeBanner, isOverdue, slaCountdownLabel,
} from './shared/dashboardUtils';

function startOfWeek(): number {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - d.getDay());
  return d.getTime();
}

export function UnderwriterDashboard() {
  const { currentRole, salesLevel } = useRole();
  const tasks = useHandoffStore((s) => s.tasks);

  const [rfqs, setRfqs] = useState<RfqBase[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getRfqs().then(setRfqs).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const rfqMap = new Map(rfqs.map((r) => [r.rfqId, r]));

  const uwTasks = tasks.filter((t) => t.kind === HandoffKind.UW);
  const awaiting = uwTasks.filter((t) => t.status === HandoffStatus.REQUESTED);
  const inProgress = uwTasks.filter((t) => t.status === HandoffStatus.IN_PROGRESS);
  const overdueUw = uwTasks.filter(isOverdue);
  const decided = uwTasks.filter((t) =>
    [HandoffStatus.PUBLISHED, HandoffStatus.RETURNED].includes(t.status as HandoffStatus) &&
    t.returnedAt && new Date(t.returnedAt).getTime() >= startOfWeek()
  );

  const reviewQueue = [...uwTasks]
    .filter((t) => t.status === HandoffStatus.REQUESTED || t.status === HandoffStatus.IN_PROGRESS)
    .sort((a, b) => new Date(a.requestedAt).getTime() - new Date(b.requestedAt).getTime());

  const recentReturned = [...uwTasks]
    .filter((t) => t.status === HandoffStatus.PUBLISHED || t.status === HandoffStatus.RETURNED)
    .sort((a, b) => {
      const ta = a.returnedAt ?? a.publishedAt ?? '';
      const tb = b.returnedAt ?? b.publishedAt ?? '';
      return new Date(tb).getTime() - new Date(ta).getTime();
    })
    .slice(0, 5);

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      <WelcomeHeader />
      {!loading && <NotificationStrip rfqs={rfqs} />}
      <OutOfScopeBanner message="The full UW workbench is part of a separate module. This shows your pending queue from the quotation module." />

      {/* KPI Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KpiCard label="Awaiting review" value={awaiting.length} tone={awaiting.length > 0 ? 'warning' : 'default'} />
        <KpiCard label="In progress" value={inProgress.length} />
        <KpiCard label="Overdue" value={overdueUw.length} tone={overdueUw.length > 0 ? 'danger' : 'default'} />
        <KpiCard label="Decided this week" value={decided.length} />
      </div>

      {/* Review Queue */}
      <Panel title="UW review queue">
        {reviewQueue.length === 0 ? (
          <EmptyState message="No plans referred for UW review" />
        ) : (
          <div className="rounded-lg border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Plan</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Client</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground hidden md:table-cell">Reason</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">SLA</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {reviewQueue.map((t) => {
                  const employer = rfqMap.get(t.rfqId)?.employerName ?? t.rfqId;
                  const sla = slaCountdownLabel(t);
                  const overdue = sla === 'Overdue';
                  return (
                    <tr key={t.taskId} className="border-t border-border">
                      <td className="px-4 py-3 text-xs font-mono">{t.planId}</td>
                      <td className="px-4 py-3 text-xs">{employer}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground hidden md:table-cell truncate max-w-[140px]">{t.reason}</td>
                      <td className={`px-4 py-3 text-xs font-medium ${overdue ? 'text-destructive' : 'text-muted-foreground'}`}>{sla}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1.5">
                          <Button asChild variant="outline" size="xs"><Link href={`/rfqs/${t.rfqId}`}>Deal</Link></Button>
                          <Button asChild variant="outline" size="xs"><Link href={`/rfqs/${t.rfqId}/plans`}>Plans</Link></Button>
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

      {/* Recently Returned */}
      {recentReturned.length > 0 && (
        <Panel title="Recently decided">
          <div className="rounded-lg border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Plan</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Client</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Status</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground hidden md:table-cell">Note</th>
                </tr>
              </thead>
              <tbody>
                {recentReturned.map((t) => (
                  <tr key={t.taskId} className="border-t border-border">
                    <td className="px-4 py-3 text-xs font-mono">{t.planId}</td>
                    <td className="px-4 py-3 text-xs">{rfqMap.get(t.rfqId)?.employerName ?? t.rfqId}</td>
                    <td className="px-4 py-3 text-xs">{t.status}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground truncate max-w-[160px] hidden md:table-cell">{t.returnNote ?? '—'}</td>
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
