import { fetchApi } from './client';
import type { RunDetailResponse, RunsResponse } from './types';

export interface RunsFilter {
	experiment?: string;
	tags?: string;
	since?: string;
	until?: string;
	limit?: number;
}

export async function getRuns(filter?: RunsFilter): Promise<RunsResponse> {
	const params = new URLSearchParams();
	if (filter?.experiment) params.set('experiment', filter.experiment);
	if (filter?.tags) params.set('tags', filter.tags);
	if (filter?.since) params.set('since', filter.since);
	if (filter?.until) params.set('until', filter.until);
	if (filter?.limit) params.set('limit', String(filter.limit));

	const query = params.toString();
	return fetchApi<RunsResponse>(`/api/runs${query ? `?${query}` : ''}`);
}

export async function getRunDetail(id: string): Promise<RunDetailResponse> {
	return fetchApi<RunDetailResponse>(`/api/runs/${encodeURIComponent(id)}`);
}
