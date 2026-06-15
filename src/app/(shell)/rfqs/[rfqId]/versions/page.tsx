'use client';

import { useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Plus, Copy, Zap, Edit3, MoreHorizontal, ChevronRight,
  CheckCircle2, Lock, Clock, AlertTriangle, ShieldCheck, Loader2,
} from 'lucide-react';
import { useRfqBundle } from '@/context/RfqBundleContext';
import { useEscalationStore } from '@/stores/escalationStore';
import { useRole } from '@/hooks/useRole';
import { computeVersionProfitability } from '@/lib/computations';
import {
  FclPattern, VersionStatus, EscalationKind, EscalationStatus,
  type QuoteVersion, type FclPolicy,
} from '@/lib/types';
import { updateRfq, deletePlan, runPricingMacro } from '@/lib/api/quotation-client';
import { canFreezeVersion, isInternalRole } from '@/lib/permissions';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function localId() {
  return `v-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

const FCL_OPTIONS: { value: FclPattern; label: string }[] = [
  { value: FclPattern.NONE, label: 'None' },
  { value: FclPattern.OVERALL, label: 'Overall' },
  { value: FclPattern.BY_GRADE, label: 'By Grade' },
  { value: FclPattern.BY_AGE_BAND, label: 'By Age Band' },
  { value: FclPattern.BY_GENDER, label: 'By Gender' },
  { value: FclPattern.BY_CATEGORY, label: 'By Category' },
];

const STATUS_OPTIONS: VersionStatus[] = [
  VersionStatus.DRAFT,
  VersionStatus.SHARED,
  VersionStatus.SELECTED,
  VersionStatus.ARCHIVED,
];

const STATUS_COLORS: Record<VersionStatus, string> = {
  [VersionStatus.DRAFT]:    'bg-slate-100 text-slate-700 border-slate-200',
  [VersionStatus.SHARED]:   'bg-blue-50 text-blue-700 border-blue-200',
  [VersionStatus.SELECTED]: 'bg-amber-50 text-amber-700 border-amber-200',
  [VersionStatus.FROZEN]:   'bg-violet-50 text-violet-700 border-violet-200',
  [VersionStatus.ARCHIVED]: 'bg-gray-50 text-gray-500 border-gray-200',
};

function fmt(n: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function PricedRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-xs py-0.5">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium tabular-nums">{value}</span>
    </div>
  );
}

// ─── Freeze Action Cell ───────────────────────────────────────────────────────

function FreezeAction({
  rfqId,
  version,
  canFreeze,
}: {
  rfqId: string;
  version: QuoteVersion;
  canFreeze: boolean;
}) {
  const router = useRouter();
  const { raise, getForVersion } = useEscalationStore();
  const { role, userId, userName } = useRole();

  const escalations = getForVersion(rfqId, version.id).filter(
    (e) => e.kind === EscalationKind.FREEZE_VERSION
  );
  const pending = escalations.find((e) => e.status === EscalationStatus.PENDING);
  const approved = escalations.find((e) => e.status === EscalationStatus.APPROVED);
  const rejected = escalations.find((e) => e.status === EscalationStatus.REJECTED);

  if (version.status === VersionStatus.FROZEN) {
    const receipt = version.validationReceipt;
    return (
      <div className="rounded-md bg-violet-50 border border-violet-200 p-2.5 space-y-1">
        <div className="flex items-center gap-1.5 text-xs font-medium text-violet-700">
          <ShieldCheck className="size-3.5" /> Frozen
        </div>
        {receipt && (
          <div className="text-[10px] text-violet-600 space-y-0.5 font-mono">
            <div>Hash: {receipt.configHash}</div>
            <div>{receipt.productPins.length} product pin(s)</div>
          </div>
        )}
      </div>
    );
  }

  if (canFreeze) {
    if (approved) {
      return (
        <Button
          size="sm"
          variant="default"
          className="w-full text-xs bg-violet-600 hover:bg-violet-700"
          onClick={() => router.push(`/rfqs/${rfqId}/versions/${version.id}/freeze`)}
        >
          <ShieldCheck className="size-3.5 mr-1" />
          Freeze — approved by {approved.decidedBy ?? 'supervisor'}
        </Button>
      );
    }
    return (
      <Button
        size="sm"
        variant="outline"
        className="w-full text-xs border-violet-300 text-violet-700 hover:bg-violet-50"
        onClick={() => router.push(`/rfqs/${rfqId}/versions/${version.id}/freeze`)}
      >
        <Lock className="size-3.5 mr-1" /> Freeze — broker aligned
      </Button>
    );
  }

  // Cannot freeze — must escalate
  if (pending) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-2.5 py-2">
        <Clock className="size-3.5 shrink-0" /> Pending — with supervisor
      </div>
    );
  }

  if (rejected) {
    return (
      <div className="space-y-1.5">
        <div className="text-[10px] text-destructive bg-destructive/5 border border-destructive/20 rounded-md px-2 py-1.5">
          <AlertTriangle className="size-3 inline mr-1" />
          Rejected: {rejected.decisionNote ?? 'No reason given'}
        </div>
        <Button
          size="sm"
          variant="outline"
          className="w-full text-xs"
          onClick={() =>
            raise({
              kind: EscalationKind.FREEZE_VERSION,
              rfqId,
              versionId: version.id,
              subject: `Freeze approval for ${version.name}`,
              requestedBy: userName,
              requestedAt: new Date().toISOString(),
            })
          }
        >
          Request again
        </Button>
      </div>
    );
  }

  return (
    <Button
      size="sm"
      variant="outline"
      className="w-full text-xs"
      onClick={() =>
        raise({
          kind: EscalationKind.FREEZE_VERSION,
          rfqId,
          versionId: version.id,
          subject: `Freeze approval for ${version.name}`,
          requestedBy: userName,
          requestedAt: new Date().toISOString(),
        })
      }
    >
      <ChevronRight className="size-3.5 mr-1" /> Request freeze approval
    </Button>
  );
}

// ─── Version Card ─────────────────────────────────────────────────────────────

function VersionCard({
  version,
  rfqId,
  isActive,
  profitabilityMap,
  plansForVersion,
  fclDefault,
  isSalesRole,
  canFreeze,
  totalVersions,
  onStatusChange,
  onNameBlur,
  onFclOverride,
  onDuplicate,
  onDelete,
  onSwitch,
}: {
  version: QuoteVersion;
  rfqId: string;
  isActive: boolean;
  profitabilityMap: ReturnType<typeof computeVersionProfitability>;
  plansForVersion: { planId: string; name: string }[];
  fclDefault: FclPattern;
  isSalesRole: boolean;
  canFreeze: boolean;
  totalVersions: number;
  onStatusChange: (v: QuoteVersion, status: VersionStatus) => void;
  onNameBlur: (v: QuoteVersion, name: string) => void;
  onFclOverride: (v: QuoteVersion, pat: FclPattern | undefined) => void;
  onDuplicate: (v: QuoteVersion) => void;
  onDelete: (v: QuoteVersion) => void;
  onSwitch: (v: QuoteVersion) => void;
}) {
  const [nameEdit, setNameEdit] = useState(version.name);
  const priceRun = profitabilityMap.pricedVersions.find((p) => p.versionId === version.id);
  const isMostCompetitive = profitabilityMap.mostCompetitiveVersionId === version.id && profitabilityMap.pricedVersions.length >= 2;
  const isMostProfitable = profitabilityMap.mostProfitableVersionId === version.id && profitabilityMap.pricedVersions.length >= 2;
  const isFrozen = version.status === VersionStatus.FROZEN;
  const visiblePlans = plansForVersion.slice(0, 6);
  const overflow = plansForVersion.length - 6;

  const fclOverride = version.fclPatternOverride;

  return (
    <div
      className={cn(
        'w-72 shrink-0 rounded-xl border bg-card shadow-sm flex flex-col gap-0 overflow-hidden',
        isActive ? 'border-primary/50 ring-1 ring-primary/20' : 'border-border'
      )}
    >
      {/* Identity */}
      <div className="px-4 pt-4 pb-3 border-b border-border/50">
        <div className="flex items-start justify-between gap-2 mb-1.5">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-[10px] font-mono text-muted-foreground shrink-0">
              V{version.versionNo}
            </span>
            {isSalesRole && !isFrozen ? (
              <input
                className="text-sm font-semibold bg-transparent border-b border-transparent hover:border-border focus:border-primary focus:outline-none w-full min-w-0 truncate"
                value={nameEdit}
                onChange={(e) => setNameEdit(e.target.value)}
                onBlur={() => onNameBlur(version, nameEdit)}
              />
            ) : (
              <span className="text-sm font-semibold truncate">{version.name}</span>
            )}
          </div>
          {isActive && (
            <Badge className="shrink-0 text-[10px] bg-primary/10 text-primary border-primary/20 hover:bg-primary/10">
              Active
            </Badge>
          )}
        </div>
        {version.note && (
          <p className="text-[11px] text-muted-foreground mb-2 line-clamp-2">{version.note}</p>
        )}
        {/* Status */}
        <div className="flex items-center gap-2">
          {isSalesRole && !isFrozen ? (
            <select
              className={cn(
                'text-[11px] font-medium border rounded-full px-2 py-0.5 appearance-none cursor-pointer focus:outline-none focus:ring-1 focus:ring-primary/40',
                STATUS_COLORS[version.status]
              )}
              value={version.status}
              onChange={(e) => onStatusChange(version, e.target.value as VersionStatus)}
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          ) : (
            <span className={cn('text-[11px] font-medium border rounded-full px-2 py-0.5', STATUS_COLORS[version.status])}>
              {version.status}
            </span>
          )}
        </div>
      </div>

      {/* FCL Override */}
      <div className="px-4 py-3 border-b border-border/50">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
          FCL Pattern
        </div>
        {isSalesRole ? (
          <select
            className="text-xs border border-border rounded-md px-2 py-1 w-full focus:outline-none focus:ring-1 focus:ring-primary/40 bg-background"
            value={fclOverride ?? ''}
            onChange={(e) => {
              const val = e.target.value as FclPattern | '';
              onFclOverride(version, val === '' ? undefined : (val as FclPattern));
            }}
          >
            <option value="">Inherit ({fclDefault})</option>
            {FCL_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        ) : (
          <span className="text-xs">
            {fclOverride ? fclOverride : `Inherit (${fclDefault})`}
          </span>
        )}
      </div>

      {/* Profitability */}
      <div className="px-4 py-3 border-b border-border/50">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 flex items-center gap-2">
          Profitability
          {isMostCompetitive && (
            <span className="text-[9px] bg-green-50 border border-green-200 text-green-700 rounded-full px-1.5 py-0.5">
              Most competitive
            </span>
          )}
          {isMostProfitable && (
            <span className="text-[9px] bg-blue-50 border border-blue-200 text-blue-700 rounded-full px-1.5 py-0.5">
              Most profitable
            </span>
          )}
        </div>
        {priceRun ? (
          <div className="space-y-0.5">
            <PricedRow label="Premium (incl. GST)" value={fmt(priceRun.finalPremiumInclGst)} />
            <PricedRow label="Per life" value={fmt(priceRun.finalPremiumInclGst / Math.max(1, 1))} />
            <PricedRow label="Loss ratio proxy" value={`${(priceRun.modelFactor * 100).toFixed(1)}%`} />
          </div>
        ) : (
          <p className="text-[11px] text-muted-foreground italic">Not priced yet</p>
        )}
      </div>

      {/* Plan digest */}
      <div className="px-4 py-3 border-b border-border/50 flex-1">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
          Plans
        </div>
        {visiblePlans.length === 0 ? (
          <p className="text-[11px] text-muted-foreground italic">No plans yet</p>
        ) : (
          <div className="flex flex-wrap gap-1">
            {visiblePlans.map((p) => (
              <span
                key={p.planId}
                className="text-[10px] bg-muted border border-border rounded px-1.5 py-0.5 max-w-[120px] truncate"
              >
                {p.name}
              </span>
            ))}
            {overflow > 0 && (
              <span className="text-[10px] text-muted-foreground">+{overflow} more</span>
            )}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="px-4 py-3 space-y-2">
        <Button
          size="sm"
          variant={isActive ? 'default' : 'outline'}
          className="w-full text-xs"
          onClick={() => onSwitch(version)}
        >
          {isActive ? 'Open / Edit' : 'Switch & Edit'}
        </Button>
        <div className="flex gap-1.5">
          <Button
            size="sm"
            variant="ghost"
            className="flex-1 text-xs"
            title="Duplicate"
            onClick={() => onDuplicate(version)}
          >
            <Copy className="size-3.5 mr-1" /> Duplicate
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="flex-1 text-xs text-destructive hover:text-destructive"
            disabled={totalVersions <= 1}
            title="Delete"
            onClick={() => onDelete(version)}
          >
            Delete
          </Button>
        </div>
        {/* Freeze cell */}
        <FreezeAction rfqId={rfqId} version={version} canFreeze={canFreeze} />
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function VersionsPage() {
  const router = useRouter();
  const { bundle, refetch } = useRfqBundle();
  const { role, salesLevel } = useRole();

  const [pricing, setPricing] = useState(false);
  const [pricingProgress, setPricingProgress] = useState(0);
  const [saving, setSaving] = useState(false);

  if (!bundle) return null;

  const rfqId = bundle.rfqId;
  const isSales = role === 'SALES';
  const canFreeze = canFreezeVersion(role, salesLevel);
  const internalUser = isInternalRole(role);
  const profMap = computeVersionProfitability(bundle);

  // ── New version ──
  async function handleNewVersion() {
    const newV: QuoteVersion = {
      id: localId(),
      versionNo: bundle!.quoteVersions.length + 1,
      name: `Version ${bundle!.quoteVersions.length + 1}`,
      status: VersionStatus.DRAFT,
      createdAt: new Date().toISOString(),
    };
    const updated = [...bundle!.quoteVersions, newV];
    setSaving(true);
    try {
      await updateRfq(rfqId, { quoteVersions: updated, activeVersionId: newV.id });
      await refetch();
    } finally {
      setSaving(false);
    }
  }

  // ── Duplicate active ──
  async function handleDuplicateActive() {
    const active = bundle!.quoteVersions.find((v) => v.id === bundle!.activeVersionId);
    if (!active) return;
    const clone: QuoteVersion = {
      ...active,
      id: localId(),
      versionNo: bundle!.quoteVersions.length + 1,
      name: `${active.name} (copy)`,
      status: VersionStatus.DRAFT,
      validationReceipt: undefined,
      createdAt: new Date().toISOString(),
    };
    const updated = [...bundle!.quoteVersions, clone];
    setSaving(true);
    try {
      await updateRfq(rfqId, { quoteVersions: updated, activeVersionId: clone.id });
      await refetch();
    } finally {
      setSaving(false);
    }
  }

  // ── Price all versions ──
  async function handlePriceAll() {
    setPricing(true);
    setPricingProgress(0);
    const versions = bundle!.quoteVersions.filter((v) => v.status !== VersionStatus.ARCHIVED);
    for (let i = 0; i < versions.length; i++) {
      try {
        await runPricingMacro(rfqId);
      } catch {/* continue */}
      setPricingProgress(Math.round(((i + 1) / versions.length) * 100));
    }
    await refetch();
    setPricing(false);
  }

  // ── FCL default change ──
  async function handleFclDefault(pattern: FclPattern) {
    const fclPolicy: FclPolicy = { ...bundle!.fclPolicy, quoteDefault: pattern };
    setSaving(true);
    try {
      await updateRfq(rfqId, { fclPolicy });
      await refetch();
    } finally {
      setSaving(false);
    }
  }

  // ── Per-version status change ──
  async function handleStatusChange(v: QuoteVersion, status: VersionStatus) {
    const updated = bundle!.quoteVersions.map((qv) =>
      qv.id === v.id ? { ...qv, status } : qv
    );
    await updateRfq(rfqId, { quoteVersions: updated });
    await refetch();
  }

  // ── Per-version name edit ──
  async function handleNameBlur(v: QuoteVersion, name: string) {
    if (name === v.name) return;
    const updated = bundle!.quoteVersions.map((qv) =>
      qv.id === v.id ? { ...qv, name } : qv
    );
    await updateRfq(rfqId, { quoteVersions: updated });
    await refetch();
  }

  // ── Per-version FCL override ──
  async function handleFclOverride(v: QuoteVersion, pat: FclPattern | undefined) {
    const updated = bundle!.quoteVersions.map((qv) =>
      qv.id === v.id ? { ...qv, fclPatternOverride: pat } : qv
    );
    const fclPolicy: FclPolicy = {
      ...bundle!.fclPolicy,
      byVersion: { ...bundle!.fclPolicy.byVersion, ...(pat ? { [v.id]: pat } : {}) },
    };
    // Remove key if reverting to inherit
    if (!pat) delete fclPolicy.byVersion[v.id];
    await updateRfq(rfqId, { quoteVersions: updated, fclPolicy });
    await refetch();
  }

  // ── Duplicate a specific version ──
  async function handleDuplicate(v: QuoteVersion) {
    const clone: QuoteVersion = {
      ...v,
      id: localId(),
      versionNo: bundle!.quoteVersions.length + 1,
      name: `${v.name} (copy)`,
      status: VersionStatus.DRAFT,
      validationReceipt: undefined,
      createdAt: new Date().toISOString(),
    };
    const updated = [...bundle!.quoteVersions, clone];
    await updateRfq(rfqId, { quoteVersions: updated });
    await refetch();
  }

  // ── Delete a version ──
  async function handleDelete(v: QuoteVersion) {
    if (bundle!.quoteVersions.length <= 1) return;
    // Delete plans belonging to this version
    const versionPlans = bundle!.plans.filter((p) => p.quoteVersionId === v.id);
    await Promise.all(versionPlans.map((p) => deletePlan(rfqId, p.planId)));
    const updated = bundle!.quoteVersions.filter((qv) => qv.id !== v.id);
    const newActive = bundle!.activeVersionId === v.id ? (updated[0]?.id ?? '') : bundle!.activeVersionId;
    await updateRfq(rfqId, { quoteVersions: updated, activeVersionId: newActive });
    await refetch();
  }

  // ── Switch active + navigate to plans ──
  async function handleSwitch(v: QuoteVersion) {
    if (bundle!.activeVersionId !== v.id) {
      await updateRfq(rfqId, { activeVersionId: v.id });
      await refetch();
    }
    router.push(`/rfqs/${rfqId}/plans`);
  }

  const fclDefault = bundle.fclPolicy?.quoteDefault ?? FclPattern.NONE;

  return (
    <div className="flex flex-col gap-6 p-6 max-w-[1400px] mx-auto">
      {/* P-HEADER */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Quote Versions</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{bundle.employerName}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {saving && <span className="text-xs text-muted-foreground">Saving…</span>}
          <Button
            size="sm"
            variant="outline"
            onClick={handleNewVersion}
            disabled={saving}
          >
            <Plus className="size-4 mr-1.5" /> New version
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleDuplicateActive}
            disabled={saving}
          >
            <Copy className="size-4 mr-1.5" /> Duplicate active
          </Button>
          <Button
            size="sm"
            variant="default"
            onClick={handlePriceAll}
            disabled={pricing}
          >
            {pricing ? (
              <>
                <Loader2 className="size-4 mr-1.5 animate-spin" />
                Pricing… {pricingProgress}%
              </>
            ) : (
              <>
                <Zap className="size-4 mr-1.5" /> Price all versions
              </>
            )}
          </Button>
        </div>
      </div>

      {/* P-FORM — FCL Quote Default */}
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-start justify-between gap-6 flex-wrap">
          <div className="min-w-[240px]">
            <h2 className="text-sm font-semibold mb-0.5">FCL Quote Default</h2>
            <p className="text-xs text-muted-foreground">
              Default FCL pattern applied to all versions unless overridden per-version.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <select
              className="text-sm border border-border rounded-lg px-3 py-1.5 bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-50 disabled:cursor-not-allowed"
              value={fclDefault}
              disabled={!isSales}
              onChange={(e) => handleFclDefault(e.target.value as FclPattern)}
            >
              {FCL_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="mt-3 text-[11px] text-muted-foreground bg-muted/40 rounded-md px-3 py-2 border border-border/30">
          Limits from treaty <span className="font-mono">RI-GTL-2026-V1</span>
        </div>
      </div>

      {/* P-COMPARE — Version grid */}
      {bundle.quoteVersions.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-12 text-center">
          <p className="text-sm text-muted-foreground mb-4">No versions yet. Create one to start quoting.</p>
          <Button size="sm" onClick={handleNewVersion}>
            <Plus className="size-4 mr-1.5" /> New version
          </Button>
        </div>
      ) : (
        <div className="overflow-x-auto pb-2">
          <div className="flex gap-4" style={{ minWidth: 'max-content' }}>
            {bundle.quoteVersions.map((v) => (
              <VersionCard
                key={v.id}
                version={v}
                rfqId={rfqId}
                isActive={v.id === bundle.activeVersionId}
                profitabilityMap={profMap}
                plansForVersion={bundle.plans.filter((p) => p.quoteVersionId === v.id)}
                fclDefault={fclDefault}
                isSalesRole={isSales}
                canFreeze={canFreeze}
                totalVersions={bundle.quoteVersions.length}
                onStatusChange={handleStatusChange}
                onNameBlur={handleNameBlur}
                onFclOverride={handleFclOverride}
                onDuplicate={handleDuplicate}
                onDelete={handleDelete}
                onSwitch={handleSwitch}
              />
            ))}
          </div>
        </div>
      )}

      {/* P-PROMPT — Guidance footnote */}
      <div className="rounded-xl border border-border/50 bg-muted/30 px-5 py-4 text-[11px] text-muted-foreground space-y-1">
        <p>
          <strong className="text-foreground">Active version</strong> is the version currently being edited and used as the basis for pricing, plans, and rate-card allocation.
          Switching to another version updates the active pointer and takes you to the plans screen for that version.
        </p>
        <p>
          <strong className="text-foreground">Freeze</strong> locks a version to preserve the product configuration, enabling the policy-detail screens, quote pack generation, and issuance.
          Only one version can be frozen at a time — freezing a new version automatically demotes any previously frozen version to <em>Selected</em>.
        </p>
      </div>
    </div>
  );
}
