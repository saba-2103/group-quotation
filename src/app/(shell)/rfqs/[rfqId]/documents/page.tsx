'use client';

import { useRouter } from 'next/navigation';
import { Plus, Lock, ArrowRight, FileText } from 'lucide-react';
import { useRfqBundle } from '@/context/RfqBundleContext';
import { computeFreezeState } from '@/lib/computations';
import { DocumentStatus, DocumentType } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

const DOC_TYPE_LABELS: Record<DocumentType, string> = {
  [DocumentType.SIGNED_PROPOSAL]: 'Signed Proposal',
  [DocumentType.QUOTE_ACCEPTANCE]: 'Quote Acceptance',
  [DocumentType.BOARD_RESOLUTION]: 'Board Resolution',
  [DocumentType.FINAL_PLACEMENT_LETTER]: 'Final Placement Letter',
  [DocumentType.OTHER]: 'Other',
};

const DOC_STATUS_STYLES: Record<DocumentStatus, string> = {
  [DocumentStatus.DRAFT]:    'bg-slate-50 text-slate-700 border-slate-200',
  [DocumentStatus.SIGNED]:   'bg-blue-50 text-blue-700 border-blue-200',
  [DocumentStatus.APPROVED]: 'bg-green-50 text-green-700 border-green-200',
};

export default function DocumentsPage() {
  const router = useRouter();
  const { bundle } = useRfqBundle();

  if (!bundle) return null;

  const { isFrozen } = computeFreezeState(bundle);
  if (!isFrozen) {
    return (
      <div className="p-8 max-w-lg mx-auto">
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-6 py-5 space-y-3">
          <div className="flex items-center gap-2 text-amber-800 font-semibold">
            <Lock className="size-4" /> Freeze required
          </div>
          <p className="text-sm text-amber-700">
            Freeze the broker-aligned version first to access documents.
          </p>
          <Button
            variant="outline" size="sm"
            className="border-amber-300 text-amber-800 hover:bg-amber-100"
            onClick={() => router.push(`/rfqs/${bundle.rfqId}/versions`)}
          >
            Go to Versions <ArrowRight className="size-3.5 ml-1" />
          </Button>
        </div>
      </div>
    );
  }

  const rfqId = bundle.rfqId;
  const docs = bundle.documents ?? [];

  return (
    <div className="flex flex-col gap-6 p-6 max-w-[960px] mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Documents</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{bundle.employerName}</p>
        </div>
        <Button size="sm" onClick={() => router.push(`/rfqs/${rfqId}/documents/new`)}>
          <Plus className="size-4 mr-1.5" /> Add document
        </Button>
      </div>

      {/* P-LIST */}
      <div className="rounded-xl border border-border bg-card">
        {docs.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <FileText className="size-8 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground mb-3">No documents uploaded yet.</p>
            <Button size="sm" variant="outline" onClick={() => router.push(`/rfqs/${rfqId}/documents/new`)}>
              <Plus className="size-4 mr-1.5" /> Add document
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border/50">
                  {['Type', 'Status', 'Name', 'Uploaded At', 'Source', 'Actions'].map((h) => (
                    <th key={h} className="text-left px-4 py-2.5 font-medium text-muted-foreground whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {docs.map((doc) => (
                  <tr key={doc.documentId} className="border-b border-border/30 last:border-0 hover:bg-muted/20">
                    <td className="px-4 py-3 font-medium whitespace-nowrap">
                      {DOC_TYPE_LABELS[doc.type] ?? doc.type}
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn(
                        'text-[10px] font-medium border rounded-full px-2 py-0.5',
                        DOC_STATUS_STYLES[doc.status] ?? 'bg-muted text-muted-foreground border-border'
                      )}>
                        {doc.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 max-w-[200px] truncate">{doc.name}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                      {new Date(doc.uploadedAt).toLocaleDateString('en-IN')}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{doc.source}</td>
                    <td className="px-4 py-3">
                      <Button
                        size="sm" variant="ghost"
                        className="text-[10px] h-6 px-2 text-destructive hover:text-destructive"
                        onClick={() => router.push(`/rfqs/${rfqId}/documents/${doc.documentId}/delete`)}
                      >
                        Delete
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
