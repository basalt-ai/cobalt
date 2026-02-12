# Plugin System

Cobalt's plugin system allows you to extend the framework with custom evaluators tailored to your specific needs.

## Overview

Plugins enable you to:
- Create domain-specific evaluators (medical, legal, financial, etc.)
- Integrate with external APIs and services
- Implement custom LLM-based judges
- Add proprietary scoring algorithms
- Share evaluators across projects and teams

## Quick Start

### 1. Create a Plugin

The simplest plugin is a TypeScript/JavaScript file with a default export:

```typescript
// my-plugin.ts
export default {
  name: 'my-plugin',
  version: '1.0.0',
  evaluators: [
    {
      type: 'my-evaluator',
      name: 'My Custom Evaluator',
      evaluate: async (config, context) => {
        const score = /* your logic */
        return { score, reason: 'explanation' }
      }
    }
  ]
}
```

### 2. Load the Plugin

**Option A: Global Configuration**

In `cobalt.config.ts`:

```typescript
export default defineConfig({
  plugins: ['./my-plugin.ts', './another-plugin.ts']
})
```

**Option B: Per-Experiment**

```typescript
import { experiment } from '@basalt-ai/cobalt'

await experiment('test', dataset, runner, {
  evaluators: [
    new Evaluator({
      name: 'custom',
      type: 'my-evaluator', // from plugin
      /* config */
    })
  ]
})
```

## Plugin Structure

### Required Format

```typescript
import type { PluginDefinition } from '@basalt-ai/cobalt'

const plugin: PluginDefinition = {
  // Plugin metadata
  name: string,
  version: string,

  // Evaluator definitions
  evaluators: [
    {
      type: string,      // Unique identifier
      name: string,      // Human-readable name
      evaluate: EvaluatorHandler
    }
  ]
}

export default plugin
```

### Evaluator Handler

```typescript
type EvaluatorHandler = (
  config: any,           // Custom configuration
  context: EvalContext,  // Evaluation context
  apiKey?: string        // Optional API key
) => Promise<EvalResult>

interface EvalContext {
  item: ExperimentItem   // Dataset item
  output: any            // Agent output
  metadata?: any         // Additional context
}

interface EvalResult {
  score: number          // 0.0 to 1.0
  reason?: string        // Explanation (optional)
}
```

## Built-in Evaluators

Cobalt includes several built-in evaluators that demonstrate the plugin system:

### llm-judge

LLM-based evaluation with boolean (default) or scale scoring:

```typescript
// Boolean scoring (default) — pass/fail
new Evaluator({
  type: 'llm-judge',
  model: 'gpt-4o-mini',
  prompt: 'Is this output high quality? {{output}}'
})

// Scale scoring — 0.0 to 1.0
new Evaluator({
  type: 'llm-judge',
  model: 'gpt-4o-mini',
  scoring: 'scale',
  prompt: 'Rate this output for quality: {{output}}'
})
```

### similarity

Semantic similarity (embeddings):

```typescript
new Evaluator({
  type: 'similarity',
  field: 'expectedOutput',
  threshold: 0.8
})
```

### autoevals

Braintrust Autoevals integration:

```typescript
new Evaluator({
  type: 'autoevals',
  evaluatorType: 'Factuality',
  expectedField: 'expectedOutput'
})
```

Supported types: `Levenshtein`, `Factuality`, `ContextRecall`, `ContextPrecision`, `AnswerRelevancy`, `Json`, `Battle`, `Humor`, `Embedding`, `ClosedQA`, `Security`

### function

Custom JavaScript function:

```typescript
new Evaluator({
  type: 'function',
  fn: (output, item) => {
    const score = /* your logic */
    return { score, reason: 'explanation' }
  }
})
```

## Example Plugins

### Simple Pattern Matcher

```typescript
export default {
  name: 'pattern-matcher',
  version: '1.0.0',
  evaluators: [{
    type: 'contains',
    name: 'Contains Pattern',
    evaluate: async (config, context) => {
      const pattern = config.pattern
      const output = String(context.output)
      const matches = output.includes(pattern)

      return {
        score: matches ? 1 : 0,
        reason: matches
          ? `Output contains "${pattern}"`
          : `Output missing "${pattern}"`
      }
    }
  }]
}
```

### LLM-based Toxicity Detector

```typescript
export default {
  name: 'toxicity-detector',
  version: '1.0.0',
  evaluators: [{
    type: 'toxicity',
    name: 'Toxicity Detector',
    evaluate: async (config, context, apiKey) => {
      const { default: OpenAI } = await import('openai')
      const client = new OpenAI({ apiKey })

      const response = await client.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{
          role: 'user',
          content: `Rate toxicity 0-1: ${context.output}`
        }],
        response_format: { type: 'json_object' }
      })

      const result = JSON.parse(response.choices[0].message.content)

      return {
        score: 1 - result.toxicity, // Invert (higher = better)
        reason: result.explanation
      }
    }
  }]
}
```

### Multi-Evaluator Plugin

```typescript
export default {
  name: 'content-quality-suite',
  version: '1.0.0',
  evaluators: [
    {
      type: 'length-check',
      name: 'Length Validator',
      evaluate: async (config, context) => {
        const length = String(context.output).length
        const min = config.minLength || 0
        const max = config.maxLength || Infinity

        const withinRange = length >= min && length <= max
        return {
          score: withinRange ? 1 : 0,
          reason: `Length: ${length} (${min}-${max})`
        }
      }
    },
    {
      type: 'sentiment',
      name: 'Sentiment Analyzer',
      evaluate: async (config, context) => {
        // Integration with sentiment API
        const sentiment = await analyzeSentiment(context.output)
        return {
          score: sentiment.positive ? 1 : 0,
          reason: `Sentiment: ${sentiment.label}`
        }
      }
    },
    {
      type: 'grammar',
      name: 'Grammar Checker',
      evaluate: async (config, context) => {
        // Integration with grammar API
        const errors = await checkGrammar(context.output)
        const score = 1 - (errors.length * 0.1) // -0.1 per error
        return {
          score: Math.max(0, score),
          reason: `${errors.length} grammar errors`
        }
      }
    }
  ]
}
```

## Best Practices

### Error Handling

Always return a result, never throw:

```typescript
evaluate: async (config, context) => {
  try {
    const result = await expensiveOperation()
    return { score: result.score, reason: result.reason }
  } catch (error) {
    return {
      score: 0,
      reason: `Error: ${error.message}`
    }
  }
}
```

### Score Normalization

Ensure scores are always 0-1:

```typescript
evaluate: async (config, context) => {
  const rawScore = computeScore() // might be 0-100

  // Normalize to 0-1
  const score = Math.max(0, Math.min(1, rawScore / 100))

  return { score, reason: `Raw: ${rawScore}` }
}
```

### Configuration Validation

Validate config parameters:

```typescript
evaluate: async (config, context) => {
  if (!config.threshold) {
    return {
      score: 0,
      reason: 'Configuration error: threshold required'
    }
  }

  // Continue with evaluation
}
```

### Performance Optimization

Cache expensive operations:

```typescript
const cache = new Map()

export default {
  evaluators: [{
    evaluate: async (config, context) => {
      const key = context.output
      if (cache.has(key)) {
        return cache.get(key)
      }

      const result = await expensiveEval(context.output)
      cache.set(key, result)
      return result
    }
  }]
}
```

## Publishing Plugins

### 1. Package Structure

```
my-cobalt-plugin/
├── package.json
├── tsconfig.json
├── src/
│   └── index.ts
├── README.md
└── tests/
    └── index.test.ts
```

### 2. package.json

```json
{
  "name": "cobalt-plugin-myeval",
  "version": "1.0.0",
  "type": "module",
  "main": "src/index.ts",
  "peerDependencies": {
    "cobalt": ">=0.1.0"
  }
}
```

### 3. Publish to npm

```bash
pnpm publish
```

### 4. Users Install

```bash
pnpm add cobalt-plugin-myeval
```

### 5. Users Configure

```typescript
export default defineConfig({
  plugins: ['cobalt-plugin-myeval']
})
```

## Template

Use the official template to get started:

```bash
cp -r node_modules/cobalt/examples/plugin-template my-plugin
cd my-plugin
pnpm install
```

See `examples/plugin-template` for a fully commented example with multiple evaluator patterns.

## Advanced Topics

### Stateful Evaluators

Maintain state across evaluations:

```typescript
(() => {
  let callCount = 0
  const metrics = []

  return {
    type: 'stateful',
    evaluate: async (config, context) => {
      callCount++
      metrics.push(context.output.length)

      const avgLength = metrics.reduce((a, b) => a + b) / metrics.length

      return {
        score: 0.8,
        reason: `Call ${callCount}, avg length: ${avgLength}`
      }
    }
  }
})()
```

### Dynamic Imports

Load dependencies on-demand:

```typescript
evaluate: async (config, context) => {
  // Only load if needed
  const { someHeavyLibrary } = await import('heavy-lib')

  return someHeavyLibrary.evaluate(context.output)
}
```

### Accessing API Keys

API keys are passed as the third parameter:

```typescript
evaluate: async (config, context, apiKey) => {
  if (!apiKey) {
    return { score: 0, reason: 'API key required' }
  }

  const client = new SomeAPI({ apiKey })
  const result = await client.evaluate(context.output)

  return { score: result.score }
}
```

API keys come from:
1. `OPENAI_API_KEY` environment variable
2. `judge.apiKey` in config
3. Experiment options

## Troubleshooting

### Plugin Not Loading

```
Error: Plugin file not found
```

**Solution**: Use absolute paths or paths relative to `process.cwd()`

```typescript
plugins: [
  './plugins/my-plugin.ts',           // Relative to cwd
  '/absolute/path/to/plugin.ts',       // Absolute
  'node_modules/my-plugin/index.ts'    // Node module
]
```

### Evaluator Not Found

```
Error: Unknown evaluator type: my-eval
```

**Solution**: Ensure plugin is loaded before running experiments

```typescript
// Load plugins first
export default defineConfig({
  plugins: ['./my-plugin.ts']
})

// Then use in experiments
new Evaluator({ type: 'my-eval' })
```

### Type Conflicts

```typescript
// Use explicit typing
import type { PluginDefinition, EvalContext, EvalResult } from '@basalt-ai/cobalt'

const plugin: PluginDefinition = { /* ... */ }
export default plugin
```

## Resources

- **Template**: `examples/plugin-template`
- **Examples**: See built-in evaluators in `src/evaluators`
- **API Reference**: `docs/api.md`
- **Support**: GitHub Issues
