# @basalt-ai/cobalt

**Unit testing for AI Agents** — A TypeScript testing framework for evaluating AI systems.

## Installation

```bash
npm install @basalt-ai/cobalt
# or
pnpm add @basalt-ai/cobalt
# or
yarn add @basalt-ai/cobalt
```

## Quick Start

```bash
npx cobalt init
npx cobalt run
```

Write your own experiment:

```typescript
import { experiment, Evaluator, Dataset } from '@basalt-ai/cobalt'

const dataset = new Dataset({
  items: [
    { input: 'What is 2+2?', expectedOutput: '4' },
    { input: 'Capital of France?', expectedOutput: 'Paris' },
  ],
})

experiment('qa-agent', dataset, async ({ item }) => {
  const result = await myAgent(item.input)
  return { output: result }
}, {
  evaluators: [
    new Evaluator({
      name: 'Correctness',
      type: 'llm-judge',
      prompt: 'Is the output correct?\nExpected: {{expectedOutput}}\nActual: {{output}}',
    }),
  ],
})
```

## Features

- **Experiment Runner** — Run AI agents on datasets with parallel execution
- **Evaluators** — LLM judges (boolean/scale), custom functions, similarity, and 11 Autoevals types
- **Datasets** — JSON, JSONL, CSV, or load from Langfuse, LangSmith, Braintrust, Basalt
- **Cost Tracking** — Automatic token counting and cost estimation with caching
- **CI/CD** — Quality thresholds with exit codes for pipelines
- **MCP Server** — Model Context Protocol integration for AI coding assistants
- **Statistics** — avg, min, max, p50, p95, p99 for all evaluators
- **CLI** — `run`, `init`, `history`, `compare`, `serve`, `clean`, `mcp`

## Evaluators

### LLM Judge

```typescript
new Evaluator({
  name: 'relevance',
  type: 'llm-judge',
  prompt: 'Is the output relevant?\nInput: {{input}}\nOutput: {{output}}',
  scoring: 'boolean', // or 'scale' for 0-1
})
```

### Custom Function

```typescript
new Evaluator({
  name: 'length-check',
  type: 'function',
  fn: ({ output }) => ({
    score: String(output).split(' ').length <= 100 ? 1 : 0,
    reason: `${String(output).split(' ').length} words`,
  }),
})
```

### Similarity

```typescript
new Evaluator({
  name: 'semantic-match',
  type: 'similarity',
  field: 'expectedOutput',
  distance: 'cosine',
})
```

### Autoevals

```typescript
new Evaluator({
  name: 'factuality',
  type: 'autoevals',
  evaluatorType: 'Factuality',
})
```

Available: `Levenshtein`, `Factuality`, `ContextRecall`, `ContextPrecision`, `AnswerRelevancy`, `Json`, `Battle`, `Humor`, `Embedding`, `ClosedQA`, `Security`.

## Datasets

```typescript
// Inline
new Dataset({ items: [{ input: '...', expectedOutput: '...' }] })

// Files
Dataset.fromJSON('./data.json')
Dataset.fromJSONL('./data.jsonl')
Dataset.fromCSV('./data.csv')

// Remote platforms
await Dataset.fromLangfuse('dataset-name')
await Dataset.fromLangsmith('dataset-name')
await Dataset.fromBraintrust('project', 'dataset')
await Dataset.fromBasalt('dataset-id')

// Transformations (immutable, chainable)
dataset.filter(item => item.category === 'qa').sample(50).slice(0, 10)
```

## Configuration

```typescript
// cobalt.config.ts
import { defineConfig } from '@basalt-ai/cobalt'

export default defineConfig({
  testDir: './experiments',
  judge: { model: 'gpt-5-mini', provider: 'openai' },
  concurrency: 5,
  timeout: 30_000,
  reporters: ['cli'],
  cache: { enabled: true, ttl: '7d' },
})
```

## Environment Variables

```bash
OPENAI_API_KEY=sk-...          # For OpenAI LLM judges
ANTHROPIC_API_KEY=sk-ant-...   # For Anthropic LLM judges
```

## Documentation

Full documentation: [github.com/basalt-ai/cobalt](https://github.com/basalt-ai/cobalt)

- [Datasets](https://github.com/basalt-ai/cobalt/blob/main/docs/datasets.md)
- [Evaluators](https://github.com/basalt-ai/cobalt/blob/main/docs/evaluators.md)
- [Experiments](https://github.com/basalt-ai/cobalt/blob/main/docs/experiments.md)
- [Configuration](https://github.com/basalt-ai/cobalt/blob/main/docs/configuration.md)
- [MCP Server](https://github.com/basalt-ai/cobalt/blob/main/docs/mcp.md)
- [CI/CD](https://github.com/basalt-ai/cobalt/blob/main/docs/ci-mode.md)

## Requirements

- Node.js 18+
- TypeScript 5.0+ (if using TypeScript)

## License

MIT — see [LICENSE](../../LICENSE) for details.

## Links

- [GitHub](https://github.com/basalt-ai/cobalt)
- [Issues](https://github.com/basalt-ai/cobalt/issues)
- [Discord](https://discord.gg/yW2RyZKY)
- [Contributing Guide](../../CONTRIBUTING.md)
