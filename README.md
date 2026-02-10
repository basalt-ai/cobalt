# Cobalt

<div align="center">

![Build Status](https://github.com/basalt-ai/cobalt/actions/workflows/test.yml/badge.svg)
[![npm version](https://img.shields.io/npm/v/cobalt.svg)](https://www.npmjs.com/package/cobalt)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue.svg)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18%2B-green.svg)](https://nodejs.org/)

**Jest for AI Agents** — A TypeScript testing framework for evaluating AI systems.

</div>

---

> **⚠️ Alpha Version Notice**
>
> Cobalt is currently in **alpha** and under active development. The API may change as we refine features and gather feedback. We welcome early adopters to try it out and help shape its future!
>
> 💬 **Want to contribute or provide feedback?**
> - Join our [Discord community](https://discord.gg/cobalt-ai) _(coming soon)_
> - Report issues or suggest features on [GitHub Issues](https://github.com/basalt-ai/cobalt/issues)
> - Star the repo to follow development progress

---

## Overview

Cobalt is a testing and evaluation framework designed specifically for AI agents and LLM-powered applications. It provides:

- 🧪 **Experiment Runner** - Run your agent on datasets with parallel execution
- 📊 **Multiple Evaluators** - LLM judges, custom functions, exact matching, and 11 Autoevals types
- 🔌 **Plugin System** - Extend with custom evaluators and integrations
- 💰 **Cost Tracking** - Automatic token counting and cost estimation with caching
- 📁 **Dataset Support** - Load from JSON, JSONL, CSV, or define inline
- 🔄 **Result History** - SQLite-based history with comparison tools
- 🎯 **CLI Tools** - Full command-line interface for running experiments
- ⚙️ **CI/CD Ready** - Quality thresholds with exit codes for pipelines
- 🔌 **MCP Integration** - Model Context Protocol server for Claude Code with 4 tools + 3 prompts
- 📈 **Dashboard API** - RESTful API for results (UI in development)
- ✅ **Production Ready** - 231 tests with 80-100% coverage on core modules

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

### CI/CD Integration

Run Cobalt in your CI/CD pipeline with quality thresholds:

```typescript
export default defineConfig({
  ciMode: true,  // Exit with code 1 if thresholds fail
  thresholds: {
    'relevance': {
      avg: 0.7,      // Average score must be >= 0.7
      p95: 0.5,      // 95th percentile must be >= 0.5
      min: 0.3       // Minimum score must be >= 0.3
    },
    'accuracy': {
      passRate: 0.9  // At least 90% must pass
    }
  }
})
```

Use in GitHub Actions, GitLab CI, or any CI/CD platform:

```yaml
# .github/workflows/test-agent.yml
- name: Run AI Tests
  run: npx cobalt run experiments/
  env:
    OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
```

See [CI Mode Documentation](docs/ci-mode.md) for details.

### Plugin System

Extend Cobalt with custom evaluators:

```typescript
// my-plugin.ts
import { EvaluatorRegistry } from 'cobalt'

export default function myPlugin(registry: EvaluatorRegistry) {
  registry.register('custom-metric', async (config, context) => {
    // Your evaluation logic
    return {
      score: 0.85,
      reason: 'Custom evaluation passed'
    }
  })
}
```

Load plugins in your config:

```typescript
export default defineConfig({
  plugins: ['./my-plugin.ts']
})
```

Built-in integrations:
- **Autoevals** - 11 evaluator types (Levenshtein, BLEU, Answer Relevancy, etc.)
- Custom plugins for RAGAS, LangSmith, and more

See [Plugin Documentation](docs/plugins.md) for a complete guide.

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

Current test coverage: **231 tests** across 12 test suites covering all core functionality (80-100% coverage on tested modules).

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

Cobalt provides a complete Model Context Protocol server for integration with Claude Code and other MCP clients:

```bash
# Start MCP server
npx cobalt mcp
```

### Available Tools

- **`cobalt_run`** - Run experiments and return full results
- **`cobalt_generate`** - Auto-generate experiments from agent code
- **`cobalt_results`** - View detailed experiment results
- **`cobalt_compare`** - Compare two experiment runs

### Available Resources

- **`config`** - View current Cobalt configuration
- **`experiments`** - List all available experiments
- **`latest-results`** - Get the most recent experiment results

### Available Prompts

- **`improve-agent`** - Get suggestions to improve your agent based on results
- **`generate-tests`** - Generate new test cases from existing experiments
- **`regression-check`** - Compare runs to detect regressions

### Configuration

Configure in your `~/.config/claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "cobalt": {
      "command": "npx",
      "args": ["cobalt", "mcp"],
      "cwd": "/path/to/your/project"
    }
  }
}
```

## Roadmap

### ✅ Completed Features (v0.1.0-alpha)

**Core Functionality (P0-P1)**
- [x] Core experiment runner with parallel execution
- [x] LLM judge evaluator (OpenAI & Anthropic)
- [x] Function and exact-match evaluators
- [x] Dataset loading (JSON, JSONL, CSV)
- [x] CLI commands (run, init, history, compare, clean, serve)
- [x] Cost tracking and response caching
- [x] SQLite history storage

**Advanced Features (P2-P3)**
- [x] CI mode with quality thresholds
- [x] Exit code handling for CI/CD pipelines
- [x] Plugin system for custom evaluators
- [x] Autoevals integration (11 evaluator types)
- [x] MCP server with 4 tools, 3 resources, 3 prompts
- [x] Auto-generate experiments from agent code
- [x] Statistical aggregations (avg, min, max, p50, p95)

**Infrastructure**
- [x] Dashboard backend API (Hono)
- [x] Comprehensive test coverage (231 tests)
- [x] Example projects and templates
- [x] Full documentation

### 🚧 In Progress

- [ ] Dashboard frontend UI (backend API complete)
- [ ] Remote dataset loaders (Dataset.fromRemote)
- [ ] Similarity evaluator with embeddings
- [ ] Multiple runs with statistical aggregation
- [ ] RAGAS integration plugin

### 🔮 Future Plans

- [ ] GitHub Actions reporter
- [ ] VS Code extension
- [ ] Real-time experiment monitoring
- [ ] Export results to external platforms
- [ ] Advanced visualization components
- [ ] Multi-model evaluator comparison

## Documentation

See the \`.memory/\` folder for detailed project documentation:
- [Technical decisions](.memory/decisions.md)
- [Project structure](.memory/analysis.md)
- [Development progress](.memory/progress.md)
- [API documentation](.memory/documentation.md)

## Contributing

We welcome contributions from the community! Whether you're fixing bugs, adding features, improving documentation, or sharing feedback, your help is appreciated.

### Quick Start

- 🐛 **Report bugs**: [Open an issue](https://github.com/basalt-ai/cobalt/issues)
- ✨ **Suggest features**: Share your ideas in [GitHub Issues](https://github.com/basalt-ai/cobalt/issues)
- 💻 **Submit code**: Follow our [Contributing Guide](CONTRIBUTING.md)
- 🔌 **Create plugins**: Extend Cobalt with custom evaluators
- 📝 **Improve docs**: Help make our documentation better

### For Contributors

Please read our **[Contributing Guide](CONTRIBUTING.md)** for:
- Development setup instructions
- Code standards and guidelines
- Testing requirements
- Pull request process
- Community guidelines

For detailed development workflows, see [CLAUDE.md](CLAUDE.md).

### Community

- 💬 Discord: [Join our community](https://discord.gg/cobalt-ai) _(coming soon)_
- 🐛 Issues: [GitHub Issues](https://github.com/basalt-ai/cobalt/issues)
- 📖 Docs: [Documentation](.memory/)

## License

MIT License - see [LICENSE](LICENSE) for details.
