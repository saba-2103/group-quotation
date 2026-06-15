'use client';

import Link from 'next/link';
import { AlertTriangle } from 'lucide-react';
import { useHandoffStore } from '@/stores/handoffStore';
import { useEscalationStore } from '@/stores/escalationStore';
import { useRole } from '@/hooks/useRole';
import { EscalationStatus, HandoffStatus, RfqStatus, type RfqBase } from '@/lib/types';

function isOverdue(task: { requestedAt: string; slaHours: number; status: string }): boolean {
  if (
    task.status !== HandoffStatus.REQUESTED &&
    task.status !== HandoffStatus.IN_PROGRESS
  ) return false;
  return Date.now() - new Date(task.requestedAt).getTime() > task.slaHours * 3_600_000;
}

interface Props {
  rfqs: RfqBase[];
}

export function NotificationStrip({ rfqs }: Props) {
  const tasks = useHandoffStore((s) => s.tasks);
  const escalations = useEscalationStore((s) => s.escalations);
  const { currentRole, salesLevel } = useRole();

  const overdueTasks = tasks.filter(isOverdue);

  const canDecide =
    (currentRole === 'SALES' && salesLevel >= 4) || currentRole === 'ADMIN';
  const pendingDecisions = canDecide
    ? escalations.filter((e) => e.status === EscalationStatus.PENDING)
    : [];

  const finalNoFreeze =
    currentRole === 'OPS'
      ? rfqs.filter(
          (r) =>
            r.statusStage === RfqStatus.FINAL &&
            !r.quoteVersions.some((v) => v.status === 'FROZEN' || v.status === 'SELECTED')
        )
      : [];

  const items = [
    overdueTasks.length > 0 && {
      label: `${overdueTasks.length} overdue SLA${overdueTasks.length > 1 ? 's' : ''}`,
      anchor: '#overdue-tasks',
    },
    pendingDecisions.length > 0 && {
      label: `${pendingDecisions.length} escalation${pendingDecisions.length > 1 ? 's' : ''} awaiting decision`,
      anchor: '#escalations-inbox',
    },
    finalNoFreeze.length > 0 && {
      label: `${finalNoFreeze.length} deal${finalNoFreeze.length > 1 ? 's' : ''} at FINAL with no frozen version`,
      anchor: '#issuance-queue',
    },
  ].filter(Boolean) as { label: string; anchor: string }[];

  if (items.length === 0) return null;

  return (
    <div className="flex items-center gap-3 rounded-md border border-amber-200 bg-amber-50 px-4 py-2.5">
      <AlertTriangle className="size-4 text-amber-600 shrink-0" />
      <div className="flex flex-wrap gap-x-4 gap-y-1">
        {items.map((item) => (
          <Link
            key={item.anchor}
            href={item.anchor}
            className="text-xs font-medium text-amber-700 hover:underline"
          >
            {item.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
