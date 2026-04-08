# Layer 6c — Workbench Runtime

**Keystone UI Architecture | Browser-Based, No BFF**

Parent: [06 — Client Runtime](./06-CLIENT-RUNTIME.md)

This document covers the runtime subsystems that are specific to workbench pages: the coherent bootstrap pattern, workflow contract evaluation, draft autosave, async job polling, and audit capture. Standard pages (dashboards, queues) do not use these systems.

---

## Table of Contents

1. [Why Workbenches Are Different](#why-workbenches-are-different)
2. [useWorkbenchBootstrap](#useworkbenchbootstrap)
3. [WorkflowRuntime](#workflowruntime)
4. [DraftRuntime](#draftruntime)
5. [JobRuntime](#jobruntime)
6. [AuditRuntime](#auditruntime)

---

## Why Workbenches Are Different

A workbench page is a multi-region workspace where all visible data must represent the same logical state of a single entity (a quote, a policy, a claim, an account). The regions are not independent — a pricing region and an eligibility region must reflect the same version of the risk; a workflow action bar must reflect the same stage as the case header.

If each region fetches its own data independently:

- Region A resolves at T+100ms — shows the entity in state S1
- Region B resolves at T+300ms — shows the entity in state S2 (mutation landed between the two fetches)
- Region A shows a "Submit" button; Region B shows the entity as already submitted

This is a data coherence failure. It is especially problematic in insurance because actions taken on inconsistent data can have financial or regulatory consequences.

The workbench bootstrap pattern solves this: one call, one coherent snapshot, all regions hydrated from the same payload.

---

## useWorkbenchBootstrap

### API Contract

```
GET /v1/{domainPath}/bootstrap?entityId={entityId}

Example: GET /v1/quotation/bootstrap?entityId=QT-2024-0042
```

The bootstrap endpoint is owned by the orchestration backend. It assembles all region payloads server-side and returns them as a single JSON response. The snapshot is transactionally consistent — all data in the response reflects the same database state.

### Bootstrap Response TypeScript Interface

```typescript
// src/hooks/workbench/useWorkbenchBootstrap.types.ts

export interface WorkbenchBootstrapResponse {
  // --- Case header (always present) ---
  caseHeader: CaseHeader;

  // --- Domain entities ---
  // All major entities needed by the workbench, pre-fetched
  entities: Record<string, unknown>;   // keyed by entity type, e.g. { quote: {...}, risk: {...} }

  // --- Workflow contract ---
  workflow: WorkflowContract;

  // --- Background jobs ---
  jobs: JobSummary[];

  // --- Region payloads ---
  // Pre-fetched data for each named region in the layout.
  // Keys match the widgetId or regionId in the view schema.
  regionPayloads: Record<string, unknown>;
}

export interface CaseHeader {
  entityId: string;
  entityType: string;       // e.g. 'quotation', 'policy', 'claim'
  displayId: string;        // human-readable ID, e.g. 'QT-2024-0042'
  title: string;
  subTitle?: string;
  status: string;
  updatedAt: string;        // ISO 8601
  updatedBy: string;
  tags?: string[];
  breadcrumb: BreadcrumbItem[];
}

export interface BreadcrumbItem {
  label: string;
  path?: string;
}

export interface WorkflowContract {
  stage: string;            // e.g. 'UNDERWRITING_REVIEW'
  caseId: string;
  taskOwner: string;        // role key of the current task owner
  status: 'IN_PROGRESS' | 'BLOCKED' | 'COMPLETED' | 'CANCELLED';
  blockers: WorkflowBlocker[];
  actions: Record<string, WorkflowAction>;   // actionKey → action
  jobs: string[];           // job IDs currently active
  draftState: DraftState;
}

export interface WorkflowBlocker {
  code: string;
  message: string;
  resolvedBy?: string;      // role key that can resolve this blocker
}

export interface WorkflowAction {
  enabled: boolean;
  reasons?: string[];       // codes explaining why enabled=false, e.g. ['pricing_not_finalized']
}

export interface DraftState {
  exists: boolean;
  draftId?: string;
  savedAt?: string;         // ISO 8601
}

export interface JobSummary {
  jobId: string;
  type: string;
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'RETRYING';
  startedAt?: string;
  completedAt?: string;
  progress?: number;        // 0-100, if the job supports progress reporting
}
```

### Hook Implementation

```typescript
// src/hooks/workbench/useWorkbenchBootstrap.ts

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../lib/apiClient';
import { QueryKeys } from '../../constants/queryKeys';
import { useAppContext } from '../useAppContext';
import { WorkbenchBootstrapResponse } from './useWorkbenchBootstrap.types';

interface UseWorkbenchBootstrapOptions {
  enabled?: boolean;
}

export function useWorkbenchBootstrap(
  domainPath: string,
  entityId: string,
  options: UseWorkbenchBootstrapOptions = {},
) {
  const { tenantId } = useAppContext();
  const queryClient = useQueryClient();

  const queryKey = [QueryKeys.WORKBENCH, { domain: domainPath, entityId, tenantId }];

  const result = useQuery<WorkbenchBootstrapResponse>({
    queryKey,
    queryFn: () =>
      apiClient.get<WorkbenchBootstrapResponse>(
        `/v1/${domainPath}/bootstrap`,
        { params: { entityId } },
      ),

    // Workbench pages must always have a fresh snapshot.
    // staleTime: 0 means React Query will always refetch when the query is used,
    // including on window focus — critical for workbenches where multiple users
    // may be editing simultaneously.
    staleTime: 0,
    gcTime: 5 * 60 * 1000,   // keep the cache for 5 minutes after component unmount

    // Do not refetch in the background while the user is actively working —
    // background refetches on a workbench would clobber in-progress edits.
    refetchIntervalInBackground: false,

    enabled: options.enabled !== false && !!entityId,
  });

  // After a successful bootstrap, seed the region payloads into the React Query cache
  // so that widgets that use useSmartQuery can find their data without an additional fetch.
  if (result.data) {
    seedRegionPayloadsToCache(queryClient, result.data.regionPayloads, tenantId);
  }

  return result;
}

function seedRegionPayloadsToCache(
  queryClient: ReturnType<typeof useQueryClient>,
  regionPayloads: Record<string, unknown>,
  tenantId: string,
) {
  // Each key in regionPayloads maps to a query key.
  // Convention: region key = entity name, value = entity data.
  // This pre-populates the cache so widgets do not issue redundant requests.
  for (const [regionKey, data] of Object.entries(regionPayloads)) {
    queryClient.setQueryData([regionKey, { tenantId }], data);
  }
}
```

### Mount Sequence

```
1. Route activates → useViewMetadata(viewId) fires
   └─ CDN cache hit in < 50ms for known views
   
2. useWorkbenchBootstrap(domainPath, entityId) fires
   └─ Single coherent API call
   └─ On success: seeds region payloads into React Query cache

3. Layout renders from schema
   └─ WidgetRenderer checks conditions (all pass — data now in cache)
   └─ Components mount and read from cache — no additional network calls

4. After initial render (useEffect, not blocking):
   └─ Subpanel-specific hooks fire for panels not covered by the bootstrap
   └─ These are lower-priority refreshes, isolated to their panels
```

---

## WorkflowRuntime

The workflow contract governs what actions are available to the current user at the current stage of the case. Action availability is evaluated by the orchestration backend — the UI reads the result from the bootstrap payload and enforces it in the presentation layer.

**Important:** Hiding a workflow action in the UI is a convenience, not a security gate. The backend API will reject any action call that is not permitted, regardless of what the UI shows. Never rely solely on UI-level action hiding for access control.

### useWorkflowContract

Reads the workflow contract from the bootstrap result. Returns the full contract object.

```typescript
// src/hooks/workbench/useWorkflowContract.ts

import { useWorkbenchBootstrap } from './useWorkbenchBootstrap';
import { WorkflowContract } from './useWorkbenchBootstrap.types';

export function useWorkflowContract(
  domainPath: string,
  entityId: string,
): WorkflowContract | null {
  const { data } = useWorkbenchBootstrap(domainPath, entityId);
  return data?.workflow ?? null;
}
```

### useWorkflowAction

Returns the availability state and an `execute` function for a single named action. Wraps the underlying mutation and blocks execution if the workflow contract says the action is disabled.

```typescript
// src/hooks/workbench/useWorkflowAction.ts

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useWorkflowContract } from './useWorkflowContract';
import { apiClient } from '../../lib/apiClient';
import { QueryKeys } from '../../constants/queryKeys';
import { useAppContext } from '../useAppContext';

interface WorkflowActionState {
  enabled: boolean;
  reasons: string[];    // empty when enabled=true
  execute: (payload?: unknown) => Promise<void>;
  isExecuting: boolean;
}

export function useWorkflowAction(
  domainPath: string,
  entityId: string,
  actionKey: string,
): WorkflowActionState {
  const { tenantId } = useAppContext();
  const queryClient = useQueryClient();
  const contract = useWorkflowContract(domainPath, entityId);

  const actionDef = contract?.actions[actionKey];
  const enabled = actionDef?.enabled ?? false;
  const reasons = actionDef?.reasons ?? [];

  const mutation = useMutation({
    mutationFn: (payload?: unknown) =>
      apiClient.post(`/v1/${domainPath}/${entityId}/actions/${actionKey}`, payload),

    onSuccess: () => {
      // Invalidate the workbench bootstrap — workflow stage has advanced
      queryClient.invalidateQueries({
        queryKey: [QueryKeys.WORKBENCH, { domain: domainPath, entityId, tenantId }],
      });
    },
  });

  const execute = async (payload?: unknown) => {
    // UI-level gate: block execution if the workflow contract says disabled.
    // This does not replace backend enforcement — it provides immediate feedback.
    if (!enabled) {
      const reasonText = reasons.length > 0 ? reasons.join(', ') : 'action not available';
      throw new Error(`Action "${actionKey}" is not available: ${reasonText}`);
    }
    await mutation.mutateAsync(payload);
  };

  return {
    enabled,
    reasons,
    execute,
    isExecuting: mutation.isPending,
  };
}
```

### Rendering a Workflow Action Button

```typescript
// Example: "Refer Decision" action button

function ReferDecisionButton({ domainPath, entityId }: { domainPath: string; entityId: string }) {
  const { enabled, reasons, execute, isExecuting } = useWorkflowAction(
    domainPath,
    entityId,
    'referDecision',
  );

  return (
    <Tooltip content={!enabled ? reasons.map(formatReason).join('; ') : undefined}>
      <Button
        onClick={() => execute()}
        disabled={!enabled || isExecuting}
        loading={isExecuting}
      >
        Refer Decision
      </Button>
    </Tooltip>
  );
}
```

---

## DraftRuntime

Workbench forms that involve long-running data entry (pricing forms, claim forms, policy amendment forms) support autosave and draft restoration. The draft system is independent of the main entity state — a draft is a partial, unsaved version of the form data.

### API Endpoints

```
PATCH  /v1/{domain}/{entityId}/draft   — create or update draft
GET    /v1/{domain}/{entityId}/draft   — restore draft
DELETE /v1/{domain}/{entityId}/draft   — discard draft
```

### useDraft

```typescript
// src/hooks/workbench/useDraft.ts

import { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../lib/apiClient';

interface DraftData {
  formData: Record<string, unknown>;
  savedAt: string;    // ISO 8601
  draftId: string;
}

interface DraftConflict {
  serverUpdatedAt: string;
  localLastSyncedAt: string;
}

interface UseDraftReturn {
  // Draft restoration
  draft: DraftData | null;
  isLoadingDraft: boolean;
  restoreDraft: () => void;

  // Autosave
  saveDraft: (formData: Record<string, unknown>) => void;
  isSaving: boolean;
  lastSavedAt: string | null;

  // Conflict detection
  conflict: DraftConflict | null;
  resolveConflict: (resolution: 'keepLocal' | 'useServer') => void;

  // Discard
  discardDraft: () => Promise<void>;
}

const AUTOSAVE_DEBOUNCE_MS = 30_000; // 30 seconds

export function useDraft(domain: string, entityId: string): UseDraftReturn {
  const queryClient = useQueryClient();
  const autosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSyncedAt = useRef<string | null>(null);

  const [conflict, setConflict] = useState<DraftConflict | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);

  // --- Restore draft ---
  const { data: draft, isLoading: isLoadingDraft } = useQuery<DraftData | null>({
    queryKey: ['draft', { domain, entityId }],
    queryFn: async () => {
      try {
        return await apiClient.get<DraftData>(`/v1/${domain}/${entityId}/draft`);
      } catch (err: unknown) {
        // 404 means no draft exists — not an error
        if ((err as { status?: number }).status === 404) return null;
        throw err;
      }
    },
    staleTime: Infinity,   // draft is loaded once and managed locally
  });

  const restoreDraft = useCallback(() => {
    if (draft) {
      lastSyncedAt.current = draft.savedAt;
    }
  }, [draft]);

  // --- Save draft mutation ---
  const saveMutation = useMutation({
    mutationFn: (formData: Record<string, unknown>) =>
      apiClient.patch<DraftData>(`/v1/${domain}/${entityId}/draft`, { formData }),

    onSuccess: (saved) => {
      lastSyncedAt.current = saved.savedAt;
      setLastSavedAt(saved.savedAt);
      // Update local cache
      queryClient.setQueryData(['draft', { domain, entityId }], saved);
    },
  });

  // --- Autosave with debounce ---
  const saveDraft = useCallback(
    (formData: Record<string, unknown>) => {
      // Cancel any pending save
      if (autosaveTimer.current) clearTimeout(autosaveTimer.current);

      // Schedule new save
      autosaveTimer.current = setTimeout(async () => {
        // Conflict check: before saving, verify the server entity hasn't been
        // updated by someone else since we last synced
        try {
          const serverEntity = await apiClient.get<{ updatedAt: string }>(
            `/v1/${domain}/${entityId}`,
            { params: { fields: 'updatedAt' } },
          );

          if (
            lastSyncedAt.current &&
            serverEntity.updatedAt > lastSyncedAt.current
          ) {
            // Conflict detected — do not autosave, prompt user
            setConflict({
              serverUpdatedAt: serverEntity.updatedAt,
              localLastSyncedAt: lastSyncedAt.current,
            });
            return;
          }
        } catch {
          // If the conflict check fails, proceed with save — better to save than to lose data
        }

        saveMutation.mutate(formData);
      }, AUTOSAVE_DEBOUNCE_MS);
    },
    [domain, entityId, saveMutation],
  );

  // --- Conflict resolution ---
  const resolveConflict = useCallback(
    (resolution: 'keepLocal' | 'useServer') => {
      setConflict(null);
      if (resolution === 'useServer') {
        // Invalidate everything — reload from server
        queryClient.invalidateQueries({
          queryKey: ['draft', { domain, entityId }],
        });
      }
      // If keepLocal: user keeps editing, autosave will try again next cycle
    },
    [domain, entityId, queryClient],
  );

  // --- Discard draft ---
  const discardMutation = useMutation({
    mutationFn: () => apiClient.delete(`/v1/${domain}/${entityId}/draft`),
    onSuccess: () => {
      queryClient.setQueryData(['draft', { domain, entityId }], null);
      setLastSavedAt(null);
      lastSyncedAt.current = null;
    },
  });

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    };
  }, []);

  return {
    draft: draft ?? null,
    isLoadingDraft,
    restoreDraft,
    saveDraft,
    isSaving: saveMutation.isPending,
    lastSavedAt,
    conflict,
    resolveConflict,
    discardDraft: discardMutation.mutateAsync,
  };
}
```

### Draft UI States

| State | UI Behaviour |
|---|---|
| Draft exists on load | Show "Draft available — Restore?" banner at top of form |
| Autosave in progress | Show "Saving..." indicator in form header |
| Autosave succeeded | Show "Saved {time}" indicator |
| Conflict detected | Show conflict dialog: "This case was updated by {user} at {time}. Keep your changes or reload from server?" |
| Draft discarded | Hide banner, clear form, do not prompt again |

---

## JobRuntime

Some workbench operations are asynchronous — e.g., running a pricing model, generating a document, or processing a large batch import. These are represented as jobs. The UI polls for job status and progressively hydrates results as they become available.

### useJobStatus

Polls a job and updates the React Query cache with partial results as they arrive.

```typescript
// src/hooks/workbench/useJobStatus.ts

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../lib/apiClient';

export type JobStatus = 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'RETRYING';

export interface JobStatusResponse {
  jobId: string;
  type: string;
  status: JobStatus;
  progress?: number;          // 0-100
  startedAt?: string;
  completedAt?: string;
  result?: unknown;           // populated when status = COMPLETED
  error?: JobError;           // populated when status = FAILED
  partialResult?: unknown;    // populated during RUNNING if job supports streaming results
}

export interface JobError {
  code: string;
  message: string;
  retryable: boolean;
}

// Exponential backoff intervals for polling
const POLL_INTERVALS: Record<JobStatus, number | false> = {
  PENDING:   1_000,    // 1s — job hasn't started yet, check frequently
  RUNNING:   2_000,    // 2s — job is running
  RETRYING:  4_000,    // 4s — job is retrying after a transient failure
  COMPLETED: false,    // stop polling
  FAILED:    false,    // stop polling
};

const MAX_POLL_INTERVAL_MS = 30_000; // 30s ceiling

export function useJobStatus(jobId: string | null) {
  return useQuery<JobStatusResponse | null>({
    queryKey: ['job', { jobId }],
    queryFn: () => {
      if (!jobId) return null;
      return apiClient.get<JobStatusResponse>(`/v1/jobs/${jobId}`);
    },

    enabled: !!jobId,

    // refetchInterval is a function so it can be dynamic based on current status
    refetchInterval: (query) => {
      const data = query.state.data;
      if (!data) return 1_000;

      const baseInterval = POLL_INTERVALS[data.status];
      if (baseInterval === false) return false; // stop polling

      // Apply exponential backoff based on retry count
      // query.state.fetchFailureCount tracks consecutive failures
      const failureCount = query.state.fetchFailureCount ?? 0;
      const backoff = baseInterval * Math.pow(2, failureCount);
      return Math.min(backoff, MAX_POLL_INTERVAL_MS);
    },

    refetchIntervalInBackground: false,  // pause polling when tab is not focused
  });
}
```

### Progressive Result Hydration

When a job produces partial results (e.g., a pricing model that computes coverage-by-coverage), the UI should render partial results progressively rather than showing a spinner until the full result is ready.

```typescript
// src/hooks/workbench/useJobWithHydration.ts

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useJobStatus } from './useJobStatus';

interface JobHydrationConfig {
  jobId: string | null;
  // When the job produces a partial result, write it to this query key
  targetQueryKey: unknown[];
  // Transform the partial result before writing to cache
  transform?: (partialResult: unknown) => unknown;
}

export function useJobWithHydration({
  jobId,
  targetQueryKey,
  transform = (x) => x,
}: JobHydrationConfig) {
  const queryClient = useQueryClient();
  const jobQuery = useJobStatus(jobId);

  useEffect(() => {
    const data = jobQuery.data;
    if (!data) return;

    // Write partial results to cache as they arrive during RUNNING state
    if (data.status === 'RUNNING' && data.partialResult !== undefined) {
      queryClient.setQueryData(targetQueryKey, transform(data.partialResult));
    }

    // Write final result when job completes
    if (data.status === 'COMPLETED' && data.result !== undefined) {
      queryClient.setQueryData(targetQueryKey, transform(data.result));
    }
  }, [jobQuery.data, queryClient, targetQueryKey, transform]);

  return jobQuery;
}
```

### useJobRetry

Triggers a retry for a failed job. Uses `POST /v1/jobs/{jobId}/retry`.

```typescript
// src/hooks/workbench/useJobRetry.ts

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../lib/apiClient';

export function useJobRetry(jobId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => apiClient.post(`/v1/jobs/${jobId}/retry`),

    onSuccess: () => {
      // Reset the job status query — the job is now in RETRYING state
      queryClient.invalidateQueries({
        queryKey: ['job', { jobId }],
      });
    },
  });
}
```

### Job UI States

| Job Status | UI Element |
|---|---|
| `PENDING` | Spinner with "Queued..." label |
| `RUNNING` | Progress bar if `progress` is available, otherwise indeterminate spinner |
| `RUNNING` with `partialResult` | Partial data renders in the target region; spinner persists |
| `COMPLETED` | Final data in target region; job UI dismissed |
| `FAILED` (retryable) | Error banner with "Retry" button — calls `useJobRetry` |
| `FAILED` (non-retryable) | Error banner with error message and support reference |

---

## AuditRuntime

Certain actions in insurance are regulated operations that require an audit trail with a documented reason. Examples: manual override of an automated decision, approval of a quote above a certain limit, write-off of a claim payment. The audit runtime captures this reason before the action executes.

### useAuditCapture

```typescript
// src/hooks/workbench/useAuditCapture.ts

import { useState, useCallback } from 'react';

export interface AuditContext {
  reason: string;
  evidenceIds?: string[];   // IDs of attached evidence documents
}

interface UseAuditCaptureReturn {
  // Whether the audit reason dialog is currently open
  isCapturing: boolean;

  // Open the dialog and return a promise that resolves with the captured reason,
  // or rejects if the user cancels.
  captureReason: () => Promise<AuditContext>;

  // Internal — used by the dialog component
  _resolve: ((ctx: AuditContext) => void) | null;
  _reject: (() => void) | null;
  _close: () => void;
}

export function useAuditCapture(): UseAuditCaptureReturn {
  const [isCapturing, setIsCapturing] = useState(false);
  const [resolve, setResolve] = useState<((ctx: AuditContext) => void) | null>(null);
  const [reject, setReject] = useState<(() => void) | null>(null);

  const captureReason = useCallback((): Promise<AuditContext> => {
    return new Promise((res, rej) => {
      setResolve(() => res);
      setReject(() => rej);
      setIsCapturing(true);
    });
  }, []);

  const close = useCallback(() => {
    setIsCapturing(false);
    setResolve(null);
    setReject(null);
  }, []);

  return {
    isCapturing,
    captureReason,
    _resolve: resolve,
    _reject: reject,
    _close: close,
  };
}
```

### Attaching Audit Reason to a Mutation

The captured reason is sent as two things:

1. The `X-Audit-Reason` HTTP header on the mutation request
2. An `audit` field in the mutation payload body (for mutations that require evidence linkage)

```typescript
// src/hooks/workbench/useAuditedMutation.ts

import { useMutation, useQueryClient, MutateOptions } from '@tanstack/react-query';
import { apiClient } from '../../lib/apiClient';
import { useAuditCapture, AuditContext } from './useAuditCapture';

interface AuditedMutationConfig<TPayload, TResponse> {
  mutationFn: (payload: TPayload, audit: AuditContext) => Promise<TResponse>;
  invalidateKeys?: unknown[][];
  requireEvidenceIds?: boolean;
}

export function useAuditedMutation<TPayload, TResponse>({
  mutationFn,
  invalidateKeys = [],
}: AuditedMutationConfig<TPayload, TResponse>) {
  const queryClient = useQueryClient();
  const audit = useAuditCapture();

  const mutation = useMutation({
    mutationFn: ({ payload, auditCtx }: { payload: TPayload; auditCtx: AuditContext }) =>
      mutationFn(payload, auditCtx),

    onSuccess: () => {
      for (const key of invalidateKeys) {
        queryClient.invalidateQueries({ queryKey: key });
      }
    },
  });

  // The caller calls execute() — this triggers the audit dialog before the mutation
  const execute = async (payload: TPayload) => {
    // Pause here until the user fills in the audit reason dialog
    const auditCtx = await audit.captureReason();

    // User confirmed — proceed with the mutation
    await mutation.mutateAsync({ payload, auditCtx });
  };

  return {
    execute,
    isExecuting: mutation.isPending,
    isCapturing: audit.isCapturing,
    // Expose audit internals so the AuditReasonDialog can use them
    auditCapture: audit,
  };
}
```

### How the API Client Attaches the Header

```typescript
// src/lib/apiClient.ts (excerpt)

import axios, { AxiosRequestConfig } from 'axios';

const instance = axios.create({ baseURL: import.meta.env.VITE_API_BASE_URL });

export const apiClient = {
  post: <T>(url: string, data?: unknown, config?: AxiosRequestConfig & { auditReason?: string; evidenceIds?: string[] }) => {
    const headers: Record<string, string> = {};

    if (config?.auditReason) {
      headers['X-Audit-Reason'] = config.auditReason;
    }

    // If the mutation requires evidence linkage, include it in the body
    const payload = config?.evidenceIds
      ? { ...data, audit: { reason: config.auditReason, evidenceIds: config.evidenceIds } }
      : data;

    return instance.post<T>(url, payload, { ...config, headers }).then((r) => r.data);
  },
};
```

### AuditReasonDialog Component

```typescript
// src/components/workbench/AuditReasonDialog.tsx

import { useState } from 'react';
import { UseAuditCaptureReturn } from '../../hooks/workbench/useAuditCapture';
import { Dialog, Button, Textarea } from '../ui';

interface AuditReasonDialogProps {
  auditCapture: UseAuditCaptureReturn;
  title?: string;
  requireEvidenceIds?: boolean;
}

export function AuditReasonDialog({
  auditCapture,
  title = 'Action Requires Justification',
  requireEvidenceIds = false,
}: AuditReasonDialogProps) {
  const [reason, setReason] = useState('');
  const [evidenceIds, setEvidenceIds] = useState<string[]>([]);

  if (!auditCapture.isCapturing) return null;

  const handleConfirm = () => {
    if (!reason.trim()) return;   // UI-level validation: reason is required
    auditCapture._resolve?.({ reason: reason.trim(), evidenceIds });
    auditCapture._close();
    setReason('');
  };

  const handleCancel = () => {
    auditCapture._reject?.();
    auditCapture._close();
    setReason('');
  };

  return (
    <Dialog open title={title} onClose={handleCancel}>
      <Textarea
        label="Reason for this action"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="Enter a clear justification for this action. This will be logged in the audit trail."
        required
        rows={4}
      />
      {requireEvidenceIds && (
        <EvidenceAttacher
          selectedIds={evidenceIds}
          onChange={setEvidenceIds}
        />
      )}
      <Button onClick={handleConfirm} disabled={!reason.trim()}>Confirm</Button>
      <Button variant="ghost" onClick={handleCancel}>Cancel</Button>
    </Dialog>
  );
}
```

### Regulated Actions Reference

The following workbench actions require audit capture in all environments:

| Action | Domain | Requires Evidence |
|---|---|---|
| Manual underwriting override | Quotation | No |
| Quote approval above referral limit | Quotation | Yes |
| Claim payment authorisation | Claims | No |
| Claim write-off | Claims | Yes |
| Policy backdating | Policy servicing | Yes |
| Ledger manual adjustment | Accounting | Yes |
| Compliance flag resolution | Compliance | No |

The schema for each action button includes `auditRequired: true` when the action is regulated. The workbench rendering layer checks this flag and wraps the action in `useAuditedMutation` automatically.

---

*Last updated: 2026-04-08 | Architecture branch*
