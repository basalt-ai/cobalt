import { vi } from 'vitest';

// Mock Prisma Client
vi.mock('@cobalt/db', () => ({
	prisma: {
		systemStatus: {
			findFirst: vi.fn(),
			create: vi.fn(),
		},
	},
}));
