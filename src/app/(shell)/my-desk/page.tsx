'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, CheckCircle2, Clock, ChevronRight, RefreshCw, Loader2 } from 'lucide-react';
import { useEscalationStore } from '@/stores/escalationStore';
import { useRole } from '@/hooks/useRole';
import { canDecideEscalation } from '@/lib/permissions';
import { getRfqs } from '@/lib/api/quotation-client';
import { EscalationStatus, RfqStatus, type RfqBase, type Escalation } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

// ─── Status → pending action label ────────────────────────────────────────────

function getPendingAction(rfq: RfqBase): string {
  switch (rfq.statusStage) {
    case RfqStatus.DATA_PENDING:
    case RfqStatus.CENSUS_CLEANED:
    case RfqStatus.EXPERIENCE_NORMALIZED:
      return 'Complete census / data';
    case RfqStatus.BENEFITS_READY:
      return 'Awaiting pricing';
    case RfqStatus.PRICING:
    case RfqStatus.PRICING_IN_PROGRESS:
      return 'Awaiting pricing';
    case RfqStatus.UW_REVIEW:
      return 'Awaiting UW';
    case RfqStatus.QUOTE_GENERATED:
      return 'Needs freeze';
    case RfqStatus.SHARED:
    case RfqStatus.NEGOTIATION:
      return 'Negotiation active';
    case RfqStatus.FINAL:
      return 'Ready to issue';
    case RfqStatus.ISSUED:
      return 'Issued';
    case RfqStatus.REJECTED:
      return 'Lost / Rejected';
    default:
      return rfq.statusStage;
  }
}

// ─── Status chip ──────────────────────────────────────────────────────────────

const STAGE_STYLES: Partial<Record<RfqStatus, string>> = {
  [RfqStatus.DATA_PENDING]:    'bg-slate-100 text-slate-700',
  [RfqStatus.BENEFITS_READY]:  'bg-blue-50 text-blue-700',
  [RfqStatus.PRICING]:         'bg-purple-50 text-purple-700',
  [RfqStatus.PRICING_IN_PROGRESS]: 'bg-purple-50 text-purple-700',
  [RfqStatus.UW_REVIEW]:       'bg-amber-50 text-amber-700',
  [RfqStatus.QUOTE_GENERATED]: 'bg-cyan-50 text-cyan-700',
  [RfqStatus.NEGOTIATION]:     'bg-indigo-50 text-indigo-700',
  [RfqStatus.FINAL]:           'bg-green-50 text-green-700',
  [RfqStatus.ISSUED]:          'bg-green-100 text-green-800',
  [RfqStatus.REJECTED]:        'bg-red-50 text-red-700',
};

const ESC_KIND_LABELS: Record<string, string> = {
  FREEZE_VERSION: 'Freeze',
  EXTRA_DISCOUNT: 'Extra Discount',
  POLICY_FLAG: 'Policy Flag',
  REFERRAL: 'Referral',
};

// ─── Escalation Row ───────────────────────────────────────────────────────────

function EscalationRow({
  esc,
  rfqs,
  canDecide,
  userName,
}: {
  esc: Escalation;
  rfqs: RfqBase[];
  canDecide: boolean;
  userName: string;
}) {
  const { decide } = useEscalationStore();
  const [open, setOpen] = useState(false);
  const [decisionNote, setDecisionNote] = useState('');
  const [deciding, setDeciding] = useState(false);

  const rfq = rfqs.find((r) => r.rfqId === esc.rfqId);

  async function handleDecide(approved: boolean) {
    setDeciding(true);
    decide(esc.id, {
      status: approved ? EscalationStatus.APPROVED : EscalationStatus.REJECTED,
      decidedBy: userName,
      decisionNote,
    });
    setDeciding(false);
    setOpen(false);
  }

  return (
    <div className="border-b border-border/30 last:border-0">
      <div className="flex items-start gap-3 px-4 py-3">
        <div className="flex-1 min-w-0 grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-0.5 text-xs">
          <div>
            <span className="text-muted-foreground block text-[10px]">Kind</span>
            <span className="font-medium">{ESC_KIND_LABELS[esc.kind] ?? esc.kind}</span>
          </div>
          <div>
            <span className="text-muted-foreground block text-[10px]">Client</span>
            <span className="font-medium truncate">{rfq?.employerName ?? esc.rfqId}</span>
          </div>
          <div>
            <span className="text-muted-foreground block text-[10px]">Requested by</span>
            <span>{esc.requestedBy}</span>
          </div>
          <div>
            <span className="text-muted-foreground block text-[10px]">Date</span>
            <span>{new Date(esc.requestedAt).toLocaleDateString('en-IN')}</span>
          </div>
          <div className="col-span-2 sm:col-span-4 mt-0.5">
            <span className="text-muted-foreground">{esc.subject}</span>
          </div>
        </div>
        {canDecide && (
          <Button
            size="sm" variant="outline"
            className="shrink-0 text-[11px] h-7 px-2"
            onClick={() => setOpen((v) => !v)}
          >
            {open ? 'Cancel' : 'Decide'}
          </Button>
        )}
      </div>

      {open && (
        <div className="px-4 pb-4 space-y-2 bg-muted/20 border-t border-border/20">
          <Textarea
            rows={2}
            className="text-xs"
            placeholder="Decision note (optional)…"
            value={decisionNote}
            onChange={(e) => setDecisionNote(e.target.value)}
          />
          <div className="flex gap-2">
            <Button
              size="sm" variant="outline"
              className="border-green-300 text-green-800 hover:bg-green-50 text-xs"
              disabled={deciding}
              onClick={() => handleDecide(true)}
            >
              <CheckCircle2 className="size-3.5 mr-1" /> Approve
            </Button>
            <Button
              size="sm" variant="outline"
              className="border-red-300 text-red-800 hover:bg-red-50 text-xs"
              disabled={deciding}
              onClick={() => handleDecide(false)}
            >
              Reject
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function MyDeskPage() {
  const router = useRouter();
  const { role, salesLevel, userId, userName } = useRole();
  const { escalations } = useEscalationStore();
  const [rfqs, setRfqs] = useState<RfqBase[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  function load() {
    setLoading(true);
    setFetchError(null);
    getRfqs()
      .then(setRfqs)
      .catch((e: unknown) => setFetchError(e instanceof Error ? e.message : 'Failed to load deals'))
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48 gap-2 text-muted-foreground">
        <Loader2 className="size-5 animate-spin" /> Loading your desk…
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="flex flex-col items-center justify-center h-48 gap-3">
        <AlertTriangle className="size-6 text-destructive" />
        <p className="text-sm text-muted-foreground">{fetchError}</p>
        <Button variant="outline" size="sm" onClick={load}>
          <RefreshCw className="size-3.5 mr-1.5" /> Retry
        </Button>
      </div>
    );
  }

  const myRfqs = rfqs.filter((r) => r.salesOwner?.userId === userId);
  const isSupervisor = canDecideEscalation(role, salesLevel);

  // Escalations: L4+ sees all pending, others see only their own RFQs
  const myEscalations = escalations.filter((e) => {
    if (e.status !== EscalationStatus.PENDING) return false;
    if (isSupervisor) return true;
    return myRfqs.some((r) => r.rfqId === e.rfqId);
  });

  const openDeals = myRfqs.filter((r) =>
    r.statusStage !== RfqStatus.ISSUED && r.statusStage !== RfqStatus.REJECTED
  );
  const pendingAction = myRfqs.filter((r) =>
    [RfqStatus.QUOTE_GENERATED, RfqStatus.FINAL, RfqStatus.NEGOTIATION].includes(r.statusStage)
  );
  // Overdue SLA = deals still in intake/pricing for demo purposes
  const overdueSla = myRfqs.filter((r) =>
    [RfqStatus.DATA_PENDING, RfqStatus.PRICING, RfqStatus.PRICING_IN_PROGRESS].includes(r.statusStage)
  );

  return (
    <div className="flex flex-col gap-6 p-6 max-w-[960px] mx-auto">
      <div>
        <h1 className="text-xl font-bold tracking-tight">My Desk</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {userName} · {role}{salesLevel !== undefined ? ` L${salesLevel}` : ''}
        </p>
      </div>

      {/* ─── KPI Strip ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Open deals', value: openDeals.length, icon: ChevronRight, color: 'text-primary' },
          { label: 'Pending my action', value: pendingAction.length, icon: Clock, color: 'text-amber-600' },
          { label: 'Overdue SLA', value: overdueSla.length, icon: AlertTriangle, color: 'text-red-600' },
        ].map((kpi) => (
          <div key={kpi.label} className="rounded-xl border border-border bg-card px-5 py-4 flex items-start gap-3">
            <kpi.icon className={cn('size-5 mt-0.5 shrink-0', kpi.color)} />
            <div>
              <p className="text-2xl font-bold">{kpi.value}</p>
              <p className="text-xs text-muted-foreground">{kpi.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ─── Active Deals List ─────────────────────────────────────────────── */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="px-5 py-3 border-b border-border/50 flex items-center justify-between">
          <h2 className="text-sm font-semibold">Active Deals</h2>
          <span className="text-xs text-muted-foreground">{myRfqs.length} deal{myRfqs.length !== 1 ? 's' : ''}</span>
        </div>
        {myRfqs.length === 0 ? (
          <p className="px-5 py-8 text-sm text-muted-foreground text-center">
            No deals assigned to you yet.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border/40">
                  {['Client', 'Stage', 'Last updated', 'Pending action'].map((h) => (
                    <th key={h} className="text-left px-4 py-2.5 font-medium text-muted-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {myRfqs.map((rfq) => (
                  <tr
                    key={rfq.rfqId}
                    className="border-b border-border/20 last:border-0 hover:bg-muted/20 cursor-pointer"
                    onClick={() => router.push(`/rfqs/${rfq.rfqId}`)}
                  >
                    <td className="px-4 py-3 font-medium">{rfq.employerName}</td>
                    <td className="px-4 py-3">
                      <span className={cn(
                        'text-[10px] font-medium px-2 py-0.5 rounded-full',
                        STAGE_STYLES[rfq.statusStage] ?? 'bg-muted text-muted-foreground'
                      )}>
                        {rfq.statusStage.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {new Date(rfq.updatedAt).toLocaleDateString('en-IN')}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{getPendingAction(rfq)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ─── Escalations Queue ─────────────────────────────────────────────── */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="px-5 py-3 border-b border-border/50 flex items-center justify-between">
          <h2 className="text-sm font-semibold">
            {isSupervisor ? 'Escalations Inbox (all book)' : 'Escalations Queue'}
          </h2>
          <span className="text-xs text-muted-foreground">{myEscalations.length} pending</span>
        </div>
        {myEscalations.length === 0 ? (
          <p className="px-5 py-8 text-sm text-muted-foreground text-center">
            No pending escalations.
          </p>
        ) : (
          <div>
            {myEscalations.map((esc) => (
              <EscalationRow
                key={esc.id}
                esc={esc}
                rfqs={rfqs}
                canDecide={isSupervisor}
                userName={userName}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
