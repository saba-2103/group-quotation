'use client';

import { useRouter } from 'next/navigation';
import { Plus, BarChart3 } from 'lucide-react';
import { useRfqBundle } from '@/context/RfqBundleContext';
import { useScenarioStore } from '@/stores/scenarioStore';
import { VersionStatus } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

function fmt(n: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency', currency: 'INR', maximumFractionDigits: 0,
  }).format(n);
}

const VERSION_STATUS_COLORS: Record<VersionStatus, string> = {
  [VersionStatus.DRAFT]:    'bg-slate-100 text-slate-700 border-slate-200',
  [VersionStatus.SHARED]:   'bg-blue-50 text-blue-700 border-blue-200',
  [VersionStatus.SELECTED]: 'bg-amber-50 text-amber-700 border-amber-200',
  [VersionStatus.FROZEN]:   'bg-violet-50 text-violet-700 border-violet-200',
  [VersionStatus.ARCHIVED]: 'bg-gray-50 text-gray-500 border-gray-200',
};

export default function ScenariosPage() {
  const router = useRouter();
  const { bundle } = useRfqBundle();
  const { snapshots, remove } = useScenarioStore();

  if (!bundle) return null;

  const rfqId = bundle.rfqId;
  const rfqSnapshots = snapshots.filter((s) => s.rfqId === rfqId);
  const versions = bundle.quoteVersions.filter((v) => v.status !== VersionStatus.ARCHIVED);

  return (
    <div className="flex flex-col gap-6 p-6 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Scenarios</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {bundle.employerName} — version comparison
          </p>
        </div>
        <Button
          size="sm" variant="outline"
          onClick={() => router.push(`/rfqs/${rfqId}/scenarios/new`)}
        >
          <Plus className="size-4 mr-1.5" /> New scenario
        </Button>
      </div>

      {/* P-COMPARE */}
      {versions.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-12 text-center">
          <BarChart3 className="size-8 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No versions to compare. Create versions on the Versions screen.</p>
        </div>
      ) : (
        <div className="overflow-x-auto pb-2">
          <div className="flex gap-4" style={{ minWidth: 'max-content' }}>
            {versions.map((v) => {
              const run = bundle.actuaryPricing.byVersion[v.id];
              const plans = bundle.plans.filter((p) => p.quoteVersionId === v.id);
              const isActive = v.id === bundle.activeVersionId;
              return (
                <div
                  key={v.id}
                  className={cn(
                    'w-64 shrink-0 rounded-xl border bg-card shadow-sm overflow-hidden',
                    isActive ? 'border-primary/40 ring-1 ring-primary/20' : 'border-border'
                  )}
                >
                  <div className="px-4 pt-4 pb-3 border-b border-border/50">
                    <div className="flex items-center justify-between mb-1.5 gap-2">
                      <span className="text-[10px] font-mono text-muted-foreground">V{v.versionNo}</span>
                      {isActive && (
                        <span className="text-[10px] bg-primary/10 text-primary border border-primary/20 rounded-full px-1.5 py-0.5">
                          Active
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-semibold truncate">{v.name}</p>
                    <span className={cn(
                      'text-[10px] font-medium border rounded-full px-2 py-0.5 mt-1.5 inline-block',
                      VERSION_STATUS_COLORS[v.status]
                    )}>
                      {v.status}
                    </span>
                  </div>
                  <div className="px-4 py-3 space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Plans</span>
                      <span className="font-medium">{plans.length}</span>
                    </div>
                    {run ? (
                      <>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Premium (incl. GST)</span>
                          <span className="font-semibold tabular-nums">{fmt(run.finalPremiumInclGst)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Per-life</span>
                          <span className="tabular-nums">{fmt(run.perLifePremium)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Model factor</span>
                          <span className="tabular-nums">{run.modelFactor.toFixed(3)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Feasibility</span>
                          <span className={run.feasible ? 'text-green-600 font-medium' : 'text-destructive font-medium'}>
                            {run.feasible ? '✓ Feasible' : '✗ Not feasible'}
                          </span>
                        </div>
                      </>
                    ) : (
                      <p className="text-muted-foreground italic">Not priced yet</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Saved scenario annotations */}
      {rfqSnapshots.length > 0 && (
        <div className="rounded-xl border border-border bg-card">
          <div className="px-5 py-4 border-b border-border/50">
            <h2 className="text-sm font-semibold">Saved Scenario Annotations</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Session-only — not persisted to backend</p>
          </div>
          <div className="divide-y divide-border/50">
            {rfqSnapshots.map((snap) => (
              <div key={snap.id} className="px-5 py-3 flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-medium">{snap.name}</p>
                  {snap.note && <p className="text-[10px] text-muted-foreground mt-0.5">{snap.note}</p>}
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {new Date(snap.capturedAt).toLocaleString('en-IN')}
                  </p>
                </div>
                <Button
                  size="sm" variant="ghost"
                  className="text-[10px] h-6 px-2 text-destructive hover:text-destructive"
                  onClick={() => remove(snap.id)}
                >
                  Remove
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
