// Thin fetch wrapper used by the Group PAS module clients.
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

function buildUrl(path: string, query?: QueryParams): string {
  const base = options.baseUrl?.replace(/\/$/, '') ?? '';
  const url = path.startsWith('/') ? `${base}${path}` : `${base}/${path}`;
  if (!query) return url;
  const sp = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === '') continue;
    sp.append(key, String(value));
  }
  const qs = sp.toString();
  if (!qs) return url;
  return url.includes('?') ? `${url}&${qs}` : `${url}?${qs}`;
}

// Loosely typed so endpoint-specific param interfaces (e.g. SearchQuotesParams)
// can be passed directly without declaring an index signature. buildUrl
// String()-coerces every value and skips empties.
export type QueryParams = Record<string, unknown>;

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
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(buildUrl(path, init.query), {
    method,
    headers,
    body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
  });

  if (!res.ok) throw await parseSpringError(res);
  if (res.status === 204) return undefined as T;
  const text = await res.text();
  if (!text) return undefined as T;
  return JSON.parse(text) as T;
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
  del: <T>(path: string, query?: QueryParams) =>
    request<T>('DELETE', path, { query }),
};

export { ApiError };
