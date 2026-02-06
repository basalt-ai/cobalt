import { StatusRepository } from '@/repositories/StatusRepository';
import { StatusService } from '@/services/StatusService';
import type { StatusResponse } from '@cobalt/types';

export class GetStatusQuery {
	async execute(): Promise<StatusResponse> {
		const repository = new StatusRepository();
		const service = new StatusService(repository);

		const status = await service.getCurrentStatus();

		return {
			status: status.status,
			message: status.message ?? undefined,
			timestamp: new Date().toISOString(),
		};
	}
}
