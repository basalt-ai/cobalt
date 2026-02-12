# Langfuse Integration

Load datasets from [Langfuse](https://langfuse.com) into Cobalt experiments.

## Setup

Set your Langfuse credentials via environment variables:

```bash
# Option 1: API key
LANGFUSE_API_KEY=your-api-key

# Option 2: Public/Secret key pair
LANGFUSE_PUBLIC_KEY=pk-...
LANGFUSE_SECRET_KEY=sk-...
```

Or configure in `cobalt.config.ts`:

```typescript
import { defineConfig } from '@basalt-ai/cobalt'

export default defineConfig({
  langfuse: {
    apiKey: process.env.LANGFUSE_API_KEY,
    // or
    publicKey: process.env.LANGFUSE_PUBLIC_KEY,
    secretKey: process.env.LANGFUSE_SECRET_KEY,
    baseUrl: 'https://cloud.langfuse.com', // default
  },
})
```

## Usage

```typescript
import { Dataset, experiment, Evaluator } from '@basalt-ai/cobalt'

const dataset = await Dataset.fromLangfuse('my-eval-dataset')

await experiment('langfuse-test', dataset, async ({ item }) => {
  const result = await myAgent(item.input)
  return { output: result }
}, {
  evaluators: [
    new Evaluator({
      name: 'Quality',
      type: 'llm-judge',
      prompt: 'Is the output correct?\nExpected: {{expectedOutput}}\nActual: {{output}}',
    }),
  ],
})
```

### With Options

```typescript
const dataset = await Dataset.fromLangfuse('my-eval-dataset', {
  apiKey: 'custom-key',
  baseUrl: 'https://self-hosted.example.com',
})
```

## Authentication

Langfuse supports two authentication methods:

| Method | Environment Variables | Description |
|--------|----------------------|-------------|
| API Key | `LANGFUSE_API_KEY` | Bearer token authentication |
| Key Pair | `LANGFUSE_PUBLIC_KEY` + `LANGFUSE_SECRET_KEY` | Basic auth with public:secret |

Options passed directly take precedence over environment variables.

## Data Mapping

Langfuse fields are mapped to Cobalt's format:

| Langfuse Field | Cobalt Field | Notes |
|----------------|-------------|-------|
| `input` | `input` | Stringified if not a string |
| `expectedOutput` | `expectedOutput` | Stringified if not a string |
| `metadata` | `metadata` | Passed through |
| `id` | `langfuseId` | Preserved for traceability |

Additional fields from Langfuse items are passed through as-is.
