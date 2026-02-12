# MCP Tools Reference

Complete reference for all Cobalt MCP tools that Claude Code can execute.

## Overview

Cobalt provides 4 MCP tools for interacting with experiments:

| Tool | Purpose | Use When |
|------|---------|----------|
| [cobalt_run](#cobalt_run) | Run experiments | Need to execute tests |
| [cobalt_results](#cobalt_results) | View results | Need to analyze past runs |
| [cobalt_compare](#cobalt_compare) | Compare runs | Need to detect regressions |
| [cobalt_generate](#cobalt_generate) | Auto-generate tests | Need tests for new agent |

## cobalt_run

Run Cobalt experiments and return structured results with scores per evaluator and per item.

### Signature

```typescript
cobalt_run(args: {
  file: string
  filter?: string
  concurrency?: number
}): ExperimentReport
```

### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `file` | string | ✅ Yes | Path to experiment file (e.g., `experiments/qa-agent.cobalt.ts`) |
| `filter` | string | ❌ No | Filter experiments by name (substring match) |
| `concurrency` | number | ❌ No | Override concurrency setting |

### Returns

Returns a complete `ExperimentReport` object:

```typescript
{
  id: string                    // Run ID (e.g., "abc123")
  name: string                  // Experiment name
  timestamp: string             // ISO 8601 timestamp
  tags: string[]                // Tags for filtering

  summary: {
    total: number               // Total items
    completed: number           // Successfully completed
    failed: number              // Failed items
    skipped: number             // Skipped items
    duration: number            // Total duration (ms)

    scores: {
      [evaluator: string]: {
        avg: number             // Average score
        min: number             // Minimum score
        max: number             // Maximum score
        p50: number             // Median score
        p95: number             // 95th percentile
        count: number           // Number of scores
      }
    }

    cost: {
      totalTokens: number       // Total tokens used
      totalCost: number         // Total cost ($)
      breakdown: {              // Cost by component
        agent: number
        evaluator: number
      }
    }
  }

  items: Array<{
    id: string
    input: any
    output: any
    expectedOutput?: any

    evaluations: {
      [evaluator: string]: {
        score: number           // 0-1 score
        reason: string          // Explanation
      }
    }

    metadata?: any
    duration: number
    startTime: string
    endTime: string
  }>
}
```

### Examples

#### Basic Usage

```typescript
// Claude uses this tool
cobalt_run({
  file: "experiments/qa-agent.cobalt.ts"
})
```

**Response:**
```json
{
  "id": "abc123",
  "name": "qa-agent-test",
  "summary": {
    "total": 5,
    "completed": 5,
    "scores": {
      "contains-answer": { "avg": 1.0, "min": 1.0, "max": 1.0 },
      "conciseness": { "avg": 0.95, "min": 0.90, "max": 1.0 },
      "factual-accuracy": { "avg": 0.88, "min": 0.70, "max": 1.0 }
    },
    "cost": {
      "totalCost": 0.02
    }
  },
  "items": [...]
}
```

#### With Override Concurrency

```typescript
cobalt_run({
  file: "experiments/slow-test.cobalt.ts",
  concurrency: 1  // Run sequentially
})
```

### Common Workflows

**1. Run and Analyze**

```
👤 "Run my experiments and show me the results"

🤖 *Uses cobalt_run*

   Results for qa-agent-test:
   - contains-answer: 1.00 (perfect)
   - conciseness: 0.95 (excellent)
   - factual-accuracy: 0.88 (good)

   3/20 items scored below 0.7 on factual-accuracy
```

**2. Check Specific Evaluator**

```
👤 "Run the tests and tell me how the accuracy looks"

🤖 *Uses cobalt_run*

   factual-accuracy scores:
   - Average: 0.88
   - Range: 0.70 - 1.00
   - 15% of items scored below 0.80

   Low-scoring items tend to be complex, multi-part questions
```

### Error Handling

**File Not Found:**
```json
{
  "success": false,
  "error": "File not found: experiments/missing.cobalt.ts"
}
```

**Experiment Failed:**
```json
{
  "summary": {
    "total": 5,
    "completed": 3,
    "failed": 2
  }
}
```

---

## cobalt_results

List past experiment runs or get detailed results for a specific run.

### Signature

```typescript
cobalt_results(args: {
  runId?: string
  limit?: number
  experiment?: string
}): RunList | ExperimentReport
```

### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `runId` | string | ❌ No | Get results for specific run ID. If omitted, lists recent runs |
| `limit` | number | ❌ No | Number of recent runs to list (default: 10) |
| `experiment` | string | ❌ No | Filter runs by experiment name |

### Returns

**Without `runId` (List Mode):**

```typescript
{
  runs: Array<{
    id: string
    experimentName: string
    timestamp: string
    total: number
    avgScore: number
    cost: number
    duration: number
  }>
  total: number
}
```

**With `runId` (Detail Mode):**

Returns full `ExperimentReport` (same as `cobalt_run`)

### Examples

#### List Recent Runs

```typescript
cobalt_results({
  limit: 5
})
```

**Response:**
```json
{
  "runs": [
    {
      "id": "abc123",
      "experimentName": "qa-agent-test",
      "timestamp": "2025-02-09T14:30:22.000Z",
      "total": 5,
      "avgScore": 0.94,
      "cost": 0.02,
      "duration": 12400
    },
    ...
  ],
  "total": 5
}
```

#### Get Specific Run

```typescript
cobalt_results({
  runId: "abc123"
})
```

Returns full `ExperimentReport` with all item details.

#### Filter by Experiment

```typescript
cobalt_results({
  experiment: "qa-agent",
  limit: 10
})
```

Lists only runs from experiments matching "qa-agent".

### Common Workflows

**1. View History**

```
👤 "Show me recent runs"

🤖 *Uses cobalt_results*

   Recent runs:
   1. qa-agent-test (abc123) - 0.94 avg - $0.02
   2. qa-agent-test (def456) - 0.92 avg - $0.02
   3. chatbot-v2 (ghi789) - 0.88 avg - $0.05
```

**2. Analyze Failures**

```
👤 "Show me details for run abc123"

🤖 *Uses cobalt_results with runId*

   Run abc123 (qa-agent-test):
   - 18/20 passed (90%)
   - 2 failures:
     1. "Explain quantum entanglement" - 0.6
     2. "What caused 2008 financial crisis?" - 0.55
```

---

## cobalt_compare

Compare two experiment runs and return structured diff showing regressions and improvements.

### Signature

```typescript
cobalt_compare(args: {
  runA: string
  runB: string
}): Comparison
```

### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `runA` | string | ✅ Yes | First run ID (baseline) |
| `runB` | string | ✅ Yes | Second run ID (candidate) |

### Returns

```typescript
{
  runA: {
    id: string
    name: string
    timestamp: string
  }
  runB: {
    id: string
    name: string
    timestamp: string
  }

  scoreDiffs: {
    [evaluator: string]: {
      baseline: number
      candidate: number
      diff: number
      percentChange: number
    }
  }

  regressions: Array<{
    evaluator: string
    baseline: number
    candidate: number
    diff: number
    percentChange: number
  }>

  improvements: Array<{
    evaluator: string
    baseline: number
    candidate: number
    diff: number
    percentChange: number
  }>

  topChanges: Array<{
    index: number
    input: string
    changes: {
      [evaluator: string]: number
    }
    maxChange: number
  }>
}
```

### Examples

#### Compare Two Runs

```typescript
cobalt_compare({
  runA: "abc123",  // baseline
  runB: "def456"   // candidate
})
```

**Response:**
```json
{
  "runA": {
    "id": "abc123",
    "name": "qa-agent-test",
    "timestamp": "2025-02-09T10:00:00.000Z"
  },
  "runB": {
    "id": "def456",
    "name": "qa-agent-test",
    "timestamp": "2025-02-09T14:00:00.000Z"
  },
  "scoreDiffs": {
    "factual-accuracy": {
      "baseline": 0.92,
      "candidate": 0.86,
      "diff": -0.06,
      "percentChange": -6.52
    }
  },
  "regressions": [
    {
      "evaluator": "factual-accuracy",
      "baseline": 0.92,
      "candidate": 0.86,
      "diff": -0.06,
      "percentChange": -6.52
    }
  ],
  "improvements": [],
  "topChanges": [
    {
      "index": 3,
      "input": "Explain photosynthesis",
      "changes": {
        "factual-accuracy": -0.25
      },
      "maxChange": 0.25
    }
  ]
}
```

### Common Workflows

**1. Check for Regressions**

```
👤 "Compare my latest run to the baseline"

🤖 *Uses cobalt_compare*

   ⚠️ REGRESSION DETECTED

   factual-accuracy dropped 6.5% (0.92 → 0.86)

   Biggest declines:
   - "Explain photosynthesis" - dropped 0.25
   - "What is GDP?" - dropped 0.15
```

**2. Validate Improvements**

```
👤 "Did my prompt changes improve the scores?"

🤖 *Uses cobalt_compare*

   ✅ YES - Improvements detected

   conciseness: +8% (0.90 → 0.97)
   factual-accuracy: +3% (0.88 → 0.91)

   Your prompt changes made responses more concise
   without hurting accuracy.
```

### Regression Detection

**Threshold**: 5% change triggers regression/improvement classification

**Regressions** (diff < -0.05):
- Score decreased by more than 5%
- Indicates potential quality degradation

**Improvements** (diff > +0.05):
- Score increased by more than 5%
- Indicates quality enhancement

---

## cobalt_generate

Analyze agent source code and auto-generate a Cobalt experiment file with dataset and evaluators.

### Signature

```typescript
cobalt_generate(args: {
  agentFile: string
  outputFile?: string
  datasetSize?: number
}): GenerationResult
```

### Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `agentFile` | string | ✅ Yes | - | Path to agent source code (TypeScript/JavaScript) |
| `outputFile` | string | ❌ No | `<agentFile>.cobalt.ts` | Output path for generated experiment |
| `datasetSize` | number | ❌ No | 10 | Number of test cases to generate |

### Returns

```typescript
{
  success: boolean
  outputFile: string
  analysis: {
    purpose: string
    inputSchema: any
    outputSchema: any
    keyBehaviors: string[]
    edgeCases: string[]
  }
  datasetSize: number
  evaluators: Array<{
    name: string
    type: string
  }>
}
```

### Examples

#### Basic Generation

```typescript
cobalt_generate({
  agentFile: "src/chatbot.ts"
})
```

**Response:**
```json
{
  "success": true,
  "outputFile": "src/chatbot.cobalt.ts",
  "analysis": {
    "purpose": "Conversational chatbot for customer support",
    "keyBehaviors": [
      "Greets users warmly",
      "Answers product questions",
      "Escalates complex issues"
    ],
    "edgeCases": [
      "Rude or abusive input",
      "Multi-turn conversations",
      "Ambiguous questions"
    ]
  },
  "datasetSize": 10,
  "evaluators": [
    { "name": "helpfulness", "type": "llm-judge" },
    { "name": "safety", "type": "llm-judge" },
    { "name": "response-length", "type": "function" }
  ]
}
```

**Generated File** (`src/chatbot.cobalt.ts`):

```typescript
import { experiment, Evaluator, Dataset } from '@basalt-ai/cobalt'
import { chatbot } from './chatbot.js'

const dataset = new Dataset({
  items: [
    {
      input: "Hello, I need help with my order",
      category: "greeting"
    },
    {
      input: "What's your return policy?",
      category: "policy-question"
    },
    // ... 8 more cases
  ]
})

const evaluators = [
  new Evaluator({
    name: 'helpfulness',
    type: 'llm-judge',
    prompt: 'Rate how helpful this response is...'
  }),
  // ... more evaluators
]

experiment('chatbot-test', dataset, async ({ item }) => {
  const output = await chatbot(item.input)
  return { output }
}, {
  evaluators,
  tags: ['chatbot', 'auto-generated']
})
```

#### Custom Output Path and Dataset Size

```typescript
cobalt_generate({
  agentFile: "src/agents/summarizer.ts",
  outputFile: "experiments/summarizer-test.cobalt.ts",
  datasetSize: 20
})
```

### Generation Process

**cobalt_generate** uses LLM to analyze your agent code in 3 steps:

**1. Analyze Agent Code**
- Reads source file
- Identifies purpose and functionality
- Extracts input/output schemas
- Detects key behaviors and edge cases

**2. Generate Dataset**
- Creates realistic test cases
- Covers normal and edge cases
- Categorizes test scenarios
- Generates expected outputs (when possible)

**3. Generate Evaluators**
- Suggests appropriate evaluator types
- Creates LLM judge prompts
- Adds function-based checks
- Ensures comprehensive coverage

### Common Workflows

**1. Generate Tests for New Agent**

```
👤 "I wrote a new summarization agent. Generate tests for it."

🤖 *Reads src/summarizer.ts*
🤖 *Uses cobalt_generate*

   Generated: summarizer.cobalt.ts

   - 10 test articles (news, technical, narrative)
   - 3 evaluators:
     1. faithfulness (LLM judge)
     2. conciseness (LLM judge)
     3. length-check (function)

   Run tests with:
   npx cobalt run --file summarizer.cobalt.ts
```

**2. Bootstrap Testing**

```
👤 "Generate comprehensive tests for my RAG agent"

🤖 *Uses cobalt_generate with datasetSize: 20*

   Generated: rag-agent.cobalt.ts

   - 20 test queries covering:
     - Factual questions
     - Multi-hop reasoning
     - Ambiguous queries
     - Out-of-context questions

   - 4 evaluators:
     - context-precision
     - context-recall
     - answer-relevance
     - faithfulness
```

### Configuration

**Uses Judge Config**:
- Model: Uses `config.judge.model` (default: gpt-5-mini)
- Provider: Uses `config.judge.provider`
- API Key: Uses `config.judge.apiKey` or `OPENAI_API_KEY`

**Why?**:
- Consistent with LLM evaluators
- No separate API keys needed
- Reuses existing configuration

### Error Handling

**Agent File Not Found:**
```json
{
  "error": "Agent file not found: src/missing.ts"
}
```

**Invalid Agent Code:**
```json
{
  "error": "Could not parse agent code"
}
```

---

## Tool Comparison

| Feature | cobalt_run | cobalt_results | cobalt_compare | cobalt_generate |
|---------|------------|----------------|----------------|-----------------|
| **Purpose** | Execute | View | Compare | Create |
| **Input** | Experiment file | Run ID(s) | 2 Run IDs | Agent code |
| **Output** | Full report | Report or list | Diff analysis | Generated file |
| **Cost** | $$$ (runs LLMs) | Free (reads files) | Free (reads files) | $ (analysis only) |
| **Speed** | Slow (runs agent) | Fast (reads DB) | Fast (reads DB) | Medium (LLM) |

## Best Practices

### ✅ DO

- **Use cobalt_run** for fresh experiments
- **Use cobalt_results** to analyze past runs (cheaper)
- **Use cobalt_compare** before deploying changes
- **Use cobalt_generate** to bootstrap new tests
- **Cache results** - Don't re-run if results exist

### ❌ DON'T

- Don't run experiments repeatedly (use results)
- Don't skip comparison before production deploys
- Don't edit generated files without understanding them
- Don't ignore regressions flagged by compare

## Troubleshooting

### "File parameter required"

**Solution**: cobalt_run needs explicit file path:
```typescript
cobalt_run({ file: "experiments/qa-agent.cobalt.ts" })
```

### "No result found for run ID"

**Solution**: Check run ID with cobalt_results first:
```typescript
cobalt_results({ limit: 10 })  // Find valid run IDs
```

### "Could not capture results"

**Solution**: Experiment file must call `experiment()` function:
```typescript
// ✅ Good
experiment('name', dataset, runner, { evaluators })

// ❌ Bad
export const config = { ... }  // Just config, no experiment() call
```

## See Also

- [MCP Resources](resources.md) — cobalt://config, cobalt://experiments, etc.
- [MCP Prompts](prompts.md) — improve-agent, generate-tests, regression-check
- [MCP Overview](overview.md) — Setup and configuration
- [Integration Guide](../guides/mcp-integration.md) — Common workflows

---

**Need help?** Check the [MCP Integration Guide](../guides/mcp-integration.md) for common workflows and examples.
