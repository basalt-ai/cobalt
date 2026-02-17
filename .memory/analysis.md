# Codebase Analysis

## Project Overview

**Cobalt** is a TypeScript-based AI testing framework designed to evaluate AI agents and LLM-powered applications. The tagline is "Unit testing for AI Agents" — providing a familiar testing experience for AI systems.

## Project Structure

```
cobalt/
├── packages/cobalt/          # Main package (single package, not true monorepo)
│   ├── src/
│   │   ├── core/             # Core experiment runner
│   │   ├── datasets/         # Dataset loading and transformation
│   │   ├── evaluators/       # Evaluator implementations
│   │   ├── cli/              # Command-line interface
│   │   ├── dashboard/        # Dashboard server (Hono)
│   │   ├── mcp/              # Model Context Protocol integration
│   │   ├── storage/          # Results, cache, history database
│   │   ├── utils/            # Utilities (cost, stats, templates)
│   │   └── types/            # TypeScript type definitions
│   ├── tests/                # Test suite (138 tests)
│   │   ├── unit/             # Unit tests for core modules
│   │   ├── integration/      # Integration tests (future)
│   │   └── helpers/          # Test mocks and fixtures
│   ├── templates/            # Project templates for init command
│   └── package.json          # Package configuration
├── experiments/              # Example experiments
├── .memory/                  # Project documentation
└── .cobalt/                  # Generated user data (not in repo)
    ├── results/              # JSON result files
    ├── cache/                # LLM response cache
    └── history.db            # SQLite history database
```

## Core Components

### 1. Experiment Runner (`src/core/experiment.ts`)

The main entry point for running experiments. Orchestrates:
- Loading datasets
- Executing user's agent function on each item
- Running evaluators on outputs
- Collecting statistics and costs
- Saving results

**Key exports:**
- `experiment(name, dataset, runner, options)` - Main function

### 2. Evaluator System (`src/core/Evaluator.ts`)

A dispatch system that routes evaluation requests to specific evaluator implementations.

**Supported Types:**
- `llm-judge` - LLM-based evaluation with boolean or scale scoring, chain of thought
- `function` - Custom JavaScript/TypeScript functions with context mapping
- `similarity` - Embeddings-based similarity with cosine or dot product distance
- `autoevals` - Braintrust Autoevals adapter (11 evaluator types)

**Files:**
- `src/core/Evaluator.ts` - Main Evaluator class
- `src/evaluators/llm-judge.ts` - LLM judge implementation
- `src/evaluators/function.ts` - Function evaluator
- `src/evaluators/similarity.ts` - Similarity evaluator (OpenAI embeddings)
- `src/evaluators/autoevals.ts` - Autoevals adapter

### 3. Dataset System (`src/datasets/Dataset.ts`)

Loads and transforms datasets for experiments.

**Loaders:**
- `Dataset.fromJSON(path)` - Load JSON arrays or objects with `.items` property
- `Dataset.fromJSONL(path)` - Line-delimited JSON
- `Dataset.fromCSV(path)` - CSV with headers

**Transformations:**
- `map(fn)` - Transform items
- `filter(predicate)` - Filter items
- `sample(n)` - Random sample
- `slice(start, end)` - Subset selection

All methods return new Dataset instances (immutable).

### 4. CLI (`src/cli/`)

Command-line interface built with citty.

**Commands:**
- `cobalt run <file>` - Run an experiment file
- `cobalt init` - Initialize new project structure
- `cobalt history` - View past experiment runs
- `cobalt compare <id1> <id2>` - Compare two runs
- `cobalt serve` - Start dashboard server
- `cobalt clean` - Clean cache and old results
- `cobalt mcp` - Start MCP server

**Implementation:**
- `src/cli/index.ts` - CLI entry point
- `src/cli/commands/run.ts` - Run command
- `src/cli/commands/init.ts` - Init command
- `src/cli/commands/history.ts` - History command
- `src/cli/commands/compare.ts` - Compare command
- `src/cli/commands/serve.ts` - Serve command
- `src/cli/commands/clean.ts` - Clean command
- `src/cli/commands/mcp.ts` - MCP command

### 5. Storage Layer (`src/storage/`)

Handles persistence of results, cache, and history.

**Components:**
- `results.ts` - Save/load JSON result files to `.cobalt/results/`
- `cache.ts` - LLM response cache (hash-based, TTL support)
- `db.ts` - SQLite database for history tracking (better-sqlite3)

**Database Schema (SQLite):**
```sql
CREATE TABLE runs (
  id TEXT PRIMARY KEY,
  name TEXT,
  timestamp INTEGER,
  tags TEXT,  -- JSON array
  scores TEXT,  -- JSON object
  cost REAL,
  total_items INTEGER,
  status TEXT
)
```

### 6. Dashboard (`src/dashboard/`)

Full-stack dashboard: Hono backend API + React SPA frontend with design system.

**Backend** (`src/dashboard/server.ts`, `src/dashboard/api/`):
- Hono server serving API + static files
- `GET /api` - API index (available endpoints)
- `GET /api/runs` - List all runs
- `GET /api/runs/:id` - Get specific run details
- `GET /api/compare` - Compare multiple runs (2 or 3)
- `GET /api/trends` - Get trend data over time
- `GET /api/health` - Health check
- SPA fallback: serves `index.html` for client-side routing

**Frontend** (`src/dashboard/ui/`):
- Vite + React 19 SPA, built to `dist/dashboard/`
- Design system: Tailwind CSS 4 + Radix Colors + CVA + Phosphor Icons
- Dark mode with class-based switching, localStorage persistence, system preference detection
- React Router v7 with routes: `/`, `/runs/:id`, `/compare`, `/trends`
- Typed API client layer (`ui/api/`) mirroring backend types
- `useApi` hook for data fetching with loading/error states
- `useTheme` hook for dark mode state

**UI Components** (`ui/components/`):
- `ui/` — 14 core primitives (Button, Badge, Card, Dialog, Select, Tabs, Tooltip, Popover, Separator, Skeleton, ScrollArea, Switch)
- `data/` — ScoreBadge, MetricCard, ColumnCell, FilterBar, DisplayOptions
- `layout/` — TopBar (logo, nav, dark mode toggle), PageHeader

**Pages** (all 4 complete):
- RunsListPage — TanStack Table, sorting, search, tag filter, multi-select, score badges
- RunDetailPage — Metric cards, tabbed stats, items table, item detail dialog, CI status
- ComparePage — A/B/C stacked items, color system, delta calculations, stats tabs
- TrendsPage — Recharts LineChart, experiment selector, runs summary table

**Status:** ~85% complete. Missing: AI chat (Phase 6), export (CSV/Markdown), compare bar charts, item comparison drawer.

### 7. MCP Integration (`src/mcp/`)

Model Context Protocol server for Claude Code integration (P3 - complete).

**Tools** (4):
- `cobalt_run` - Run experiments from Claude
- `cobalt_results` - View experiment results
- `cobalt_compare` - Compare two runs
- `cobalt_generate` - Auto-generate experiment files from agent code

**Resources** (3):
- `cobalt://config` - Current Cobalt configuration
- `cobalt://experiments` - List available experiment files
- `cobalt://latest-results` - Most recent experiment results

**Prompts** (3):
- `improve-agent` - Suggest improvements based on failure patterns
- `generate-tests` - Generate test cases for an agent
- `regression-check` - Check for regressions between runs

### 8. Utilities (`src/utils/`)

Helper functions used throughout the codebase.

**Modules:**
- `cost.ts` - Token cost estimation (OpenAI, Anthropic pricing)
- `stats.ts` - Statistical calculations (avg, min, max, p50, p95)
- `template.ts` - Simple template rendering (`{{variable}}` syntax)
- `hash.ts` - Hash generation for cache keys

**Template Engine:**
- Replaces `{{variable}}` with values from context
- Supports top-level properties only (not nested like `{{metadata.model}}`)
- Used in LLM judge prompts

**Cost Estimation:**
- Pricing per 1M tokens (input/output)
- Supports: GPT-4o, gpt-5-mini, Claude Opus, Sonnet, Haiku, etc.
- Fallback to gpt-5-mini pricing for unknown models

## Type System (`src/types/index.ts`)

All TypeScript types are defined in a single barrel file.

**Key Types:**
```typescript
// Core types
type ExperimentItem = Record<string, any>

interface ExperimentResult {
  output: string | Record<string, any>
  metadata?: Record<string, any>
}

interface ExperimentOptions {
  evaluators: Evaluator[]
  runs?: number
  concurrency?: number
  timeout?: number
  tags?: string[]
  onProgress?: (current: number, total: number) => void
}

// Evaluator types
type EvaluatorType = 'llm-judge' | 'function' | 'similarity' | 'autoevals'

interface EvaluationContext {
  item: ExperimentItem
  output: string | Record<string, any>
  metadata?: Record<string, any>
}

interface EvaluationResult {
  score: number  // 0 to 1
  reason?: string
}

// Statistics
interface ScoreStats {
  avg: number
  min: number
  max: number
  p50: number
  p95: number
}
```

## Configuration System (`src/core/config.ts`)

Uses `jiti` for loading TypeScript config files.

**Config File:** `cobalt.config.ts` (user's project root)

**Schema:**
```typescript
interface CobaltConfig {
  evaluators?: EvaluatorConfig[]
  concurrency?: number
  timeout?: number
  openaiApiKey?: string
  anthropicApiKey?: string
  resultsDir?: string
  cacheDir?: string
  historyDb?: string
}
```

**Loading:**
- Searches current directory and parent directories for config file
- Supports `.ts` and `.js` extensions
- Environment variables: `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`

## Build System

**Bundler:** tsup

**Configuration:** `tsup.config.ts`

**Build targets:**
- `dist/index.js` - Main module (ESM)
- `dist/cli.mjs` - CLI binary
- Type definitions: `dist/**/*.d.ts`

**Features:**
- ESM-only (no CommonJS)
- Source maps included
- Tree-shaking enabled
- External dependencies (not bundled with package)

## Testing Strategy

**Framework:** Vitest

**Coverage:** 231+ tests across 12+ test suites, with enforced thresholds (lines 75%, functions 80%, branches 70%)

**Test Organization:**
```
tests/
├── unit/
│   ├── core/
│   │   ├── experiment.test.ts
│   │   ├── config.test.ts
│   │   ├── runner.test.ts
│   │   ├── EvaluatorRegistry.test.ts
│   │   ├── ci-mode.test.ts
│   │   └── plugin-loader.test.ts
│   ├── evaluators/
│   │   ├── llm-judge.test.ts
│   │   ├── function.test.ts
│   │   ├── similarity.test.ts
│   │   └── adapters/autoevals.test.ts
│   ├── datasets/
│   │   ├── Dataset.test.ts
│   │   └── loaders/ (5 remote loader tests)
│   ├── cli/
│   │   ├── commands/run.test.ts
│   │   └── reporters/ (4 reporter tests)
│   ├── storage/
│   │   ├── cache.test.ts
│   │   ├── db.test.ts
│   │   └── results.test.ts
│   ├── utils/
│   │   ├── cost.test.ts
│   │   ├── hash.test.ts
│   │   ├── stats.test.ts
│   │   └── template.test.ts
│   └── dashboard/
│       └── api/compare.test.ts
├── integration/
│   └── experiment-pipeline.test.ts
└── helpers/
    ├── mocks.ts
    └── fixtures.ts
```

**Mocking Strategy:**
- LLM APIs: Mock `openai` and `@anthropic-ai/sdk` modules
- File system: Mock `node:fs` for dataset loading tests
- SQLite: Mock database operations
- No real API calls in tests

**What's Tested:**
- ✅ Dataset loading (JSON, JSONL, CSV) and transformations
- ✅ Evaluator dispatch and all evaluator types
- ✅ Experiment runner (unit + integration)
- ✅ CI mode threshold validation
- ✅ Plugin system (registry + loader)
- ✅ Storage layer (results, cache, database)
- ✅ Remote dataset loaders
- ✅ CLI run command and reporters
- ✅ Dashboard compare API
- ✅ All utility functions
- ✅ Hash generation

**What's NOT Tested:**
- ⏭️ Most CLI commands (history, compare, serve, clean, init)
- ⏭️ MCP server and tools
- ⏭️ Dashboard frontend components
- ⏭️ Dashboard API endpoints (runs, trends)

## Dependencies

### Core Dependencies
- `openai` - OpenAI API client
- `@anthropic-ai/sdk` - Anthropic API client
- `better-sqlite3` - SQLite database
- `citty` - CLI framework
- `hono` - HTTP server for dashboard
- `jiti` - TypeScript config loader
- `pathe` - Cross-platform path utilities
- `picocolors` - Terminal colors

### Dev Dependencies
- `typescript` - TypeScript compiler
- `vitest` - Test runner
- `tsup` - Build tool
- `biome` - Linter and formatter
- `@types/*` - Type definitions

## Key Design Decisions

### 1. Single Package Structure
- Not a true monorepo despite `packages/` folder
- Simplifies distribution and versioning
- All code in `packages/cobalt/`

### 2. Evaluator Error Handling
- Evaluators return `{score: 0, reason: "error"}` instead of throwing
- Allows experiments to continue even if some evaluations fail
- Caught in `Evaluator.evaluate()` wrapper

### 3. Immutable Dataset Transformations
- All transformation methods return new Dataset instances
- Enables method chaining: `dataset.filter(...).sample(10).slice(0, 5)`
- Prevents accidental mutation

### 4. Template Engine Simplicity
- Only supports top-level variables (`{{input}}`, `{{output}}`)
- Does NOT support nested paths (`{{metadata.model}}`)
- Sufficient for current use cases

### 5. Cost Estimation Strategy
- Pricing table in code (not fetched from API)
- Prices as of February 2026
- Unknown models fall back to gpt-5-mini pricing

### 6. Cache Implementation
- Hash-based: hash(evaluator prompt + model + content)
- No TTL enforcement yet (all cache entries persist)
- Stored in `.cobalt/cache/` as JSON files

### 7. History Database
- SQLite for simplicity (no server required)
- better-sqlite3 for synchronous API
- Schema supports basic filtering and comparison

## Module Boundaries

**Core Domain:**
- `core/` - Experiment orchestration
- `datasets/` - Data loading
- `evaluators/` - Evaluation logic
- `types/` - Type definitions

**Infrastructure:**
- `storage/` - Persistence
- `cli/` - User interface
- `utils/` - Cross-cutting concerns

**Integration:**
- `dashboard/` - Visualization (P4)
- `mcp/` - Claude Code integration (P3)

## Entry Points

### 1. Library API
```typescript
// packages/cobalt/src/index.ts
export { experiment } from './core/experiment.js'
export { Evaluator } from './core/Evaluator.js'
export { Dataset } from './datasets/Dataset.js'
export { defineConfig } from './core/config.js'
export type * from './types/index.js'
```

### 2. CLI Binary
```typescript
// packages/cobalt/src/cli/index.ts
// Invoked via `npx cobalt <command>`
```

### 3. MCP Server
```typescript
// packages/cobalt/src/mcp/server.ts
// Invoked via `npx cobalt mcp`
```

## Remaining Work

**P4 Dashboard (remaining ~15%):**
- AI chat integration (Phase 6 — Vercel AI SDK, chat panel, context-aware prompts)
- Export results (CSV, Markdown)
- Compare page: Recharts bar charts in metric cards, item comparison drawer
- Trends page: Evaluator filter dropdown

**P5 Polish (future):**
- Similarity evaluator: multi-provider (Cohere, local models)
- Dashboard real-time updates during experiment runs
- Plugin auto-discovery from npm packages
- More comprehensive CLI integration tests
- Responsive/mobile-friendly dashboard layout

## Component Maturity Levels

| Component | Maturity | Notes |
|-----------|----------|-------|
| Core experiment runner | ✅ P1 Complete | Fully functional |
| Evaluator system | ✅ P1 Complete | 3 types implemented |
| Dataset loading | ✅ P1 Complete | JSON, JSONL, CSV |
| CLI (run, init) | ✅ P1 Complete | Basic commands work |
| CLI (history, compare) | ✅ P2 (early) | Implemented ahead of schedule |
| Storage (results) | ✅ P1 Complete | JSON file storage |
| Storage (cache) | ✅ P1 Complete | Hash-based cache |
| Storage (history) | ✅ P1+ Complete | SQLite database |
| Cost tracking | ✅ P1 Complete | Token estimation |
| Statistics | ✅ P1 Complete | p50, p95, avg, min, max |
| Dashboard API | ✅ P4 Complete | Backend API complete |
| Dashboard UI | 🔄 P4 ~85% | Design system + 4 pages, missing AI chat + export |
| MCP server | ✅ P3 Complete | 4 tools, 3 resources, 3 prompts |
| Similarity evaluator | ✅ P2 Complete | OpenAI embeddings |
| Multiple runs | ✅ P2 Complete | Statistical aggregation |
| Remote datasets | ✅ P3 Complete | 5 platform loaders |
| CI mode | ✅ P3 Complete | Threshold validation |
| Plugin system | ✅ P3 Complete | Registry + loader |
| Autoevals | ✅ P3 Complete | 11 evaluator types |
| GitHub Actions reporter | ✅ P3 Complete | Job summary + annotations |

## Code Quality Metrics

- **Total lines of code**: ~5,800+ (src/)
- **Test coverage**: 231+ tests across 12+ test suites
- **Coverage thresholds**: Enforced (lines 75%, functions 80%, branches 70%)
- **TypeScript strictness**: Full strict mode
- **Linting**: Biome (no errors)
- **Build**: Clean ESM output (tsup) + Vite dashboard build

## Performance Characteristics

- **Experiment execution**: Parallel with configurable concurrency
- **Dataset loading**: Synchronous file I/O (acceptable for typical sizes)
- **Evaluator execution**: Async (supports parallel evaluation)
- **Cache lookup**: Fast (hash-based, in-memory during run)
- **Database queries**: Synchronous SQLite (better-sqlite3)

## Security Considerations

- API keys stored in environment variables or config file (user's responsibility)
- No sensitive data logged or cached
- LLM responses cached but don't include API keys
- File operations restricted to `.cobalt/` directory
- No eval() or dynamic code execution (except jiti for config loading)

## Documentation Coverage

- ✅ Root README.md - User-facing documentation
- ✅ CLAUDE.md - Development guide
- ✅ .memory/analysis.md - This file (codebase structure)
- ✅ .memory/progress.md - Development history
- ✅ .memory/decisions.md - Technical decisions
- ✅ .memory/documentation.md - API reference
- ✅ .memory/roadmap.md - Future plans and remaining work
- ✅ .memory/doubts.md - Open questions
- ✅ .memory/cleanup-log.md - Maintenance history
- ✅ .memory/build-issues.md - Build and runtime issues
