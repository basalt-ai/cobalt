import { DatabaseError } from '@/lib/errors';
import { StatusRepository } from '@/repositories/StatusRepository';
import { prisma } from '@cobalt/db';
import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('StatusRepository', () => {
	let repository: StatusRepository;

	beforeEach(() => {
		repository = new StatusRepository();
		vi.clearAllMocks();
	});

	describe('getLatestStatus', () => {
		it('should return the latest status', async () => {
			const mockStatus = {
				id: '1',
				status: 'operational',
				message: 'All systems operational',
				createdAt: new Date(),
				updatedAt: new Date(),
			};

			vi.mocked(prisma.systemStatus.findFirst).mockResolvedValue(mockStatus);

			const result = await repository.getLatestStatus();

			expect(result).toEqual(mockStatus);
			expect(prisma.systemStatus.findFirst).toHaveBeenCalledWith({
				orderBy: { createdAt: 'desc' },
			});
		});

		it('should return null if no status exists', async () => {
			vi.mocked(prisma.systemStatus.findFirst).mockResolvedValue(null);

			const result = await repository.getLatestStatus();

			expect(result).toBeNull();
		});

		it('should throw DatabaseError on failure', async () => {
			vi.mocked(prisma.systemStatus.findFirst).mockRejectedValue(new Error('DB connection failed'));

			await expect(repository.getLatestStatus()).rejects.toThrow(DatabaseError);
		});
	});

	describe('createStatus', () => {
		it('should create and return new status', async () => {
			const mockStatus = {
				id: '2',
				status: 'maintenance',
				message: 'System under maintenance',
				createdAt: new Date(),
				updatedAt: new Date(),
			};

			vi.mocked(prisma.systemStatus.create).mockResolvedValue(mockStatus);

			const result = await repository.createStatus('maintenance', 'System under maintenance');

			expect(result).toEqual(mockStatus);
			expect(prisma.systemStatus.create).toHaveBeenCalledWith({
				data: { status: 'maintenance', message: 'System under maintenance' },
			});
		});

		it('should throw DatabaseError on failure', async () => {
			vi.mocked(prisma.systemStatus.create).mockRejectedValue(new Error('DB connection failed'));

			await expect(repository.createStatus('operational')).rejects.toThrow(DatabaseError);
		});
	});
});
