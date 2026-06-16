'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ChevronRight, Copy, Send, Lock, Plus, Pencil, Trash2,
  Check, AlertTriangle, ChevronDown, ChevronUp,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { mockVersionDetail } from '@/lib/mock/version-detail-mock';

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ExploreVersionDetailPage() {
  const router = useRouter();
  const data = mockVersionDetail;

  const [status, setStatus] = useState<'PRICED' | 'FROZEN'>(data.status as 'PRICED' | 'FROZEN');
  const [showFreezeConfirm, setShowFreezeConfirm] = useState(false);

  function handleFreeze() {
    setStatus('FROZEN');
    setShowFreezeConfirm(false);
  }

  return (
    <div className="flex flex-col h-full overflow-hidden bg-[#F7F8FA]">
      {/* BAND 1 — Page Header */}
      <div className="shrink-0 sticky top-0 z-10 bg-white border-b border-border/40 px-5 py-3">
        <div className="flex items-center gap-2 text-sm">
          <button
            onClick={() => router.push(`/rfq2/explore/${data.rfqId}`)}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            {data.rfqId} / {data.dealName}
          </button>
          <ChevronRight className="size-3.5 text-muted-foreground" />
          <span className="font-medium text-foreground">V{data.versionNumber} — {data.label}</span>
        </div>
      </div>

      {/* Freeze confirmation banner */}
      {showFreezeConfirm && (
        <div className="shrink-0 bg-amber-50 border-b border-amber-200 px-5 py-3 flex items-center gap-3">
          <AlertTriangle className="size-4 text-amber-600 shrink-0" />
          <span className="text-sm text-amber-900 flex-1">
            Are you sure you want to freeze V{data.versionNumber}? This cannot be undone.
          </span>
          <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white text-xs h-7" onClick={handleFreeze}>
            Confirm Freeze
          </Button>
          <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => setShowFreezeConfirm(false)}>
            Cancel
          </Button>
        </div>
      )}

      {/* Scrollable content */}
      <div className="flex-1 min-h-0 overflow-y-auto px-5 py-5">
        <div className="max-w-[1400px] mx-auto flex flex-col gap-4">

          {/* BAND 2 — Version Hero Bar */}
          <VersionHeroBar
            status={status}
            onFreeze={() => setShowFreezeConfirm(true)}
          />

          {/* Summary stat strip */}
          <div className="grid grid-cols-4 gap-3">
            <StatTile label="Plans" value={String(data.summaryStats.planCount)} />
            <StatTile label="Scenarios" value={String(data.summaryStats.scenarioCount)} />
            <StatTile label="Gross Premium" value={data.summaryStats.grossPremium} />
            <StatTile label="Net Premium" value={data.summaryStats.netPremium} />
          </div>

          {/* BAND 3 — Main Content Grid */}
          <div className="grid grid-cols-12 gap-3">
            <div className="col-span-5"><PlansPanel /></div>
            <div className="col-span-4"><CommercialRateCardPanel /></div>
            <div className="col-span-3"><ScenariosPanel /></div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Version Hero Bar ─────────────────────────────────────────────────────────

function VersionHeroBar({ status, onFreeze }: { status: string; onFreeze: () => void }) {
  const data = mockVersionDetail;

  const statusColor = status === 'FROZEN'
    ? 'bg-green-100 text-green-800 border-green-200'
    : 'bg-blue-100 text-blue-800 border-blue-200';

  return (
    <div className="w-full rounded-lg bg-[#EEF1F8] border border-[#D6DCE8] p-5">
      <div className="flex items-start justify-between">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-semibold text-[#1B2B5E]">V{data.versionNumber} — {data.label}</h2>
            <Badge className={cn('text-xs font-semibold', statusColor)}>{status}</Badge>
          </div>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span>Created {data.createdAt} by {data.createdBy.name} ({data.createdBy.role} {data.createdBy.level})</span>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs text-muted-foreground">Based on:</span>
            <Badge variant="outline" className="text-xs">{data.basedOnLabel}</Badge>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" className="gap-1.5 text-xs h-8">
            <Copy className="size-3.5" /> Duplicate Version
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5 text-xs h-8">
            <Send className="size-3.5" /> Dispatch
          </Button>
          <Button
            size="sm"
            className={cn(
              'gap-1.5 text-xs h-9 px-4 font-semibold',
              status === 'FROZEN'
                ? 'bg-muted text-muted-foreground cursor-not-allowed'
                : 'bg-green-600 hover:bg-green-700 text-white',
            )}
            disabled={status === 'FROZEN'}
            onClick={onFreeze}
          >
            <Lock className="size-3.5" /> Freeze Version
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Plans Panel ──────────────────────────────────────────────────────────────

function PlansPanel() {
  const { plans, gradeAllocations } = mockVersionDetail;

  return (
    <Card title={`Plans (${plans.length})`} action={<Button variant="outline" size="sm" className="gap-1 text-xs h-7"><Plus className="size-3" /> Add Plan</Button>}>
      <div className="flex flex-col gap-2 mb-4">
        {plans.map((p) => (
          <div
            key={p.id}
            className={cn(
              'rounded-lg border p-3',
              p.isComplete ? 'border-border/40' : 'border-l-4 border-l-amber-400 border-t-border/40 border-r-border/40 border-b-border/40',
            )}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-sm font-semibold text-foreground">{p.id.toUpperCase()} — {p.name}</span>
              {p.isComplete ? (
                <Badge className="bg-green-100 text-green-700 border-green-200 text-[10px] gap-0.5">
                  <Check className="size-2.5" /> Complete
                </Badge>
              ) : (
                <Badge className="bg-amber-100 text-amber-700 border-amber-200 text-[10px] gap-0.5">
                  <AlertTriangle className="size-2.5" /> Incomplete
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground mb-1">
              <span>Cover Basis: <strong className="text-foreground">{p.coverBasis}</strong></span>
              <span>Sum Assured: <strong className="text-foreground">{p.sumAssured}</strong></span>
              {p.rider && <span>Rider: <strong className="text-foreground">{p.rider}</strong></span>}
            </div>
            <div className="text-xs text-muted-foreground">
              Applicable Grades: <strong className="text-foreground">{p.applicableGrades}</strong>
            </div>
            {!p.isComplete && p.incompleteReason && (
              <div className="text-xs text-amber-700 mt-1.5">Missing: {p.incompleteReason}</div>
            )}
            <div className="flex items-center justify-end gap-1 mt-2">
              {!p.isComplete ? (
                <Button variant="outline" size="sm" className="text-[10px] h-6 px-2">Complete</Button>
              ) : (
                <Button variant="ghost" size="sm" className="text-[10px] h-6 px-2 gap-0.5"><Pencil className="size-2.5" /> Edit</Button>
              )}
              <Button variant="ghost" size="sm" className="text-[10px] h-6 px-2 gap-0.5 text-destructive hover:text-destructive"><Trash2 className="size-2.5" /> Delete</Button>
            </div>
          </div>
        ))}
      </div>

      {/* Grade allocation summary */}
      <div className="border-t border-border/30 pt-3">
        <h5 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Grade Allocation Summary</h5>
        <div className="flex flex-col gap-0">
          <div className="grid grid-cols-4 gap-2 text-[10px] text-muted-foreground font-medium uppercase tracking-wider pb-1.5 border-b border-border/30">
            <span>Grade</span>
            <span className="text-right">Members</span>
            <span className="text-right">SA (Total)</span>
            <span className="text-right">Est. Premium</span>
          </div>
          {gradeAllocations.map((g) => (
            <div key={g.gradeId} className="grid grid-cols-4 gap-2 py-1.5 border-b border-border/20 last:border-0 text-xs">
              <span className="font-medium">{g.gradeName}</span>
              <span className="text-right text-muted-foreground">{g.memberCount.toLocaleString()}</span>
              <span className="text-right text-muted-foreground">{g.totalSA}</span>
              <span className="text-right font-medium">{g.estimatedPremium}</span>
            </div>
          ))}
          <div className="grid grid-cols-4 gap-2 py-1.5 border-t border-border/40 text-xs font-semibold">
            <span>TOTAL</span>
            <span className="text-right">12,400</span>
            <span className="text-right">₹2,890 Cr</span>
            <span className="text-right">₹3.06 Cr (est.)</span>
          </div>
        </div>
        <div className="mt-2">
          <Badge variant="secondary" className="text-[10px]">Final premium post actuary: ₹5.61 Cr</Badge>
        </div>
      </div>
    </Card>
  );
}

// ─── Commercial Rate Card Panel ───────────────────────────────────────────────

function CommercialRateCardPanel() {
  const { actuaryPricing, profitability } = mockVersionDetail;
  const [notesOpen, setNotesOpen] = useState(false);

  return (
    <Card
      title="Commercial Rate Card"
      action={<Badge className="bg-green-100 text-green-700 border-green-200 text-[10px]">Pricing Received</Badge>}
    >
      {/* Actuary Pricing Summary */}
      <div className="mb-4">
        <p className="text-[11px] text-muted-foreground mb-2">Actuary pricing received {actuaryPricing.receivedAt}</p>
        <div className="grid grid-cols-2 gap-x-4 gap-y-2">
          <KV label="Claims Rate (projected)" value={actuaryPricing.claimsRate} />
          <KV label="Mortality Loading" value={actuaryPricing.mortalityLoading} />
          <KV label="Expense Loading" value={actuaryPricing.expenseLoading} />
          <KV label="Gross Premium" value={actuaryPricing.grossPremium} highlight />
          <KV label="Reinsurance" value={`${actuaryPricing.reinsurancePremium} (${actuaryPricing.reinsurancePct})`} />
          <KV label="Net Retained" value={actuaryPricing.netPremium} highlight />
          <KV label="Admin Fee" value={actuaryPricing.adminFee} />
        </div>
      </div>

      {/* Divider — Rate Table */}
      <div className="border-t border-border/30 pt-3 mb-3">
        <h5 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Rate Table by Grade</h5>
        <div className="flex flex-col gap-0">
          <div className="grid grid-cols-4 gap-2 text-[10px] text-muted-foreground font-medium uppercase tracking-wider pb-1.5 border-b border-border/30">
            <span>Grade</span>
            <span className="text-right">Rate/₹1K SA</span>
            <span className="text-right">Total SA</span>
            <span className="text-right">Premium</span>
          </div>
          {actuaryPricing.rateTable.map((r) => (
            <div key={r.grade} className="grid grid-cols-4 gap-2 py-1.5 border-b border-border/20 last:border-0 text-xs">
              <span className="font-medium">{r.grade}</span>
              <span className="text-right text-muted-foreground font-mono">{r.ratePerThousand}</span>
              <span className="text-right text-muted-foreground">{r.totalSA}</span>
              <span className="text-right font-medium">{r.premium}</span>
            </div>
          ))}
          <div className="grid grid-cols-4 gap-2 py-1.5 border-t border-border/40 text-xs font-semibold">
            <span>TOTAL</span>
            <span></span>
            <span></span>
            <span className="text-right">₹5.61 Cr (gross)</span>
          </div>
        </div>
      </div>

      {/* Divider — Profitability */}
      <div className="border-t border-border/30 pt-3 mb-3">
        <h5 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Profitability</h5>
        <div className="grid grid-cols-3 gap-2">
          <KpiTile label="Combined Ratio" value={`${profitability.combinedRatio}%`} good={profitability.combinedRatio < 85} />
          <KpiTile label="Net Margin" value={`${profitability.netMargin}%`} good={profitability.netMargin > 10} />
          <KpiTile label="Reinsurance %" value={`${profitability.reinsurancePct}%`} good={false} neutral />
        </div>
      </div>

      {/* Actuary Notes */}
      <div className="border-t border-border/30 pt-3">
        <button
          onClick={() => setNotesOpen((p) => !p)}
          className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors w-full"
        >
          {notesOpen ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
          Actuary Notes
        </button>
        {notesOpen && (
          <p className="text-xs text-muted-foreground mt-2 leading-relaxed bg-muted/50 rounded-md p-3">
            {actuaryPricing.notes}
          </p>
        )}
      </div>
    </Card>
  );
}

// ─── Scenarios Panel ──────────────────────────────────────────────────────────

function ScenariosPanel() {
  const { scenarios } = mockVersionDetail;

  return (
    <Card title={`Scenarios (${scenarios.length})`} action={<Button variant="outline" size="sm" className="gap-1 text-xs h-7"><Plus className="size-3" /> Add</Button>}>
      <div className="flex flex-col gap-2 mb-3">
        {scenarios.map((s) => (
          <div
            key={s.id}
            className={cn(
              'rounded-lg border p-3',
              s.isAtFloor ? 'border-l-4 border-l-amber-400 border-t-border/40 border-r-border/40 border-b-border/40' : 'border-border/40',
            )}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold text-foreground">{s.id.toUpperCase()} — {s.name}</span>
              {s.isComplete ? (
                <Check className="size-3.5 text-green-600" />
              ) : (
                <AlertTriangle className="size-3.5 text-amber-500" />
              )}
            </div>
            <div className="text-sm font-bold text-[#1B2B5E] mb-1">{s.premium}</div>
            <div className="flex items-center gap-3 text-[11px] text-muted-foreground mb-1">
              <span>Discount: {s.discountPct}</span>
              <span>Margin: {s.marginPct}</span>
            </div>
            <div className="text-[11px] text-muted-foreground">{s.basis}</div>
            <div className="flex items-center gap-1 mt-2 justify-end">
              {s.needsApproval && (
                <Button variant="outline" size="sm" className="text-[10px] h-6 px-2 text-amber-700 border-amber-300 hover:bg-amber-50">
                  Request Override
                </Button>
              )}
              <Button variant="ghost" size="sm" className="text-[10px] h-6 px-2">View</Button>
              <Button variant="ghost" size="sm" className="text-[10px] h-6 px-2 text-destructive hover:text-destructive">Delete</Button>
            </div>
          </div>
        ))}
      </div>

      {/* Comparison strip */}
      <div className="rounded-md bg-amber-50 border border-amber-200 p-2.5 text-[11px] text-amber-800 leading-relaxed">
        <strong>SC3</strong> is ₹0.15 Cr below SC1. Headroom consumed: <strong>96.9%</strong>
      </div>
    </Card>
  );
}

// ─── Utility components ───────────────────────────────────────────────────────

function Card({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border/40 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.08)] p-4 h-full">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-semibold text-foreground">{title}</h4>
        {action}
      </div>
      {children}
    </div>
  );
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border/40 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.08)] px-4 py-3 flex flex-col items-center gap-0.5">
      <span className="text-[11px] text-muted-foreground">{label}</span>
      <span className="text-base font-bold text-[#1B2B5E]">{value}</span>
    </div>
  );
}

function KV({ label, value, highlight, mono }: { label: string; value: string; highlight?: boolean; mono?: boolean }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] text-muted-foreground">{label}</span>
      <span className={cn(
        'text-xs font-medium',
        highlight ? 'text-[#1B2B5E] font-semibold' : 'text-foreground',
        mono && 'font-mono',
      )}>{value}</span>
    </div>
  );
}

function KpiTile({ label, value, good, neutral }: { label: string; value: string; good: boolean; neutral?: boolean }) {
  return (
    <div className={cn(
      'rounded-md p-2.5 text-center border',
      neutral ? 'bg-muted/50 border-border/30' : good ? 'bg-green-50 border-green-200' : 'bg-muted/50 border-border/30',
    )}>
      <div className={cn('text-sm font-bold', good && !neutral ? 'text-green-700' : 'text-foreground')}>
        {value} {good && !neutral && '🟢'}{neutral && '⚪'}
      </div>
      <div className="text-[10px] text-muted-foreground mt-0.5">{label}</div>
    </div>
  );
}
