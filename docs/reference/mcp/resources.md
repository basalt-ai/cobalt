# MCP Resources Reference

Complete reference for all Cobalt MCP resources that Claude Code can read.

## Overview

Cobalt provides 3 MCP resources for accessing data:

| Resource | Purpose | Use When |
|----------|---------|----------|
| [cobalt://config](#cobaltconfig) | View configuration | Need to check settings |
| [cobalt://experiments](#cobaltexperiments) | List experiments | Need to find experiment files |
| [cobalt://latest-results](#cobaltlatest-results) | Latest run results | Need most recent scores |

**Resources are read-only** — Claude can access data but cannot modify it.

## cobalt://config

Access current Cobalt configuration from `cobalt.config.ts`.

### URI

```
cobalt://config
```

### Returns

```typescript
{
  testDir: string              // Test directory path
  outputDir: string            // Results output directory
  concurrency: number          // Max parallel executions
  timeout: number              // Per-item timeout (ms)

  judge?: {
    provider: string           // LLM provider
    model: string              // Model name
    apiKey?: string            // API key (redacted)
  }

  cache?: {
    enabled: boolean           // Cache enabled
    ttl: number                // Time to live (ms)
  }

  ciMode: boolean              // CI mode enabled
  thresholds: {                // Quality thresholds
    [evaluator: string]: {
      avg?: number
      min?: number
      max?: number
      p50?: number
      p95?: number
      passRate?: number
      minScore?: number
    }
  }

  tags: string[]               // Default tags
  plugins: string[]            // Plugin paths
}
```

### Example Response

```json
{
  "testDir": "experiments",
  "outputDir": ".cobalt",
  "concurrency": 5,
  "timeout": 30000,
  "judge": {
    "provider": "openai",
    "model": "gpt-4o-mini",
    "apiKey": "[REDACTED]"
  },
  "cache": {
    "enabled": true,
    "ttl": 86400000
  },
  "ciMode": false,
  "thresholds": {},
  "tags": [],
  "plugins": []
}
```

### Common Use Cases

**1. Check Configuration**

```
👤 "What's my current Cobalt configuration?"

🤖 *Reads cobalt://config*

   Configuration:
   - Test directory: experiments/
   - Concurrency: 5
   - Judge model: gpt-4o-mini
   - Cache: enabled (24h TTL)
   - CI mode: disabled
```

**2. Verify Settings**

```
👤 "Am I using the right model for LLM judges?"

🤖 *Reads cobalt://config*

   Your LLM judges use: gpt-4o-mini

   This is a cost-effective choice for evaluators.
   Consider upgrading to gpt-4o for:
   - More nuanced evaluations
   - Better reasoning about edge cases
```

**3. Debug Issues**

```
👤 "Why are my tests running slowly?"

🤖 *Reads cobalt://config*

   Your concurrency is set to 1 (sequential execution).

   To speed up tests:
   - Increase concurrency: 3-5 for most use cases
   - Or override: cobalt_run({ concurrency: 5 })
```

### Notes

- **API keys are redacted** in the response for security
- **Defaults are merged** with user config
- **Environment variables** are resolved at runtime

---

## cobalt://experiments

List all experiment files in your test directory.

### URI

```
cobalt://experiments
```

### Returns

```typescript
{
  testDir: string              // Test directory path
  count: number                // Number of experiments found
  experiments: Array<{
    path: string               // Relative path from project root
    name: string               // Experiment name (filename without .cobalt.ts)
  }>
}
```

### Example Response

```json
{
  "testDir": "experiments",
  "count": 5,
  "experiments": [
    {
      "path": "experiments/qa-agent.cobalt.ts",
      "name": "qa-agent"
    },
    {
      "path": "experiments/chatbot-v2.cobalt.ts",
      "name": "chatbot-v2"
    },
    {
      "path": "experiments/summarizer.cobalt.ts",
      "name": "summarizer"
    },
    {
      "path": "experiments/classification/sentiment.cobalt.ts",
      "name": "sentiment"
    },
    {
      "path": "experiments/rag/context-retrieval.cobalt.ts",
      "name": "context-retrieval"
    }
  ]
}
```

### Common Use Cases

**1. List Available Tests**

```
👤 "What experiments do I have?"

🤖 *Reads cobalt://experiments*

   You have 5 experiments:
   1. qa-agent - Q&A testing
   2. chatbot-v2 - Chatbot evaluation
   3. summarizer - Summarization tests
   4. sentiment - Sentiment classification
   5. context-retrieval - RAG retrieval tests
```

**2. Find Specific Experiment**

```
👤 "Do I have any tests for my chatbot?"

🤖 *Reads cobalt://experiments*

   Yes! Found:
   - experiments/chatbot-v2.cobalt.ts

   Run with:
   cobalt_run({ file: "experiments/chatbot-v2.cobalt.ts" })
```

**3. Suggest Experiments to Run**

```
👤 "Run my tests"

🤖 *Reads cobalt://experiments*

   You have 5 experiments. Which would you like to run?
   1. qa-agent
   2. chatbot-v2
   3. summarizer
   ...
```

### Discovery Rules

**Included:**
- Files matching `*.cobalt.ts` pattern
- Recursive search in subdirectories
- Files in configured `testDir`

**Excluded:**
- Hidden directories (starting with `.`)
- `node_modules/` folder
- Files without `.cobalt.ts` extension

### Notes

- **Automatically discovers** new experiment files
- **Relative paths** from project root
- **Recursive search** through nested directories

---

## cobalt://latest-results

Access the most recent results for each experiment.

### URI

```
cobalt://latest-results
```

### Returns

```typescript
{
  count: number                // Number of experiments with results
  results: Array<{
    id: string                 // Run ID
    name: string               // Experiment name
    timestamp: string          // ISO 8601 timestamp
    total: number              // Total items
    completed: number          // Successfully completed
    failed: number             // Failed items
    avgScore: number           // Overall average score
    cost: number               // Total cost ($)
    duration: number           // Duration (ms)
    scores: {                  // Scores by evaluator
      [evaluator: string]: {
        avg: number
        min: number
        max: number
      }
    }
  }>
}
```

### Example Response

```json
{
  "count": 3,
  "results": [
    {
      "id": "abc123",
      "name": "qa-agent-test",
      "timestamp": "2025-02-09T14:30:22.000Z",
      "total": 20,
      "completed": 20,
      "failed": 0,
      "avgScore": 0.94,
      "cost": 0.02,
      "duration": 12400,
      "scores": {
        "contains-answer": { "avg": 1.0, "min": 1.0, "max": 1.0 },
        "conciseness": { "avg": 0.95, "min": 0.90, "max": 1.0 },
        "factual-accuracy": { "avg": 0.88, "min": 0.70, "max": 1.0 }
      }
    },
    {
      "id": "def456",
      "name": "chatbot-v2",
      "timestamp": "2025-02-09T10:15:00.000Z",
      "total": 15,
      "completed": 15,
      "failed": 0,
      "avgScore": 0.91,
      "cost": 0.05,
      "duration": 18200,
      "scores": {
        "helpfulness": { "avg": 0.92, "min": 0.80, "max": 1.0 },
        "safety": { "avg": 1.0, "min": 1.0, "max": 1.0 },
        "coherence": { "avg": 0.89, "min": 0.75, "max": 0.95 }
      }
    },
    {
      "id": "ghi789",
      "name": "summarizer",
      "timestamp": "2025-02-08T16:45:00.000Z",
      "total": 10,
      "completed": 10,
      "failed": 0,
      "avgScore": 0.86,
      "cost": 0.03,
      "duration": 9800,
      "scores": {
        "faithfulness": { "avg": 0.90, "min": 0.80, "max": 1.0 },
        "conciseness": { "avg": 0.82, "min": 0.70, "max": 0.90 }
      }
    }
  ]
}
```

### Common Use Cases

**1. Check Latest Results**

```
👤 "How did my tests perform?"

🤖 *Reads cobalt://latest-results*

   Latest results:

   1. qa-agent-test (2h ago)
      - Average: 0.94 ✅
      - All tests passed
      - Cost: $0.02

   2. chatbot-v2 (4h ago)
      - Average: 0.91 ✅
      - All tests passed
      - Cost: $0.05

   3. summarizer (yesterday)
      - Average: 0.86 ⚠️
      - conciseness could improve
      - Cost: $0.03
```

**2. Identify Issues**

```
👤 "Are there any failing tests?"

🤖 *Reads cobalt://latest-results*

   All experiments passed! ✅

   Lowest scoring:
   - summarizer: 0.86 (conciseness at 0.82)

   This is still good, but might be worth investigating.
```

**3. Compare Timestamps**

```
👤 "When was the last time I ran tests?"

🤖 *Reads cobalt://latest-results*

   Most recent runs:
   - qa-agent-test: 2 hours ago
   - chatbot-v2: 4 hours ago
   - summarizer: 1 day ago

   Your summarizer tests are a bit stale. Consider re-running.
```

### Grouping Logic

**One result per experiment**:
- Groups by experiment `name`
- Keeps only the **most recent run**
- Based on `timestamp` comparison

**Example:**
```
qa-agent-test runs:
- abc123 (2025-02-09 14:30) ← Returned (latest)
- abc122 (2025-02-09 10:00)
- abc121 (2025-02-08 18:00)
```

### Notes

- **Always up-to-date** — reads from history database
- **One result per experiment** — only the latest
- **Fast access** — no need to run experiments

---

## Resource Comparison

| Feature | cobalt://config | cobalt://experiments | cobalt://latest-results |
|---------|----------------|----------------------|-------------------------|
| **Type** | Configuration | File list | Run history |
| **Updates** | On config change | On file add/remove | On experiment run |
| **Size** | Small (~1KB) | Small-Medium (~10KB) | Medium (~50KB) |
| **Speed** | Instant | Fast | Fast |
| **Use for** | Settings check | Discovery | Quick status |

## Best Practices

### ✅ DO

- **Read config** before running experiments
- **Discover experiments** instead of hardcoding paths
- **Check latest-results** before re-running (avoid waste)
- **Use resources** for fast data access

### ❌ DON'T

- Don't assume config values (read them)
- Don't hardcode experiment paths (discover them)
- Don't re-run experiments if recent results exist
- Don't try to modify resources (read-only)

## Common Workflows

### Workflow 1: Smart Test Execution

```
👤 "Run my outdated tests"

🤖 Step 1: *Reads cobalt://latest-results*
   - qa-agent: 2h ago (fresh)
   - chatbot: 1 day ago (stale)
   - summarizer: 3 days ago (stale)

🤖 Step 2: *Reads cobalt://experiments*
   Found paths for chatbot and summarizer

🤖 Step 3: *Uses cobalt_run*
   Running: chatbot, summarizer
   Skipping: qa-agent (recent results exist)
```

### Workflow 2: Configuration-Aware Analysis

```
👤 "Analyze my test results"

🤖 Step 1: *Reads cobalt://config*
   - Concurrency: 5
   - Judge: gpt-4o-mini
   - CI mode: disabled

🤖 Step 2: *Reads cobalt://latest-results*
   - qa-agent: 0.94 avg
   - chatbot: 0.91 avg

🤖 Analysis:
   You're using gpt-4o-mini for evaluations (cost-effective).
   All tests are passing with good scores.
   Consider enabling CI mode for production gates.
```

### Workflow 3: Experiment Discovery

```
👤 "Generate tests for all my agents"

🤖 Step 1: *Reads cobalt://experiments*
   Found 3 existing experiments

🤖 Step 2: Scan src/ for agent files not in experiments/
   Found 2 agents without tests:
   - src/translator.ts
   - src/classifier.ts

🤖 Step 3: *Uses cobalt_generate* for each
   Generated:
   - translator.cobalt.ts
   - classifier.cobalt.ts
```

## Combining with Tools

Resources work great with [MCP Tools](tools.md):

**Pattern: Read → Decide → Act**

```typescript
// 1. Read latest results
const latest = await read('cobalt://latest-results')

// 2. Decide what to run
const outdated = latest.results.filter(r =>
  Date.now() - new Date(r.timestamp) > 24 * 60 * 60 * 1000
)

// 3. Act - run outdated experiments
for (const exp of outdated) {
  await cobalt_run({ file: `experiments/${exp.name}.cobalt.ts` })
}
```

## Troubleshooting

### "Failed to load config"

**Cause**: No `cobalt.config.ts` found

**Solution**: Run `cobalt init` or create config file

### "No experiments found"

**Cause**: Empty `testDir` or no `*.cobalt.ts` files

**Solution**: Create experiment files in configured testDir

### "Failed to load latest results"

**Cause**: No history database (no experiments run yet)

**Solution**: Run an experiment first with `cobalt_run`

## See Also

- [MCP Tools](tools.md) — cobalt_run, cobalt_results, cobalt_compare, cobalt_generate
- [MCP Prompts](prompts.md) — improve-agent, generate-tests, regression-check
- [MCP Overview](overview.md) — Setup and configuration
- [Integration Guide](../guides/mcp-integration.md) — Common workflows

---

**Need help?** Check the [MCP Integration Guide](../guides/mcp-integration.md) for examples of combining resources with tools.
