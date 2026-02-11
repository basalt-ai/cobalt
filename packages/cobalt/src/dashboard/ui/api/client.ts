import type { ErrorResponse } from './types';

export class ApiError extends Error {
	constructor(
		public status: number,
		public body: ErrorResponse,
	) {
		super(body.error);
		this.name = 'ApiError';
	}
}

export async function fetchApi<T>(path: string, init?: RequestInit): Promise<T> {
	const response = await fetch(path, {
		...init,
		headers: {
			'Content-Type': 'application/json',
			...init?.headers,
		},
	});

	if (!response.ok) {
		const body = (await response.json().catch(() => ({
			error: 'Unknown error',
		}))) as ErrorResponse;
		throw new ApiError(response.status, body);
	}

	return response.json() as Promise<T>;
}
