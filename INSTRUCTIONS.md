# cobalt — AI Agent Testing Framework

## Vision

cobalt is a TypeScript library (installable via `npm install cobalt`) that provides a Cypress-like experience for testing and evaluating AI agents. It combines a test runner, a CLI, a local dashboard, and built-in memory to track experiment results over time.

**Tagline:** "Cypress for AI agents."

---

## 1. Architecture Overview

```
cobalt/
├── packages/
│   ├── core/            # Runtime: experiment runner, evaluators, datasets
│   ├── cli/             # CLI commands (run, serve, init)
│   ├── dashboard/       # React SPA served on localhost
│   └── create-cobalt/    # npx create-cobalt scaffolder (optional)
├── .cobalt/              # Local storage (generated in user's project)
│   ├── results/         # JSON results per run (timestamped)
│   ├── cache/           # LLM judge response cache (cost optimization)
│   └── history.db       # SQLite — aggregated run history for dashboard
```

The package can be structured as a monorepo (turborepo/pnpm workspaces) or a single bundled package. For v1, a single package is simpler.

**The final NPM package exposes:**
- TypeScript exports: `import { experiment, Evaluator, Dataset, defineConfig } from 'cobalt'`
- A CLI binary: `npx cobalt run`, `npx cobalt serve`, `npx cobalt init`

---

## 2. Public API (Core)

### 2.1 `experiment()`

This is the main function. It orchestrates running an agent on a dataset, then evaluates the results.

```ts
import { experiment, Evaluator, Dataset } from 'cobalt'

// Define evaluators
const evaluators = [
  new Evaluator({
    name: 'relevance',
    prompt: 'Rate from 0 to 1 how relevant the output is to the input query.',
    // The prompt is sent to an LLM judge (configurable)
  }),
  new Evaluator({
    name: 'conciseness',
    prompt: 'Rate from 0 to 1 how concise the output is. Penalize unnecessary verbosity.',
  }),
]

// Define the dataset (inline or from file)
const dataset = new Dataset({
  items: [
    { input: 'What is the capital of France?', expectedOutput: 'Paris' },
    { input: 'Summarize quantum computing in one sentence.' },
  ],
})

// Run the experiment
experiment('my-summarizer-agent', dataset, async ({ item }) => {
  // The user calls their own agent here
  const result = await myAgent.run(item.input)
  return {
    output: result.text,
    // Optional metadata tracked automatically
    metadata: {
      model: 'gpt-4o',
      tokens: result.usage.totalTokens,
    },
  }
}, {
  evaluators,
  // Optional settings
  runs: 1,           // Number of times to run each item (to handle non-determinism)
  concurrency: 5,    // Parallelism
  timeout: 30000,    // Timeout per item
  tags: ['v2', 'prompt-iteration-3'], // Tags for filtering in the dashboard
})
```

**TypeScript Signature:**

```ts
type ExperimentItem = Record<string, any> // Flexible, the user puts whatever they want

interface ExperimentResult {
  output: string | Record<string, any>
  metadata?: Record<string, any>
}

interface ExperimentOptions {
  evaluators: Evaluator[]
  runs?: number             // default: 1
  concurrency?: number      // default: 5
  timeout?: number          // default: 30_000
  tags?: string[]
  name?: string             // override experiment name
}

function experiment(
  name: string,
  dataset: Dataset,
  runner: (ctx: { item: ExperimentItem; index: number; runIndex: number }) => Promise<ExperimentResult>,
  options: ExperimentOptions
): Promise<ExperimentReport>
```

### 2.2 `Evaluator`

An evaluator scores the agent's output. Several types are available:

```ts
// --- Type 1: LLM-as-Judge (most common) ---
new Evaluator({
  name: 'relevance',
  type: 'llm-judge',       // default
  prompt: `You are evaluating an AI agent's response.
Input: {{input}}
Output: {{output}}
Expected: {{expectedOutput}}

Rate the relevance from 0.0 to 1.0. Respond with JSON: { "score": <number>, "reason": "<string>" }`,
  model: 'gpt-4o-mini',    // optional, otherwise uses the model from global config
})

// --- Type 2: Custom function ---
new Evaluator({
  name: 'contains-keyword',
  type: 'function',
  fn: ({ item, output }) => {
    const hasKeyword = output.includes(item.expectedOutput)
    return { score: hasKeyword ? 1 : 0, reason: hasKeyword ? 'Contains expected output' : 'Missing expected output' }
  },
})

// --- Type 3: Similarity (embedding cosine) ---
new Evaluator({
  name: 'semantic-similarity',
  type: 'similarity',
  field: 'expectedOutput',  // Compares output vs item.expectedOutput
  threshold: 0.85,          // Score = 1 if similarity >= threshold, otherwise raw similarity
})

// --- Type 4: Exact match ---
new Evaluator({
  name: 'exact',
  type: 'exact-match',
  field: 'expectedOutput',
})

// --- Type 5: RAGAS-style (future) ---
// new Evaluator({ type: 'ragas', metrics: ['faithfulness', 'answer_relevancy'] })
```

**Evaluator Interface:**

```ts
interface EvaluatorConfig {
  name: string
  type?: 'llm-judge' | 'function' | 'similarity' | 'exact-match' // default: 'llm-judge'
  prompt?: string             // For llm-judge, supports {{input}}, {{output}}, {{expectedOutput}}, {{metadata}}
  model?: string              // For llm-judge
  fn?: (ctx: EvalContext) => EvalResult | Promise<EvalResult>  // For function
  field?: string              // For similarity/exact-match
  threshold?: number          // For similarity
}

interface EvalContext {
  item: ExperimentItem
  output: string | Record<string, any>
  metadata?: Record<string, any>
}

interface EvalResult {
  score: number     // 0.0 to 1.0
  reason?: string   // Explanation
}
```

### 2.3 `Dataset`

```ts
// --- Inline ---
const dataset = new Dataset({
  items: [
    { input: 'Hello', expectedOutput: 'Hi there' },
    { input: 'Bye', expectedOutput: 'Goodbye' },
  ],
})

// --- From a local file (CSV, JSON, JSONL) ---
const dataset = Dataset.fromFile('./fixtures/qa-pairs.json')
const dataset = Dataset.fromFile('./fixtures/qa-pairs.csv')
const dataset = Dataset.fromFile('./fixtures/qa-pairs.jsonl')

// --- From a URL (future: bdataset integration) ---
// const dataset = Dataset.fromRemote('https://bdataset.basalt.ai/datasets/xxx')

// --- With transformation ---
const dataset = Dataset.fromFile('./data.json').map((item) => ({
  input: item.question,
  expectedOutput: item.answer,
  context: item.context,
}))

// --- Subset / Sampling ---
const dataset = Dataset.fromFile('./big-dataset.json').sample(50) // 50 random items
const dataset = Dataset.fromFile('./big-dataset.json').slice(0, 10) // first 10
```

---

## 3. Configuration File

`cobalt.config.ts` file (or `.js`, `.mjs`, `.json`) at the project root.

```ts
import { defineConfig } from 'cobalt'

export default defineConfig({
  // Directory containing test files (*.cobalt.ts, *.experiment.ts)
  testDir: './experiments',

  // Glob pattern to find test files
  testMatch: ['**/*.cobalt.ts', '**/*.experiment.ts'],

  // Default model for LLM judges
  judge: {
    model: 'gpt-4o-mini',
    provider: 'openai',            // 'openai' | 'anthropic' | 'basalt' (future)
    apiKey: process.env.OPENAI_API_KEY, // or via automatic env var
  },

  // Local storage directory
  outputDir: '.cobalt',

  // Default concurrency
  concurrency: 5,

  // Default timeout (ms)
  timeout: 30_000,

  // Reporters
  reporters: ['cli', 'json'],    // 'cli' = terminal, 'json' = file, 'html' = dashboard

  // Dashboard port
  dashboard: {
    port: 4000,
    open: true,                   // Automatically opens the browser
  },

  // LLM judge response cache (avoids re-evaluating if same input/output/prompt)
  cache: {
    enabled: true,
    ttl: '7d',
  },

  // Environment variables / secrets (injected into the runner)
  env: {
    CUSTOM_API_KEY: process.env.CUSTOM_API_KEY,
  },
})
```

---

## 4. CLI

The `cobalt` binary is declared in the package's `package.json`:

```json
{
  "bin": {
    "cobalt": "./dist/cli.js"
  }
}
```

### Commands

```bash
# Initialize a cobalt project (creates cobalt.config.ts + experiments/ directory)
npx cobalt init

# Run all experiments from testDir
npx cobalt run

# Run a specific experiment
npx cobalt run experiments/my-agent.cobalt.ts

# Run with a name filter
npx cobalt run --filter "my-summarizer"

# Run with more concurrency
npx cobalt run --concurrency 10

# Run and open the dashboard when done
npx cobalt run --ui

# Start the dashboard (displays run history)
npx cobalt serve

# Start the dashboard on a specific port
npx cobalt serve --port 3000

# Compare two runs
npx cobalt compare <run-id-1> <run-id-2>

# List past runs
npx cobalt history

# Clean cache and old results
npx cobalt clean
```

### CLI Output (reporter)

The CLI reporter should display clear, readable output in real time:

```
 cobalt v0.1.0

 Running: experiments/my-agent.cobalt.ts

 my-summarizer-agent
  ┌─────────────────────────────────────────────────────────┐
  │ Dataset: 10 items × 1 run × 2 evaluators               │
  │ Concurrency: 5 | Timeout: 30s                          │
  └─────────────────────────────────────────────────────────┘

  ✓ Item 1/10 — relevance: 0.92 | conciseness: 0.87        420ms
  ✓ Item 2/10 — relevance: 0.88 | conciseness: 0.91        380ms
  ✓ Item 3/10 — relevance: 0.45 | conciseness: 0.95        510ms  ⚠ low score
  ✓ Item 4/10 — relevance: 0.91 | conciseness: 0.89        390ms
  ...

 ─────────────────────────────────────────────────────────────
 Results: my-summarizer-agent
 ─────────────────────────────────────────────────────────────

  Evaluator       Avg     Min     Max     P50     P95
  relevance       0.85    0.45    0.97    0.88    0.95
  conciseness     0.90    0.82    0.98    0.91    0.96

  Total items:    10
  Total time:     4.2s
  Avg latency:    420ms
  Total tokens:   12,450 (estimated cost: $0.03)

  ⚠ 1 item scored below 0.5 on 'relevance' (item #3)

 Results saved to .cobalt/results/2025-02-05T14-30-00-my-summarizer-agent.json
 Run ID: abc123

 Dashboard: npx cobalt serve
```

Use `picocolors` for colors and `ora` for spinners.

---

## 5. Dashboard (localhost)

The dashboard is a React SPA bundled in the package (built with Vite, served statically by the CLI server).

### Pages

1. **Runs list** — list of all past runs (from `.cobalt/history.db`), with date, name, average scores, tags, duration. Filterable by date/tag/name.

2. **Run detail** — detailed view of a run:
   - Aggregated scores per evaluator (bar chart / radar chart)
   - Table of all items with input, output, scores per evaluator, latency, tokens
   - Click on an item → modal with full detail (output, evaluator reasons, metadata)
   - Score distribution (histogram)

3. **Compare** — compare 2 runs side-by-side:
   - Average score diffs
   - Items where scores changed the most (regressions / improvements)
   - Useful for comparing 2 prompt versions or 2 models

4. **Trends** — score evolution graph over time (by experiment name + tag). Shows whether iterations are improving quality.

### Dashboard tech stack

- React 19 + TailwindCSS 4
- Recharts for charts
- TanStack Table for tables
- The backend server is a simple Hono/Express that serves static files + a REST API to read data from `.cobalt/history.db` (SQLite via `better-sqlite3`)

---

## 6. Local Storage (`.cobalt/`)

```
.cobalt/
├── results/
│   ├── 2025-02-05T14-30-00_my-summarizer-agent_abc123.json
│   └── 2025-02-05T15-00-00_my-summarizer-agent_def456.json
├── cache/
│   └── llm-judge-cache.json    # Hash(input+output+evaluator_prompt) → result
└── history.db                  # SQLite for the dashboard (run index + aggregated scores)
```

### Result JSON file format

```json
{
  "id": "abc123",
  "name": "my-summarizer-agent",
  "timestamp": "2025-02-05T14:30:00.000Z",
  "tags": ["v2", "prompt-iteration-3"],
  "config": {
    "runs": 1,
    "concurrency": 5,
    "timeout": 30000,
    "evaluators": ["relevance", "conciseness"]
  },
  "summary": {
    "totalItems": 10,
    "totalDurationMs": 4200,
    "avgLatencyMs": 420,
    "totalTokens": 12450,
    "estimatedCost": 0.03,
    "scores": {
      "relevance": { "avg": 0.85, "min": 0.45, "max": 0.97, "p50": 0.88, "p95": 0.95 },
      "conciseness": { "avg": 0.90, "min": 0.82, "max": 0.98, "p50": 0.91, "p95": 0.96 }
    }
  },
  "items": [
    {
      "index": 0,
      "input": { "input": "What is the capital of France?", "expectedOutput": "Paris" },
      "output": { "output": "The capital of France is Paris.", "metadata": { "model": "gpt-4o", "tokens": 45 } },
      "latencyMs": 420,
      "evaluations": {
        "relevance": { "score": 0.92, "reason": "Directly answers the question accurately." },
        "conciseness": { "score": 0.87, "reason": "Slightly verbose but acceptable." }
      }
    }
  ]
}
```

---

## 7. Technical Implementation

### Stack

- **Runtime:** TypeScript, compiled with `tsup` (ESM + CJS)
- **CLI:** `citty` (lightweight) or `commander`
- **Config loading:** `jiti` or `c12` (supports .ts natively without compilation)
- **Dashboard backend:** `hono` (lightweight, perfect for a local server)
- **Dashboard frontend:** React + Vite (pre-built, bundled in the package)
- **Local database:** `better-sqlite3` for `history.db`
- **LLM calls:** OpenAI / Anthropic SDK, or a unified wrapper with `ai` (Vercel AI SDK) to support multiple providers
- **Embeddings (for similarity evaluator):** `openai` SDK (text-embedding-3-small)
- **Evaluator prompt templating:** Simple `{{variable}}` replacement (Mustache-like)
- **Hashing for cache:** Native Node `crypto.createHash('sha256')`

### Source code structure

```
src/
├── index.ts                  # Public exports: experiment, Evaluator, Dataset, defineConfig
├── core/
│   ├── experiment.ts         # Main execution logic
│   ├── evaluator.ts          # Evaluator class + types
│   ├── dataset.ts            # Dataset class + loaders (JSON, CSV, JSONL)
│   ├── runner.ts             # Parallel orchestration (p-limit / p-map)
│   ├── report.ts             # ExperimentReport generation
│   └── config.ts             # defineConfig + loading
├── evaluators/
│   ├── llm-judge.ts          # LLM call + JSON response parsing
│   ├── function.ts           # Custom function evaluator
│   ├── similarity.ts         # Embedding cosine similarity
│   └── exact-match.ts        # Exact string match
├── cli/
│   ├── index.ts              # CLI entry point (#!/usr/bin/env node)
│   ├── commands/
│   │   ├── run.ts
│   │   ├── serve.ts
│   │   ├── init.ts
│   │   ├── history.ts
│   │   ├── compare.ts
│   │   └── clean.ts
│   └── reporters/
│       ├── cli-reporter.ts   # Terminal output
│       └── json-reporter.ts  # JSON file output
├── storage/
│   ├── results.ts            # Read/write result JSON files
│   ├── cache.ts              # LLM judge cache
│   └── db.ts                 # SQLite wrapper for history.db
├── dashboard/
│   ├── server.ts             # Hono server (API + static files)
│   └── api/
│       ├── runs.ts           # GET /api/runs, GET /api/runs/:id
│       ├── compare.ts        # GET /api/compare?a=xxx&b=yyy
│       └── trends.ts         # GET /api/trends?experiment=xxx
└── utils/
    ├── template.ts           # {{variable}} replacement
    ├── hash.ts               # SHA256 for cache keys
    ├── cost.ts               # Cost estimation per model
    └── stats.ts              # Compute avg, min, max, percentiles
```

The dashboard frontend is in a separate `dashboard-ui/` folder (React app), built with Vite, and the output (`dist/`) is copied into the final package to be served statically.

---

## 8. Key Features to Implement (by priority)

### P0 — MVP

- [ ] `experiment()` that runs a runner on a dataset and returns a report
- [ ] `Evaluator` type `llm-judge` and `function`
- [ ] `Dataset` inline (items) and `fromFile` (JSON)
- [ ] CLI `cobalt run` with basic terminal reporter
- [ ] Save results as JSON in `.cobalt/results/`
- [ ] `cobalt init` that creates the config + an example
- [ ] `defineConfig` with config file loading

### P1 — Usable

- [ ] Evaluator type `exact-match`
- [ ] LLM judge cache
- [ ] `Dataset.sample()` and `Dataset.slice()`
- [ ] `--filter` for `cobalt run`
- [ ] Cost estimation in the report
- [ ] Dataset `fromFile` CSV and JSONL

### P2 — Powerful

- [ ] Evaluator type `similarity` (embeddings)
- [ ] `runs > 1` with statistical aggregation
- [ ] `cobalt compare` CLI
- [ ] `cobalt history` CLI

### P3 - Connected
- [ ] Remote dataset (bdataset integration)
- [ ] Built-in RAGAS-style evaluator
- [ ] Native integration with RAGAS, DeepEval, AutoEval etc..
- [ ] MCP implementation (see bellow)
- [ ] CI mode (`cobalt run --ci` — exit code based on thresholds)
- [ ] GitHub Actions reporter
- [ ] Plugin system for custom evaluators
- [ ] Webhooks (notify an external service after a run)

### P4 — Dashboard
- [ ] CLI `cobalt serve` with basic dashboard (run list + detail)
- [ ] SQLite history.db for the dashboard
- [ ] Dashboard Compare page (2 runs side-by-side)
- [ ] Dashboard Trends page (evolution graphs)
- [ ] Tags and filtering in the dashboard
- [ ] Export results (CSV, Markdown)

---

## 9. CI Mode (important for adoption)

When the user runs `cobalt run --ci`, the process should:

1. Not open the dashboard
2. Display minimal but readable output
3. Return an exit code based on thresholds defined in the config:

```ts
// cobalt.config.ts
export default defineConfig({
  ci: {
    thresholds: {
      'relevance': { min: 0.8 },        // Fail if avg < 0.8
      'conciseness': { min: 0.7 },
    },
    failOnError: true,                   // Fail if an item throws
  },
})
```

This allows integration into a CI/CD pipeline to block a deploy if agent quality regresses.

---

## 10. Error Handling and DX

- If a dataset item times out → mark as `timeout`, don't stop the run
- If an item throws → capture the error, mark as `error`, continue
- If an LLM evaluator returns invalid JSON → retry once, otherwise mark as `eval-error`
- Display clear error messages with suggestions (e.g., "API key missing? Set OPENAI_API_KEY in your environment or cobalt.config.ts")
- Strict TypeScript, well-typed exports, IDE autocompletion on `item` in the runner

---

## 11. Final package.json

```json
{
  "name": "cobalt",
  "version": "0.1.0",
  "description": "Cypress for AI agents — test, evaluate, and track your AI experiments",
  "type": "module",
  "main": "./dist/index.cjs",
  "module": "./dist/index.mjs",
  "types": "./dist/index.d.ts",
  "bin": {
    "cobalt": "./dist/cli.mjs"
  },
  "exports": {
    ".": {
      "import": "./dist/index.mjs",
      "require": "./dist/index.cjs",
      "types": "./dist/index.d.ts"
    }
  },
  "files": [
    "dist",
    "dashboard-dist"
  ],
  "keywords": ["ai", "testing", "evaluation", "llm", "agents", "benchmark"],
  "engines": {
    "node": ">=18"
  }
}
```

---

## 12. Implementation Notes

1. **The LLM judge cache is critical for cost.** If the user reruns the same experiment without changing the outputs or the evaluator prompt, we should not re-call the LLM. Hash = SHA256(evaluator_prompt + item_input + agent_output).

2. **The dashboard must be pre-built.** Don't ask the user to install React. The Vite build produces static files (HTML/JS/CSS) that are distributed in the NPM package and served by the Hono server.

3. **Support `.cobalt.ts` files without requiring the user to install `ts-node`.** Use `jiti` or `tsx` to dynamically import TypeScript files.

4. **The `.cobalt/` directory should be automatically added to `.gitignore` by `cobalt init`** (like Cypress does with its directory).

5. **Everything must work without config.** If there's no `cobalt.config.ts`, use sensible defaults (testDir: `./experiments`, judge: OpenAI if `OPENAI_API_KEY` is set).

6. **The dataset item format is free** (Record<string, any>). The user can put whatever they want — the only contract is that the runner receives `item` and must return `{ output, metadata? }`.

7. **LLM-judge evaluators must return a JSON `{ score, reason }`.** The evaluator prompt must include a clear instruction for this format. If the LLM doesn't respect the format, retry once with a stricter prompt, otherwise log an error.

---

## 13. Claude Code Integration (MCP Server)

cobalt exposes an **MCP server** that Claude Code (or any other MCP client) can consume. This enables two powerful workflows: running tests from Claude Code with structured results, and automatically generating experiment files.

### 13.1 Starting the MCP Server

```bash
# Start the MCP server standalone
npx cobalt mcp

# Or via the Claude Code config (.claude/settings.json or mcp_servers in the project)
```

**Claude Code configuration** (`.mcp.json` at the project root):

```json
{
  "mcpServers": {
    "cobalt": {
      "command": "npx",
      "args": ["cobalt", "mcp"],
      "env": {
        "OPENAI_API_KEY": "${OPENAI_API_KEY}"
      }
    }
  }
}
```

With this, as soon as the user opens Claude Code in a project that has cobalt, the MCP tools are automatically available.

### 13.2 Exposed MCP Tools

#### `cobalt_run`

Runs one or more experiments and returns structured results.

```json
{
  "name": "cobalt_run",
  "description": "Run cobalt experiments and return structured results with scores per evaluator and per item.",
  "inputSchema": {
    "type": "object",
    "properties": {
      "file": {
        "type": "string",
        "description": "Path to a specific experiment file. If omitted, runs all experiments in testDir."
      },
      "filter": {
        "type": "string",
        "description": "Filter experiments by name (substring match)."
      },
      "concurrency": {
        "type": "number",
        "description": "Override concurrency setting."
      }
    }
  }
}
```

**Return value:** The full structured JSON (same format as `.cobalt/results/*.json` files), allowing Claude Code to:
- See which items failed and why
- Read evaluator `reason` fields
- Identify regression patterns
- Propose targeted fixes

#### `cobalt_results`

Reads past run results or lists available runs.

```json
{
  "name": "cobalt_results",
  "description": "List past experiment runs or get detailed results for a specific run.",
  "inputSchema": {
    "type": "object",
    "properties": {
      "runId": {
        "type": "string",
        "description": "Get results for a specific run ID. If omitted, returns list of recent runs."
      },
      "limit": {
        "type": "number",
        "description": "Number of recent runs to list (default: 10)."
      },
      "experiment": {
        "type": "string",
        "description": "Filter runs by experiment name."
      }
    }
  }
}
```

#### `cobalt_compare`

Compares two runs and returns a structured diff.

```json
{
  "name": "cobalt_compare",
  "description": "Compare two experiment runs and return a structured diff showing regressions and improvements per item and per evaluator.",
  "inputSchema": {
    "type": "object",
    "properties": {
      "runA": { "type": "string", "description": "First run ID (baseline)." },
      "runB": { "type": "string", "description": "Second run ID (candidate)." }
    },
    "required": ["runA", "runB"]
  }
}
```

**Return value:** Diff with regressed items, improved items, and deltas per evaluator. Claude Code can then focus on the regressions.

#### `cobalt_generate`

Automatically generates an experiment file from the agent's source code.

```json
{
  "name": "cobalt_generate",
  "description": "Analyze agent source code and generate a cobalt experiment file with relevant dataset items and evaluators.",
  "inputSchema": {
    "type": "object",
    "properties": {
      "agentFile": {
        "type": "string",
        "description": "Path to the agent source code to analyze."
      },
      "outputFile": {
        "type": "string",
        "description": "Path where the generated experiment file should be written. Defaults to experiments/<agent-name>.cobalt.ts"
      },
      "datasetSize": {
        "type": "number",
        "description": "Number of dataset items to generate (default: 10)."
      },
      "context": {
        "type": "string",
        "description": "Additional context about what the agent does, its expected behavior, edge cases to cover, etc."
      }
    },
    "required": ["agentFile"]
  }
}
```

**How it works internally:**

1. Reads the agent's source file
2. Analyzes the code to understand: expected inputs, produced outputs, prompts used, APIs called
3. Uses an LLM (the configured judge) to generate:
   - A dataset of relevant items covering normal cases, edge cases, and adversarial cases
   - Evaluators tailored to the agent type (Q&A → relevance + exactness, summarizer → conciseness + faithfulness, classifier → accuracy, etc.)
4. Writes the `.cobalt.ts` file ready to use

**Example generated file:**

```ts
// Auto-generated by cobalt from src/agents/summarizer.ts
import { experiment, Evaluator, Dataset } from 'cobalt'
import { summarize } from '../src/agents/summarizer'

const evaluators = [
  new Evaluator({
    name: 'faithfulness',
    prompt: `You are evaluating a summarization agent.
Original text: {{input}}
Summary: {{output}}

Rate from 0.0 to 1.0 how faithful the summary is to the original text. 
A faithful summary only contains information present in the original.
Respond with JSON: { "score": <number>, "reason": "<string>" }`,
  }),
  new Evaluator({
    name: 'conciseness',
    prompt: `Rate from 0.0 to 1.0 how concise this summary is.
Original text: {{input}}
Summary: {{output}}
A good summary should be at most 20% of the original length.
Respond with JSON: { "score": <number>, "reason": "<string>" }`,
  }),
  new Evaluator({
    name: 'length-check',
    type: 'function',
    fn: ({ item, output }) => {
      const ratio = String(output).length / String(item.input).length
      return {
        score: ratio <= 0.25 ? 1 : Math.max(0, 1 - (ratio - 0.25) * 2),
        reason: `Output is ${Math.round(ratio * 100)}% of input length`,
      }
    },
  }),
]

const dataset = new Dataset({
  items: [
    {
      input: 'The quantum computer developed by...',  // generated realistic examples
      category: 'science',
    },
    {
      input: 'In a landmark ruling, the Supreme Court...',
      category: 'legal',
    },
    // ... 8 more items covering different domains and edge cases
    {
      input: '',  // edge case: empty input
      category: 'edge-case',
    },
    {
      input: 'Hi',  // edge case: trivially short input
      category: 'edge-case',
    },
  ],
})

experiment('summarizer', dataset, async ({ item }) => {
  const result = await summarize(item.input)
  return { output: result }
}, { evaluators })
```

### 13.3 The Autonomous Claude Code Workflow

With these 4 MCP tools, Claude Code can run an **autonomous improvement loop**:

```
User: "Improve my summarizer agent so it scores above 0.85 on all evaluators."

Claude Code:
  1. cobalt_run → runs the current tests
  2. Analyzes results → item #3 and #7 have faithfulness score < 0.5
  3. Reads the agent code + the failing items
  4. Modifies the agent's prompt/code to fix the problematic cases
  5. cobalt_run → reruns the tests
  6. cobalt_compare → compares with the previous run
  7. Verifies that regressions are fixed without creating new ones
  8. Repeats if necessary
```

```
User: "Create tests for my classification agent in src/agents/classifier.ts"

Claude Code:
  1. cobalt_generate → analyzes the code, generates a .cobalt.ts with dataset + evaluators
  2. cobalt_run → runs the generated test to verify it works
  3. Adjusts the file if there are errors (broken imports, incompatible types)
  4. Presents the results to the user
```

### 13.4 MCP Resources (optional)

In addition to tools, the MCP server can expose **resources** so that Claude Code has context:

```
cobalt://config          → The parsed cobalt.config.ts config
cobalt://experiments     → List of available experiment files
cobalt://latest-results  → Latest run results per experiment
```

This allows Claude Code to understand the project context without running anything.

### 13.5 MCP Prompts (optional)

The MCP server can also expose **predefined prompts** that Claude Code can use:

```
cobalt://prompts/improve-agent
→ "Analyze the latest cobalt results for {experiment}, identify failing items,
   read the agent source code, and suggest specific improvements to increase
   scores above {threshold} on all evaluators."

cobalt://prompts/generate-tests  
→ "Analyze the agent at {agentFile}, understand its purpose and expected behavior,
   then use cobalt_generate to create a comprehensive experiment file covering
   normal cases, edge cases, and adversarial inputs."

cobalt://prompts/regression-check
→ "Run cobalt experiments, compare with the previous run, and report any
   regressions. If regressions are found, identify the root cause."
```

### 13.6 MCP Code Structure

```
src/
├── mcp/
│   ├── server.ts           # MCP server setup (using @modelcontextprotocol/sdk)
│   ├── tools/
│   │   ├── run.ts          # cobalt_run tool handler
│   │   ├── results.ts      # cobalt_results tool handler
│   │   ├── compare.ts      # cobalt_compare tool handler
│   │   └── generate.ts     # cobalt_generate tool handler
│   ├── resources/
│   │   ├── config.ts       # cobalt://config
│   │   ├── experiments.ts  # cobalt://experiments
│   │   └── results.ts      # cobalt://latest-results
│   └── prompts/
│       ├── improve.ts
│       ├── generate.ts
│       └── regression.ts
```

### 13.7 MCP Implementation Priority

**P0 (MCP MVP):**
- [ ] Basic MCP server with `cobalt_run` and `cobalt_results`
- [ ] Documented `.mcp.json` configuration
- [ ] `npx cobalt mcp` command to start the server

**P1:**
- [ ] `cobalt_compare`
- [ ] `cobalt_generate` (highest impact for adoption)
- [ ] MCP resources (config, experiments, latest-results)

**P2:**
- [ ] Predefined MCP prompts
- [ ] Streaming results during execution (MCP progress notifications)
- [ ] Multi-project support (workspace mode)