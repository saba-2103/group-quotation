'use client';

import { useParams, useRouter } from 'next/navigation';
import {
  Download, Send, Plus, Lock, Circle, Check, Clock,
  FileText, Eye, Replace, Trash2, Upload, Building2, Users,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { mockQuoteDetail } from '@/lib/mock/quote-detail-mock';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatSize(kb: number) {
  if (kb >= 1000) return `${(kb / 1000).toFixed(1)} MB`;
  return `${kb} KB`;
}

// ─── Components ───────────────────────────────────────────────────────────────

function DealProfileHero() {
  const d = mockQuoteDetail.dealProfile;
  return (
    <div className="w-full rounded-lg bg-[#EEF1F8] border border-[#D6DCE8] p-5">
      <div className="grid grid-cols-12 gap-6">
        {/* Left block */}
        <div className="col-span-5 flex flex-col gap-2">
          <h2 className="text-xl font-semibold text-[#1B2B5E] leading-tight">{mockQuoteDetail.dealName}</h2>
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
          <ProfileRow label="Broker Contact" value={`${d.brokerContact} | ${d.brokerEmail}`} />
          <ProfileRow label="Broker Code" value={d.brokerCode} />
          <ProfileRow label="Source" value={d.source} />
          <ProfileRow label="Sales Owner" value={d.salesOwner} />
        </div>

        {/* Right block — highlighted */}
        <div className="col-span-3 bg-white/80 rounded-lg border border-[#D6DCE8] p-4 flex flex-col gap-2">
          <div className="flex items-center gap-2 mb-1">
            <Badge className="bg-amber-100 text-amber-800 border-amber-200 text-xs font-semibold">{d.currentStage}</Badge>
          </div>
          <HighlightRow label="Versions" value={d.versions} />
          <HighlightRow label="Headroom Available" value={d.headroom} />
          <HighlightRow label="Floor Rate" value={d.floorRate} />
          <HighlightRow label="Days in Stage" value={`${d.daysInStage} days`} />
        </div>
      </div>
    </div>
  );
}

function ProfileRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline gap-2">
      <span className="text-xs text-muted-foreground shrink-0 w-28">{label}</span>
      <span className="text-sm font-medium text-foreground">{value}</span>
    </div>
  );
}

function HighlightRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm font-semibold text-[#1B2B5E]">{value}</span>
    </div>
  );
}

function KeyDataPanel() {
  const k = mockQuoteDetail.keyData;
  return (
    <Card title="Key Data">
      <div className="grid grid-cols-2 gap-x-4 gap-y-2.5">
        <KV label="CIN" value={k.cin} mono />
        <KV label="Industry" value={`${k.industry} | NAICS: ${k.naics}`} />
        <KV label="Registered Address" value={k.address} />
        <KV label="Incorporation Year" value={String(k.incorporationYear)} />
        <KV label="Group Type" value={k.groupType} />
        <KV label="PAN" value={k.pan} mono />
      </div>
    </Card>
  );
}

function MphCategorizationCard() {
  const m = mockQuoteDetail.mphCategorization;
  return (
    <Card title="MPH Categorization">
      <div className="grid grid-cols-2 gap-x-4 gap-y-2.5">
        <KV label="Tier" value={m.tier} />
        <KV label="Segment" value={m.segment} />
        <KV label="Risk Category" value={m.riskCategory} />
        <KV label="MPH Rating" value={m.mphRating} />
        <KV label="UW Track" value={m.uwTrack} />
        <KV label="Account Manager" value={m.accountManager} />
      </div>
    </Card>
  );
}

function SubsidiariesCard() {
  const subs = mockQuoteDetail.subsidiaries;
  return (
    <Card title="Subsidiaries">
      <div className="flex items-center gap-2 mb-3">
        <Badge variant="secondary" className="text-xs">{subs.length} subsidiaries</Badge>
      </div>
      <div className="flex flex-col gap-2">
        {subs.map((s) => (
          <div key={s.name} className="flex items-center justify-between py-1.5 border-b border-border/30 last:border-0">
            <div className="flex items-center gap-2">
              <Building2 className="size-3.5 text-muted-foreground" />
              <span className="text-sm font-medium">{s.name}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground">{s.lives.toLocaleString()} lives</span>
              <Badge variant={s.status === 'Active' ? 'success' : 'warning'} className="text-[10px]">{s.status}</Badge>
            </div>
          </div>
        ))}
      </div>
      <p className="text-[11px] text-muted-foreground mt-3">Subsidiary lives are included in total headcount</p>
    </Card>
  );
}

function CensusHeadcountCard() {
  const c = mockQuoteDetail.census;
  return (
    <Card title="Census / Headcount">
      <div className="flex items-center gap-3 mb-3">
        <div className="flex items-center gap-1.5">
          <Users className="size-4 text-muted-foreground" />
          <span className="text-lg font-bold text-[#1B2B5E]">{c.totalLives.toLocaleString()}</span>
          <span className="text-xs text-muted-foreground">Total Lives</span>
        </div>
      </div>
      <div className="flex flex-col gap-1.5 mb-3">
        {c.grades.map((g) => (
          <div key={g.name} className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">{g.name}</span>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">{g.count.toLocaleString()}</span>
              <span className="text-xs text-muted-foreground w-8 text-right">{g.pct}%</span>
            </div>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 pt-2 border-t border-border/30">
        <KV label="Avg Age" value={`${c.avgAge} yrs`} />
        <KV label="Gender" value={c.genderRatio} />
        <KV label="Dependants" value={c.dependants.toLocaleString()} />
        <KV label="Data Status" value={`✓ ${c.censusVersion} uploaded (${c.uploadedOn})`} />
      </div>
    </Card>
  );
}

function ClaimsExperiencePanel() {
  const files = mockQuoteDetail.claimsFiles;
  return (
    <Card title="Claims Experience Files" action={<Button variant="outline" size="sm" className="gap-1.5 text-xs h-7"><Upload className="size-3" /> Upload File</Button>}>
      <div className="flex flex-col gap-2">
        {files.map((f) => (
          <div key={f.id} className="rounded-lg border border-border/40 p-3 hover:border-border/80 transition-colors">
            <div className="flex items-center gap-2">
              <FileText className="size-4 text-muted-foreground shrink-0" />
              <span className="text-sm font-medium flex-1 truncate">{f.name}</span>
              <span className="text-xs text-muted-foreground shrink-0">{formatSize(f.sizeKb)}</span>
            </div>
            <div className="flex items-center justify-between mt-2">
              <span className="text-[11px] text-muted-foreground">Uploaded {f.uploadedOn} by {f.uploadedBy}</span>
              <div className="flex items-center gap-1">
                <ActionBtn icon={Eye} label="Preview" />
                <ActionBtn icon={Download} label="Download" />
                <ActionBtn icon={Replace} label="Replace" />
                <ActionBtn icon={Trash2} label="Delete" />
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-3 rounded-lg border-2 border-dashed border-border/50 p-4 text-center text-xs text-muted-foreground hover:border-border transition-colors">
        Drag and drop files here, or click Upload File
      </div>
    </Card>
  );
}

function DispatchPanel() {
  const dispatches = mockQuoteDetail.dispatch;
  return (
    <Card title="Dispatch">
      <div className="flex flex-col gap-0 mb-3">
        <div className="grid grid-cols-4 gap-2 text-[11px] text-muted-foreground font-medium uppercase tracking-wider pb-1.5 border-b border-border/30">
          <span>Version</span>
          <span>Dispatched To</span>
          <span>Date</span>
          <span>Status</span>
        </div>
        {dispatches.map((d) => (
          <div key={d.version} className="grid grid-cols-4 gap-2 py-2 border-b border-border/20 last:border-0">
            <span className="text-sm font-medium">{d.version}</span>
            <span className="text-sm text-muted-foreground">{d.dispatchedTo}</span>
            <span className="text-sm text-muted-foreground">{d.date}</span>
            <div className="flex items-center gap-1">
              <Check className="size-3.5 text-green-600" />
              <span className="text-sm text-green-700">{d.status}</span>
            </div>
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between pt-2 border-t border-border/30">
        <span className="text-xs text-muted-foreground">No pending dispatches</span>
        <Button variant="outline" size="sm" disabled className="text-xs h-7">Dispatch V3 to UW</Button>
      </div>
    </Card>
  );
}

function NegotiationPanel() {
  const neg = mockQuoteDetail.negotiation;
  return (
    <Card title="Negotiation" action={<Badge className="bg-blue-100 text-blue-800 border-blue-200 text-[10px]">Round 2 Complete</Badge>}>
      <div className="flex flex-col gap-3 mb-3">
        {neg.rounds.map((r) => (
          <div key={r.number} className="relative pl-5 pb-3 border-l-2 border-border/40 last:border-0">
            <div className="absolute left-[-5px] top-0.5 size-2 rounded-full bg-[#1B2B5E]" />
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-semibold text-foreground">Round {r.number}</span>
              <span className="text-[11px] text-muted-foreground">{r.date}</span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div><span className="text-muted-foreground">Broker ask:</span> <span className="font-medium">{r.brokerAsk}</span></div>
              <div><span className="text-muted-foreground">Our offer:</span> <span className="font-medium">{r.ourOffer}</span></div>
              <div><span className="text-muted-foreground">Gap:</span> <span className="font-medium">{r.gap}</span></div>
            </div>
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between pt-2 border-t border-border/30">
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span>Floor <strong className="text-foreground">{neg.floor}</strong></span>
          <span>Headroom <strong className="text-foreground">{neg.headroom}</strong></span>
        </div>
        <Button size="sm" className="text-xs h-7">Record Next Round</Button>
      </div>
    </Card>
  );
}

function QuoteVersionsSection() {
  const router = useRouter();
  const versions = mockQuoteDetail.versions;
  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold text-foreground">Quote Versions ({versions.length})</h3>
        <Button variant="outline" size="sm" className="gap-1.5 text-xs h-8">
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
              {v.isFrozen && (
                <Badge className="bg-green-100 text-green-800 border-green-200 text-[10px] gap-1">
                  <Lock className="size-2.5" /> FROZEN
                </Badge>
              )}
              {v.isActive && (
                <div className="flex items-center gap-1.5">
                  <Badge className="bg-blue-100 text-blue-800 border-blue-200 text-[10px] gap-1">
                    <Circle className="size-2.5 fill-blue-600" /> PRICED
                  </Badge>
                  <Badge variant="outline" className="text-[10px]">ACTIVE</Badge>
                </div>
              )}
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
                onClick={() => router.push('/rfq2/explore/version-detail')}
              >
                View Details
              </Button>
              {v.isActive && !v.isFrozen && (
                <Button variant="outline" size="sm" className="text-xs h-7 px-2 gap-1">
                  <Lock className="size-3" /> Freeze
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Utility components ───────────────────────────────────────────────────────

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

function KV({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[11px] text-muted-foreground">{label}</span>
      <span className={cn('text-sm font-medium text-foreground', mono && 'font-mono text-xs')}>{value}</span>
    </div>
  );
}

function ActionBtn({ icon: Icon, label }: { icon: React.ElementType; label: string }) {
  return (
    <button
      title={label}
      className="flex items-center justify-center size-6 rounded hover:bg-muted transition-colors"
    >
      <Icon className="size-3.5 text-muted-foreground" />
    </button>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ExploreQuoteDetailPage() {
  const params = useParams();
  const data = mockQuoteDetail;

  return (
    <div className="flex flex-col h-full overflow-hidden bg-[#F7F8FA]">
      {/* BAND 1 — Page Header */}
      <div className="shrink-0 sticky top-0 z-10 bg-white border-b border-border/40 px-5 py-3">
        <div className="flex items-center justify-between">
          {/* Left: ID + deal name */}
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="font-mono text-xs">{data.rfqId}</Badge>
            <span className="text-base font-semibold text-foreground">{data.dealName}</span>
          </div>

          {/* Center: Stage + milestones */}
          <div className="flex items-center gap-3">
            <Badge className="bg-amber-100 text-amber-800 border-amber-200 text-xs font-semibold">{data.stage}</Badge>
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

          {/* Right: Actions */}
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="gap-1.5 text-xs h-8">
              <Download className="size-3.5" /> Download Quote Pack
            </Button>
            <Button variant="outline" size="sm" className="gap-1.5 text-xs h-8">
              <Send className="size-3.5" /> Dispatch
            </Button>
            <Button size="sm" className="gap-1.5 text-xs h-8">
              <Plus className="size-3.5" /> New Version
            </Button>
          </div>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 min-h-0 overflow-y-auto px-5 py-5">
        <div className="max-w-[1400px] mx-auto flex flex-col gap-4">

          {/* BAND 2 — Deal Profile Hero */}
          <DealProfileHero />

          {/* BAND 3 — Content Grid */}
          {/* Row 3A: 3 cards side by side */}
          <div className="grid grid-cols-12 gap-3">
            <div className="col-span-4"><KeyDataPanel /></div>
            <div className="col-span-4"><MphCategorizationCard /></div>
            <div className="col-span-4"><SubsidiariesCard /></div>
          </div>

          {/* Row 3B: Census + Claims */}
          <div className="grid grid-cols-12 gap-3">
            <div className="col-span-5"><CensusHeadcountCard /></div>
            <div className="col-span-7"><ClaimsExperiencePanel /></div>
          </div>

          {/* Row 3C: Dispatch + Negotiation */}
          <div className="grid grid-cols-12 gap-3">
            <div className="col-span-6"><DispatchPanel /></div>
            <div className="col-span-6"><NegotiationPanel /></div>
          </div>

          {/* BAND 4 — Quote Versions */}
          <div className="pt-2">
            <QuoteVersionsSection />
          </div>
        </div>
      </div>
    </div>
  );
}
