# Cobalt

**Cypress for AI agents** — A TypeScript testing framework for evaluating AI systems.

## Overview

Cobalt is a testing and evaluation framework designed specifically for AI agents and LLM-powered applications. It provides:

- 🧪 **Experiment Runner** - Run your agent on datasets and track results
- 📊 **Multiple Evaluators** - LLM judges, custom functions, exact matching, and more
- 💰 **Cost Tracking** - Automatic token counting and cost estimation
- 📁 **Dataset Support** - Load from JSON, JSONL, CSV, or define inline
- 🔄 **Result History** - SQLite-based history with comparison tools
- 🎯 **CLI Tools** - Full command-line interface for running experiments
- 📈 **Dashboard** - Local web UI for visualizing results (coming soon)
- 🔌 **MCP Integration** - Model Context Protocol server for Claude Code

## Installation

```bash
npm install cobalt
# or
pnpm add cobalt
```

## Quick Start

### 1. Initialize a new project

```bash
npx cobalt init
```

This creates:
- `experiments/` - Folder for your experiment files
- `cobalt.config.ts` - Configuration file
- `.cobalt/` - Local storage for results and cache

### 2. Create your first experiment

Create `experiments/my-agent.cobalt.ts`:

```typescript
import { experiment, Evaluator, Dataset } from 'cobalt'

// Define evaluators
const evaluators = [
  new Evaluator({
    name: 'relevance',
    type: 'llm-judge',
    prompt: 'Rate from 0 to 1 how relevant the output is to the input query.',
    model: 'gpt-4o-mini',
    provider: 'openai'
  }),
  new Evaluator({
    name: 'exact-match',
    type: 'exact-match',
    field: 'expectedOutput'
  })
]

// Load dataset
const dataset = Dataset.fromJSON('./datasets/qa-pairs.json')

// Run experiment
export default experiment('qa-agent', dataset, async ({ item }) => {
  // Call your agent here
  const response = await myAgent.run(item.input)

  return {
    output: response.text,
    metadata: {
      model: 'gpt-4o',
      tokens: response.usage.totalTokens
    }
  }
}, {
  evaluators,
  concurrency: 5,
  timeout: 30000,
  tags: ['v1', 'gpt-4o']
})
```

### 3. Run the experiment

```bash
npx cobalt run experiments/my-agent.cobalt.ts
```

## Core Concepts

### Experiments

An experiment runs your agent on a dataset and evaluates the outputs. Each run:
1. Loads items from a dataset
2. Executes your agent function for each item
3. Evaluates outputs using configured evaluators
4. Saves results to `.cobalt/results/`
5. Stores history in `.cobalt/history.db`

### Evaluators

Evaluators score your agent's outputs. Cobalt supports multiple types:

#### LLM Judge
Uses another LLM to evaluate outputs:

```typescript
new Evaluator({
  name: 'relevance',
  type: 'llm-judge',
  prompt: 'Rate from 0 to 1 how relevant this is.',
  model: 'gpt-4o-mini',
  provider: 'openai' // or 'anthropic'
})
```

#### Custom Function
Write your own evaluation logic:

```typescript
new Evaluator({
  name: 'length-check',
  type: 'function',
  fn: ({ output }) => {
    const wordCount = output.split(' ').length
    return {
      score: wordCount <= 100 ? 1 : 0,
      reason: `Output has ${wordCount} words`
    }
  }
})
```

#### Exact Match
Compare output to expected value:

```typescript
new Evaluator({
  name: 'correct-answer',
  type: 'exact-match',
  field: 'expectedOutput',
  caseSensitive: false
})
```

### Datasets

Load datasets from multiple formats:

```typescript
// From JSON array
const dataset = Dataset.fromJSON('./data.json')

// From JSONL (line-delimited JSON)
const dataset = Dataset.fromJSONL('./data.jsonl')

// From CSV
const dataset = Dataset.fromCSV('./data.csv')

// Inline
const dataset = new Dataset({
  items: [
    { input: 'Question 1', expectedOutput: 'Answer 1' },
    { input: 'Question 2', expectedOutput: 'Answer 2' }
  ]
})
```

Transform datasets:

```typescript
dataset
  .filter(item => item.category === 'important')
  .sample(10)  // Random sample
  .slice(0, 5)  // First 5 items
  .map(item => ({ ...item, priority: 'high' }))
```

## CLI Commands

### \`cobalt run\`

Run an experiment:

```bash
# Run a specific experiment
npx cobalt run experiments/my-agent.cobalt.ts

# Filter by experiment name pattern
npx cobalt run --filter "gpt-4*"

# Filter by tags
npx cobalt run --filter "v2"
```

### \`cobalt init\`

Initialize a new Cobalt project:

```bash
npx cobalt init
```

Creates project structure and configuration files.

### \`cobalt history\`

View past experiment runs:

```bash
npx cobalt history
```

Shows run ID, name, timestamp, scores, and cost.

### \`cobalt compare\`

Compare two experiment runs:

```bash
npx cobalt compare <run-id-1> <run-id-2>
```

Shows side-by-side comparison of scores and evaluator results.

### \`cobalt serve\`

Start the dashboard server:

```bash
npx cobalt serve
```

Launches web UI at http://localhost:4000 for visualizing results.

### \`cobalt clean\`

Clean up old cache and results:

```bash
# Remove cache older than 30 days
npx cobalt clean --cache --days 30

# Remove results older than 90 days
npx cobalt clean --results --days 90
```

### \`cobalt mcp\`

Start MCP (Model Context Protocol) server for Claude Code integration:

```bash
npx cobalt mcp
```

Enables Claude to run experiments, view results, and compare runs.

## Configuration

Create \`cobalt.config.ts\` in your project root:

```typescript
import { defineConfig } from 'cobalt'

export default defineConfig({
  // Default evaluators (can be overridden per experiment)
  evaluators: [
    {
      name: 'relevance',
      type: 'llm-judge',
      prompt: 'Rate relevance from 0 to 1',
      model: 'gpt-4o-mini'
    }
  ],

  // Execution settings
  concurrency: 5,
  timeout: 30000,

  // API keys (or use environment variables)
  openaiApiKey: process.env.OPENAI_API_KEY,
  anthropicApiKey: process.env.ANTHROPIC_API_KEY,

  // Storage paths
  resultsDir: '.cobalt/results',
  cacheDir: '.cobalt/cache',
  historyDb: '.cobalt/history.db'
})
```

## Environment Variables

```bash
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
```

## Project Structure

```
your-project/
├── experiments/           # Your experiment files
│   ├── qa-agent.cobalt.ts
│   └── summarizer.cobalt.ts
├── datasets/             # Your datasets
│   ├── questions.json
│   └── articles.jsonl
├── cobalt.config.ts      # Configuration
└── .cobalt/              # Generated by Cobalt
    ├── results/          # JSON results per run
    ├── cache/            # LLM response cache
    └── history.db        # SQLite history database
```

## Features

### Cost Tracking

Cobalt automatically tracks token usage and estimates costs:

```typescript
// After running an experiment
console.log(\`Total cost: \${result.cost}\`)
console.log(\`Total tokens: \${result.totalTokens}\`)
```

Supports pricing for:
- OpenAI (GPT-4o, GPT-4o-mini, GPT-4 Turbo, etc.)
- Anthropic (Claude Opus, Sonnet, Haiku)

### Result Caching

LLM judge responses are cached to avoid redundant API calls:

```typescript
// Cache is based on:
// - Evaluator prompt
// - Model
// - Input/output content
// Results are automatically reused across runs
```

### Statistics

Results include statistical summaries:

```json
{
  "statistics": {
    "relevance": {
      "avg": 0.85,
      "min": 0.70,
      "max": 0.95,
      "p50": 0.85,
      "p95": 0.93
    }
  }
}
```

### Progress Tracking

Monitor experiment progress in real-time:

```typescript
experiment('test', dataset, runner, {
  evaluators,
  onProgress: (current, total) => {
    console.log(\`Progress: \${current}/\${total}\`)
  }
})
```

## Development

### Prerequisites

- Node.js 20+
- pnpm 8+

### Setup

```bash
# Install dependencies
pnpm install

# Run tests
pnpm test

# Build
pnpm build

# Run in development
pnpm dev
```

### Running Tests

```bash
# Run all tests
pnpm test

# Watch mode
pnpm test:watch

# Coverage
pnpm test:coverage
```

Current test coverage: **138 tests** covering core functionality.

### Code Quality

```bash
# Lint and format
pnpm check

# Lint only
pnpm lint

# Format only
pnpm format
```

## MCP Integration

Cobalt provides a Model Context Protocol server for integration with Claude Code:

```bash
# Start MCP server
npx cobalt mcp
```

Available tools:
- \`cobalt_run\` - Run experiments
- \`cobalt_results\` - View experiment results
- \`cobalt_compare\` - Compare two runs

Configure in your \`.mcp.json\`:

```json
{
  "mcpServers": {
    "cobalt": {
      "command": "npx",
      "args": ["cobalt", "mcp"]
    }
  }
}
```

## Roadmap

- [x] Core experiment runner
- [x] LLM judge, function, and exact-match evaluators
- [x] Dataset loading (JSON, JSONL, CSV)
- [x] CLI commands (run, init, history, compare)
- [x] Cost tracking and caching
- [x] SQLite history storage
- [x] MCP server integration
- [ ] Similarity evaluator (embeddings)
- [ ] Multiple runs with aggregation
- [ ] React dashboard UI
- [ ] CI mode with thresholds
- [ ] RAGAS integration
- [ ] Remote datasets
- [ ] GitHub Actions reporter

## Documentation

See the \`.memory/\` folder for detailed project documentation:
- [Technical decisions](.memory/decisions.md)
- [Project structure](.memory/analysis.md)
- [Development progress](.memory/progress.md)
- [API documentation](.memory/documentation.md)

## License

ISC

## Contributing

Contributions are welcome! Please read the contributing guidelines before submitting PRs.
