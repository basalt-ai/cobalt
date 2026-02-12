# API Documentation

Complete reference for the Cobalt AI testing framework.

## Table of Contents

1. [Core API](#core-api)
2. [Evaluators](#evaluators)
3. [Datasets](#datasets)
4. [Configuration](#configuration)
5. [CLI Commands](#cli-commands)
6. [Types Reference](#types-reference)

---

## Core API

### `experiment()`

Main function to run an AI experiment.

**Signature:**
```typescript
function experiment<T extends ExperimentItem = ExperimentItem>(
  name: string,
  dataset: Dataset<T>,
  runner: ExperimentRunner<T>,
  options: ExperimentOptions
): Promise<ExperimentReport>
```

**Parameters:**

- **name** (`string`) - Unique identifier for the experiment
- **dataset** (`Dataset<T>`) - Dataset to run experiment on
- **runner** (`ExperimentRunner<T>`) - Async function that executes your agent
- **options** (`ExperimentOptions`) - Execution and evaluation options

**Returns:** `Promise<ExperimentReport>` - Results including scores, statistics, and costs

**Example:**
```typescript
import { experiment, Evaluator, Dataset } from '@basalt-ai/cobalt'

const evaluators = [
  new Evaluator({
    name: 'relevance',
    type: 'llm-judge',
    prompt: 'Rate from 0 to 1 how relevant the output is.',
    model: 'gpt-4o-mini',
    provider: 'openai'
  })
]

const dataset = Dataset.fromJSON('./data.json')

const report = await experiment('my-agent', dataset, async ({ item }) => {
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

console.log(`Average relevance: ${report.statistics.relevance.avg}`)
console.log(`Total cost: ${report.estimatedCost}`)
```

---

### `ExperimentRunner<T>`

Function type for the experiment runner.

**Signature:**
```typescript
type ExperimentRunner<T extends ExperimentItem> = (context: {
  item: T
  index: number
  dataset: Dataset<T>
}) => Promise<ExperimentResult>
```

**Context Properties:**

- **item** - Current dataset item
- **index** - Item index (0-based)
- **dataset** - Full dataset (for context)

**Returns:** `Promise<ExperimentResult>`
```typescript
interface ExperimentResult {
  output: string | Record<string, any>
  metadata?: Record<string, any>
}
```

**Example:**
```typescript
const runner: ExperimentRunner = async ({ item, index }) => {
  console.log(`Processing item ${index + 1}`)
  
  const response = await callMyAgent(item.input)
  
  return {
    output: response.text,
    metadata: {
      model: response.model,
      tokens: response.tokens,
      latency: response.latency
    }
  }
}
```

---

### `ExperimentOptions`

Configuration for experiment execution.

**Type:**
```typescript
interface ExperimentOptions {
  evaluators: Evaluator[]           // Required
  runs?: number                     // Default: 1
  concurrency?: number              // Default: 5
  timeout?: number                  // Default: 30000 (ms)
  tags?: string[]                   // Default: []
  onProgress?: ProgressCallback     // Optional
}
```

**Properties:**

- **evaluators** - Array of Evaluator instances
- **runs** - Number of times to run each item (for non-determinism)
- **concurrency** - Max parallel executions
- **timeout** - Timeout per item in milliseconds
- **tags** - Tags for filtering and organization
- **onProgress** - Callback for progress updates

**Example:**
```typescript
const options: ExperimentOptions = {
  evaluators: [relevanceEval, accuracyEval],
  concurrency: 10,
  timeout: 60000,
  tags: ['gpt-4o', 'production'],
  onProgress: (current, total) => {
    console.log(`Progress: ${current}/${total}`)
  }
}
```

---

### `ExperimentReport`

Result object returned from `experiment()`.

**Type:**
```typescript
interface ExperimentReport {
  id: string                                 // Unique run ID
  name: string                               // Experiment name
  timestamp: number                          // Unix timestamp
  results: ExperimentItemResult[]            // Per-item results
  statistics: Record<string, ScoreStats>     // Aggregated stats
  totalItems: number                         // Items processed
  successfulItems: number                    // Items without errors
  failedItems: number                        // Items with errors
  totalTokens: number                        // Total tokens used
  estimatedCost: number                      // Estimated cost (USD)
  duration: number                           // Total duration (ms)
  tags: string[]                             // Experiment tags
}
```

**Example:**
```typescript
const report = await experiment(...)

console.log(`Run ID: ${report.id}`)
console.log(`Success rate: ${report.successfulItems}/${report.totalItems}`)
console.log(`Average relevance: ${report.statistics.relevance.avg}`)
console.log(`95th percentile: ${report.statistics.relevance.p95}`)
console.log(`Estimated cost: $${report.estimatedCost.toFixed(2)}`)
```

---

## Evaluators

### `Evaluator` Class

Main class for creating evaluators.

**Constructor:**
```typescript
constructor(config: EvaluatorConfig)
```

**Methods:**

#### `evaluate()`

Evaluate a single output.

```typescript
async evaluate(
  context: EvaluationContext,
  apiKey?: string,
  overrideModel?: string
): Promise<EvaluationResult>
```

**Parameters:**
- **context** - Evaluation context (item, output, metadata)
- **apiKey** - API key for LLM judges (optional if in config)
- **overrideModel** - Override configured model (optional)

**Returns:**
```typescript
interface EvaluationResult {
  score: number      // 0 to 1
  reason?: string    // Explanation
}
```

---

### Evaluator Types

#### 1. LLM Judge

Uses another LLM to evaluate outputs.

**Config:**
```typescript
interface LLMJudgeEvaluatorConfig {
  name: string
  type: 'llm-judge'
  prompt: string                    // Evaluation prompt
  model: string                     // Model identifier
  provider: 'openai' | 'anthropic'  // Provider
}
```

**Example:**
```typescript
new Evaluator({
  name: 'relevance',
  type: 'llm-judge',
  prompt: `Rate from 0 to 1 how relevant the output is to the input.
  
Input: {{input}}
Output: {{output}}

Return JSON: {"score": <number>, "reason": "<explanation>"}`,
  model: 'gpt-4o-mini',
  provider: 'openai'
})
```

**Template Variables:**
- `{{input}}` - Input from dataset item
- `{{output}}` - Agent's output
- Any top-level field from dataset item (e.g., `{{expectedOutput}}`)

**Supported Models:**

**OpenAI:**
- `gpt-4o`
- `gpt-4o-mini`
- `gpt-4-turbo`
- `gpt-4`
- `gpt-3.5-turbo`

**Anthropic:**
- `claude-opus-4-6`
- `claude-sonnet-4-5-20250929`
- `claude-haiku-4-5-20251001`
- `claude-3-5-sonnet-20241022`
- `claude-3-5-haiku-20241022`

---

#### 2. Function Evaluator

Custom JavaScript/TypeScript evaluation function.

**Config:**
```typescript
interface FunctionEvaluatorConfig {
  name: string
  type: 'function'
  fn: (context: EvaluationContext) => EvaluationResult | Promise<EvaluationResult>
}
```

**Example:**
```typescript
new Evaluator({
  name: 'word-count',
  type: 'function',
  fn: ({ output }) => {
    const wordCount = output.split(/\s+/).length
    const ideal = wordCount >= 50 && wordCount <= 100
    
    return {
      score: ideal ? 1 : 0.5,
      reason: `Output has ${wordCount} words (ideal: 50-100)`
    }
  }
})
```

**Async Example:**
```typescript
new Evaluator({
  name: 'toxicity-check',
  type: 'function',
  fn: async ({ output }) => {
    const result = await toxicityAPI.check(output)
    return {
      score: 1 - result.toxicityScore,
      reason: `Toxicity: ${result.toxicityScore.toFixed(2)}`
    }
  }
})
```

**Requirements:**
- Must return `{score: number, reason?: string}`
- Score must be between 0 and 1 (enforced, throws if invalid)
- Can be async or sync

---

#### 3. Similarity Evaluator

Semantic similarity using embeddings.

**Config:**
```typescript
interface SimilarityEvaluatorConfig {
  name: string
  type: 'similarity'
  field: string                           // Field to compare to
  threshold?: number                      // Similarity threshold (default: 0.8)
  provider?: 'openai'                     // Embedding provider (default: 'openai')
  model?: string                          // Model (default: 'text-embedding-3-small')
  distance?: 'cosine' | 'dotProduct'      // Distance metric (default: 'cosine')
  mode?: 'threshold' | 'raw'              // Scoring mode (default: 'threshold')
}
```

**Example:**
```typescript
new Evaluator({
  name: 'semantic-match',
  type: 'similarity',
  field: 'expectedOutput',
  threshold: 0.85,
  mode: 'threshold'
})
```

**Modes:**
- `threshold`: Binary scoring (1 if similarity ≥ threshold, else 0)
- `raw`: Returns actual similarity score (0-1)

**Distance Metrics:**
- `cosine`: Cosine similarity (default, normalized to [0, 1])
- `dotProduct`: Dot product similarity

---

#### 4. Autoevals Evaluator

Braintrust Autoevals integration with 11 built-in evaluator types.

**Config:**
```typescript
interface AutoevalsEvaluatorConfig {
  name: string
  type: 'autoevals'
  autoeval: string                        // Autoevals evaluator name
  expected?: string                       // Field for expected output
  context?: Record<string, string>        // Field mappings
}
```

**Supported Autoevals Types:**
- `Factuality` - Check factual accuracy
- `ContextRecall` - Measure context recall
- `ContextPrecision` - Measure context precision
- `ContextRelevancy` - Assess context relevance
- `AnswerRelevancy` - Rate answer relevance
- `AnswerCorrectness` - Verify answer correctness
- `AnswerSimilarity` - Semantic answer similarity
- `Ragas` - Combined Ragas metrics (multiple quality checks)
- `JsonDiff` - JSON structure comparison
- `ValidJSON` - JSON validation
- `Security` - Security assessment

**Example:**
```typescript
new Evaluator({
  name: 'factuality',
  type: 'autoevals',
  autoeval: 'Factuality',
  expected: 'expectedOutput',
  context: {
    input: 'question',
    output: 'answer'
  }
})
```

---

## Datasets

### `Dataset` Class

Manages dataset loading and transformations.

**Constructor:**
```typescript
constructor(options: { items: ExperimentItem[] })
```

---

### Static Loaders

#### `Dataset.fromJSON()`

Load from JSON file (array or object with `.items` property).

**Signature:**
```typescript
static fromJSON<T extends ExperimentItem = ExperimentItem>(
  filePath: string
): Dataset<T>
```

**Example:**
```typescript
// data.json (array format)
[
  { "input": "Question 1", "expectedOutput": "Answer 1" },
  { "input": "Question 2", "expectedOutput": "Answer 2" }
]

// or object format
{
  "items": [
    { "input": "Question 1", "expectedOutput": "Answer 1" }
  ]
}

const dataset = Dataset.fromJSON('./data.json')
```

---

#### `Dataset.fromJSONL()`

Load from JSONL (line-delimited JSON) file.

**Signature:**
```typescript
static fromJSONL<T extends ExperimentItem = ExperimentItem>(
  filePath: string
): Dataset<T>
```

**Example:**
```typescript
// data.jsonl
{"input": "Question 1", "expectedOutput": "Answer 1"}
{"input": "Question 2", "expectedOutput": "Answer 2"}

const dataset = Dataset.fromJSONL('./data.jsonl')
```

---

#### `Dataset.fromCSV()`

Load from CSV file with headers.

**Signature:**
```typescript
static fromCSV<T extends ExperimentItem = ExperimentItem>(
  filePath: string
): Dataset<T>
```

**Example:**
```typescript
// data.csv
input,expectedOutput
"What is 2+2?",4
"What is the capital of France?",Paris

const dataset = Dataset.fromCSV('./data.csv')
```

**CSV Parsing:**
- First row is treated as headers
- Handles quoted values with commas
- Trims whitespace

---

### Transformation Methods

All transformation methods are **immutable** - they return new Dataset instances.

#### `map()`

Transform items.

**Signature:**
```typescript
map<U extends ExperimentItem>(
  fn: (item: T, index: number) => U
): Dataset<U>
```

**Example:**
```typescript
const transformed = dataset.map(item => ({
  ...item,
  priority: 'high',
  input: item.input.toLowerCase()
}))
```

---

#### `filter()`

Filter items based on predicate.

**Signature:**
```typescript
filter(predicate: (item: T, index: number) => boolean): Dataset<T>
```

**Example:**
```typescript
const important = dataset.filter(item => 
  item.category === 'critical'
)
```

---

#### `sample()`

Random sample of N items.

**Signature:**
```typescript
sample(n: number): Dataset<T>
```

**Example:**
```typescript
const subset = dataset.sample(10)  // Random 10 items
```

**Note:** Uses simple random sampling (may include duplicates if n > dataset size)

---

#### `slice()`

Get subset by index range.

**Signature:**
```typescript
slice(start: number, end?: number): Dataset<T>
```

**Example:**
```typescript
const first5 = dataset.slice(0, 5)
const from10 = dataset.slice(10)
```

---

### Properties

#### `length`

Number of items in dataset.

```typescript
readonly length: number
```

**Example:**
```typescript
console.log(`Dataset has ${dataset.length} items`)
```

---

#### `getItems()`

Get all items as array.

**Signature:**
```typescript
getItems(): T[]
```

**Example:**
```typescript
const items = dataset.getItems()
console.log(`First item: ${JSON.stringify(items[0])}`)
```

---

### Chaining Transformations

Methods can be chained:

```typescript
const processedDataset = Dataset
  .fromJSON('./data.json')
  .filter(item => item.validated === true)
  .map(item => ({ ...item, source: 'production' }))
  .sample(100)
  .slice(0, 50)
```

---

## Configuration

### `defineConfig()`

Define Cobalt configuration.

**Signature:**
```typescript
function defineConfig(config: CobaltConfig): CobaltConfig
```

**Type:**
```typescript
interface CobaltConfig {
  evaluators?: EvaluatorConfig[]     // Default evaluators
  concurrency?: number               // Default: 5
  timeout?: number                   // Default: 30000
  openaiApiKey?: string              // OpenAI API key
  anthropicApiKey?: string           // Anthropic API key
  resultsDir?: string                // Default: '.cobalt/results'
  cacheDir?: string                  // Default: '.cobalt/cache'
  historyDb?: string                 // Default: '.cobalt/history.db'
}
```

**Example:**
```typescript
// cobalt.config.ts
import { defineConfig } from '@basalt-ai/cobalt'

export default defineConfig({
  evaluators: [
    {
      name: 'relevance',
      type: 'llm-judge',
      prompt: 'Rate from 0 to 1',
      model: 'gpt-4o-mini',
      provider: 'openai'
    }
  ],
  concurrency: 10,
  timeout: 60000,
  openaiApiKey: process.env.OPENAI_API_KEY,
  anthropicApiKey: process.env.ANTHROPIC_API_KEY
})
```

---

### `loadConfig()`

Load configuration from file.

**Signature:**
```typescript
async function loadConfig(cwd?: string): Promise<CobaltConfig>
```

**Behavior:**
- Searches for `cobalt.config.ts` or `cobalt.config.js`
- Searches current directory and parent directories
- Returns defaults if no config file found

**Example:**
```typescript
import { loadConfig } from '@basalt-ai/cobalt'

const config = await loadConfig()
console.log(`Concurrency: ${config.concurrency}`)
```

---

## CLI Commands

### `cobalt run`

Run an experiment file.

**Usage:**
```bash
cobalt run <file> [options]
```

**Options:**
- `--filter <pattern>` - Filter experiments by name or tag
- `--config <path>` - Path to config file

**Examples:**
```bash
# Run single experiment
cobalt run experiments/my-agent.cobalt.ts

# Filter by name pattern
cobalt run experiments/ --filter "gpt-4*"

# Filter by tag
cobalt run experiments/ --filter "v2"
```

---

### `cobalt init`

Initialize new Cobalt project.

**Usage:**
```bash
cobalt init [directory]
```

**Creates:**
- `experiments/` - Example experiment files
- `datasets/` - Example datasets
- `cobalt.config.ts` - Configuration file
- `.cobalt/` - Results directory

**Example:**
```bash
cobalt init my-project
cd my-project
cobalt run experiments/example.cobalt.ts
```

---

### `cobalt history`

View past experiment runs.

**Usage:**
```bash
cobalt history [options]
```

**Options:**
- `--limit <n>` - Number of runs to show (default: 20)
- `--name <pattern>` - Filter by experiment name
- `--tag <tag>` - Filter by tag

**Example:**
```bash
cobalt history
cobalt history --limit 10
cobalt history --tag "production"
```

**Output:**
```
ID       Name          Timestamp            Avg Score  Cost
abc123   qa-agent      2026-02-05 10:30:00  0.85       $0.15
def456   summarizer    2026-02-05 09:15:00  0.92       $0.23
```

---

### `cobalt compare`

Compare two experiment runs.

**Usage:**
```bash
cobalt compare <run-id-1> <run-id-2>
```

**Example:**
```bash
cobalt compare abc123 def456
```

**Output:**
```
Comparison: abc123 vs def456

Metric          Run 1    Run 2    Diff
Relevance       0.85     0.92     +0.07
Accuracy        0.78     0.81     +0.03
Cost            $0.15    $0.23    +$0.08
```

---

### `cobalt serve`

Start dashboard server.

**Usage:**
```bash
cobalt serve [options]
```

**Options:**
- `--port <port>` - Port number (default: 4000)
- `--host <host>` - Host (default: localhost)

**Example:**
```bash
cobalt serve
# Opens http://localhost:4000
```

**Status:** API backend only (no React UI yet)

---

### `cobalt clean`

Clean old cache and results.

**Usage:**
```bash
cobalt clean [options]
```

**Options:**
- `--cache` - Clean LLM response cache
- `--results` - Clean result files
- `--days <n>` - Only clean items older than N days

**Examples:**
```bash
# Clean cache older than 30 days
cobalt clean --cache --days 30

# Clean all results
cobalt clean --results

# Clean both
cobalt clean --cache --results --days 90
```

---

### `cobalt mcp`

Start MCP server for Claude Code integration.

**Usage:**
```bash
cobalt mcp
```

**Configuration:**

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

**Available Tools:**
- `cobalt_run` - Run experiments
- `cobalt_results` - View results
- `cobalt_compare` - Compare runs

---

## Types Reference

### Core Types

```typescript
// Experiment item (flexible)
type ExperimentItem = Record<string, any>

// Experiment result
interface ExperimentResult {
  output: string | Record<string, any>
  metadata?: Record<string, any>
}

// Evaluation context
interface EvaluationContext {
  item: ExperimentItem
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
  p50: number        // Median
  p95: number        // 95th percentile
}
```

### Evaluator Config Types

```typescript
type EvaluatorType = 'llm-judge' | 'function' | 'similarity' | 'autoevals'

type EvaluatorConfig =
  | LLMJudgeEvaluatorConfig
  | FunctionEvaluatorConfig
  | SimilarityEvaluatorConfig
  | AutoevalsEvaluatorConfig

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
  context?: Record<string, string>        // Field mappings
}

interface SimilarityEvaluatorConfig {
  name: string
  type: 'similarity'
  field: string
  threshold?: number
  provider?: 'openai'
  model?: string
  distance?: 'cosine' | 'dotProduct'
  mode?: 'threshold' | 'raw'
}

interface AutoevalsEvaluatorConfig {
  name: string
  type: 'autoevals'
  autoeval: string
  expected?: string
  context?: Record<string, string>
}
```

---

## Utilities

### Cost Estimation

```typescript
import { estimateCost, formatCost } from 'cobalt/utils/cost'

const cost = estimateCost(
  { input: 10000, output: 5000 },  // Token counts
  'gpt-4o'                          // Model
)

console.log(formatCost(cost))  // "$0.15"
```

### Statistics

```typescript
import { calculateStats } from 'cobalt/utils/stats'

const scores = [0.8, 0.9, 0.85, 0.75, 0.95]
const stats = calculateStats(scores)

console.log(stats)
// {
//   avg: 0.85,
//   min: 0.75,
//   max: 0.95,
//   p50: 0.85,
//   p95: 0.94
// }
```

### Template Rendering

```typescript
import { renderTemplate } from 'cobalt/utils/template'

const template = 'Input: {{input}}, Output: {{output}}'
const context = {
  input: 'Hello',
  output: 'World'
}

const result = renderTemplate(template, context)
// "Input: Hello, Output: World"
```

**Note:** Only supports top-level variables, not nested like `{{metadata.model}}`

---

## Environment Variables

```bash
# Required for LLM judge evaluators
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...

# Optional: override default paths
COBALT_RESULTS_DIR=.cobalt/results
COBALT_CACHE_DIR=.cobalt/cache
COBALT_HISTORY_DB=.cobalt/history.db
```

---

## Error Handling

### Evaluator Errors

Evaluators return `{score: 0, reason: "error message"}` instead of throwing.

**Example:**
```typescript
const result = await evaluator.evaluate(context)

if (result.score === 0 && result.reason?.includes('error')) {
  console.error(`Evaluation failed: ${result.reason}`)
}
```

### Experiment Errors

If an item throws during execution, it's recorded but doesn't stop the experiment.

**Result:**
```typescript
{
  item: { ... },
  output: null,
  error: "Error message",
  scores: {}  // No evaluations run
}
```

---

## Best Practices

1. **Use LLM judges for subjective qualities** (relevance, tone, clarity)
2. **Use function evaluators for objective metrics** (length, format, regex)
3. **Use exact match for deterministic outputs** (classification, structured data)
4. **Start with small datasets** for iteration, then scale up
5. **Tag experiments** for easy filtering and comparison
6. **Monitor costs** - check `report.estimatedCost` after runs
7. **Cache is your friend** - rerun experiments without new API costs
8. **Use concurrency** for faster execution (default: 5 parallel)
9. **Set timeouts** to prevent hanging on slow items

---

## Additional Resources

- [GitHub Repository](https://github.com/user/cobalt) (placeholder)
- [INSTRUCTIONS.md](../INSTRUCTIONS.md) - Full specification
- [CLAUDE.md](../CLAUDE.md) - Development guide
- [.memory/decisions.md](./decisions.md) - Technical decisions
