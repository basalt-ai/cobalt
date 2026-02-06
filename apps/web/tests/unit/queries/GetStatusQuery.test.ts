import { GetStatusQuery } from '@/queries/GetStatusQuery';
import { prisma } from '@cobalt/db';
import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('GetStatusQuery', () => {
	let query: GetStatusQuery;

	beforeEach(() => {
		query = new GetStatusQuery();
		vi.clearAllMocks();
	});

	it('should execute query and return status response', async () => {
		const mockStatus = {
			id: '1',
			status: 'operational',
			message: 'All systems go',
			createdAt: new Date(),
			updatedAt: new Date(),
		};

		vi.mocked(prisma.systemStatus.findFirst).mockResolvedValue(mockStatus);

		const result = await query.execute();

		expect(result).toMatchObject({
			status: 'operational',
			message: 'All systems go',
		});
		expect(result.timestamp).toBeDefined();
		expect(typeof result.timestamp).toBe('string');
	});

	it('should create default status if none exists', async () => {
		const newStatus = {
			id: '2',
			status: 'operational',
			message: 'System initialized',
			createdAt: new Date(),
			updatedAt: new Date(),
		};

		vi.mocked(prisma.systemStatus.findFirst).mockResolvedValue(null);
		vi.mocked(prisma.systemStatus.create).mockResolvedValue(newStatus);

		const result = await query.execute();

		expect(result).toMatchObject({
			status: 'operational',
			message: 'System initialized',
		});
	});
});
