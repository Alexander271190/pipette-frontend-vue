import { apiRequest } from './client';
import type { Pipette, Status } from '@/types';

export interface Counters {
  ok: number;
  warn: number;
  danger: number;
  total: number;
  sent?: number;
  wip?: number;
  fail?: number;
  unknownDate?: number;
  inactive?: number;
}

export interface PagedResponse {
  items: Pipette[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  counters: Counters;
}

export interface StatsResponse {
  counters: Counters;
  reminders: {
    danger: Pipette[];
    warn: Pipette[];
  };
}

export interface PagedParams {
  page?: number;
  limit?: number;
  sort?: string;
  dir?: 'asc' | 'desc';
  search?: string;
  filters?: Record<string, unknown>;
}

export function getPaged(params: PagedParams): Promise<PagedResponse> {
  const q = new URLSearchParams();
  if (params.page) q.set('page', String(params.page));
  if (params.limit) q.set('limit', String(params.limit));
  if (params.sort) q.set('sort', params.sort);
  if (params.dir) q.set('dir', params.dir);
  if (params.search) q.set('search', params.search);
  if (params.filters && Object.keys(params.filters).length > 0) {
    q.set('filters', JSON.stringify(params.filters));
  }
  return apiRequest<PagedResponse>(`/pipettes/paged?${q.toString()}`);
}

export function getStats(): Promise<StatsResponse> {
  return apiRequest<StatsResponse>('/pipettes/stats');
}

export function getIdsForExport(params: Omit<PagedParams, 'page' | 'limit'>): Promise<{ ids: string[] }> {
  const q = new URLSearchParams();
  if (params.sort) q.set('sort', params.sort);
  if (params.dir) q.set('dir', params.dir);
  if (params.search) q.set('search', params.search);
  if (params.filters && Object.keys(params.filters).length > 0) {
    q.set('filters', JSON.stringify(params.filters));
  }
  return apiRequest<{ ids: string[] }>(`/pipettes/ids?${q.toString()}`);
}

export function getNextId(type: string): Promise<{ nextId: string }> {
  return apiRequest<{ nextId: string }>(`/pipettes/next-id?type=${encodeURIComponent(type)}`);
}

export function getById(id: string): Promise<Pipette> {
  return apiRequest<Pipette>(`/pipettes/${encodeURIComponent(id)}`);
}

export type { Status };
