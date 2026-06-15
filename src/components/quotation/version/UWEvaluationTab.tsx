'use client';

/**
 * UWEvaluationTab
 *
 * UW status card, Run UW Check action, Escalation modal,
 * and Round History timeline.
 */

import { useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  FileText,
  Loader2,
  Send,
  Shield,
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
  QuoteVersion,
  QuoteVersionStatus,
  Round,
} from '@/types/group-pas/quotation-v2';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface UWEvaluationTabProps {
  version: QuoteVersion;
  onStatusChange: (status: QuoteVersionStatus) => void;
  onAddRound: (round: Round) => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function fmtMoney(amount: number) {
  return `₹${amount.toLocaleString('en-IN')}`;
}

function PlanFCLNML({ plans }: { plans: PlanV2[] }) {
  if (plans.length === 0) return null;
  return (
    <div className="mt-3 overflow-hidden rounded-lg border">
      <table className="min-w-full text-xs">
        <thead className="bg-muted/60">
          <tr>
            <th className="px-3 py-2 text-left font-medium text-muted-foreground">Plan</th>
            <th className="px-3 py-2 text-right font-medium text-muted-foreground">FCL</th>
            <th className="px-3 py-2 text-right font-medium text-muted-foreground">NML</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {plans.map((plan) => {
            const fcl = plan.plan_definition.fcl.amount?.amount ?? 0;
            const nml = plan.plan_definition.nml.amount?.amount ?? 0;
            return (
              <tr key={plan.plan_id} className="bg-background">
                <td className="px-3 py-2 font-medium">{plan.plan_name}</td>
                <td className="px-3 py-2 text-right tabular-nums">{fmtMoney(fcl)}</td>
                <td className="px-3 py-2 text-right tabular-nums">{fmtMoney(nml)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// UW Status card
// ─────────────────────────────────────────────────────────────────────────────

function UWStatusCard({
  version,
  manualRequiredReasons,
}: {
  version: QuoteVersion;
  manualRequiredReasons?: string[];
}) {
  const { status, uw_path, round_log, plans } = version;
  const uwRounds = round_log.filter((r) => r.roundKind === 'UW');
  const lastUW = uwRounds[uwRounds.length - 1] ?? null;

  // AUTO or MANUAL approved
  if (status !== 'DRAFT' && status !== 'REFERRED_MANUAL_UW' && !manualRequiredReasons?.length) {
    if (uw_path === 'AUTO') {
      return (
        <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
          <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-600" />
          <div className="flex-1">
            <p className="font-semibold text-emerald-800">UW Auto-Approved</p>
            <p className="mt-0.5 text-xs text-emerald-700">
              All members cleared FCL thresholds. No manual underwriting required.
            </p>
            <PlanFCLNML plans={plans} />
          </div>
        </div>
      );
    }
    if (uw_path === 'MANUAL' && lastUW?.outcome === 'APPROVED') {
      return (
        <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
          <Shield className="mt-0.5 size-5 shrink-0 text-emerald-600" />
          <div className="flex-1">
            <p className="font-semibold text-emerald-800">UW Manually Approved</p>
            <p className="mt-0.5 text-xs text-emerald-700">
              Approved by{' '}
              <span className="font-medium">{lastUW.assignedToName}</span> on Round{' '}
              {lastUW.roundNumber}
              {lastUW.completedAt && ` · ${formatDateTime(lastUW.completedAt)}`}
            </p>
            {lastUW.remarks && (
              <p className="mt-1 rounded bg-emerald-100 px-2 py-1 text-xs italic text-emerald-700">
                "{lastUW.remarks}"
              </p>
            )}
            <PlanFCLNML plans={plans} />
          </div>
        </div>
      );
    }
  }

  // Referred — pending
  if (status === 'REFERRED_MANUAL_UW') {
    const pendingRound = uwRounds.find((r) => !r.completedAt) ?? lastUW;
    return (
      <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
        <Clock className="mt-0.5 size-5 shrink-0 text-amber-600" />
        <div className="flex-1">
          <p className="font-semibold text-amber-800">
            Referral Pending — Round {pendingRound?.roundNumber ?? 1}
          </p>
          <p className="mt-0.5 text-xs text-amber-700">
            Assigned to{' '}
            <span className="font-medium">{pendingRound?.assignedToName ?? 'Underwriter'}</span>
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
  if (lastUW?.outcome === 'REJECTED') {
    return (
      <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
        <XCircle className="mt-0.5 size-5 shrink-0 text-red-600" />
        <div className="flex-1">
          <p className="font-semibold text-red-800">
            Last Round Rejected — Round {lastUW.roundNumber}
          </p>
          <p className="mt-0.5 text-xs text-red-700">
            Reviewed by <span className="font-medium">{lastUW.assignedToName}</span>
            {lastUW.completedAt && ` · ${formatDateTime(lastUW.completedAt)}`}
          </p>
          {lastUW.remarks && (
            <p className="mt-1 rounded bg-red-100 px-2 py-1 text-xs italic text-red-700">
              "{lastUW.remarks}"
            </p>
          )}
          <p className="mt-2 text-xs text-red-700">
            Address the issues above and re-submit for a new UW review.
          </p>
        </div>
      </div>
    );
  }

  // Manual-required result from simulation
  if (manualRequiredReasons && manualRequiredReasons.length > 0) {
    return (
      <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
        <AlertTriangle className="mt-0.5 size-5 shrink-0 text-amber-600" />
        <div className="flex-1">
          <p className="font-semibold text-amber-800">Manual UW Required</p>
          <p className="mt-0.5 text-xs text-amber-700">
            The automated check could not auto-approve this version. Reasons:
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

  // Default: DRAFT, no UW yet
  return (
    <div className="flex items-start gap-3 rounded-xl border bg-muted/30 p-4">
      <Shield className="mt-0.5 size-5 shrink-0 text-muted-foreground/50" />
      <div>
        <p className="font-medium text-muted-foreground">UW not yet evaluated</p>
        <p className="mt-0.5 text-xs text-muted-foreground/70">
          Configure plans and census data, then run the UW check.
        </p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Escalation modal
// ─────────────────────────────────────────────────────────────────────────────

function EscalationModal({
  open,
  onClose,
  onConfirm,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: (comment: string) => void;
}) {
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleConfirm() {
    setLoading(true);
    await new Promise((r) => setTimeout(r, 600));
    setLoading(false);
    onConfirm(comment);
    setComment('');
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Request Manual UW Review</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3 py-2">
          <p className="text-sm text-muted-foreground">
            This version will be sent to the UW Queue. An underwriter will review the FCL/NML
            values and member distribution.
          </p>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">
              Request comment (optional)
            </label>
            <Textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
              placeholder="What should the underwriter consider? Any specific concerns?"
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
              <Loader2 className="mr-2 size-4 animate-spin" />
            ) : (
              <Send className="mr-2 size-4" />
            )}
            Send to UW Queue
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Round card
// ─────────────────────────────────────────────────────────────────────────────

function RoundCard({ round }: { round: Round }) {
  const [expanded, setExpanded] = useState(true);

  const borderColor =
    !round.outcome
      ? 'border-l-amber-400'
      : round.outcome === 'APPROVED'
      ? 'border-l-emerald-500'
      : 'border-l-red-500';

  const outcomeVariant: 'warning' | 'success' | 'destructive' | 'secondary' = !round.outcome
    ? 'warning'
    : round.outcome === 'APPROVED'
    ? 'success'
    : 'destructive';

  return (
    <div className={`rounded-lg border border-l-4 bg-background ${borderColor}`}>
      {/* Header */}
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
          <span className="text-xs text-muted-foreground">
            {round.assignedToName}
          </span>
          {expanded ? (
            <ChevronDown className="size-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="size-4 text-muted-foreground" />
          )}
        </div>
      </button>

      {/* Body */}
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
            <div className="mt-3">
              <p className="mb-1 text-xs font-medium text-muted-foreground">
                Parameter overrides
              </p>
              <div className="overflow-hidden rounded border">
                <table className="min-w-full text-xs">
                  <thead className="bg-muted/60">
                    <tr>
                      <th className="px-2 py-1.5 text-left font-medium text-muted-foreground">
                        Parameter
                      </th>
                      <th className="px-2 py-1.5 text-right font-medium text-muted-foreground">
                        Original
                      </th>
                      <th className="px-2 py-1.5 text-right font-medium text-muted-foreground">
                        Override
                      </th>
                      <th className="px-2 py-1.5 text-left font-medium text-muted-foreground">
                        Reason
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {round.parameterOverrides.map((o) => (
                      <tr key={o.parameterId} className="bg-background">
                        <td className="px-2 py-1.5">{o.parameterName}</td>
                        <td className="px-2 py-1.5 text-right tabular-nums text-muted-foreground">
                          {String(o.originalValue)}
                        </td>
                        <td className="px-2 py-1.5 text-right tabular-nums font-medium">
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
          )}

          {/* Attached documents */}
          {round.roundId && (
            <AttachedDocRefs roundId={round.roundId} />
          )}
        </div>
      )}
    </div>
  );
}

function AttachedDocRefs({ roundId }: { roundId: string }) {
  // In a real system this would filter version.attached_documents by round ref.
  // For now this is a placeholder stub.
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Round history
// ─────────────────────────────────────────────────────────────────────────────

function RoundHistory({ rounds }: { rounds: Round[] }) {
  const uwRounds = rounds.filter((r) => r.roundKind === 'UW');
  if (uwRounds.length === 0) return null;

  return (
    <div>
      <p className="mb-3 text-sm font-semibold">Round History</p>
      <div className="flex flex-col gap-3">
        {uwRounds.map((round) => (
          <RoundCard key={round.roundId} round={round} />
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Simulation logic (mock)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns null for auto-approve, or a list of reason strings for manual required.
 * Uses hazard band as the deciding factor (HIGH/VERY_HIGH → manual).
 */
function simulateUWCheck(version: QuoteVersion): string[] | null {
  const hazard = version.aggregate_census.industryHazardBand;
  if (hazard === 'HIGH' || hazard === 'VERY_HIGH') {
    return [
      `Industry hazard band is ${hazard} — requires manual underwriter sign-off.`,
      'Members above NML exceed 10% of headcount.',
    ];
  }
  return null; // auto-approve
}

// ─────────────────────────────────────────────────────────────────────────────
// UWEvaluationTab (exported)
// ─────────────────────────────────────────────────────────────────────────────

export function UWEvaluationTab({
  version,
  onStatusChange,
  onAddRound,
}: UWEvaluationTabProps) {
  const [running, setRunning] = useState(false);
  const [manualReasons, setManualReasons] = useState<string[] | null>(null);
  const [escalationOpen, setEscalationOpen] = useState(false);
  const [toast, setToast] = useState<{ kind: 'success' | 'error'; message: string } | null>(null);

  const { status, plans, aggregate_census } = version;
  const isDraft = status === 'DRAFT';
  const isReferred = status === 'REFERRED_MANUAL_UW';
  const hasPlans = plans.length > 0;
  const hasCensus = aggregate_census.headcount > 0;
  const canRunCheck = isDraft && hasPlans && hasCensus;

  function showToast(kind: 'success' | 'error', message: string) {
    setToast({ kind, message });
    setTimeout(() => setToast(null), 4000);
  }

  // ── Run UW Check ─────────────────────────────────────────────────────────
  async function handleRunCheck() {
    setRunning(true);
    setManualReasons(null);
    // Simulate 1.5s RE call
    await new Promise((r) => setTimeout(r, 1500));
    const reasons = simulateUWCheck(version);
    setRunning(false);

    if (!reasons) {
      // Auto-approve
      const now = new Date().toISOString();
      const round: Round = {
        roundId: `RND-UW-AUTO-${Date.now()}`,
        roundKind: 'UW',
        roundNumber: version.round_log.filter((r) => r.roundKind === 'UW').length + 1,
        assignedTo: 'system',
        assignedToName: 'Rule Engine',
        assignedAt: now,
        completedAt: now,
        outcome: 'APPROVED',
        remarks: 'All members within FCL thresholds. Auto-approved by Rule Engine.',
        parameterOverrides: [],
      };
      onAddRound(round);
      onStatusChange('EVALUATED');
      showToast('success', 'UW auto-approved. Version moved to Evaluated.');
    } else {
      setManualReasons(reasons);
    }
  }

  // ── Escalate to UW ───────────────────────────────────────────────────────
  function handleEscalate(comment: string) {
    const now = new Date().toISOString();
    const round: Round = {
      roundId: `RND-UW-MAN-${Date.now()}`,
      roundKind: 'UW',
      roundNumber: version.round_log.filter((r) => r.roundKind === 'UW').length + 1,
      assignedTo: 'usr-uw-001',
      assignedToName: 'Jordan Lee',
      assignedAt: now,
      remarks: comment || 'Sales escalation — manual review requested.',
      parameterOverrides: [],
    };
    onAddRound(round);
    onStatusChange('REFERRED_MANUAL_UW');
    setEscalationOpen(false);
    setManualReasons(null);
    showToast('success', 'Version sent to UW Queue. Status: Referred — Manual UW.');
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

      {/* UW status card */}
      <UWStatusCard version={version} manualRequiredReasons={manualReasons ?? undefined} />

      {/* Actions */}
      {isDraft && (
        <div className="flex flex-wrap items-center gap-3">
          <Button
            size="sm"
            disabled={!canRunCheck || running}
            onClick={handleRunCheck}
            title={
              !hasPlans
                ? 'Configure at least one plan first'
                : !hasCensus
                ? 'Set census data first'
                : undefined
            }
          >
            {running ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Running UW Check…
              </>
            ) : (
              'Run UW Check'
            )}
          </Button>

          {(manualReasons || isDraft) && (
            <Button
              size="sm"
              variant="outline"
              disabled={running}
              onClick={() => setEscalationOpen(true)}
            >
              <Send className="mr-1.5 size-3.5" />
              Escalate to Underwriter
            </Button>
          )}

          {!canRunCheck && (
            <p className="text-xs text-muted-foreground">
              {!hasPlans
                ? 'Add plans before running UW check.'
                : 'Set census data before running UW check.'}
            </p>
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
      {version.round_log.some((r) => r.roundKind === 'UW') && (
        <>
          <Separator />
          <RoundHistory rounds={version.round_log} />
        </>
      )}
    </div>
  );
}
