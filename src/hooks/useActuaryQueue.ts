'use client';

import { useCallback, useEffect, useState } from 'react';
import { ACTUARY_QUEUE_ITEMS, QUOTES_V2 } from '@/mocks/group-pas/quotation/data';
import type {
  ActuaryQueueItem,
  QuoteVersionStatus,
  RoundOutcome,
  QuotePremiumV2,
} from '@/types/group-pas/quotation-v2';
import type { ConfigurableRuleValue } from '@/components/quotation/version/plans/ConfigurableRuleBuilder';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface ActuaryRateCardOverride {
  planId: string;
  planName: string;
  rateCardRule: ConfigurableRuleValue;
}

export interface PricingDecision {
  versionId: string;
  outcome: RoundOutcome;
  remarks?: string;
  /** Per-plan revised rate card overrides. */
  rateCardOverrides?: ActuaryRateCardOverride[];
  /** Final rated premium — required when outcome is APPROVED. */
  ratedPremium?: QuotePremiumV2;
}

export interface CompletedActuaryQueueItem extends ActuaryQueueItem {
  outcome: RoundOutcome;
  completedAt: string;
  remarks?: string;
}

export interface UseActuaryQueueResult {
  queue: ActuaryQueueItem[];
  completedQueue: CompletedActuaryQueueItem[];
  isLoading: boolean;
  error: Error | null;
  /**
   * APPROVED → version RATED, pricing_path = MANUAL.
   * REJECTED → version DRAFT (returns to Sales for revision).
   */
  submitDecision: (decision: PricingDecision) => void;
  reassign: (versionId: string, toId: string, toName: string) => void;
  refetch: () => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Module-level mutable queue store
// ─────────────────────────────────────────────────────────────────────────────

let _queue: ActuaryQueueItem[] = [...ACTUARY_QUEUE_ITEMS];
let _completedQueue: CompletedActuaryQueueItem[] = [];
const _listeners: Set<() => void> = new Set();

function notifyAll() {
  _listeners.forEach((fn) => fn());
}

// ─────────────────────────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────────────────────────

export function useActuaryQueue(): UseActuaryQueueResult {
  const [queue, setQueue] = useState<ActuaryQueueItem[]>([]);
  const [completedQueue, setCompletedQueue] = useState<CompletedActuaryQueueItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error] = useState<Error | null>(null);

  const load = useCallback(() => {
    setIsLoading(true);
    const timer = setTimeout(() => {
      setQueue([..._queue]);
      setCompletedQueue([..._completedQueue]);
      setIsLoading(false);
    }, 200);
    return timer;
  }, []);

  useEffect(() => {
    const timer = load();
    const rerender = () => {
      setQueue([..._queue]);
      setCompletedQueue([..._completedQueue]);
    };
    _listeners.add(rerender);
    return () => {
      clearTimeout(timer);
      _listeners.delete(rerender);
    };
  }, [load]);

  const submitDecision = useCallback((decision: PricingDecision) => {
    const now = new Date().toISOString();

    // APPROVED → RATED (pricing_path = MANUAL)
    // REJECTED → DRAFT (returns to Sales for revision)
    const nextStatus: QuoteVersionStatus =
      decision.outcome === 'APPROVED' ? 'RATED' : 'DRAFT';

    const item = _queue.find((q) => q.version_id === decision.versionId);
    if (item) {
      const quoteIdx = QUOTES_V2.findIndex((q) => q.id === item.quote_id);
      if (quoteIdx >= 0) {
        const versionIdx = QUOTES_V2[quoteIdx].versions.findIndex(
          (v) => v.version_id === decision.versionId,
        );
        if (versionIdx >= 0) {
          const version = QUOTES_V2[quoteIdx].versions[versionIdx];

          const lastPricingRound = [...version.round_log]
            .reverse()
            .find((r) => r.roundKind === 'PRICING');
          if (lastPricingRound) {
            lastPricingRound.outcome = decision.outcome;
            lastPricingRound.completedAt = now;
            lastPricingRound.remarks = decision.remarks ?? lastPricingRound.remarks;
            // Store rate card overrides as parameterOverrides on the round
            if (decision.rateCardOverrides?.length) {
              lastPricingRound.parameterOverrides = decision.rateCardOverrides.map((rc) => ({
                parameterId: `${rc.planId}.rateCard`,
                parameterName: `${rc.planName} — Rate Card`,
                originalValue: '',
                overrideValue: JSON.stringify(rc.rateCardRule.spec),
                constraint: { type: 'FREE' as const },
                overrideReason: decision.remarks,
                overriddenAt: now,
              }));
            }
          }

          version.status = nextStatus;
          version.last_updated_at = now;
          if (decision.outcome === 'APPROVED') {
            version.pricing_path = 'MANUAL';
            if (decision.ratedPremium) {
              version.premium = decision.ratedPremium;
            }
          }
        }
      }

      // Move to completed queue
      const completed: CompletedActuaryQueueItem = {
        ...item,
        outcome: decision.outcome,
        completedAt: now,
        remarks: decision.remarks,
      };
      _completedQueue = [completed, ..._completedQueue];
    }

    _queue = _queue.filter((q) => q.version_id !== decision.versionId);
    notifyAll();
  }, []);

  const reassign = useCallback((versionId: string, toId: string, toName: string) => {
    _queue = _queue.map((item) =>
      item.version_id === versionId
        ? { ...item, assigned_to: toId, assigned_to_name: toName }
        : item,
    );
    notifyAll();
  }, []);

  const refetch = useCallback(() => load(), [load]);

  return { queue, completedQueue, isLoading, error, submitDecision, reassign, refetch };
}
