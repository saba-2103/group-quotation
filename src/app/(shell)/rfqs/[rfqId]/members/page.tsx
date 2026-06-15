'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Plus, Clipboard, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRfqBundle } from '@/context/RfqBundleContext';

export default function MembersPage() {
  const { bundle } = useRfqBundle();
  const router = useRouter();
  if (!bundle) return null;

  const rfqId = bundle.rfqId;
  const members = bundle.members;

  const totalLives = members.length;
  const grades = new Set(members.map((m) => m.grade));
  const avgSalary = totalLives > 0
    ? Math.round(members.reduce((s, m) => s + m.salary, 0) / totalLives)
    : 0;
  const avgSA = totalLives > 0
    ? Math.round(members.reduce((s, m) => s + m.sumAssured, 0) / totalLives)
    : 0;

  return (
    <div className="max-w-5xl mx-auto px-6 py-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-base font-semibold">Members</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Step 5 of 21 · Population · {totalLives.toLocaleString()} record{totalLives !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-1.5"
            onClick={() => router.push(`/rfqs/${rfqId}/members/paste`)}>
            <Clipboard className="size-3.5" /> Paste members
          </Button>
          <Button size="sm" className="gap-1.5"
            onClick={() => router.push(`/rfqs/${rfqId}/members/new`)}>
            <Plus className="size-3.5" /> Add member
          </Button>
        </div>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        {[
          { label: 'Total lives', value: totalLives.toLocaleString() },
          { label: 'Grades', value: grades.size.toString() },
          { label: 'Avg salary', value: avgSalary > 0 ? `₹${avgSalary.toLocaleString()}` : '—' },
          { label: 'Avg sum assured', value: avgSA > 0 ? `₹${avgSA.toLocaleString()}` : '—' },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-lg border border-border bg-card px-4 py-3">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</p>
            <p className="text-lg font-semibold mt-0.5">{value}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      {members.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 rounded-xl border border-dashed border-border text-muted-foreground">
          <p className="text-sm">No members yet</p>
          <Button variant="outline" size="sm" asChild>
            <Link href={`/rfqs/${rfqId}/census-workbench`}>Upload via Census Workbench</Link>
          </Button>
        </div>
      ) : (
        <div className="rounded-xl border border-border overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/30 border-b border-border">
                {['Member No', 'Name', 'DoB', 'Gender', 'Grade', 'Salary', 'Sum Assured', 'Cvg', ''].map((h) => (
                  <th key={h} className="text-left px-3 py-2.5 text-xs font-medium text-muted-foreground whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {members.map((m) => (
                <tr key={m.memberNumber} className="border-b border-border/30 last:border-0 hover:bg-muted/20">
                  <td className="px-3 py-2.5 font-mono text-xs text-muted-foreground">{m.memberNumber}</td>
                  <td className="px-3 py-2.5 font-medium">{m.name}</td>
                  <td className="px-3 py-2.5 text-muted-foreground whitespace-nowrap">{m.dateOfBirth}</td>
                  <td className="px-3 py-2.5">{m.gender}</td>
                  <td className="px-3 py-2.5">{m.grade}</td>
                  <td className="px-3 py-2.5 tabular-nums text-right">
                    {m.salary > 0 ? `₹${m.salary.toLocaleString()}` : '—'}
                  </td>
                  <td className="px-3 py-2.5 tabular-nums text-right">
                    {m.sumAssured > 0 ? `₹${m.sumAssured.toLocaleString()}` : '—'}
                  </td>
                  <td className="px-3 py-2.5 text-center">{m.coverages.length}</td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-1 justify-end">
                      <Link
                        href={`/rfqs/${rfqId}/members/${m.memberNumber}/master`}
                        className="text-[10px] text-primary hover:underline whitespace-nowrap"
                      >
                        View
                      </Link>
                      <ChevronRight className="size-3 text-muted-foreground/30" />
                      <Link
                        href={`/rfqs/${rfqId}/members/${m.memberNumber}/coverages`}
                        className="text-[10px] text-primary hover:underline whitespace-nowrap"
                      >
                        Coverages
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
