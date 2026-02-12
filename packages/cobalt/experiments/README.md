# Cobalt Experiments

This folder contains example experiments demonstrating Cobalt's features.

## Available Experiments

### 1. Multi-Runs Demo (No API Key Required) ⭐

**File**: `multi-runs-demo.cobalt.ts`

Demonstrates the **Multiple Runs** feature with a non-deterministic agent.

```bash
pnpm cobalt run experiments/multi-runs-demo.cobalt.ts
```

**What it shows**:
- Running each dataset item 10 times
- Statistical aggregation (mean, stddev, min, max, p50, p95)
- Variance analysis for non-deterministic agents
- No external API keys needed

**Perfect for**: Testing the multiple runs feature quickly

---

### 2. P2 Features Full Demo (Requires OpenAI API Key)

**File**: `p2-demo.cobalt.ts`

Comprehensive demo of both P2 features: **Similarity Evaluator** + **Multiple Runs**.

```bash
export OPENAI_API_KEY="your-key-here"
pnpm cobalt run experiments/p2-demo.cobalt.ts
```

**What it shows**:
- Similarity evaluator with embeddings (semantic comparison)
- Threshold vs raw similarity modes
- Multiple runs with variance analysis
- Comparison between similarity and exact-match evaluators

**Perfect for**: Seeing both P2 features working together

---

## Quick Start

### 1. Run the simple demo (no setup required):

```bash
pnpm cobalt run experiments/multi-runs-demo.cobalt.ts
```

### 2. Run the full demo (requires OpenAI API key):

```bash
# Set your API key
export OPENAI_API_KEY="sk-..."

# Run the experiment
pnpm cobalt run experiments/p2-demo.cobalt.ts
```

### 3. View results in dashboard:

```bash
pnpm cobalt serve
# Open http://localhost:4000
```

---

## Understanding the Output

### Multiple Runs Statistics

When you use `runs > 1`, Cobalt calculates these statistics per evaluator:

- **Mean**: Average score across all runs
- **StdDev**: Standard deviation (measures variance)
  - Low (< 0.1): Very consistent
  - Medium (0.1-0.3): Some variance
  - High (> 0.3): High variance
- **Min/Max**: Range of scores
- **P50 (Median)**: Middle value (more robust than mean)
- **P95**: 95th percentile (identifies outliers)

### Example Output

```
📊 Item 1: "low" (target: 15)

   All 10 Results:
   12, 18, 23, 15, 9, 27, 14, 21, 16, 19

   Evaluator Statistics:

     in-range:
       Mean:       1.000
       Std Dev:    0.000
       Min:        1.000
       Max:        1.000
       Median:     1.000
       95th %ile:  1.000
       Variance:   LOW (very consistent)

     distance-from-target:
       Mean:       0.924
       Std Dev:    0.048
       Min:        0.880
       Max:        1.000
       Median:     0.930
       95th %ile:  0.990
       Variance:   LOW (very consistent)
```

---

## Creating Your Own Experiments

### Basic Template

```typescript
import { experiment, Evaluator, Dataset } from '@basalt-ai/cobalt'

const dataset = new Dataset({
  items: [
    { input: 'test 1', expectedOutput: 'result 1' },
    { input: 'test 2', expectedOutput: 'result 2' }
  ]
})

const evaluators = [
  new Evaluator({
    name: 'my-evaluator',
    type: 'function',
    fn: ({ item, output }) => ({
      score: 1.0,
      reason: 'Perfect!'
    })
  })
]

experiment('my-experiment', dataset, async ({ item }) => {
  // Your agent logic here
  return { output: 'result' }
}, {
  evaluators,
  runs: 5  // Run each item 5 times
})
```

### Using Similarity Evaluator

```typescript
new Evaluator({
  name: 'semantic-similarity',
  type: 'similarity',
  field: 'expectedOutput',
  threshold: 0.85  // Optional: binary scoring
})
```

**Requires**: `OPENAI_API_KEY` environment variable

---

## Tips

### 1. Start Simple
Run `multi-runs-demo.cobalt.ts` first to understand multiple runs without needing API keys.

### 2. Test Variance
Use `runs: 10` or more to get reliable statistics on non-deterministic agents.

### 3. Use Similarity for Semantics
Traditional exact-match fails when wording differs but meaning is the same.
Similarity evaluator solves this with embeddings.

### 4. Combine Evaluators
Use multiple evaluators together:
- Similarity for semantic correctness
- Function for format/structure checks
- LLM judge for subjective quality

### 5. View History
Use `pnpm cobalt history` to see past runs and compare results over time.

---

## Next Steps

1. ✅ Run the demos
2. 📝 Modify them for your use case
3. 🎯 Create your own evaluators
4. 📊 View results in dashboard: `pnpm cobalt serve`
5. 📈 Compare runs: `pnpm cobalt compare <id1> <id2>`

---

## Troubleshooting

### "OpenAI API key is required"
Set your API key: `export OPENAI_API_KEY="sk-..."`

### "Module not found"
Make sure you're in the cobalt package directory:
```bash
cd packages/cobalt
pnpm install
```

### "Command not found: cobalt"
Use pnpm to run: `pnpm cobalt run ...`

---

## Learn More

- [Main README](../README.md)
- [API Documentation](../.memory/documentation.md)
- [Implementation Guide](../CLAUDE.md)
