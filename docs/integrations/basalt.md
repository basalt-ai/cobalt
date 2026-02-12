# Basalt Integration

Load datasets from [Basalt](https://basalt.ai) into Cobalt experiments.

## Setup

Set your Basalt API key:

```bash
BASALT_API_KEY=your-api-key
```

Or configure in `cobalt.config.ts`:

```typescript
import { defineConfig } from '@basalt-ai/cobalt'

export default defineConfig({
  basalt: {
    apiKey: process.env.BASALT_API_KEY,
    baseUrl: 'https://api.basalt.ai', // default
  },
})
```

## Usage

Basalt datasets are loaded by ID:

```typescript
import { Dataset, experiment, Evaluator } from '@basalt-ai/cobalt'

const dataset = await Dataset.fromBasalt('dataset-123')

await experiment('basalt-test', dataset, async ({ item }) => {
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
const dataset = await Dataset.fromBasalt('dataset-123', {
  apiKey: 'custom-key',
  baseUrl: 'https://custom-basalt.example.com',
})
```

## Authentication

| Environment Variable | Description |
|---------------------|-------------|
| `BASALT_API_KEY` | Basalt API key (required) |

Options passed directly take precedence over environment variables.

## Data Mapping

| Basalt Field | Cobalt Field | Notes |
|-------------|-------------|-------|
| `input` | `input` | Stringified if not a string |
| `output` | `expectedOutput` | Basalt uses `output` instead of `expectedOutput` |
| `metadata` | `metadata` | Passed through |
| `id` | `basaltId` | Preserved for traceability |

Additional fields from Basalt items are passed through as-is.
