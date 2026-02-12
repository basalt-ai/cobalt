# Braintrust Integration

Load datasets from [Braintrust](https://www.braintrust.dev) into Cobalt experiments.

## Setup

Set your Braintrust API key:

```bash
BRAINTRUST_API_KEY=your-api-key
```

Or configure in `cobalt.config.ts`:

```typescript
import { defineConfig } from '@basalt-ai/cobalt'

export default defineConfig({
  braintrust: {
    apiKey: process.env.BRAINTRUST_API_KEY,
    baseUrl: 'https://api.braintrust.dev', // default
  },
})
```

## Usage

Braintrust datasets are scoped to a project, so both `projectName` and `datasetName` are required:

```typescript
import { Dataset, experiment, Evaluator } from '@basalt-ai/cobalt'

const dataset = await Dataset.fromBraintrust('my-project', 'my-eval-dataset')

await experiment('braintrust-test', dataset, async ({ item }) => {
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
const dataset = await Dataset.fromBraintrust('my-project', 'my-eval-dataset', {
  apiKey: 'custom-key',
  baseUrl: 'https://custom-braintrust.example.com',
})
```

## Authentication

| Environment Variable | Description |
|---------------------|-------------|
| `BRAINTRUST_API_KEY` | Braintrust API key (required) |

Options passed directly take precedence over environment variables.

## Data Mapping

| Braintrust Field | Cobalt Field | Notes |
|-----------------|-------------|-------|
| `input` | `input` | Stringified if not a string |
| `expected` | `expectedOutput` | Braintrust uses `expected` instead of `expectedOutput` |
| `metadata` | `metadata` | Passed through |
| `tags` | `metadata.tags` | Merged into metadata |
| `id` | `braintrustId` | Preserved for traceability |

Additional fields from Braintrust records are passed through as-is.
