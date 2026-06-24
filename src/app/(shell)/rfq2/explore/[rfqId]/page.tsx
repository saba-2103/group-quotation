'use client';

import React, { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Download, Send, Plus, Lock, Circle, Check, Clock,
  FileText, Eye, Replace, Trash2, Upload, Building2, Users,
  AlertTriangle, Info, Shield,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import { mockQuoteDetail } from '@/lib/mock/quote-detail-mock';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatSize(kb: number) {
  if (kb >= 1000) return `${(kb / 1000).toFixed(1)} MB`;
  return `${kb} KB`;
}

// ─── Components ───────────────────────────────────────────────────────────────

function DealProfileHero() {
  const d = mockQuoteDetail.dealProfile;
  return (
    <div className="w-full rounded-lg bg-[#EEF1F8] border border-[#D6DCE8] p-5">
      <div className="grid grid-cols-12 gap-6">
        {/* Left block */}
        <div className="col-span-5 flex flex-col gap-2">
          <h2 className="text-xl font-semibold text-[#1B2B5E] leading-tight">{mockQuoteDetail.dealName}</h2>
          <div className="flex flex-col gap-1.5 mt-1">
            <ProfileRow label="Policy Type" value={d.policyType} />
            <ProfileRow label="Inception Date" value={d.inceptionDate} />
            <ProfileRow label="Policy Period" value={d.period} />
            <ProfileRow label="Renewal Type" value={d.renewalType} />
          </div>
        </div>

        {/* Center block */}
        <div className="col-span-4 flex flex-col gap-1.5 pt-1">
          <ProfileRow label="Broker" value={d.broker} />
          <ProfileRow label="Broker Contact" value={`${d.brokerContact} | ${d.brokerEmail}`} />
          <ProfileRow label="Broker Code" value={d.brokerCode} />
          <ProfileRow label="Source" value={d.source} />
          <ProfileRow label="Sales Owner" value={d.salesOwner} />
        </div>

        {/* Right block — highlighted */}
        <div className="col-span-3 bg-white/80 rounded-lg border border-[#D6DCE8] p-4 flex flex-col gap-2">
          <div className="flex items-center gap-2 mb-1">
            <Badge className="bg-amber-100 text-amber-800 border-amber-200 text-xs font-semibold">{d.currentStage}</Badge>
          </div>
          <HighlightRow label="Versions" value={d.versions} />
          <HighlightRow label="Headroom Available" value={d.headroom} />
          <HighlightRow label="Floor Rate" value={d.floorRate} />
          <HighlightRow label="Days in Stage" value={`${d.daysInStage} days`} />
        </div>
      </div>
    </div>
  );
}

function ProfileRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline gap-2">
      <span className="text-xs text-muted-foreground shrink-0 w-28">{label}</span>
      <span className="text-sm font-medium text-foreground">{value}</span>
    </div>
  );
}

function HighlightRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm font-semibold text-[#1B2B5E]">{value}</span>
    </div>
  );
}

function KeyDataPanel() {
  const k = mockQuoteDetail.keyData;
  return (
    <Card title="Key Data">
      <div className="grid grid-cols-2 gap-x-4 gap-y-2.5">
        <KV label="CIN" value={k.cin} mono />
        <KV label="Industry" value={`${k.industry} | NAICS: ${k.naics}`} />
        <KV label="Registered Address" value={k.address} />
        <KV label="Incorporation Year" value={String(k.incorporationYear)} />
        <KV label="Group Type" value={k.groupType} />
        <KV label="PAN" value={k.pan} mono />
      </div>
    </Card>
  );
}

// ─── MPH Rule-engine mirror ───────────────────────────────────────────────────

type HazardClass = 'LOW' | 'MEDIUM' | 'HIGH' | 'SPECIAL';
type SegmentBand = 'SME' | 'MID_CORPORATE' | 'CORPORATE';

interface MphFormState {
  industry: string;
  lives: number;
  whiteCollarPct: number;
  zones: number;
  hazardClass: HazardClass;
  hazardousRoles: boolean;
  businessType: string;
}

interface PreviewResult {
  category: string;
  maxDiscountPct: number;
  uwAuthorityBand: string;
  preapprovedCardRef: string;
  routing: 'STP' | 'REFER';
  referralReasons: string[];
  source: 'engine-server' | 'local-mirror';
}

function evaluateMphAppetite(p: Partial<MphFormState>): PreviewResult {
  const lives = p.lives ?? 0;
  const wc = p.whiteCollarPct ?? 100;
  const zones = p.zones ?? 1;
  const hc = p.hazardClass ?? 'LOW';
  const hr = p.hazardousRoles ?? false;
  const bt = p.businessType ?? '';

  const reasons: string[] = [];
  if (hc === 'HIGH' || hc === 'SPECIAL') reasons.push('High or special hazard class');
  if (hr) reasons.push('Hazardous roles present');
  if (lives > 500) reasons.push('Lives exceed 500');
  if (zones > 5) reasons.push('More than 5 zones');
  if (bt === 'TAKEOVER') reasons.push('Takeover review required');
  if (wc < 50) reasons.push('Blue-collar majority');

  const band: SegmentBand = lives < 100 ? 'SME' : lives <= 500 ? 'MID_CORPORATE' : 'CORPORATE';

  let category: string;
  let maxDiscountPct: number;
  if (reasons.length > 0) {
    category = 'Special — refer';
    maxDiscountPct = 0;
  } else if (band === 'SME') {
    category = 'SME · straight-through';
    maxDiscountPct = 8;
  } else if (band === 'MID_CORPORATE') {
    category = 'Mid-market';
    maxDiscountPct = 10;
  } else {
    category = 'Large group';
    maxDiscountPct = 12;
  }

  let uwAuthorityBand: string;
  if (hc === 'HIGH' || hc === 'SPECIAL') {
    uwAuthorityBand = 'Underwriting L2 (senior)';
  } else if (hr) {
    uwAuthorityBand = 'Actuary referral';
  } else if (reasons.length === 0 && band === 'SME') {
    uwAuthorityBand = 'Sales (straight-through)';
  } else {
    uwAuthorityBand = 'Underwriting L1';
  }

  const routing: 'STP' | 'REFER' =
    reasons.length === 0 && uwAuthorityBand.startsWith('Sales') ? 'STP' : 'REFER';

  return {
    category,
    maxDiscountPct,
    uwAuthorityBand,
    preapprovedCardRef: 'GTL-CARD-2024-LG-001',
    routing,
    referralReasons: reasons,
    source: 'local-mirror',
  };
}

// ─── MPH Categorization sub-helpers ──────────────────────────────────────────

function AdvisoryChip({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200 px-2 py-0.5 text-[10px] font-medium text-amber-700 mt-1.5">
      <AlertTriangle className="size-2.5 shrink-0" /> {children}
    </span>
  );
}

function PanelSection({ title, badge, children }: { title: string; badge?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2 pb-2 border-b border-border/30">
        <p className="text-xs font-semibold text-foreground">{title}</p>
        {badge && (
          <span className="rounded-full bg-muted border border-border/40 px-2 py-0 text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
            {badge}
          </span>
        )}
      </div>
      {children}
    </div>
  );
}

function PreviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] text-muted-foreground">{label}</span>
      <span className="text-xs font-semibold text-foreground">{value}</span>
    </div>
  );
}

function EnvRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] text-muted-foreground">{label}</span>
      <span className="text-xs font-medium text-foreground">{value}</span>
    </div>
  );
}

// ─── MphCategorizationCard ────────────────────────────────────────────────────

function MphCategorizationCard() {
  const seed = mockQuoteDetail.mphProfile;
  const [industry, setIndustry] = useState(seed.industry);
  const [lives, setLives] = useState<number>(seed.lives);
  const [whiteCollarPct, setWhiteCollarPct] = useState<number>(seed.whiteCollarPct);
  const [zones, setZones] = useState<number>(seed.zones);
  const [hazardClass, setHazardClass] = useState<HazardClass>(seed.hazardClass);
  const [hazardousRoles, setHazardousRoles] = useState<boolean>(seed.hazardousRoles);
  const [isDirty, setIsDirty] = useState(false);
  const [governingAppetite, setGoverningAppetite] = useState(mockQuoteDetail.mphAppetite);

  const businessType = seed.businessType;
  const blueCollarPct = 100 - whiteCollarPct;
  const dirty = () => setIsDirty(true);

  const preview = evaluateMphAppetite({ industry, lives, whiteCollarPct, zones, hazardClass, hazardousRoles, businessType });

  const segmentBand: SegmentBand = lives < 100 ? 'SME' : lives <= 500 ? 'MID_CORPORATE' : 'CORPORATE';
  const segmentLabel = segmentBand === 'SME' ? 'SME' : segmentBand === 'MID_CORPORATE' ? 'Mid-corporate' : 'Corporate';
  const segmentColor =
    segmentBand === 'SME'
      ? 'bg-blue-50 text-blue-700 border-blue-200'
      : segmentBand === 'MID_CORPORATE'
      ? 'bg-purple-50 text-purple-700 border-purple-200'
      : 'bg-[#1B2B5E]/10 text-[#1B2B5E] border-[#1B2B5E]/20';

  const handleSave = () => {
    const appetite = {
      category: preview.category,
      maxDiscountPct: preview.maxDiscountPct,
      uwAuthorityBand: preview.uwAuthorityBand,
      preapprovedCardRef: governingAppetite?.preapprovedCardRef ?? 'GTL-CARD-2024-LG-001',
      source: 'engine-server' as const,
      evaluatedAt: new Date().toISOString(),
    };
    console.log('onSave(mphProfile):', { industry, lives, whiteCollarPct, blueCollarPct, zones, hazardClass, hazardousRoles, businessType, segmentBand });
    setGoverningAppetite(appetite);
    setIsDirty(false);
  };

  return (
    <div className="rounded-lg border border-border/40 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.08)] col-span-12">
      {/* Panel 1 — Screen header */}
      <div className="flex items-start justify-between px-5 py-4 border-b border-border/30">
        <div>
          <h4 className="text-sm font-semibold text-foreground">MPH Categorization</h4>
          <p className="text-[11px] text-muted-foreground mt-0.5 max-w-2xl">
            Profiles the master policyholder — pre-configures the rate card, UW authority band, and discount buffer via the rule engine.
            Determines whether the case quotes straight-through.
          </p>
        </div>
        <Button
          size="sm"
          className="text-xs h-8 ml-6 shrink-0"
          disabled={!isDirty}
          onClick={handleSave}
        >
          Save profile
        </Button>
      </div>

      <div className="p-5 grid grid-cols-2 gap-6">

        {/* ─ Panel 2 — Industry & Workforce (left column) ─ */}
        <PanelSection title="Industry & Workforce">
          <div className="grid grid-cols-2 gap-x-5 gap-y-3.5">

            {/* Industry */}
            <div>
              <label className="text-[11px] text-muted-foreground block mb-1">Industry</label>
              <Input
                value={industry}
                onChange={(e) => { setIndustry(e.target.value); dirty(); }}
                className="h-7 text-xs"
              />
            </div>

            {/* Lives */}
            <div>
              <label className="text-[11px] text-muted-foreground block mb-1">Lives</label>
              <Input
                type="number"
                min="1"
                value={lives}
                onChange={(e) => { setLives(Number(e.target.value) || 0); dirty(); }}
                className="h-7 text-xs"
              />
              <p className="text-[10px] text-muted-foreground mt-1 leading-snug">
                Drives segment band (SME &lt;100 / Mid-corporate 100–500 / Corporate &gt;500)
              </p>
            </div>

            {/* White collar % */}
            <div>
              <label className="text-[11px] text-muted-foreground block mb-1">White collar %</label>
              <Input
                type="number"
                min="0"
                max="100"
                value={whiteCollarPct}
                onChange={(e) => { setWhiteCollarPct(Math.min(100, Math.max(0, Number(e.target.value)))); dirty(); }}
                className="h-7 text-xs"
              />
              <p className="text-[10px] text-muted-foreground mt-1">Blue collar: {blueCollarPct}%</p>
              {whiteCollarPct < 50 && <AdvisoryChip>Blue-collar majority — referral required</AdvisoryChip>}
            </div>

            {/* Zones */}
            <div>
              <label className="text-[11px] text-muted-foreground block mb-1">Locations / zones</label>
              <Input
                type="number"
                min="1"
                value={zones}
                onChange={(e) => { setZones(Math.max(1, Number(e.target.value))); dirty(); }}
                className="h-7 text-xs"
              />
              {zones > 5 && <AdvisoryChip>&gt;5 zones — referral required</AdvisoryChip>}
            </div>

            {/* Hazard class */}
            <div>
              <label className="text-[11px] text-muted-foreground block mb-1">Sector hazard class</label>
              <Select value={hazardClass} onValueChange={(v) => { setHazardClass(v as HazardClass); dirty(); }}>
                <SelectTrigger className="h-7 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="LOW" className="text-xs">LOW — IT / services / finance</SelectItem>
                  <SelectItem value="MEDIUM" className="text-xs">MEDIUM — retail / light manufacturing</SelectItem>
                  <SelectItem value="HIGH" className="text-xs">HIGH — heavy manufacturing / logistics</SelectItem>
                  <SelectItem value="SPECIAL" className="text-xs">SPECIAL — mining / offshore / aviation</SelectItem>
                </SelectContent>
              </Select>
              {(hazardClass === 'HIGH' || hazardClass === 'SPECIAL') && (
                <AdvisoryChip>Elevated hazard — referral band applies</AdvisoryChip>
              )}
            </div>

            {/* Hazardous roles toggle */}
            <div>
              <label className="text-[11px] text-muted-foreground block mb-1">Hazardous roles present</label>
              <div className="flex items-center gap-2 mt-1.5">
                <button
                  role="switch"
                  aria-checked={hazardousRoles}
                  onClick={() => { setHazardousRoles(!hazardousRoles); dirty(); }}
                  className={cn(
                    'relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors',
                    hazardousRoles ? 'bg-primary' : 'bg-input'
                  )}
                >
                  <span className={cn('block h-4 w-4 rounded-full bg-white shadow-sm transition-transform', hazardousRoles ? 'translate-x-4' : 'translate-x-0.5')} />
                </button>
                <span className="text-[11px] text-muted-foreground">Heights, machinery, or driving duties present</span>
              </div>
              {hazardousRoles && <AdvisoryChip>Actuary referral required</AdvisoryChip>}
            </div>

            {/* Business type (read-only) */}
            <div className="col-span-2">
              <label className="text-[11px] text-muted-foreground block mb-1">Business type</label>
              <div className="rounded-md bg-muted/30 border border-border/40 px-3 py-1.5 text-xs font-medium text-foreground">
                {businessType.replace(/_/g, ' ')}
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">
                Sourced from Key Data. TAKEOVER adds a referral reason to the rule engine evaluation.
              </p>
            </div>
          </div>
        </PanelSection>

        {/* ─ Right column: panels 3 + 4 + 5 stacked ─ */}
        <div className="flex flex-col gap-5">

          {/* Panel 3 — Preapproved package preview */}
          <PanelSection title="Preapproved package" badge="PREVIEW">
            <p className="text-[10px] text-muted-foreground -mt-1 mb-2">
              Indicative — local mirror. Engine stamps the governing package on Save.
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <PreviewRow label="Category" value={preview.category} />
                <PreviewRow label="Rate card ref" value={preview.preapprovedCardRef} />
                <PreviewRow label="Discount buffer" value={`${preview.maxDiscountPct}%`} />
                <PreviewRow label="UW authority" value={preview.uwAuthorityBand} />
              </div>
              <div className="flex flex-col gap-2.5">
                {preview.routing === 'STP' ? (
                  <>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-green-50 border border-green-200 px-2.5 py-1 text-xs font-medium text-green-700 w-fit">
                      <Check className="size-3" /> Straight-through
                    </span>
                    <p className="text-[11px] text-muted-foreground">
                      Sales can quote and discount up to {preview.maxDiscountPct}% without referral.
                    </p>
                  </>
                ) : (
                  <>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 border border-amber-200 px-2.5 py-1 text-xs font-medium text-amber-700 w-fit">
                      <AlertTriangle className="size-3" /> Referral required
                    </span>
                    <p className="text-[11px] text-muted-foreground">
                      Discounts beyond the buffer require UW or actuary sign-off. The rate card enforces this.
                    </p>
                  </>
                )}
                {preview.referralReasons.length > 0 && (
                  <div className="flex flex-col gap-1 pt-1">
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Why it&rsquo;s flagged</p>
                    {preview.referralReasons.map((r) => (
                      <div key={r} className="flex items-center gap-1.5 text-[11px] text-amber-700">
                        <AlertTriangle className="size-2.5 shrink-0" /> {r}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </PanelSection>

          {/* Panel 4 — Governing envelope */}
          <PanelSection title="Governing envelope" badge="STAMPED">
            <p className="text-[10px] text-muted-foreground -mt-1 mb-2">
              Stamped by rule engine · binds rate card, scenarios &amp; dispatch
            </p>
            {governingAppetite ? (
              <div className="flex flex-col gap-3">
                <div className="grid grid-cols-2 gap-x-5 gap-y-2">
                  <EnvRow label="Category" value={governingAppetite.category} />
                  <EnvRow label="Discount buffer" value={`${governingAppetite.maxDiscountPct}%`} />
                  <EnvRow label="UW authority" value={governingAppetite.uwAuthorityBand} />
                  <EnvRow label="Rate card ref" value={governingAppetite.preapprovedCardRef ?? '—'} />
                  <div>
                    <p className="text-[10px] text-muted-foreground mb-0.5">Source</p>
                    <span className={cn(
                      'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium',
                      governingAppetite.source === 'engine-server'
                        ? 'bg-green-50 text-green-700 border-green-200'
                        : 'bg-amber-50 text-amber-700 border-amber-200'
                    )}>
                      <Lock className="size-2.5" />
                      {governingAppetite.source}
                    </span>
                  </div>
                  <EnvRow
                    label="Stamped at"
                    value={new Date(governingAppetite.evaluatedAt).toLocaleString('en-GB', {
                      day: '2-digit', month: 'short', year: 'numeric',
                      hour: '2-digit', minute: '2-digit',
                    })}
                  />
                </div>
                <p className="text-[10px] text-muted-foreground border-t border-border/30 pt-2 leading-snug">
                  This package was stamped by the rule engine on save and cannot be overridden from this screen. Re-save to update it.
                </p>
              </div>
            ) : (
              <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-[11px] text-amber-700 leading-snug">
                No governing package on this RFQ yet. Save the profile above and the rule engine will stamp it server-side.
              </div>
            )}
          </PanelSection>

          {/* Panel 5 — Client segmentation */}
          <PanelSection title="Client segmentation">
            <p className="text-[10px] text-muted-foreground -mt-1 mb-2">Derived · updates as you edit</p>
            <div className="grid grid-cols-3 gap-4">
              <div className="flex flex-col gap-1.5">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-medium">Segment band</p>
                <span className={cn('inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold w-fit', segmentColor)}>
                  {segmentLabel}
                </span>
              </div>
              <div className="flex flex-col gap-1.5">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-medium">Occupation mix</p>
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <div className="h-2 rounded-full bg-blue-400 min-w-[4px]" style={{ width: `${whiteCollarPct}%` }} />
                    <span className="text-[11px] text-muted-foreground">{whiteCollarPct}% white</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-2 rounded-full bg-muted-foreground/30 min-w-[4px]" style={{ width: `${blueCollarPct}%` }} />
                    <span className="text-[11px] text-muted-foreground">{blueCollarPct}% blue</span>
                  </div>
                </div>
                {blueCollarPct > whiteCollarPct && (
                  <p className="text-[10px] text-amber-600 mt-0.5">Blue-collar majority — referral band applies</p>
                )}
              </div>
              <div className="flex flex-col gap-1.5">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-medium">Locations</p>
                <p className="text-sm font-semibold tabular-nums">{zones} location{zones !== 1 ? 's' : ''}</p>
                {zones > 5 && (
                  <p className="text-[10px] text-amber-600">Multi-zone — referral required</p>
                )}
                <button
                  className="text-[11px] text-primary hover:underline text-left mt-1"
                  onClick={() => console.log('Navigate to /rfqs/:rfqId/subsidiaries')}
                >
                  Plans can be scoped per subsidiary →
                </button>
              </div>
            </div>
          </PanelSection>
        </div>
      </div>
    </div>
  );
}

function SubsidiariesCard() {
  const subs = mockQuoteDetail.subsidiaries;
  return (
    <Card title="Subsidiaries">
      <div className="flex items-center gap-2 mb-3">
        <Badge variant="secondary" className="text-xs">{subs.length} subsidiaries</Badge>
      </div>
      <div className="flex flex-col gap-2">
        {subs.map((s) => (
          <div key={s.code} className="flex items-center justify-between py-1.5 border-b border-border/30 last:border-0">
            <div className="flex items-center gap-2">
              <Building2 className="size-3.5 text-muted-foreground" />
              <span className="font-mono text-xs font-semibold text-muted-foreground mr-1">{s.code}</span>
              <span className="text-sm font-medium">{s.name}</span>
            </div>
            <Badge
              variant={s.status === 'ACTIVE' ? 'success' : 'secondary'}
              className="text-[10px]"
            >
              {s.status}
            </Badge>
          </div>
        ))}
      </div>
      <p className="text-[11px] text-muted-foreground mt-3">Subsidiary lives are included in total headcount</p>
    </Card>
  );
}

function CensusHeadcountCard() {
  const c = mockQuoteDetail.census;
  return (
    <Card title="Census / Headcount">
      <div className="flex items-center gap-3 mb-3">
        <div className="flex items-center gap-1.5">
          <Users className="size-4 text-muted-foreground" />
          <span className="text-lg font-bold text-[#1B2B5E]">{c.totalLives.toLocaleString()}</span>
          <span className="text-xs text-muted-foreground">Total Lives</span>
        </div>
      </div>
      <div className="flex flex-col gap-1.5 mb-3">
        {c.grades.map((g) => (
          <div key={g.name} className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">{g.name}</span>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">{g.count.toLocaleString()}</span>
              <span className="text-xs text-muted-foreground w-8 text-right">{g.pct}%</span>
            </div>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 pt-2 border-t border-border/30">
        <KV label="Avg Age" value={`${c.avgAge} yrs`} />
        <KV label="Gender" value={c.genderRatio} />
        <KV label="Dependants" value={c.dependants.toLocaleString()} />
        <KV label="Data Status" value={`✓ ${c.censusVersion} uploaded (${c.uploadedOn})`} />
      </div>
    </Card>
  );
}

function ClaimsExperiencePanel() {
  const files = mockQuoteDetail.claimsFiles;
  return (
    <Card title="Claims Experience Files" action={<Button variant="outline" size="sm" className="gap-1.5 text-xs h-7"><Upload className="size-3" /> Upload File</Button>}>
      <div className="flex flex-col gap-2">
        {files.map((f) => (
          <div key={f.id} className="rounded-lg border border-border/40 p-3 hover:border-border/80 transition-colors">
            <div className="flex items-center gap-2">
              <FileText className="size-4 text-muted-foreground shrink-0" />
              <span className="text-sm font-medium flex-1 truncate">{f.name}</span>
              <span className="text-xs text-muted-foreground shrink-0">{formatSize(f.sizeKb)}</span>
            </div>
            <div className="flex items-center justify-between mt-2">
              <span className="text-[11px] text-muted-foreground">Uploaded {f.uploadedOn} by {f.uploadedBy}</span>
              <div className="flex items-center gap-1">
                <ActionBtn icon={Eye} label="Preview" />
                <ActionBtn icon={Download} label="Download" />
                <ActionBtn icon={Replace} label="Replace" />
                <ActionBtn icon={Trash2} label="Delete" />
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-3 rounded-lg border-2 border-dashed border-border/50 p-4 text-center text-xs text-muted-foreground hover:border-border transition-colors">
        Drag and drop files here, or click Upload File
      </div>
    </Card>
  );
}

function DispatchPanel() {
  const dispatches = mockQuoteDetail.dispatch;
  return (
    <Card title="Dispatch">
      <div className="flex flex-col gap-0 mb-3">
        <div className="grid grid-cols-4 gap-2 text-[11px] text-muted-foreground font-medium uppercase tracking-wider pb-1.5 border-b border-border/30">
          <span>Version</span>
          <span>Dispatched To</span>
          <span>Date</span>
          <span>Status</span>
        </div>
        {dispatches.map((d) => (
          <div key={d.version} className="grid grid-cols-4 gap-2 py-2 border-b border-border/20 last:border-0">
            <span className="text-sm font-medium">{d.version}</span>
            <span className="text-sm text-muted-foreground">{d.dispatchedTo}</span>
            <span className="text-sm text-muted-foreground">{d.date}</span>
            <div className="flex items-center gap-1">
              <Check className="size-3.5 text-green-600" />
              <span className="text-sm text-green-700">{d.status}</span>
            </div>
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between pt-2 border-t border-border/30">
        <span className="text-xs text-muted-foreground">No pending dispatches</span>
        <Button variant="outline" size="sm" disabled className="text-xs h-7">Dispatch V3 to UW</Button>
      </div>
    </Card>
  );
}

function NegotiationPanel() {
  const neg = mockQuoteDetail.negotiation;
  return (
    <Card title="Negotiation" action={<Badge className="bg-blue-100 text-blue-800 border-blue-200 text-[10px]">Round 2 Complete</Badge>}>
      <div className="flex flex-col gap-3 mb-3">
        {neg.rounds.map((r) => (
          <div key={r.number} className="relative pl-5 pb-3 border-l-2 border-border/40 last:border-0">
            <div className="absolute left-[-5px] top-0.5 size-2 rounded-full bg-[#1B2B5E]" />
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-semibold text-foreground">Round {r.number}</span>
              <span className="text-[11px] text-muted-foreground">{r.date}</span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div><span className="text-muted-foreground">Broker ask:</span> <span className="font-medium">{r.brokerAsk}</span></div>
              <div><span className="text-muted-foreground">Our offer:</span> <span className="font-medium">{r.ourOffer}</span></div>
              <div><span className="text-muted-foreground">Gap:</span> <span className="font-medium">{r.gap}</span></div>
            </div>
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between pt-2 border-t border-border/30">
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span>Floor <strong className="text-foreground">{neg.floor}</strong></span>
          <span>Headroom <strong className="text-foreground">{neg.headroom}</strong></span>
        </div>
        <Button size="sm" className="text-xs h-7">Record Next Round</Button>
      </div>
    </Card>
  );
}

function QuoteVersionsSection() {
  const router = useRouter();
  const versions = mockQuoteDetail.versions;
  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold text-foreground">Quote Versions ({versions.length})</h3>
        <Button variant="outline" size="sm" className="gap-1.5 text-xs h-8">
          <Plus className="size-3.5" /> Create New Version
        </Button>
      </div>
      <div className="grid grid-cols-3 gap-3">
        {versions.map((v) => (
          <div
            key={v.id}
            className={cn(
              'rounded-lg border p-4 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.08)] flex flex-col gap-3',
              v.isActive ? 'border-blue-300 ring-1 ring-blue-100' : 'border-border/40',
            )}
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold">{v.label}</span>
              {v.isFrozen && (
                <Badge className="bg-green-100 text-green-800 border-green-200 text-[10px] gap-1">
                  <Lock className="size-2.5" /> FROZEN
                </Badge>
              )}
              {v.isActive && (
                <div className="flex items-center gap-1.5">
                  <Badge className="bg-blue-100 text-blue-800 border-blue-200 text-[10px] gap-1">
                    <Circle className="size-2.5 fill-blue-600" /> PRICED
                  </Badge>
                  <Badge variant="outline" className="text-[10px]">ACTIVE</Badge>
                </div>
              )}
            </div>
            <div className="flex flex-col gap-1 text-xs text-muted-foreground">
              <span>Plans: {v.planCount}</span>
              <span>Gross Premium: <strong className="text-foreground">{v.grossPremium}</strong></span>
              <span>Created: {v.createdOn}</span>
            </div>
            <div className="flex items-center gap-2 mt-auto pt-2 border-t border-border/20">
              <Button
                variant="ghost"
                size="sm"
                className="text-xs h-7 px-2"
                onClick={() => router.push('/rfq2/explore/version-detail')}
              >
                View Details
              </Button>
              {v.isActive && !v.isFrozen && (
                <Button variant="outline" size="sm" className="text-xs h-7 px-2 gap-1">
                  <Lock className="size-3" /> Freeze
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Utility components ───────────────────────────────────────────────────────

function Card({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border/40 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.08)] p-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-semibold text-foreground">{title}</h4>
        {action}
      </div>
      {children}
    </div>
  );
}

function KV({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[11px] text-muted-foreground">{label}</span>
      <span className={cn('text-sm font-medium text-foreground', mono && 'font-mono text-xs')}>{value}</span>
    </div>
  );
}

function ActionBtn({ icon: Icon, label }: { icon: React.ElementType; label: string }) {
  return (
    <button
      title={label}
      className="flex items-center justify-center size-6 rounded hover:bg-muted transition-colors"
    >
      <Icon className="size-3.5 text-muted-foreground" />
    </button>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ExploreQuoteDetailPage() {
  const params = useParams();
  const data = mockQuoteDetail;

  return (
    <div className="flex flex-col h-full overflow-hidden bg-[#F7F8FA]">
      {/* BAND 1 — Page Header */}
      <div className="shrink-0 sticky top-0 z-10 bg-white border-b border-border/40 px-5 py-3">
        <div className="flex items-center justify-between">
          {/* Left: ID + deal name */}
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="font-mono text-xs">{data.rfqId}</Badge>
            <span className="text-base font-semibold text-foreground">{data.dealName}</span>
          </div>

          {/* Center: Stage + milestones */}
          <div className="flex items-center gap-3">
            <Badge className="bg-amber-100 text-amber-800 border-amber-200 text-xs font-semibold">{data.stage}</Badge>
            <div className="flex items-center gap-1">
              {data.milestones.map((m) => (
                <div
                  key={m.label}
                  className={cn(
                    'flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border',
                    m.status === 'done' && 'bg-green-50 text-green-700 border-green-200',
                    m.status === 'in_progress' && 'bg-amber-50 text-amber-700 border-amber-200',
                    m.status === 'pending' && 'bg-muted text-muted-foreground border-border/40',
                  )}
                >
                  {m.status === 'done' && <Check className="size-2.5" />}
                  {m.status === 'in_progress' && <Clock className="size-2.5" />}
                  {m.label}
                </div>
              ))}
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="gap-1.5 text-xs h-8">
              <Download className="size-3.5" /> Download Quote Pack
            </Button>
            <Button variant="outline" size="sm" className="gap-1.5 text-xs h-8">
              <Send className="size-3.5" /> Dispatch
            </Button>
            <Button size="sm" className="gap-1.5 text-xs h-8">
              <Plus className="size-3.5" /> New Version
            </Button>
          </div>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 min-h-0 overflow-y-auto px-5 py-5">
        <div className="max-w-[1400px] mx-auto flex flex-col gap-4">

          {/* BAND 2 — Deal Profile Hero */}
          <DealProfileHero />

          {/* BAND 3 — Content Grid */}
          {/* Row 3A: Key Data + Subsidiaries */}
          <div className="grid grid-cols-12 gap-3">
            <div className="col-span-6"><KeyDataPanel /></div>
            <div className="col-span-6"><SubsidiariesCard /></div>
          </div>

          {/* Row 3B: MPH Categorization (full width — 5 panels) */}
          <MphCategorizationCard />

          {/* Row 3C: Census + Claims */}
          <div className="grid grid-cols-12 gap-3">
            <div className="col-span-5"><CensusHeadcountCard /></div>
            <div className="col-span-7"><ClaimsExperiencePanel /></div>
          </div>

          {/* Row 3C: Dispatch + Negotiation */}
          <div className="grid grid-cols-12 gap-3">
            <div className="col-span-6"><DispatchPanel /></div>
            <div className="col-span-6"><NegotiationPanel /></div>
          </div>

          {/* BAND 4 — Quote Versions */}
          <div className="pt-2">
            <QuoteVersionsSection />
          </div>
        </div>
      </div>
    </div>
  );
}
