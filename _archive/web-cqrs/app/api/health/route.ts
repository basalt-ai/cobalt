import type { HealthResponse } from '@cobalt/types';
import { NextResponse } from 'next/server';

export async function GET() {
	const response: HealthResponse = {
		status: 'ok',
		timestamp: new Date().toISOString(),
	};

	return NextResponse.json(response);
}
