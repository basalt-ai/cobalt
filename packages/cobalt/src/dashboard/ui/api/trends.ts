import { fetchApi } from './client';
import type { TrendsResponse } from './types';

export async function getTrends(experiment: string, evaluator?: string): Promise<TrendsResponse> {
	const params = new URLSearchParams({ experiment });
	if (evaluator) params.set('evaluator', evaluator);
	return fetchApi<TrendsResponse>(`/api/trends?${params}`);
}
