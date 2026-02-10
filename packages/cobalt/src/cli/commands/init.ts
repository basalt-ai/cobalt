import { existsSync } from 'node:fs';
import { appendFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { defineCommand } from 'citty';
import pc from 'picocolors';

export default defineCommand({
	meta: {
		name: 'init',
		description: 'Initialize a new cobalt project',
	},
	async run() {
		const cwd = process.cwd();

		console.log(pc.bold('\n🔷 Cobalt Initialization\n'));

		try {
			// 1. Create cobalt.config.ts
			const configPath = resolve(cwd, 'cobalt.config.ts');
			if (existsSync(configPath)) {
				console.log(pc.yellow('⚠ cobalt.config.ts already exists, skipping...'));
			} else {
				await writeFile(configPath, CONFIG_TEMPLATE);
				console.log(pc.green('✓ Created cobalt.config.ts'));
			}

			// 2. Create experiments directory
			const experimentsDir = resolve(cwd, 'experiments');
			if (!existsSync(experimentsDir)) {
				await mkdir(experimentsDir, { recursive: true });
				console.log(pc.green('✓ Created experiments/ directory'));
			} else {
				console.log(pc.yellow('⚠ experiments/ directory already exists, skipping...'));
			}

			// 3. Create example experiment
			const examplePath = resolve(experimentsDir, 'example.cobalt.ts');
			if (!existsSync(examplePath)) {
				await writeFile(examplePath, EXAMPLE_EXPERIMENT_TEMPLATE);
				console.log(pc.green('✓ Created experiments/example.cobalt.ts'));
			} else {
				console.log(pc.yellow('⚠ experiments/example.cobalt.ts already exists, skipping...'));
			}

			// 4. Update .gitignore
			const gitignorePath = resolve(cwd, '.gitignore');
			if (existsSync(gitignorePath)) {
				const content = await readFile(gitignorePath, 'utf-8');
				if (!content.includes('.cobalt/')) {
					await appendFile(gitignorePath, '\n# Cobalt\n.cobalt/\n');
					console.log(pc.green('✓ Updated .gitignore'));
				} else {
					console.log(pc.yellow('⚠ .gitignore already includes .cobalt/, skipping...'));
				}
			} else {
				await writeFile(gitignorePath, '# Cobalt\n.cobalt/\n');
				console.log(pc.green('✓ Created .gitignore'));
			}

			// Success message
			console.log(pc.bold(pc.green('\n✅ Cobalt initialized successfully!\n')));
			console.log(pc.dim('Next steps:'));
			console.log(pc.dim('  1. Set your API key: export OPENAI_API_KEY=<your-key>'));
			console.log(pc.dim('  2. Run the example: npx cobalt run'));
			console.log(pc.dim('  3. Edit experiments/example.cobalt.ts to test your own agent\n'));
		} catch (error) {
			console.error(pc.red('\n❌ Initialization failed:'), error);
			process.exit(1);
		}
	},
});

// Configuration template
const CONFIG_TEMPLATE = `import { defineConfig } from 'cobalt'

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
    open: true
  },

  // Cache configuration (reduces LLM API calls)
  cache: {
    enabled: true,
    ttl: '7d'
  }
})
`;

// Example experiment template
const EXAMPLE_EXPERIMENT_TEMPLATE = `import { experiment, Evaluator, Dataset } from 'cobalt'

// Define evaluators
const evaluators = [
  new Evaluator({
    name: 'relevance',
    type: 'llm-judge',
    prompt: \`You are evaluating an AI agent's response.

Input: {{input}}
Output: {{output}}
Expected: {{expectedOutput}}

Rate how relevant the output is to the input from 0.0 to 1.0.
Respond with JSON: { "score": <number>, "reason": "<string>" }\`
  }),
  new Evaluator({
    name: 'contains-answer',
    type: 'function',
    fn: ({ item, output }) => {
      const hasAnswer = String(output).toLowerCase().includes(String(item.expectedOutput).toLowerCase())
      return {
        score: hasAnswer ? 1 : 0,
        reason: hasAnswer ? 'Output contains expected answer' : 'Expected answer not found in output'
      }
    }
  })
]

// Define dataset
const dataset = new Dataset({
  items: [
    { input: 'What is the capital of France?', expectedOutput: 'Paris' },
    { input: 'What is 2 + 2?', expectedOutput: '4' },
    { input: 'Who wrote Romeo and Juliet?', expectedOutput: 'Shakespeare' }
  ]
})

// Run experiment
experiment('example-agent', dataset, async ({ item }) => {
  // This is where you call your AI agent
  // For this example, we'll just echo the expected output
  const output = \`The answer is: \${item.expectedOutput}\`

  return {
    output,
    metadata: {
      model: 'example-agent',
      tokens: 50
    }
  }
}, {
  evaluators,
  concurrency: 3,
  timeout: 10_000,
  tags: ['example', 'v1']
})
`;
