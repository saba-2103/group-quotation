'use client';

import { useCallback, useEffect, useState } from 'react';
import { QUOTES_V2 } from '@/mocks/group-pas/quotation/data';
import type {
  AggregateCensusV2,
  DocumentAttachment,
  PricingPath,
  Quote,
  QuotePremiumV2,
  QuoteStatus,
  QuoteVersion,
  QuoteVersionStatus,
  Round,
  ParameterOverride,
} from '@/types/group-pas/quotation-v2';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface UseQuoteVersionsResult {
  quote: Quote | null;
  versions: QuoteVersion[];
  activeVersion: QuoteVersion | null;
  isLoading: boolean;
  error: Error | null;
  updateVersionStatus: (versionId: string, status: QuoteVersionStatus) => void;
  updateVersionLabel: (versionId: string, label: string) => void;
  updateVersionCensus: (versionId: string, census: AggregateCensusV2) => void;
  updateVersionMapping: (versionId: string, mappingJson: string) => void;
  addRoundToVersion: (versionId: string, round: Round) => void;
  addParameterOverride: (versionId: string, override: ParameterOverride) => void;
  addDocumentToVersion: (versionId: string, doc: DocumentAttachment) => void;
  updateVersionPremium: (versionId: string, premium: QuotePremiumV2) => void;
  updateVersionPricingPath: (versionId: string, path: PricingPath) => void;
  updateVersionFields: (versionId: string, fields: Partial<QuoteVersion>) => void;
  updateQuoteStatus: (status: QuoteStatus) => void;
  supersedeSiblings: (keepVersionId: string) => void;
  createNewVersion: (quoteId: string, baseVersionId: string) => QuoteVersion | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Module-level store (shared with useQuotes — same backing array)
// ─────────────────────────────────────────────────────────────────────────────

let _store: Quote[] = [...QUOTES_V2];

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

let _versionSeq = 100;
function nextVersionId(): string {
  return `VER-V2-${String(_versionSeq++).padStart(4, '0')}-X`;
}

function mutateStore(quoteId: string, mutate: (q: Quote) => Quote) {
  _store = _store.map((q) => (q.id === quoteId ? mutate(q) : q));
}

// ─────────────────────────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────────────────────────

export function useQuoteVersions(quoteId: string | null): UseQuoteVersionsResult {
  const [quote, setQuote] = useState<Quote | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error] = useState<Error | null>(null);

  const load = useCallback(() => {
    if (!quoteId) {
      setQuote(null);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    const timer = setTimeout(() => {
      const found = _store.find((q) => q.id === quoteId) ?? null;
      setQuote(found ? { ...found } : null);
      setIsLoading(false);
    }, 200);
    return () => clearTimeout(timer);
  }, [quoteId]);

  useEffect(() => {
    const cleanup = load();
    return cleanup;
  }, [load]);

  const updateVersionStatus = useCallback(
    (versionId: string, status: QuoteVersionStatus) => {
      if (!quoteId) return;
      mutateStore(quoteId, (q) => ({
        ...q,
        last_updated_at: new Date().toISOString(),
        versions: q.versions.map((v) =>
          v.version_id === versionId
            ? { ...v, status, last_updated_at: new Date().toISOString() }
            : v,
        ),
      }));
      setQuote((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          versions: prev.versions.map((v) =>
            v.version_id === versionId
              ? { ...v, status, last_updated_at: new Date().toISOString() }
              : v,
          ),
        };
      });
    },
    [quoteId],
  );

  const updateVersionLabel = useCallback(
    (versionId: string, label: string) => {
      if (!quoteId) return;
      mutateStore(quoteId, (q) => ({
        ...q,
        last_updated_at: new Date().toISOString(),
        versions: q.versions.map((v) =>
          v.version_id === versionId
            ? { ...v, version_label: label, last_updated_at: new Date().toISOString() }
            : v,
        ),
      }));
      setQuote((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          versions: prev.versions.map((v) =>
            v.version_id === versionId ? { ...v, version_label: label } : v,
          ),
        };
      });
    },
    [quoteId],
  );

  const updateVersionCensus = useCallback(
    (versionId: string, census: AggregateCensusV2) => {
      if (!quoteId) return;
      mutateStore(quoteId, (q) => ({
        ...q,
        last_updated_at: new Date().toISOString(),
        versions: q.versions.map((v) =>
          v.version_id === versionId
            ? { ...v, aggregate_census: census, last_updated_at: new Date().toISOString() }
            : v,
        ),
      }));
      setQuote((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          versions: prev.versions.map((v) =>
            v.version_id === versionId ? { ...v, aggregate_census: census } : v,
          ),
        };
      });
    },
    [quoteId],
  );

  const updateVersionMapping = useCallback(
    (versionId: string, mappingJson: string) => {
      if (!quoteId) return;
      mutateStore(quoteId, (q) => ({
        ...q,
        last_updated_at: new Date().toISOString(),
        versions: q.versions.map((v) =>
          v.version_id === versionId
            ? { ...v, member_to_plan_mapping: mappingJson, last_updated_at: new Date().toISOString() }
            : v,
        ),
      }));
      setQuote((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          versions: prev.versions.map((v) =>
            v.version_id === versionId ? { ...v, member_to_plan_mapping: mappingJson } : v,
          ),
        };
      });
    },
    [quoteId],
  );

  const updateVersionPremium = useCallback(
    (versionId: string, premium: QuotePremiumV2) => {
      if (!quoteId) return;
      mutateStore(quoteId, (q) => ({
        ...q,
        last_updated_at: new Date().toISOString(),
        versions: q.versions.map((v) =>
          v.version_id === versionId
            ? { ...v, premium, last_updated_at: new Date().toISOString() }
            : v,
        ),
      }));
      setQuote((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          versions: prev.versions.map((v) =>
            v.version_id === versionId ? { ...v, premium } : v,
          ),
        };
      });
    },
    [quoteId],
  );

  const updateVersionPricingPath = useCallback(
    (versionId: string, path: PricingPath) => {
      if (!quoteId) return;
      mutateStore(quoteId, (q) => ({
        ...q,
        last_updated_at: new Date().toISOString(),
        versions: q.versions.map((v) =>
          v.version_id === versionId
            ? { ...v, pricing_path: path, last_updated_at: new Date().toISOString() }
            : v,
        ),
      }));
      setQuote((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          versions: prev.versions.map((v) =>
            v.version_id === versionId ? { ...v, pricing_path: path } : v,
          ),
        };
      });
    },
    [quoteId],
  );

  const updateVersionFields = useCallback(
    (versionId: string, fields: Partial<QuoteVersion>) => {
      if (!quoteId) return;
      const now = new Date().toISOString();
      mutateStore(quoteId, (q) => ({
        ...q,
        last_updated_at: now,
        versions: q.versions.map((v) =>
          v.version_id === versionId
            ? { ...v, ...fields, last_updated_at: now }
            : v,
        ),
      }));
      setQuote((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          versions: prev.versions.map((v) =>
            v.version_id === versionId ? { ...v, ...fields } : v,
          ),
        };
      });
    },
    [quoteId],
  );

  const updateQuoteStatus = useCallback(
    (status: QuoteStatus) => {
      if (!quoteId) return;
      const now = new Date().toISOString();
      mutateStore(quoteId, (q) => ({ ...q, status, last_updated_at: now }));
      setQuote((prev) => (prev ? { ...prev, status } : prev));
    },
    [quoteId],
  );

  const supersedeSiblings = useCallback(
    (keepVersionId: string) => {
      if (!quoteId) return;
      const now = new Date().toISOString();
      const TERMINAL: QuoteVersionStatus[] = ['SUPERSEDED', 'REJECTED', 'WITHDRAWN', 'EXPIRED', 'FINALIZED'];
      mutateStore(quoteId, (q) => ({
        ...q,
        last_updated_at: now,
        versions: q.versions.map((v) =>
          v.version_id === keepVersionId || TERMINAL.includes(v.status)
            ? v
            : {
                ...v,
                status: 'SUPERSEDED' as QuoteVersionStatus,
                supersession_cause: 'SIBLING_FINALIZED' as const,
                superseded_by_version_id: keepVersionId,
                last_updated_at: now,
              },
        ),
      }));
      setQuote((prev) => {
        if (!prev) return prev;
        const TERMINAL_SET = new Set(['SUPERSEDED', 'REJECTED', 'WITHDRAWN', 'EXPIRED', 'FINALIZED']);
        return {
          ...prev,
          versions: prev.versions.map((v) =>
            v.version_id === keepVersionId || TERMINAL_SET.has(v.status)
              ? v
              : {
                  ...v,
                  status: 'SUPERSEDED' as QuoteVersionStatus,
                  supersession_cause: 'SIBLING_FINALIZED' as const,
                  superseded_by_version_id: keepVersionId,
                },
          ),
        };
      });
    },
    [quoteId],
  );

  const addRoundToVersion = useCallback(
    (versionId: string, round: Round) => {
      if (!quoteId) return;
      mutateStore(quoteId, (q) => ({
        ...q,
        last_updated_at: new Date().toISOString(),
        versions: q.versions.map((v) =>
          v.version_id === versionId
            ? { ...v, round_log: [...v.round_log, round], last_updated_at: new Date().toISOString() }
            : v,
        ),
      }));
      setQuote((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          versions: prev.versions.map((v) =>
            v.version_id === versionId
              ? { ...v, round_log: [...v.round_log, round] }
              : v,
          ),
        };
      });
    },
    [quoteId],
  );

  const addParameterOverride = useCallback(
    (versionId: string, override: ParameterOverride) => {
      if (!quoteId) return;
      mutateStore(quoteId, (q) => ({
        ...q,
        versions: q.versions.map((v) => {
          if (v.version_id !== versionId) return v;
          const overrides = v.parameter_overrides ?? [];
          const existing = overrides.findIndex((o) => o.parameterId === override.parameterId);
          const updated =
            existing >= 0
              ? overrides.map((o, i) => (i === existing ? override : o))
              : [...overrides, override];
          return { ...v, parameter_overrides: updated, last_updated_at: new Date().toISOString() };
        }),
      }));
      setQuote((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          versions: prev.versions.map((v) => {
            if (v.version_id !== versionId) return v;
            const overrides = v.parameter_overrides ?? [];
            const existing = overrides.findIndex((o) => o.parameterId === override.parameterId);
            const updated =
              existing >= 0
                ? overrides.map((o, i) => (i === existing ? override : o))
                : [...overrides, override];
            return { ...v, parameter_overrides: updated };
          }),
        };
      });
    },
    [quoteId],
  );

  const createNewVersion = useCallback(
    (targetQuoteId: string, baseVersionId: string): QuoteVersion | null => {
      const q = _store.find((x) => x.id === targetQuoteId);
      if (!q) return null;
      const base = q.versions.find((v) => v.version_id === baseVersionId);
      if (!base) return null;
      const now = new Date().toISOString();
      const newVersion: QuoteVersion = {
        ...base,
        version_id: nextVersionId(),
        version_number: q.versions.length + 1,
        status: 'DRAFT',
        round_log: [],
        attached_documents: [],
        premium: undefined,
        superseded_by_version_id: undefined,
        supersession_cause: undefined,
        withdrawn_cause: undefined,
        submitted_at: undefined,
        sent_to_client_at: undefined,
        accepted_at: undefined,
        finalized_at: undefined,
        rejected_at: undefined,
        withdrawn_at: undefined,
        expired_at: undefined,
        created_at: now,
        last_updated_at: now,
      };
      mutateStore(targetQuoteId, (x) => ({
        ...x,
        versions: [...x.versions, newVersion],
        last_updated_at: now,
      }));
      setQuote((prev) => {
        if (!prev || prev.id !== targetQuoteId) return prev;
        return { ...prev, versions: [...prev.versions, newVersion] };
      });
      return newVersion;
    },
    [],
  );

  const addDocumentToVersion = useCallback(
    (versionId: string, doc: DocumentAttachment) => {
      if (!quoteId) return;
      mutateStore(quoteId, (q) => ({
        ...q,
        last_updated_at: new Date().toISOString(),
        versions: q.versions.map((v) =>
          v.version_id === versionId
            ? { ...v, attached_documents: [...v.attached_documents, doc], last_updated_at: new Date().toISOString() }
            : v,
        ),
      }));
      setQuote((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          versions: prev.versions.map((v) =>
            v.version_id === versionId
              ? { ...v, attached_documents: [...v.attached_documents, doc] }
              : v,
          ),
        };
      });
    },
    [quoteId],
  );

  const versions = quote?.versions ?? [];
  const activeVersion =
    versions.length > 0
      ? (versions.slice().reverse().find((v) => v.status !== 'SUPERSEDED') ?? versions[versions.length - 1])
      : null;

  return {
    quote,
    versions,
    activeVersion,
    isLoading,
    error,
    updateVersionStatus,
    updateVersionLabel,
    updateVersionCensus,
    updateVersionMapping,
    addRoundToVersion,
    addParameterOverride,
    addDocumentToVersion,
    updateVersionPremium,
    updateVersionPricingPath,
    updateVersionFields,
    updateQuoteStatus,
    supersedeSiblings,
    createNewVersion,
  };
}
