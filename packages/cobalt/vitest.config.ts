import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		environment: 'node',
		globals: true,
		coverage: {
			provider: 'v8',
			reporter: ['text', 'json', 'html'],
			exclude: [
				'node_modules/',
				'tests/',
				'dist/',
				'dashboard-ui/',
				'src/dashboard/ui/',
				'src/mcp/',
				'src/cli/commands/',
				'src/cli/utils/',
				'src/types/',
			],
			thresholds: {
				lines: 75,
				functions: 80,
				branches: 70,
			},
		},
	},
});
