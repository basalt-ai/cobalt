# Configuration

Cobalt is configured via a `cobalt.config.ts` file in your project root.

## Config File

```typescript
import { defineConfig } from '@basalt-ai/cobalt'

export default defineConfig({
  // All options shown with defaults
  testDir: './experiments',
  testMatch: ['**/*.cobalt.ts', '**/*.experiment.ts'],
  judge: {
    model: 'gpt-4o-mini',
    provider: 'openai',
    apiKey: process.env.OPENAI_API_KEY,
  },
  concurrency: 5,
  timeout: 30_000,
  reporters: ['cli', 'json'],
  dashboard: {
    port: 4000,
    open: true,
  },
  cache: {
    enabled: true,
    ttl: '7d',
  },
  plugins: [],
})
```

Cobalt searches for config files in the following order: `cobalt.config.ts`, `cobalt.config.js`, `cobalt.config.mjs`, `cobalt.config.json`. It walks up from the current directory to find the nearest config file.

---

## Full Reference

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `testDir` | `string` | `'./experiments'` | Directory containing experiment files |
| `testMatch` | `string[]` | `['**/*.cobalt.ts', '**/*.experiment.ts']` | Glob patterns for experiment files |
| `judge.model` | `string` | `'gpt-4o-mini'` | Default model for LLM judge evaluators |
| `judge.provider` | `'openai' \| 'anthropic'` | `'openai'` | Default LLM provider |
| `judge.apiKey` | `string` | `process.env.OPENAI_API_KEY` | API key for the judge provider |
| `concurrency` | `number` | `5` | Max parallel executions |
| `timeout` | `number` | `30000` | Per-item timeout in milliseconds |
| `reporters` | `ReporterType[]` | `['cli', 'json']` | Output reporters |
| `dashboard.port` | `number` | `4000` | Dashboard server port |
| `dashboard.open` | `boolean` | `true` | Auto-open browser on `cobalt serve` |
| `cache.enabled` | `boolean` | `true` | Enable LLM response caching |
| `cache.ttl` | `string` | `'7d'` | Cache time-to-live |
| `env` | `Record<string, string>` | -- | Environment variable overrides |
| `thresholds` | `ThresholdConfig` | -- | Default CI quality thresholds |
| `plugins` | `string[]` | `[]` | Paths to custom evaluator plugins |

### Reporter Types

| Reporter | Description |
|----------|-------------|
| `'cli'` | Pretty-printed terminal output with progress |
| `'json'` | Saves full results to `.cobalt/data/results/` |
| `'github-actions'` | GitHub Actions annotations |

---

## Integration Configs

Configure credentials for remote dataset loaders in the config file.

### Langfuse

```typescript
langfuse: {
  apiKey: string,        // or LANGFUSE_API_KEY env var
  publicKey: string,     // or LANGFUSE_PUBLIC_KEY env var
  secretKey: string,     // or LANGFUSE_SECRET_KEY env var
  baseUrl: string,       // default: 'https://cloud.langfuse.com'
}
```

### LangSmith

```typescript
langsmith: {
  apiKey: string,        // or LANGSMITH_API_KEY env var
  baseUrl: string,       // default: 'https://api.smith.langchain.com'
}
```

### Braintrust

```typescript
braintrust: {
  apiKey: string,        // or BRAINTRUST_API_KEY env var
  baseUrl: string,       // default: 'https://api.braintrust.dev'
}
```

### Basalt

```typescript
basalt: {
  apiKey: string,        // or BASALT_API_KEY env var
  baseUrl: string,       // default: 'https://api.basalt.ai'
}
```

---

## `.cobalt/` Directory

Cobalt stores local data in a `.cobalt/` directory:

```
.cobalt/
├── SKILLS.md          # AI assistant instructions (auto-generated)
├── .gitignore         # Ignores data/ directory
└── data/
    ├── results/       # JSON experiment results
    ├── cache/         # LLM response cache
    └── history.db     # SQLite run history
```

The `data/` directory is gitignored by default. The `SKILLS.md` file should be committed so AI assistants can read it.

---

## Environment Variables

| Variable | Description |
|----------|-------------|
| `OPENAI_API_KEY` | OpenAI API key (for LLM judge and similarity evaluators) |
| `ANTHROPIC_API_KEY` | Anthropic API key (for Claude-based LLM judges) |
| `LANGFUSE_API_KEY` | Langfuse API key |
| `LANGFUSE_PUBLIC_KEY` | Langfuse public key |
| `LANGFUSE_SECRET_KEY` | Langfuse secret key |
| `LANGSMITH_API_KEY` | LangSmith API key |
| `BRAINTRUST_API_KEY` | Braintrust API key |
| `BASALT_API_KEY` | Basalt API key |
