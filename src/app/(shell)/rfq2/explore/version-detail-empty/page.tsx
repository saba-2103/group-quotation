'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ChevronRight, Copy, Send, Lock, Plus, Pencil, Trash2,
  Check, AlertTriangle, ChevronDown, ChevronUp, Inbox, Layers, BarChart3,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { mockVersionEmpty } from '@/lib/mock/version-detail-empty-mock';

// ─── Empty placeholder ────────────────────────────────────────────────────────

function EmptyPlaceholder({ icon: Icon, message, action }: { icon: React.ElementType; message: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-center">
      <Icon className="size-8 text-muted-foreground/40 mb-2" />
      <p className="text-sm text-muted-foreground">{message}</p>
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ExploreVersionDetailEmptyPage() {
  const router = useRouter();
  const data = mockVersionEmpty;

  return (
    <div className="flex flex-col h-full overflow-hidden bg-[#F7F8FA]">
      {/* BAND 1 — Page Header */}
      <div className="shrink-0 sticky top-0 z-10 bg-white border-b border-border/40 px-5 py-3">
        <div className="flex items-center gap-2 text-sm">
          <button
            onClick={() => router.push('/rfq2/explore/quote-detail-empty')}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            {data.rfqId} / {data.dealName}
          </button>
          <ChevronRight className="size-3.5 text-muted-foreground" />
          <span className="font-medium text-foreground">V{data.versionNumber} — {data.label}</span>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 min-h-0 overflow-y-auto px-5 py-5">
        <div className="max-w-[1400px] mx-auto flex flex-col gap-4">

          {/* BAND 2 — Version Hero Bar */}
          <div className="w-full rounded-lg bg-[#EEF1F8] border border-[#D6DCE8] p-5">
            <div className="flex items-start justify-between">
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-3">
                  <h2 className="text-xl font-semibold text-[#1B2B5E]">V{data.versionNumber} — {data.label}</h2>
                  <Badge className="bg-gray-100 text-gray-600 border-gray-200 text-xs font-semibold">DRAFT</Badge>
                </div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span>Created {data.createdAt} by {data.createdBy.name} ({data.createdBy.role} {data.createdBy.level})</span>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-muted-foreground">Based on:</span>
                  <span className="text-xs text-muted-foreground italic">{data.basedOnLabel}</span>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-[10px] px-2 py-0.5 rounded bg-white/60 border border-[#D6DCE8] text-[#1B2B5E] font-medium">Single Plan</span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-white/60 border border-[#D6DCE8] text-[#1B2B5E] font-medium">SA: Flat</span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-white/60 border border-[#D6DCE8] text-[#1B2B5E] font-medium">Pricing: Manual</span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-white/60 border border-[#D6DCE8] text-[#1B2B5E] font-medium">Lives: Member Only</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" className="gap-1.5 text-xs h-8" disabled>
                  <Copy className="size-3.5" /> Duplicate Version
                </Button>
                <Button variant="outline" size="sm" className="gap-1.5 text-xs h-8" disabled>
                  <Send className="size-3.5" /> Dispatch
                </Button>
                <Button
                  size="sm"
                  className="gap-1.5 text-xs h-9 px-4 font-semibold bg-muted text-muted-foreground cursor-not-allowed"
                  disabled
                >
                  <Lock className="size-3.5" /> Freeze Version
                </Button>
              </div>
            </div>
          </div>

          {/* Summary stat strip */}
          <div className="grid grid-cols-4 gap-3">
            <StatTile label="Plans" value="0" />
            <StatTile label="Scenarios" value="0" />
            <StatTile label="Gross Premium" value="—" />
            <StatTile label="Net Premium" value="—" />
          </div>

          {/* BAND 3 — Main Content Grid */}
          <div className="grid grid-cols-12 gap-3">
            {/* Plans Panel */}
            <div className="col-span-5">
              <Card title="Plans (0)" action={<Button variant="outline" size="sm" className="gap-1 text-xs h-7"><Plus className="size-3" /> Add Plan</Button>}>
                <EmptyPlaceholder
                  icon={Layers}
                  message="Single Plan structure selected. Add your plan to define GTL benefits, sum assured (Flat), and cover terms."
                  action={<Button size="sm" className="text-xs h-7 gap-1"><Plus className="size-3" /> Add Plan</Button>}
                />
              </Card>
            </div>

            {/* Rate Card Panel */}
            <div className="col-span-4">
              <Card title="Commercial Rate Card" action={<Badge className="bg-gray-100 text-gray-600 border-gray-200 text-[10px]">Awaiting Pricing</Badge>}>
                <EmptyPlaceholder
                  icon={BarChart3}
                  message="Rate card will be available after actuary pricing is received. Add plans and dispatch to actuary first."
                />
              </Card>
            </div>

            {/* Scenarios Panel */}
            <div className="col-span-3">
              <Card title="Scenarios (0)" action={<Button variant="outline" size="sm" className="gap-1 text-xs h-7" disabled><Plus className="size-3" /> Add</Button>}>
                <EmptyPlaceholder
                  icon={Inbox}
                  message="Scenarios can be created after pricing is available."
                />
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Utility components ───────────────────────────────────────────────────────

function Card({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border/40 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.08)] p-4 h-full">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-semibold text-foreground">{title}</h4>
        {action}
      </div>
      {children}
    </div>
  );
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border/40 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.08)] px-4 py-3 flex flex-col items-center gap-0.5">
      <span className="text-[11px] text-muted-foreground">{label}</span>
      <span className={cn('text-base font-bold', value === '—' || value === '0' ? 'text-muted-foreground' : 'text-[#1B2B5E]')}>{value}</span>
    </div>
  );
}
