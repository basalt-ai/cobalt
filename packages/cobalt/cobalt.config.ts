import { defineConfig } from 'cobalt';

export default defineConfig({
	// Directory containing experiment files
	testDir: './experiments',

	// Pattern to match experiment files
	testMatch: ['**/*.cobalt.ts', '**/*.experiment.ts'],

	// LLM judge configuration
	judge: {
		model: 'gpt-4o-mini',
		provider: 'openai',
		// API key will be read from OPENAI_API_KEY environment variable
	},

	// Output directory for results
	outputDir: '.cobalt',

	// Default concurrency for running experiments
	concurrency: 5,

	// Default timeout per item (ms)
	timeout: 30_000,

	// Reporters
	reporters: ['cli', 'json'],

	// Dashboard configuration
	dashboard: {
		port: 4000,
		open: true,
	},

	// Cache configuration (reduces LLM API calls)
	cache: {
		enabled: true,
		ttl: '7d',
	},
});
