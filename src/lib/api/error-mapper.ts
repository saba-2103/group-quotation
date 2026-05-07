// Spring default error envelope: { timestamp, status, error, message, path }.
// Backend will ship a richer { code, message, fieldErrors[] } envelope on
// request once a V1 form needs per-field validation feedback — see
// context/ARCH_TRANSITION.md → "Error response shape" for the trigger.

export interface SpringErrorEnvelope {
  timestamp?: string;
  status?: number;
  error?: string;
  message?: string;
  path?: string;
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
      envelope = JSON.parse(text) as SpringErrorEnvelope;
      if (envelope.message) message = envelope.message;
    }
  } catch {
    // body wasn't JSON; keep statusText fallback.
  }
  return new ApiError(res.status, message, envelope);
}
