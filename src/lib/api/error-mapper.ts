// Backend error envelopes — two shapes seen in the wild as of 2026-05-07
// (verified against the deployed Spring service):
//
// 1. Module-specific @RestControllerAdvice (e.g. QuotationExceptionHandler,
//    PolicyAdminGlobalExceptionHandler) returns:
//       { "error": "NOT_FOUND" | "BAD_REQUEST", "message": "..." }
//    The `error` field is a status-class string, not Spring's "Not Found"
//    reason phrase.
//
// 2. Anything not caught by an @ExceptionHandler falls back to Spring's
//    default DefaultErrorAttributes envelope:
//       { timestamp, status, error, message, path }
//
// Both share the `error` and `message` fields, so a permissive parser that
// reads `message` (with `error` as fallback) handles both cleanly. We retain
// the optional Spring fields for the day backend adopts a richer
// { code, message, fieldErrors[] } envelope (per V1 interim assumption #4
// upgrade trigger — see context/ARCH_TRANSITION.md → "Error response shape").

export interface SpringErrorEnvelope {
  timestamp?: string;
  status?: number;
  error?: string;
  message?: string;
  path?: string;
  // Reserved for the future field-level envelope upgrade.
  code?: string;
  fieldErrors?: Array<{ field: string; code: string; message: string }>;
}

export class ApiError extends Error {
  readonly status: number;
  readonly spring?: SpringErrorEnvelope;
  readonly path?: string;

  constructor(status: number, message: string, spring?: SpringErrorEnvelope) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.spring = spring;
    this.path = spring?.path;
  }
}

export async function parseSpringError(res: Response): Promise<ApiError> {
  let envelope: SpringErrorEnvelope | undefined;
  let message = res.statusText || `HTTP ${res.status}`;
  try {
    const text = await res.text();
    if (text) {
      const parsed = JSON.parse(text) as unknown;
      // Guard: only treat the body as an envelope if it's a non-null object.
      // Misconfigured proxies / CDN error pages occasionally return a JSON
      // literal (`null`, a string, a number) — reading `.message` off those
      // would throw and silently swallow the more useful statusText fallback.
      if (parsed !== null && typeof parsed === "object") {
        envelope = parsed as SpringErrorEnvelope;
        // Prefer `message` (both shapes carry it), fall back to `error` for
        // the module-specific shape that may have only `error: "BAD_REQUEST"`
        // with no `message`.
        if (envelope.message) {
          message = envelope.message;
        } else if (envelope.error) {
          message = envelope.error;
        }
      }
    }
  } catch {
    // body wasn't JSON; keep statusText fallback.
  }
  return new ApiError(res.status, message, envelope);
}
