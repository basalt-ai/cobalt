# LLM Providers

Cobalt supports OpenAI and Anthropic as LLM providers for evaluation.

## Provider Auto-Detection

The provider is determined by the model name:

- Models starting with `claude` use **Anthropic**
- Everything else uses **OpenAI**

```typescript
// Uses Anthropic
new Evaluator({
  name: 'Quality',
  type: 'llm-judge',
  prompt: '...',
  model: 'claude-sonnet-4-5-20250929',
})

// Uses OpenAI
new Evaluator({
  name: 'Quality',
  type: 'llm-judge',
  prompt: '...',
  model: 'gpt-4o',
})
```

## OpenAI

Used by default for LLM judge and similarity evaluators.

### Supported Models

Any model available through the OpenAI chat completions API, including:

- `gpt-5-mini` (default)
- `gpt-4o`
- `gpt-4-turbo`
- `o1`, `o1-mini`

### API Key

```bash
export OPENAI_API_KEY="sk-..."
```

Or in `cobalt.config.ts`:

```typescript
export default defineConfig({
  judge: {
    model: 'gpt-5-mini',
    provider: 'openai',
    apiKey: process.env.OPENAI_API_KEY,
  },
})
```

### Features

- JSON mode (`response_format: { type: 'json_object' }`) for reliable structured output
- Temperature set to 0.2 for consistent evaluations
- Used for both LLM judge evaluators and similarity evaluators (embeddings via `text-embedding-3-small`)

## Anthropic

Used when the model name starts with `claude`.

### Supported Models

Any model available through the Anthropic messages API, including:

- `claude-sonnet-4-5-20250929`
- `claude-haiku-4-5-20251001`
- `claude-opus-4-6`

### API Key

```bash
export ANTHROPIC_API_KEY="sk-ant-..."
```

Or in `cobalt.config.ts`:

```typescript
export default defineConfig({
  judge: {
    model: 'claude-sonnet-4-5-20250929',
    provider: 'anthropic',
    apiKey: process.env.ANTHROPIC_API_KEY,
  },
})
```

### Features

- System prompt via `system` parameter
- Max tokens set to 1024 for evaluations
- Temperature set to 0.2 for consistent evaluations

## Per-Evaluator Model Override

Each evaluator can use a different model, regardless of the default:

```typescript
await experiment('test', dataset, runner, {
  evaluators: [
    new Evaluator({
      name: 'Quick Check',
      type: 'llm-judge',
      prompt: 'Is this correct? {{output}}',
      model: 'gpt-5-mini',        // Fast, cheap
    }),
    new Evaluator({
      name: 'Deep Analysis',
      type: 'llm-judge',
      prompt: 'Analyze the quality in detail...',
      model: 'claude-opus-4-6',      // Thorough
    }),
  ],
})
```

## Adding More Providers

Want support for additional providers (Gemini, Mistral, etc.)? [Open an issue](https://github.com/basalt-ai/cobalt/issues) on GitHub.
