# Summarization Example

Test a document summarization agent with faithfulness and quality metrics.

## Overview

This example demonstrates:
- Document summarization testing
- Faithfulness evaluation (LLM judge)
- Quality metrics (conciseness, clarity)
- JSONL dataset format
- Multi-criteria evaluation

**Difficulty**: ⭐⭐ Intermediate

**Time to run**: ~20 seconds

**Cost**: ~$0.05

## What's Included

- `summarizer.ts` — Summarization agent using OpenAI
- `summarizer.cobalt.ts` — Experiment with faithfulness checks
- `articles.jsonl` — 10 articles to summarize (JSONL format)
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

Summarizes documents by:
- Reading full article text
- Generating concise summary (100 words)
- Preserving key facts and main points

### The Dataset

10 articles in JSONL format:
- News articles
- Blog posts
- Technical content
- Various lengths (200-1000 words)

### The Evaluators

1. **faithfulness** (LLM Judge)
   - Checks if summary is faithful to source
   - No hallucinations or fabricated facts
   - Critical for accuracy

2. **conciseness** (Function)
   - Target: 75-125 words
   - Ensures summaries aren't too long/short

3. **clarity** (LLM Judge)
   - Rates readability and coherence
   - Well-structured sentences
   - Clear communication

## Expected Results

**Typical scores:**
- `faithfulness`: 0.85-0.95 (very faithful)
- `conciseness`: 0.90-1.00 (good length)
- `clarity`: 0.85-0.95 (clear writing)

**Cost**: ~$0.05 (10 articles + 20 LLM judge calls)

## Customization

### Adjust Summary Length

Edit `summarizer.ts`:
```typescript
// Current: 100 words
maxWords: 100

// Shorter summaries
maxWords: 50

// Longer summaries
maxWords: 200
```

### Add More Articles

Add to `articles.jsonl` (one JSON object per line):
```json
{"title": "Article Title", "content": "Full article text here..."}
```

### Use Different Model

```typescript
// Try GPT-4o for better summaries
model: 'gpt-4o'
```

## Next Steps

- [Classification Example](../classification/) — Test text classification
- [RAG Pipeline Example](../rag-pipeline/) — Test retrieval systems
- [Evaluator Guide](../../guides/evaluators/llm-judge.md) — Master LLM judges
