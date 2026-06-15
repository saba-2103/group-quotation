'use client';

import { useCallback, useEffect, useState } from 'react';
import { UW_QUEUE_ITEMS, QUOTES_V2 } from '@/mocks/group-pas/quotation/data';
import type {
  UWQueueItem,
  QuoteVersionStatus,
  RoundOutcome,
  ConfigurableRuleSpec,
  ConfigurableRuleType,
} from '@/types/group-pas/quotation-v2';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface UWRuleOverride {
  ruleType: ConfigurableRuleType;
  spec: ConfigurableRuleSpec;
}

export interface UWPlanDecisionOverride {
  planId: string;
  planName: string;
  fclRule?: UWRuleOverride;
  nmlRule?: UWRuleOverride;
}

export interface UWDecision {
  versionId: string;
  outcome: RoundOutcome;
  remarks?: string;
  assignedToId?: string;
  assignedToName?: string;
  planOverrides?: UWPlanDecisionOverride[];
}

export interface CompletedUWQueueItem extends UWQueueItem {
  outcome: RoundOutcome;
  completedAt: string;
  completedByName?: string;
  remarks?: string;
}

export interface UseUWQueueResult {
  queue: UWQueueItem[];
  completedQueue: CompletedUWQueueItem[];
  isLoading: boolean;
  error: Error | null;
  /**
   * Approve (→ EVALUATED, uw_path=MANUAL) or reject (→ DRAFT) a referred version.
   * Updates the backing store and moves the item to completedQueue.
   */
  submitDecision: (decision: UWDecision) => void;
  /**
   * Re-assign a queue item to a different underwriter.
   */
  reassign: (versionId: string, toId: string, toName: string) => void;
  refetch: () => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Module-level mutable queue store
// ─────────────────────────────────────────────────────────────────────────────

let _queue: UWQueueItem[] = [...UW_QUEUE_ITEMS];
let _completedQueue: CompletedUWQueueItem[] = [];
const _listeners: Set<() => void> = new Set();

function notifyAll() {
  _listeners.forEach((fn) => fn());
}

// ─────────────────────────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────────────────────────

export function useUWQueue(): UseUWQueueResult {
  const [queue, setQueue] = useState<UWQueueItem[]>([]);
  const [completedQueue, setCompletedQueue] = useState<CompletedUWQueueItem[]>([]);
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

  const submitDecision = useCallback((decision: UWDecision) => {
    const now = new Date().toISOString();

    // APPROVED → EVALUATED (uw_path = MANUAL)
    // REJECTED → DRAFT (back for re-work by sales)
    let nextStatus: QuoteVersionStatus;
    if (decision.outcome === 'APPROVED') {
      nextStatus = 'EVALUATED';
    } else {
      nextStatus = 'DRAFT';
    }

    const item = _queue.find((q) => q.version_id === decision.versionId);
    if (item) {
      const quoteIdx = QUOTES_V2.findIndex((q) => q.id === item.quote_id);
      if (quoteIdx >= 0) {
        const versionIdx = QUOTES_V2[quoteIdx].versions.findIndex(
          (v) => v.version_id === decision.versionId,
        );
        if (versionIdx >= 0) {
          const ver = QUOTES_V2[quoteIdx].versions[versionIdx];
          const round = ver.round_log;
          const lastRound = round[round.length - 1];
          if (lastRound) {
            lastRound.outcome = decision.outcome;
            lastRound.completedAt = now;
            lastRound.remarks = decision.remarks ?? lastRound.remarks;
            // Store FCL/NML overrides as parameterOverrides on the round
            if (decision.planOverrides?.length) {
              lastRound.parameterOverrides = decision.planOverrides.flatMap((po) => {
                const overrides = [];
                if (po.fclRule) {
                  overrides.push({
                    parameterId: `${po.planId}.fcl`,
                    parameterName: `${po.planName} — FCL`,
                    originalValue: '',
                    overrideValue: JSON.stringify(po.fclRule.spec),
                    constraint: { type: 'FREE' as const },
                    overrideReason: decision.remarks,
                    overriddenAt: now,
                  });
                }
                if (po.nmlRule) {
                  overrides.push({
                    parameterId: `${po.planId}.nml`,
                    parameterName: `${po.planName} — NML`,
                    originalValue: '',
                    overrideValue: JSON.stringify(po.nmlRule.spec),
                    constraint: { type: 'FREE' as const },
                    overrideReason: decision.remarks,
                    overriddenAt: now,
                  });
                }
                return overrides;
              });
            }
          }
          ver.status = nextStatus;
          ver.last_updated_at = now;
          if (decision.outcome === 'APPROVED') {
            ver.uw_path = 'MANUAL';
          }
        }
      }

      // Move to completed queue
      const completed: CompletedUWQueueItem = {
        ...item,
        outcome: decision.outcome,
        completedAt: now,
        remarks: decision.remarks,
      };
      _completedQueue = [completed, ..._completedQueue];
    }

    // Remove from open queue
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
