import { fetchApi } from './client';
import type { CompareResponse } from './types';

export async function compareRuns(runIdA: string, runIdB: string): Promise<CompareResponse> {
	const params = new URLSearchParams({ a: runIdA, b: runIdB });
	return fetchApi<CompareResponse>(`/api/compare?${params}`);
}
