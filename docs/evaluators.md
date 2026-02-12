# Evaluators

Evaluators score your agent's outputs. Cobalt provides four built-in types and supports custom evaluators via plugins.

Every evaluator returns an `EvalResult`:

```typescript
{ score: number; reason?: string; chainOfThought?: string }
```

Evaluators never throw. On failure they return `{ score: 0, reason: "error message" }`.

## Quick Reference

| Type | Use Case | Requires API Key |
|------|----------|-----------------|
| `llm-judge` | Natural language criteria evaluated by an LLM | Yes (OpenAI or Anthropic) |
| `function` | Custom TypeScript logic | No |
| `similarity` | Semantic similarity via embeddings | Yes (OpenAI) |
| `autoevals` | Pre-built evaluators from Braintrust Autoevals | Varies |

## Creating Evaluators

```typescript
import { Evaluator } from '@basalt-ai/cobalt'

const evaluator = new Evaluator({
  name: 'Accuracy',
  type: 'llm-judge',
  prompt: 'Is this output accurate? {{output}}',
})
```

If `type` is omitted, defaults to `'llm-judge'`. You can also pass raw config objects directly in `experiment({ evaluators: [...] })`.

---

## LLM Judge

Uses an LLM to evaluate outputs. Supports template variables: `{{input}}`, `{{output}}`, `{{expectedOutput}}`, and any dataset item field.

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `prompt` | `string` | *required* | Evaluation prompt with template variables |
| `model` | `string` | `'gpt-5-mini'` | Model to use |
| `scoring` | `'boolean' \| 'scale'` | `'boolean'` | Scoring mode |
| `chainOfThought` | `boolean` | `true` for boolean, `false` for scale | Step-by-step reasoning |
| `context` | `(ctx) => ctx` | -- | Custom context mapping |

Provider is auto-detected: `claude*` -> Anthropic, everything else -> OpenAI.

### Boolean (Pass/Fail)

```typescript
new Evaluator({
  name: 'Correctness',
  type: 'llm-judge',
  prompt: 'Does the output correctly answer the question?\nQuestion: {{input}}\nExpected: {{expectedOutput}}\nActual: {{output}}',
  scoring: 'boolean',
})
```

### Scale (0.0 - 1.0)

```typescript
new Evaluator({
  name: 'Quality',
  type: 'llm-judge',
  prompt: 'Rate the quality from 0 to 1.\nQuestion: {{input}}\nResponse: {{output}}',
  scoring: 'scale',
  model: 'gpt-4o',
})
```

---

## Function Evaluator

Run custom TypeScript logic. Supports sync and async functions. Score must be between 0 and 1.

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `fn` | `(ctx: EvalContext) => EvalResult \| Promise<EvalResult>` | *required* | Evaluation function |
| `context` | `(ctx) => ctx` | -- | Custom context mapping |

```typescript
new Evaluator({
  name: 'Length Check',
  type: 'function',
  fn: ({ output }) => {
    const words = String(output).split(' ').length
    return {
      score: words <= 100 ? 1 : 0,
      reason: `${words} words`,
    }
  },
})
```

---

## Similarity Evaluator

Computes semantic similarity using OpenAI embeddings (`text-embedding-3-small`).

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `field` | `string` | *required* | Dataset item field to compare against |
| `threshold` | `number` | -- | Pass/fail threshold (returns 1 or 0) |
| `distance` | `'cosine' \| 'dot'` | `'cosine'` | Distance metric |

```typescript
new Evaluator({
  name: 'Semantic Similarity',
  type: 'similarity',
  field: 'expectedOutput',
  threshold: 0.85,
})
```

---

## Autoevals

Integrates with [Braintrust Autoevals](https://github.com/braintrustdata/autoevals). Dynamically imported only when used.

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `evaluatorType` | `string` | *required* | One of the types below |
| `options` | `Record<string, any>` | -- | Options passed to autoevals |
| `expectedField` | `string` | `'expectedOutput'` | Expected output field name |

### Available Types

| Type | Description |
|------|-------------|
| `Levenshtein` | Edit distance |
| `Factuality` | Fact checking |
| `ContextRecall` | Context retrieval quality |
| `ContextPrecision` | Context relevance |
| `AnswerRelevancy` | Answer quality |
| `Json` | JSON validation |
| `Battle` | Comparative evaluation |
| `Humor` | Humor detection |
| `Embedding` | Embedding similarity |
| `ClosedQA` | Closed-form QA |
| `Security` | Security assessment |

```typescript
new Evaluator({
  name: 'Factuality',
  type: 'autoevals',
  evaluatorType: 'Factuality',
  expectedField: 'expectedOutput',
})
```

---

## Custom Context Mapping

Both `llm-judge` and `function` evaluators support a `context` option to remap fields:

```typescript
new Evaluator({
  name: 'Custom Context',
  type: 'llm-judge',
  prompt: 'Is this a good summary? Article: {{article}} Summary: {{output}}',
  context: (ctx) => ({
    ...ctx,
    item: { ...ctx.item, article: ctx.item.body },
  }),
})
```

---

## Plugin Evaluators

Extend Cobalt with custom evaluator types via the plugin system. See [Plugin System](./plugins.md) for details.

```typescript
// cobalt.config.ts
export default defineConfig({
  plugins: ['./my-plugin.ts'],
})
```
