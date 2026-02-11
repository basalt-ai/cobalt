import { fetchApi } from './client';
import type { HealthResponse } from './types';

export async function getHealth(): Promise<HealthResponse> {
	return fetchApi<HealthResponse>('/api/health');
}
