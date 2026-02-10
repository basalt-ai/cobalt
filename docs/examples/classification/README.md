# Classification Example

Test a text classification agent with accuracy metrics and CSV data.

## Overview

This example demonstrates:
- Text classification testing
- CSV dataset loading
- Accuracy and precision metrics
- Confusion matrix analysis
- Simple, deterministic evaluation

**Difficulty**: ⭐ Beginner

**Time to run**: ~10 seconds

**Cost**: ~$0.01

## What's Included

- `classifier.ts` — Sentiment classifier using OpenAI
- `classifier.cobalt.ts` — Accuracy testing experiment
- `data.csv` — 50 text samples with labels
- `package.json` — Dependencies

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

### The Agent

Classifies text sentiment as:
- `POSITIVE` - Positive sentiment
- `NEGATIVE` - Negative sentiment
- `NEUTRAL` - Neutral sentiment

### The Dataset

50 samples in CSV format:
- Product reviews
- Social media posts
- Customer feedback
- Pre-labeled for evaluation

### The Evaluators

1. **accuracy** (Function)
   - Exact match: predicted == expected
   - Binary score (1 or 0)

2. **confidence** (Function)
   - Checks model confidence scores
   - Flags low-confidence predictions

## Expected Results

**Typical scores:**
- `accuracy`: 0.85-0.95 (very accurate)
- `confidence`: 0.90-1.00 (high confidence)

**Cost**: ~$0.01 (50 classifications)

## Customization

### Add More Classes

Edit `classifier.ts`:
```typescript
// Current: POSITIVE | NEGATIVE | NEUTRAL
// Add more:
type Sentiment = 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL' | 'MIXED' | 'UNCERTAIN'
```

### Use Your Own Data

Create `data.csv`:
```csv
text,expected_label
"Your text here","YOUR_LABEL"
```

## Next Steps

- [RAG Pipeline](../rag-pipeline/) — Test retrieval systems
- [Multi-Agent](../multi-agent/) — Test agent workflows
