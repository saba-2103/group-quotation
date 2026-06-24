'use client';

import { useState, useCallback } from 'react';
import { AlertTriangle, Check, Loader2, Info, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useRfqBundle } from '@/context/RfqBundleContext';
import { updateRfq } from '@/lib/api/quotation-client';
import { useRole } from '@/hooks/useRole';
import {
  SchemeType, BusinessType, IntermediaryType, SumAssuredBasis,
  CoverPattern, TermBasis, LivesCovered, RiskTermClassification,
  ParticipationType, SchemeUsage,
} from '@/lib/types';

// Schemes that can be selected in the dropdown — LENDER_BORROWER is recognised
// but never offered as a choice; if stored, it triggers the amber warning.
const SELECTABLE_SCHEMES = new Set([
  SchemeType.EMPLOYER_OBLIGATORY,
  SchemeType.EMPLOYER_VOLUNTARY,
  SchemeType.AFFINITY,
  SchemeType.MICRO,
]);

// ─── Helpers ──────────────────────────────────────────────────────────────────

const VISIBLE_ROLES = new Set(['SALES', 'UNDERWRITER', 'ACTUARY', 'ACTUARIAL', 'ADMIN']);

type SaveState = 'idle' | 'saving' | 'saved' | 'error';

function derivedFromScheme(schemeType: SchemeType): {
  participationType: ParticipationType;
  schemeUsage: SchemeUsage;
} {
  switch (schemeType) {
    case SchemeType.EMPLOYER_OBLIGATORY:
      return { participationType: ParticipationType.COMPULSORY, schemeUsage: SchemeUsage.EMPLOYER_EMPLOYEE };
    case SchemeType.EMPLOYER_VOLUNTARY:
      return { participationType: ParticipationType.VOLUNTARY, schemeUsage: SchemeUsage.EMPLOYER_EMPLOYEE };
    case SchemeType.AFFINITY:
      return { participationType: ParticipationType.VOLUNTARY, schemeUsage: SchemeUsage.NON_EMPLOYER_EMPLOYEE };
    case SchemeType.MICRO:
      return { participationType: ParticipationType.COMPULSORY, schemeUsage: SchemeUsage.NON_EMPLOYER_EMPLOYEE };
    default:
      return { participationType: ParticipationType.COMPULSORY, schemeUsage: SchemeUsage.EMPLOYER_EMPLOYEE };
  }
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mt-6 mb-3 border-b border-border/40 pb-1.5">
      {children}
    </h2>
  );
}

function FieldRow({ label, required, saveState, error, hint, children }: {
  label: string;
  required?: boolean;
  saveState?: SaveState;
  error?: string | null;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-2">
        <Label className="text-xs">
          {label}{required && <span className="text-destructive ml-0.5">*</span>}
        </Label>
        {saveState === 'saving' && <Loader2 className="size-3 animate-spin text-muted-foreground" />}
        {saveState === 'saved' && <Check className="size-3 text-green-600" />}
        {saveState === 'error' && <span className="text-[10px] text-destructive">Error</span>}
      </div>
      {children}
      {error && <p className="text-[10px] text-destructive">{error}</p>}
      {hint && <p className="text-[10px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

function ReadOnlyField({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label className="text-xs">{label}</Label>
      <div className="flex h-9 items-center px-3 rounded-md border border-border bg-muted/30 text-sm text-muted-foreground">
        {value}
      </div>
      {hint && <p className="text-[10px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function KeyDataPage() {
  const { bundle, updateBundle } = useRfqBundle();
  const { currentRole } = useRole();

  // Per-field save states
  const [saving, setSaving] = useState<Record<string, SaveState>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [createdPriorPolicy, setCreatedPriorPolicy] = useState(false);;

  if (!bundle) return null;

  const canWrite = currentRole === 'SALES' || currentRole === 'ADMIN';
  const canRead = VISIBLE_ROLES.has(currentRole ?? '');
  if (!canRead) {
    return (
      <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
        You do not have access to view this screen.
      </div>
    );
  }

  const rfqId = bundle.rfqId;

  const persist = useCallback(async (field: string, patch: Parameters<typeof updateRfq>[1]) => {
    setSaving((s) => ({ ...s, [field]: 'saving' }));
    setErrors((e) => ({ ...e, [field]: '' }));
    try {
      const updated = await updateRfq(rfqId, patch);
      updateBundle(updated);
      setSaving((s) => ({ ...s, [field]: 'saved' }));
      setTimeout(() => setSaving((s) => ({ ...s, [field]: 'idle' })), 1500);
    } catch (err) {
      setSaving((s) => ({ ...s, [field]: 'error' }));
      setErrors((e) => ({ ...e, [field]: err instanceof Error ? err.message : 'Save failed' }));
    }
  }, [rfqId, updateBundle]);

  const isMicro = bundle.schemeType === SchemeType.MICRO;
  const isSelectableScheme = SELECTABLE_SCHEMES.has(bundle.schemeType as SchemeType);
  const showPriorPolicy = (bundle.businessType === BusinessType.RENEWAL || bundle.businessType === BusinessType.TAKEOVER) && !!bundle.priorPolicy;

  const productMix = bundle.plans.length > 0
    ? [...new Set(bundle.plans.map((p) => p.productCode ?? '—'))].join(', ')
    : '—';

  return (
    <div className="max-w-2xl mx-auto px-6 py-5 flex flex-col gap-0">
      {/* Breadcrumb */}
      <nav aria-label="breadcrumb" className="mb-3">
        <ol className="flex items-center gap-1 text-[11px] text-muted-foreground flex-wrap">
          <li><Link href="/rfqs" className="hover:text-foreground transition-colors">RFQs</Link></li>
          <li><ChevronRight className="size-3" /></li>
          <li><Link href={`/rfq2/${rfqId}`} className="hover:text-foreground transition-colors">{bundle.employerName}</Link></li>
          <li><ChevronRight className="size-3" /></li>
          <li><span className="text-muted-foreground">Workbench</span></li>
          <li><ChevronRight className="size-3" /></li>
          <li><span className="text-foreground font-medium">Quote Key Data</span></li>
        </ol>
      </nav>
      {/* Screen header */}
      <div className="mb-2 flex items-center gap-2">
        <h1 className="text-base font-semibold">Quote Key Data</h1>
        <span className="inline-flex items-center rounded border border-border/60 bg-muted/40 px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground tracking-wider">S02</span>
      </div>
      <p className="text-xs text-muted-foreground -mt-1.5 mb-1">Intake · screen 2 of 21</p>

      {/* ── Quote Identity ─────────────────────────────────────────────────── */}
      <SectionHeading>Quote Identity</SectionHeading>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FieldRow label="Client name" required saveState={saving['employerName']} error={errors['employerName']}>
          <Input
            defaultValue={bundle.employerName}
            disabled={!canWrite}
            className="text-sm"
            onBlur={(e) => persist('employerName', { employerName: e.target.value })}
          />
        </FieldRow>

        <FieldRow label="Effective date" required saveState={saving['effectiveDate']} error={errors['effectiveDate']}>
          <Input
            type="date"
            defaultValue={bundle.effectiveDate ?? ''}
            disabled={!canWrite}
            className="text-sm"
            onBlur={(e) => persist('effectiveDate', { effectiveDate: e.target.value })}
          />
        </FieldRow>

        <FieldRow label="Business type" required saveState={saving['businessType']} error={errors['businessType']}>
          <Select
            disabled={!canWrite}
            defaultValue={bundle.businessType}
            onValueChange={async (v) => {
              const newBt = v as BusinessType;
              const needsPriorPolicy = (newBt === BusinessType.RENEWAL || newBt === BusinessType.TAKEOVER) && !bundle.priorPolicy;
              const patch = needsPriorPolicy
                ? { businessType: newBt, priorPolicy: {} as Record<string, never> }
                : { businessType: newBt };
              await persist('businessType', patch);
              if (needsPriorPolicy) setCreatedPriorPolicy(true);
              else setCreatedPriorPolicy(false);
            }}
          >
            <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value={BusinessType.NEW}>New</SelectItem>
              <SelectItem value={BusinessType.RENEWAL}>Renewal</SelectItem>
              <SelectItem value={BusinessType.TAKEOVER}>Takeover</SelectItem>
            </SelectContent>
          </Select>
          {createdPriorPolicy && (
            <p className="text-[10px] text-green-700 mt-1 flex items-center gap-1">
              <Check className="size-3" /> A prior policy record has been created — fill in the details below.
            </p>
          )}
        </FieldRow>

        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <Label className="text-xs">Scheme type</Label>
            {saving['schemeType'] === 'saving' && <Loader2 className="size-3 animate-spin text-muted-foreground" />}
            {saving['schemeType'] === 'saved' && <Check className="size-3 text-green-600" />}
          </div>
          {!isSelectableScheme && (
            <div className="flex items-center gap-1.5 text-amber-700 text-[10px] bg-amber-50 border border-amber-200 rounded px-2 py-1">
              <AlertTriangle className="size-3 shrink-0" />
              Stored value &ldquo;{bundle.schemeType}&rdquo; is unrecognised — pick one above to canonicalise it
            </div>
          )}
          <Select
            disabled={!canWrite}
            value={isSelectableScheme ? bundle.schemeType : ''}
            onValueChange={(v) => {
              const scheme = v as SchemeType;
              const derived = derivedFromScheme(scheme);
              persist('schemeType', { schemeType: scheme, ...derived });
            }}
          >
            <SelectTrigger className="text-sm"><SelectValue placeholder="Select scheme…" /></SelectTrigger>
            <SelectContent>
              <SelectItem value={SchemeType.EMPLOYER_OBLIGATORY}>Employer Obligatory</SelectItem>
              <SelectItem value={SchemeType.EMPLOYER_VOLUNTARY}>Employer Voluntary</SelectItem>
              <SelectItem value={SchemeType.AFFINITY}>Affinity</SelectItem>
              <SelectItem value={SchemeType.MICRO}>Micro</SelectItem>
            </SelectContent>
          </Select>
          {errors['schemeType'] && <p className="text-[10px] text-destructive">{errors['schemeType']}</p>}
        </div>

        <ReadOnlyField
          label="Participation type"
          value={bundle.participationType}
          hint="Auto-derived from scheme type"
        />
        <ReadOnlyField
          label="Scheme usage"
          value={bundle.schemeUsage}
          hint="Gates the plan wizard's product list"
        />

        <FieldRow label="Intermediary type" saveState={saving['intermediaryType']} error={errors['intermediaryType']}>
          <Select
            disabled={!canWrite}
            defaultValue={bundle.intermediaryType ?? ''}
            onValueChange={(v) => persist('intermediaryType', { intermediaryType: v as IntermediaryType })}
          >
            <SelectTrigger className="text-sm"><SelectValue placeholder="Select…" /></SelectTrigger>
            <SelectContent>
              <SelectItem value={IntermediaryType.BROKER}>Broker</SelectItem>
              <SelectItem value={IntermediaryType.CORPORATE_AGENT}>Corporate Agent</SelectItem>
              <SelectItem value={IntermediaryType.DIRECT}>Direct</SelectItem>
              <SelectItem value={IntermediaryType.BANCASSURANCE}>Bancassurance</SelectItem>
            </SelectContent>
          </Select>
        </FieldRow>

        <FieldRow label="Broker name" saveState={saving['brokerName']} error={errors['brokerName']}>
          <Input
            defaultValue={bundle.brokerName ?? ''}
            disabled={!canWrite}
            className="text-sm"
            onBlur={(e) => persist('brokerName', { brokerName: e.target.value })}
          />
        </FieldRow>

        <FieldRow label="Intermediary code" saveState={saving['intermediaryCode']} error={errors['intermediaryCode']}>
          <Input
            defaultValue={bundle.intermediaryCode ?? ''}
            disabled={!canWrite}
            className="text-sm"
            onBlur={(e) => persist('intermediaryCode', { intermediaryCode: e.target.value })}
          />
        </FieldRow>

        <ReadOnlyField
          label="Product mix"
          value={productMix}
          hint="Derived from plans — edit on the Plans screen"
        />

        <FieldRow label="Risk term classification" saveState={saving['riskTermClassification']} error={errors['riskTermClassification']}>
          <Select
            disabled={!canWrite}
            defaultValue={bundle.riskTermClassification ?? ''}
            onValueChange={(v) => persist('riskTermClassification', { riskTermClassification: v as RiskTermClassification })}
          >
            <SelectTrigger className="text-sm"><SelectValue placeholder="Optional…" /></SelectTrigger>
            <SelectContent>
              <SelectItem value={RiskTermClassification.LEVEL}>Level</SelectItem>
              <SelectItem value={RiskTermClassification.DECREASING}>Decreasing</SelectItem>
              <SelectItem value={RiskTermClassification.STEP_UP}>Step Up</SelectItem>
              <SelectItem value={RiskTermClassification.MULTI_LAYER}>Multi Layer</SelectItem>
            </SelectContent>
          </Select>
        </FieldRow>
      </div>

      {/* ── Derivation notes ───────────────────────────────────────────────── */}
      <div className="mt-4 flex items-start gap-2 rounded-lg bg-muted/30 border border-border px-4 py-3 text-xs text-muted-foreground">
        <Info className="size-3.5 shrink-0 mt-0.5" />
        <div className="flex flex-col gap-1">
          <span className="font-medium text-foreground">About derived fields</span>
          <p>
            <strong>Participation type</strong> and <strong>Scheme usage</strong> are auto-derived when you change Scheme type.
            They gate which products appear in the plan wizard.
          </p>
          {isMicro && (
            <p className="text-amber-700 font-medium mt-1">
              Micro-insurance marker is active — simplified product rules apply.
            </p>
          )}
        </div>
      </div>

      {/* ── Prior Policy ───────────────────────────────────────────────────── */}
      {showPriorPolicy && (
        <>
          <SectionHeading>Prior Policy</SectionHeading>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FieldRow label="Prior insurer" saveState={saving['priorInsurer']} error={errors['priorInsurer']}>
              <Input
                defaultValue={bundle.priorPolicy?.insurer ?? ''}
                disabled={!canWrite}
                className="text-sm"
                onBlur={(e) => persist('priorInsurer', { priorPolicy: { ...bundle.priorPolicy, insurer: e.target.value } })}
              />
            </FieldRow>
            <FieldRow label="Master policy number" saveState={saving['priorMPN']} error={errors['priorMPN']}>
              <Input
                defaultValue={bundle.priorPolicy?.masterPolicyNumber ?? ''}
                disabled={!canWrite}
                className="text-sm"
                onBlur={(e) => persist('priorMPN', { priorPolicy: { ...bundle.priorPolicy, masterPolicyNumber: e.target.value } })}
              />
            </FieldRow>
            <FieldRow label="Annualised premium (₹)" saveState={saving['priorPremium']} error={errors['priorPremium']}>
              <Input
                type="number"
                defaultValue={bundle.priorPolicy?.premium ?? ''}
                disabled={!canWrite}
                className="text-sm"
                onBlur={(e) => persist('priorPremium', { priorPolicy: { ...bundle.priorPolicy, premium: Number(e.target.value) } })}
              />
            </FieldRow>
            <FieldRow label="FCL basis" saveState={saving['fclBasis']} error={errors['fclBasis']}>
              <Input
                defaultValue={bundle.priorPolicy?.fclBasis ?? ''}
                disabled={!canWrite}
                className="text-sm"
                onBlur={(e) => persist('fclBasis', { priorPolicy: { ...bundle.priorPolicy, fclBasis: e.target.value } })}
              />
            </FieldRow>
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs">Experience available</Label>
              <button
                type="button"
                disabled={!canWrite}
                onClick={() => persist('expAvailable', { priorPolicy: { ...bundle.priorPolicy, experienceAvailable: !bundle.priorPolicy?.experienceAvailable } })}
                className={`flex h-8 w-14 items-center rounded-full border-2 transition-colors px-0.5 ${
                  bundle.priorPolicy?.experienceAvailable ? 'bg-primary border-primary justify-end' : 'bg-muted border-border justify-start'
                } disabled:opacity-50`}
              >
                <span className="h-6 w-6 rounded-full bg-white shadow-sm block" />
              </button>
            </div>
            {bundle.priorPolicy?.experienceAvailable && (
              <FieldRow label="Experience years" saveState={saving['expYears']} error={errors['expYears']}>
                <Input
                  type="number"
                  min="1" max="5"
                  defaultValue={bundle.priorPolicy?.experienceYears ?? ''}
                  disabled={!canWrite}
                  className="text-sm"
                  onBlur={(e) => persist('expYears', { priorPolicy: { ...bundle.priorPolicy, experienceYears: Number(e.target.value) } })}
                />
              </FieldRow>
            )}
          </div>
        </>
      )}

      {/* ── Global Coverage Basis ──────────────────────────────────────────── */}
      <SectionHeading>Global Coverage Basis</SectionHeading>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FieldRow label="Sum assured basis" saveState={saving['sumAssuredBasis']} error={errors['sumAssuredBasis']}>
          <Select
            disabled={!canWrite}
            defaultValue={bundle.sumAssuredBasis}
            onValueChange={(v) => persist('sumAssuredBasis', { sumAssuredBasis: v as SumAssuredBasis })}
          >
            <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value={SumAssuredBasis.FLAT}>Flat</SelectItem>
              <SelectItem value={SumAssuredBasis.SALARY_MULTIPLE}>Salary Multiple</SelectItem>
              <SelectItem value={SumAssuredBasis.GRADE_SLAB}>Grade Slab</SelectItem>
            </SelectContent>
          </Select>
        </FieldRow>

        <FieldRow label="Cover pattern" saveState={saving['coverPattern']} error={errors['coverPattern']}>
          <Select
            disabled={!canWrite}
            defaultValue={bundle.coverPattern}
            onValueChange={(v) => persist('coverPattern', { coverPattern: v as CoverPattern })}
          >
            <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value={CoverPattern.LEVEL}>Level</SelectItem>
              <SelectItem value={CoverPattern.REDUCING}>Reducing</SelectItem>
            </SelectContent>
          </Select>
        </FieldRow>

        <FieldRow label="Term basis" saveState={saving['termBasis']} error={errors['termBasis']}>
          <Select
            disabled={!canWrite}
            defaultValue={bundle.termBasis}
            onValueChange={(v) => persist('termBasis', { termBasis: v as TermBasis })}
          >
            <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value={TermBasis.POLICY_YEAR}>Policy Year</SelectItem>
              <SelectItem value={TermBasis.MEMBER_SPECIFIC}>Member Specific</SelectItem>
            </SelectContent>
          </Select>
        </FieldRow>

        <FieldRow label="Lives covered" saveState={saving['livesCovered']} error={errors['livesCovered']}>
          <Select
            disabled={!canWrite}
            defaultValue={bundle.livesCovered}
            onValueChange={(v) => persist('livesCovered', { livesCovered: v as LivesCovered })}
          >
            <SelectTrigger className="text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value={LivesCovered.MEMBER_ONLY}>Member Only</SelectItem>
              <SelectItem value={LivesCovered.MEMBER_SPOUSE}>Member + Spouse</SelectItem>
              <SelectItem value={LivesCovered.FAMILY_VARIANTS}>Family Variants</SelectItem>
            </SelectContent>
          </Select>
        </FieldRow>
      </div>

      {/* ── Footer actions ─────────────────────────────────────────────────── */}
      {/* NOTE: These buttons are cosmetic — fields are saved on edit via onBlur/onChange.
           Reset does not restore previous values. */}
      <div className="flex items-center justify-end gap-2 mt-8 pt-4 border-t border-border/40">
        <Button variant="outline" size="sm" disabled={!canWrite}>Reset</Button>
        <Button size="sm" disabled={!canWrite}>Save Changes</Button>
      </div>
    </div>
  );
}

