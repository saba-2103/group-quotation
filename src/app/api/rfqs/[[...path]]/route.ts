import { NextResponse, type NextRequest } from 'next/server';

import type {
  CensusSummary,
  ClaimsExperience,
  Document,
  Member,
  MphAppetite,
  MphProfile,
  Plan,
  RfqBase,
  RfqStatus,
  Subsidiary,
} from '@/lib/types';
import {
  CensusQuality,
  CoverPattern,
  FclPattern,
  LivesCovered,
  PlanHandoffStatus,
  PlanStructure,
  PricingBasis,
  RfqStatus as RfqStatusEnum,
  SchemeType,
  SchemeUsage,
  SumAssuredBasis,
  TermBasis,
  VersionStatus,
  type HandoffTask,
} from '@/lib/types';
import {
  buildRfqBundle,
  docsForRfq,
  membersForRfq,
  now,
  plansForRfq,
  resetRfqMockStore,
  rfqMockStore,
  subsForRfq,
  uid,
  updateHeadcountData,
} from '@/lib/api-mock/rfq/store';

type RouteContext = { params: Promise<{ path?: string[] }> };

function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status });
}

function noContent() {
  return new NextResponse(null, { status: 204 });
}

function notFound(message = 'Not found') {
  return json({ error: message }, 404);
}

async function readJson<T>(req: NextRequest): Promise<T> {
  return req.json() as Promise<T>;
}

async function handleGet(_req: NextRequest, path: string[]) {
  if (path.length === 0) return json(Object.values(rfqMockStore.rfqs));

  if (path.length === 1 && path[0] === '_reset') {
    resetRfqMockStore();
    return json({ reset: true });
  }

  if (path.length === 2 && path[1] === 'bundle') {
    const bundle = buildRfqBundle(path[0]);
    return bundle ? json(bundle) : notFound();
  }

  return notFound();
}

async function handlePost(req: NextRequest, path: string[]) {
  if (path.length === 0) {
    const payload = (await readJson<Partial<RfqBase>>(req)) ?? {};
    const rfqId = `rfq-${uid()}`;
    const timestamp = now();
    const newRfq: RfqBase = {
      rfqId,
      employerName: payload.employerName ?? 'New RFQ',
      statusStage: RfqStatusEnum.DATA_PENDING,
      businessType: payload.businessType ?? payload.businessType,
      schemeType: payload.schemeType ?? SchemeType.EMPLOYER_OBLIGATORY,
      lob: payload.lob ?? 'GTL',
      participationType: payload.participationType,
      schemeUsage: payload.schemeUsage ?? SchemeUsage.EMPLOYER_EMPLOYEE,
      policyConfig: payload.policyConfig ?? {
        gracePeriodDays: 30,
        billingFrequency: 'ANNUAL',
        collectionMethod: 'NEFT',
        subsidiariesEnabled: false,
      },
      defaultPlanStructure: payload.defaultPlanStructure ?? {
        planStructure: PlanStructure.SINGLE_PLAN,
        sumAssuredBasis: SumAssuredBasis.FLAT,
        gradeMapping: false,
        pricingBasis: PricingBasis.MANUAL,
      },
      sumAssuredBasis: payload.sumAssuredBasis ?? SumAssuredBasis.FLAT,
      coverPattern: payload.coverPattern ?? CoverPattern.LEVEL,
      termBasis: payload.termBasis ?? TermBasis.POLICY_YEAR,
      livesCovered: payload.livesCovered ?? LivesCovered.MEMBER_ONLY,
      activeVersionId: `v1-${rfqId}`,
      quoteVersions: [
        {
          id: `v1-${rfqId}`,
          versionNo: 1,
          name: 'Version 1',
          status: VersionStatus.DRAFT,
          createdAt: timestamp,
        },
      ],
      negotiationLog: [],
      gradeAllocations: {},
      actuaryPricing: { byVersion: {} },
      fclPolicy: { quoteDefault: FclPattern.NONE, byVersion: {} },
      ...payload,
      createdAt: timestamp,
      updatedAt: timestamp,
    } as RfqBase;
    rfqMockStore.rfqs[rfqId] = newRfq;
    rfqMockStore.documents[rfqId] = [];
    return json({ rfqId }, 201);
  }

  if (path.length === 1 && path[0] === '_reset') {
    resetRfqMockStore();
    return json({ reset: true });
  }

  const [rfqId, resource, resourceId] = path;
  const rfq = rfqMockStore.rfqs[rfqId];
  if (!rfq) return notFound();

  if (resource === 'issue') {
    const payload = await readJson<{ masterPolicyNumber: string; issuedAt: string }>(req);
    rfqMockStore.rfqs[rfqId] = {
      ...rfq,
      statusStage: RfqStatusEnum.ISSUED,
      masterPolicyNumber: payload.masterPolicyNumber,
      issuedAt: payload.issuedAt,
      updatedAt: now(),
    };
    return json(rfqMockStore.rfqs[rfqId]);
  }

  if (resource === 'advance') {
    const payload = await readJson<{ stage: RfqStatus }>(req);
    rfqMockStore.rfqs[rfqId] = { ...rfq, statusStage: payload.stage, updatedAt: now() };
    return json(rfqMockStore.rfqs[rfqId]);
  }

  if (resource === 'dispatch') return json({ success: true });

  if (resource === 'documents') {
    const payload = await readJson<Omit<Document, 'documentId' | 'rfqId' | 'uploadedAt'>>(req);
    const document: Document = {
      ...payload,
      documentId: `doc-${uid()}`,
      rfqId,
      uploadedAt: now(),
    };
    if (!rfqMockStore.documents[rfqId]) rfqMockStore.documents[rfqId] = [];
    rfqMockStore.documents[rfqId].push(document);
    return json(document, 201);
  }

  if (resource === 'plans') {
    const payload = await readJson<Partial<Plan>>(req);
    const planId = `plan-${uid()}`;
    const plan: Plan = {
      planId,
      rfqId,
      quoteVersionId: payload.quoteVersionId ?? rfq.activeVersionId,
      name: payload.name ?? 'New Plan',
      sumAssuredBasis: payload.sumAssuredBasis ?? rfq.sumAssuredBasis,
      coverPattern: payload.coverPattern ?? rfq.coverPattern,
      benefits: payload.benefits ?? [],
      excludedClauses: payload.excludedClauses ?? [],
      handoffStatus: PlanHandoffStatus.DRAFT,
      completeness: 0,
      ...payload,
    } as Plan;
    rfqMockStore.plans[planId] = plan;
    return json(plan, 201);
  }

  if (resource === 'members' && resourceId === 'bulk') {
    const body = await readJson<{ members: Partial<Member>[] }>(req);
    const imported: Member[] = (body.members ?? []).map((member) => ({
      memberNumber: `MBR-${uid()}`,
      rfqId,
      name: member.name ?? 'Unknown',
      dateOfBirth: member.dateOfBirth ?? '',
      gender: member.gender ?? 'M',
      grade: member.grade ?? '',
      salary: member.salary ?? 0,
      sumAssured: member.sumAssured ?? 0,
      coverages: [],
    }));
    if (!rfqMockStore.members[rfqId]) rfqMockStore.members[rfqId] = [];
    rfqMockStore.members[rfqId].push(...imported);
    rfqMockStore.rfqs[rfqId].updatedAt = now();
    rfqMockStore.rfqs[rfqId].censusSummary = {
      totalLives: rfqMockStore.members[rfqId].length,
      quality: { trafficLight: CensusQuality.A },
    };
    return json({ imported: imported.length }, 201);
  }

  if (resource === 'members') {
    const body = await readJson<Partial<Member>>(req);
    const member: Member = {
      memberNumber: `MBR-${uid()}`,
      rfqId,
      name: body.name ?? 'Unknown',
      dateOfBirth: body.dateOfBirth ?? '',
      gender: body.gender ?? 'M',
      grade: body.grade ?? '',
      salary: body.salary ?? 0,
      sumAssured: body.sumAssured ?? 0,
      coverages: [],
    };
    if (!rfqMockStore.members[rfqId]) rfqMockStore.members[rfqId] = [];
    rfqMockStore.members[rfqId].push(member);
    rfqMockStore.rfqs[rfqId].updatedAt = now();
    rfqMockStore.rfqs[rfqId].censusSummary = {
      ...(rfqMockStore.rfqs[rfqId].censusSummary ?? { quality: { trafficLight: CensusQuality.A } }),
      totalLives: rfqMockStore.members[rfqId].length,
    } as CensusSummary;
    return json(member, 201);
  }

  if (resource === 'pricing-macro') {
    const csv = `rfqId,version,premium\n${rfqId},v1,0\n`;
    return new NextResponse(csv, {
      status: 200,
      headers: { 'Content-Type': 'text/csv' },
    });
  }

  if (resource === 'subsidiaries') {
    const body = await readJson<Partial<Subsidiary>>(req);
    const subsidiary: Subsidiary = {
      subsidiaryId: `sub-${uid()}`,
      rfqId,
      code: (body.code ?? 'NEW').toUpperCase(),
      name: body.name ?? 'Unnamed',
      locationMapping: body.locationMapping,
      billingSplitRule: body.billingSplitRule ?? 'HEADCOUNT',
      startDate: body.startDate ?? new Date().toISOString().split('T')[0],
      endDate: body.endDate ?? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      status: body.status ?? 'ACTIVE',
    };
    if (!rfqMockStore.subsidiaries[rfqId]) rfqMockStore.subsidiaries[rfqId] = [];
    rfqMockStore.subsidiaries[rfqId].push(subsidiary);
    rfqMockStore.rfqs[rfqId].updatedAt = now();
    return json(subsidiary, 201);
  }

  return notFound();
}

async function handlePut(req: NextRequest, path: string[]) {
  const [rfqId, resource, resourceId] = path;
  const rfq = rfqMockStore.rfqs[rfqId];
  if (!rfq) return notFound();

  if (path.length === 1) {
    const patch = await readJson<Partial<RfqBase> & { mphProfile?: MphProfile }>(req);
    // If mphProfile is provided, derive and stamp mphAppetite server-side
    if (patch.mphProfile) {
      const p = patch.mphProfile;
      const wc = p.whiteCollarPct ?? 100;
      const lives = p.lives ?? 0;
      const zones = p.zones ?? 1;
      const hc = p.hazardClass ?? 'LOW';
      const hr = p.hazardousRoles ?? false;
      const bt = p.businessType ?? '';
      const reasons: string[] = [];
      if (hc === 'HIGH' || hc === 'SPECIAL') reasons.push('High or special hazard class');
      if (hr) reasons.push('Hazardous roles present');
      if (lives > 500) reasons.push('Lives exceed 500');
      if (zones > 5) reasons.push('More than 5 zones');
      if (bt === 'TAKEOVER') reasons.push('Takeover review required');
      if (wc < 50) reasons.push('Blue-collar majority');
      const band = lives < 100 ? 'SME' : lives <= 500 ? 'MID_CORPORATE' : 'CORPORATE';
      const cat = reasons.length > 0 ? 'Special \u2014 refer' : band === 'SME' ? 'SME \u00b7 straight-through' : band === 'MID_CORPORATE' ? 'Mid-market' : 'Large group';
      const disc = reasons.length > 0 ? 0 : band === 'SME' ? 8 : band === 'MID_CORPORATE' ? 10 : 12;
      let uwBand = 'Underwriting L1';
      if (hc === 'HIGH' || hc === 'SPECIAL') uwBand = 'Underwriting L2 (senior)';
      else if (hr) uwBand = 'Actuary referral';
      else if (reasons.length === 0 && band === 'SME') uwBand = 'Sales (straight-through)';
      patch.mphAppetite = {
        category: cat,
        maxDiscountPct: disc,
        uwAuthorityBand: uwBand,
        preapprovedCardRef: rfq.mphAppetite?.preapprovedCardRef,
        source: 'engine-server',
        evaluatedAt: now(),
      } as MphAppetite;
    }
    const merged = { ...rfq, ...patch, rfqId, updatedAt: now() };
    rfqMockStore.rfqs[rfqId] = merged;
    if (patch.headcountData) {
      updateHeadcountData(rfqId, patch.headcountData);
    }
    return json(rfqMockStore.rfqs[rfqId]);
  }

  if (resource === 'plans' && resourceId) {
    const plan = rfqMockStore.plans[resourceId];
    if (!plan) return notFound('Plan not found');
    const patch = await readJson<Partial<Plan>>(req);
    rfqMockStore.plans[resourceId] = { ...plan, ...patch, planId: resourceId, rfqId };
    return json(rfqMockStore.plans[resourceId]);
  }

  if (resource === 'members' && resourceId) {
    const arr = rfqMockStore.members[rfqId] ?? [];
    const idx = arr.findIndex((member) => member.memberNumber === resourceId);
    if (idx === -1) return notFound('Member not found');
    const patch = await readJson<Partial<Member>>(req);
    arr[idx] = { ...arr[idx], ...patch, memberNumber: resourceId, rfqId };
    rfqMockStore.rfqs[rfqId].updatedAt = now();
    return json(arr[idx]);
  }

  if (resource === 'census-summary') {
    const patch = await readJson<Partial<CensusSummary>>(req);
    rfqMockStore.rfqs[rfqId].censusSummary = {
      ...rfqMockStore.rfqs[rfqId].censusSummary,
      ...patch,
    } as CensusSummary;
    rfqMockStore.rfqs[rfqId].updatedAt = now();
    return json(rfqMockStore.rfqs[rfqId].censusSummary);
  }

  if (resource === 'claims-experience') {
    const patch = await readJson<Partial<ClaimsExperience>>(req);
    const existing = rfqMockStore.claimsExperience[rfqId] ?? { rfqId, years: [], largeLosses: [] };
    rfqMockStore.claimsExperience[rfqId] = { ...existing, ...patch, rfqId };
    rfqMockStore.rfqs[rfqId].updatedAt = now();
    return json(rfqMockStore.claimsExperience[rfqId]);
  }

  if (resource === 'subsidiaries' && resourceId) {
    const arr = rfqMockStore.subsidiaries[rfqId] ?? [];
    const idx = arr.findIndex((subsidiary) => subsidiary.subsidiaryId === resourceId);
    if (idx === -1) return notFound('Subsidiary not found');
    const patch = await readJson<Partial<Subsidiary>>(req);
    arr[idx] = { ...arr[idx], ...patch, subsidiaryId: resourceId, rfqId };
    rfqMockStore.rfqs[rfqId].updatedAt = now();
    return json(arr[idx]);
  }

  return notFound();
}

async function handleDelete(_req: NextRequest, path: string[]) {
  const [rfqId, resource, resourceId] = path;

  if (path.length === 1) {
    delete rfqMockStore.rfqs[rfqId];
    return noContent();
  }

  if (resource === 'documents' && resourceId) {
    if (rfqMockStore.documents[rfqId]) {
      rfqMockStore.documents[rfqId] = rfqMockStore.documents[rfqId].filter((doc) => doc.documentId !== resourceId);
    }
    return noContent();
  }

  if (resource === 'plans' && resourceId) {
    delete rfqMockStore.plans[resourceId];
    return noContent();
  }

  if (resource === 'subsidiaries' && resourceId) {
    const arr = rfqMockStore.subsidiaries[rfqId] ?? [];
    const idx = arr.findIndex((subsidiary) => subsidiary.subsidiaryId === resourceId);
    if (idx === -1) return notFound('Subsidiary not found');
    arr.splice(idx, 1);
    rfqMockStore.rfqs[rfqId].updatedAt = now();
    return noContent();
  }

  return notFound();
}

async function getPath(context: RouteContext): Promise<string[]> {
  const { path = [] } = await context.params;
  return path;
}

export async function GET(req: NextRequest, context: RouteContext) {
  return handleGet(req, await getPath(context));
}

export async function POST(req: NextRequest, context: RouteContext) {
  return handlePost(req, await getPath(context));
}

export async function PUT(req: NextRequest, context: RouteContext) {
  return handlePut(req, await getPath(context));
}

export async function DELETE(req: NextRequest, context: RouteContext) {
  return handleDelete(req, await getPath(context));
}