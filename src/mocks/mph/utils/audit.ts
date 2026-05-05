import { getStore } from '../store';
import type { AuditEntry, MPHRole } from '../types';

let _counter = 1000;

function nextId(): string {
  return `aud-${String(++_counter).padStart(4, '0')}`;
}

export interface AppendAuditParams {
  organizationId: string;
  userId: string;
  action: string;
  entity: string;
  entityId: string | null;
  description: string;
  policyId?: string;
}

export function appendAudit(params: AppendAuditParams): AuditEntry {
  const store = getStore();
  const entry: AuditEntry = {
    id: nextId(),
    organizationId: params.organizationId,
    userId: params.userId,
    action: params.action,
    entity: params.entity,
    entityId: params.entityId,
    description: params.description,
    policyId: params.policyId,
    timestamp: new Date().toISOString(),
  };
  store.auditLog.push(entry);
  return entry;
}
