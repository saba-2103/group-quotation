'use client';

/**
 * PlansTab
 *
 * Renders the Plans list or slides over the PlanConfigurator panel.
 * Mounted inside the Version Workspace page "plans" tab.
 */

import { useState } from 'react';
import { Copy, Layers, Pencil, Plus, Trash2 } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

import { PlanConfigurator } from './plans/PlanConfigurator';
import type { PlanDraft } from './plans/PlanConfigurator';
import { PRODUCT_CATALOG } from '@/mocks/group-pas/quotation/data';
import type {
  PlanV2,
  QuoteVersion,
  SchemeType,
} from '@/types/group-pas/quotation-v2';
import { DEFAULT_STEP3 } from './plans/Step3EligibilitySI';
import { DEFAULT_STEP4 } from './plans/Step4UWValues';
import { DEFAULT_STEP5 } from './plans/Step5RateCard';
import { buildDefaultStep2 } from './plans/Step2Benefits';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function planToDraft(plan: PlanV2, schemeType: SchemeType): PlanDraft {
  // Reconstruct step1 from plan_definition
  const planProducts = plan.plan_definition.plan_product;
  const baseProduct = planProducts.find((p) => p.productType === 'BASE');
  const riderProducts = planProducts.filter((p) => p.productType === 'RIDER');

  const step1 = {
    baseProductCode: baseProduct?.productCode ?? '',
    selectedRiderCodes: riderProducts.map((r) => r.productCode),
  };
  const step2 = buildDefaultStep2(step1, schemeType);

  // SI
  const si = plan.plan_definition.si;
  const siRule =
    si.basis === 'FIXED' && si.fixedAmount
      ? {
          ruleType: 'FIXED' as const,
          spec: { type: 'FIXED' as const, value: si.fixedAmount.amount },
        }
      : DEFAULT_STEP3.siRule;

  // FCL
  const fcl = plan.plan_definition.fcl;
  const fclRule =
    fcl.type === 'FIXED' && fcl.amount
      ? {
          ruleType: 'FIXED' as const,
          spec: { type: 'FIXED' as const, value: fcl.amount.amount },
        }
      : DEFAULT_STEP4.fclRule;

  // NML
  const nml = plan.plan_definition.nml;
  const nmlRule =
    nml.type === 'FIXED' && nml.amount
      ? {
          ruleType: 'FIXED' as const,
          spec: { type: 'FIXED' as const, value: nml.amount.amount },
        }
      : DEFAULT_STEP4.nmlRule;

  return {
    plan_id: plan.plan_id,
    plan_number: plan.plan_number,
    plan_name: plan.plan_name,
    step1,
    step2,
    step3: { ...DEFAULT_STEP3, siRule },
    step4: { fclRule, nmlRule },
    step5: DEFAULT_STEP5,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Plan card
// ─────────────────────────────────────────────────────────────────────────────

function PlanCard({
  plan,
  onEdit,
  onDuplicate,
  onRemove,
  isDraft,
}: {
  plan: PlanV2;
  onEdit: () => void;
  onDuplicate: () => void;
  onRemove: () => void;
  isDraft: boolean;
}) {
  const baseProduct = plan.plan_definition.plan_product.find((p) => p.productType === 'BASE');
  const riders = plan.plan_definition.plan_product.filter((p) => p.productType === 'RIDER');
  const benefitCount = plan.plan_definition.plan_product.reduce(
    (n, p) => n + p.benefits.length,
    0,
  );

  return (
    <div className="group flex flex-col gap-3 rounded-xl border bg-background p-4 shadow-sm transition-shadow hover:shadow-md">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs text-muted-foreground">{plan.plan_number}</span>
          </div>
          <p className="text-sm font-semibold text-foreground">{plan.plan_name}</p>
        </div>
        {/* Actions */}
        <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          <button
            onClick={onEdit}
            className="rounded p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
            title="Edit plan"
          >
            <Pencil className="size-3.5" />
          </button>
          <button
            onClick={onDuplicate}
            disabled={!isDraft}
            className="rounded p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-30"
            title="Duplicate plan"
          >
            <Copy className="size-3.5" />
          </button>
          {isDraft && (
            <button
              onClick={onRemove}
              className="rounded p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
              title="Remove plan"
            >
              <Trash2 className="size-3.5" />
            </button>
          )}
        </div>
      </div>

      <Separator />

      {/* Details */}
      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
        {baseProduct && (
          <div className="flex items-center gap-1">
            <Layers className="size-3.5" />
            <span>{baseProduct.productName}</span>
          </div>
        )}
        {riders.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {riders.map((r) => (
              <Badge key={r.productCode} variant="outline" className="text-[10px]">
                {r.productName}
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* Counts */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <span>{benefitCount} benefit{benefitCount !== 1 ? 's' : ''}</span>
        <span>SI: {plan.plan_definition.si.basis.replace(/_/g, ' ')}</span>
        {plan.plan_definition.fcl.amount && (
          <span>
            FCL: ₹{plan.plan_definition.fcl.amount.amount.toLocaleString('en-IN')}
          </span>
        )}
      </div>

      {/* Click-to-edit hint */}
      <button
        onClick={onEdit}
        className="mt-1 w-full rounded border border-dashed border-border py-1.5 text-xs text-muted-foreground opacity-0 transition-opacity hover:border-indigo-400 hover:bg-indigo-50 hover:text-indigo-700 group-hover:opacity-100"
      >
        {isDraft ? 'Click to configure' : 'Click to view'}
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Empty state
// ─────────────────────────────────────────────────────────────────────────────

function EmptyPlans({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-20">
      <Layers className="size-10 text-muted-foreground/30" />
      <div className="text-center">
        <p className="text-sm font-medium text-muted-foreground">No plans configured</p>
        <p className="text-xs text-muted-foreground/70">
          Add at least one plan to configure products, benefits, and pricing.
        </p>
      </div>
      <Button size="sm" onClick={onAdd}>
        <Plus className="mr-1.5 size-3.5" />
        Add Plan
      </Button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PlansTab
// ─────────────────────────────────────────────────────────────────────────────

interface PlansTabProps {
  version: QuoteVersion;
  quote: { scheme_type: SchemeType };
  onPlansChange: (plans: PlanV2[]) => void;
}

export function PlansTab({ version, quote, onPlansChange }: PlansTabProps) {
  const [plans, setPlans] = useState<PlanV2[]>(version.plans);
  const [configuratorOpen, setConfiguratorOpen] = useState(false);
  const [editingDraft, setEditingDraft] = useState<PlanDraft | null>(null);

  const isDraft = version.status === 'DRAFT';

  function syncPlans(next: PlanV2[]) {
    setPlans(next);
    onPlansChange(next);
  }

  function openNew() {
    setEditingDraft(null);
    setConfiguratorOpen(true);
  }

  function openEdit(plan: PlanV2) {
    setEditingDraft(planToDraft(plan, quote.scheme_type));
    setConfiguratorOpen(true);
  }

  function handleSave(plan: PlanV2) {
    // Ensure plan_number is sequential
    const existingIdx = plans.findIndex((p) => p.plan_id === plan.plan_id);
    let next: PlanV2[];
    if (existingIdx >= 0) {
      next = plans.map((p, i) => (i === existingIdx ? plan : p));
    } else {
      const planNum = plans.length + 1;
      next = [...plans, { ...plan, plan_number: `PLAN-${String(planNum).padStart(3, '0')}` }];
    }
    syncPlans(next);
    setConfiguratorOpen(false);
  }

  function handleRemove(planId: string) {
    syncPlans(plans.filter((p) => p.plan_id !== planId));
  }

  function handleDuplicate(plan: PlanV2) {
    const now = Date.now();
    const planNum = plans.length + 1;
    syncPlans([
      ...plans,
      {
        ...plan,
        plan_id: `PLN-DUP-${now}`,
        plan_number: `PLAN-${String(planNum).padStart(3, '0')}`,
        plan_name: `${plan.plan_name} (copy)`,
      },
    ]);
  }

  // ── Render: configurator slides over plans list ──────────────────────────

  if (configuratorOpen) {
    return (
      <div className="h-full">
        <PlanConfigurator
          schemeType={quote.scheme_type}
          versionStatus={version.status}
          totalPlansCount={plans.length}
          initialPlan={editingDraft}
          onSave={handleSave}
          onClose={() => setConfiguratorOpen(false)}
        />
      </div>
    );
  }

  // ── Plans list ────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-4 px-6 py-5">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold">Plans</p>
          <p className="text-xs text-muted-foreground">
            {plans.length} plan{plans.length !== 1 ? 's' : ''} configured on this version
          </p>
        </div>
        <Button size="sm" disabled={!isDraft} onClick={openNew} title={!isDraft ? 'Only editable in DRAFT status' : undefined}>
          <Plus className="mr-1.5 size-3.5" />
          Add Plan
        </Button>
      </div>

      {/* List */}
      {plans.length === 0 ? (
        isDraft ? (
          <EmptyPlans onAdd={openNew} />
        ) : (
          <div className="py-12 text-center text-sm text-muted-foreground">No plans on this version.</div>
        )
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {plans.map((plan) => (
            <PlanCard
              key={plan.plan_id}
              plan={plan}
              isDraft={isDraft}
              onEdit={() => openEdit(plan)}
              onDuplicate={() => handleDuplicate(plan)}
              onRemove={() => handleRemove(plan.plan_id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
