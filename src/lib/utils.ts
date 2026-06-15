import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import type { RfqBundle, ValidationReceipt, ProductPin } from '@/lib/types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// ─── Freeze helpers ───────────────────────────────────────────────────────────

/** Deterministic hash — not cryptographic; sufficient for config-change detection. */
function djb2(str: string): string {
  let h = 5381;
  for (let i = 0; i < str.length; i++) {
    h = (h * 33) ^ str.charCodeAt(i);
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}

/**
 * Build a ValidationReceipt for the given version.
 * Hashes the version id + plan ids + plan product codes so it changes
 * if any plan is added, removed, or its product code changes.
 */
export function generateValidationReceipt(
  bundle: RfqBundle,
  versionId: string
): ValidationReceipt {
  const version = bundle.quoteVersions.find((v) => v.id === versionId);
  const plans = bundle.plans.filter((p) => p.quoteVersionId === versionId);

  const configSeed = JSON.stringify({
    versionId,
    versionNo: version?.versionNo ?? 0,
    plans: plans.map((p) => ({ planId: p.planId, productCode: p.productCode ?? '' })),
  });

  const configHash = djb2(configSeed);

  const productPins: ProductPin[] = plans.map((p) => ({
    productCode: p.productCode ?? 'UNSET',
    filedVersion: 'v1',
    contentHash: djb2(`${p.planId}:${p.productCode ?? ''}`),
  }));

  return {
    configHash,
    productPins,
    validatedAt: new Date().toISOString(),
  };
}
