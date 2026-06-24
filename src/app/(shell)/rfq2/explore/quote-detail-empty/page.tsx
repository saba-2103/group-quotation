'use client';

import { useRouter } from 'next/navigation';
import {
  Download, Send, Plus, Lock, Circle, Check, Clock,
  Upload, Building2, Users, Inbox, FolderOpen,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { mockQuoteEmpty } from '@/lib/mock/quote-detail-empty-mock';

// ─── Empty state placeholder ──────────────────────────────────────────────────

function EmptyPlaceholder({ icon: Icon, message, action }: { icon: React.ElementType; message: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <Icon className="size-8 text-muted-foreground/40 mb-2" />
      <p className="text-sm text-muted-foreground">{message}</p>
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}

// ─── Components ───────────────────────────────────────────────────────────────

function DealProfileHero() {
  const d = mockQuoteEmpty.dealProfile;
  return (
    <div className="w-full rounded-lg bg-[#EEF1F8] border border-[#D6DCE8] p-5">
      <div className="grid grid-cols-12 gap-6">
        {/* Left block */}
        <div className="col-span-5 flex flex-col gap-2">
          <h2 className="text-xl font-semibold text-[#1B2B5E] leading-tight">{mockQuoteEmpty.dealName}</h2>
          <div className="flex flex-col gap-1.5 mt-1">
            <ProfileRow label="Policy Type" value={d.policyType} />
            <ProfileRow label="Inception Date" value={d.inceptionDate} />
            <ProfileRow label="Policy Period" value={d.period} />
            <ProfileRow label="Renewal Type" value={d.renewalType} />
          </div>
        </div>

        {/* Center block */}
        <div className="col-span-4 flex flex-col gap-1.5 pt-1">
          <ProfileRow label="Broker" value={d.broker} />
          <ProfileRow label="Broker Contact" value={d.brokerContact} />
          <ProfileRow label="Broker Code" value={d.brokerCode} />
          <ProfileRow label="Source" value={d.source} />
          <ProfileRow label="Sales Owner" value={d.salesOwner} />
        </div>

        {/* Right block — highlighted */}
        <div className="col-span-3 bg-white/80 rounded-lg border border-[#D6DCE8] p-4 flex flex-col gap-2">
          <div className="flex items-center gap-2 mb-1">
            <Badge className="bg-gray-100 text-gray-700 border-gray-200 text-xs font-semibold">{d.currentStage.replace(/_/g, ' ')}</Badge>
          </div>
          <HighlightRow label="Versions" value={d.versions} />
          <HighlightRow label="Headroom Available" value={d.headroom} />
          <HighlightRow label="Floor Rate" value={d.floorRate} />
          <HighlightRow label="Days in Stage" value={d.daysInStage === 0 ? 'Just created' : `${d.daysInStage} days`} />
        </div>
      </div>
    </div>
  );
}

function ProfileRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline gap-2">
      <span className="text-xs text-muted-foreground shrink-0 w-28">{label}</span>
      <span className={cn('text-sm font-medium', value === '—' ? 'text-muted-foreground' : 'text-foreground')}>{value}</span>
    </div>
  );
}

function DataRow({ label, value, placeholder }: { label: string; value: string; placeholder?: string }) {
  const isEmpty = !value || value === '—' || value === '0';
  return (
    <div className="flex items-baseline justify-between gap-2 py-1 border-b border-border/20 last:border-0">
      <span className="text-xs text-muted-foreground shrink-0">{label}</span>
      <span className={cn('text-xs font-medium text-right', isEmpty ? 'text-muted-foreground/60 italic' : 'text-foreground')}>
        {isEmpty ? (placeholder ?? '—') : value}
      </span>
    </div>
  );
}

function HighlightRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className={cn('text-sm font-semibold', value === '—' ? 'text-muted-foreground' : 'text-[#1B2B5E]')}>{value}</span>
    </div>
  );
}

function KeyDataPanel() {
  const kd = mockQuoteEmpty.keyData;
  return (
    <Card title="Key Data">
      <div className="flex flex-col gap-1.5">
        <DataRow label="Industry" value={kd.industry} />
        <DataRow label="Group Type" value={kd.groupType} />
        <DataRow label="CIN" value={kd.cin} placeholder="Not provided" />
        <DataRow label="PAN" value={kd.pan} placeholder="Not provided" />
        <DataRow label="Address" value={kd.address} placeholder="Not provided" />
      </div>
    </Card>
  );
}

function MphCategorizationCard() {
  const mph = mockQuoteEmpty.mphProfile;
  return (
    <Card title="MPH Categorization">
      <div className="flex flex-col gap-1.5">
        <DataRow label="Industry" value={mph.industry} />
        <DataRow label="Business type" value={mph.businessType.replace(/_/g, ' ')} />
        <DataRow label="Hazard class" value={mph.hazardClass} />
        <DataRow label="Segment band" value={mph.segmentBand} placeholder="Pending — enter lives" />
        <DataRow label="Governing envelope" value="" placeholder="Not stamped — save profile to generate" />
      </div>
    </Card>
  );
}

function SubsidiariesCard() {
  return (
    <Card title="Subsidiaries">
      <EmptyPlaceholder icon={Building2} message="No subsidiaries added" action={<Button variant="outline" size="sm" className="text-xs h-7 gap-1"><Plus className="size-3" /> Add Subsidiary</Button>} />
    </Card>
  );
}

function CensusHeadcountCard() {
  return (
    <Card title="Census / Headcount">
      <EmptyPlaceholder icon={Users} message="No census data uploaded yet" action={<Button variant="outline" size="sm" className="text-xs h-7 gap-1"><Upload className="size-3" /> Upload Census</Button>} />
    </Card>
  );
}

function ClaimsExperiencePanel() {
  return (
    <Card title="Claims Experience Files" action={<Button variant="outline" size="sm" className="gap-1.5 text-xs h-7"><Upload className="size-3" /> Upload File</Button>}>
      <EmptyPlaceholder icon={FolderOpen} message="No claims experience files uploaded" />
      <div className="mt-3 rounded-lg border-2 border-dashed border-border/50 p-4 text-center text-xs text-muted-foreground hover:border-border transition-colors">
        Drag and drop files here, or click Upload File
      </div>
    </Card>
  );
}

function DispatchPanel() {
  return (
    <Card title="Dispatch">
      <EmptyPlaceholder icon={Send} message="No dispatches yet — complete pricing first" />
    </Card>
  );
}

function NegotiationPanel() {
  return (
    <Card title="Negotiation">
      <EmptyPlaceholder icon={Inbox} message="Negotiation not started — quote must be shared first" />
    </Card>
  );
}

function QuoteVersionsSection() {
  const router = useRouter();
  const versions = mockQuoteEmpty.versions;
  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          <h3 className="text-base font-semibold text-foreground">Quote Versions ({versions.length})</h3>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="px-2 py-0.5 rounded bg-muted border border-border/40">Single Plan</span>
            <span className="px-2 py-0.5 rounded bg-muted border border-border/40">SA: Flat</span>
            <span className="px-2 py-0.5 rounded bg-muted border border-border/40">Pricing: Manual</span>
          </div>
        </div>
        <Button variant="outline" size="sm" className="gap-1.5 text-xs h-8" disabled>
          <Plus className="size-3.5" /> Create New Version
        </Button>
      </div>
      <div className="grid grid-cols-3 gap-3">
        {versions.map((v) => (
          <div
            key={v.id}
            className={cn(
              'rounded-lg border p-4 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.08)] flex flex-col gap-3',
              v.isActive ? 'border-blue-300 ring-1 ring-blue-100' : 'border-border/40',
            )}
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold">{v.label}</span>
              <Badge className="bg-gray-100 text-gray-600 border-gray-200 text-[10px] gap-1">
                <Circle className="size-2.5 fill-gray-400" /> DRAFT
              </Badge>
            </div>
            <div className="flex flex-col gap-1 text-xs text-muted-foreground">
              <span>Plans: {v.planCount}</span>
              <span>Gross Premium: <strong className="text-foreground">{v.grossPremium}</strong></span>
              <span>Created: {v.createdOn}</span>
            </div>
            <div className="flex items-center gap-2 mt-auto pt-2 border-t border-border/20">
              <Button
                variant="ghost"
                size="sm"
                className="text-xs h-7 px-2"
                onClick={() => router.push('/rfq2/explore/version-detail-empty')}
              >
                View Details
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Utility ──────────────────────────────────────────────────────────────────

function Card({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border/40 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.08)] p-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-semibold text-foreground">{title}</h4>
        {action}
      </div>
      {children}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ExploreQuoteDetailEmptyPage() {
  const data = mockQuoteEmpty;

  return (
    <div className="flex flex-col h-full overflow-hidden bg-[#F7F8FA]">
      {/* BAND 1 — Page Header */}
      <div className="shrink-0 sticky top-0 z-10 bg-white border-b border-border/40 px-5 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="font-mono text-xs">{data.rfqId}</Badge>
            <span className="text-base font-semibold text-foreground">{data.dealName}</span>
          </div>

          <div className="flex items-center gap-3">
            <Badge className="bg-gray-100 text-gray-700 border-gray-200 text-xs font-semibold">DATA PENDING</Badge>
            <div className="flex items-center gap-1">
              {data.milestones.map((m) => (
                <div
                  key={m.label}
                  className={cn(
                    'flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border',
                    m.status === 'done' && 'bg-green-50 text-green-700 border-green-200',
                    m.status === 'in_progress' && 'bg-amber-50 text-amber-700 border-amber-200',
                    m.status === 'pending' && 'bg-muted text-muted-foreground border-border/40',
                  )}
                >
                  {m.status === 'done' && <Check className="size-2.5" />}
                  {m.status === 'in_progress' && <Clock className="size-2.5" />}
                  {m.label}
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="gap-1.5 text-xs h-8" disabled>
              <Download className="size-3.5" /> Download Quote Pack
            </Button>
            <Button variant="outline" size="sm" className="gap-1.5 text-xs h-8" disabled>
              <Send className="size-3.5" /> Dispatch
            </Button>
            <Button size="sm" className="gap-1.5 text-xs h-8" disabled>
              <Plus className="size-3.5" /> New Version
            </Button>
          </div>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 min-h-0 overflow-y-auto px-5 py-5">
        <div className="max-w-[1400px] mx-auto flex flex-col gap-4">
          <DealProfileHero />

          <div className="grid grid-cols-12 gap-3">
            <div className="col-span-4"><KeyDataPanel /></div>
            <div className="col-span-4"><MphCategorizationCard /></div>
            <div className="col-span-4"><SubsidiariesCard /></div>
          </div>

          <div className="grid grid-cols-12 gap-3">
            <div className="col-span-5"><CensusHeadcountCard /></div>
            <div className="col-span-7"><ClaimsExperiencePanel /></div>
          </div>

          <div className="grid grid-cols-12 gap-3">
            <div className="col-span-6"><DispatchPanel /></div>
            <div className="col-span-6"><NegotiationPanel /></div>
          </div>

          <div className="pt-2">
            <QuoteVersionsSection />
          </div>
        </div>
      </div>
    </div>
  );
}
