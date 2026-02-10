# RAG Pipeline Example

Test a Retrieval-Augmented Generation (RAG) system with context evaluation.

## Overview

This example demonstrates:
- RAG system testing
- Context relevance evaluation
- Answer faithfulness checking
- Multi-step agent workflow
- Advanced evaluation strategies

**Difficulty**: ⭐⭐⭐ Advanced

**Time to run**: ~25 seconds

**Cost**: ~$0.08

## What's Included

- `rag-agent.ts` — Simple RAG implementation
- `rag.cobalt.ts` — Context and answer evaluation
- `knowledge-base.json` — Sample documents
- `queries.json` — Test queries
- `package.json` — Dependencies

## Quick Start

```bash
pnpm install
export OPENAI_API_KEY="sk-..."
pnpm test
```

## How It Works

### The RAG System

1. **Retrieval**: Find relevant documents for query
2. **Augmentation**: Add context to prompt
3. **Generation**: Generate answer using context

### The Evaluators

1. **context-relevance** (LLM Judge)
   - Are retrieved documents relevant?
   - Prevents bad retrieval

2. **answer-faithfulness** (LLM Judge)
   - Is answer grounded in context?
   - No hallucinations beyond context

3. **answer-relevance** (LLM Judge)
   - Does answer address the query?
   - Complete and helpful response

## Expected Results

**Typical scores:**
- `context-relevance`: 0.80-0.95
- `answer-faithfulness`: 0.85-0.95
- `answer-relevance`: 0.85-0.95

**Cost**: ~$0.08

## Key Concepts

- **Context Precision**: Quality of retrieved docs
- **Answer Grounding**: Faithfulness to context
- **End-to-End Quality**: Final answer relevance

This example shows how to evaluate each stage of a RAG pipeline independently.
