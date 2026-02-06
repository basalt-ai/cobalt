// Domain types for business logic

export interface SystemStatus {
	id: string;
	status: string;
	message?: string | null;
	createdAt: Date;
	updatedAt: Date;
}
