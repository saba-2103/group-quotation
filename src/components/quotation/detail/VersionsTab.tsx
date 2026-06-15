'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowRight,
  Check,
  Copy,
  Layers,
  Plus,
  TriangleAlert,
  X,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { VersionStatusBadge } from '../QuoteStatusBadge';
import { formatDateTime } from '../quoteHelpers';
import { PRODUCT_CATALOG } from '@/mocks/group-pas/quotation/data';
import type { Quote, QuoteVersion, SchemeType } from '@/types/group-pas/quotation-v2';

// ─────────────────────────────────────────────────────────────────────────────

interface VersionsTabProps {
  quote: Quote;
  onCreateVersion: (quoteId: string, baseVersionId: string) => QuoteVersion | null;
  onWithdrawVersion: (versionId: string) => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Path chips
// ─────────────────────────────────────────────────────────────────────────────

function PathChip({ label, value }: { label: string; value: 'AUTO' | 'MANUAL' }) {
  return (
    <span
      className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold ring-1 ring-inset ${
        value === 'AUTO'
          ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
          : 'bg-orange-50 text-orange-700 ring-orange-200'
      }`}
    >
      {label}: {value}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Add Version Modal
// ─────────────────────────────────────────────────────────────────────────────

interface AddVersionModalProps {
  open: boolean;
  onClose: () => void;
  quote: Quote;
  onCreateVersion: (quoteId: string, baseVersionId: string) => QuoteVersion | null;
}

function AddVersionModal({ open, onClose, quote, onCreateVersion }: AddVersionModalProps) {
  const router = useRouter();
  const [mode, setMode] = useState<'scratch' | 'template' | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');

  const availableTemplates = PRODUCT_CATALOG.filter(
    (p) => p.productType === 'BASE' && p.schemeTypes.includes(quote.scheme_type as SchemeType),
  );

  // The "base" for a new version is always the latest version; if none, use a sentinel
  const baseVersionId = quote.versions.at(-1)?.version_id ?? '';

  function handleCreate() {
    if (!baseVersionId) return;
    const newVersion = onCreateVersion(quote.id, baseVersionId);
    if (newVersion) {
      onClose();
      router.push(`/quotation/quotes/${quote.id}/versions/${newVersion.version_id}`);
    }
  }

  function handleClose() {
    setMode(null);
    setSelectedTemplate('');
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Version</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-3 py-2">
          {/* Mode selector */}
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={() => setMode('scratch')}
              className={`flex items-center gap-3 rounded-lg border px-4 py-3 text-sm text-left transition-colors ${
                mode === 'scratch'
                  ? 'border-indigo-500 bg-indigo-50'
                  : 'border-border hover:bg-muted'
              }`}
            >
              <span
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                  mode === 'scratch' ? 'bg-indigo-100 text-indigo-700' : 'bg-muted text-muted-foreground'
                }`}
              >
                {mode === 'scratch' ? <Check className="size-4" /> : <Layers className="size-4" />}
              </span>
              <span>
                <span className="font-medium block">Start from scratch</span>
                <span className="text-xs text-muted-foreground">
                  Empty DRAFT version — build plans from the workbench.
                </span>
              </span>
            </button>

            <button
              type="button"
              onClick={() => setMode('template')}
              className={`flex items-center gap-3 rounded-lg border px-4 py-3 text-sm text-left transition-colors ${
                mode === 'template'
                  ? 'border-indigo-500 bg-indigo-50'
                  : 'border-border hover:bg-muted'
              }`}
            >
              <span
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                  mode === 'template' ? 'bg-indigo-100 text-indigo-700' : 'bg-muted text-muted-foreground'
                }`}
              >
                {mode === 'template' ? <Check className="size-4" /> : <Copy className="size-4" />}
              </span>
              <span>
                <span className="font-medium block">Use PC template</span>
                <span className="text-xs text-muted-foreground">
                  Pre-populate plans from a product template.
                </span>
              </span>
            </button>
          </div>

          {/* Template list */}
          {mode === 'template' && (
            <div className="flex flex-col gap-1.5 ml-1">
              <p className="text-xs font-medium text-muted-foreground">Select template:</p>
              {availableTemplates.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">
                  No base products available for {quote.scheme_type}.
                </p>
              ) : (
                availableTemplates.map((t) => (
                  <button
                    key={t.productCode}
                    type="button"
                    onClick={() => setSelectedTemplate(t.productCode)}
                    className={`flex items-center gap-2 rounded-md border px-3 py-2 text-sm text-left transition-colors ${
                      selectedTemplate === t.productCode
                        ? 'border-indigo-400 bg-indigo-50 text-indigo-800'
                        : 'border-border hover:bg-muted'
                    }`}
                  >
                    <span
                      className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                        selectedTemplate === t.productCode
                          ? 'border-indigo-600 bg-indigo-600 text-white'
                          : 'border-border'
                      }`}
                    >
                      {selectedTemplate === t.productCode && <Check className="size-3" />}
                    </span>
                    <span>
                      <span className="font-medium">{t.productName}</span>
                      <span className="ml-1.5 font-mono text-[10px] text-muted-foreground">
                        {t.productCode}
                      </span>
                    </span>
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            onClick={handleCreate}
            disabled={!mode || (mode === 'template' && !selectedTemplate)}
          >
            Create Version
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Versions Tab
// ─────────────────────────────────────────────────────────────────────────────

export function VersionsTab({ quote, onCreateVersion, onWithdrawVersion }: VersionsTabProps) {
  const router = useRouter();
  const [addModalOpen, setAddModalOpen] = useState(false);

  const sorted = [...quote.versions].sort((a, b) => b.version_number - a.version_number);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          {quote.versions.length} version{quote.versions.length !== 1 ? 's' : ''}
        </p>
        <Button
          size="sm"
          variant="outline"
          className="gap-1.5"
          onClick={() => setAddModalOpen(true)}
          disabled={quote.status === 'WITHDRAWN' || quote.status === 'EXPIRED'}
        >
          <Plus className="size-3.5" />
          Add Version
        </Button>
      </div>

      {sorted.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground border rounded-lg bg-muted/30">
          <Layers className="size-8 opacity-30" />
          <p className="text-sm">No versions yet</p>
        </div>
      ) : (
        <div className="rounded-lg border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="text-xs">
                <TableHead className="w-[100px]">Version</TableHead>
                <TableHead className="w-[160px]">Status</TableHead>
                <TableHead className="w-[180px]">Routing</TableHead>
                <TableHead className="w-[160px]">Premium</TableHead>
                <TableHead className="w-[120px]">Created</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.map((v) => (
                <TableRow key={v.version_id} className="cursor-pointer" onClick={() => router.push(`/quotation/quotes/${quote.id}/versions/${v.version_id}`)}>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="text-sm font-semibold">v{v.version_number}</span>
                      {v.version_label && (
                        <span className="text-[11px] text-muted-foreground">{v.version_label}</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <VersionStatusBadge status={v.status} />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 flex-wrap">
                      <PathChip label="UW" value={v.uw_path} />
                      <PathChip label="Px" value={v.pricing_path} />
                    </div>
                  </TableCell>
                  <TableCell>
                    {v.premium ? (
                      <span className="text-xs font-medium">
                        {new Intl.NumberFormat('en-IN', {
                          style: 'currency',
                          currency: v.premium.totalPremium.currency,
                          maximumFractionDigits: 0,
                        }).format(v.premium.totalPremium.amount)}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className="text-xs text-muted-foreground">
                      {formatDateTime(v.created_at)}
                    </span>
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        title="Open version"
                        onClick={() => router.push(`/quotation/quotes/${quote.id}/versions/${v.version_id}`)}
                      >
                        <ArrowRight className="size-4" />
                      </Button>
                      {(v.status === 'DRAFT' || v.status === 'SUBMITTED') && (
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          title="Withdraw version"
                          className="text-destructive hover:text-destructive"
                          onClick={() => onWithdrawVersion(v.version_id)}
                        >
                          <X className="size-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <AddVersionModal
        open={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        quote={quote}
        onCreateVersion={onCreateVersion}
      />
    </div>
  );
}
