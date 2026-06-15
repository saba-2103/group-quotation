import { create } from 'zustand';
import type { Escalation } from '@/lib/types';
import { EscalationStatus, EscalationKind } from '@/lib/types';

// Client-only escalation registry — no backend persistence.
// Escalations are raised by SALES and decided by SALES L4+ (supervisor).

interface EscalationState {
  escalations: Escalation[];

  raise: (esc: Omit<Escalation, 'id' | 'status'>) => void;
  decide: (
    id: string,
    decision: {
      status: EscalationStatus.APPROVED | EscalationStatus.REJECTED;
      decidedBy: string;
      decisionNote?: string;
    }
  ) => void;

  getForVersion: (rfqId: string, versionId: string) => Escalation[];
  getForRfq: (rfqId: string, kind: EscalationKind) => Escalation[];
  hasPendingRequest: (rfqId: string, kind: EscalationKind, versionId?: string) => boolean;
  getApprovedOverride: (rfqId: string, versionId: string) => Escalation | null;
}

function localId(): string {
  return `esc-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

export const useEscalationStore = create<EscalationState>((set, get) => ({
  escalations: [],

  raise: (esc) => {
    const newEscalation: Escalation = {
      ...esc,
      id: localId(),
      status: EscalationStatus.PENDING,
    };
    set((state) => ({ escalations: [...state.escalations, newEscalation] }));
  },

  decide: (id, decision) => {
    set((state) => ({
      escalations: state.escalations.map((e) =>
        e.id === id
          ? {
              ...e,
              status: decision.status,
              decidedBy: decision.decidedBy,
              decidedAt: new Date().toISOString(),
              decisionNote: decision.decisionNote,
            }
          : e
      ),
    }));
  },

  getForVersion: (rfqId, versionId) =>
    get().escalations.filter((e) => e.rfqId === rfqId && e.versionId === versionId),

  getForRfq: (rfqId, kind) =>
    get().escalations.filter((e) => e.rfqId === rfqId && e.kind === kind),

  hasPendingRequest: (rfqId, kind, versionId) =>
    get().escalations.some(
      (e) =>
        e.rfqId === rfqId &&
        e.kind === kind &&
        e.status === EscalationStatus.PENDING &&
        (versionId === undefined || e.versionId === versionId)
    ),

  getApprovedOverride: (rfqId, versionId) =>
    get().escalations.find(
      (e) =>
        e.rfqId === rfqId &&
        e.versionId === versionId &&
        e.kind === EscalationKind.EXTRA_DISCOUNT &&
        e.status === EscalationStatus.APPROVED
    ) ?? null,
}));
