import { defineConfig } from '@basalt-ai/cobalt';

export default defineConfig({
	// Directory containing experiment files
	testDir: './experiments',

	// Pattern to match experiment files
	testMatch: ['**/*.cobalt.ts', '**/*.experiment.ts'],

	// LLM judge configuration
	judge: {
		model: 'gpt-5-mini',
		provider: 'openai',
		// API key will be read from OPENAI_API_KEY environment variable
	},

	// Dashboard configuration
	dashboard: {
		port: 4000,
		open: true,
	},
});
