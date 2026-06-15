'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { getRfqBundle } from '@/lib/api/quotation-client';
import type { RfqBundle } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { AlertCircle, RefreshCw, ArrowLeft } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface RfqBundleContextValue {
  bundle: RfqBundle | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
  /** Optimistic merge — caller has already persisted via API; this syncs context. */
  updateBundle: (patch: Partial<RfqBundle>) => void;
}

// ─── Context ──────────────────────────────────────────────────────────────────

export const RfqBundleContext = createContext<RfqBundleContextValue | undefined>(
  undefined
);

// ─── Loading skeleton ─────────────────────────────────────────────────────────

function BundleLoadingSkeleton() {
  return (
    <div className="flex flex-col gap-4 p-6 w-full">
      <Skeleton className="h-8 w-1/3" />
      <Skeleton className="h-4 w-2/3" />
      <div className="flex gap-3 mt-2">
        <Skeleton className="h-24 flex-1 rounded-lg" />
        <Skeleton className="h-24 flex-1 rounded-lg" />
        <Skeleton className="h-24 flex-1 rounded-lg" />
      </div>
      <Skeleton className="h-48 w-full rounded-lg" />
    </div>
  );
}

// ─── Error state ──────────────────────────────────────────────────────────────

function BundleErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  const isNotFound = message.toLowerCase().includes('404') || message.toLowerCase().includes('not found');
  return (
    <div className="flex flex-col items-center justify-center gap-4 h-64 text-muted-foreground">
      <AlertCircle className="size-8 text-destructive" />
      <p className="text-sm font-medium text-foreground">
        {isNotFound ? 'RFQ not found.' : message}
      </p>
      <div className="flex gap-3">
        {!isNotFound && (
          <Button variant="outline" size="sm" onClick={onRetry} className="gap-2">
            <RefreshCw className="size-4" />
            Retry
          </Button>
        )}
        <Button variant="outline" size="sm" asChild>
          <a href="/rfqs" className="gap-2 flex items-center">
            <ArrowLeft className="size-4" />
            Back to RFQs
          </a>
        </Button>
      </div>
    </div>
  );
}

// ─── Provider ─────────────────────────────────────────────────────────────────

interface RfqBundleProviderProps {
  rfqId: string;
  children: ReactNode;
}

export function RfqBundleProvider({ rfqId, children }: RfqBundleProviderProps) {
  const [bundle, setBundle] = useState<RfqBundle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getRfqBundle(rfqId);
      setBundle(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load RFQ.');
    } finally {
      setLoading(false);
    }
  }, [rfqId]);

  useEffect(() => {
    void fetch();
  }, [fetch]);

  const updateBundle = useCallback((patch: Partial<RfqBundle>) => {
    setBundle((prev) => (prev ? { ...prev, ...patch } : prev));
  }, []);

  if (loading) return <BundleLoadingSkeleton />;
  if (error) return <BundleErrorState message={error} onRetry={fetch} />;

  return (
    <RfqBundleContext.Provider
      value={{ bundle, loading, error, refetch: fetch, updateBundle }}
    >
      {children}
    </RfqBundleContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useRfqBundle(): RfqBundleContextValue {
  const ctx = useContext(RfqBundleContext);
  if (!ctx) {
    throw new Error('useRfqBundle must be used within RfqBundleProvider');
  }
  return ctx;
}
