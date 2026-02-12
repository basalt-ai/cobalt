# Q&A Agent Example

Test a question-answering agent using Cobalt with multiple evaluators.

## Overview

This example demonstrates:
- Basic experiment structure
- Function-based evaluators (exact match, length check)
- LLM judge evaluators (factual accuracy)
- JSON dataset loading
- Multiple evaluation criteria

**Difficulty**: ⭐ Beginner

**Time to run**: ~15 seconds

**Cost**: ~$0.02

## What's Included

- `agent.ts` — Simple Q&A agent using OpenAI
- `qa-agent.cobalt.ts` — Cobalt experiment configuration
- `dataset.json` — 20 general knowledge questions
- `package.json` — Dependencies

## Prerequisites

- Node.js 18+
- OpenAI API key
- pnpm or npm

## Quick Start

```bash
# 1. Install dependencies
pnpm install

# 2. Set API key
export OPENAI_API_KEY="sk-..."

# 3. Run the experiment
pnpm test
```

## How It Works

### 1. The Agent (`agent.ts`)

A simple Q&A agent that:
- Takes a question as input
- Calls OpenAI gpt-5-mini
- Returns a concise, factual answer

### 2. The Dataset (`dataset.json`)

20 general knowledge questions covering:
- Geography (capitals, countries)
- History (dates, events)
- Science (facts, concepts)
- Mathematics (calculations)
- Literature (authors, works)

### 3. The Evaluators

**Three evaluation criteria:**

1. **contains-answer** (Function)
   - Checks if output contains expected answer
   - Pass/fail (1 or 0)
   - Fast, deterministic

2. **conciseness** (Function)
   - Checks if response is ≤50 words
   - Graduated score based on length
   - Encourages brief answers

3. **factual-accuracy** (LLM Judge)
   - Uses gpt-5-mini to judge accuracy
   - Compares answer to expected output
   - Catches paraphrasing and near-misses

## Expected Results

**Typical scores:**
- `contains-answer`: 0.95-1.00 (excellent)
- `conciseness`: 0.90-1.00 (very concise)
- `factual-accuracy`: 0.85-0.95 (accurate)

**Total cost**: ~$0.02 (20 questions + 20 LLM judge calls)

**Duration**: 10-15 seconds (concurrency: 3)

## Customization

### Change the Model

Edit `agent.ts`:

```typescript
// Current: gpt-5-mini
model: 'gpt-5-mini'

// Try: GPT-4o for better accuracy
model: 'gpt-4o'

// Try: Claude 3.5 Sonnet
// (Change to Anthropic client)
```

### Add More Questions

Edit `dataset.json`:

```json
{
  "input": "Your question here?",
  "expectedOutput": "Expected answer",
  "category": "your-category"
}
```

### Adjust Evaluators

Edit `qa-agent.cobalt.ts`:

```typescript
// Make conciseness stricter
const maxWords = 30  // was 50

// Add a new evaluator
new Evaluator({
  name: 'politeness',
  type: 'llm-judge',
  prompt: 'Rate how polite the response is (0-1)'
})
```

### Change Concurrency

```bash
# Run faster (more parallel requests)
npx cobalt run qa-agent.cobalt.ts --concurrency 10

# Run slower (avoid rate limits)
npx cobalt run qa-agent.cobalt.ts --concurrency 1
```

## Understanding Results

After running, you'll see:

```
Running experiment: qa-agent-test
Items: 20/20 completed (100%)
Duration: 12.4s

Scores:
  contains-answer:    1.00 (min: 1.00, max: 1.00)
  conciseness:        0.95 (min: 0.90, max: 1.00)
  factual-accuracy:   0.92 (min: 0.85, max: 1.00)

Total Cost: $0.02
```

**What this means:**
- ✅ All answers contain expected content (1.00)
- ✅ Answers are concise (0.95 = ~48 words avg)
- ✅ Answers are factually accurate (0.92 = very good)

## Common Issues

### Rate Limits

If you hit OpenAI rate limits:
```bash
npx cobalt run qa-agent.cobalt.ts --concurrency 1
```

### Wrong Answers

If factual-accuracy is low (<0.7):
- Check your system prompt
- Try a more capable model (gpt-4o)
- Review low-scoring questions in results

### Costs Too High

If costs are concerning:
- Reduce dataset size: `dataset.slice(0, 5)`
- Use caching: Cobalt caches by default
- Use cheaper models for evaluators

## Next Steps

After completing this example:

1. **[Summarization Example](../summarization/)** — Test document summarization
2. **[Classification Example](../classification/)** — Test text classification
3. **[Evaluator Guide](../../guides/evaluators/overview.md)** — Learn more about evaluators
4. **[Your Own Experiment](../../getting-started/first-experiment.md)** — Build from scratch

## Related Documentation

- [Evaluator Overview](../../guides/evaluators/overview.md)
- [LLM Judge Guide](../../guides/evaluators/llm-judge.md)
- [Dataset Loading](../../guides/datasets/loading-data.md)
- [Understanding Results](../../getting-started/understanding-results.md)

---

**Questions?** Check the [Troubleshooting Guide](../../troubleshooting/common-errors.md)
