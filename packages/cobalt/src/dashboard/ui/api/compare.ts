import { fetchApi } from './client';
import type { CompareResponse } from './types';

export async function compareRuns(runIds: string[]): Promise<CompareResponse> {
	const params = new URLSearchParams();
	params.set('a', runIds[0]);
	params.set('b', runIds[1]);
	if (runIds[2]) params.set('c', runIds[2]);
	return fetchApi<CompareResponse>(`/api/compare?${params}`);
}
