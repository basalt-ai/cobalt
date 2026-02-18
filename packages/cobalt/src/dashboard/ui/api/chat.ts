import { fetchApi } from './client'

export interface ApiIndexResponse {
	name: string
	endpoints: string[]
	chat: { enabled: boolean }
}

export interface AnalysisResponse {
	analysis: string
}

export async function getChatConfig(): Promise<{ enabled: boolean }> {
	const info = await fetchApi<ApiIndexResponse>('/api')
	return info.chat
}

export async function getRunAnalysis(runId: string): Promise<AnalysisResponse> {
	return fetchApi<AnalysisResponse>(`/api/runs/${encodeURIComponent(runId)}/analysis`)
}

export async function getCompareAnalysis(ids: string[]): Promise<AnalysisResponse> {
	const params = new URLSearchParams()
	params.set('a', ids[0])
	params.set('b', ids[1])
	if (ids[2]) params.set('c', ids[2])
	return fetchApi<AnalysisResponse>(`/api/compare/analysis?${params}`)
}
