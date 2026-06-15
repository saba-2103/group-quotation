'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldOff, ChevronRight, Loader2, RefreshCw } from 'lucide-react';
import { useEscalationStore } from '@/stores/escalationStore';
import { useRole } from '@/hooks/useRole';
import { canViewSalesCockpit, canDecideEscalation } from '@/lib/permissions';
import { getRfqs } from '@/lib/api/quotation-client';
import { EscalationStatus, RfqStatus, type RfqBase } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

// ─── Funnel bucket mapping ─────────────────────────────────────────────────────

const FUNNEL_BUCKETS: { label: string; statuses: RfqStatus[] }[] = [
  { label: 'Intake',  statuses: [RfqStatus.DATA_PENDING, RfqStatus.CENSUS_CLEANED, RfqStatus.EXPERIENCE_NORMALIZED] },
  { label: 'Pricing', statuses: [RfqStatus.BENEFITS_READY, RfqStatus.PRICING, RfqStatus.PRICING_IN_PROGRESS, RfqStatus.UW_REVIEW] },
  { label: 'Quoted',  statuses: [RfqStatus.QUOTE_GENERATED, RfqStatus.SHARED, RfqStatus.NEGOTIATION] },
  { label: 'Won',     statuses: [RfqStatus.FINAL, RfqStatus.ISSUED] },
  { label: 'Lost',    statuses: [RfqStatus.REJECTED] },
];

const STAGE_STYLES: Partial<Record<RfqStatus, string>> = {
  [RfqStatus.DATA_PENDING]:        'bg-slate-100 text-slate-700',
  [RfqStatus.BENEFITS_READY]:      'bg-blue-50 text-blue-700',
  [RfqStatus.PRICING]:             'bg-purple-50 text-purple-700',
  [RfqStatus.PRICING_IN_PROGRESS]: 'bg-purple-50 text-purple-700',
  [RfqStatus.UW_REVIEW]:           'bg-amber-50 text-amber-700',
  [RfqStatus.QUOTE_GENERATED]:     'bg-cyan-50 text-cyan-700',
  [RfqStatus.NEGOTIATION]:         'bg-indigo-50 text-indigo-700',
  [RfqStatus.FINAL]:               'bg-green-50 text-green-700',
  [RfqStatus.ISSUED]:              'bg-green-100 text-green-800',
  [RfqStatus.REJECTED]:            'bg-red-50 text-red-700',
};

const ESC_KIND_LABELS: Record<string, string> = {
  FREEZE_VERSION: 'Freeze',
  EXTRA_DISCOUNT: 'Extra Discount',
  POLICY_FLAG: 'Policy Flag',
  REFERRAL: 'Referral',
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SalesCockpitPage() {
  const router = useRouter();
  const { role, salesLevel, userName } = useRole();
  const { escalations, decide } = useEscalationStore();
  const [rfqs, setRfqs] = useState<RfqBase[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [decisionNotes, setDecisionNotes] = useState<Record<string, string>>({});
  const [openDecide, setOpenDecide] = useState<string | null>(null);

  function load() {
    setLoading(true);
    setFetchError(null);
    getRfqs()
      .then(setRfqs)
      .catch((e: unknown) => setFetchError(e instanceof Error ? e.message : 'Failed to load RFQs'))
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  // Route guard — show access-denied in-page rather than redirect
  if (!canViewSalesCockpit(role, salesLevel)) {
    return (
      <div className="p-12 max-w-lg mx-auto text-center space-y-4">
        <ShieldOff className="size-10 text-muted-foreground/40 mx-auto" />
        <h1 className="text-lg font-bold">Access restricted</h1>
        <p className="text-sm text-muted-foreground">
          Sales Cockpit is only accessible to Sales L5 and Admin.
        </p>
        <Button variant="outline" onClick={() => router.push('/rfqs')}>Back to RFQs</Button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48 gap-2 text-muted-foreground">
        <Loader2 className="size-5 animate-spin" /> Loading cockpit…
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="flex flex-col items-center justify-center h-48 gap-3">
        <p className="text-sm text-muted-foreground">{fetchError}</p>
        <Button variant="outline" size="sm" onClick={load}>
          <RefreshCw className="size-3.5 mr-1.5" /> Retry
        </Button>
      </div>
    );
  }

  const pendingEscalations = escalations.filter((e) => e.status === EscalationStatus.PENDING);
  const canDecide = canDecideEscalation(role, salesLevel);

  function handleDecide(id: string, approved: boolean) {
    decide(id, {
      status: approved ? EscalationStatus.APPROVED : EscalationStatus.REJECTED,
      decidedBy: userName,
      decisionNote: decisionNotes[id],
    });
    setOpenDecide(null);
  }

  return (
    <div className="flex flex-col gap-6 p-6 max-w-[1100px] mx-auto">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Sales Cockpit</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {userName} · {role} L{salesLevel} — full book view
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => router.push('/sales-cockpit/assignment')}>
          Assignment
        </Button>
      </div>

      {/* ─── Funnel KPI strip ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-5 gap-3">
        {FUNNEL_BUCKETS.map((bucket) => {
          const count = rfqs.filter((r) => bucket.statuses.includes(r.statusStage)).length;
          return (
            <div key={bucket.label} className="rounded-xl border border-border bg-card px-4 py-3 text-center">
              <p className="text-2xl font-bold">{count}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{bucket.label}</p>
            </div>
          );
        })}
      </div>

      {/* ─── Book overview table ───────────────────────────────────────────── */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="px-5 py-3 border-b border-border/50">
          <h2 className="text-sm font-semibold">Book Overview</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border/40">
                {['Client', 'Stage', 'Owner', 'Last updated', 'SLA'].map((h) => (
                  <th key={h} className="text-left px-4 py-2.5 font-medium text-muted-foreground">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rfqs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">No RFQs found.</td>
                </tr>
              ) : rfqs.map((rfq) => (
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
                  <td className="px-4 py-3 text-muted-foreground">{rfq.salesOwner?.name ?? '—'}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {new Date(rfq.updatedAt).toLocaleDateString('en-IN')}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">—</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ─── Escalations Inbox ─────────────────────────────────────────────── */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="px-5 py-3 border-b border-border/50 flex items-center justify-between">
          <h2 className="text-sm font-semibold">Escalations Inbox</h2>
          <span className="text-xs text-muted-foreground">{pendingEscalations.length} pending</span>
        </div>
        {pendingEscalations.length === 0 ? (
          <p className="px-5 py-8 text-sm text-muted-foreground text-center">No pending escalations.</p>
        ) : (
          <div>
            {pendingEscalations.map((esc) => {
              const rfq = rfqs.find((r) => r.rfqId === esc.rfqId);
              const isOpen = openDecide === esc.id;
              return (
                <div key={esc.id} className="border-b border-border/30 last:border-0">
                  <div className="flex items-start gap-3 px-4 py-3">
                    <div className="flex-1 min-w-0 grid grid-cols-2 sm:grid-cols-5 gap-x-3 gap-y-0.5 text-xs">
                      <div>
                        <span className="text-muted-foreground block text-[10px]">Kind</span>
                        <span className="font-medium">{ESC_KIND_LABELS[esc.kind] ?? esc.kind}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block text-[10px]">Client</span>
                        <span className="font-medium truncate">{rfq?.employerName ?? esc.rfqId}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block text-[10px]">Version</span>
                        <span>{esc.versionId ?? '—'}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block text-[10px]">Requested by</span>
                        <span>{esc.requestedBy}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block text-[10px]">Date</span>
                        <span>{new Date(esc.requestedAt).toLocaleDateString('en-IN')}</span>
                      </div>
                      {(esc.askedPct !== undefined || esc.bufferPct !== undefined) && (
                        <>
                          <div>
                            <span className="text-muted-foreground block text-[10px]">Asked %</span>
                            <span>{esc.askedPct !== undefined ? `${esc.askedPct}%` : '—'}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground block text-[10px]">Buffer %</span>
                            <span>{esc.bufferPct !== undefined ? `${esc.bufferPct}%` : '—'}</span>
                          </div>
                        </>
                      )}
                      <div className="col-span-2 sm:col-span-5 mt-0.5">
                        <span className="text-muted-foreground">{esc.subject}</span>
                      </div>
                    </div>
                    {canDecide && (
                      <Button
                        size="sm" variant="outline"
                        className="shrink-0 text-[11px] h-7 px-2"
                        onClick={() => setOpenDecide(isOpen ? null : esc.id)}
                      >
                        {isOpen ? 'Cancel' : 'Decide'}
                      </Button>
                    )}
                  </div>
                  {isOpen && (
                    <div className="px-4 pb-4 space-y-2 bg-muted/20 border-t border-border/20">
                      <Textarea
                        rows={2}
                        className="text-xs"
                        placeholder="Decision note (optional)…"
                        value={decisionNotes[esc.id] ?? ''}
                        onChange={(e) => setDecisionNotes((n) => ({ ...n, [esc.id]: e.target.value }))}
                      />
                      <div className="flex gap-2">
                        <Button
                          size="sm" variant="outline"
                          className="border-green-300 text-green-800 hover:bg-green-50 text-xs"
                          onClick={() => handleDecide(esc.id, true)}
                        >
                          Approve
                        </Button>
                        <Button
                          size="sm" variant="outline"
                          className="border-red-300 text-red-800 hover:bg-red-50 text-xs"
                          onClick={() => handleDecide(esc.id, false)}
                        >
                          Reject
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
