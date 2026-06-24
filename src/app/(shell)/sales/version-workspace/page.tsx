'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  ChevronRight,
  CheckCircle2,
  XCircle,
  Clock,
  Lock,
  AlertTriangle,
  ArrowRight,
  Copy,
  ExternalLink,
  FileText,
  Layers,
  BarChart2,
  Send,
  Users,
  Cpu,
  ClipboardList,
  SlidersHorizontal,
  Check,
  ArrowLeftRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  VW_DEMO,
  VW_DEMO_REFERRED_UW,
  VW_DEMO_RATED,
  type SalesVersionWorkspace,
  type VWStatus,
  type UWOutcome,
  type PricingOutcome,
} from '@/mocks/sales-version-workspace';

// ─── Demo "today" ─────────────────────────────────────────────────────────────
const TODAY = new Date('2026-06-18T12:00:00Z');

function daysDiff(from?: string): number {
  if (!from) return 0;
  return Math.round((TODAY.getTime() - new Date(from).getTime()) / 86_400_000);
}
function daysUntil(iso: string): number {
  return Math.round((new Date(iso).getTime() - TODAY.getTime()) / 86_400_000);
}
function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}
function fmtINR(n: number): string {
  if (n >= 10_000_000) return `₹${(n / 10_000_000).toFixed(2)}Cr`;
  if (n >= 100_000)    return `₹${(n / 100_000).toFixed(2)}L`;
  return `₹${n.toLocaleString('en-IN')}`;
}

// ─── Status metadata ──────────────────────────────────────────────────────────
const STATUS_BADGE: Record<VWStatus, { label: string; cls: string }> = {
  DRAFT:               { label: 'Draft',              cls: 'bg-slate-100 text-slate-600' },
  IN_PROGRESS:         { label: 'Active',             cls: 'bg-indigo-50 text-indigo-700' },
  REFERRED_UW:         { label: 'With Underwriter',   cls: 'bg-amber-100 text-amber-800' },
  REFERRED_PRICING:    { label: 'With Actuary',       cls: 'bg-amber-100 text-amber-800' },
  EVALUATED:           { label: 'UW Evaluated',       cls: 'bg-green-50 text-green-700' },
  RATED:               { label: 'Priced',             cls: 'bg-green-100 text-green-700' },
  SUBMITTED:           { label: 'Submitted',          cls: 'bg-blue-50 text-blue-700' },
  SENT_TO_CLIENT:      { label: 'Sent to Client',     cls: 'bg-blue-100 text-blue-800' },
  ACCEPTED:            { label: 'Accepted',           cls: 'bg-emerald-600 text-white' },
  FINALIZED:           { label: 'Finalised',          cls: 'bg-emerald-50 text-emerald-700' },
  REJECTED:            { label: 'Rejected',           cls: 'bg-red-100 text-red-700' },
  WITHDRAWN:           { label: 'Withdrawn',          cls: 'bg-slate-100 text-slate-500' },
  SUPERSEDED:          { label: 'Superseded',         cls: 'bg-slate-100 text-slate-500' },
};

const TERMINAL: VWStatus[] = ['FINALIZED', 'REJECTED', 'WITHDRAWN', 'SUPERSEDED'];
const REFERRED: VWStatus[] = ['REFERRED_UW', 'REFERRED_PRICING'];
const isTerminal = (s: VWStatus) => TERMINAL.includes(s);
const isReferred = (s: VWStatus) => REFERRED.includes(s);

function getStatusHeadline(v: SalesVersionWorkspace): { text: string; color: string } {
  const days = v.daysInCurrentState;
  const by = v.referredBy ? ` by ${v.referredBy}` : '';
  switch (v.status) {
    case 'DRAFT':
    case 'IN_PROGRESS':
      return { text: 'Configure this version\'s plans, census, and coverage to begin evaluation.', color: 'text-muted-foreground' };
    case 'EVALUATED':
      return { text: 'Underwriting approved. Request actuary pricing to continue.', color: 'text-emerald-600' };
    case 'REFERRED_UW':
      return { text: `Awaiting underwriter review · Referred ${days} day${days !== 1 ? 's' : ''} ago${by}.`, color: 'text-amber-600' };
    case 'REFERRED_PRICING':
      return { text: `Awaiting actuary review · Referred ${days} day${days !== 1 ? 's' : ''} ago${by}.`, color: 'text-amber-600' };
    case 'RATED':
      return { text: 'Priced by actuary. Calculate premium and submit to client.', color: 'text-emerald-600' };
    case 'SUBMITTED':
      return { text: 'Submitted. Send the quote document to the client.', color: 'text-blue-600' };
    case 'SENT_TO_CLIENT':
      return { text: `Sent to ${v.clientName} ${v.sentAt ? daysDiff(v.sentAt) : days} days ago. Awaiting their response.`, color: 'text-blue-600' };
    case 'ACCEPTED':
      return { text: 'Client accepted this version. Finalise to hand off to Policy Issuance.', color: 'text-emerald-600' };
    case 'FINALIZED':
      return { text: `Finalised on ${v.finalizedAt ? fmtDate(v.finalizedAt) : '—'}.`, color: 'text-emerald-600' };
    case 'REJECTED':
      return { text: 'Client rejected this version. Clone to rework or withdraw.', color: 'text-red-600' };
    case 'WITHDRAWN':
      return { text: `This version was withdrawn on ${v.withdrawnAt ? fmtDate(v.withdrawnAt) : '—'}.`, color: 'text-muted-foreground' };
    case 'SUPERSEDED':
      return { text: 'Superseded when a newer version was finalised.', color: 'text-muted-foreground' };
    default:
      return { text: '', color: 'text-muted-foreground' };
  }
}

function getHeaderCTA(v: SalesVersionWorkspace): { label: string; cls: string; show: boolean; isLocked?: boolean } {
  if (isReferred(v.status)) {
    const who = v.status === 'REFERRED_UW' ? 'Underwriter' : 'Actuary';
    return { label: `V${v.versionNo} with ${who}`, cls: 'bg-amber-100 text-amber-800 border border-amber-300 cursor-default', show: true, isLocked: true };
  }
  if (isTerminal(v.status)) {
    return { label: 'Clone Version', cls: 'border border-border text-foreground hover:bg-muted', show: true };
  }
  switch (v.status) {
    case 'DRAFT':
    case 'IN_PROGRESS':
      return { label: 'Run UW Check', cls: 'bg-blue-600 hover:bg-blue-700 text-white', show: true };
    case 'EVALUATED':
      return { label: 'Request Pricing', cls: 'bg-blue-600 hover:bg-blue-700 text-white', show: true };
    case 'RATED':
      return v.premium.calculated
        ? { label: 'Submit Version', cls: 'bg-blue-600 hover:bg-blue-700 text-white', show: true }
        : { label: 'Calculate Premium', cls: 'bg-blue-600 hover:bg-blue-700 text-white', show: true };
    case 'SUBMITTED':
      return { label: 'Send to Client', cls: 'bg-blue-600 hover:bg-blue-700 text-white', show: true };
    case 'SENT_TO_CLIENT':
      return { label: 'Mark Accepted', cls: 'bg-emerald-600 hover:bg-emerald-700 text-white', show: true };
    case 'ACCEPTED':
      return { label: 'Finalise Version', cls: 'bg-emerald-600 hover:bg-emerald-700 text-white', show: true };
    default:
      return { label: '', cls: '', show: false };
  }
}

// ─── Progress steps ───────────────────────────────────────────────────────────
const PROGRESS_STEPS: { key: VWStatus; label: string }[] = [
  { key: 'DRAFT',          label: 'Draft' },
  { key: 'EVALUATED',      label: 'UW Evaluated' },
  { key: 'RATED',          label: 'Rated' },
  { key: 'SUBMITTED',      label: 'Submitted' },
  { key: 'SENT_TO_CLIENT', label: 'Sent' },
  { key: 'ACCEPTED',       label: 'Accepted' },
  { key: 'FINALIZED',      label: 'Finalised' },
];
const STEP_ORDER = PROGRESS_STEPS.map((s) => s.key);
function stepIndex(s: VWStatus): number {
  const i = STEP_ORDER.indexOf(s);
  return i >= 0 ? i : 0;
}

// ─── Elapsed ticker ───────────────────────────────────────────────────────────
function ElapsedTicker({ referredAt }: { referredAt?: string }) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 30_000);
    return () => clearInterval(id);
  }, []);
  const base = referredAt ? (TODAY.getTime() - new Date(referredAt).getTime()) : 0;
  const ms = base + tick * 30_000;
  const totalMins = Math.floor(ms / 60_000);
  const days = Math.floor(totalMins / 1440);
  const hours = Math.floor((totalMins % 1440) / 60);
  const mins = totalMins % 60;
  return <span>{days}d {hours}h {mins}m</span>;
}

// ─── Readiness checks ─────────────────────────────────────────────────────────
function useReadiness(v: SalesVersionWorkspace) {
  return [
    { label: 'Plans configured',    ok: v.plans.length > 0,                         tab: 'plans'    },
    { label: 'Census set',          ok: v.hasCensus,                                tab: 'census'   },
    { label: 'UW evaluated',        ok: v.uwStatus.outcome !== 'NOT_EVALUATED',      tab: 'uw'       },
    { label: 'Pricing rated',       ok: v.pricingStatus.outcome !== 'NOT_EVALUATED', tab: 'pricing'  },
    { label: 'Premium calculated',  ok: v.premium.calculated,                        tab: 'premium'  },
    { label: 'Fields complete',     ok: v.hasFieldsComplete,                         tab: 'info'     },
  ];
}

// ─── State switcher (demo only) ───────────────────────────────────────────────
type DemoState = 'ACCEPTED' | 'REFERRED_UW' | 'RATED';
const DEMO_STATES: DemoState[] = ['ACCEPTED', 'REFERRED_UW', 'RATED'];
function applyDemoState(base: SalesVersionWorkspace, state: DemoState): SalesVersionWorkspace {
  if (state === 'REFERRED_UW') return { ...base, ...VW_DEMO_REFERRED_UW } as SalesVersionWorkspace;
  if (state === 'RATED')       return { ...base, ...VW_DEMO_RATED }       as SalesVersionWorkspace;
  return base;
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function SalesVersionWorkspacePage() {
  const [demoState, setDemoState] = useState<DemoState>('ACCEPTED');
  const [activeTab, setActiveTab] = useState('cockpit');

  const v = applyDemoState(VW_DEMO, demoState);
  const badge = STATUS_BADGE[v.status];
  const headline = getStatusHeadline(v);
  const cta = getHeaderCTA(v);
  const isDraft = v.status === 'DRAFT' || v.status === 'IN_PROGRESS';
  const showProgressBar = !isTerminal(v.status) && !isReferred(v.status);
  const currentStep = stepIndex(v.status);
  const daysLeft = daysUntil(v.expiresAt);
  const readiness = useReadiness(v);

  // Default tab based on state
  useEffect(() => {
    setActiveTab(isDraft ? 'plans' : 'cockpit');
  }, [isDraft]);

  return (
    <div className="flex flex-col h-full overflow-hidden">

      {/* ── Demo state switcher ──────────────────────────────────────────── */}
      <div className="shrink-0 flex items-center gap-2 px-5 py-1.5 bg-muted/40 border-b border-border/30 text-xs text-muted-foreground">
        <span className="font-medium">Demo state:</span>
        {DEMO_STATES.map((s) => (
          <button
            key={s}
            onClick={() => setDemoState(s)}
            className={cn(
              'px-2.5 py-0.5 rounded-full border text-[11px] transition-colors',
              demoState === s ? 'bg-foreground text-background border-foreground' : 'border-border hover:text-foreground',
            )}
          >
            {s}
          </button>
        ))}
      </div>

      {/* ── Sticky header ─────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-20 bg-background border-b border-border/60 shrink-0">

        {/* Breadcrumb */}
        <div className="flex items-center gap-1.5 px-5 pt-3 pb-1 text-xs text-muted-foreground">
          <Link href="/sales/quotes" className="hover:text-foreground">Quotes</Link>
          <ChevronRight className="size-3" />
          <Link href="/sales/quote-detail" className="hover:text-foreground">{v.clientName}</Link>
          <ChevronRight className="size-3" />
          <span className="text-muted-foreground">{v.quoteNo}</span>
          <ChevronRight className="size-3" />
          <span className="text-foreground font-medium">V{v.versionNo}</span>
        </div>

        {/* Header row */}
        <div className="flex items-start justify-between px-5 pt-1 pb-3 gap-4">
          {/* Left */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="font-mono text-2xl font-black text-foreground leading-none">V{v.versionNo}</span>
              <span className="text-sm font-semibold text-foreground">{v.versionLabel}</span>
              <span className={cn('text-xs font-semibold rounded-full px-2.5 py-0.5', badge.cls)}>
                {badge.label}
              </span>
            </div>
            <p className={cn('text-sm font-medium mt-1.5', headline.color)}>{headline.text}</p>
          </div>

          {/* Right: premium chip + CTA stacked */}
          <div className="shrink-0 flex flex-col items-end gap-2 pt-0.5">
            {v.premium.calculated && v.premium.amount && !isTerminal(v.status) && (
              <div className="rounded-xl border-2 border-emerald-200 bg-emerald-50 px-3 py-1.5 text-center">
                <p className="text-xl font-bold text-emerald-700 tabular-nums leading-none">
                  {fmtINR(v.premium.amount)}
                </p>
                <p className="text-[10px] text-emerald-600 mt-0.5">/ yr · incl. GST</p>
              </div>
            )}
            {cta.show && (
              <button
                className={cn(
                  'h-8 px-4 rounded-lg text-sm font-semibold transition-colors whitespace-nowrap',
                  v.status === 'ACCEPTED' && 'animate-pulse',
                  cta.cls,
                )}
              >
                {cta.label}
              </button>
            )}
            {v.status === 'SENT_TO_CLIENT' && (
              <button className="h-7 px-3 rounded-lg text-xs font-medium border border-red-300 text-red-600 hover:bg-red-50 transition-colors">
                Mark Rejected
              </button>
            )}
          </div>
        </div>

        {/* Locked banner — REFERRED states */}
        {isReferred(v.status) && (
          <div className="flex items-center gap-3 px-5 py-2.5 bg-amber-50 border-t border-amber-200 text-sm text-amber-800">
            <Lock className="size-4 shrink-0 text-amber-600" />
            <span>
              <strong>Locked</strong> — {v.status === 'REFERRED_UW' ? 'Underwriter' : 'Actuary'} review in progress
              {v.referredAt && <> · Referred on {fmtDate(v.referredAt)}{v.referredBy ? ` by ${v.referredBy}` : ''}</>}
              {' · '}
              <span className="font-mono text-xs bg-amber-100 px-1.5 py-0.5 rounded">
                <ElapsedTicker referredAt={v.referredAt} />
              </span>
            </span>
          </div>
        )}

        {/* Progress bar */}
        {showProgressBar && (
          <div className="px-5 pb-3 pt-1">
            <div className="flex items-center">
              {PROGRESS_STEPS.map((step, idx) => {
                const past = idx < currentStep;
                const current = idx === currentStep;
                return (
                  <React.Fragment key={step.key}>
                    <div className="flex flex-col items-center gap-1 shrink-0">
                      <div className={cn(
                        'flex items-center justify-center rounded-full border-2 transition-all',
                        past    ? 'size-5 bg-primary border-primary' :
                        current ? 'size-5 bg-primary border-primary ring-2 ring-primary/25' :
                                  'size-4 bg-transparent border-border',
                      )}>
                        {past && <Check className="size-2.5 text-white" strokeWidth={3} />}
                      </div>
                      <span className={cn(
                        'text-[9px] whitespace-nowrap',
                        current ? 'font-bold text-primary' : past ? 'text-foreground/60' : 'text-muted-foreground/40',
                      )}>
                        {step.label}
                      </span>
                    </div>
                    {idx < PROGRESS_STEPS.length - 1 && (
                      <div className={cn('h-0.5 flex-1 mx-1 mb-4', past ? 'bg-primary' : 'bg-border/50')} />
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ── Tabs ──────────────────────────────────────────────────────────── */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 min-h-0 flex flex-col overflow-hidden">
        <div className="shrink-0 px-5 border-b border-border/40 overflow-x-auto scrollbar-none">
          <TabsList className="h-9 bg-transparent p-0 gap-0 flex items-end">
            {!isDraft && (
              <TabsTrigger value="cockpit" className={tabCls(activeTab === 'cockpit')}>
                <Layers className="size-3.5 mr-1.5" />Deal Cockpit
              </TabsTrigger>
            )}
            <TabsTrigger value="plans" className={tabCls(activeTab === 'plans')}>
              <ClipboardList className="size-3.5 mr-1.5" />Plans
            </TabsTrigger>
            <TabsTrigger value="census" className={tabCls(activeTab === 'census')}>
              <Users className="size-3.5 mr-1.5" />Census
            </TabsTrigger>
            <TabsTrigger value="uw" className={tabCls(activeTab === 'uw')}>
              <SlidersHorizontal className="size-3.5 mr-1.5" />UW Evaluation
            </TabsTrigger>
            <TabsTrigger value="pricing" className={tabCls(activeTab === 'pricing')}>
              <BarChart2 className="size-3.5 mr-1.5" />Pricing
            </TabsTrigger>
            <TabsTrigger value="premium" className={tabCls(activeTab === 'premium')}>
              <Cpu className="size-3.5 mr-1.5" />Premium
            </TabsTrigger>
            <TabsTrigger value="submit" className={tabCls(activeTab === 'submit')}>
              <Send className="size-3.5 mr-1.5" />Submit & Send
            </TabsTrigger>
            <TabsTrigger value="docs" className={tabCls(activeTab === 'docs')}>
              <FileText className="size-3.5 mr-1.5" />Documents
            </TabsTrigger>
            <TabsTrigger value="rounds" className={tabCls(activeTab === 'rounds')}>
              <ArrowLeftRight className="size-3.5 mr-1.5" />Round Log
            </TabsTrigger>
          </TabsList>
        </div>

        {/* ── Deal Cockpit ─────────────────────────────────────────────── */}
        <TabsContent value="cockpit" className="flex-1 min-h-0 overflow-y-auto mt-0 p-5">
          <div className="max-w-4xl space-y-4">

            {/* 2×2 grid */}
            <div className="grid grid-cols-2 gap-4">
              {/* Card 1: Plans */}
              <CockpitCard
                title="Plans"
                link="View Plans"
                onLink={() => setActiveTab('plans')}
              >
                {v.plans.length === 0 ? (
                  <p className="text-sm text-red-600">No plans configured</p>
                ) : (
                  <div className="space-y-2">
                    {v.plans.map((p) => (
                      <div key={p.id} className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <span className="text-sm font-medium text-foreground">{p.name}</span>
                          <span className={cn('ml-2 text-[10px] font-semibold rounded px-1.5 py-0.5', 'bg-indigo-50 text-indigo-700')}>
                            {p.baseProduct}
                          </span>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {p.riderCount} rider{p.riderCount !== 1 ? 's' : ''} · SA: {p.sumAssuredBasis}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CockpitCard>

              {/* Card 2: UW Status */}
              <CockpitCard
                title="Underwriting"
                link="View Detail"
                onLink={() => setActiveTab('uw')}
              >
                <UWStatusContent outcome={v.uwStatus.outcome} status={v.uwStatus} plans={v.plans} />
              </CockpitCard>

              {/* Card 3: Pricing */}
              <CockpitCard
                title="Pricing"
                link="View Detail"
                onLink={() => setActiveTab('pricing')}
              >
                <PricingStatusContent outcome={v.pricingStatus.outcome} status={v.pricingStatus} onReview={() => setActiveTab('pricing')} />
              </CockpitCard>

              {/* Card 4: Premium */}
              <CockpitCard title="Premium">
                {v.premium.calculated && v.premium.amount ? (
                  <>
                    {v.premium.isStale && (
                      <div className="flex items-center gap-1.5 mb-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1.5">
                        <AlertTriangle className="size-3.5 shrink-0" />
                        Premium is stale — recalculate
                        <button className="ml-auto text-amber-700 underline">Recalculate</button>
                      </div>
                    )}
                    <p className="text-3xl font-black text-emerald-600 tabular-nums leading-none">
                      {fmtINR(v.premium.amount)}
                    </p>
                    <p className="text-sm text-muted-foreground mt-0.5">/ year</p>
                    {v.premium.perLife && (
                      <p className="text-xs text-muted-foreground mt-1">
                        ₹{v.premium.perLife.toLocaleString('en-IN')} per life
                      </p>
                    )}
                    {v.premium.calculatedDaysAgo !== undefined && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Calculated {v.premium.calculatedDaysAgo} day{v.premium.calculatedDaysAgo !== 1 ? 's' : ''} ago
                      </p>
                    )}
                    <button
                      onClick={() => setActiveTab('premium')}
                      className="mt-2 flex items-center gap-1 text-xs text-primary hover:underline"
                    >
                      View breakdown <ArrowRight className="size-3" />
                    </button>
                  </>
                ) : (
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Not yet calculated</p>
                    {v.status === 'RATED' && (
                      <Button size="sm" className="h-7 text-xs">Calculate Premium</Button>
                    )}
                  </div>
                )}
              </CockpitCard>
            </div>

            {/* Readiness checklist */}
            {!isTerminal(v.status) && !isReferred(v.status) && v.status !== 'SUBMITTED' && v.status !== 'SENT_TO_CLIENT' && v.status !== 'ACCEPTED' && (
              <div className="rounded-xl border border-border bg-card p-4">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                  Version Readiness
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {readiness.map((item) => (
                    <div
                      key={item.label}
                      className={cn(
                        'flex items-center gap-2 rounded-lg border px-3 py-2',
                        item.ok ? 'border-emerald-200 bg-emerald-50/60' : 'border-red-200 bg-red-50/60',
                      )}
                    >
                      {item.ok ? (
                        <CheckCircle2 className="size-3.5 text-emerald-500 shrink-0" />
                      ) : (
                        <XCircle className="size-3.5 text-red-400 shrink-0" />
                      )}
                      {item.ok ? (
                        <span className="text-xs text-foreground">{item.label}</span>
                      ) : (
                        <button
                          onClick={() => setActiveTab(item.tab)}
                          className="text-xs text-red-600 hover:underline text-left"
                        >
                          {item.label} →
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Full-width cockpit CTA */}
            <CockpitCTA version={v} />

            {/* Metadata panel */}
            <div className="rounded-xl border border-border bg-card p-4 space-y-2.5">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Version Info
              </p>
              <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                <InfoRow label="Elapsed in state" value={`${v.daysInCurrentState} day${v.daysInCurrentState !== 1 ? 's' : ''}`} />
                <InfoRow label="UW rounds" value={`${v.uwRounds} round${v.uwRounds !== 1 ? 's' : ''}`} />
                <InfoRow label="Pricing rounds" value={`${v.pricingRounds} round${v.pricingRounds !== 1 ? 's' : ''}`} />
                <InfoRow
                  label="Quote expires"
                  value={fmtDate(v.expiresAt)}
                  valueClass={daysLeft <= 14 ? 'text-amber-600 font-medium' : undefined}
                />
              </div>
            </div>
          </div>
        </TabsContent>

        {/* ── Plans tab (placeholder) ───────────────────────────────────── */}
        <TabsContent value="plans" className="flex-1 min-h-0 overflow-y-auto mt-0 p-5">
          <PlaceholderTab title="Plans" description="Plan configurator — define coverage, sum assured, riders." />
        </TabsContent>
        <TabsContent value="census" className="flex-1 min-h-0 overflow-y-auto mt-0 p-5">
          <PlaceholderTab title="Census & Mapping" description="Upload and map member census data." />
        </TabsContent>
        <TabsContent value="uw" className="flex-1 min-h-0 overflow-y-auto mt-0 p-5">
          <UWTab v={v} />
        </TabsContent>
        <TabsContent value="pricing" className="flex-1 min-h-0 overflow-y-auto mt-0 p-5">
          <PricingTab v={v} />
        </TabsContent>
        <TabsContent value="premium" className="flex-1 min-h-0 overflow-y-auto mt-0 p-5">
          <PlaceholderTab title="Premium" description="View calculated premium breakdown by plan and life." />
        </TabsContent>
        <TabsContent value="submit" className="flex-1 min-h-0 overflow-y-auto mt-0 p-5">
          <PlaceholderTab title="Submit & Send" description="Submit version to insurer and send quote to client." />
        </TabsContent>
        <TabsContent value="docs" className="flex-1 min-h-0 overflow-y-auto mt-0 p-5">
          <PlaceholderTab title="Documents" description="Quote-level and version-level document store." />
        </TabsContent>
        <TabsContent value="rounds" className="flex-1 min-h-0 overflow-y-auto mt-0 p-5">
          <RoundLogTab v={v} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ─── Tab class helper ─────────────────────────────────────────────────────────
function tabCls(active: boolean) {
  return cn(
    'h-9 px-3 rounded-none border-b-2 border-transparent text-xs font-medium flex items-center transition-colors',
    'data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none',
    'text-muted-foreground hover:text-foreground',
  );
}

// ─── Cockpit card ─────────────────────────────────────────────────────────────
function CockpitCard({
  title,
  link,
  onLink,
  children,
}: {
  title: string;
  link?: string;
  onLink?: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 flex flex-col gap-3 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{title}</p>
        {link && onLink && (
          <button onClick={onLink} className="flex items-center gap-1 text-xs text-primary hover:underline">
            {link} <ArrowRight className="size-3" />
          </button>
        )}
      </div>
      <div className="flex-1">{children}</div>
    </div>
  );
}

// ─── UW status content ────────────────────────────────────────────────────────
function UWStatusContent({
  outcome,
  status,
  plans,
}: {
  outcome: UWOutcome;
  status: typeof VW_DEMO.uwStatus;
  plans: typeof VW_DEMO.plans;
}) {
  switch (outcome) {
    case 'AUTO_APPROVED':
      return (
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-sm text-emerald-700">
            <CheckCircle2 className="size-4" />
            <span>Auto-approved{status.approvedAt ? ` · ${fmtDate(status.approvedAt)}` : ''}</span>
          </div>
          {plans.some((p) => p.fcl) && (
            <table className="w-full text-xs mt-2 border-collapse">
              <thead>
                <tr className="border-b border-border/40">
                  <th className="text-left text-muted-foreground font-medium pb-1">Plan</th>
                  <th className="text-left text-muted-foreground font-medium pb-1">FCL</th>
                  <th className="text-left text-muted-foreground font-medium pb-1">NML</th>
                </tr>
              </thead>
              <tbody>
                {plans.map((p) => (
                  <tr key={p.id} className="border-b border-border/20">
                    <td className="py-1 pr-2 truncate max-w-[80px]">{p.name}</td>
                    <td className="py-1 pr-2">{p.fcl ?? '—'}</td>
                    <td className="py-1">{p.nml ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      );
    case 'REFERRED':
      return (
        <div className="flex items-center gap-1.5 text-sm text-amber-700">
          <Clock className="size-4" />
          <span>With underwriter · {status.elapsedDays}d · Round {status.round}</span>
        </div>
      );
    case 'REJECTED':
      return (
        <div className="flex items-center gap-1.5 text-sm text-red-600">
          <XCircle className="size-4" />
          <span>{status.rejectionReason ?? 'Rejected'}</span>
        </div>
      );
    default:
      return <p className="text-sm text-muted-foreground">Not evaluated yet</p>;
  }
}

// ─── Pricing status content ───────────────────────────────────────────────────
function PricingStatusContent({
  outcome,
  status,
  onReview,
}: {
  outcome: PricingOutcome;
  status: typeof VW_DEMO.pricingStatus;
  onReview: () => void;
}) {
  switch (outcome) {
    case 'AUTO_RATED':
      return (
        <div className="flex items-center gap-1.5 text-sm text-emerald-700">
          <CheckCircle2 className="size-4" />
          <span>Auto-rated{status.approvedAt ? ` · ${fmtDate(status.approvedAt)}` : ''}</span>
        </div>
      );
    case 'MANUAL_APPROVED':
      return (
        <div className="flex items-center gap-1.5 text-sm text-emerald-700">
          <CheckCircle2 className="size-4" />
          <span>Approved by {status.approvedBy} · Round {status.round}</span>
        </div>
      );
    case 'REFERRED':
      return (
        <div className="flex items-center gap-1.5 text-sm text-amber-700">
          <Clock className="size-4" />
          <span>With actuary · {status.elapsedDays}d · Round {status.round}</span>
        </div>
      );
    case 'COUNTER':
      return (
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-sm text-purple-700">
            <ArrowLeftRight className="size-4" />
            <span>Actuary countered · Awaiting your decision</span>
          </div>
          <button onClick={onReview} className="flex items-center gap-1 text-xs text-primary hover:underline">
            Review Counter <ArrowRight className="size-3" />
          </button>
        </div>
      );
    case 'REJECTED':
      return (
        <div className="flex items-center gap-1.5 text-sm text-red-600">
          <XCircle className="size-4" />
          <span>Pricing round rejected</span>
        </div>
      );
    default:
      return <p className="text-sm text-muted-foreground">Not evaluated yet</p>;
  }
}

// ─── Full-width cockpit CTA ────────────────────────────────────────────────────
function CockpitCTA({ version: v }: { version: SalesVersionWorkspace }) {
  if (isTerminal(v.status)) return null;

  if (isReferred(v.status)) {
    return (
      <button disabled className="w-full h-12 rounded-xl border border-border bg-muted text-sm text-muted-foreground font-medium cursor-not-allowed flex items-center justify-center gap-2">
        <Lock className="size-4" />
        Locked — awaiting review
      </button>
    );
  }

  if (v.status === 'SENT_TO_CLIENT') {
    return (
      <div className="flex gap-3">
        <button className="flex-1 h-12 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm transition-colors">
          Mark Accepted
        </button>
        <button className="w-1/3 h-12 rounded-xl border border-red-300 text-red-600 hover:bg-red-50 font-medium text-sm transition-colors">
          Mark Rejected
        </button>
      </div>
    );
  }

  const CTAs: Partial<Record<VWStatus, { label: string; cls: string }>> = {
    ACCEPTED:       { label: 'Finalise Version', cls: 'bg-emerald-600 hover:bg-emerald-700 text-white animate-pulse' },
    RATED:          { label: v.premium.calculated ? 'Submit Version' : 'Calculate Premium', cls: 'bg-blue-600 hover:bg-blue-700 text-white' },
    SUBMITTED:      { label: 'Send to Client', cls: 'bg-blue-600 hover:bg-blue-700 text-white' },
    EVALUATED:      { label: 'Request Pricing', cls: 'bg-blue-600 hover:bg-blue-700 text-white' },
    DRAFT:          { label: 'Run UW Check', cls: 'bg-blue-600 hover:bg-blue-700 text-white' },
    IN_PROGRESS:    { label: 'Run UW Check', cls: 'bg-blue-600 hover:bg-blue-700 text-white' },
  };

  const action = CTAs[v.status];
  if (!action) return null;

  return (
    <button className={cn('w-full h-12 rounded-xl font-semibold text-sm transition-colors', action.cls)}>
      {action.label}
    </button>
  );
}

// ─── UW Tab ───────────────────────────────────────────────────────────────────
function UWTab({ v }: { v: SalesVersionWorkspace }) {
  return (
    <div className="max-w-2xl space-y-4">
      <div className="rounded-xl border border-border bg-card p-4">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">
          UW Evaluation Result
        </p>
        <UWStatusContent outcome={v.uwStatus.outcome} status={v.uwStatus} plans={v.plans} />
      </div>
      {v.plans.some((p) => p.fcl) && (
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">
            FCL / NML by Plan
          </p>
          <table className="w-full text-sm border-collapse">
            <thead className="border-b border-border">
              <tr>
                <th className="text-left text-xs text-muted-foreground font-medium pb-2">Plan</th>
                <th className="text-left text-xs text-muted-foreground font-medium pb-2">FCL</th>
                <th className="text-left text-xs text-muted-foreground font-medium pb-2">NML</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {v.plans.map((p) => (
                <tr key={p.id}>
                  <td className="py-2 font-medium">{p.name}</td>
                  <td className="py-2 text-muted-foreground">{p.fcl ?? '—'}</td>
                  <td className="py-2 text-muted-foreground">{p.nml ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Pricing Tab ──────────────────────────────────────────────────────────────
function PricingTab({ v }: { v: SalesVersionWorkspace }) {
  const isCounter = v.pricingStatus.outcome === 'COUNTER';
  return (
    <div className="max-w-2xl space-y-4">
      {isCounter && (
        <div className="rounded-xl border border-purple-200 bg-purple-50 p-4 space-y-3">
          <p className="text-sm font-semibold text-purple-800">
            Actuary has proposed a counter rate card. Review and decide.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead className="border-b border-purple-200">
                <tr>
                  <th className="text-left text-xs text-purple-700 font-medium pb-2 pr-4"></th>
                  <th className="text-left text-xs text-purple-700 font-medium pb-2 pr-4">Your Proposed Rate</th>
                  <th className="text-left text-xs text-purple-700 font-medium pb-2">Actuary's Counter</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-purple-100">
                <tr>
                  <td className="py-2 pr-4 text-xs text-muted-foreground">Est. Premium</td>
                  <td className="py-2 pr-4 font-medium">{v.premium.amount ? fmtINR(v.premium.amount) : '—'}/yr</td>
                  <td className="py-2 font-medium text-amber-700 bg-amber-50/60 px-2">
                    {v.pricingStatus.counterProposedPremium ? fmtINR(v.pricingStatus.counterProposedPremium) : '—'}/yr
                  </td>
                </tr>
                <tr>
                  <td className="py-2 pr-4 text-xs text-muted-foreground">Delta</td>
                  <td className="py-2 pr-4 text-muted-foreground">—</td>
                  <td className="py-2 font-medium text-amber-700 bg-amber-50/60 px-2">
                    {v.pricingStatus.counterDelta ? `+${fmtINR(v.pricingStatus.counterDelta)}/yr (+${v.pricingStatus.counterDeltaPct?.toFixed(1)}%)` : '—'}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <div className="flex gap-3 mt-2">
            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white">Accept Counter</Button>
            <Button variant="outline" className="border-red-300 text-red-600 hover:bg-red-50">Reject & Revise</Button>
          </div>
        </div>
      )}
      <div className="rounded-xl border border-border bg-card p-4">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">
          Pricing Status
        </p>
        <PricingStatusContent outcome={v.pricingStatus.outcome} status={v.pricingStatus} onReview={() => {}} />
      </div>
    </div>
  );
}

// ─── Round Log Tab ────────────────────────────────────────────────────────────
function RoundLogTab({ v }: { v: SalesVersionWorkspace }) {
  return (
    <div className="max-w-2xl">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-4">
        {v.roundLog.length} round{v.roundLog.length !== 1 ? 's' : ''}
      </p>
      <div className="space-y-0">
        {v.roundLog.map((entry, i) => (
          <div key={i} className="flex gap-3 pb-5">
            {/* Timeline dot + line */}
            <div className="flex flex-col items-center shrink-0 pt-1">
              <span className={cn(
                'size-2.5 rounded-full shrink-0',
                entry.type === 'UW' ? 'bg-indigo-500' : 'bg-teal-500',
              )} />
              {i < v.roundLog.length - 1 && (
                <div className="w-px flex-1 bg-border/50 mt-1.5" />
              )}
            </div>
            {/* Content */}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={cn(
                  'text-[10px] font-bold rounded-md px-1.5 py-0.5 shrink-0',
                  entry.type === 'UW' ? 'bg-indigo-50 text-indigo-700' : 'bg-teal-50 text-teal-700',
                )}>
                  {entry.type} R{entry.roundNo}
                </span>
                <span className="text-sm font-semibold text-foreground">{entry.status}</span>
                <span className="text-xs text-muted-foreground">by {entry.by}</span>
                <span className="text-xs text-muted-foreground ml-auto">{fmtDate(entry.at)}</span>
              </div>
              {entry.note && (
                <p className="text-xs text-muted-foreground mt-1 border-l-2 border-border/50 pl-2">{entry.note}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Placeholder tab ──────────────────────────────────────────────────────────
function PlaceholderTab({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-48 gap-2 text-center">
      <p className="text-sm font-medium text-foreground">{title}</p>
      <p className="text-xs text-muted-foreground max-w-sm">{description}</p>
    </div>
  );
}

// ─── Inline helpers ───────────────────────────────────────────────────────────
function InfoRow({ label, value, valueClass }: { label: string; value: string; valueClass?: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className={cn('text-sm font-medium text-foreground text-right', valueClass)}>{value}</span>
    </div>
  );
}
