'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { useRfqBundle } from '@/context/RfqBundleContext';
import { useScenarioStore } from '@/stores/scenarioStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

export default function NewScenarioPage() {
  const router = useRouter();
  const { bundle } = useRfqBundle();
  const { add } = useScenarioStore();

  const [name, setName] = useState('');
  const [note, setNote] = useState('');

  if (!bundle) return null;
  const rfqId = bundle.rfqId;

  function handleSave() {
    if (!name.trim()) return;
    add({
      name: name.trim(),
      note: note.trim(),
      rfqId,
      capturedAt: new Date().toISOString(),
    });
    router.push(`/rfqs/${rfqId}/scenarios`);
  }

  return (
    <div className="min-h-screen bg-background flex items-start justify-center pt-16 px-4">
      <div className="w-full max-w-lg">
        <button
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-6"
          onClick={() => router.push(`/rfqs/${rfqId}/scenarios`)}
        >
          <ChevronLeft className="size-3.5" /> Back to scenarios
        </button>
        <div className="rounded-2xl border border-border bg-card shadow-sm p-6 space-y-5">
          <div>
            <h1 className="text-base font-bold">New Scenario Annotation</h1>
            <p className="text-xs text-muted-foreground mt-1">
              Save a named snapshot annotation of the current version comparison.
              Stored in session only — not persisted to backend.
            </p>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Scenario Name *</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Base case — broker aligned"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Notes / Annotation</label>
            <Textarea
              rows={4}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="What is notable about this comparison? What was discussed with the broker?"
            />
          </div>
          <div className="flex gap-3 pt-1">
            <Button
              variant="outline" className="flex-1"
              onClick={() => router.push(`/rfqs/${rfqId}/scenarios`)}
            >
              Cancel
            </Button>
            <Button className="flex-1" disabled={!name.trim()} onClick={handleSave}>
              Save Scenario
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
