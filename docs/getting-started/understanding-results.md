# Understanding Results

Learn how to interpret and analyze Cobalt experiment results.

## Overview

When you run an experiment, Cobalt generates comprehensive results including:
- Individual item scores and outputs
- Statistical summaries (avg, min, max, p50, p95)
- Cost tracking (tokens and estimated costs)
- Performance metrics (duration, throughput)
- Historical comparisons

## Result Files

After running an experiment, results are saved to:

```
.cobalt/
├── results/
│   └── 2025-02-06T14-30-22_qa-agent_abc123.json
└── history.db
```

**Filename format**: `TIMESTAMP_EXPERIMENT-NAME_RUN-ID.json`

## Viewing Results

### Quick Summary

After running an experiment, you'll see a summary:

```bash
npx cobalt run --file experiments/qa-agent.cobalt.ts
```

Output:

```
Running experiment: qa-agent-test
Items: 5/5 completed (100%)
Duration: 12.4s

Scores:
  contains-answer:    1.00 (min: 1.00, max: 1.00)
  conciseness:        0.95 (min: 0.90, max: 1.00)
  factual-accuracy:   0.92 (min: 0.85, max: 1.00)

Total Cost: $0.02
Results saved to: .cobalt/results/2025-02-06T14-30-22_qa-agent_abc123.json
```

### History Command

View all past runs:

```bash
npx cobalt history
```

Output:

```
Recent Runs:
┌─────────────────────┬──────────────────┬──────┬─────────────┬──────────┐
│ ID                  │ Experiment       │ Items│ Duration    │ Avg Score│
├─────────────────────┼──────────────────┼──────┼─────────────┼──────────┤
│ abc123              │ qa-agent-test    │ 5    │ 12.4s       │ 0.96     │
│ def456              │ qa-agent-test    │ 5    │ 11.8s       │ 0.94     │
│ ghi789              │ chatbot-v2       │ 10   │ 24.1s       │ 0.88     │
└─────────────────────┴──────────────────┴──────┴─────────────┴──────────┘
```

Filter by experiment:

```bash
npx cobalt history --experiment "qa-agent-test"
```

Limit results:

```bash
npx cobalt history --limit 10
```

### Detailed Results

View item-by-item details by inspecting the result JSON files in `.cobalt/data/results/` (see [Result Structure](#result-structure) below).

## Result Structure

The JSON result file contains:

```typescript
{
  // Experiment metadata
  "id": "abc123",
  "name": "qa-agent-test",
  "timestamp": "2025-02-06T14:30:22.000Z",
  "tags": ["qa", "gpt-5-mini", "v1"],
  "config": {
    "concurrency": 3,
    "timeout": 30000
  },

  // Summary statistics
  "summary": {
    "total": 5,
    "completed": 5,
    "failed": 0,
    "skipped": 0,
    "duration": 12400,

    // Scores by evaluator
    "scores": {
      "contains-answer": {
        "avg": 1.00,
        "min": 1.00,
        "max": 1.00,
        "p50": 1.00,
        "p95": 1.00,
        "count": 5
      },
      "conciseness": {
        "avg": 0.95,
        "min": 0.90,
        "max": 1.00,
        "p50": 0.95,
        "p95": 0.98,
        "count": 5
      },
      "factual-accuracy": {
        "avg": 0.92,
        "min": 0.85,
        "max": 1.00,
        "p50": 0.90,
        "p95": 0.98,
        "count": 5
      }
    },

    // Cost tracking
    "cost": {
      "totalTokens": 450,
      "totalCost": 0.02,
      "breakdown": {
        "agent": 0.0075,
        "evaluator": 0.0125
      }
    }
  },

  // Individual item results
  "items": [
    {
      "id": "item-0",
      "input": "What is the capital of France?",
      "output": "The capital of France is Paris.",
      "expectedOutput": "Paris",

      // Scores from each evaluator
      "scores": {
        "contains-answer": {
          "score": 1.0,
          "reason": "Output contains expected answer \"Paris\""
        },
        "conciseness": {
          "score": 1.0,
          "reason": "6 words (target: ≤50)"
        },
        "factual-accuracy": {
          "score": 1.0,
          "reason": "Completely accurate and directly answers the question"
        }
      },

      // Metadata from runner
      "metadata": {
        "model": "gpt-5-mini",
        "tokens": 45,
        "duration": 890,
        "category": "geography"
      },

      // Timing information
      "startTime": "2025-02-06T14:30:22.100Z",
      "endTime": "2025-02-06T14:30:22.990Z",
      "duration": 890
    },
    // ... more items
  ]
}
```

## Understanding Scores

### Score Types

**Average (avg)**: Mean score across all items
- Use for: Overall performance assessment
- Range: 0.0 - 1.0

**Minimum (min)**: Worst score
- Use for: Identifying outliers and failure cases
- Range: 0.0 - 1.0

**Maximum (max)**: Best score
- Use for: Understanding upper bound performance
- Range: 0.0 - 1.0

**Median (p50)**: Middle score (50th percentile)
- Use for: Understanding typical performance (less affected by outliers)
- Range: 0.0 - 1.0

**95th Percentile (p95)**: 95% of scores are at or below this value
- Use for: Ensuring consistency (only 5% can be worse)
- Range: 0.0 - 1.0

### Interpreting Scores

**Perfect Score (1.0)**
```
contains-answer: 1.00 (min: 1.00, max: 1.00)
```
- All items scored perfectly
- Agent is 100% accurate for this metric

**High Consistency (low variance)**
```
conciseness: 0.95 (min: 0.90, max: 1.00)
```
- Small range (0.10) between min and max
- Agent performance is consistent

**High Variance**
```
factual-accuracy: 0.75 (min: 0.30, max: 1.00)
```
- Large range (0.70) between min and max
- Performance varies significantly across items
- Investigate low-scoring items

**Low Average**
```
relevance: 0.45 (min: 0.20, max: 0.70)
```
- Agent is underperforming
- Review agent prompt, model, or approach

## Cost Tracking

Cobalt automatically tracks token usage and costs:

```json
"cost": {
  "totalTokens": 450,
  "totalCost": 0.02,
  "breakdown": {
    "agent": 0.0075,
    "evaluator": 0.0125
  }
}
```

### Understanding Costs

**Per-Item Cost**:
```
Total cost: $0.02 / 5 items = $0.004 per item
```

**Cost by Component**:
- Agent calls: $0.0075 (37.5%)
- Evaluators: $0.0125 (62.5%)

**Optimization Tips**:
1. Use caching for repeated inputs
2. Choose cheaper models for evaluators (gpt-5-mini vs gpt-4o)
3. Use function evaluators instead of LLM judges where possible
4. Reduce concurrency to avoid rate limits

See [Configuration Guide](../configuration.md) for more strategies.

## Comparing Results

Compare two runs to see improvements or regressions:

```bash
npx cobalt compare abc123 def456
```

Output:

```
Comparing:
  Run 1: qa-agent-test (abc123) - 2025-02-06 14:30:22
  Run 2: qa-agent-test (def456) - 2025-02-06 15:45:10

Scores:
┌──────────────────┬────────┬────────┬────────────┐
│ Evaluator        │ Run 1  │ Run 2  │ Change     │
├──────────────────┼────────┼────────┼────────────┤
│ contains-answer  │ 1.00   │ 1.00   │ 0.00 (0%)  │
│ conciseness      │ 0.95   │ 0.97   │ +0.02 (+2%)│
│ factual-accuracy │ 0.92   │ 0.89   │ -0.03 (-3%)│
└──────────────────┴────────┴────────┴────────────┘

Performance:
  Duration: 12.4s → 11.8s (0.6s faster, -5%)
  Cost:     $0.02 → $0.019 (-5%)

Summary:
  ✅ conciseness improved by 2%
  ❌ factual-accuracy decreased by 3%
  ✅ Overall performance improved
```

## Analyzing Individual Items

### Finding Low Scores

To find items that scored poorly, inspect the result JSON programmatically:

```typescript
import { loadResult } from '@basalt-ai/cobalt'

const result = await loadResult('abc123')

// Find items with low factual-accuracy
const lowScoring = result.items.filter(item =>
  item.scores['factual-accuracy'].score < 0.7
)

console.log('Low scoring items:', lowScoring)
```

### Common Patterns

**Consistent Failure on Specific Categories**:
```json
{
  "input": "Complex math question",
  "scores": { "accuracy": 0.3 },
  "metadata": { "category": "math" }
}
```
→ Agent struggles with math questions

**Timeout Errors**:
```json
{
  "error": "Timeout exceeded",
  "duration": 30001
}
```
→ Increase timeout or optimize agent

**High Cost Items**:
```json
{
  "metadata": { "tokens": 5000 }
}
```
→ Agent generating verbose outputs

## Dashboard View (Coming Soon)

The dashboard provides visual analytics:

```bash
npx cobalt serve
```

Features:
- Score trends over time
- Cost analysis charts
- Item-by-item inspection
- Comparison visualizations

## Exporting Results

### Export for Analysis

```typescript
import { loadResult } from '@basalt-ai/cobalt'
import { writeFile } from 'fs/promises'

const result = await loadResult('abc123')

// Extract scores for analysis
const data = result.items.map(item => ({
  input: item.input,
  output: item.output,
  accuracy: item.scores['factual-accuracy'].score,
  concise: item.scores['conciseness'].score,
  tokens: item.metadata.tokens,
  duration: item.duration
}))

await writeFile('analysis.json', JSON.stringify(data, null, 2))
```

## Best Practices

### ✅ DO

- **Review low-scoring items** to understand failures
- **Track trends over time** using history
- **Compare runs** when making changes
- **Monitor costs** to stay within budget
- **Use p95** for consistency metrics
- **Tag runs** for easy filtering

### ❌ DON'T

- Don't ignore outliers (min/max scores)
- Don't focus only on averages
- Don't compare different datasets
- Don't skip cost analysis
- Don't run without tags

## Next Steps

Now that you understand results:

1. **[Evaluators Guide](../evaluators.md)** — Improve your evaluation strategy
2. **[Dataset Guide](../datasets.md)** — Organize your test data better
3. **[CI/CD Integration](../ci-mode.md)** — Set up automated quality gates
4. **[Configuration](../configuration.md)** — Optimize costs and settings
5. **[Next Steps](next-steps.md)** — Where to go from here

## Troubleshooting

### "No results found"

Check the `.cobalt/results/` directory exists and contains JSON files.

### "Cannot read property 'avg' of undefined"

An evaluator failed or didn't run. Check for errors in the experiment output.

### Results file is too large

Large datasets generate large result files. Consider:
- Sampling your dataset
- Reducing the number of evaluators
- Storing only summaries

---

**Next**: [Next Steps](next-steps.md) — Explore advanced features
