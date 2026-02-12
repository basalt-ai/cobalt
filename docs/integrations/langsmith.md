# LangSmith Integration

Load datasets from [LangSmith](https://smith.langchain.com) into Cobalt experiments.

## Setup

Set your LangSmith API key:

```bash
LANGSMITH_API_KEY=your-api-key
```

Or configure in `cobalt.config.ts`:

```typescript
import { defineConfig } from '@basalt-ai/cobalt'

export default defineConfig({
  langsmith: {
    apiKey: process.env.LANGSMITH_API_KEY,
    baseUrl: 'https://api.smith.langchain.com', // default
  },
})
```

## Usage

```typescript
import { Dataset, experiment, Evaluator } from '@basalt-ai/cobalt'

const dataset = await Dataset.fromLangsmith('my-eval-dataset')

await experiment('langsmith-test', dataset, async ({ item }) => {
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
const dataset = await Dataset.fromLangsmith('my-eval-dataset', {
  apiKey: 'custom-key',
  baseUrl: 'https://custom-langsmith.example.com',
})
```

## Authentication

| Environment Variable | Description |
|---------------------|-------------|
| `LANGSMITH_API_KEY` | LangSmith API key (required) |

Options passed directly take precedence over environment variables.

## Data Mapping

LangSmith uses `inputs` and `outputs` objects. Cobalt maps them automatically:

| LangSmith Field | Cobalt Field | Notes |
|----------------|-------------|-------|
| `inputs` | `input` | Single-field objects are unwrapped; multi-field objects are stringified |
| `outputs` | `expectedOutput` | Same unwrapping logic |
| `metadata` | `metadata` | Passed through |
| `id` | `langsmithId` | Preserved for traceability |

Raw `inputs` and `outputs` objects are also available on each item for direct access.
