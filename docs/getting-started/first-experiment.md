# Your First Experiment

A detailed walkthrough for creating your first Cobalt experiment from scratch.

## What You'll Build

In this guide, you'll create a complete AI testing experiment that:
- Tests a Q&A agent using OpenAI
- Evaluates responses with multiple evaluators
- Loads test data from a JSON file
- Tracks costs and performance

**Estimated Time**: 15 minutes

## Prerequisites

- Cobalt installed ([Installation Guide](installation.md))
- OpenAI API key set
- Basic TypeScript knowledge

## Project Structure

We'll create this structure:

```
my-qa-test/
├── experiments/
│   └── qa-agent.cobalt.ts    # Our experiment file
├── datasets/
│   └── questions.json         # Test data
├── src/
│   └── agent.ts               # Agent implementation
├── cobalt.config.ts
└── package.json
```

## Step 1: Create Test Data

First, create a dataset of questions with expected answers.

Create `datasets/questions.json`:

```json
[
  {
    "input": "What is the capital of France?",
    "expectedOutput": "Paris",
    "category": "geography"
  },
  {
    "input": "Who wrote '1984'?",
    "expectedOutput": "George Orwell",
    "category": "literature"
  },
  {
    "input": "What is the speed of light in meters per second?",
    "expectedOutput": "299,792,458",
    "category": "science"
  },
  {
    "input": "What year did World War II end?",
    "expectedOutput": "1945",
    "category": "history"
  },
  {
    "input": "What is the largest planet in our solar system?",
    "expectedOutput": "Jupiter",
    "category": "science"
  }
]
```

**Data Structure**:
- `input`: The question to ask the agent
- `expectedOutput`: The correct answer
- `category`: Optional metadata for filtering

## Step 2: Implement Your Agent

Create `src/agent.ts`:

```typescript
import OpenAI from 'openai'

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

export interface AgentResponse {
  answer: string
  model: string
  tokens: number
  duration: number
}

export async function answerQuestion(question: string): Promise<AgentResponse> {
  const startTime = Date.now()

  const completion = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: 'You are a helpful assistant that provides accurate, concise answers to questions. Keep answers brief and factual.'
      },
      {
        role: 'user',
        content: question
      }
    ],
    temperature: 0.1,  // Low temperature for factual answers
    max_tokens: 100
  })

  const answer = completion.choices[0].message.content || ''
  const tokens = completion.usage?.total_tokens || 0
  const duration = Date.now() - startTime

  return {
    answer,
    model: 'gpt-4o-mini',
    tokens,
    duration
  }
}
```

## Step 3: Create the Experiment

Create `experiments/qa-agent.cobalt.ts`:

```typescript
import { experiment, Evaluator, Dataset } from 'cobalt'
import { answerQuestion } from '../src/agent.js'

// Load dataset from JSON file
const dataset = Dataset.fromJSON('./datasets/questions.json')

// Define evaluators
const evaluators = [
  // Evaluator 1: Check if answer contains expected text
  new Evaluator({
    name: 'contains-answer',
    type: 'function',
    fn: ({ item, output }) => {
      const normalizedOutput = String(output).toLowerCase()
      const normalizedExpected = String(item.expectedOutput).toLowerCase()
      const contains = normalizedOutput.includes(normalizedExpected)

      return {
        score: contains ? 1 : 0,
        reason: contains
          ? `Output contains expected answer "${item.expectedOutput}"`
          : `Expected "${item.expectedOutput}" not found in output`
      }
    }
  }),

  // Evaluator 2: Check response length (should be concise)
  new Evaluator({
    name: 'conciseness',
    type: 'function',
    fn: ({ output }) => {
      const wordCount = String(output).split(/\s+/).length
      const maxWords = 50
      const score = wordCount <= maxWords ? 1 : Math.max(0, 1 - (wordCount - maxWords) / 50)

      return {
        score,
        reason: `${wordCount} words (target: ≤${maxWords})`
      }
    }
  }),

  // Evaluator 3: LLM Judge for factual accuracy
  new Evaluator({
    name: 'factual-accuracy',
    type: 'llm-judge',
    prompt: `You are evaluating a Q&A system's response for factual accuracy.

Question: {{input}}
Agent's Answer: {{output}}
Expected Answer: {{expectedOutput}}

Rate the factual accuracy from 0.0 to 1.0:
- 1.0 = Completely accurate and contains the expected information
- 0.7-0.9 = Mostly accurate but may have minor omissions
- 0.4-0.6 = Partially accurate
- 0.0-0.3 = Inaccurate or incorrect

Respond with JSON:
{
  "score": <number between 0 and 1>,
  "reason": "<explanation of your rating>"
}`,
    model: 'gpt-4o-mini',
    provider: 'openai'
  })
]

// Run the experiment
experiment('qa-agent-test', dataset, async ({ item }) => {
  // Call our agent
  const response = await answerQuestion(item.input)

  // Return output and metadata
  return {
    output: response.answer,
    metadata: {
      model: response.model,
      tokens: response.tokens,
      duration: response.duration,
      category: item.category
    }
  }
}, {
  evaluators,
  concurrency: 3,        // Run 3 questions at a time
  timeout: 30000,        // 30 second timeout per question
  tags: ['qa', 'gpt-4o-mini', 'v1']
})
```

## Step 4: Configure Your Project

Create or update `cobalt.config.ts`:

```typescript
import { defineConfig } from 'cobalt'

export default defineConfig({
  testDir: 'experiments',
  cache: {
    enabled: true,
    ttl: 86400000  // 24 hours - reuse responses for same inputs
  },
  judge: {
    model: 'gpt-4o-mini',
    provider: 'openai',
    apiKey: process.env.OPENAI_API_KEY
  },
  concurrency: 3,
  tags: ['qa-test']
})
```

## Step 5: Run the Experiment

```bash
# Make sure your API key is set
export OPENAI_API_KEY="sk-..."

# Run the experiment
npx cobalt run experiments/qa-agent.cobalt.ts
```

You should see output like:

```
Running experiment: qa-agent-test
Items: 5/5 completed (100%)
Duration: 12.4s

Scores:
  contains-answer:    1.00 (min: 1.00, max: 1.00)
  conciseness:        0.95 (min: 0.90, max: 1.00)
  factual-accuracy:   0.92 (min: 0.85, max: 1.00)

Total Cost: $0.02
Results saved to: .cobalt/results/20250206_143022_qa-agent-test.json
```

## Step 6: Review Results

### View Summary

```bash
npx cobalt history
```

This shows all your runs:

```
Recent Runs:
┌─────────────────────┬──────────────────┬──────┬─────────────┬──────────┐
│ ID                  │ Experiment       │ Items│ Duration    │ Cost     │
├─────────────────────┼──────────────────┼──────┼─────────────┼──────────┤
│ 20250206_143022     │ qa-agent-test    │ 5    │ 12.4s       │ $0.02    │
└─────────────────────┴──────────────────┴──────┴─────────────┴──────────┘
```

### View Detailed Results

```bash
npx cobalt results 20250206_143022
```

This shows item-by-item results:

```json
{
  "experimentName": "qa-agent-test",
  "timestamp": "2025-02-06T14:30:22.000Z",
  "summary": {
    "total": 5,
    "completed": 5,
    "failed": 0,
    "duration": 12400,
    "scores": {
      "contains-answer": { "avg": 1.00, "min": 1.00, "max": 1.00 },
      "conciseness": { "avg": 0.95, "min": 0.90, "max": 1.00 },
      "factual-accuracy": { "avg": 0.92, "min": 0.85, "max": 1.00 }
    },
    "totalCost": 0.02
  },
  "items": [
    {
      "input": "What is the capital of France?",
      "output": "The capital of France is Paris.",
      "scores": {
        "contains-answer": 1.0,
        "conciseness": 1.0,
        "factual-accuracy": 1.0
      },
      "metadata": {
        "model": "gpt-4o-mini",
        "tokens": 45,
        "duration": 890
      }
    },
    // ... more items
  ]
}
```

## Understanding the Results

### Scores Explained

**contains-answer: 1.00** — All answers contained the expected text

**conciseness: 0.95** — Answers were concise (average 8 words)

**factual-accuracy: 0.92** — LLM judge rated accuracy highly

### Cost Analysis

Total cost: **$0.02** for 5 questions + 5 LLM judge evaluations

Breakdown:
- Agent calls: 5 × $0.0015 = $0.0075
- LLM judge: 5 × $0.0025 = $0.0125

### Performance

- Duration: 12.4s for 5 items
- Average: 2.48s per item
- Concurrency: 3 (running 3 items in parallel)

## Improving Your Experiment

### 1. Add More Evaluators

```typescript
new Evaluator({
  name: 'answer-completeness',
  type: 'llm-judge',
  prompt: 'Rate how complete and thorough the answer is (0-1).'
})
```

### 2. Filter Dataset by Category

```typescript
const dataset = Dataset.fromJSON('./datasets/questions.json')
  .filter(item => item.category === 'science')
```

### 3. Sample for Quick Testing

```typescript
const dataset = Dataset.fromJSON('./datasets/questions.json')
  .sample(2)  // Random sample of 2 items
```

### 4. Use Multiple Runs for Stability

```typescript
experiment('qa-agent-test', dataset, runner, {
  evaluators,
  runs: 3  // Run each item 3 times and aggregate results
})
```

### 5. Add CI/CD Thresholds

In `cobalt.config.ts`:

```typescript
export default defineConfig({
  ciMode: true,
  thresholds: {
    'factual-accuracy': { avg: 0.85, p95: 0.70 },
    'contains-answer': { passRate: 0.90 }
  }
})
```

Now the CLI will exit with code 1 if thresholds fail:

```bash
npx cobalt run experiments/qa-agent.cobalt.ts
# Exit code 0 = passed, 1 = failed
```

## Next Steps

Congratulations! You've created a complete AI testing experiment. Now explore:

1. **[Understanding Results](understanding-results.md)** — Deep dive into result analysis
2. **[Multiple Evaluators](../guides/evaluators/overview.md)** — Learn about all evaluator types
3. **[Dataset Transformations](../guides/datasets/transformations.md)** — Advanced dataset manipulation
4. **[CI/CD Integration](../guides/ci-mode.md)** — Automate testing in your pipeline
5. **[Cost Optimization](../guides/cost-optimization.md)** — Reduce LLM costs with caching

## Common Issues

### "API rate limit exceeded"

**Solution**: Reduce concurrency:
```typescript
{ concurrency: 1 }
```

### "Timeout exceeded"

**Solution**: Increase timeout:
```typescript
{ timeout: 60000 }  // 60 seconds
```

### "Expected output not found"

**Solution**: The expected answer might use different wording. Consider using an LLM judge instead of exact matching.

---

**Next**: [Understanding Results](understanding-results.md) — Learn how to interpret and analyze your results
