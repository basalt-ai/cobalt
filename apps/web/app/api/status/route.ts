import { StatusController } from '@/controllers/StatusController';
import { AppError } from '@/lib/errors';
import { logger } from '@/lib/logger';
import type { ErrorResponse } from '@cobalt/types';
import { NextResponse } from 'next/server';

export async function GET() {
	try {
		const status = await StatusController.getStatus();
		return NextResponse.json(status);
	} catch (error) {
		logger.error('Error in GET /api/status', { error });

		if (error instanceof AppError) {
			const errorResponse: ErrorResponse = {
				error: error.code ?? 'INTERNAL_ERROR',
				message: error.message,
				statusCode: error.statusCode,
			};
			return NextResponse.json(errorResponse, { status: error.statusCode });
		}

		const errorResponse: ErrorResponse = {
			error: 'INTERNAL_ERROR',
			message: 'An unexpected error occurred',
			statusCode: 500,
		};
		return NextResponse.json(errorResponse, { status: 500 });
	}
}
