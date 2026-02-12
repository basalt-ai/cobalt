# Cobalt Evaluator Plugin Template

This template provides a starting point for creating custom evaluators for [Cobalt](https://github.com/yourusername/cobalt), the AI testing framework.

## What are Plugins?

Plugins extend Cobalt with custom evaluation logic. Use plugins to:

- **Domain-specific metrics**: Medical accuracy, legal compliance, financial regulations
- **Custom algorithms**: Proprietary scoring methods, business logic
- **External integrations**: Third-party APIs, validation services
- **Specialized evaluators**: LLM-based judges, embedding similarity, custom ML models

## Quick Start

### 1. Copy this template

```bash
cp -r examples/plugin-template my-custom-plugin
cd my-custom-plugin
```

### 2. Install dependencies

```bash
pnpm install
```

### 3. Customize the plugin

Edit `src/index.ts`:

```typescript
export default {
  name: 'my-plugin',
  version: '1.0.0',
  evaluators: [
    {
      type: 'my-evaluator',
      name: 'My Custom Evaluator',
      evaluate: async (config, context) => {
        // Your evaluation logic here
        return {
          score: 0.8,
          reason: 'Evaluation explanation'
        }
      }
    }
  ]
}
```

### 4. Use in experiments

**Option A: Configure globally**

In `cobalt.config.ts`:

```typescript
export default defineConfig({
  plugins: ['./my-custom-plugin/src/index.ts']
})
```

**Option B: Load in experiment file**

```typescript
import { experiment, Evaluator } from '@basalt-ai/cobalt'

await experiment('test', dataset, runner, {
  evaluators: [
    new Evaluator({
      name: 'my-eval',
      type: 'my-evaluator', // From your plugin
      // Custom config passed to evaluate()
      threshold: 0.8
    })
  ]
})
```

## Plugin Structure

### Required Format

```typescript
import type { PluginDefinition } from '@basalt-ai/cobalt'

const plugin: PluginDefinition = {
  name: string          // Plugin identifier
  version: string       // Semantic version
  evaluators: [         // Array of evaluators
    {
      type: string      // Unique evaluator type
      name: string      // Human-readable name
      evaluate: async (config, context, apiKey?) => {
        return {
          score: number,  // 0.0 to 1.0
          reason?: string // Optional explanation
        }
      }
    }
  ]
}

export default plugin
```

### Evaluate Function Signature

```typescript
async function evaluate(
  config: any,           // Custom configuration from experiment
  context: EvalContext,  // Evaluation context
  apiKey?: string        // Optional API key from environment
): Promise<EvalResult>

interface EvalContext {
  item: ExperimentItem   // Dataset item being evaluated
  output: any            // Agent's output
  metadata?: any         // Optional additional context
}

interface EvalResult {
  score: number          // Must be 0-1
  reason?: string        // Optional explanation
}
```

## Examples

### Simple Keyword Matcher

```typescript
{
  type: 'keyword-match',
  name: 'Keyword Matcher',
  evaluate: async (config, context) => {
    const keywords = config.keywords || []
    const output = String(context.output).toLowerCase()

    const matches = keywords.filter(kw =>
      output.includes(kw.toLowerCase())
    )

    return {
      score: matches.length / keywords.length,
      reason: `Matched ${matches.length}/${keywords.length} keywords`
    }
  }
}
```

### LLM-based Judge

```typescript
{
  type: 'llm-judge',
  name: 'Custom LLM Judge',
  evaluate: async (config, context, apiKey) => {
    const { default: OpenAI } = await import('openai')
    const client = new OpenAI({ apiKey })

    const response = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{
        role: 'user',
        content: `Rate this output 0-1: ${context.output}`
      }]
    })

    const score = parseFloat(response.choices[0].message.content)

    return { score, reason: 'LLM evaluation' }
  }
}
```

### External API Integration

```typescript
{
  type: 'api-validator',
  name: 'External Validator',
  evaluate: async (config, context) => {
    const response = await fetch(config.apiEndpoint, {
      method: 'POST',
      body: JSON.stringify({ output: context.output })
    })

    const data = await response.json()

    return {
      score: data.score,
      reason: data.message
    }
  }
}
```

## Best Practices

### ✅ DO

- **Return scores between 0 and 1**: `0` = failure, `1` = perfect
- **Handle errors gracefully**: Return `{ score: 0, reason: error }` instead of throwing
- **Provide clear reasons**: Explain why a score was given
- **Use TypeScript**: Better developer experience and type safety
- **Cache expensive operations**: Avoid repeated API calls
- **Validate inputs**: Check config and context values
- **Write tests**: Unit test your evaluators

### ❌ DON'T

- **Don't throw errors**: Always return a result object
- **Don't return scores outside 0-1**: Clamp or normalize
- **Don't make blocking calls**: Use async/await properly
- **Don't skip error handling**: Always wrap in try-catch
- **Don't hardcode values**: Accept configuration parameters

## Testing Your Plugin

Create `src/index.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import plugin from './index.js'

describe('My Plugin', () => {
  it('should have correct metadata', () => {
    expect(plugin.name).toBe('my-plugin')
    expect(plugin.version).toBe('1.0.0')
    expect(plugin.evaluators).toHaveLength(1)
  })

  it('should evaluate correctly', async () => {
    const evaluator = plugin.evaluators[0]

    const result = await evaluator.evaluate(
      { /* config */ },
      {
        item: { input: 'test' },
        output: 'test output'
      }
    )

    expect(result.score).toBeGreaterThanOrEqual(0)
    expect(result.score).toBeLessThanOrEqual(1)
  })
})
```

## Publishing

To share your plugin:

1. **Publish to npm**:
   ```bash
   pnpm publish
   ```

2. **Users install**:
   ```bash
   pnpm add your-plugin-name
   ```

3. **Users configure**:
   ```typescript
   export default defineConfig({
     plugins: ['your-plugin-name']
   })
   ```

## Advanced Topics

### Stateful Evaluators

Use closures to maintain state:

```typescript
(() => {
  const cache = new Map()

  return {
    type: 'cached-eval',
    evaluate: async (config, context) => {
      if (cache.has(context.output)) {
        return cache.get(context.output)
      }

      const result = { score: 0.8 }
      cache.set(context.output, result)
      return result
    }
  }
})()
```

### Multiple Evaluators

One plugin can provide multiple evaluators:

```typescript
export default {
  name: 'my-suite',
  evaluators: [
    { type: 'eval-1', ... },
    { type: 'eval-2', ... },
    { type: 'eval-3', ... }
  ]
}
```

### Dynamic Imports

Load dependencies only when needed:

```typescript
evaluate: async (config, context) => {
  const { someLibrary } = await import('heavy-library')
  return someLibrary.evaluate(context.output)
}
```

## Support

- **Documentation**: [Cobalt Docs](https://cobalt.dev)
- **Issues**: [GitHub Issues](https://github.com/yourusername/cobalt/issues)
- **Examples**: See `/examples` folder

## License

MIT
