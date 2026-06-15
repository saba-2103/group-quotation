'use client';

import { useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRfqBundle } from '@/context/RfqBundleContext';
import { deleteSubsidiary } from '@/lib/api/quotation-client';

export default function DeleteSubsidiaryPage({ params }: { params: Promise<{ rfqId: string; subsidiaryId: string }> }) {
  const { subsidiaryId } = use(params);
  const { bundle, updateBundle } = useRfqBundle();
  const router = useRouter();
  if (!bundle) return null;

  const rfqId = bundle.rfqId;
  const sub = (bundle.subsidiaries ?? []).find((s) => s.subsidiaryId === subsidiaryId);

  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!sub) {
    return (
      <div className="flex flex-col items-center justify-center h-48 gap-3 text-muted-foreground text-sm">
        Subsidiary not found.
        <Button variant="outline" size="sm" onClick={() => router.push(`/rfqs/${rfqId}/subsidiaries`)}>Back</Button>
      </div>
    );
  }

  const handleDelete = async () => {
    setDeleting(true);
    setError(null);
    try {
      await deleteSubsidiary(rfqId, subsidiaryId);
      updateBundle({
        subsidiaries: (bundle.subsidiaries ?? []).filter((s) => s.subsidiaryId !== subsidiaryId),
      });
      router.push(`/rfqs/${rfqId}/subsidiaries`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Delete failed');
      setDeleting(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-6 py-5">
      <div className="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-4 mb-5">
        <AlertTriangle className="size-5 text-destructive shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold">Delete &ldquo;{sub.name}&rdquo;?</p>
          <p className="text-xs text-muted-foreground mt-1">
            This will permanently remove the subsidiary record ({sub.lives.toLocaleString()} lives)
            from this RFQ. The parent policy structure and census data will not be affected,
            but this action cannot be undone.
          </p>
        </div>
      </div>

      <div className="rounded-lg bg-muted/30 border border-border px-4 py-3 text-xs text-muted-foreground mb-5">
        <span className="font-medium">Registration:</span> {sub.registrationNumber ?? '—'}
        &nbsp;·&nbsp;
        <span className="font-medium">Lives:</span> {sub.lives.toLocaleString()}
      </div>

      {error && <p className="mb-3 text-xs text-destructive">{error}</p>}

      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={() => router.push(`/rfqs/${rfqId}/subsidiaries`)} disabled={deleting}>Cancel</Button>
        <Button variant="destructive" size="sm" onClick={handleDelete} disabled={deleting} className="gap-1.5">
          {deleting && <Loader2 className="size-3.5 animate-spin" />}
          Confirm Delete
        </Button>
      </div>
    </div>
  );
}
