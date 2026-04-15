# 03c — Schema Materialisation Service

**Parent:** [03 — Client Config System](./03-CLIENT-CONFIG-SYSTEM.md)  
**Scope:** Service design, event payload, full algorithm, config resolution with specificity, error handling, retry policy, idempotency, monitoring  

---

## 1. Service Overview

The Schema Materialisation Service is a standalone backend service (or serverless function) whose sole responsibility is producing resolved schema files in S3. It is triggered by config save events and runs to completion, writing one schema file per affected tenant — each file is a flat schema document with inline `$show`/`$hide` conditions and all config-derived values already baked in.

The browser never calls this service. Its output is static files on S3, served via CDN. The service is entirely invisible to the client.

### Two Deployment Modes

The service supports two trigger mechanisms, both handled by the same core logic:

**Mode A — Webhook endpoint (HTTP)**

The Config System POSTs a JSON payload to an HTTPS endpoint hosted by the service. Suitable for synchronous, low-volume environments or when event ordering guarantees are not required.

```
Config System → POST https://materialisation-service/hooks/config-saved
                 Authorization: Bearer <service-token>
                 Content-Type: application/json
                 { ...ConfigSavedEvent }
```

**Mode B — Queue consumer (SQS / Pub-Sub)**

The Config System publishes a message to a queue. The service polls the queue and processes messages. Suitable for high-volume environments with retry and backoff requirements. This is the recommended production mode.

```
Config System → Publish to SQS queue "config-saved-events"
                 { ...ConfigSavedEvent }
Materialisation Service → Long-polls queue → Processes message → Deletes message on success
```

Both modes invoke the same `materialise(event: ConfigSavedEvent)` function. The difference is only in how the event arrives.

---

## 2. Event Payload Shape

The Config System emits the following event when a blob is saved. This is the input the Materialisation Service receives:

```typescript
interface ConfigSavedEvent {
  /** Stable event identifier. Used for idempotency. */
  eventId: string;

  eventType: "config.blob.saved";

  /**
   * The exact config key that was saved.
   * May be a namespace-level key (enumMap) or a leaf key (singleValue/valueList).
   * Example: "insurance.quotation.status"
   * Example: "insurance.quotation.status.PENDING_APPROVAL"
   */
  configKey: string;

  /**
   * The namespace prefix of the configKey (everything up to the last dot segment
   * for leaf keys, or the key itself for namespace keys).
   * Used to find all bindings that reference this namespace.
   * Example: "insurance.quotation.status"
   */
  namespace: string;

  /**
   * Which tenants are affected by this change.
   * If the base blob was changed (tenantId: null), ALL tenant variants are affected
   * and this array contains the special sentinel "base" plus all tenant IDs.
   * If a tenant-specific blob was changed, only that tenant's variants are affected.
   */
  affectedTenantIds: string[];

  /**
   * Which locale is affected.
   * If the base blob was changed (locale: null), ALL locale variants are affected
   * and this field is null.
   * If a locale-specific blob was changed, only variants for that locale are affected.
   */
  affectedLocale: string | null;

  /** ISO 8601 timestamp when the blob was saved. */
  timestamp: string;

  /** Correlation ID for distributed tracing. */
  correlationId: string;
}
```

### Example event payloads

Config System saves the base `insurance.quotation.status` blob (affects all tenants, all locales):
```json
{
  "eventId": "evt_01hx_abc123",
  "eventType": "config.blob.saved",
  "configKey": "insurance.quotation.status",
  "namespace": "insurance.quotation.status",
  "affectedTenantIds": ["base", "tenant_abc", "tenant_xyz", "tenant_def"],
  "affectedLocale": null,
  "timestamp": "2026-04-08T10:23:00Z",
  "correlationId": "corr_01hx_xyz"
}
```

Config System saves a tenant_abc-specific `insurance.quotation.list.title` blob:
```json
{
  "eventId": "evt_01hy_def456",
  "eventType": "config.blob.saved",
  "configKey": "insurance.quotation.list.title",
  "namespace": "insurance.quotation.list",
  "affectedTenantIds": ["tenant_abc"],
  "affectedLocale": null,
  "timestamp": "2026-04-08T11:05:00Z",
  "correlationId": "corr_01hy_uvw"
}
```

---

## 3. Full Algorithm

The following pseudocode describes the complete materialisation algorithm. The service executes this for every received event.

```
function materialise(event: ConfigSavedEvent): void

  // ── Step 1: Check idempotency ─────────────────────────────────────────────
  if idempotencyStore.has(event.eventId):
    log.info("Duplicate event, skipping", { eventId: event.eventId })
    return

  // ── Step 2: Scan for affected bindings ────────────────────────────────────
  //
  // List all config-bindings.json files under keystone-schema-bindings/ in S3.
  // This is a paginated S3 ListObjects call — results are cached in memory
  // for the duration of the process and invalidated by schema authoring events.
  //
  allBindingFiles = s3.list("keystone-schema-bindings/", recursive=true)
    // → ["keystone-schema-bindings/quotations-list/config-bindings.json",
    //    "keystone-schema-bindings/claims-list/config-bindings.json", ...]

  affectedViewIds = []

  for each bindingFilePath in allBindingFiles:
    bindings = s3.get(bindingFilePath)  // parse JSON
    for each (path, bindingEntry) in bindings:
      if keyMatchesEvent(bindingEntry.configKey, event.configKey, event.namespace):
        viewId = extractViewId(bindingFilePath)
        // e.g. "keystone-schema-bindings/quotations-list/config-bindings.json"
        //        → viewId = "quotations-list"
        affectedViewIds.add(viewId)
        break  // one match is enough to include the viewId; check all paths later

  if affectedViewIds.isEmpty():
    log.info("No schemas bound to changed key", { configKey: event.configKey })
    idempotencyStore.set(event.eventId)
    return

  // ── Step 3: Determine affected tenant schemas ────────────────────────────
  //
  // For each affected viewId, determine which tenant schemas exist and which
  // are affected by this event. One schema file per tenant — no locale variants
  // as separate files (locale is a $show condition within the schema document).
  //
  for each viewId in affectedViewIds:
    allTenants = schemaVariantRegistry.getTenantsForView(viewId)
    // Each tenant: { viewId, tenantId }

    affectedTenants = allTenants.filter(tenant =>
      isVariantAffected(tenant, event.affectedTenantIds)
    )

    // ── Step 4: Materialise each affected tenant schema ───────────────────
    for each tenant in affectedTenants:
      materialiseVariant(viewId, tenant, event.correlationId)

  // ── Step 5: Record idempotency ────────────────────────────────────────────
  idempotencyStore.set(event.eventId, ttl=7_days)

  emit("config.materialisation.complete", {
    eventId: event.eventId,
    configKey: event.configKey,
    affectedViewIds: affectedViewIds,
    totalVariantsMaterialised: count
  })
```

```
function keyMatchesEvent(
  bindingKey: string,
  eventKey: string,
  eventNamespace: string
): boolean

  // Exact match: binding references exactly the changed key
  if bindingKey === eventKey: return true

  // Namespace match: binding references a namespace that the changed key belongs to
  // e.g. event key "insurance.quotation.status.PENDING_APPROVAL"
  //      binding key "insurance.quotation.status" (enumMap namespace)
  if eventKey.startsWith(bindingKey + "."): return true

  // Child match: binding references a child of the changed namespace
  // e.g. event key "insurance.quotation.status" (namespace-level blob)
  //      binding key "insurance.quotation.status.PENDING_APPROVAL" (per-code)
  if bindingKey.startsWith(eventNamespace + "."): return true

  return false
```

```
function materialiseVariant(
  viewId: string,
  tenant: { tenantId: string },
  correlationId: string
): void

  // Load the schema definition for this tenant:
  // a flat schema document with inline $show/$hide conditions (no config values yet)
  rawSchema = schemaStore.get(viewId, tenant.tenantId)
  // rawSchema: { base: {...}, partials: [{ id, condition, overrides }, ...] }

  // Load binding declarations for this viewId
  bindings = s3.get(`keystone-schema-bindings/${viewId}/config-bindings.json`)

  // Resolve config bindings throughout the document.
  // Binding paths may target base fields or fields within specific partials.
  // e.g. "base.columns.status.valueMap"
  //      "partials[id=role-underwriter-lob-motor].overrides.columns.status.valueMap"
  resolvedSchema = deepClone(rawSchema)

  for each (schemaPath, bindingEntry) in bindings:
    resolvedValue = resolveBinding(bindingEntry, tenant)
    jsonPathSet(resolvedSchema, schemaPath, resolvedValue)

  // Attach resolution metadata
  resolvedSchema.tenantId   = tenant.tenantId
  resolvedSchema.resolvedAt = now().toISOString()

  // Write to S3 — one file per tenant per view
  s3Key = `keystone-resolved-schemas/${viewId}/${tenant.tenantId.toLowerCase()}.json`
  s3.put(s3Key, resolvedSchema, contentType="application/json")

  // Invalidate CDN cache for the view
  cdn.purgeByTag(`schema-${viewId}`)

  metrics.record("materialisation.tenant.written", {
    viewId, tenantId: tenant.tenantId
  })
```

---

## 4. Config Blob Resolution Priority

When resolving each binding, the service looks for the most specific config blob available for the current tenant. Priority is tenant-specific first, then base (applies to all tenants).

```
function resolveBinding(
  bindingEntry: BindingEntry,
  tenant: { tenantId: string }
): ConfigBlobValue

  configKey = bindingEntry.configKey

  // Priority order (first non-null result wins):
  // 1. tenant-specific blob   (highest priority)
  // 2. base blob              (applies to all tenants)

  candidates = [
    configStore.get(configKey, tenantId: tenant.tenantId),
    configStore.get(configKey, tenantId: null)
  ]

  winner = candidates.find(c => c !== null)

  if winner === null:
    // No blob found for any specificity level
    return handleMissingBlob(configKey, bindingEntry, variant)

  rawValue = winner.value

  // Apply mapping-type-specific processing
  switch bindingEntry.mapping:

    case "enumMap":
      // rawValue is Record<string, BadgeValue>
      // Check for expected codes gaps
      if bindingEntry.expectedCodes:
        for each code in bindingEntry.expectedCodes:
          if rawValue[code] === undefined:
            rawValue[code] = fallbackBadge(code)
            emitGapEvent(configKey, code, variant)
      return rawValue

    case "singleValue":
      // rawValue is string | boolean | BadgeValue
      if bindingEntry.transform:
        if typeof rawValue === "string":
          rawValue = (bindingEntry.transform.prefix ?? "") + rawValue + (bindingEntry.transform.suffix ?? "")
      return rawValue

    case "valueList":
      // rawValue is string[]
      return rawValue
```

```
function fallbackBadge(rawCode: string): BadgeValue
  return { label: rawCode, variant: "neutral" }
  // Note: label is the raw domain code string, not a human label.
  // This is intentional — it makes gaps visible to users as recognisable
  // strings rather than silently wrong labels.
```

---

## 5. Error Handling

### 5.1 Missing Config Blob (gap)

When no config blob exists for a configKey at any specificity level:

```
handleMissingBlob(configKey, bindingEntry, variant):
  fallback = { label: "<" + configKey + ">", variant: "neutral" }
  emit("config.gap.detected", {
    configKey: configKey,
    bindingPath: currentPath,
    viewId: currentViewId,
    tenantId: variant.tenantId,
    locale: variant.locale,
    timestamp: now()
  })
  metrics.increment("config.gap.count", { configKey })
  return fallback
```

The `config.gap.detected` event:
- Feeds the admin gap report (see [03 §7](./03-CLIENT-CONFIG-SYSTEM.md#7-the-admin-screen))
- Triggers a PagerDuty/OpsGenie alert if `config.gap.count` exceeds threshold in a rolling window
- Is not a materialisation failure — the service continues and writes the fallback value

### 5.2 S3 Write Failure

```
try:
  s3.put(s3Key, resolvedSchema)
catch S3WriteError as e:
  log.error("S3 write failed", { s3Key, error: e })
  metrics.increment("materialisation.s3_write_failure")
  throw e  // Re-throw to trigger queue retry
```

S3 write failures cause the entire materialisation of that variant to fail. In queue mode, the message is not deleted and becomes available for retry (see Section 7).

### 5.3 Raw Schema Not Found

If a raw schema file does not exist in S3:

```
try:
  rawSchema = s3.get(`keystone-raw-schemas/${viewId}/schema.json`)
catch S3NotFoundError:
  log.error("Raw schema not found for viewId", { viewId })
  metrics.increment("materialisation.schema_not_found", { viewId })
  // Emit alert — this is a data integrity problem
  emit("materialisation.schema_missing", { viewId })
  return  // Skip this viewId; don't retry (the schema itself is missing)
```

### 5.4 Binding JSON Parse Error

If a `config-bindings.json` file is malformed:

```
try:
  bindings = JSON.parse(s3.get(bindingFilePath))
catch JSONParseError:
  log.error("Malformed config-bindings.json", { bindingFilePath })
  metrics.increment("materialisation.bindings_parse_failure", { viewId })
  emit("materialisation.bindings_malformed", { viewId, bindingFilePath })
  return  // Skip this viewId; alert for schema author to fix
```

### 5.5 CDN Purge Failure

CDN purge failures are logged and alerted but do not cause a retry of the materialisation. The S3 file is already correct; a stale CDN cache will eventually expire (TTL-based fallback). A background process re-attempts failed purges.

```
try:
  cdn.purge(s3Key)
catch CDNPurgeError as e:
  log.warn("CDN purge failed, queuing for retry", { s3Key, error: e })
  cdnPurgeRetryQueue.enqueue(s3Key)
  // Materialisation is still considered successful
```

---

## 6. Retry Policy (Queue Mode)

In queue mode (SQS / Pub-Sub), retry is managed by the queue's visibility timeout and dead-letter queue (DLQ) configuration.

| Parameter | Value | Rationale |
|-----------|-------|-----------|
| Initial visibility timeout | 30 seconds | Time allowed for first processing attempt |
| Max receive count | 5 | Number of retries before DLQ |
| Backoff strategy | Exponential: 30s, 1m, 2m, 4m, 8m | Avoids thundering herd on persistent failures |
| DLQ retention | 14 days | Allows manual inspection and replay |

On each retry attempt, the service re-fetches all inputs (raw schema, bindings, config blobs) from S3. This ensures retries pick up any fixes made since the initial failure.

After the 5th failure, the message moves to the DLQ. The on-call team receives an alert and can replay the message after investigating the root cause.

### Manual Replay from DLQ

```bash
# Move all DLQ messages back to the main queue for reprocessing
aws sqs send-message-batch \
  --queue-url https://sqs.region.amazonaws.com/.../config-saved-events \
  --entries "$(aws sqs receive-message \
    --queue-url https://sqs.region.amazonaws.com/.../config-saved-events-dlq \
    --max-number-of-messages 10 \
    --query 'Messages[*].{Id:MessageId,MessageBody:Body}' \
    --output json)"
```

---

## 7. Idempotency

The same `ConfigSavedEvent` (same `eventId`) processed twice must produce exactly the same output and must not result in double-writes or double-purges.

### Idempotency Store

The service maintains a key-value store (Redis or DynamoDB) of processed `eventId`s with a TTL of 7 days.

```
Before processing:
  if idempotencyStore.exists(event.eventId):
    log.info("Event already processed, skipping", { eventId })
    return  // acknowledge the message, do not reprocess

After successful processing:
  idempotencyStore.set(event.eventId, processedAt=now(), ttl=7_days)
```

### Why Idempotency Matters

In queue mode, a message may be delivered more than once (at-least-once delivery semantics). Without idempotency guards, a duplicated message would trigger redundant S3 writes and CDN purges — harmless for correctness but wasteful and potentially disruptive to CDN caching.

### S3 Write Idempotency

S3 PUT operations are themselves idempotent — writing the same content to the same key twice produces the same result. The idempotency store guard is therefore primarily about avoiding the overhead of redundant processing, not about preventing data corruption.

---

## 8. Monitoring

### 8.1 Metrics

All metrics are tagged with `viewId`, `tenantId`, and `locale` where applicable.

| Metric name | Type | Description |
|------------|------|-------------|
| `materialisation.event.received` | Counter | Events received (webhook or queue) |
| `materialisation.event.skipped_duplicate` | Counter | Events skipped due to idempotency |
| `materialisation.variant.written` | Counter | Resolved schema files successfully written |
| `materialisation.latency_ms` | Histogram | End-to-end time from event receipt to S3 write |
| `materialisation.s3_write_failure` | Counter | S3 write failures (triggers retry) |
| `materialisation.schema_not_found` | Counter | Raw schema files missing in S3 |
| `materialisation.bindings_parse_failure` | Counter | Malformed config-bindings.json files |
| `config.gap.count` | Counter | Config blob gaps detected (fallback used) |
| `materialisation.queue_depth` | Gauge | Current SQS queue depth (queue mode only) |
| `materialisation.dlq_depth` | Gauge | Dead-letter queue depth (alert if > 0) |
| `cdn.purge.success` | Counter | Successful CDN cache purges |
| `cdn.purge.failure` | Counter | Failed CDN cache purges (queued for retry) |

### 8.2 Alerting Thresholds

| Alert | Condition | Severity |
|-------|-----------|----------|
| Config gap detected | `config.gap.count` > 0 in any 5-minute window | Warning |
| High materialisation latency | `materialisation.latency_ms` p99 > 10 seconds | Warning |
| DLQ has messages | `materialisation.dlq_depth` > 0 | Critical |
| S3 write failures | `materialisation.s3_write_failure` > 3 in 5 minutes | Critical |
| Queue depth growing | `materialisation.queue_depth` > 100 for > 2 minutes | Warning |

### 8.3 Distributed Tracing

Every materialisation operation is traced using the `correlationId` from the event. Spans are created for:
- Event receipt
- S3 binding file scan
- Per-variant materialisation (as child spans)
- Per-binding config resolution (as grandchild spans)
- S3 write
- CDN purge

Traces are searchable by `correlationId`, `configKey`, `viewId`, `tenantId`, and `locale`.

### 8.4 Key Log Events

```
[INFO]  materialisation.start          { eventId, configKey, affectedViewIds }
[INFO]  materialisation.variant.start  { viewId, tenantId, locale, correlationId }
[INFO]  materialisation.variant.done   { viewId, tenantId, locale, latencyMs }
[WARN]  config.gap.detected            { configKey, bindingPath, viewId, tenantId, locale }
[ERROR] materialisation.s3_write_fail  { s3Key, error }
[ERROR] materialisation.schema_missing { viewId }
[INFO]  materialisation.complete       { eventId, totalVariants, totalLatencyMs }
```
