'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, ChevronsUpDown, Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';

import {
  MOCK_BROKERS,
  MOCK_CLIENTS,
  PRODUCT_CATALOG,
} from '@/mocks/group-pas/quotation/data';
import {
  BUSINESS_TYPE_LABEL,
  INTAKE_CHANNEL_LABEL,
} from './quoteHelpers';
import type {
  BusinessType,
  CoverageBasis,
  IndustryHazardBand,
  IntakeChannel,
  Quote,
  SchemeType,
} from '@/types/group-pas/quotation-v2';
import type { Currency } from '@/types/group-pas/common';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type CreateQuoteDraft = Omit<
  Quote,
  'id' | 'quote_number' | 'created_at' | 'last_updated_at' | 'versions' | 'status'
>;

interface NewQuoteDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (draft: CreateQuoteDraft) => Quote;
}

// ─────────────────────────────────────────────────────────────────────────────
// Field helpers
// ─────────────────────────────────────────────────────────────────────────────

function FieldRow({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-col gap-1.5">{children}</div>;
}

function FieldGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-4">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</p>
      {children}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export function NewQuoteDrawer({ open, onOpenChange, onSubmit }: NewQuoteDrawerProps) {
  const router = useRouter();

  // ── form state ─────────────────────────────────────────────────────────────
  const [clientId, setClientId] = useState('');
  const [brokerId, setBrokerId] = useState('');
  const [brokerMandateId, setBrokerMandateId] = useState('');
  const [schemeType, setSchemeType] = useState<SchemeType | ''>('');
  const [businessType, setBusinessType] = useState<BusinessType | ''>('');
  const [currency, setCurrency] = useState<Currency>('INR');
  const [inceptionDate, setInceptionDate] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [coverageBasis, setCoverageBasis] = useState<CoverageBasis | ''>('');
  const [hazardBand, setHazardBand] = useState<IndustryHazardBand | ''>('');
  const [intakeChannel, setIntakeChannel] = useState<IntakeChannel>('SALES_CLICK');
  const [selectedComponents, setSelectedComponents] = useState<string[]>([]);
  const [groupSize, setGroupSize] = useState('');
  const [saPerMember, setSaPerMember] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // ── filtered catalog ───────────────────────────────────────────────────────
  const availableProducts = schemeType
    ? PRODUCT_CATALOG.filter((p) => p.schemeTypes.includes(schemeType as SchemeType))
    : [];

  function toggleComponent(code: string) {
    setSelectedComponents((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );
  }

  // ── validation ─────────────────────────────────────────────────────────────
  function validate(): boolean {
    const next: Record<string, string> = {};
    if (!clientId) next.clientId = 'Client is required';
    if (!schemeType) next.schemeType = 'Scheme type is required';
    if (!businessType) next.businessType = 'Business type is required';
    if (!inceptionDate) next.inceptionDate = 'Intended effective date is required';
    if (!coverageBasis) next.coverageBasis = 'Coverage basis is required';
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  // ── reset ──────────────────────────────────────────────────────────────────
  function reset() {
    setClientId('');
    setBrokerId('');
    setBrokerMandateId('');
    setSchemeType('');
    setBusinessType('');
    setCurrency('INR');
    setInceptionDate('');
    setExpiryDate('');
    setCoverageBasis('');
    setHazardBand('');
    setIntakeChannel('SALES_CLICK');
    setSelectedComponents([]);
    setGroupSize('');
    setSaPerMember('');
    setErrors({});
  }

  // ── submit ─────────────────────────────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    const client = MOCK_CLIENTS.find((c) => c.id === clientId)!;
    const broker = MOCK_BROKERS.find((b) => b.id === brokerId);

    const draft: CreateQuoteDraft = {
      client_id: client.id,
      client_number: client.client_number,
      client_name: client.name,
      broker_id: broker?.id,
      broker_name: broker?.name,
      broker_mandate_id: brokerMandateId || undefined,
      scheme_type: schemeType as SchemeType,
      business_type: businessType as BusinessType,
      currency: currency,
      premium_type: 'ANNUAL',
      intended_inception_date: inceptionDate,
      intended_expiry_date: expiryDate || inceptionDate,
      coverage_basis: coverageBasis as CoverageBasis,
      industry_hazard_band: (hazardBand && (hazardBand as string) !== '_auto') ? hazardBand as IndustryHazardBand : undefined,
      intake_channel: intakeChannel,
      components_requested: selectedComponents,
      estimated_group_size: groupSize ? parseInt(groupSize, 10) : undefined,
      requested_sa_per_member: saPerMember
        ? { amount: parseFloat(saPerMember), currency }
        : undefined,
      line_of_business: schemeType as string,
      created_by: 'current-user',
    } as CreateQuoteDraft;

    setSubmitting(true);
    // Simulate slight delay
    await new Promise((r) => setTimeout(r, 300));
    const newQuote = onSubmit(draft);
    setSubmitting(false);
    reset();
    onOpenChange(false);
    router.push(`/quotation/quotes/${newQuote.id}`);
  }

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) reset();
    onOpenChange(nextOpen);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-xl flex flex-col p-0 gap-0">
        <SheetHeader className="px-6 py-5 border-b border-border">
          <SheetTitle className="text-base">New Quote</SheetTitle>
        </SheetHeader>

        <form
          onSubmit={handleSubmit}
          className="flex-1 overflow-y-auto px-6 py-6 flex flex-col gap-8"
        >
          {/* ── Client & Broker ── */}
          <FieldGroup title="Client & Broker">
            <FieldRow>
              <Label htmlFor="nq-client">
                Client <span className="text-destructive">*</span>
              </Label>
              <Select value={clientId} onValueChange={setClientId}>
                <SelectTrigger id="nq-client" aria-invalid={!!errors.clientId}>
                  <SelectValue placeholder="Search clients…" />
                </SelectTrigger>
                <SelectContent>
                  {MOCK_CLIENTS.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                      <span className="ml-2 text-xs text-muted-foreground">{c.client_number}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.clientId && (
                <p className="text-xs text-destructive">{errors.clientId}</p>
              )}
            </FieldRow>

            <FieldRow>
              <Label htmlFor="nq-broker">Broker (optional)</Label>
              <Select value={brokerId} onValueChange={setBrokerId}>
                <SelectTrigger id="nq-broker">
                  <SelectValue placeholder="Select broker…" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">— None —</SelectItem>
                  {MOCK_BROKERS.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FieldRow>

            {brokerId && brokerId !== '_none' && (
              <FieldRow>
                <Label htmlFor="nq-mandate">Broker Mandate ID (optional)</Label>
                <Input
                  id="nq-mandate"
                  placeholder="e.g. BMI-2026-001"
                  value={brokerMandateId}
                  onChange={(e) => setBrokerMandateId(e.target.value)}
                />
              </FieldRow>
            )}
          </FieldGroup>

          <Separator />

          {/* ── Scheme & Business ── */}
          <FieldGroup title="Scheme & Business">
            <FieldRow>
              <Label>
                Scheme Type <span className="text-destructive">*</span>
              </Label>
              <div className="flex gap-2">
                {(['GTL', 'GCL', 'GH'] as SchemeType[]).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => {
                      setSchemeType(s);
                      setSelectedComponents([]);
                    }}
                    className={`flex-1 rounded-md border px-3 py-2 text-sm font-medium transition-colors ${
                      schemeType === s
                        ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                        : 'border-border bg-background text-foreground hover:bg-muted'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
              {errors.schemeType && (
                <p className="text-xs text-destructive">{errors.schemeType}</p>
              )}
            </FieldRow>

            <FieldRow>
              <Label htmlFor="nq-biz-type">
                Business Type <span className="text-destructive">*</span>
              </Label>
              <Select value={businessType} onValueChange={(v) => setBusinessType(v as BusinessType)}>
                <SelectTrigger id="nq-biz-type" aria-invalid={!!errors.businessType}>
                  <SelectValue placeholder="Select…" />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(BUSINESS_TYPE_LABEL) as BusinessType[]).map((bt) => (
                    <SelectItem key={bt} value={bt}>
                      {BUSINESS_TYPE_LABEL[bt]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.businessType && (
                <p className="text-xs text-destructive">{errors.businessType}</p>
              )}
            </FieldRow>

            <FieldRow>
              <Label htmlFor="nq-currency">Currency</Label>
              <Select value={currency} onValueChange={(v) => setCurrency(v as Currency)}>
                <SelectTrigger id="nq-currency">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(['INR', 'USD', 'GBP', 'AED'] as Currency[]).map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FieldRow>
          </FieldGroup>

          <Separator />

          {/* ── Dates & Coverage ── */}
          <FieldGroup title="Dates & Coverage">
            <FieldRow>
              <Label htmlFor="nq-inception">
                Intended Effective Date <span className="text-destructive">*</span>
              </Label>
              <Input
                id="nq-inception"
                type="date"
                value={inceptionDate}
                onChange={(e) => setInceptionDate(e.target.value)}
                aria-invalid={!!errors.inceptionDate}
              />
              {errors.inceptionDate && (
                <p className="text-xs text-destructive">{errors.inceptionDate}</p>
              )}
            </FieldRow>

            <FieldRow>
              <Label htmlFor="nq-expiry">Intended Expiry Date (optional)</Label>
              <Input
                id="nq-expiry"
                type="date"
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
              />
            </FieldRow>

            <FieldRow>
              <Label htmlFor="nq-coverage-basis">
                Coverage Basis <span className="text-destructive">*</span>
              </Label>
              <Select
                value={coverageBasis}
                onValueChange={(v) => setCoverageBasis(v as CoverageBasis)}
              >
                <SelectTrigger id="nq-coverage-basis" aria-invalid={!!errors.coverageBasis}>
                  <SelectValue placeholder="Select…" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="EMPLOYEE_ONLY">Employee Only</SelectItem>
                  <SelectItem value="EMPLOYEE_SPOUSE">Employee + Spouse</SelectItem>
                  <SelectItem value="EMPLOYEE_SPOUSE_CHILDREN">Employee + Spouse + Children</SelectItem>
                  <SelectItem value="EMPLOYEE_SPOUSE_CHILDREN_PARENTS">Employee + Family (incl. Parents)</SelectItem>
                  <SelectItem value="OTHER">Other (specify in notes)</SelectItem>
                </SelectContent>
              </Select>
              {errors.coverageBasis && (
                <p className="text-xs text-destructive">{errors.coverageBasis}</p>
              )}
            </FieldRow>

            <FieldRow>
              <Label htmlFor="nq-hazard">Industry Hazard Band (optional)</Label>
              <Select
                value={hazardBand}
                onValueChange={(v) => setHazardBand(v as IndustryHazardBand)}
              >
                <SelectTrigger id="nq-hazard">
                  <SelectValue placeholder="System will auto-classify if blank" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_auto">— Auto-classify —</SelectItem>
                  {(['LOW', 'MEDIUM', 'HIGH', 'VERY_HIGH'] as IndustryHazardBand[]).map((band) => (
                    <SelectItem key={band} value={band}>
                      {band.charAt(0) + band.slice(1).toLowerCase().replace('_', ' ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FieldRow>
          </FieldGroup>

          <Separator />

          {/* ── Sales & Channel ── */}
          <FieldGroup title="Sales & Channel">
            <FieldRow>
              <Label htmlFor="nq-channel">Intake Channel</Label>
              <Select
                value={intakeChannel}
                onValueChange={(v) => setIntakeChannel(v as IntakeChannel)}
              >
                <SelectTrigger id="nq-channel">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(INTAKE_CHANNEL_LABEL) as IntakeChannel[]).map((ch) => (
                    <SelectItem key={ch} value={ch}>
                      {INTAKE_CHANNEL_LABEL[ch]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FieldRow>
          </FieldGroup>

          <Separator />

          {/* ── Components ── */}
          <FieldGroup title="Components Requested">
            {!schemeType ? (
              <p className="text-xs text-muted-foreground italic">Select a scheme type first.</p>
            ) : availableProducts.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">No products available.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {availableProducts.map((p) => {
                  const checked = selectedComponents.includes(p.productCode);
                  return (
                    <button
                      key={p.productCode}
                      type="button"
                      onClick={() => toggleComponent(p.productCode)}
                      className={`flex items-start gap-3 rounded-md border px-3 py-2.5 text-left text-sm transition-colors ${
                        checked
                          ? 'border-indigo-400 bg-indigo-50'
                          : 'border-border bg-background hover:bg-muted'
                      }`}
                    >
                      <span
                        className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                          checked
                            ? 'border-indigo-600 bg-indigo-600 text-white'
                            : 'border-border bg-background'
                        }`}
                      >
                        {checked && <Check className="size-3" />}
                      </span>
                      <span>
                        <span className="font-medium">
                          {p.productName}
                        </span>
                        <span className="ml-2 rounded bg-muted px-1 py-0.5 text-[10px] font-mono text-muted-foreground">
                          {p.productCode}
                        </span>
                        <span className="block text-xs text-muted-foreground mt-0.5">
                          {p.description}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </FieldGroup>

          <Separator />

          {/* ── Size & SA ── */}
          <FieldGroup title="Sizing (optional)">
            <FieldRow>
              <Label htmlFor="nq-group-size">Estimated Group Size</Label>
              <Input
                id="nq-group-size"
                type="number"
                min={1}
                placeholder="e.g. 500"
                value={groupSize}
                onChange={(e) => setGroupSize(e.target.value)}
              />
            </FieldRow>

            <FieldRow>
              <Label htmlFor="nq-sa">Requested Sum Assured per Member ({currency})</Label>
              <Input
                id="nq-sa"
                type="number"
                min={0}
                placeholder="e.g. 500000"
                value={saPerMember}
                onChange={(e) => setSaPerMember(e.target.value)}
              />
            </FieldRow>
          </FieldGroup>
        </form>

        <SheetFooter className="flex flex-row justify-end gap-2 px-6 py-4 border-t border-border bg-background">
          <Button variant="outline" type="button" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" onClick={handleSubmit} disabled={submitting}>
            {submitting && <Loader2 className="size-4 animate-spin" />}
            Create Quote
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
