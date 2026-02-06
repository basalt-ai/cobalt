import type { StatusRepository } from '@/repositories/StatusRepository';
import type { SystemStatus } from '@cobalt/types';

export class StatusService {
	constructor(private repository: StatusRepository) {}

	async getCurrentStatus(): Promise<SystemStatus> {
		let status = await this.repository.getLatestStatus();

		// Business logic: if no status exists, create default
		if (!status) {
			status = await this.repository.createStatus('operational', 'System initialized');
		}

		return status;
	}
}
