import { DatabaseError } from '@/lib/errors';
import { logger } from '@/lib/logger';
import { prisma } from '@cobalt/db';
import type { SystemStatus } from '@cobalt/types';

export class StatusRepository {
	async getLatestStatus(): Promise<SystemStatus | null> {
		try {
			const status = await prisma.systemStatus.findFirst({
				orderBy: { createdAt: 'desc' },
			});

			return status;
		} catch (error) {
			logger.error('Failed to fetch system status', { error });
			throw new DatabaseError('Failed to fetch system status');
		}
	}

	async createStatus(status: string, message?: string): Promise<SystemStatus> {
		try {
			return await prisma.systemStatus.create({
				data: { status, message },
			});
		} catch (error) {
			logger.error('Failed to create system status', { error });
			throw new DatabaseError('Failed to create system status');
		}
	}
}
