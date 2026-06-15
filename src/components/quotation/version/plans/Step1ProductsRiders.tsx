'use client';

/**
 * Step 1 — Products & Riders
 *
 * Left: Base product radio cards (filtered to scheme).
 * Right: Rider toggle cards (after base selected).
 */

import { Info } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { PRODUCT_CATALOG } from '@/mocks/group-pas/quotation/data';
import type { ProductCatalogItem, SchemeType } from '@/types/group-pas/quotation-v2';

// ─────────────────────────────────────────────────────────────────────────────

export interface Step1State {
  baseProductCode: string;
  selectedRiderCodes: string[];
}

interface Props {
  schemeType: SchemeType;
  value: Step1State;
  onChange: (v: Step1State) => void;
  readOnly?: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const SCHEME_CHIP: Record<string, string> = {
  GTL: 'bg-violet-50 text-violet-700 ring-violet-200',
  GCL: 'bg-blue-50 text-blue-700 ring-blue-200',
  GH: 'bg-teal-50 text-teal-700 ring-teal-200',
};

function SchemeChip({ scheme }: { scheme: string }) {
  return (
    <span
      className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold ring-1 ring-inset ${
        SCHEME_CHIP[scheme] ?? 'bg-muted text-muted-foreground ring-border'
      }`}
    >
      {scheme}
    </span>
  );
}

// Whether a rider is blocked (business rule: you can only have one of GTL-CI / GTL-WOP if base is GTL)
function isBlocked(
  rider: ProductCatalogItem,
  base: ProductCatalogItem | undefined,
  selected: string[],
): { blocked: boolean; reason?: string } {
  // Demo rule: GTL-WOP requires GTL-ADB selected first
  if (rider.productCode === 'GTL-WOP' && !selected.includes('GTL-ADB')) {
    return { blocked: true, reason: 'Requires Accidental Death Benefit to be selected first.' };
  }
  return { blocked: false };
}

// ─────────────────────────────────────────────────────────────────────────────

export function Step1ProductsRiders({ schemeType, value, onChange, readOnly }: Props) {
  const baseCatalog = PRODUCT_CATALOG.filter(
    (p) => p.productType === 'BASE' && p.schemeTypes.includes(schemeType),
  );
  const riderCatalog = PRODUCT_CATALOG.filter(
    (p) => p.productType === 'RIDER' && p.schemeTypes.includes(schemeType),
  );
  const selectedBase = baseCatalog.find((p) => p.productCode === value.baseProductCode);

  function selectBase(code: string) {
    if (readOnly) return;
    onChange({ baseProductCode: code, selectedRiderCodes: [] });
  }

  function toggleRider(code: string) {
    if (readOnly) return;
    const selected = value.selectedRiderCodes.includes(code)
      ? value.selectedRiderCodes.filter((c) => c !== code)
      : [...value.selectedRiderCodes, code];
    onChange({ ...value, selectedRiderCodes: selected });
  }

  return (
    <div className="flex gap-6">
      {/* Base products */}
      <div className="flex w-72 shrink-0 flex-col gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Base Product
        </p>
        {baseCatalog.map((product) => {
          const active = value.baseProductCode === product.productCode;
          return (
            <button
              key={product.productCode}
              onClick={() => selectBase(product.productCode)}
              disabled={readOnly}
              className={`flex flex-col gap-1 rounded-lg border p-3 text-left transition-colors ${
                active
                  ? 'border-indigo-500 bg-indigo-50 ring-1 ring-indigo-400'
                  : 'border-border hover:border-indigo-300 hover:bg-accent'
              } ${readOnly ? 'cursor-default opacity-70' : 'cursor-pointer'}`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-semibold text-foreground">{product.productName}</span>
                <div className="flex gap-1">
                  {product.schemeTypes.map((s) => (
                    <SchemeChip key={s} scheme={s} />
                  ))}
                </div>
              </div>
              <p className="text-xs text-muted-foreground">{product.description}</p>
              <div className="mt-1 flex flex-wrap gap-1">
                {product.defaultBenefits.map((b) => (
                  <Badge key={b.code} variant="secondary" className="text-[10px]">
                    {b.name}
                  </Badge>
                ))}
              </div>
            </button>
          );
        })}
      </div>

      {/* Divider */}
      {selectedBase && (
        <div className="w-px bg-border" />
      )}

      {/* Riders */}
      {selectedBase && (
        <div className="flex flex-1 flex-col gap-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Available Riders
          </p>
          {riderCatalog.length === 0 && (
            <p className="text-xs text-muted-foreground">No riders available for this scheme.</p>
          )}
          {riderCatalog.map((rider) => {
            const { blocked, reason } = isBlocked(
              rider,
              selectedBase,
              value.selectedRiderCodes,
            );
            const selected = value.selectedRiderCodes.includes(rider.productCode);

            return (
              <div
                key={rider.productCode}
                className={`flex items-start justify-between gap-3 rounded-lg border p-3 transition-colors ${
                  blocked ? 'opacity-50' : ''
                } ${
                  selected && !blocked
                    ? 'border-indigo-400 bg-indigo-50'
                    : 'border-border bg-background'
                }`}
              >
                <div className="flex flex-col gap-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{rider.productName}</span>
                    {blocked && reason && (
                      <span
                        className="group relative inline-flex"
                        title={reason}
                      >
                        <Info className="size-3.5 text-muted-foreground" />
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">{rider.description}</p>
                  {blocked && reason && (
                    <p className="mt-0.5 text-[11px] text-amber-600">{reason}</p>
                  )}
                </div>

                {/* Toggle */}
                <button
                  disabled={blocked || readOnly}
                  onClick={() => toggleRider(rider.productCode)}
                  className={`mt-0.5 shrink-0 rounded px-2 py-1 text-xs font-medium transition-colors ${
                    selected
                      ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                      : blocked || readOnly
                      ? 'cursor-not-allowed bg-muted text-muted-foreground'
                      : 'bg-muted text-muted-foreground hover:bg-indigo-50 hover:text-indigo-700'
                  }`}
                >
                  {selected ? 'Remove' : 'Add'}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {!selectedBase && (
        <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
          Select a base product to see available riders.
        </div>
      )}
    </div>
  );
}
