import { z } from 'zod';

// Health check response
export const HealthResponseSchema = z.object({
	status: z.literal('ok'),
	timestamp: z.string().datetime(),
});

export type HealthResponse = z.infer<typeof HealthResponseSchema>;

// Status response
export const StatusResponseSchema = z.object({
	status: z.string(),
	message: z.string().optional(),
	timestamp: z.string().datetime(),
});

export type StatusResponse = z.infer<typeof StatusResponseSchema>;

// Error response
export const ErrorResponseSchema = z.object({
	error: z.string(),
	message: z.string(),
	statusCode: z.number(),
});

export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;
