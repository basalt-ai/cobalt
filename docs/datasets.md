# Datasets

The `Dataset` class loads, transforms, and passes test data to experiments. All transformations are immutable and chainable.

## Creating Datasets Inline

```typescript
import { Dataset } from '@basalt-ai/cobalt'

const dataset = new Dataset({
  items: [
    { input: 'What is 2+2?', expectedOutput: '4' },
    { input: 'Capital of France?', expectedOutput: 'Paris' },
  ],
})
```

Each item is a plain object (`Record<string, any>`). Use whatever keys your runner expects.

## Loading from Files

### Auto-detect format

```typescript
const dataset = Dataset.fromFile('./data/questions.csv')
```

Picks the loader based on file extension (`.json`, `.jsonl`, `.csv`). Falls back to JSON if unrecognized.

### JSON

Accepts a JSON array or an object with an `items` property:

```typescript
const dataset = Dataset.fromJSON('./data/questions.json')
```

### JSONL

One JSON object per line:

```typescript
const dataset = Dataset.fromJSONL('./data/questions.jsonl')
```

### CSV

First row is treated as headers. Quoted values are supported. All values are loaded as strings.

```typescript
const dataset = Dataset.fromCSV('./data/questions.csv')
```

## Loading from Remote Sources

### HTTP/HTTPS

```typescript
const dataset = await Dataset.fromRemote('https://example.com/datasets/qa.json')
```

Format is detected by content-type header or URL extension. Supports JSON and JSONL.

### Platform Integrations

| Loader | Signature | Env Variables |
|--------|-----------|---------------|
| **Langfuse** | `Dataset.fromLangfuse(datasetName, options?)` | `LANGFUSE_API_KEY` or `LANGFUSE_PUBLIC_KEY` + `LANGFUSE_SECRET_KEY` |
| **LangSmith** | `Dataset.fromLangsmith(datasetName, options?)` | `LANGSMITH_API_KEY` |
| **Braintrust** | `Dataset.fromBraintrust(projectName, datasetName, options?)` | `BRAINTRUST_API_KEY` |
| **Basalt** | `Dataset.fromBasalt(datasetId, options?)` | `BASALT_API_KEY` |

All platform loaders return `Promise<Dataset>` and read credentials from options first, then env vars.

```typescript
const dataset = await Dataset.fromLangfuse('my-eval-set')
const dataset = await Dataset.fromBraintrust('my-project', 'my-eval-set')
const dataset = await Dataset.fromBasalt('dataset-123')
```

See [integration docs](./integrations/) for setup details per platform.

## Transformations

Every transformation returns a new `Dataset`.

```typescript
const prepared = Dataset.fromFile('./data/questions.json')
  .filter((item) => item.difficulty === 'hard')
  .map((item) => ({ ...item, input: item.input.trim() }))
  .sample(50)
```

| Method | Description |
|--------|-------------|
| `map(fn)` | Transform each item. `fn` receives `(item, index)`. |
| `filter(predicate)` | Keep items where predicate returns `true`. |
| `sample(n)` | Random sample of `n` items. |
| `slice(start, end?)` | Contiguous slice, same as `Array.slice`. |

## API Reference

| Method | Returns | Async |
|--------|---------|-------|
| `new Dataset({ items })` | `Dataset` | No |
| `Dataset.fromFile(path)` | `Dataset` | No |
| `Dataset.fromJSON(path)` | `Dataset` | No |
| `Dataset.fromJSONL(path)` | `Dataset` | No |
| `Dataset.fromCSV(path)` | `Dataset` | No |
| `Dataset.fromRemote(url)` | `Promise<Dataset>` | Yes |
| `Dataset.fromLangfuse(name, opts?)` | `Promise<Dataset>` | Yes |
| `Dataset.fromLangsmith(name, opts?)` | `Promise<Dataset>` | Yes |
| `Dataset.fromBraintrust(project, name, opts?)` | `Promise<Dataset>` | Yes |
| `Dataset.fromBasalt(id, opts?)` | `Promise<Dataset>` | Yes |
| `getItems()` | `T[]` | No |
| `length` (getter) | `number` | No |
