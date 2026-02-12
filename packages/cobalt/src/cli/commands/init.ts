import { existsSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { defineCommand } from 'citty';
import pc from 'picocolors';
import {
	ensureCobaltGitignore,
	generateSkillsFile,
	integrateWithAITools,
	printAIFilesSuggestion,
} from '../utils/skills.js';

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

			// 4. Create .cobalt/.gitignore (ignores data/, tracks SKILLS.md)
			const gitignoreCreated = await ensureCobaltGitignore(cwd);
			if (gitignoreCreated) {
				console.log(pc.green('✓ Created .cobalt/.gitignore'));
			}

			// 5. Generate .cobalt/SKILLS.md
			const skillsCreated = await generateSkillsFile(cwd);
			if (skillsCreated) {
				console.log(pc.green('✓ Generated .cobalt/SKILLS.md'));
			}

			// 6. Auto-detect AI instruction files and append reference
			const updatedFiles = await integrateWithAITools(cwd);
			for (const file of updatedFiles) {
				console.log(pc.green(`✓ Added Cobalt reference to ${file}`));
			}

			// Success message
			console.log(pc.bold(pc.green('\n✅ Cobalt initialized successfully!\n')));
			console.log(pc.dim('Next steps:'));
			console.log(pc.dim('  1. Set your API key: export OPENAI_API_KEY=<your-key>'));
			console.log(pc.dim('  2. Run the example: npx cobalt run'));
			console.log(pc.dim('  3. Edit experiments/example.cobalt.ts to test your own agent'));

			// If no AI files were found, suggest creating one
			if (updatedFiles.length === 0) {
				printAIFilesSuggestion();
			}

			console.log('');
		} catch (error) {
			console.error(pc.red('\n❌ Initialization failed:'), error);
			process.exit(1);
		}
	},
});

// Configuration template
const CONFIG_TEMPLATE = `import { defineConfig } from '@basalt-ai/cobalt'

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

  // Default concurrency for running experiments
  concurrency: 1,

  // Default timeout per item (ms)
  timeout: 30_000,

  // Reporters
  reporters: ['cli'],

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
const EXAMPLE_EXPERIMENT_TEMPLATE = `import { experiment, Evaluator, Dataset } from '@basalt-ai/cobalt'

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
