# cobalt

**Jest for AI Agents** — A TypeScript testing framework for evaluating AI systems.

## Installation

```bash
npm install cobalt
# or
pnpm add cobalt
# or
yarn add cobalt
```

## Quick Start

```typescript
import { experiment, Evaluator, Dataset } from 'cobalt'

// Define evaluators
const evaluators = [
  new Evaluator({
    name: 'relevance',
    type: 'llm-judge',
    prompt: 'Rate from 0 to 1 how relevant the output is.',
    model: 'gpt-4o-mini',
    provider: 'openai'
  })
]

// Load dataset
const dataset = Dataset.fromJSON('./data.json')

// Run experiment
await experiment('my-agent', dataset, async ({ item }) => {
  const response = await myAgent.run(item.input)
  return {
    output: response.text,
    metadata: {
      model: 'gpt-4o',
      tokens: response.usage.totalTokens
    }
  }
}, { evaluators })
```

## Features

- 🧪 **Experiment Runner** - Run AI agents on datasets with parallel execution
- 📊 **Multiple Evaluators** - LLM judges, custom functions, exact matching
- 💰 **Cost Tracking** - Automatic token counting and cost estimation
- 📁 **Dataset Support** - JSON, JSONL, CSV file formats
- 🔄 **Result Caching** - LLM response caching to save API costs
- 📈 **Statistics** - Avg, min, max, p50, p95 for all evaluators
- 🎯 **CLI Tools** - Full command-line interface
- 🔌 **MCP Integration** - Model Context Protocol for Claude Code

## API Reference

### Core Functions

#### `experiment()`

Run an experiment on a dataset.

```typescript
function experiment<T extends ExperimentItem>(
  name: string,
  dataset: Dataset<T>,
  runner: ExperimentRunner<T>,
  options: ExperimentOptions
): Promise<ExperimentReport>
```

**Example:**
```typescript
const report = await experiment('qa-agent', dataset, runner, {
  evaluators: [relevanceEval, accuracyEval],
  concurrency: 5,
  timeout: 30000,
  tags: ['v1', 'production']
})

console.log(`Average score: ${report.statistics.relevance.avg}`)
console.log(`Cost: $${report.estimatedCost.toFixed(2)}`)
```

---

### Evaluators

#### `new Evaluator(config)`

Create an evaluator instance.

**LLM Judge:**
```typescript
new Evaluator({
  name: 'relevance',
  type: 'llm-judge',
  prompt: 'Rate from 0 to 1 how relevant this is.\n\nInput: {{input}}\nOutput: {{output}}',
  model: 'gpt-4o-mini',
  provider: 'openai'
})
```

**Custom Function:**
```typescript
new Evaluator({
  name: 'word-count',
  type: 'function',
  fn: ({ output }) => ({
    score: output.split(' ').length <= 100 ? 1 : 0,
    reason: `Word count: ${output.split(' ').length}`
  })
})
```

**Exact Match:**
```typescript
new Evaluator({
  name: 'correct-answer',
  type: 'exact-match',
  field: 'expectedOutput',
  caseSensitive: false
})
```

---

### Datasets

#### `Dataset.fromJSON(path)`

Load dataset from JSON file.

```typescript
const dataset = Dataset.fromJSON('./data.json')
```

**Supported formats:**
```json
// Array format
[
  { "input": "Question 1", "expectedOutput": "Answer 1" },
  { "input": "Question 2", "expectedOutput": "Answer 2" }
]

// Object format
{
  "items": [
    { "input": "Question 1", "expectedOutput": "Answer 1" }
  ]
}
```

#### `Dataset.fromJSONL(path)`

Load from line-delimited JSON.

```typescript
const dataset = Dataset.fromJSONL('./data.jsonl')
```

#### `Dataset.fromCSV(path)`

Load from CSV file.

```typescript
const dataset = Dataset.fromCSV('./data.csv')
```

**CSV format:**
```csv
input,expectedOutput
"What is 2+2?",4
"What is the capital of France?",Paris
```

#### Dataset Transformations

All methods are chainable and immutable:

```typescript
const processed = dataset
  .filter(item => item.validated === true)
  .map(item => ({ ...item, priority: 'high' }))
  .sample(100)  // Random 100 items
  .slice(0, 50)  // First 50
```

**Available methods:**
- `map(fn)` - Transform items
- `filter(predicate)` - Filter items
- `sample(n)` - Random sample
- `slice(start, end)` - Subset by index

---

### Configuration

#### `defineConfig(config)`

Define configuration file.

```typescript
// cobalt.config.ts
import { defineConfig } from 'cobalt'

export default defineConfig({
  evaluators: [{
    name: 'relevance',
    type: 'llm-judge',
    prompt: 'Rate this from 0 to 1',
    model: 'gpt-4o-mini',
    provider: 'openai'
  }],
  concurrency: 10,
  timeout: 60000,
  openaiApiKey: process.env.OPENAI_API_KEY,
  anthropicApiKey: process.env.ANTHROPIC_API_KEY
})
```

---

## CLI Commands

### `cobalt run`

Run experiment files.

```bash
# Run single file
npx cobalt run experiments/my-agent.cobalt.ts

# Filter by pattern
npx cobalt run --filter "gpt-4*"

# Filter by tag
npx cobalt run --filter "production"
```

### `cobalt init`

Initialize new project.

```bash
npx cobalt init
```

Creates:
- `experiments/` folder with examples
- `datasets/` folder
- `cobalt.config.ts` configuration
- `.cobalt/` directory for results

### `cobalt history`

View past runs.

```bash
npx cobalt history
npx cobalt history --limit 10
npx cobalt history --tag "production"
```

### `cobalt compare`

Compare two runs.

```bash
npx cobalt compare <run-id-1> <run-id-2>
```

Shows side-by-side comparison of scores, costs, and statistics.

### `cobalt serve`

Start dashboard server.

```bash
npx cobalt serve
# Opens at http://localhost:4000
```

**Note:** Currently API backend only, React UI coming soon.

### `cobalt clean`

Clean old cache and results.

```bash
# Clean cache older than 30 days
npx cobalt clean --cache --days 30

# Clean results older than 90 days
npx cobalt clean --results --days 90
```

### `cobalt mcp`

Start MCP server for Claude Code.

```bash
npx cobalt mcp
```

Add to `.mcp.json`:
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

---

## CI/CD Integration

Cobalt provides pluggable reporters for different output formats, making it easy to integrate with CI/CD pipelines.

### Reporters

Configure reporters in your `cobalt.config.ts`:

```typescript
export default defineConfig({
  reporters: ['cli', 'json', 'github-actions'] // default: ['cli', 'json']
})
```

Available reporters:
- **`cli`** - Terminal output with colors (default)
- **`json`** - Structured JSON output for machine parsing
- **`github-actions`** - GitHub Actions annotations and step summary

### GitHub Actions Integration

The `github-actions` reporter automatically enables when running in GitHub Actions (detects `GITHUB_ACTIONS=true` environment variable) and provides:

- **Annotations**: Errors and warnings appear inline in your PR
- **Step Summary**: Rich markdown summary with scores, costs, and metrics
- **Threshold Violations**: Clear CI failures with detailed explanations

Example GitHub Actions workflow:

```yaml
name: Cobalt Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm install

      - name: Run Cobalt experiments
        env:
          OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
        run: npx cobalt run
```

The reporter will automatically:
- Show progress with `::notice::` commands
- Mark threshold failures with `::error::` annotations
- Write a detailed summary to `$GITHUB_STEP_SUMMARY`

### CI Mode with Thresholds

Use thresholds to enforce quality gates in CI:

```typescript
experiment('my-test', dataset, agent, {
  evaluators: [/* ... */],
  thresholds: {
    accuracy: { avg: 0.8, p95: 0.7 },
    relevance: { passRate: 0.9, minScore: 0.6 }
  }
})
```

If thresholds are not met, the experiment will exit with code 1, failing your CI pipeline.

See [ci-mode.md](./docs/ci-mode.md) for complete documentation.

---

## TypeScript Types

### Core Types

```typescript
// Flexible experiment item
type ExperimentItem = Record<string, any>

// Result returned from runner
interface ExperimentResult {
  output: string | Record<string, any>
  metadata?: Record<string, any>
}

// Evaluation result
interface EvaluationResult {
  score: number      // 0 to 1
  reason?: string
}

// Statistics
interface ScoreStats {
  avg: number
  min: number
  max: number
  p50: number
  p95: number
}
```

### Evaluator Types

```typescript
type EvaluatorType = 'llm-judge' | 'function' | 'exact-match' | 'similarity'

interface LLMJudgeEvaluatorConfig {
  name: string
  type: 'llm-judge'
  prompt: string
  model: string
  provider: 'openai' | 'anthropic'
}

interface FunctionEvaluatorConfig {
  name: string
  type: 'function'
  fn: (context: EvaluationContext) => EvaluationResult | Promise<EvaluationResult>
}

interface ExactMatchEvaluatorConfig {
  name: string
  type: 'exact-match'
  field: string
  caseSensitive?: boolean
  trim?: boolean
}
```

---

## Environment Variables

```bash
# Required for LLM judges
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...

# Optional path overrides
COBALT_RESULTS_DIR=.cobalt/results
COBALT_CACHE_DIR=.cobalt/cache
COBALT_HISTORY_DB=.cobalt/history.db
```

---

## Supported Models

### OpenAI
- `gpt-4o`
- `gpt-4o-mini`
- `gpt-4-turbo`
- `gpt-4`
- `gpt-3.5-turbo`

### Anthropic
- `claude-opus-4-6`
- `claude-sonnet-4-5-20250929`
- `claude-haiku-4-5-20251001`
- `claude-3-5-sonnet-20241022`
- `claude-3-5-haiku-20241022`

---

## Cost Estimation

Cobalt automatically estimates costs based on token usage:

```typescript
const report = await experiment(...)

console.log(`Total tokens: ${report.totalTokens}`)
console.log(`Estimated cost: $${report.estimatedCost.toFixed(2)}`)
```

**Pricing** (as of February 2026):
- GPT-4o: $2.50/$10.00 per 1M tokens (input/output)
- GPT-4o-mini: $0.15/$0.60 per 1M tokens
- Claude Sonnet: $3.00/$15.00 per 1M tokens
- Claude Haiku: $0.80/$4.00 per 1M tokens

---

## Caching

LLM judge responses are automatically cached to save API costs:

**Cache key:** `hash(prompt + model + input + output)`

**Benefits:**
- ✅ Rerun experiments without new API calls
- ✅ Significant cost savings
- ✅ Faster execution on reruns

**Cleanup:**
```bash
npx cobalt clean --cache --days 30
```

---

## Best Practices

1. **Start small** - Test with a few items before scaling up
2. **Use appropriate evaluators** - LLM judges for subjective, functions for objective
3. **Tag your experiments** - Makes filtering and comparison easier
4. **Monitor costs** - Check `estimatedCost` after runs
5. **Leverage caching** - Rerun experiments for free
6. **Set timeouts** - Prevent hanging on slow items
7. **Use concurrency** - Parallelize for faster execution

---

## Examples

### Basic Example

```typescript
import { experiment, Evaluator, Dataset } from 'cobalt'

const evaluators = [
  new Evaluator({
    name: 'relevance',
    type: 'llm-judge',
    prompt: 'Rate from 0 to 1',
    model: 'gpt-4o-mini',
    provider: 'openai'
  })
]

const dataset = new Dataset({
  items: [
    { input: 'What is 2+2?', expectedOutput: '4' },
    { input: 'What is 3+3?', expectedOutput: '6' }
  ]
})

await experiment('math-qa', dataset, async ({ item }) => {
  return { output: await myAgent.run(item.input) }
}, { evaluators })
```

### Advanced Example with Multiple Evaluators

```typescript
const evaluators = [
  new Evaluator({
    name: 'relevance',
    type: 'llm-judge',
    prompt: 'Rate relevance from 0 to 1',
    model: 'gpt-4o-mini',
    provider: 'openai'
  }),
  new Evaluator({
    name: 'correct-answer',
    type: 'exact-match',
    field: 'expectedOutput',
    caseSensitive: false
  }),
  new Evaluator({
    name: 'length-check',
    type: 'function',
    fn: ({ output }) => ({
      score: output.length <= 200 ? 1 : 0.5,
      reason: `Length: ${output.length} chars`
    })
  })
]

const dataset = Dataset
  .fromJSON('./qa-pairs.json')
  .filter(item => item.category === 'important')
  .sample(50)

const report = await experiment('multi-eval', dataset, runner, {
  evaluators,
  concurrency: 10,
  timeout: 60000,
  tags: ['v2', 'gpt-4o']
})

console.log(`Relevance: ${report.statistics.relevance.avg}`)
console.log(`Accuracy: ${report.statistics['correct-answer'].avg}`)
console.log(`Cost: $${report.estimatedCost.toFixed(2)}`)
```

---

## Error Handling

### Evaluator Errors

Evaluators return `{score: 0, reason: "error"}` instead of throwing:

```typescript
const result = await evaluator.evaluate(context)

if (result.score === 0 && result.reason?.includes('error')) {
  console.error(`Evaluation failed: ${result.reason}`)
}
```

### Runner Errors

If a runner throws, the item is marked as failed but doesn't stop the experiment:

```typescript
{
  item: { input: "test" },
  output: null,
  error: "Connection timeout",
  scores: {}  // No evaluations run
}
```

---

## Requirements

- **Node.js**: 20.0.0 or higher
- **TypeScript**: 5.0.0 or higher (if using TypeScript)

---

## License

ISC

---

## Links

- [GitHub Repository](https://github.com/user/cobalt)
- [Documentation](../../README.md)
- [Issue Tracker](https://github.com/user/cobalt/issues)

---

## Contributing

Contributions are welcome! Please read the [contributing guidelines](../../CONTRIBUTING.md) before submitting PRs.

---

## Support

- 📧 Email: support@cobalt.dev (placeholder)
- 💬 Discord: https://discord.gg/cobalt (placeholder)
- 📖 Docs: https://docs.cobalt.dev (placeholder)
