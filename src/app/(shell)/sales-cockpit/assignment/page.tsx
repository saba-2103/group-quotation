'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Loader2, RefreshCw, AlertTriangle } from 'lucide-react';
import { useRole } from '@/hooks/useRole';
import { canViewSalesCockpit } from '@/lib/permissions';
import { getRfqs, updateRfq } from '@/lib/api/quotation-client';
import { TEAM_MEMBERS } from '@/lib/constants';
import { type RfqBase } from '@/lib/types';
import { Button } from '@/components/ui/button';

export default function AssignmentPage() {
  const router = useRouter();
  const { role, salesLevel } = useRole();
  const [rfqs, setRfqs] = useState<RfqBase[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [saveErrors, setSaveErrors] = useState<Record<string, string>>({});

  function load() {
    setLoading(true);
    setFetchError(null);
    getRfqs()
      .then(setRfqs)
      .catch((e: unknown) => setFetchError(e instanceof Error ? e.message : 'Failed to load'))
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  if (!canViewSalesCockpit(role, salesLevel)) {
    return (
      <div className="p-12 text-center">
        <p className="text-sm text-muted-foreground">Access restricted.</p>
        <Button variant="outline" className="mt-4" onClick={() => router.push('/rfqs')}>Back</Button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48 gap-2 text-muted-foreground">
        <Loader2 className="size-5 animate-spin" /> Loading…
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="flex flex-col items-center justify-center h-48 gap-3">
        <AlertTriangle className="size-5 text-destructive" />
        <p className="text-sm text-muted-foreground">{fetchError}</p>
        <Button variant="outline" size="sm" onClick={load}>
          <RefreshCw className="size-3.5 mr-1.5" /> Retry
        </Button>
      </div>
    );
  }

  async function handleReassign(rfqId: string, memberId: string) {
    const member = TEAM_MEMBERS.find((m) => m.userId === memberId);
    if (!member) return;
    setSaving((s) => ({ ...s, [rfqId]: true }));
    setSaveErrors((e) => ({ ...e, [rfqId]: '' }));
    try {
      const updated = await updateRfq(rfqId, {
        salesOwner: { userId: member.userId, name: member.name },
      });
      setRfqs((prev) => prev.map((r) => r.rfqId === rfqId ? { ...r, ...updated } : r));
    } catch (e: unknown) {
      setSaveErrors((err) => ({
        ...err,
        [rfqId]: e instanceof Error ? e.message : 'Save failed',
      }));
    } finally {
      setSaving((s) => ({ ...s, [rfqId]: false }));
    }
  }

  return (
    <div className="flex flex-col gap-5 p-6 max-w-[860px] mx-auto">
      <div className="flex items-center gap-3">
        <button
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
          onClick={() => router.push('/sales-cockpit')}
        >
          <ChevronLeft className="size-3.5" /> Back to Cockpit
        </button>
      </div>
      <h1 className="text-xl font-bold tracking-tight">Assignment</h1>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border/40">
              {['Client', 'Stage', 'Current Owner', 'Reassign to'].map((h) => (
                <th key={h} className="text-left px-4 py-2.5 font-medium text-muted-foreground">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rfqs.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">No RFQs found.</td>
              </tr>
            ) : rfqs.map((rfq) => (
              <tr key={rfq.rfqId} className="border-b border-border/20 last:border-0 hover:bg-muted/20">
                <td className="px-4 py-3 font-medium">{rfq.employerName}</td>
                <td className="px-4 py-3 text-muted-foreground">{rfq.statusStage.replace(/_/g, ' ')}</td>
                <td className="px-4 py-3 text-muted-foreground">{rfq.salesOwner?.name ?? '—'}</td>
                <td className="px-4 py-3">
                  <select
                    className="text-xs border border-border rounded px-2 py-1.5 bg-background focus:outline-none w-full max-w-[180px]"
                    value={rfq.salesOwner?.userId ?? ''}
                    disabled={saving[rfq.rfqId]}
                    onChange={(e) => handleReassign(rfq.rfqId, e.target.value)}
                  >
                    <option value="" disabled>— select —</option>
                    {TEAM_MEMBERS.map((m) => (
                      <option key={m.userId} value={m.userId}>{m.name} (L{m.salesLevel})</option>
                    ))}
                  </select>
                  {saving[rfq.rfqId] && (
                    <span className="text-[10px] text-muted-foreground ml-2">Saving…</span>
                  )}
                  {saveErrors[rfq.rfqId] && (
                    <span className="text-[10px] text-destructive block mt-1">{saveErrors[rfq.rfqId]}</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
