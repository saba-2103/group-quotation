'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
  FileText, Upload, X, RefreshCw, Check, Loader2,
  Briefcase, User, Building2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { PageHeader } from '@/components/layout/PageHeader';
import { cn } from '@/lib/utils';
import { uploadStore } from '@/lib/upload-store';

// ─── Enums ────────────────────────────────────────────────────────────────────

const DOC_TYPES = [
  { value: 'CENSUS',               label: 'Census' },
  { value: 'CLAIMS_HISTORY',       label: 'Claims History' },
  { value: 'EMPLOYEE_LIST',        label: 'Employee List' },
  { value: 'CURRENT_POLICY_COPY',  label: 'Current Policy Copy' },
  { value: 'BROKER_SUBMISSION',    label: 'Broker Submission' },
  { value: 'AGE_PROOF',            label: 'Age Proof' },
  { value: 'EOI_FORM',             label: 'EOI Form' },
  { value: 'KYC',                  label: 'KYC' },
  { value: 'GST_CERTIFICATE',      label: 'GST Certificate' },
  { value: 'FINAL_PLACEMENT_LETTER', label: 'Final Placement Letter' },
  { value: 'OTHER',                label: 'Other' },
] as const;

const DOC_SOURCES = [
  { value: 'BROKER',   label: 'Broker',   desc: 'Received from the intermediary', icon: Briefcase },
  { value: 'CLIENT',   label: 'Client',   desc: 'Provided directly by the client', icon: User },
  { value: 'INTERNAL', label: 'Internal', desc: 'Generated or collected in-house',  icon: Building2 },
] as const;

function fmtBytes(b: number): string {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(0)} KB`;
  return `${(b / (1024 * 1024)).toFixed(1)} MB`;
}

function typeLabel(value: string): string {
  return DOC_TYPES.find((t) => t.value === value)?.label ?? value;
}

// ─── Field wrapper ────────────────────────────────────────────────────────────

function Field({
  label, required, hint, children,
}: {
  label: string; required?: boolean; hint?: string; children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label className="text-xs font-medium">
        {label}
        {required && <span className="text-destructive ml-0.5">*</span>}
      </Label>
      {children}
      {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DocumentUploadPage() {
  const router = useRouter();
  const params = useParams<{ rfqId: string }>();
  const rfqId = params.rfqId;

  const replaceRef = useRef<HTMLInputElement>(null);
  const pickRef    = useRef<HTMLInputElement>(null);

  const [file,          setFile]          = useState<File | null>(null);
  const [docType,       setDocType]       = useState<string>('CENSUS');
  const [docSource,     setDocSource]     = useState<string>('BROKER');
  const [docName,       setDocName]       = useState('');
  const [linkedEntity,  setLinkedEntity]  = useState('');
  const [uploadPct,     setUploadPct]     = useState(0);
  const [uploadDone,    setUploadDone]    = useState(false);

  // Read pending file from store on mount; redirect if missing.
  // deps intentionally empty — this must only run once.
  // Do NOT clear the store here; React Strict Mode mounts effects twice,
  // so clearing here causes the second mount to see null and redirect.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    const f = uploadStore.getFile();
    if (!f) {
      router.replace(`/rfq2/${rfqId}?tab=documents`);
      return;
    }
    setFile(f);
    setDocName(f.name);
  }, []);

  // ── Simulate upload progress whenever file changes ────────────────────────
  useEffect(() => {
    if (!file) return;
    setUploadPct(0);
    setUploadDone(false);
    const iv = setInterval(() => {
      setUploadPct((prev) => {
        const inc = prev < 60 ? 9 : prev < 85 ? 5 : prev < 95 ? 2 : 1;
        const next = Math.min(prev + inc, 100);
        if (next === 100) { clearInterval(iv); setUploadDone(true); }
        return next;
      });
    }, 100);
    return () => clearInterval(iv);
  }, [file]);

  // ── Replace resets name ───────────────────────────────────────────────────
  const handleReplace = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setDocName(f.name);
    e.target.value = '';
  };

  const handleRemove = () => {
    uploadStore.setFile(null);
    setFile(null);
    setUploadPct(0);
    setUploadDone(false);
  };

  const handleCancel = () => {
    uploadStore.setFile(null);
    router.push(`/rfq2/${rfqId}?tab=documents`);
  };

  const handleSubmit = () => {
    if (!file || !uploadDone) return;
    const ext = file.name.split('.').pop()?.toUpperCase() ?? '—';
    uploadStore.setFile(null);
    uploadStore.push({
      id: `doc-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      name: docName.trim() || file.name,
      size: file.size,
      ext,
      source: docSource,
      uploadedAt: new Date().toISOString(),
    });
    router.push(`/rfq2/${rfqId}?tab=documents`);
  };

  const ext = file?.name.split('.').pop()?.toUpperCase() ?? '';

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="shrink-0 border-b border-border/40">
        <PageHeader
          title="Upload Document"
          subtitle="Add metadata before attaching the file to this quote"
          actions={
            <>
              <Button variant="ghost" size="sm" onClick={handleCancel}>Cancel</Button>
              <Button
                size="sm"
                disabled={!file || !uploadDone}
                className="gap-1.5"
                onClick={handleSubmit}
              >
                {!uploadDone && file
                  ? <Loader2 className="size-3.5 animate-spin" />
                  : <Check className="size-3.5" />}
                {!uploadDone && file ? 'Uploading…' : 'Submit'}
              </Button>
            </>
          }
        />
      </div>

      {/* Body */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="max-w-xl mx-auto px-6 py-8 flex flex-col gap-6">

          {/* File preview + upload progress */}
          {file ? (
            <div className="rounded-xl border border-border bg-muted/20 p-4 flex flex-col gap-3">
              <div className="flex items-start gap-3">
                <div className="size-10 rounded-lg bg-muted border border-border flex items-center justify-center shrink-0">
                  <FileText className="size-5 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground leading-tight truncate">{file.name}</p>
                  <div className="flex items-center gap-2 mt-1">
                    {ext && (
                      <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold bg-muted/40 text-muted-foreground border-border/60">
                        {ext}
                      </span>
                    )}
                    <span className="text-[11px] text-muted-foreground tabular-nums">{fmtBytes(file.size)}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <Button size="sm" variant="outline" className="h-7 gap-1.5 text-xs" onClick={() => replaceRef.current?.click()}>
                    <RefreshCw className="size-3" /> Replace
                  </Button>
                  <Button size="icon" variant="ghost" className="size-7 text-muted-foreground hover:text-destructive" onClick={handleRemove}>
                    <X className="size-3.5" />
                  </Button>
                  <input ref={replaceRef} type="file" className="hidden" onChange={handleReplace} />
                </div>
              </div>

              {/* Progress bar */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <span className={cn(
                    'text-[11px] font-medium transition-colors',
                    uploadDone ? 'text-emerald-600' : 'text-muted-foreground',
                  )}>
                    {uploadDone ? 'Upload complete' : 'Uploading…'}
                  </span>
                  <div className="flex items-center gap-1.5">
                    {!uploadDone && (
                      <span className="text-[11px] font-semibold tabular-nums text-muted-foreground">
                        {uploadPct}%
                      </span>
                    )}
                    {uploadDone && <Check className="size-3.5 text-emerald-600" />}
                  </div>
                </div>
                <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className={cn('h-full rounded-full transition-all duration-150', uploadDone ? 'bg-emerald-500' : 'bg-primary')}
                    style={{ width: `${uploadPct}%` }}
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border-2 border-dashed border-border h-[112px] flex items-center justify-center">
              <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={() => pickRef.current?.click()}>
                <Upload className="size-3.5" /> Choose file
              </Button>
              <input
                ref={pickRef}
                type="file"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  setFile(f);
                  setDocName(f.name);
                  e.target.value = '';
                }}
              />
            </div>
          )}

          {/* Form fields — always visible */}
          <div className="flex flex-col gap-5">

              {/* Document name — first, defaults to filename */}
              <Field label="Document name" hint="Defaults to the filename if left blank">
                <Input
                  value={docName}
                  onChange={(e) => setDocName(e.target.value)}
                  placeholder={file ? file.name : 'e.g. Census_2026.xlsx'}
                  className="text-sm h-9"
                />
              </Field>

              {/* Document type */}
              <Field label="Document type" required>
                <Select value={docType} onValueChange={setDocType}>
                  <SelectTrigger className="text-sm h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {DOC_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value} className="text-sm">{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              {/* Source — clickable cards */}
              <Field label="Source" required>
                <div className="grid grid-cols-3 gap-2">
                  {DOC_SOURCES.map(({ value, label, desc, icon: Icon }) => {
                    const selected = docSource === value;
                    return (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setDocSource(value)}
                        className={cn(
                          'flex flex-col gap-1.5 rounded-xl border-2 p-3 text-left transition-all',
                          selected
                            ? 'border-foreground/50 bg-muted/60 shadow-sm'
                            : 'border-border bg-card hover:border-foreground/20 hover:bg-muted/40',
                        )}
                      >
                        <Icon className={cn('size-4', selected ? 'text-foreground' : 'text-muted-foreground')} />
                        <p className="text-[11px] font-semibold text-foreground">{label}</p>
                        <p className="text-[10px] text-muted-foreground leading-snug">{desc}</p>
                      </button>
                    );
                  })}
                </div>
              </Field>

              {/* Linked entity */}
              <Field label="Linked entity" hint='Defaults to "policy" if left blank'>
                <Input
                  value={linkedEntity}
                  onChange={(e) => setLinkedEntity(e.target.value)}
                  placeholder="policy"
                  className="text-sm h-9"
                />
              </Field>

            </div>
        </div>
      </div>
    </div>
  );
}
