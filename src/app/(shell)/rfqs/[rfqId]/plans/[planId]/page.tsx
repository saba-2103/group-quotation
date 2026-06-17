'use client';

import { use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronRight, Pencil, ArrowLeft } from 'lucide-react';
import { useRfqBundle } from '@/context/RfqBundleContext';
import { computePlanCompleteness } from '@/lib/computations';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

const SECTION_LINKS = [
  { label: 'Edit product & timing', step: 'product' },
  { label: 'Edit coverage', step: 'coverage' },
  { label: 'Edit eligibility', step: 'eligibility' },
  { label: 'Edit UW settings', step: 'uw' },
  { label: 'Edit rate card', step: 'pricing' },
  { label: 'Edit deviations', step: 'deviations' },
] as const;

function CompletenessBar({ pct }: { pct: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 w-24 rounded-full bg-muted overflow-hidden">
        <div
          className={cn(
            'h-full rounded-full',
            pct === 100 ? 'bg-green-500' : pct >= 60 ? 'bg-amber-500' : 'bg-destructive'
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-sm tabular-nums font-medium">{pct}%</span>
    </div>
  );
}

export default function PlanDetailPage({
  params,
}: {
  params: Promise<{ rfqId: string; planId: string }>;
}) {
  const { rfqId, planId } = use(params);
  const router = useRouter();
  const { bundle } = useRfqBundle();

  if (!bundle) return null;

  const plan = bundle.plans.find((p) => p.planId === planId);

  if (!plan) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 p-12">
        <p className="text-sm text-muted-foreground">Plan not found</p>
        <Button size="sm" variant="outline" asChild>
          <Link href={`/rfqs/${rfqId}/plans`}>
            <ArrowLeft className="size-4 mr-1.5" /> Back to plans
          </Link>
        </Button>
      </div>
    );
  }

  const completeness = plan.completeness ?? computePlanCompleteness(plan);

  return (
    <div className="flex flex-col gap-6 p-6 max-w-[1000px] mx-auto">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1 text-xs text-muted-foreground">
        <Link href="/rfqs" className="hover:text-foreground transition-colors">RFQs</Link>
        <ChevronRight className="size-3" />
        <Link href={`/rfqs/${rfqId}`} className="hover:text-foreground transition-colors">
          {bundle.employerName}
        </Link>
        <ChevronRight className="size-3" />
        <Link href={`/rfqs/${rfqId}/plans`} className="hover:text-foreground transition-colors">
          Plans
        </Link>
        <ChevronRight className="size-3" />
        <span className="text-foreground font-medium">{plan.name}</span>
      </nav>

      {/* P-DETAIL header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-bold tracking-tight">{plan.name}</h1>
          <div className="flex items-center gap-3 mt-1.5 text-sm text-muted-foreground">
            <span className="font-mono text-xs">{plan.planId}</span>
            {plan.productCode && (
              <>
                <span className="text-border">·</span>
                <span className="font-mono text-xs">{plan.productCode}</span>
              </>
            )}
            <span className="text-border">·</span>
            <span className={cn(
              'text-xs font-medium border rounded-full px-2 py-0.5',
              plan.status === 'ACTIVE' ? 'bg-green-50 text-green-700 border-green-200'
                : plan.status === 'DRAFT' ? 'bg-amber-50 text-amber-700 border-amber-200'
                : 'bg-muted text-muted-foreground border-border'
            )}>
              {plan.status ?? 'DRAFT'}
            </span>
          </div>
        </div>
        <Button
          size="sm"
          onClick={() => router.push(`/rfqs/${rfqId}/plans/new?planId=${planId}`)}
        >
          <Pencil className="size-4 mr-1.5" /> Edit in wizard
        </Button>
      </div>

      {/* Completeness */}
      <div className="rounded-xl border border-border bg-card px-5 py-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">Completeness</h2>
          <CompletenessBar pct={completeness} />
        </div>
      </div>

      {/* Section deep-links */}
      <div className="rounded-xl border border-border bg-card px-5 py-4">
        <h2 className="text-sm font-semibold mb-3">Sections</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {SECTION_LINKS.map(({ label, step }) => (
            <Button
              key={step}
              size="sm"
              variant="outline"
              className="justify-start text-xs h-8"
              onClick={() => router.push(`/rfqs/${rfqId}/plans/new?planId=${planId}&step=${step}`)}
            >
              <Pencil className="size-3 mr-1.5 shrink-0" /> {label}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}
