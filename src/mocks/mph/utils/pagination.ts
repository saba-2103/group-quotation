import { NextRequest } from 'next/server';

export interface PaginationParams {
  page: number;
  pageSize: number;
  offset: number;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export function getPaginationParams(req: NextRequest): PaginationParams {
  const url = new URL(req.url);
  const page = Math.max(1, parseInt(url.searchParams.get('page') ?? '1', 10));
  const pageSize = Math.min(100, Math.max(1, parseInt(url.searchParams.get('pageSize') ?? '20', 10)));
  return { page, pageSize, offset: (page - 1) * pageSize };
}

export function paginate<T>(items: T[], params: PaginationParams): PaginatedResult<T> {
  const total = items.length;
  const data = items.slice(params.offset, params.offset + params.pageSize);
  return {
    data,
    total,
    page: params.page,
    pageSize: params.pageSize,
    totalPages: Math.ceil(total / params.pageSize),
  };
}

export type FilterFn<T> = (item: T) => boolean;

export function applyFilters<T>(items: T[], filters: FilterFn<T>[]): T[] {
  return filters.reduce((acc, fn) => acc.filter(fn), items);
}

export function getSearchParam(req: NextRequest, key: string): string | null {
  return new URL(req.url).searchParams.get(key);
}

export function getSearchParams(req: NextRequest): URLSearchParams {
  return new URL(req.url).searchParams;
}

export function sortBy<T>(items: T[], field: keyof T, dir: 'asc' | 'desc' = 'asc'): T[] {
  return [...items].sort((a, b) => {
    const av = a[field];
    const bv = b[field];
    if (av === bv) return 0;
    const cmp = av < bv ? -1 : 1;
    return dir === 'asc' ? cmp : -cmp;
  });
}
