'use client';

import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  AlertTriangle, CheckCircle2, XCircle, Snowflake, Info,
  ChevronRight, Lock, Zap, Users, FileText, BarChart2, ClipboardList,
  Settings, Truck, Package,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useRfqBundle } from '@/context/RfqBundleContext';
import {
  computeReadinessGates,
  computeFreezeState,
  computeMilestoneSpine,
  computeJourneySteps,
} from '@/lib/computations';
import { GateStatus, MilestoneState, RfqStatus } from '@/lib/types';

// ─── Label maps ───────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<RfqStatus, string> = {
  [RfqStatus.DATA_PENDING]: 'Data Pending',
  [RfqStatus.CENSUS_CLEANED]: 'Census Cleaned',
  [RfqStatus.EXPERIENCE_NORMALIZED]: 'Experience Normalised',
  [RfqStatus.BENEFITS_READY]: 'Benefits Ready',
  [RfqStatus.PRICING]: 'Pricing',
  [RfqStatus.PRICING_IN_PROGRESS]: 'Pricing In Progress',
  [RfqStatus.UW_REVIEW]: 'UW Review',
  [RfqStatus.QUOTE_GENERATED]: 'Quote Generated',
  [RfqStatus.SHARED]: 'Quote Shared',
  [RfqStatus.NEGOTIATION]: 'Negotiation',
  [RfqStatus.FINAL]: 'Final',
  [RfqStatus.ISSUED]: 'Issued',
  [RfqStatus.REJECTED]: 'Rejected',
};

const STATUS_TONE: Record<RfqStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  [RfqStatus.DATA_PENDING]: 'secondary',
  [RfqStatus.CENSUS_CLEANED]: 'secondary',
  [RfqStatus.EXPERIENCE_NORMALIZED]: 'secondary',
  [RfqStatus.BENEFITS_READY]: 'secondary',
  [RfqStatus.PRICING]: 'default',
  [RfqStatus.PRICING_IN_PROGRESS]: 'default',
  [RfqStatus.UW_REVIEW]: 'default',
  [RfqStatus.QUOTE_GENERATED]: 'default',
  [RfqStatus.SHARED]: 'default',
  [RfqStatus.NEGOTIATION]: 'default',
  [RfqStatus.FINAL]: 'default',
  [RfqStatus.ISSUED]: 'outline',
  [RfqStatus.REJECTED]: 'destructive',
};

const BUCKET_FIX_ROUTES: Record<number, string> = {
  1: 'key-data',
  2: 'census-workbench',
  3: 'plans',
  4: 'sales-dispatch',
  5: 'commercial-rate-card',
};

// ─── Tile configs ─────────────────────────────────────────────────────────────

const LAUNCHPAD_TILES = [
  { label: 'Quote Setup', route: 'key-data', bucketNo: 1, icon: ClipboardList, countKey: 'versions' as const },
  { label: 'Census & Members', route: 'census-workbench', bucketNo: 2, icon: Users, countKey: 'members' as const },
  { label: 'Plans', route: 'plans', bucketNo: 3, icon: Package, countKey: 'plans' as const },
  { label: 'Underwriting', route: 'sales-dispatch', bucketNo: 4, icon: Truck, countKey: null },
  { label: 'Pricing & Quote Pack', route: 'commercial-rate-card', bucketNo: 5, icon: BarChart2, countKey: 'documents' as const },
];

const QUICK_LINKS = [
  { label: 'Quote Key Data', route: 'key-data' },
  { label: 'Policy Configuration', route: 'policy-config' },
  { label: 'Document Registry', route: 'documents' },
  { label: 'Census Workbench', route: 'census-workbench' },
  { label: 'Members', route: 'members' },
  { label: 'Headcount', route: 'headcount' },
  { label: 'Plans', route: 'plans' },
  { label: 'Commercial Rate Card', route: 'commercial-rate-card' },
  { label: 'Sales Dispatch', route: 'sales-dispatch' },
  { label: 'Quote Pack', route: 'quote-pack' },
  { label: 'Sign & Issue', route: 'issuance' },
];

// ─── Gate icon ────────────────────────────────────────────────────────────────

function GateIcon({ status }: { status: GateStatus }) {
  if (status === GateStatus.PASS) return <CheckCircle2 className="size-3.5 text-green-600 shrink-0" />;
  if (status === GateStatus.WARN) return <AlertTriangle className="size-3.5 text-amber-500 shrink-0" />;
  return <XCircle className="size-3.5 text-destructive shrink-0" />;
}

// ─── Milestone dot ────────────────────────────────────────────────────────────

function MilestoneDot({ state }: { state: MilestoneState }) {
  const base = 'size-3 rounded-full shrink-0';
  if (state === MilestoneState.DONE) return <span className={`${base} bg-primary`} />;
  if (state === MilestoneState.IN_PROGRESS) return <span className={`${base} border-2 border-primary bg-primary/20`} />;
  if (state === MilestoneState.WARNING) return <span className={`${base} bg-amber-400`} />;
  if (state === MilestoneState.BLOCKED) return <span className={`${base} bg-destructive/60`} />;
  return <span className={`${base} border border-muted-foreground/30 bg-muted`} />;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function RfqDetailPage() {
  const { bundle } = useRfqBundle();
  const pathname = usePathname();
  const router = useRouter();

  // bundle is guaranteed non-null here — layout shows loading/error before rendering children
  if (!bundle) return null;

  const rfqId = bundle.rfqId;
  const base = `/rfqs/${rfqId}`;

  const readiness = computeReadinessGates(bundle);
  const freeze = computeFreezeState(bundle);
  const milestones = computeMilestoneSpine(bundle);
  const journeySteps = computeJourneySteps(bundle, pathname ?? '');

  const planCount = bundle.plans.length;
  const memberCount = bundle.members.length;
  const docCount = bundle.documents.length;
  const versionCount = bundle.quoteVersions.length;

  // Bucket pass % for launchpad tiles
  const bucketPassPct = (bucketNo: number) => {
    const bucket = readiness.buckets.find((b) => b.bucketNo === bucketNo);
    if (!bucket) return 0;
    const passing = bucket.gates.filter((g) => g.status === GateStatus.PASS).length;
    return Math.round((passing / bucket.gates.length) * 100);
  };

  const tileTone = (pct: number) => {
    if (pct === 100) return 'text-green-700 bg-green-50 border-green-200';
    if (pct >= 50) return 'text-amber-700 bg-amber-50 border-amber-200';
    if (pct > 0) return 'text-orange-700 bg-orange-50 border-orange-200';
    return 'text-muted-foreground bg-muted/30 border-border';
  };

  const tileToneLabel = (pct: number) => {
    if (pct === 100) return 'On Track';
    if (pct >= 50) return 'In Progress';
    if (pct > 0) return 'Started';
    return 'Pending';
  };

  const tileCountLabel = (key: typeof LAUNCHPAD_TILES[number]['countKey']) => {
    if (key === 'versions') return `${versionCount} version${versionCount !== 1 ? 's' : ''}`;
    if (key === 'members') return `${memberCount} member${memberCount !== 1 ? 's' : ''}`;
    if (key === 'plans') return `${planCount} plan${planCount !== 1 ? 's' : ''}`;
    if (key === 'documents') return `${docCount} doc${docCount !== 1 ? 's' : ''}`;
    return null;
  };

  return (
    <div className="flex flex-col gap-5 px-6 py-5 max-w-5xl mx-auto w-full">

      {/* ── (2) DEAL HEADER ───────────────────────────────────────────────── */}
      <div className="rounded-xl border border-border bg-card p-5">
        {/* Top row */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex flex-col gap-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-muted-foreground font-mono">{rfqId}</span>
              <Badge variant="outline" className="text-[10px]">{bundle.businessType}</Badge>
              <Badge variant={STATUS_TONE[bundle.statusStage]} className="text-[10px]">
                {STATUS_LABELS[bundle.statusStage]}
              </Badge>
            </div>
            <h1 className="text-xl font-bold truncate">{bundle.employerName}</h1>
            <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
              {bundle.quoteSegment && <span>{bundle.quoteSegment}</span>}
              {bundle.effectiveDate && <span>Eff. {bundle.effectiveDate}</span>}
              <span>{planCount} plan{planCount !== 1 ? 's' : ''}</span>
              <span>{memberCount} member{memberCount !== 1 ? 's' : ''}</span>
              <span>{docCount} doc{docCount !== 1 ? 's' : ''}</span>
            </div>
          </div>
          {/* Issue Policy CTA */}
          <div className="flex flex-col items-end gap-1">
            <Button
              size="sm"
              disabled={!readiness.issuanceReady}
              onClick={() => router.push(`${base}/issuance`)}
            >
              Issue Policy
            </Button>
            {!readiness.issuanceReady && (
              <span className="text-[10px] text-muted-foreground text-right">
                {readiness.failingCount} gate{readiness.failingCount !== 1 ? 's' : ''} failing — see readiness checklist below
              </span>
            )}
          </div>
        </div>

        {/* Action links row */}
        <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-border/40">
          {[
            { label: 'Policy Profile', route: 'profile' },
            { label: 'Key Data', route: 'key-data' },
            { label: 'Quote Versions', route: 'versions' },
            { label: 'Census Workbench', route: 'census-workbench' },
            { label: 'Quote Pack', route: 'quote-pack' },
          ].map(({ label, route }) => (
            <Button key={route} variant="outline" size="sm" asChild className="text-xs h-7">
              <Link href={`${base}/${route}`}>{label}</Link>
            </Button>
          ))}
        </div>
      </div>

      {/* ── (3) FREEZE BANNER ────────────────────────────────────────────────── */}
      {freeze.isFrozen ? (
        <div className="flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-blue-800">
          <Snowflake className="size-4 shrink-0 mt-0.5" />
          <p className="text-xs leading-relaxed">
            <span className="font-medium">Version &ldquo;{freeze.frozenVersion?.name}&rdquo; is frozen</span>
            {' '}— policy detail, quote pack and issuance are unlocked.
          </p>
        </div>
      ) : (
        <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-amber-800">
          <Info className="size-4 shrink-0 mt-0.5" />
          <p className="text-xs leading-relaxed">
            Freeze the broker-aligned version to unlock policy creation.{' '}
            <Link href={`${base}/versions`} className="underline font-medium">Go to Quote Versions →</Link>
          </p>
        </div>
      )}

      {/* ── (4) MILESTONE SPINE ──────────────────────────────────────────────── */}
      <div className="rounded-xl border border-border bg-card p-5">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">Milestone Spine</h2>
        <div className="flex flex-col gap-0">
          {milestones.map((m, idx) => {
            const isBoundary = m.milestoneNo === 10;
            return (
              <div key={m.milestoneNo}>
                {isBoundary && (
                  <div className="flex items-center gap-2 my-2">
                    <div className="h-px flex-1 bg-border" />
                    <span className="text-[10px] text-muted-foreground px-2 bg-background rounded-full border border-border">
                      Quotation / PIM boundary
                    </span>
                    <div className="h-px flex-1 bg-border" />
                  </div>
                )}
                <div className="flex items-start gap-3 py-1.5">
                  <div className="flex flex-col items-center gap-0 mt-1">
                    <MilestoneDot state={m.state} />
                    {idx < milestones.length - 1 && (
                      <div className={`w-px flex-1 min-h-[14px] ${m.state === MilestoneState.DONE ? 'bg-primary/40' : 'bg-border'}`} />
                    )}
                  </div>
                  <div className="flex items-center gap-2 pb-1">
                    <span className="text-[10px] text-muted-foreground w-6">M{m.milestoneNo}</span>
                    <span className={`text-xs ${m.state === MilestoneState.DONE ? 'text-foreground' : m.state === MilestoneState.IN_PROGRESS ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
                      {m.label}
                    </span>
                    {m.state === MilestoneState.IN_PROGRESS && (
                      <Badge variant="default" className="text-[9px] h-4 px-1.5">Active</Badge>
                    )}
                    {m.milestoneNo >= 10 && (
                      <Badge variant="secondary" className="text-[9px] h-4 px-1.5">PIM</Badge>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── (5) JOURNEY STEPPER ──────────────────────────────────────────────── */}
      <div className="rounded-xl border border-border bg-card p-5">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">Journey Steps</h2>
        <div className="flex flex-wrap gap-1.5">
          {journeySteps.map((s) => {
            const isBlocked = s.status === 'blocked';
            const isDone = s.status === 'done';
            const isCurrent = s.status === 'current';
            return (
              <Link
                key={s.stepNo}
                href={isBlocked ? '#' : s.route}
                onClick={(e) => isBlocked && e.preventDefault()}
                title={s.label}
                className={`group flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs border transition-colors ${
                  isCurrent ? 'bg-primary text-primary-foreground border-primary font-medium' :
                  isDone ? 'bg-primary/10 text-primary border-primary/20 hover:bg-primary/15' :
                  isBlocked ? 'bg-muted/30 text-muted-foreground border-border/30 cursor-not-allowed' :
                  'bg-background text-muted-foreground border-border hover:bg-muted hover:text-foreground'
                }`}
              >
                {isBlocked ? <Lock className="size-2.5" /> : null}
                <span className="text-[10px] opacity-60">{s.stepNo}</span>
                <span className="hidden sm:inline">{s.label}</span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* ── (6) READINESS CHECKLIST ──────────────────────────────────────────── */}
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Readiness Checklist</h2>
          {readiness.failingCount > 0 ? (
            <span className="text-xs text-destructive font-medium">
              {readiness.failingCount} bucket{readiness.failingCount !== 1 ? 's' : ''} failing
            </span>
          ) : (
            <span className="text-xs text-green-600 font-medium flex items-center gap-1">
              <CheckCircle2 className="size-3.5" /> All gates passing
            </span>
          )}
        </div>
        <div className="flex flex-col gap-4">
          {readiness.buckets.map((bucket) => (
            <div key={bucket.bucketNo}>
              <div className="flex items-center gap-2 mb-1.5">
                <GateIcon status={bucket.overall} />
                <span className="text-xs font-medium">{bucket.label}</span>
                <Link
                  href={`${base}/${BUCKET_FIX_ROUTES[bucket.bucketNo] ?? 'key-data'}`}
                  className="ml-auto text-[10px] text-primary hover:underline"
                >
                  Open →
                </Link>
              </div>
              <div className="flex flex-col gap-1 pl-5">
                {bucket.gates.map((g) => (
                  <div key={g.key} className="flex items-start gap-2">
                    <GateIcon status={g.status} />
                    <span className={`text-xs ${g.status === GateStatus.PASS ? 'text-muted-foreground' : 'text-foreground'}`}>
                      {g.label}
                    </span>
                    {g.status !== GateStatus.PASS && g.detail && (
                      <span className="text-[10px] text-muted-foreground">— {g.detail}</span>
                    )}
                    {g.status === GateStatus.FAIL && (
                      <Link
                        href={`${base}/${BUCKET_FIX_ROUTES[bucket.bucketNo] ?? 'key-data'}`}
                        className="ml-auto text-[10px] text-primary hover:underline shrink-0"
                      >
                        Fix
                      </Link>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── (7) WORKBENCH LAUNCHPAD ───────────────────────────────────────────── */}
      <div className="rounded-xl border border-border bg-card p-5">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">Workbench</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {LAUNCHPAD_TILES.map(({ label, route, bucketNo, icon: Icon, countKey }) => {
            const pct = bucketPassPct(bucketNo);
            const tone = tileTone(pct);
            const toneLabel = tileToneLabel(pct);
            const countLabel = tileCountLabel(countKey);
            return (
              <Link
                key={route}
                href={`${base}/${route}`}
                className={`flex flex-col gap-2 rounded-lg border p-4 hover:shadow-sm transition-shadow cursor-pointer ${tone}`}
              >
                <div className="flex items-center justify-between">
                  <Icon className="size-4 opacity-70" />
                  <span className="text-[10px] font-medium opacity-70">{toneLabel}</span>
                </div>
                <p className="text-xs font-semibold leading-tight">{label}</p>
                <div className="flex items-center gap-1.5 mt-auto">
                  <div className="h-1 flex-1 bg-black/10 rounded-full overflow-hidden">
                    <div className="h-full bg-current opacity-60 rounded-full transition-all" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-[10px] font-mono opacity-70">{pct}%</span>
                </div>
                {countLabel && (
                  <span className="text-[10px] opacity-60">{countLabel}</span>
                )}
              </Link>
            );
          })}
        </div>
      </div>

      {/* ── (8) QUICK NAVIGATION ─────────────────────────────────────────────── */}
      <div className="rounded-xl border border-border bg-card p-5">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Quick Navigation</h2>
        <div className="flex flex-wrap gap-2">
          {QUICK_LINKS.map(({ label, route }) => (
            <Link
              key={route}
              href={`${base}/${route}`}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground hover:underline transition-colors px-2 py-1 rounded border border-transparent hover:border-border"
            >
              {label}
              <ChevronRight className="size-3 opacity-50" />
            </Link>
          ))}
        </div>
      </div>

    </div>
  );
}

