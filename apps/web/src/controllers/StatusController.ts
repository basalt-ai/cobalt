import { GetStatusQuery } from '@/queries/GetStatusQuery';
import type { StatusResponse } from '@cobalt/types';

export class StatusController {
	static async getStatus(): Promise<StatusResponse> {
		const query = new GetStatusQuery();
		return await query.execute();
	}
}
