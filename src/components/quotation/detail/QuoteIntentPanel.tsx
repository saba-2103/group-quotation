'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp, Pencil } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  BUSINESS_TYPE_LABEL,
  COVERAGE_BASIS_LABEL,
  formatDate,
  INTAKE_CHANNEL_LABEL,
  PREMIUM_TYPE_LABEL,
  SCHEME_TYPE_LABEL,
} from '../quoteHelpers';
import type {
  BusinessType,
  CoverageBasis,
  IntakeChannel,
  PremiumType,
  Quote,
  SchemeType,
} from '@/types/group-pas/quotation-v2';

// ─────────────────────────────────────────────────────────────────────────────

interface QuoteIntentPanelProps {
  quote: Quote;
  onUpdate?: (patch: Partial<Quote>) => void;
}

interface ReadFieldProps {
  label: string;
  value: string;
}

function ReadField({ label, value }: ReadFieldProps) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
        {label}
      </span>
      <span className="text-sm">{value || '—'}</span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

export function QuoteIntentPanel({ quote, onUpdate }: QuoteIntentPanelProps) {
  const [open, setOpen] = useState(true);
  const isEditable = quote.status === 'DRAFT' && !!onUpdate;
  const [editing, setEditing] = useState(false);

  // Edit state (only relevant when isEditable)
  const [inceptionDate, setInceptionDate] = useState(quote.intended_inception_date);
  const [expiryDate, setExpiryDate] = useState(quote.intended_expiry_date);
  const [coverageBasis, setCoverageBasis] = useState<CoverageBasis>(quote.coverage_basis);
  const [premiumType, setPremiumType] = useState<PremiumType>(quote.premium_type);
  const [intakeChannel, setIntakeChannel] = useState<IntakeChannel>(quote.intake_channel);

  function handleSave() {
    onUpdate?.({
      intended_inception_date: inceptionDate,
      intended_expiry_date: expiryDate,
      coverage_basis: coverageBasis,
      premium_type: premiumType,
      intake_channel: intakeChannel,
    });
    setEditing(false);
  }

  function handleCancel() {
    setInceptionDate(quote.intended_inception_date);
    setExpiryDate(quote.intended_expiry_date);
    setCoverageBasis(quote.coverage_basis);
    setPremiumType(quote.premium_type);
    setIntakeChannel(quote.intake_channel);
    setEditing(false);
  }

  return (
    <div className="rounded-lg border border-border bg-background overflow-hidden">
      {/* header */}
      <div
        className="flex items-center justify-between px-5 py-3.5 cursor-pointer select-none hover:bg-muted/40 transition-colors"
        onClick={() => setOpen((o) => !o)}
      >
        <span className="text-sm font-semibold">Quote Intent</span>
        <div className="flex items-center gap-2">
          {isEditable && open && !editing && (
            <Button
              variant="ghost"
              size="icon-sm"
              className="h-6 w-6"
              onClick={(e) => {
                e.stopPropagation();
                setEditing(true);
              }}
            >
              <Pencil className="size-3.5" />
            </Button>
          )}
          {open ? (
            <ChevronUp className="size-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="size-4 text-muted-foreground" />
          )}
        </div>
      </div>

      {/* body */}
      {open && (
        <div className="border-t border-border px-5 py-5">
          {!editing ? (
            /* ── Read-only view ── */
            <div className="grid grid-cols-2 gap-x-8 gap-y-4 sm:grid-cols-3 lg:grid-cols-4">
              <ReadField
                label="Scheme Type"
                value={SCHEME_TYPE_LABEL[quote.scheme_type as SchemeType]}
              />
              <ReadField
                label="Business Type"
                value={BUSINESS_TYPE_LABEL[quote.business_type as BusinessType]}
              />
              <ReadField
                label="Coverage Basis"
                value={COVERAGE_BASIS_LABEL[quote.coverage_basis]}
              />
              <ReadField
                label="Premium Type"
                value={PREMIUM_TYPE_LABEL[quote.premium_type]}
              />
              <ReadField
                label="Effective Date"
                value={formatDate(quote.intended_inception_date)}
              />
              <ReadField
                label="Expiry Date"
                value={formatDate(quote.intended_expiry_date)}
              />
              <ReadField
                label="Intake Channel"
                value={INTAKE_CHANNEL_LABEL[quote.intake_channel]}
              />
              {quote.currency && (
                <ReadField label="Currency" value={quote.currency} />
              )}
              {quote.line_of_business && (
                <ReadField label="Line of Business" value={quote.line_of_business} />
              )}
              {quote.industry_hazard_band && (
                <ReadField label="Hazard Band" value={quote.industry_hazard_band} />
              )}
              {typeof quote.estimated_group_size === 'number' && (
                <ReadField
                  label="Estimated Group Size"
                  value={quote.estimated_group_size.toLocaleString('en-IN')}
                />
              )}
              {quote.requested_sa_per_member && (
                <ReadField
                  label="Requested SA / Member"
                  value={new Intl.NumberFormat('en-IN', {
                    style: 'currency',
                    currency: quote.requested_sa_per_member.currency,
                    maximumFractionDigits: 0,
                  }).format(quote.requested_sa_per_member.amount)}
                />
              )}
              {quote.components_requested && quote.components_requested.length > 0 && (
                <div className="col-span-full flex flex-col gap-0.5">
                  <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
                    Components Requested
                  </span>
                  <div className="flex flex-wrap gap-1 mt-0.5">
                    {quote.components_requested.map((code) => (
                      <span
                        key={code}
                        className="inline-flex rounded bg-muted px-2 py-0.5 text-xs font-mono"
                      >
                        {code}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* ── Edit form ── */
            <div className="flex flex-col gap-5">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="ip-inception">Effective Date</Label>
                  <Input
                    id="ip-inception"
                    type="date"
                    value={inceptionDate}
                    onChange={(e) => setInceptionDate(e.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="ip-expiry">Expiry Date</Label>
                  <Input
                    id="ip-expiry"
                    type="date"
                    value={expiryDate}
                    onChange={(e) => setExpiryDate(e.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="ip-coverage">Coverage Basis</Label>
                  <Select
                    value={coverageBasis}
                    onValueChange={(v) => setCoverageBasis(v as CoverageBasis)}
                  >
                    <SelectTrigger id="ip-coverage">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(COVERAGE_BASIS_LABEL) as CoverageBasis[]).map((cb) => (
                        <SelectItem key={cb} value={cb}>
                          {COVERAGE_BASIS_LABEL[cb]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="ip-premium-type">Premium Type</Label>
                  <Select
                    value={premiumType}
                    onValueChange={(v) => setPremiumType(v as PremiumType)}
                  >
                    <SelectTrigger id="ip-premium-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(PREMIUM_TYPE_LABEL) as PremiumType[]).map((pt) => (
                        <SelectItem key={pt} value={pt}>
                          {PREMIUM_TYPE_LABEL[pt]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="ip-channel">Intake Channel</Label>
                  <Select
                    value={intakeChannel}
                    onValueChange={(v) => setIntakeChannel(v as IntakeChannel)}
                  >
                    <SelectTrigger id="ip-channel">
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
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={handleCancel}>
                  Cancel
                </Button>
                <Button size="sm" onClick={handleSave}>
                  Save Changes
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
