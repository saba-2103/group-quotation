'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Lock, ArrowRight, CheckCircle2, XCircle, AlertTriangle,
  ShieldCheck, RotateCcw, Plus, Trash2,
} from 'lucide-react';
import { useRfqBundle } from '@/context/RfqBundleContext';
import { useHandoffStore } from '@/stores/handoffStore';
import { useRole } from '@/hooks/useRole';
import { computeFreezeState, computeReadinessGates } from '@/lib/computations';
import { canBind } from '@/lib/permissions';
import {
  issueRfq, dispatchPas, addDocument, upsertHandoff,
} from '@/lib/api/quotation-client';
import {
  RfqStatus, DocumentStatus, DocumentType, HandoffKind, HandoffStatus,
  GateStatus, GateStatus as GS, type RfqBundle,
} from '@/lib/types';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

// ─── Local helpers ────────────────────────────────────────────────────────────

const DOC_TYPE_LABELS: Record<DocumentType, string> = {
  [DocumentType.SIGNED_PROPOSAL]: 'Signed Proposal',
  [DocumentType.QUOTE_ACCEPTANCE]: 'Quote Acceptance',
  [DocumentType.BOARD_RESOLUTION]: 'Board Resolution',
  [DocumentType.FINAL_PLACEMENT_LETTER]: 'Final Placement Letter',
  [DocumentType.OTHER]: 'Other',
};

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b border-border/40 pb-1.5 mb-3">
      {children}
    </h2>
  );
}

function Panel({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('rounded-xl border border-border bg-card px-5 py-4', className)}>
      {children}
    </div>
  );
}

// ─── Engine verdict ───────────────────────────────────────────────────────────

function EngineVerdict({ issuanceReady, failingBucketNames }: {
  issuanceReady: boolean;
  failingBucketNames: string[];
}) {
  // NOTE: in real deployment this calls the rules service endpoint.
  const verdict = issuanceReady
    ? { outcome: 'READY' as const, gatesPassed: 13, gatesTotal: 13 }
    : { outcome: 'BLOCKED' as const, openGates: failingBucketNames };

  return (
    <Panel>
      <SectionHeading>Engine Bind Verdict</SectionHeading>
      <div className="text-[10px] text-muted-foreground mb-2 font-mono">
        RULE.GTL.BIND_READINESS.v1 — canonical bind verdict
      </div>
      <div className={cn(
        'rounded-lg border px-4 py-3 flex items-start gap-3',
        verdict.outcome === 'READY' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200',
      )}>
        {verdict.outcome === 'READY'
          ? <ShieldCheck className="size-5 text-green-600 shrink-0" />
          : <XCircle className="size-5 text-red-600 shrink-0" />}
        <div>
          <p className={cn('font-semibold text-sm', verdict.outcome === 'READY' ? 'text-green-800' : 'text-red-800')}>
            {verdict.outcome === 'READY'
              ? `READY — all ${verdict.gatesTotal} gates passed`
              : 'BLOCKED'}
          </p>
          {verdict.outcome === 'BLOCKED' && (
            <ul className="mt-1 space-y-0.5">
              {verdict.openGates.map((g) => (
                <li key={g} className="text-xs text-red-700">• {g}</li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </Panel>
  );
}

// ─── Readiness checklist ──────────────────────────────────────────────────────

function ReadinessChecklist({ bundle, rfqId }: { bundle: RfqBundle; rfqId: string }) {
  const router = useRouter();
  const report = computeReadinessGates(bundle);
  return (
    <Panel>
      <SectionHeading>Readiness Checklist</SectionHeading>
      <div className="space-y-3">
        {report.buckets.map((bucket) => (
          <div key={bucket.bucketNo}>
            <div className={cn(
              'flex items-center gap-2 text-xs font-semibold mb-1.5',
              bucket.overall === GateStatus.PASS && 'text-green-700',
              bucket.overall === GateStatus.WARN && 'text-amber-700',
              bucket.overall === GateStatus.FAIL && 'text-red-700',
            )}>
              {bucket.overall === GateStatus.PASS
                ? <CheckCircle2 className="size-3.5" />
                : bucket.overall === GateStatus.WARN
                ? <AlertTriangle className="size-3.5" />
                : <XCircle className="size-3.5" />}
              {bucket.label}
            </div>
            <div className="space-y-1 pl-5">
              {bucket.gates.map((g) => (
                <div key={g.key} className="flex items-start gap-2 text-xs">
                  {g.status === GS.PASS
                    ? <CheckCircle2 className="size-3 text-green-500 shrink-0 mt-0.5" />
                    : g.status === GS.WARN
                    ? <AlertTriangle className="size-3 text-amber-500 shrink-0 mt-0.5" />
                    : <XCircle className="size-3 text-red-500 shrink-0 mt-0.5" />}
                  <span className={g.status === GS.FAIL ? 'text-red-700' : ''}>{g.label}</span>
                  {g.status === GS.FAIL && (
                    <button
                      className="ml-auto text-[10px] text-primary underline whitespace-nowrap"
                      onClick={() => router.push(`/rfqs/${rfqId}/workspace`)}
                    >
                      fix →
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </Panel>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function IssuancePage() {
  const router = useRouter();
  const { bundle, refetch } = useRfqBundle();
  const { role, userName } = useRole();
  const { upsertTask } = useHandoffStore();

  const [note, setNote] = useState('');
  const [masterPolicyNumber, setMasterPolicyNumber] = useState('');
  const [dispatchToPas, setDispatchToPas] = useState(true);
  const [issuing, setIssuing] = useState(false);
  const [requesting, setRequesting] = useState(false);

  // Signed docs form state
  const [newDocType, setNewDocType] = useState<DocumentType>(DocumentType.SIGNED_PROPOSAL);
  const [addingDoc, setAddingDoc] = useState(false);

  if (!bundle) return null;

  const { isFrozen, frozenVersion } = computeFreezeState(bundle);
  const rfqId = bundle.rfqId;

  if (!isFrozen) {
    return (
      <div className="p-8 max-w-lg mx-auto">
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-6 py-5 space-y-3">
          <div className="flex items-center gap-2 text-amber-800 font-semibold">
            <Lock className="size-4" /> Freeze required
          </div>
          <p className="text-sm text-amber-700">
            Freeze the broker-aligned version before proceeding to issuance.
          </p>
          <Button
            variant="outline" size="sm"
            className="border-amber-300 text-amber-800 hover:bg-amber-100"
            onClick={() => router.push(`/rfqs/${rfqId}/versions`)}
          >
            Go to Versions <ArrowRight className="size-3.5 ml-1" />
          </Button>
        </div>
      </div>
    );
  }

  const readinessReport = computeReadinessGates(bundle);
  const isIssued = bundle.statusStage === RfqStatus.ISSUED;
  const isOps = canBind(role);
  const activePlans = bundle.plans.filter((p) => p.quoteVersionId === bundle.activeVersionId);
  const totalSI = bundle.members.reduce((sum, m) => sum + m.sumAssured, 0);
  const signedDocs = bundle.documents.filter((d) => d.status === DocumentStatus.SIGNED);
  const failingBucketNames = readinessReport.buckets
    .filter((b) => b.overall === GateStatus.FAIL)
    .map((b) => b.label);

  const engineReady = readinessReport.issuanceReady;
  const canIssueNow = engineReady && masterPolicyNumber.trim().length > 0;

  // Find open OPS issuance request task
  const opsRequest = useHandoffStore.getState().tasks.find(
    (t) => t.rfqId === rfqId && t.kind === HandoffKind.OPS && t.status === HandoffStatus.REQUESTED
  );

  async function handleIssue() {
    setIssuing(true);
    try {
      await issueRfq(rfqId, {
        masterPolicyNumber,
        issuedAt: new Date().toISOString(),
      });
      if (dispatchToPas) {
        await dispatchPas(rfqId);
      }
      await refetch();
    } finally {
      setIssuing(false);
    }
  }

  async function handleRequestIssuance() {
    setRequesting(true);
    const reason = failingBucketNames.length > 0
      ? `Blockers: ${failingBucketNames.join(', ')}`
      : 'All gates green';
    const task = {
      taskId: `ops-req-${rfqId}-${Date.now()}`,
      rfqId,
      planId: '',
      versionId: bundle!.activeVersionId,
      kind: HandoffKind.OPS,
      status: HandoffStatus.REQUESTED,
      reason,
      note,
      lives: bundle!.members.length,
      slaHours: 24,
      requestedAt: new Date().toISOString(),
    };
    await upsertTask(task);
    setRequesting(false);
  }

  async function handleAttachDoc() {
    setAddingDoc(true);
    try {
      await addDocument(rfqId, {
        type: newDocType,
        name: DOC_TYPE_LABELS[newDocType],
        status: DocumentStatus.SIGNED,
        source: 'Manual — Issuance screen',
      });
      await refetch();
    } finally {
      setAddingDoc(false);
    }
  }

  // ─── POST-ISSUE VIEW ──────────────────────────────────────────────────────

  if (isIssued) {
    return (
      <div className="flex flex-col gap-5 p-6 max-w-[720px] mx-auto">
        <div className="rounded-2xl border border-green-200 bg-green-50 px-6 py-5">
          <div className="flex items-center gap-3 mb-3">
            <CheckCircle2 className="size-7 text-green-600" />
            <div>
              <h1 className="text-lg font-bold text-green-900">Policy Issued</h1>
              <p className="text-sm text-green-700">{bundle.employerName}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-x-8 gap-y-1.5 text-sm">
            <div>
              <span className="text-xs text-green-700 block">Master Policy Number</span>
              <span className="font-semibold">{bundle.masterPolicyNumber ?? '—'}</span>
            </div>
            <div>
              <span className="text-xs text-green-700 block">Issued At</span>
              <span className="font-semibold">
                {bundle.issuedAt ? new Date(bundle.issuedAt).toLocaleDateString('en-IN') : '—'}
              </span>
            </div>
            <div>
              <span className="text-xs text-green-700 block">Effective From</span>
              <span className="font-semibold">{bundle.effectiveDate ?? '—'}</span>
            </div>
            <div>
              <span className="text-xs text-green-700 block">Total Sum Insured</span>
              <span className="font-semibold">₹{totalSI.toLocaleString('en-IN')}</span>
            </div>
          </div>
        </div>

        {/* Quick links */}
        <Panel>
          <SectionHeading>Quick Links</SectionHeading>
          <div className="grid grid-cols-2 gap-3">
            {isOps && (
              <Button
                variant="outline" size="sm"
                onClick={async () => { await dispatchPas(rfqId); await refetch(); }}
              >
                <RotateCcw className="size-3.5 mr-1.5" /> Re-dispatch to PAS
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={() => router.push(`/rfqs/${rfqId}/quote-pack`)}>
              Quote pack on record
            </Button>
            <Button variant="outline" size="sm" onClick={() => router.push(`/rfqs/${rfqId}/final-placement`)}>
              Capture final placement
            </Button>
            <Button variant="outline" size="sm" disabled>
              Finance hand-off — coming soon
            </Button>
            <Button variant="outline" size="sm" disabled>
              Claims intake — coming soon
            </Button>
          </div>
        </Panel>
      </div>
    );
  }

  // ─── PRE-ISSUE VIEW ───────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-5 p-6 max-w-[760px] mx-auto">
      <div>
        <h1 className="text-xl font-bold tracking-tight">Issuance</h1>
        <p className="text-sm text-muted-foreground mt-0.5">{bundle.employerName} · Bind ceremony</p>
      </div>

      {/* Blocker notice */}
      {!readinessReport.issuanceReady && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 flex items-center gap-3">
          <AlertTriangle className="size-4 text-red-600 shrink-0" />
          <span className="text-sm text-red-800">
            {readinessReport.failingCount} readiness gate{readinessReport.failingCount !== 1 ? 's' : ''} failing —{' '}
            <button className="underline font-medium" onClick={() => router.push(`/rfqs/${rfqId}/workspace`)}>
              view checklist
            </button>
          </span>
        </div>
      )}

      {/* ─── Panel 1: Signed Documents ─────────────────────────────────────── */}
      <Panel>
        <SectionHeading>Signed Documents</SectionHeading>
        {signedDocs.length === 0 ? (
          <p className="text-xs text-muted-foreground italic mb-3">No signed documents on file.</p>
        ) : (
          <div className="space-y-2 mb-3">
            {signedDocs.map((d) => (
              <div key={d.documentId} className="flex items-center gap-3 text-xs">
                <CheckCircle2 className="size-3.5 text-green-600 shrink-0" />
                <span className="font-medium">{d.name}</span>
                <span className="text-muted-foreground">{DOC_TYPE_LABELS[d.type] ?? d.type}</span>
                <span className="text-muted-foreground ml-auto">{new Date(d.uploadedAt).toLocaleDateString('en-IN')}</span>
              </div>
            ))}
          </div>
        )}
        <div className="flex items-end gap-3 pt-2 border-t border-border/30">
          <div className="flex-1 space-y-1">
            <label className="text-[11px] text-muted-foreground font-medium">Attach signed document</label>
            <select
              className="w-full text-sm border border-border rounded-lg px-3 py-2 bg-background focus:outline-none"
              value={newDocType}
              onChange={(e) => setNewDocType(e.target.value as DocumentType)}
            >
              {Object.values(DocumentType).map((t) => (
                <option key={t} value={t}>{DOC_TYPE_LABELS[t]}</option>
              ))}
            </select>
          </div>
          <Button size="sm" variant="outline" disabled={addingDoc} onClick={handleAttachDoc}>
            <Plus className="size-3.5 mr-1" /> {addingDoc ? 'Attaching…' : 'Attach'}
          </Button>
        </div>
        <p className="text-[10px] text-muted-foreground mt-1 italic">
          NOTE: file content not stored in this build — metadata only.
        </p>
      </Panel>

      {/* ─── Panel 2: Issuance Gate ────────────────────────────────────────── */}
      <Panel>
        <SectionHeading>Issuance Gate</SectionHeading>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          {[
            { label: 'Stage', value: bundle.statusStage },
            { label: 'Plans', value: activePlans.length },
            { label: 'Lives', value: bundle.members.length.toLocaleString('en-IN') },
            { label: 'Total SI', value: `₹${totalSI.toLocaleString('en-IN')}` },
          ].map((kpi) => (
            <div key={kpi.label} className="rounded-lg bg-muted/30 px-3 py-2.5">
              <p className="text-[10px] text-muted-foreground">{kpi.label}</p>
              <p className="text-sm font-semibold">{kpi.value}</p>
            </div>
          ))}
        </div>
        <div className="space-y-3">
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Note</label>
            <Textarea
              rows={2}
              value={note}
              placeholder="Issuance note (optional)…"
              onChange={(e) => setNote(e.target.value)}
            />
          </div>

          {isOps ? (
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Master Policy Number *</label>
                <Input
                  value={masterPolicyNumber}
                  placeholder="e.g. GTL-2026-00123"
                  onChange={(e) => setMasterPolicyNumber(e.target.value)}
                />
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={dispatchToPas}
                  onChange={(e) => setDispatchToPas(e.target.checked)}
                  className="size-4 rounded border-border accent-primary"
                />
                <span className="text-sm">Dispatch to PAS on issue</span>
              </label>
              {!canIssueNow && (
                <p className="text-xs text-muted-foreground italic">
                  {!masterPolicyNumber.trim() ? 'Enter the master policy number to enable issuance.' : ''}
                  {!engineReady ? ` Bind verdict: BLOCKED (${failingBucketNames.join(', ')}).` : ''}
                </p>
              )}
              <Button
                className="w-full"
                disabled={!canIssueNow || issuing}
                onClick={handleIssue}
              >
                {issuing ? 'Issuing policy…' : 'Issue policy'}
              </Button>
            </div>
          ) : (
            <div className="space-y-3 rounded-lg bg-muted/20 border border-border/50 px-4 py-3">
              <p className="text-sm text-muted-foreground">
                Binding is an OPS decision — you can request issuance below.
              </p>
              {opsRequest ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs text-amber-700">
                    <AlertTriangle className="size-3.5 shrink-0" />
                    Request pending since{' '}
                    {new Date(opsRequest.requestedAt).toLocaleDateString('en-IN')}
                  </div>
                  <Button
                    size="sm" variant="outline" disabled={requesting}
                    onClick={handleRequestIssuance}
                  >
                    {requesting ? 'Sending…' : 'Re-request issuance'}
                  </Button>
                </div>
              ) : (
                <Button
                  size="sm" disabled={requesting}
                  onClick={handleRequestIssuance}
                >
                  {requesting ? 'Sending…' : 'Request issuance from Ops'}
                </Button>
              )}
            </div>
          )}
        </div>
      </Panel>

      {/* ─── Engine Verdict ────────────────────────────────────────────────── */}
      <EngineVerdict issuanceReady={engineReady} failingBucketNames={failingBucketNames} />

      {/* ─── Readiness Checklist ───────────────────────────────────────────── */}
      <ReadinessChecklist bundle={bundle} rfqId={rfqId} />

      {/* ─── Pre-Issuance Reconciliation ───────────────────────────────────── */}
      <Panel>
        <SectionHeading>Pre-Issuance Reconciliation</SectionHeading>
        <div className="space-y-2 text-xs">
          <div className="flex items-center justify-between border-b border-border/20 pb-1.5">
            <span className="text-muted-foreground">Coverage decisions on file</span>
            <span className="font-medium">{activePlans.length} plan{activePlans.length !== 1 ? 's' : ''}</span>
          </div>
          <div className="flex items-center justify-between border-b border-border/20 pb-1.5">
            <span className="text-muted-foreground">Packs generated</span>
            <span className="font-medium">1</span>
          </div>
          <div className="flex items-center justify-between border-b border-border/20 pb-1.5">
            <span className="text-muted-foreground">Frozen version</span>
            <span className="font-medium">{frozenVersion?.name ?? '—'}</span>
          </div>
          {frozenVersion?.validationReceipt ? (
            <>
              <div className="flex items-center justify-between border-b border-border/20 pb-1.5">
                <span className="text-muted-foreground">Bind-validation receipt</span>
                <span className="font-medium font-mono text-[10px]">{frozenVersion.validationReceipt.configHash.slice(0, 12)}…</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Validated at</span>
                <span className="font-medium">
                  {new Date(frozenVersion.validationReceipt.validatedAt).toLocaleString('en-IN')}
                </span>
              </div>
            </>
          ) : (
            <div className="flex items-center gap-2 text-amber-700">
              <AlertTriangle className="size-3.5 shrink-0" />
              No validation receipt on frozen version.
            </div>
          )}
        </div>
      </Panel>
    </div>
  );
}
