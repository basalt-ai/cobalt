# Quickstart

Get your first Cobalt experiment running in 5 minutes.

## Prerequisites

- Node.js 18+ installed
- Basic TypeScript knowledge
- OpenAI API key (for LLM evaluation)

## Step 1: Install Cobalt

```bash
pnpm add @basalt-ai/cobalt
# or
npm install @basalt-ai/cobalt
```

## Step 2: Initialize Your Project

```bash
npx cobalt init
```

This creates:
- `experiments/` — Folder for your experiment files
- `cobalt.config.ts` — Configuration file
- `.cobalt/` — Local storage for results and cache

## Step 3: Set Your API Key

```bash
export OPENAI_API_KEY="your-api-key-here"
```

Or create a `.env` file:

```bash
OPENAI_API_KEY=your-api-key-here
```

## Step 4: Create Your First Experiment

Create `experiments/my-first-test.cobalt.ts`:

```typescript
import { experiment, Evaluator, Dataset } from '@basalt-ai/cobalt'

// 1. Define your test data
const dataset = new Dataset({
  items: [
    {
      input: 'What is the capital of France?',
      expectedOutput: 'Paris'
    },
    {
      input: 'What is 2 + 2?',
      expectedOutput: '4'
    },
    {
      input: 'Who wrote Romeo and Juliet?',
      expectedOutput: 'Shakespeare'
    }
  ]
})

// 2. Define evaluators
const evaluators = [
  new Evaluator({
    name: 'contains-answer',
    type: 'function',
    fn: ({ item, output }) => {
      const hasAnswer = String(output)
        .toLowerCase()
        .includes(String(item.expectedOutput).toLowerCase())

      return {
        score: hasAnswer ? 1 : 0,
        reason: hasAnswer
          ? 'Output contains expected answer'
          : 'Expected answer not found'
      }
    }
  })
]

// 3. Run the experiment
experiment('my-first-test', dataset, async ({ item }) => {
  // TODO: Replace this with your actual agent/LLM call
  // For now, we'll just return a simple response
  const output = `The answer is: ${item.expectedOutput}`

  return {
    output,
    metadata: {
      model: 'mock-agent',
      tokens: 50
    }
  }
}, {
  evaluators,
  concurrency: 3,
  tags: ['quickstart']
})
```

## Step 5: Run Your Experiment

```bash
npx cobalt run experiments/my-first-test.cobalt.ts
```

You should see output like:

```
Running experiment: my-first-test
Items: 3/3 completed
Duration: 1.2s

Scores:
  contains-answer: 1.00 (min: 1.00, max: 1.00)

Total Cost: $0.00
```

## Step 6: View Results

Check your results:

```bash
npx cobalt history
```

This shows all your past runs with their scores and metadata.

For detailed results:

```bash
npx cobalt results <run-id>
```

## What's Next?

Congratulations! You've run your first Cobalt experiment. Now you can:

1. **Connect a Real Agent**
   - Replace the mock runner with your actual LLM/agent code
   - See [Your First Experiment](first-experiment.md) for a detailed example

2. **Add More Evaluators**
   - Try the LLM Judge evaluator for subjective metrics
   - See [Evaluator Overview](../guides/evaluators/overview.md)

3. **Load Real Datasets**
   - Load test data from JSON, JSONL, or CSV files
   - See [Dataset Guide](../guides/datasets/loading-data.md)

4. **Set Up CI/CD**
   - Integrate Cobalt into your testing pipeline
   - See [CI/CD Integration](../guides/ci-mode.md)

5. **Use with Claude Code**
   - Connect Cobalt via MCP for AI-assisted testing
   - See [MCP Integration](../reference/mcp/overview.md)

## Common Issues

### "OpenAI API key not found"

Set your API key:
```bash
export OPENAI_API_KEY="sk-..."
```

### "Module not found"

Make sure you've installed Cobalt:
```bash
pnpm add @basalt-ai/cobalt
```

### Need more help?

- [Troubleshooting Guide](../troubleshooting/common-errors.md)
- [Full Documentation](../index.md)

## Example: Testing a Real LLM

Here's how to test an actual OpenAI call:

```typescript
import { experiment, Evaluator, Dataset } from '@basalt-ai/cobalt'
import OpenAI from 'openai'

const client = new OpenAI()

const dataset = new Dataset({
  items: [
    { input: 'Explain photosynthesis in one sentence.' },
    { input: 'What is the speed of light?' },
  ]
})

const evaluators = [
  new Evaluator({
    name: 'conciseness',
    type: 'function',
    fn: ({ output }) => {
      const wordCount = String(output).split(' ').length
      const score = wordCount <= 30 ? 1 : Math.max(0, 1 - (wordCount - 30) / 50)
      return {
        score,
        reason: `${wordCount} words (target: ≤30)`
      }
    }
  })
]

experiment('concise-llm', dataset, async ({ item }) => {
  const completion = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: 'Be concise. Answer in one sentence.' },
      { role: 'user', content: item.input }
    ],
    max_tokens: 100
  })

  const output = completion.choices[0].message.content || ''

  return {
    output,
    metadata: {
      model: 'gpt-4o-mini',
      tokens: completion.usage?.total_tokens || 0
    }
  }
}, {
  evaluators,
  concurrency: 2,
  tags: ['openai', 'concise']
})
```

Run it:

```bash
npx cobalt run experiments/concise-llm.cobalt.ts
```

---

**Next:** [Your First Experiment](first-experiment.md) — A detailed walkthrough with real examples
