'use client';

/**
 * CensusTab
 *
 * Aggregate census editor + Member-to-Plan Mapping rule viewer/editor.
 * Mounted in Version Workspace > Census & Mapping tab.
 */

import { useState } from 'react';
import { Info, Pencil, Users, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ConfigurableRuleBuilder } from './plans/ConfigurableRuleBuilder';
import type { ConfigurableRuleValue } from './plans/ConfigurableRuleBuilder';
import type {
  AggregateCensusV2,
  PlanV2,
  QuoteVersion,
  SchemeType,
} from '@/types/group-pas/quotation-v2';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface CensusTabProps {
  version: QuoteVersion;
  schemeType: SchemeType;
  onCensusChange: (census: AggregateCensusV2) => void;
  onMappingChange: (rule: ConfigurableRuleValue) => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// GCL banner
// ─────────────────────────────────────────────────────────────────────────────

function GCLBanner() {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
      <Info className="mt-0.5 size-4 shrink-0 text-slate-400" />
      <div>
        <p className="text-sm font-medium text-slate-600">Not required for GCL</p>
        <p className="mt-0.5 text-xs text-slate-500">
          Aggregate census is not required for GCL schemes. Pricing happens per loan member
          at policy issuance. No census or mapping configuration is needed here.
        </p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Census section
// ─────────────────────────────────────────────────────────────────────────────

function CensusSection({
  census,
  plans,
  isDraft,
  onSave,
}: {
  census: AggregateCensusV2;
  plans: PlanV2[];
  isDraft: boolean;
  onSave: (c: AggregateCensusV2) => void;
}) {
  const hasData = census.headcount > 0 || census.planBreakdown.some((r) => r.headcount > 0);
  const [editing, setEditing] = useState(false);
  // Local edit state: planId → headcount
  const [editHeadcounts, setEditHeadcounts] = useState<Record<string, number>>(() =>
    Object.fromEntries(census.planBreakdown.map((r) => [r.planId, r.headcount])),
  );

  function totalHeadcount(hc: Record<string, number>) {
    return Object.values(hc).reduce((s, v) => s + v, 0);
  }

  function startEdit() {
    // Seed with current planBreakdown
    const seed: Record<string, number> = {};
    for (const plan of plans) {
      const existing = census.planBreakdown.find((r) => r.planId === plan.plan_id);
      seed[plan.plan_id] = existing?.headcount ?? 0;
    }
    setEditHeadcounts(seed);
    setEditing(true);
  }

  function saveEdit() {
    const planBreakdown = Object.entries(editHeadcounts).map(([planId, headcount]) => ({
      planId,
      headcount,
    }));
    onSave({
      ...census,
      headcount: totalHeadcount(editHeadcounts),
      planBreakdown,
    });
    setEditing(false);
  }

  // ── Section header ──────────────────────────────────────────────────────
  const header = (
    <div className="mb-3 flex items-center justify-between">
      <div>
        <p className="text-sm font-semibold">Aggregate Census</p>
        <p className="text-xs text-muted-foreground">
          Headcount per plan used for premium calculation.
        </p>
      </div>
      {isDraft && !editing && (
        <Button variant="ghost" size="xs" onClick={startEdit}>
          <Pencil className="mr-1 size-3" />
          {hasData ? 'Edit' : 'Set Census'}
        </Button>
      )}
    </div>
  );

  // ── Edit form ───────────────────────────────────────────────────────────
  if (editing) {
    if (plans.length === 0) {
      return (
        <div>
          {header}
          <p className="text-xs text-muted-foreground">
            No plans configured on this version yet. Add plans first.
          </p>
        </div>
      );
    }
    const total = totalHeadcount(editHeadcounts);
    return (
      <div>
        {header}
        <div className="overflow-hidden rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-1/2">Plan</TableHead>
                <TableHead>Headcount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {plans.map((plan) => (
                <TableRow key={plan.plan_id}>
                  <TableCell className="font-medium">
                    <div>
                      <p className="text-xs font-mono text-muted-foreground">
                        {plan.plan_number}
                      </p>
                      <p className="text-sm">{plan.plan_name}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      min={0}
                      value={editHeadcounts[plan.plan_id] ?? 0}
                      onChange={(e) =>
                        setEditHeadcounts((hc) => ({
                          ...hc,
                          [plan.plan_id]: Math.max(0, Number(e.target.value)),
                        }))
                      }
                      className="h-8 w-32 text-xs"
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
            <TableFooter>
              <TableRow>
                <TableCell className="font-semibold text-sm">Total</TableCell>
                <TableCell className="font-semibold tabular-nums">{total.toLocaleString('en-IN')}</TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        </div>
        <div className="mt-3 flex items-center gap-2">
          <Button size="sm" onClick={saveEdit}>
            Save
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  // ── Empty state ─────────────────────────────────────────────────────────
  if (!hasData) {
    return (
      <div>
        {header}
        <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed py-12">
          <Users className="size-8 text-muted-foreground/30" />
          <div className="text-center">
            <p className="text-sm font-medium text-muted-foreground">No census data yet</p>
            <p className="text-xs text-muted-foreground/70">
              Set headcount per plan to enable premium calculation.
            </p>
          </div>
          {isDraft && (
            <Button size="sm" variant="outline" onClick={startEdit}>
              Set Census
            </Button>
          )}
        </div>
      </div>
    );
  }

  // ── Read-only table ─────────────────────────────────────────────────────
  const planMap = Object.fromEntries(plans.map((p) => [p.plan_id, p]));

  return (
    <div>
      {header}
      <div className="overflow-hidden rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-1/2">Plan</TableHead>
              <TableHead className="text-right">Headcount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {census.planBreakdown.map((row) => {
              const plan = planMap[row.planId];
              return (
                <TableRow key={row.planId}>
                  <TableCell>
                    {plan ? (
                      <div>
                        <p className="font-mono text-xs text-muted-foreground">
                          {plan.plan_number}
                        </p>
                        <p className="text-sm font-medium">{plan.plan_name}</p>
                      </div>
                    ) : (
                      <span className="font-mono text-xs text-muted-foreground">
                        {row.planId}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {row.headcount.toLocaleString('en-IN')}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
          <TableFooter>
            <TableRow>
              <TableCell className="font-semibold text-sm">Total</TableCell>
              <TableCell className="text-right font-semibold tabular-nums">
                {census.headcount.toLocaleString('en-IN')}
              </TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      </div>
      {/* Extra census metadata */}
      {(census.avgAge || census.avgSumInsured) && (
        <div className="mt-2 flex flex-wrap gap-4 text-xs text-muted-foreground">
          {census.avgAge && <span>Avg age: {census.avgAge} yrs</span>}
          {census.avgSumInsured && (
            <span>
              Avg SI: ₹
              {census.avgSumInsured.amount.toLocaleString('en-IN')}
            </span>
          )}
          {census.industryHazardBand && (
            <span>Hazard band: {census.industryHazardBand}</span>
          )}
          {census.coverageBasis && (
            <span>Coverage: {census.coverageBasis.replace(/_/g, ' ')}</span>
          )}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Mapping section
// ─────────────────────────────────────────────────────────────────────────────

const DEFAULT_MAPPING_RULE: ConfigurableRuleValue = {
  ruleType: 'FORMULA',
  spec: {
    type: 'FORMULA',
    expression: 'salary > 100000 ? "PLAN-002" : "PLAN-001"',
    variables: ['salary'],
  },
};

function MappingSection({
  mappingJson,
  plans,
  isDraft,
  onSave,
}: {
  mappingJson?: string;
  plans: PlanV2[];
  isDraft: boolean;
  onSave: (rule: ConfigurableRuleValue) => void;
}) {
  const parsed: ConfigurableRuleValue | null = (() => {
    try {
      return mappingJson ? JSON.parse(mappingJson) : null;
    } catch {
      return null;
    }
  })();

  const [editing, setEditing] = useState(false);
  const [draftRule, setDraftRule] = useState<ConfigurableRuleValue>(
    parsed ?? DEFAULT_MAPPING_RULE,
  );

  function saveEdit() {
    onSave(draftRule);
    setEditing(false);
  }

  const isMultiPlan = plans.length > 1;
  const notRequired = !isMultiPlan;

  const header = (
    <div className="mb-3 flex items-center justify-between">
      <div>
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold">Member-to-Plan Mapping Rule</p>
          <span
            title="This rule is executed by the Rule Engine at member intake during policy issuance to assign each member to a plan based on their attributes."
            className="cursor-help text-xs text-muted-foreground underline decoration-dotted"
          >
            What is this?
          </span>
        </div>
        <p className="text-xs text-muted-foreground">
          Assigns members to plans at policy issuance based on attributes (e.g. salary, grade).
        </p>
      </div>
      {isDraft && !editing && isMultiPlan && (
        <Button variant="ghost" size="xs" onClick={() => setEditing(true)}>
          <Pencil className="mr-1 size-3" />
          Edit
        </Button>
      )}
    </div>
  );

  if (notRequired) {
    return (
      <div>
        {header}
        <div className="flex items-start gap-2 rounded-lg bg-muted/40 p-3 text-xs text-muted-foreground">
          <Info className="mt-0.5 size-3.5 shrink-0" />
          <span>
            Mapping rule is only required when there are multiple plans on a version. Add more
            plans to configure mapping.
          </span>
        </div>
      </div>
    );
  }

  return (
    <div>
      {header}
      <div className="rounded-lg border bg-background p-4">
        <ConfigurableRuleBuilder
          value={draftRule}
          onChange={setDraftRule}
          readOnly={!editing}
        />
        {editing && (
          <div className="mt-3 flex items-center gap-2">
            <Button size="sm" onClick={saveEdit}>
              Save Rule
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
              Cancel
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CensusTab (exported)
// ─────────────────────────────────────────────────────────────────────────────

export function CensusTab({
  version,
  schemeType,
  onCensusChange,
  onMappingChange,
}: CensusTabProps) {
  const isDraft = version.status === 'DRAFT';

  if (schemeType === 'GCL') {
    return (
      <div className="flex flex-col gap-6 px-6 py-5">
        <GCLBanner />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 px-6 py-5">
      {/* Census */}
      <CensusSection
        census={version.aggregate_census}
        plans={version.plans}
        isDraft={isDraft}
        onSave={onCensusChange}
      />

      <Separator />

      {/* Mapping */}
      <MappingSection
        mappingJson={version.member_to_plan_mapping}
        plans={version.plans}
        isDraft={isDraft}
        onSave={onMappingChange}
      />
    </div>
  );
}
