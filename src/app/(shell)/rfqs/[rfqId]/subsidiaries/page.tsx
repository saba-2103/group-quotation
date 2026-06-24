'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Plus, Pencil, Trash2, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRfqBundle } from '@/context/RfqBundleContext';

export default function SubsidiariesPage() {
  const { bundle } = useRfqBundle();
  const router = useRouter();
  if (!bundle) return null;

  const rfqId = bundle.rfqId;
  const subs = bundle.subsidiaries ?? [];

  return (
    <div className="max-w-3xl mx-auto px-6 py-5">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-base font-semibold">Subsidiaries</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Step 3 of 21 · Intake · {subs.length} record{subs.length !== 1 ? 's' : ''}</p>
        </div>
        <Button size="sm" className="gap-1.5" onClick={() => router.push(`/rfqs/${rfqId}/subsidiaries/new`)}>
          <Plus className="size-3.5" /> Add Subsidiary
        </Button>
      </div>

      {subs.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 py-16 rounded-xl border border-dashed border-border text-muted-foreground">
          <Building2 className="size-8 opacity-30" />
          <p className="text-sm">No subsidiaries added yet</p>
          <Button variant="outline" size="sm" asChild>
            <Link href={`/rfqs/${rfqId}/subsidiaries/new`}>Add first subsidiary</Link>
          </Button>
        </div>
      ) : (
        <div className="rounded-xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Code</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Name</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Location</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Status</th>
                <th className="w-20 px-4 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {subs.map((sub) => (
                <tr key={sub.subsidiaryId} className="border-b border-border/40 last:border-0 hover:bg-muted/20">
                  <td className="px-4 py-3 font-mono font-semibold text-sm">{sub.code}</td>
                  <td className="px-4 py-3 font-medium">{sub.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{sub.locationMapping ?? '—'}</td>
                  <td className="px-4 py-3 text-muted-foreground">{sub.status}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
                        <Link href={`/rfqs/${rfqId}/subsidiaries/${sub.subsidiaryId}/edit`}>
                          <Pencil className="size-3.5" />
                        </Link>
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" asChild>
                        <Link href={`/rfqs/${rfqId}/subsidiaries/${sub.subsidiaryId}/delete`}>
                          <Trash2 className="size-3.5" />
                        </Link>
                      </Button>
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
