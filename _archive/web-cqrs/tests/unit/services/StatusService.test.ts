import type { StatusRepository } from '@/repositories/StatusRepository';
import { StatusService } from '@/services/StatusService';
import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('StatusService', () => {
	let service: StatusService;
	let mockRepository: StatusRepository;

	beforeEach(() => {
		mockRepository = {
			getLatestStatus: vi.fn(),
			createStatus: vi.fn(),
		} as unknown as StatusRepository;

		service = new StatusService(mockRepository);
	});

	describe('getCurrentStatus', () => {
		it('should return existing status', async () => {
			const mockStatus = {
				id: '1',
				status: 'operational',
				message: 'All good',
				createdAt: new Date(),
				updatedAt: new Date(),
			};

			vi.mocked(mockRepository.getLatestStatus).mockResolvedValue(mockStatus);

			const result = await service.getCurrentStatus();

			expect(result).toEqual(mockStatus);
			expect(mockRepository.getLatestStatus).toHaveBeenCalled();
			expect(mockRepository.createStatus).not.toHaveBeenCalled();
		});

		it('should create default status if none exists', async () => {
			const newStatus = {
				id: '2',
				status: 'operational',
				message: 'System initialized',
				createdAt: new Date(),
				updatedAt: new Date(),
			};

			vi.mocked(mockRepository.getLatestStatus).mockResolvedValue(null);
			vi.mocked(mockRepository.createStatus).mockResolvedValue(newStatus);

			const result = await service.getCurrentStatus();

			expect(result).toEqual(newStatus);
			expect(mockRepository.getLatestStatus).toHaveBeenCalled();
			expect(mockRepository.createStatus).toHaveBeenCalledWith('operational', 'System initialized');
		});
	});
});
