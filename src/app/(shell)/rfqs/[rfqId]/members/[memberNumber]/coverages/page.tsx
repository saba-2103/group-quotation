'use client';

import { use } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useRfqBundle } from '@/context/RfqBundleContext';

export default function MemberCoveragesPage({ params }: { params: Promise<{ memberNumber: string }> }) {
  const { memberNumber } = use(params);
  const { bundle } = useRfqBundle();
  const router = useRouter();
  if (!bundle) return null;

  const rfqId = bundle.rfqId;
  const member = bundle.members.find((m) => m.memberNumber === memberNumber);

  if (!member) {
    return (
      <div className="flex flex-col items-center justify-center h-48 gap-3 text-muted-foreground text-sm">
        Member not found.
        <Button variant="outline" size="sm" onClick={() => router.push(`/rfqs/${rfqId}/members`)}>Back</Button>
      </div>
    );
  }

  const planMap = new Map(bundle.plans.map((p) => [p.planId, p.name]));

  return (
    <div className="max-w-3xl mx-auto px-6 py-5">
      <div className="mb-5">
        <h1 className="text-base font-semibold">Coverages — {member.name}</h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          {member.memberNumber} · {member.coverages.length} coverage record{member.coverages.length !== 1 ? 's' : ''}
        </p>
      </div>

      {member.coverages.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-12 rounded-xl border border-dashed border-border text-muted-foreground">
          <p className="text-sm">No coverages assigned to this member</p>
          <p className="text-xs">Coverages are created when plans are bound to members</p>
        </div>
      ) : (
        <div className="rounded-xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/30 border-b border-border">
                {['Coverage ID', 'Plan', 'Status', 'Sum Assured'].map((h) => (
                  <th key={h} className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {member.coverages.map((c) => (
                <tr key={c.coverageId} className="border-b border-border/30 last:border-0 hover:bg-muted/20">
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{c.coverageId}</td>
                  <td className="px-4 py-3">{planMap.get(c.planId) ?? c.planId}</td>
                  <td className="px-4 py-3">{c.status}</td>
                  <td className="px-4 py-3 tabular-nums">
                    {c.sumAssured > 0 ? `₹${c.sumAssured.toLocaleString()}` : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Button variant="outline" size="sm" className="mt-4"
        onClick={() => router.push(`/rfqs/${rfqId}/members`)}>
        ← Back to members
      </Button>
    </div>
  );
}
