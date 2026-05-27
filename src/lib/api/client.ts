// Thin fetch wrapper used by typed API client modules.
// Bearer-token slot is a function so future auth integration only needs to
// register a token getter (e.g. from Keycloak) without touching call sites.

import { ApiError, parseSpringError } from './error-mapper';

export interface ApiClientOptions {
  baseUrl?: string;
  bearerToken?: () => string | null | undefined;
}

let options: ApiClientOptions = {};

export function configureApiClient(next: ApiClientOptions): void {
  options = { ...options, ...next };
}

// Loosely typed so endpoint-specific param interfaces (e.g. SearchQuotesParams)
// can be passed directly without declaring an index signature. buildUrl
// String()-coerces every value and skips undefined/null. Empty string is
// preserved — some endpoints distinguish `q=` from `q` not present.
export type QueryParams = Record<string, unknown>;

function buildUrl(path: string, query?: QueryParams): string {
  const base = options.baseUrl?.replace(/\/$/, '') ?? '';
  const url = path.startsWith('/') ? `${base}${path}` : `${base}/${path}`;
  if (!query) return url;
  const sp = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null) continue;
    // Arrays repeat the key per value (`?state=A&state=B`) to match the
    // serialization convention used by useSmartQuery for `@RequestParam
    // List<T>` endpoints. Avoids the `String(["A","B"]) === "A,B"` ambiguity.
    if (Array.isArray(value)) {
      for (const v of value) {
        if (v !== undefined && v !== null) sp.append(key, String(v));
      }
      continue;
    }
    sp.append(key, String(value));
  }
  const qs = sp.toString();
  if (!qs) return url;
  return url.includes('?') ? `${url}&${qs}` : `${url}?${qs}`;
}

// Reject tokens with CR/LF/CTL chars — defense in depth against
// header-injection if a token-getter ever returns user-controlled input.
const TOKEN_PATTERN = /^[A-Za-z0-9._\-+/=]+$/;

interface RequestInitInternal {
  query?: QueryParams;
  body?: unknown;
}

async function request<T>(
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  path: string,
  init: RequestInitInternal = {},
): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (init.body !== undefined) headers['Content-Type'] = 'application/json';
  const token = options.bearerToken?.();
  if (token) {
    if (!TOKEN_PATTERN.test(token)) {
      throw new ApiError(0, 'Refusing to send malformed bearer token');
    }
    headers.Authorization = `Bearer ${token}`;
  }

  const url = buildUrl(path, init.query);
  const res = await fetch(url, {
    method,
    headers,
    body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
  });

  if (!res.ok) throw await parseSpringError(res);
  if (res.status === 204) return undefined as T;
  const text = await res.text();
  if (!text) return undefined as T;
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new ApiError(res.status, `Invalid JSON response from ${path}`);
  }
}

export const api = {
  get: <T>(path: string, query?: QueryParams) =>
    request<T>('GET', path, { query }),
  post: <T>(path: string, body?: unknown, query?: QueryParams) =>
    request<T>('POST', path, { body, query }),
  put: <T>(path: string, body?: unknown, query?: QueryParams) =>
    request<T>('PUT', path, { body, query }),
  patch: <T>(path: string, body?: unknown, query?: QueryParams) =>
    request<T>('PATCH', path, { body, query }),
  // `delete` is a reserved keyword as a bare identifier but is fine as a
  // property name. Use the standard REST verb here for grep-ability.
  delete: <T>(path: string, query?: QueryParams) =>
    request<T>('DELETE', path, { query }),
};

export { ApiError };
