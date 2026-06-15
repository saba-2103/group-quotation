'use client';

/**
 * PricingTab
 *
 * Pricing status card, "Request Pricing" action, escalation modal,
 * and Pricing Round History timeline.
 *
 * Mirrors UWEvaluationTab in structure, but targets PRICING rounds and
 * the EVALUATED → RATED / REFERRED_MANUAL_PRICING state machine.
 */

import { useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  Loader2,
  Send,
  TrendingUp,
  XCircle,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { formatDateTime } from '@/components/quotation/quoteHelpers';
import type {
  PlanV2,
  PricingPath,
  QuoteVersion,
  QuoteVersionStatus,
  Round,
} from '@/types/group-pas/quotation-v2';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface PricingTabProps {
  version: QuoteVersion;
  onStatusChange: (status: QuoteVersionStatus) => void;
  onPricingPathChange: (path: PricingPath) => void;
  onAddRound: (round: Round) => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Rate card summary table
// ─────────────────────────────────────────────────────────────────────────────

function RateCardSummary({ plans }: { plans: PlanV2[] }) {
  if (plans.length === 0) return null;
  return (
    <div className="mt-3 overflow-hidden rounded-lg border">
      <table className="min-w-full text-xs">
        <thead className="bg-muted/60">
          <tr>
            <th className="px-3 py-2 text-left font-medium text-muted-foreground">Plan</th>
            <th className="px-3 py-2 text-left font-medium text-muted-foreground">Rate Card</th>
            <th className="px-3 py-2 text-left font-medium text-muted-foreground">Effective</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {plans.map((plan) => {
            const rc = plan.plan_definition.rate_card;
            return (
              <tr key={plan.plan_id} className="bg-background">
                <td className="px-3 py-2 font-medium">{plan.plan_name}</td>
                <td className="px-3 py-2 font-mono text-muted-foreground">{rc.rateCardName}</td>
                <td className="px-3 py-2 text-muted-foreground">{rc.effectiveFrom}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Pricing Status card
// ─────────────────────────────────────────────────────────────────────────────

function PricingStatusCard({
  version,
  manualRequiredReasons,
}: {
  version: QuoteVersion;
  manualRequiredReasons?: string[];
}) {
  const { status, pricing_path, round_log, plans } = version;
  const pricingRounds = round_log.filter((r) => r.roundKind === 'PRICING');
  const lastPricing = pricingRounds[pricingRounds.length - 1] ?? null;

  // Auto-rated
  if (
    status === 'RATED' &&
    pricing_path === 'AUTO' &&
    !(manualRequiredReasons?.length)
  ) {
    return (
      <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
        <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-600" />
        <div className="flex-1">
          <p className="font-semibold text-emerald-800">Pricing Auto-Rated</p>
          <p className="mt-0.5 text-xs text-emerald-700">
            Rate card validated by the Rule Engine. Premium can now be calculated.
          </p>
          <RateCardSummary plans={plans} />
        </div>
      </div>
    );
  }

  // Manually approved by actuary
  if (
    (status === 'RATED' || status !== 'REFERRED_MANUAL_PRICING') &&
    pricing_path === 'MANUAL' &&
    lastPricing?.outcome === 'APPROVED' &&
    !(manualRequiredReasons?.length)
  ) {
    return (
      <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
        <TrendingUp className="mt-0.5 size-5 shrink-0 text-emerald-600" />
        <div className="flex-1">
          <p className="font-semibold text-emerald-800">Pricing Approved by Actuary</p>
          <p className="mt-0.5 text-xs text-emerald-700">
            Approved by{' '}
            <span className="font-medium">{lastPricing.assignedToName}</span> on Round{' '}
            {lastPricing.roundNumber}
            {lastPricing.completedAt && ` · ${formatDateTime(lastPricing.completedAt)}`}
          </p>
          {lastPricing.remarks && (
            <p className="mt-1 rounded bg-emerald-100 px-2 py-1 text-xs italic text-emerald-700">
              "{lastPricing.remarks}"
            </p>
          )}
          <RateCardSummary plans={plans} />
        </div>
      </div>
    );
  }

  // Referred — pending actuary
  if (status === 'REFERRED_MANUAL_PRICING') {
    const pendingRound = pricingRounds.find((r) => !r.completedAt) ?? lastPricing;
    return (
      <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
        <Clock className="mt-0.5 size-5 shrink-0 text-amber-600" />
        <div className="flex-1">
          <p className="font-semibold text-amber-800">
            Actuary Review Pending — Round {pendingRound?.roundNumber ?? 1}
          </p>
          <p className="mt-0.5 text-xs text-amber-700">
            Assigned to{' '}
            <span className="font-medium">
              {pendingRound?.assignedToName ?? 'Actuary'}
            </span>
            {pendingRound?.assignedAt && ` · ${formatDateTime(pendingRound.assignedAt)}`}
          </p>
          {pendingRound?.remarks && (
            <p className="mt-1 rounded bg-amber-100 px-2 py-1 text-xs italic text-amber-700">
              "{pendingRound.remarks}"
            </p>
          )}
        </div>
      </div>
    );
  }

  // Last round rejected
  if (lastPricing?.outcome === 'REJECTED') {
    return (
      <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
        <XCircle className="mt-0.5 size-5 shrink-0 text-red-600" />
        <div className="flex-1">
          <p className="font-semibold text-red-800">
            Last Round Rejected — Round {lastPricing.roundNumber}
          </p>
          <p className="mt-0.5 text-xs text-red-700">
            Reviewed by{' '}
            <span className="font-medium">{lastPricing.assignedToName}</span>
            {lastPricing.completedAt && ` · ${formatDateTime(lastPricing.completedAt)}`}
          </p>
          {lastPricing.remarks && (
            <p className="mt-1 rounded bg-red-100 px-2 py-1 text-xs italic text-red-700">
              "{lastPricing.remarks}"
            </p>
          )}
          <p className="mt-2 text-xs text-red-700">
            Revise the rate card configuration and re-request pricing.
          </p>
        </div>
      </div>
    );
  }

  // Manual required result from simulation
  if (manualRequiredReasons && manualRequiredReasons.length > 0) {
    return (
      <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
        <AlertTriangle className="mt-0.5 size-5 shrink-0 text-amber-600" />
        <div className="flex-1">
          <p className="font-semibold text-amber-800">Manual Actuary Pricing Required</p>
          <p className="mt-0.5 text-xs text-amber-700">
            The Rule Engine could not auto-validate the rate card. Reasons:
          </p>
          <ul className="mt-1.5 list-disc pl-4 text-xs text-amber-700">
            {manualRequiredReasons.map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </ul>
        </div>
      </div>
    );
  }

  // Default: EVALUATED, no pricing yet
  return (
    <div className="flex items-start gap-3 rounded-xl border bg-muted/30 p-4">
      <TrendingUp className="mt-0.5 size-5 shrink-0 text-muted-foreground/50" />
      <div>
        <p className="font-medium text-muted-foreground">Pricing not yet evaluated</p>
        <p className="mt-0.5 text-xs text-muted-foreground/70">
          UW evaluation must be complete. Then request pricing to validate the rate card.
        </p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Escalation modal
// ─────────────────────────────────────────────────────────────────────────────

interface EscalationModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (comment: string, outcome: 'AUTO' | 'MANUAL') => void;
}

function EscalationModal({ open, onClose, onConfirm }: EscalationModalProps) {
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleConfirm() {
    setLoading(true);
    // Simulate RE re-check (1s)
    await new Promise((r) => setTimeout(r, 1000));
    setLoading(false);
    // Mock: auto-approve when no specific trigger (in real system RE decides)
    const outcome: 'AUTO' | 'MANUAL' = 'MANUAL';
    onConfirm(comment, outcome);
    setComment('');
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Request Actuary Pricing Review</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3 py-2">
          <div className="flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
            <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
            <span>
              RE will first re-validate the rate card. If within auto-bounds, no actuary
              round will open and the version will be rated automatically.
            </span>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">
              Request comment (optional)
            </label>
            <Textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
              placeholder="Any context for the actuary? Special rate considerations?"
              className="text-sm"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" size="sm" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleConfirm} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                RE checking…
              </>
            ) : (
              <>
                <Send className="mr-2 size-4" />
                Send to Actuary Queue
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Rate card diff (before vs after actuary revision)
// ─────────────────────────────────────────────────────────────────────────────

function RateCardDiff({
  overrides,
}: {
  overrides: NonNullable<Round['parameterOverrides']>;
}) {
  if (overrides.length === 0) return null;
  return (
    <div className="mt-3">
      <p className="mb-1 text-xs font-medium text-muted-foreground">
        Rate card revisions by actuary
      </p>
      <div className="overflow-hidden rounded border">
        <table className="min-w-full text-xs">
          <thead className="bg-muted/60">
            <tr>
              <th className="px-2 py-1.5 text-left font-medium text-muted-foreground">
                Parameter
              </th>
              <th className="px-2 py-1.5 text-right font-medium text-muted-foreground">
                Before
              </th>
              <th className="px-2 py-1.5 text-right font-medium text-muted-foreground">
                After
              </th>
              <th className="px-2 py-1.5 text-left font-medium text-muted-foreground">
                Reason
              </th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {overrides.map((o) => (
              <tr key={o.parameterId} className="bg-background">
                <td className="px-2 py-1.5">{o.parameterName}</td>
                <td className="px-2 py-1.5 text-right tabular-nums text-muted-foreground line-through">
                  {String(o.originalValue)}
                </td>
                <td className="px-2 py-1.5 text-right tabular-nums font-medium text-emerald-700">
                  {String(o.overrideValue)}
                </td>
                <td className="px-2 py-1.5 text-muted-foreground">
                  {o.overrideReason ?? '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Round card
// ─────────────────────────────────────────────────────────────────────────────

function PricingRoundCard({ round }: { round: Round }) {
  const [expanded, setExpanded] = useState(true);

  const borderColor = !round.outcome
    ? 'border-l-amber-400'
    : round.outcome === 'APPROVED'
    ? 'border-l-emerald-500'
    : 'border-l-red-500';

  const outcomeVariant: 'warning' | 'success' | 'destructive' = !round.outcome
    ? 'warning'
    : round.outcome === 'APPROVED'
    ? 'success'
    : 'destructive';

  return (
    <div className={`rounded-lg border border-l-4 bg-background ${borderColor}`}>
      <button
        className="flex w-full items-center justify-between px-4 py-3"
        onClick={() => setExpanded((p) => !p)}
      >
        <div className="flex items-center gap-3">
          <span className="font-mono text-xs font-semibold text-muted-foreground">
            Round {round.roundNumber}
          </span>
          <Badge variant={outcomeVariant} className="text-[10px]">
            {round.outcome ?? 'PENDING'}
          </Badge>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground">{round.assignedToName}</span>
          {expanded ? (
            <ChevronDown className="size-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="size-4 text-muted-foreground" />
          )}
        </div>
      </button>

      {expanded && (
        <div className="border-t px-4 py-3">
          <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-xs">
            <div>
              <dt className="text-muted-foreground">Assigned to</dt>
              <dd className="font-medium">{round.assignedToName}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Requested at</dt>
              <dd className="font-medium">{formatDateTime(round.assignedAt)}</dd>
            </div>
            {round.completedAt && (
              <div>
                <dt className="text-muted-foreground">Responded at</dt>
                <dd className="font-medium">{formatDateTime(round.completedAt)}</dd>
              </div>
            )}
            {round.outcome && (
              <div>
                <dt className="text-muted-foreground">Outcome</dt>
                <dd>
                  <Badge variant={outcomeVariant} className="text-[10px]">
                    {round.outcome}
                  </Badge>
                </dd>
              </div>
            )}
          </dl>

          {round.remarks && (
            <div className="mt-3">
              <p className="text-xs font-medium text-muted-foreground">Remarks</p>
              <p className="mt-1 rounded bg-muted/50 px-3 py-2 text-xs italic">
                "{round.remarks}"
              </p>
            </div>
          )}

          {round.parameterOverrides && round.parameterOverrides.length > 0 && (
            <RateCardDiff overrides={round.parameterOverrides} />
          )}
        </div>
      )}
    </div>
  );
}

function PricingRoundHistory({ rounds }: { rounds: Round[] }) {
  const pricingRounds = rounds.filter((r) => r.roundKind === 'PRICING');
  if (pricingRounds.length === 0) return null;
  return (
    <div>
      <p className="mb-3 text-sm font-semibold">Round History</p>
      <div className="flex flex-col gap-3">
        {pricingRounds.map((round) => (
          <PricingRoundCard key={round.roundId} round={round} />
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Simulation
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns null for auto-rate, or a list of reason strings when manual actuary needed.
 * Uses a simple rule: if headcount > 5000 → manual.
 */
function simulatePricingCheck(version: QuoteVersion): string[] | null {
  if (version.aggregate_census.headcount > 5000) {
    return [
      'Group headcount exceeds 5,000 — requires actuary rate review.',
      'Loaded benefit factor is above standard corridor.',
    ];
  }
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// PricingTab (exported)
// ─────────────────────────────────────────────────────────────────────────────

export function PricingTab({
  version,
  onStatusChange,
  onPricingPathChange,
  onAddRound,
}: PricingTabProps) {
  const [running, setRunning] = useState(false);
  const [manualReasons, setManualReasons] = useState<string[] | null>(null);
  const [escalationOpen, setEscalationOpen] = useState(false);
  const [toast, setToast] = useState<{ kind: 'success' | 'error'; message: string } | null>(
    null,
  );

  const { status, plans } = version;
  const isEvaluated = status === 'EVALUATED';
  const isReferred = status === 'REFERRED_MANUAL_PRICING';
  const hasPlans = plans.length > 0;
  const canRequestPricing = isEvaluated && hasPlans;

  function showToast(kind: 'success' | 'error', message: string) {
    setToast({ kind, message });
    setTimeout(() => setToast(null), 4000);
  }

  // ── Request Pricing ──────────────────────────────────────────────────────
  async function handleRequestPricing() {
    setRunning(true);
    setManualReasons(null);
    await new Promise((r) => setTimeout(r, 1500));
    const reasons = simulatePricingCheck(version);
    setRunning(false);

    if (!reasons) {
      onPricingPathChange('AUTO');
      onStatusChange('RATED');
      showToast('success', 'Rate card auto-validated. Version moved to Rated.');
    } else {
      setManualReasons(reasons);
    }
  }

  // ── Escalate to actuary ──────────────────────────────────────────────────
  function handleEscalate(comment: string, outcome: 'AUTO' | 'MANUAL') {
    const now = new Date().toISOString();
    if (outcome === 'AUTO') {
      // RE re-validated → auto-rate, no round
      onPricingPathChange('AUTO');
      onStatusChange('RATED');
      setEscalationOpen(false);
      setManualReasons(null);
      showToast('success', 'RE re-validated successfully. Version auto-rated.');
    } else {
      // Open actuary round
      const round: Round = {
        roundId: `RND-PX-MAN-${Date.now()}`,
        roundKind: 'PRICING',
        roundNumber: version.round_log.filter((r) => r.roundKind === 'PRICING').length + 1,
        assignedTo: 'usr-act-001',
        assignedToName: 'Sam Patel',
        assignedAt: now,
        remarks: comment || 'Sales escalation — actuary pricing review requested.',
        parameterOverrides: [],
      };
      onPricingPathChange('MANUAL');
      onAddRound(round);
      onStatusChange('REFERRED_MANUAL_PRICING');
      setEscalationOpen(false);
      setManualReasons(null);
      showToast('success', 'Version sent to Actuary Queue. Status: Actuary Review Pending.');
    }
  }

  return (
    <div className="flex flex-col gap-6 px-6 py-5">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 rounded-lg px-4 py-3 text-sm shadow-lg ${
            toast.kind === 'success'
              ? 'bg-emerald-600 text-white'
              : 'bg-destructive text-destructive-foreground'
          }`}
        >
          {toast.message}
        </div>
      )}

      {/* Status card */}
      <PricingStatusCard version={version} manualRequiredReasons={manualReasons ?? undefined} />

      {/* Actions */}
      {(isEvaluated || isReferred) && (
        <div className="flex flex-wrap items-center gap-3">
          {isEvaluated && (
            <Button
              size="sm"
              disabled={!canRequestPricing || running}
              onClick={handleRequestPricing}
              title={!hasPlans ? 'Configure plans first' : undefined}
            >
              {running ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Requesting Pricing…
                </>
              ) : (
                'Request Pricing'
              )}
            </Button>
          )}

          {(manualReasons || isReferred) && (
            <Button
              size="sm"
              variant="outline"
              disabled={running}
              onClick={() => setEscalationOpen(true)}
            >
              <Send className="mr-1.5 size-3.5" />
              Escalate to Actuary
            </Button>
          )}

          {isEvaluated && !hasPlans && (
            <p className="text-xs text-muted-foreground">Configure plans before requesting pricing.</p>
          )}
        </div>
      )}

      {/* Escalation modal */}
      <EscalationModal
        open={escalationOpen}
        onClose={() => setEscalationOpen(false)}
        onConfirm={handleEscalate}
      />

      {/* Round history */}
      {version.round_log.some((r) => r.roundKind === 'PRICING') && (
        <>
          <Separator />
          <PricingRoundHistory rounds={version.round_log} />
        </>
      )}
    </div>
  );
}
