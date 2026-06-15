'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  CheckCircle2, XCircle, AlertTriangle, Clock, ArrowRight, ChevronRight,
  Shield, RefreshCw, Lock,
} from 'lucide-react';
import { useRfqBundle } from '@/context/RfqBundleContext';
import { useEscalationStore } from '@/stores/escalationStore';
import { useHandoffStore } from '@/stores/handoffStore';
import { useRole } from '@/hooks/useRole';
import { computeNegotiationHeadroom } from '@/lib/computations';
import { canAcceptNegotiation } from '@/lib/permissions';
import { updateRfq, advanceRfqStatus } from '@/lib/api/quotation-client';
import {
  NegotiationParty, NegotiationKind, EscalationKind, EscalationStatus,
  HandoffKind, HandoffStatus, RfqStatus, VersionStatus,
  type NegotiationRound,
} from '@/lib/types';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function localId() {
  return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

function fmt(n: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency', currency: 'INR', maximumFractionDigits: 0,
  }).format(n);
}

const CLOSED_STATUSES: string[] = [
  RfqStatus.FINAL, RfqStatus.REJECTED, RfqStatus.ISSUED,
];

// ─── Round card ───────────────────────────────────────────────────────────────

function RoundCard({
  round,
  versionName,
}: {
  round: NegotiationRound;
  versionName: string;
}) {
  const isBroker = round.party === NegotiationParty.BROKER;
  const isAccept = round.kind === NegotiationKind.ACCEPT;
  const isDecline = round.kind === NegotiationKind.DECLINE;
  return (
    <div
      className={cn(
        'rounded-lg border px-4 py-3 space-y-1',
        isBroker
          ? 'border-amber-200 bg-amber-50'
          : isAccept
          ? 'border-green-200 bg-green-50'
          : isDecline
          ? 'border-destructive/20 bg-destructive/5'
          : 'border-blue-200 bg-blue-50'
      )}
    >
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-[10px] font-mono text-muted-foreground">R{round.roundNo}</span>
        <span
          className={cn(
            'text-[10px] font-bold uppercase rounded-full px-2 py-0.5 border',
            isBroker
              ? 'bg-amber-100 text-amber-800 border-amber-300'
              : 'bg-blue-100 text-blue-800 border-blue-300'
          )}
        >
          {round.party}
        </span>
        <span
          className={cn(
            'text-[10px] font-medium rounded-full px-2 py-0.5 border',
            isAccept
              ? 'bg-green-100 text-green-800 border-green-300'
              : isDecline
              ? 'bg-red-100 text-red-800 border-red-300'
              : 'bg-slate-100 text-slate-700 border-slate-200'
          )}
        >
          {round.kind}
        </span>
        <span className="text-[10px] text-muted-foreground">{versionName}</span>
        <span className="text-[10px] text-muted-foreground ml-auto">
          {new Date(round.at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' })}
        </span>
      </div>
      <div className="flex flex-wrap gap-4 text-xs">
        {round.askDiscountPct != null && (
          <span>
            <span className="text-muted-foreground">Discount ask: </span>
            <span className="font-semibold tabular-nums">{round.askDiscountPct}%</span>
          </span>
        )}
        {round.askPremium != null && (
          <span>
            <span className="text-muted-foreground">Target premium: </span>
            <span className="font-semibold tabular-nums">{fmt(round.askPremium)}</span>
          </span>
        )}
        {round.by && (
          <span className="text-muted-foreground">by {round.by}</span>
        )}
      </div>
      {round.note && <p className="text-[11px] text-muted-foreground italic">{round.note}</p>}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function NegotiationPage() {
  const router = useRouter();
  const { bundle, refetch } = useRfqBundle();
  const { escalations, raise } = useEscalationStore();
  const { upsertTask, getTasksForRfq } = useHandoffStore();
  const { role, salesLevel, userName } = useRole();

  // Log broker counter form state
  const [versionIdField, setVersionIdField] = useState<string>('');
  const [askDiscountPct, setAskDiscountPct] = useState<string>('');
  const [askPremium, setAskPremium] = useState<string>('');
  const [counterNote, setCounterNote] = useState('');

  // Insurer counter form
  const [counterPct, setCounterPct] = useState<string>('');
  const [counterCounterNote, setCounterCounterNote] = useState('');
  const [counterError, setCounterError] = useState('');

  const [saving, setSaving] = useState(false);

  if (!bundle) return null;

  const rfqId = bundle.rfqId;
  const selectedVersionId = versionIdField || bundle.activeVersionId;
  const log = [...bundle.negotiationLog].sort((a, b) => a.roundNo - b.roundNo);
  const isLoopClosed =
    CLOSED_STATUSES.includes(bundle.statusStage) ||
    log.some((r) =>
      r.kind === NegotiationKind.ACCEPT || r.kind === NegotiationKind.DECLINE
    );

  const headroom = computeNegotiationHeadroom(bundle, escalations);
  const { latestAsk, effectiveAuthority, isWithinAuthority, overByPct, activeOverride } = headroom;

  const canAccept = canAcceptNegotiation(role, salesLevel);

  // Repricing notice: published actuary task not yet logged as INSURER round
  const tasks = getTasksForRfq(rfqId);
  const publishedTask = tasks.find(
    (t) => t.kind === HandoffKind.ACTUARY && t.status === HandoffStatus.PUBLISHED
  );
  const hasLoggedPublished = publishedTask
    ? log.some(
        (r) =>
          r.party === NegotiationParty.INSURER &&
          r.kind === NegotiationKind.COUNTER &&
          r.versionId === publishedTask.versionId
      )
    : false;
  const showRepricingBanner = !!publishedTask && !hasLoggedPublished;

  const repricingVersion = publishedTask
    ? bundle.quoteVersions.find((v) => v.id === publishedTask.versionId)
    : null;

  // Escalations for the active version
  const versionEscalations = escalations.filter(
    (e) =>
      e.rfqId === rfqId &&
      e.versionId === bundle.activeVersionId &&
      e.kind === EscalationKind.EXTRA_DISCOUNT
  );
  const pendingEsc = versionEscalations.find((e) => e.status === EscalationStatus.PENDING);
  const approvedEsc = versionEscalations.find((e) => e.status === EscalationStatus.APPROVED);
  const rejectedEsc = versionEscalations.find(
    (e) =>
      e.status === EscalationStatus.REJECTED &&
      !versionEscalations.some((x) => x.status === EscalationStatus.PENDING)
  );

  // Check post-close state
  const acceptRound = log.find((r) => r.kind === NegotiationKind.ACCEPT);
  const declineRound = log.find((r) => r.kind === NegotiationKind.DECLINE);

  // ── Handlers ────────────────────────────────────────────────────────────────

  async function handleLogRepricingReturn() {
    if (!publishedTask || !bundle) return;
    const nextRoundNo = (log[log.length - 1]?.roundNo ?? 0) + 1;
    const newRound: NegotiationRound = {
      roundNo: nextRoundNo,
      party: NegotiationParty.INSURER,
      kind: NegotiationKind.COUNTER,
      versionId: publishedTask.versionId,
      askDiscountPct: publishedTask.publishedDiscountPct ?? undefined,
      askPremium: publishedTask.publishedPremium ?? undefined,
      note: publishedTask.publishedNote ?? 'Actuary repricing return',
      by: userName,
      at: new Date().toISOString(),
    };
    setSaving(true);
    try {
      const patch: Partial<typeof bundle> = {
        negotiationLog: [...bundle.negotiationLog, newRound],
      };
      if (bundle.statusStage === RfqStatus.SHARED) {
        await advanceRfqStatus(rfqId, RfqStatus.NEGOTIATION);
      }
      await updateRfq(rfqId, patch);
      await refetch();
    } finally {
      setSaving(false);
    }
  }

  async function handleLogBrokerCounter() {
    if (!askDiscountPct && !askPremium) return;
    const nextRoundNo = (log[log.length - 1]?.roundNo ?? 0) + 1;
    const newRound: NegotiationRound = {
      roundNo: nextRoundNo,
      party: NegotiationParty.BROKER,
      kind: NegotiationKind.COUNTER,
      versionId: selectedVersionId,
      askDiscountPct: askDiscountPct ? Number(askDiscountPct) : undefined,
      askPremium: askPremium ? Number(askPremium) : undefined,
      note: counterNote || undefined,
      by: userName,
      at: new Date().toISOString(),
    };
    setSaving(true);
    try {
      const b = bundle!;
      const patch = {
        negotiationLog: [...b.negotiationLog, newRound],
      };
      if (b.statusStage === RfqStatus.SHARED) {
        await advanceRfqStatus(rfqId, RfqStatus.NEGOTIATION);
      }
      await updateRfq(rfqId, patch);
      await refetch();
      setAskDiscountPct('');
      setAskPremium('');
      setCounterNote('');
    } finally {
      setSaving(false);
    }
  }

  async function handleSendCounter() {
    const val = Number(counterPct);
    if (!val) return;
    if (val > effectiveAuthority) {
      setCounterError(`Cap is ${effectiveAuthority}% — you cannot counter above this`);
      return;
    }
    setCounterError('');
    const nextRoundNo = (log[log.length - 1]?.roundNo ?? 0) + 1;
    const newRound: NegotiationRound = {
      roundNo: nextRoundNo,
      party: NegotiationParty.INSURER,
      kind: NegotiationKind.COUNTER,
      versionId: bundle!.activeVersionId,
      askDiscountPct: val,
      note: counterCounterNote || undefined,
      by: userName,
      at: new Date().toISOString(),
    };
    setSaving(true);
    try {
      await updateRfq(rfqId, { negotiationLog: [...bundle!.negotiationLog, newRound] });
      await refetch();
      setCounterPct('');
      setCounterCounterNote('');
    } finally {
      setSaving(false);
    }
  }

  function handleRaiseEscalation() {
    raise({
      kind: EscalationKind.EXTRA_DISCOUNT,
      rfqId,
      versionId: bundle!.activeVersionId,
      subject: `Negotiation override — ${latestAsk}%`,
      askedPct: latestAsk ?? 0,
      bufferPct: bundle!.mphAppetite?.maxDiscountPct ?? 0,
      requestedBy: userName,
      requestedAt: new Date().toISOString(),
    });
  }

  function handleReferActuary() {
    const latestBrokerRound = [...log].reverse().find((r) => r.party === NegotiationParty.BROKER);
    upsertTask({
      taskId: localId(),
      rfqId,
      planId: '',
      versionId: latestBrokerRound?.versionId ?? bundle!.activeVersionId,
      kind: HandoffKind.ACTUARY,
      status: HandoffStatus.REQUESTED,
      reason: 'NEGOTIATION_REPRICE',
      lives: bundle!.members.length,
      slaHours: 48,
      requestedAt: new Date().toISOString(),
    });
  }

  return (
    <div className="flex flex-col gap-6 p-6 max-w-[960px] mx-auto">
      {/* P-HEADER */}
      <div>
        <h1 className="text-xl font-bold tracking-tight">Negotiation</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Log broker counters, check authority, respond or escalate.
        </p>
      </div>

      {/* (3) CONTEXT STRIP */}
      <div className="rounded-xl border border-border bg-card px-5 py-4 space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Version Context
        </h2>
        <div className="flex flex-wrap gap-3">
          {bundle.quoteVersions.map((v) => {
            const run = bundle.actuaryPricing.byVersion[v.id];
            return (
              <div
                key={v.id}
                className={cn(
                  'rounded-lg border px-4 py-2.5 text-xs',
                  v.id === bundle.activeVersionId
                    ? 'border-primary/40 bg-primary/5'
                    : 'border-border bg-background'
                )}
              >
                <p className="font-semibold">
                  V{v.versionNo} — {v.name}
                  <span className="ml-2 text-[10px] text-muted-foreground font-normal">{v.status}</span>
                </p>
                <p className="text-muted-foreground mt-0.5">
                  {run ? fmt(run.finalPremiumInclGst) : 'Not priced yet'}
                </p>
              </div>
            );
          })}
        </div>
        {bundle.mphAppetite ? (
          <div className="flex flex-wrap gap-4 text-xs border-t border-border/40 pt-3">
            <span><span className="text-muted-foreground">Category: </span>{bundle.mphAppetite.category}</span>
            <span><span className="text-muted-foreground">Max discount: </span><strong>{bundle.mphAppetite.maxDiscountPct}%</strong></span>
            <span><span className="text-muted-foreground">UW band: </span>{bundle.mphAppetite.uwAuthorityBand}</span>
          </div>
        ) : (
          <p className="text-xs text-amber-700 border-t border-border/40 pt-3">
            No appetite on file — all asks require escalation.
          </p>
        )}
      </div>

      {/* (4) REPRICING RETURN-LEG NOTICE */}
      {showRepricingBanner && repricingVersion && publishedTask && (
        <div className="rounded-xl border border-blue-200 bg-blue-50 px-5 py-4 flex items-start justify-between gap-4 flex-wrap">
          <div className="space-y-1">
            <p className="text-sm font-semibold text-blue-900 flex items-center gap-1.5">
              <RefreshCw className="size-4 shrink-0" />
              Actuary repricing return — {repricingVersion.name}
            </p>
            <div className="flex flex-wrap gap-4 text-xs text-blue-700">
              {publishedTask.publishedPremium != null && (
                <span>Revised premium: <strong>{fmt(publishedTask.publishedPremium)}</strong></span>
              )}
              {publishedTask.publishedDiscountPct != null && (
                <span>Effective discount: <strong>{publishedTask.publishedDiscountPct.toFixed(1)}%</strong></span>
              )}
              {publishedTask.publishedNote && (
                <span className="italic">{publishedTask.publishedNote}</span>
              )}
            </div>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="border-blue-300 text-blue-800 hover:bg-blue-100 shrink-0"
            disabled={saving}
            onClick={handleLogRepricingReturn}
          >
            Log as counter to broker
          </Button>
        </div>
      )}

      {/* (5) ROUNDS TIMELINE */}
      <div className="rounded-xl border border-border bg-card">
        <div className="px-5 py-4 border-b border-border/50">
          <h2 className="text-sm font-semibold">Negotiation Log</h2>
          <p className="text-xs text-muted-foreground mt-0.5">{log.length} round(s)</p>
        </div>
        <div className="px-5 py-4 space-y-3">
          {log.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">
              No rounds yet — log the broker's first counter below.
            </p>
          ) : (
            log.map((round) => {
              const v = bundle.quoteVersions.find((v) => v.id === round.versionId);
              return (
                <RoundCard
                  key={round.roundNo}
                  round={round}
                  versionName={v ? `V${v.versionNo} — ${v.name}` : round.versionId}
                />
              );
            })
          )}
        </div>
      </div>

      {/* (6) LOG BROKER COUNTER */}
      {!isLoopClosed && (
        <div className="rounded-xl border border-border bg-card px-5 py-5 space-y-4">
          <h2 className="text-sm font-semibold">Log Broker Counter</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1 col-span-2 md:col-span-1">
              <label className="text-xs font-medium text-muted-foreground">Version</label>
              <select
                className="w-full text-sm border border-border rounded-lg px-3 py-2 bg-background focus:outline-none focus:ring-1 focus:ring-primary/30"
                value={selectedVersionId}
                onChange={(e) => setVersionIdField(e.target.value)}
              >
                {bundle.quoteVersions.map((v) => (
                  <option key={v.id} value={v.id}>V{v.versionNo} — {v.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Ask Discount (%)</label>
              <Input
                type="number"
                value={askDiscountPct}
                onChange={(e) => setAskDiscountPct(e.target.value)}
                placeholder="e.g. 8.5"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">
                Target Premium (₹) <span className="text-muted-foreground/60">optional</span>
              </label>
              <Input
                type="number"
                value={askPremium}
                onChange={(e) => setAskPremium(e.target.value)}
                placeholder="e.g. 2500000"
              />
            </div>
            <div className="space-y-1 col-span-2">
              <label className="text-xs font-medium text-muted-foreground">Note</label>
              <Input
                value={counterNote}
                onChange={(e) => setCounterNote(e.target.value)}
                placeholder="Context from broker call…"
              />
            </div>
          </div>
          <Button
            size="sm"
            disabled={(!askDiscountPct && !askPremium) || saving}
            onClick={handleLogBrokerCounter}
          >
            Log counter
          </Button>
        </div>
      )}

      {/* (7) HEADROOM READ-BACK */}
      <div className="rounded-xl border border-border bg-card px-5 py-5 space-y-3">
        <h2 className="text-sm font-semibold">Headroom</h2>
        {latestAsk === null ? (
          <p className="text-sm text-muted-foreground italic">No broker counter on the table yet.</p>
        ) : (
          <>
            <div className="flex flex-wrap gap-4 text-xs">
              <div>
                <span className="text-muted-foreground">Broker ask: </span>
                <span className="font-bold tabular-nums">{latestAsk}%</span>
              </div>
              <div>
                <span className="text-muted-foreground">Effective authority: </span>
                <span className="font-bold tabular-nums">{effectiveAuthority}%</span>
                {activeOverride && (
                  <span className="ml-1 text-[10px] text-green-700">(override active)</span>
                )}
              </div>
              {!isWithinAuthority && (
                <div className="text-destructive font-medium">
                  Over by {overByPct.toFixed(1)}%
                </div>
              )}
            </div>
            {/* Visual scale */}
            <div className="relative h-3 rounded-full bg-muted overflow-hidden">
              <div
                className={cn(
                  'absolute left-0 top-0 h-full rounded-full transition-all',
                  isWithinAuthority ? 'bg-green-500' : 'bg-destructive'
                )}
                style={{ width: `${Math.min((latestAsk / Math.max(effectiveAuthority, latestAsk)) * 100, 100)}%` }}
              />
              <div
                className="absolute top-0 h-full w-0.5 bg-foreground/40"
                style={{ left: `${Math.min((effectiveAuthority / Math.max(effectiveAuthority, latestAsk)) * 100, 100)}%` }}
                title={`Authority: ${effectiveAuthority}%`}
              />
            </div>
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>0%</span>
              <span>Authority: {effectiveAuthority}%</span>
              <span>Ask: {latestAsk}%</span>
            </div>
            {isWithinAuthority ? (
              <div className="flex items-center gap-1.5 text-xs text-green-700">
                <CheckCircle2 className="size-3.5" /> Within sales authority
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-xs text-destructive">
                <AlertTriangle className="size-3.5" />
                Beyond authority — over by {overByPct.toFixed(1)}%
              </div>
            )}
          </>
        )}
      </div>

      {/* (8) RESPONSE / ESCALATION */}
      {!isLoopClosed && latestAsk !== null && (
        <div className="rounded-xl border border-border bg-card px-5 py-5 space-y-4">
          <h2 className="text-sm font-semibold">Respond</h2>

          {isWithinAuthority ? (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">
                You can counter up to{' '}
                <strong>{effectiveAuthority}%</strong>
                {activeOverride && (
                  <span className="ml-1 text-green-700">
                    (override active — approved up to {activeOverride.askedPct}% by {activeOverride.decidedBy})
                  </span>
                )}
                .
              </p>
              <div className="flex gap-3 items-end flex-wrap">
                <div className="space-y-1 flex-1 min-w-[160px]">
                  <label className="text-xs font-medium text-muted-foreground">Counter Discount (%)</label>
                  <Input
                    type="number"
                    value={counterPct}
                    onChange={(e) => { setCounterPct(e.target.value); setCounterError(''); }}
                    placeholder={`max ${effectiveAuthority}%`}
                  />
                  {counterError && (
                    <p className="text-[10px] text-destructive">{counterError}</p>
                  )}
                </div>
                <div className="space-y-1 flex-1 min-w-[160px]">
                  <label className="text-xs font-medium text-muted-foreground">Note</label>
                  <Input
                    value={counterCounterNote}
                    onChange={(e) => setCounterCounterNote(e.target.value)}
                    placeholder="Optional note…"
                  />
                </div>
                <Button
                  size="sm"
                  disabled={!counterPct || saving}
                  onClick={handleSendCounter}
                >
                  Send counter
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Option A — Escalation */}
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 space-y-2">
                <p className="text-xs font-semibold text-amber-800">A — Request supervisor override</p>
                {pendingEsc ? (
                  <div className="flex items-center gap-1.5 text-xs text-amber-700">
                    <Clock className="size-3.5 shrink-0" />
                    Pending — with supervisor ({pendingEsc.askedPct}%)
                  </div>
                ) : approvedEsc ? (
                  <div className="flex items-center gap-1.5 text-xs text-green-700">
                    <Shield className="size-3.5 shrink-0" />
                    Override approved up to {approvedEsc.askedPct}% by {approvedEsc.decidedBy}
                    <span className="ml-1 text-muted-foreground text-[10px]">
                      (effective authority has widened — use the respond section)
                    </span>
                  </div>
                ) : rejectedEsc ? (
                  <div className="space-y-2">
                    <p className="text-xs text-destructive">{rejectedEsc.decisionNote ?? 'Request rejected'}</p>
                    <Button size="sm" variant="outline" className="text-xs" onClick={handleRaiseEscalation}>
                      Request again
                    </Button>
                  </div>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs border-amber-300 text-amber-800 hover:bg-amber-100"
                    onClick={handleRaiseEscalation}
                  >
                    Request supervisor override for {latestAsk}%
                  </Button>
                )}
                {/* Higher override button */}
                {approvedEsc && latestAsk !== null && latestAsk > (approvedEsc.askedPct ?? 0) && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs"
                    onClick={handleRaiseEscalation}
                  >
                    Request higher override ({latestAsk}%)
                  </Button>
                )}
              </div>

              {/* Option B — Refer to actuary */}
              <div className="rounded-lg border border-violet-200 bg-violet-50 px-4 py-3 space-y-2">
                <p className="text-xs font-semibold text-violet-800">B — Refer to actuary for repricing</p>
                <p className="text-[11px] text-violet-700">
                  Send the broker's ask to the actuary desk for a revised pricing run.
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs border-violet-300 text-violet-800 hover:bg-violet-100"
                  onClick={handleReferActuary}
                >
                  Refer to actuary for repricing
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* (9) CLOSE-OUT ACTIONS */}
      {!isLoopClosed ? (
        <div className="rounded-xl border border-border bg-card px-5 py-5 space-y-3">
          <h2 className="text-sm font-semibold">Close Out</h2>
          <div className="flex flex-wrap gap-3">
            <div className="flex flex-col gap-1">
              <Button
                variant="default"
                className="bg-green-600 hover:bg-green-700"
                disabled={!canAccept || !isWithinAuthority || latestAsk === null}
                onClick={() => router.push(`/rfqs/${rfqId}/negotiation/accept`)}
              >
                <CheckCircle2 className="size-4 mr-1.5" /> Accept & align
              </Button>
              {!canAccept && (
                <p className="text-[10px] text-muted-foreground">Requires SALES L2+</p>
              )}
              {canAccept && !isWithinAuthority && latestAsk !== null && (
                <p className="text-[10px] text-muted-foreground">Ask exceeds authority</p>
              )}
              {canAccept && latestAsk === null && (
                <p className="text-[10px] text-muted-foreground">No broker ask on the table</p>
              )}
            </div>
            <Button
              variant="outline"
              className="border-destructive/40 text-destructive hover:bg-destructive/5"
              onClick={() => router.push(`/rfqs/${rfqId}/negotiation/decline`)}
            >
              <XCircle className="size-4 mr-1.5" /> Broker declined — close
            </Button>
          </div>
        </div>
      ) : acceptRound ? (
        <div className="rounded-xl border border-green-200 bg-green-50 px-5 py-4 space-y-2">
          <div className="flex items-center gap-2 text-green-800 font-semibold text-sm">
            <CheckCircle2 className="size-4" /> Deal aligned — version marked SELECTED
          </div>
          <p className="text-xs text-green-700">
            Freeze the version on Quote Versions to unlock policy creation.
          </p>
          <Button
            size="sm"
            variant="outline"
            className="border-green-300 text-green-800 hover:bg-green-100"
            onClick={() => router.push(`/rfqs/${rfqId}/versions`)}
          >
            Go to Versions <ArrowRight className="size-3.5 ml-1" />
          </Button>
        </div>
      ) : declineRound ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-5 py-4 space-y-2">
          <div className="flex items-center gap-2 text-destructive font-semibold text-sm">
            <Lock className="size-4" /> Deal closed — RFQ marked REJECTED
          </div>
          <p className="text-xs text-muted-foreground">The negotiation loop is closed.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-muted/30 px-5 py-4">
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <Lock className="size-4" /> Negotiation loop is closed.
          </div>
        </div>
      )}
    </div>
  );
}

