# Experiments

The `experiment()` function is the core of Cobalt. It runs your agent against a dataset, evaluates outputs, and produces a structured report.

## Basic Usage

```typescript
import { experiment, Dataset, Evaluator } from '@basalt-ai/cobalt'

const dataset = new Dataset({
  items: [
    { input: 'What is 2+2?', expectedOutput: '4' },
    { input: 'Capital of France?', expectedOutput: 'Paris' },
  ],
})

await experiment('my-agent-test', dataset, async ({ item }) => {
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

## Function Signature

```typescript
async function experiment(
  name: string,
  dataset: Dataset,
  runner: RunnerFunction,
  options: ExperimentOptions,
): Promise<ExperimentReport>
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `name` | `string` | Experiment name (used in results and history) |
| `dataset` | `Dataset` | Dataset to run against |
| `runner` | `RunnerFunction` | Async function that calls your agent |
| `options` | `ExperimentOptions` | Evaluators, concurrency, thresholds, etc. |

---

## Runner Function

The runner receives a context object and must return an `ExperimentResult`.

```typescript
type RunnerFunction = (context: RunnerContext) => Promise<ExperimentResult>

interface RunnerContext {
  item: ExperimentItem     // Current dataset item
  index: number            // Item index in dataset
  runIndex: number         // Run index (0 when runs=1)
}

interface ExperimentResult {
  output: string | Record<string, any>
  metadata?: Record<string, any>   // Optional: tokens, latency, etc.
}
```

### Tracking Token Usage

Return token counts in `metadata` to get cost estimates in the report:

```typescript
async ({ item }) => {
  const result = await myAgent(item.input)
  return {
    output: result.text,
    metadata: {
      tokens: {
        input: result.inputTokens,
        output: result.outputTokens,
      },
    },
  }
}
```

---

## Experiment Options

```typescript
interface ExperimentOptions {
  evaluators: (EvaluatorConfig | Evaluator)[]
  runs?: number           // default: 1
  concurrency?: number    // default: 5
  timeout?: number        // default: 30_000 (ms)
  tags?: string[]
  name?: string           // override experiment name
  thresholds?: ThresholdConfig
}
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `evaluators` | `(EvaluatorConfig \| Evaluator)[]` | *required* | List of evaluators to run on each output |
| `runs` | `number` | `1` | Number of times to run each item |
| `concurrency` | `number` | `5` | Max parallel executions |
| `timeout` | `number` | `30000` | Per-item timeout in ms |
| `tags` | `string[]` | `[]` | Tags for filtering in history |
| `name` | `string` | -- | Override the experiment name |
| `thresholds` | `ThresholdConfig` | -- | CI quality thresholds |

### Inline Evaluator Configs

You can pass raw config objects instead of `Evaluator` instances:

```typescript
await experiment('test', dataset, runner, {
  evaluators: [
    {
      name: 'Accuracy',
      type: 'llm-judge',
      prompt: 'Is this accurate? {{output}}',
    },
    {
      name: 'Length',
      type: 'function',
      fn: ({ output }) => ({
        score: String(output).length < 500 ? 1 : 0,
        reason: `${String(output).length} chars`,
      }),
    },
  ],
})
```

---

## Multiple Runs

Set `runs` > 1 to run each dataset item multiple times. Runs are sequential per item, parallel across items. Results include per-item aggregation with statistical measures.

```typescript
await experiment('stability-test', dataset, runner, {
  evaluators: [...],
  runs: 5,
  concurrency: 3,
})
```

When `runs > 1`, each `ItemResult` includes:

- `runs[]` — individual run results
- `aggregated.avgLatencyMs` — average latency across runs
- `aggregated.evaluations` — per-evaluator statistics (mean, stddev, min, max, p50, p95, p99)

---

## CI Mode (Thresholds)

Define quality thresholds to enforce in CI pipelines. Use the `--ci` flag when running via CLI to enable exit code reporting.

```typescript
await experiment('ci-test', dataset, runner, {
  evaluators: [...],
  thresholds: {
    score: { avg: 0.8, min: 0.5 },
    latency: { p95: 5000 },
    cost: { max: 1.0 },
    evaluators: {
      Correctness: { avg: 0.9, passRate: 0.95, minScore: 0.5 },
    },
  },
})
```

| Threshold | Metrics | Description |
|-----------|---------|-------------|
| `score` | `avg`, `min`, `max`, `p50`, `p95`, `p99`, `passRate`, `minScore` | Global across all evaluators |
| `latency` | Same metrics | Latency in milliseconds |
| `tokens` | Same metrics | Token count |
| `cost` | Same metrics | Cost in USD |
| `evaluators` | Same metrics, keyed by evaluator name | Per-evaluator overrides |

```bash
npx cobalt run --ci
# Exit code 1 if any threshold is violated
```

---

## Experiment Report

The `experiment()` function returns a structured `ExperimentReport`:

```typescript
interface ExperimentReport {
  id: string                    // Unique run ID
  name: string                  // Experiment name
  timestamp: string             // ISO timestamp
  tags: string[]                // Tags
  config: {
    runs: number
    concurrency: number
    timeout: number
    evaluators: string[]        // Evaluator names
  }
  summary: ExperimentSummary
  items: ItemResult[]
  ciStatus?: CIResult           // Only when thresholds are set
}
```

### Summary Statistics

```typescript
interface ExperimentSummary {
  totalItems: number
  totalDurationMs: number
  avgLatencyMs: number
  totalTokens?: number
  estimatedCost?: number
  scores: Record<string, ScoreStats>
}

interface ScoreStats {
  avg: number
  min: number
  max: number
  p50: number
  p95: number
  p99: number
}
```

### Item Results

Each item in `report.items` contains:

```typescript
interface ItemResult {
  index: number
  input: ExperimentItem
  output: ExperimentResult
  latencyMs: number
  evaluations: Record<string, { score: number; reason?: string }>
  error?: string
  runs: SingleRun[]
  aggregated?: {
    avgLatencyMs: number
    evaluations: Record<string, RunAggregation>
  }
}
```

---

## File Naming

Experiment files should use the `.cobalt.ts` or `.experiment.ts` extension:

```
experiments/
├── qa-agent.cobalt.ts
├── summarizer.cobalt.ts
└── classifier.experiment.ts
```

Run all experiments:

```bash
npx cobalt run
```

Run a specific file:

```bash
npx cobalt run --file experiments/qa-agent.cobalt.ts
```
