# Technical Decisions

This document records architectural and technical decisions made during the development of Cobalt.

## Architecture Decisions

### AD-001: Single Package Instead of True Monorepo
**Date**: 2026-02-05  
**Status**: Accepted  
**Context**: Initial INSTRUCTIONS.md suggested possibility of monorepo structure  

**Decision**: Use a single package structure in `packages/cobalt/` rather than multiple publishable packages.

**Rationale**:
- Simpler distribution (one npm package)
- Easier versioning
- All code is tightly coupled anyway
- Reduces build complexity
- Sufficient for v1 scope

**Consequences**:
- ✅ Simpler CI/CD
- ✅ Single version number
- ✅ Easier for users to install
- ❌ Can't version components independently
- ❌ Folder name `packages/` is misleading

---

### AD-002: ESM-Only Module System
**Date**: 2026-02-05  
**Status**: Accepted  

**Decision**: Build as ESM-only, no CommonJS support.

**Rationale**:
- Modern Node.js (20+) has excellent ESM support
- Simpler build configuration
- Aligns with ecosystem direction
- Tree-shaking benefits
- All dependencies support ESM

**Consequences**:
- ✅ Cleaner imports/exports
- ✅ Smaller bundle sizes
- ✅ Future-proof
- ❌ No support for older Node.js versions
- ❌ Requires `type: "module"` in user's package.json (if using .js extension)

**Compatibility**: Requires Node.js 20+

---

### AD-003: Citty for CLI Framework
**Date**: 2026-02-05  
**Status**: Accepted  
**Alternatives Considered**: Commander, Yargs, Oclif

**Decision**: Use citty for CLI implementation.

**Rationale**:
- Lightweight (~10KB)
- Modern ESM-first design
- TypeScript-native
- Good DX with type safety
- Used by popular projects (UnJS ecosystem)

**Consequences**:
- ✅ Small bundle size
- ✅ Excellent TypeScript support
- ✅ Simple command definition
- ❌ Smaller community than Commander
- ❌ Less plugins/extensions

---

### AD-004: tsup for Bundling
**Date**: 2026-02-05  
**Status**: Accepted  
**Alternatives Considered**: esbuild directly, Rollup, Vite

**Decision**: Use tsup as the build tool.

**Rationale**:
- Zero-config TypeScript bundler
- Built on top of esbuild (fast)
- Generates type definitions automatically
- Simple configuration
- Multiple entry points support

**Consequences**:
- ✅ Fast builds
- ✅ Minimal configuration
- ✅ Type definitions included
- ❌ Less flexibility than raw esbuild

---

### AD-005: Biome Instead of ESLint + Prettier
**Date**: 2026-02-05  
**Status**: Accepted  

**Decision**: Use Biome for both linting and formatting.

**Rationale**:
- Single tool for both concerns
- 10-100x faster than ESLint+Prettier
- Good default rules
- Rust-based (reliable, fast)
- Growing adoption

**Consequences**:
- ✅ Faster CI checks
- ✅ Simpler tooling setup
- ✅ Consistent formatting and linting
- ❌ Fewer plugins than ESLint ecosystem
- ❌ Some rules not as mature

---

## Data Storage Decisions

### AD-006: SQLite for History Database
**Date**: 2026-02-05  
**Status**: Accepted  
**Alternatives Considered**: PostgreSQL, JSON files, LevelDB

**Decision**: Use SQLite (better-sqlite3) for experiment history tracking.

**Rationale**:
- No server required
- Single file database
- Excellent query performance
- Synchronous API available
- Cross-platform
- Used by many CLI tools

**Consequences**:
- ✅ Zero setup for users
- ✅ Fast queries
- ✅ Familiar SQL syntax
- ✅ Concurrent reads (single writer)
- ❌ Not suitable for distributed systems (fine for local CLI)

**Schema**:
```sql
CREATE TABLE runs (
  id TEXT PRIMARY KEY,
  name TEXT,
  timestamp INTEGER,
  tags TEXT,  -- JSON
  scores TEXT,  -- JSON
  cost REAL,
  total_items INTEGER,
  status TEXT
)
```

---

### AD-007: File-Based Results Storage
**Date**: 2026-02-05  
**Status**: Accepted  

**Decision**: Store individual run results as JSON files in `.cobalt/results/`.

**Rationale**:
- Human-readable
- Easy to export/share
- Git-friendly (if user wants to commit)
- No database migrations needed
- Simple backup/restore

**Consequences**:
- ✅ Easy debugging
- ✅ Portable format
- ✅ Can be versioned in git
- ❌ Large files for big datasets
- ❌ Slower queries compared to database

**File naming**: `{timestamp}-{experiment-name}-{short-id}.json`

---

### AD-008: Hash-Based LLM Response Cache
**Date**: 2026-02-05  
**Status**: Accepted  

**Decision**: Cache LLM judge responses using content-based hashing.

**Cache key**: `hash(evaluator.prompt + evaluator.model + input + output)`

**Rationale**:
- Significant cost savings (avoid duplicate API calls)
- Fast lookup
- Deterministic (same inputs = same cache key)
- No invalidation needed (content-addressed)

**Consequences**:
- ✅ Reduces API costs
- ✅ Faster reruns
- ✅ Simple implementation
- ❌ Cache grows unbounded (mitigated by `clean` command)
- ❌ Model updates don't auto-invalidate (intentional - model name includes version)

**TTL**: Not enforced (manual cleanup via `cobalt clean`)

---

## Evaluator Decisions

### AD-009: Evaluator Error Handling Strategy
**Date**: 2026-02-05  
**Status**: Accepted  

**Decision**: Evaluators return `{score: 0, reason: "error"}` instead of throwing errors.

**Rationale**:
- Allows experiments to continue even if some evaluations fail
- Consistent result structure
- Easy to identify failed evaluations in results
- User can decide how to handle score=0 results

**Implementation**:
```typescript
try {
  return await evaluateImpl(config, context)
} catch (error) {
  return {
    score: 0,
    reason: `Evaluation error: ${error.message}`
  }
}
```

**Consequences**:
- ✅ Resilient to individual evaluator failures
- ✅ Clear error reporting
- ✅ Experiment continues running
- ❌ User must check for score=0 to detect failures

---

### AD-010: LLM Judge JSON Response Format
**Date**: 2026-02-05  
**Status**: Accepted  

**Decision**: LLM judges must return `{score: number, reason?: string}` in JSON format.

**System Prompt**:
```
You are an evaluator. Return JSON: {"score": <0 to 1>, "reason": "<explanation>"}
```

**Rationale**:
- Structured output easier to parse
- Score normalization enforced (0-1 scale)
- Optional reasoning provides explainability

**Consequences**:
- ✅ Reliable parsing
- ✅ Type-safe results
- ❌ Requires LLM to follow JSON format (usually works, but retries may be needed)

**Error handling**: Strip markdown code blocks (```json) if present

---

### AD-011: Template Engine Simplicity
**Date**: 2026-02-05  
**Status**: Accepted  

**Decision**: Use simple `{{variable}}` syntax for templates, no nested property support.

**Implementation**: `/\{\{(\w+)\}\}/g` regex replacement

**Rationale**:
- Sufficient for LLM judge prompts
- Easy to understand
- No external dependency
- Fast

**Consequences**:
- ✅ Simple and fast
- ✅ No dependencies
- ❌ Cannot access nested properties like `{{metadata.model}}`

**Workaround**: Users can flatten data in experiment runner if needed.

---

### AD-012: Support Both OpenAI and Anthropic
**Date**: 2026-02-05  
**Status**: Accepted  

**Decision**: Support both OpenAI and Anthropic as LLM judge providers.

**Configuration**:
```typescript
{
  type: 'llm-judge',
  provider: 'openai' | 'anthropic',
  model: 'gpt-4o-mini' | 'claude-sonnet-4-5',
  ...
}
```

**Rationale**:
- Different users prefer different providers
- Claude often better at following instructions (useful for judges)
- GPT models are faster/cheaper for some use cases
- Competitive ecosystem benefits users

**Consequences**:
- ✅ User flexibility
- ✅ Can use best model for task
- ❌ More API dependencies
- ❌ Need to maintain pricing for both

---

## Dataset Decisions

### AD-013: Immutable Dataset Transformations
**Date**: 2026-02-05  
**Status**: Accepted  

**Decision**: All Dataset transformation methods return new Dataset instances.

**Example**:
```typescript
const filtered = dataset.filter(item => item.priority === 'high')
// original dataset unchanged
```

**Rationale**:
- Functional programming paradigm
- Prevents accidental mutations
- Enables method chaining
- Easy to reason about

**Consequences**:
- ✅ Safer code
- ✅ Chainable API
- ✅ No side effects
- ❌ Slightly more memory usage (mitigated by small datasets)

---

### AD-014: Support Multiple Dataset Formats
**Date**: 2026-02-05  
**Status**: Accepted  

**Decision**: Support JSON, JSONL, and CSV dataset formats.

**Rationale**:
- JSON: Most common in ML/AI
- JSONL: Efficient for large datasets (streaming possible in future)
- CSV: Familiar to non-technical users, easy to create in Excel

**Loaders**:
- `Dataset.fromJSON(path)` - Array or `{items: []}` object
- `Dataset.fromJSONL(path)` - Line-delimited JSON
- `Dataset.fromCSV(path)` - CSV with headers

**Consequences**:
- ✅ Flexible data sources
- ✅ Easy migration from existing data
- ❌ More code to maintain

**Future**: Remote datasets (bdataset, HTTP URLs)

---

## CLI Decisions

### AD-015: Experiment Files as TypeScript
**Date**: 2026-02-05  
**Status**: Accepted  

**Decision**: Experiment files are `.cobalt.ts` files that call the `experiment()` function.

**Example**:
```typescript
// my-agent.cobalt.ts
import { experiment, Evaluator, Dataset } from '@basalt-ai/cobalt'

experiment('name', dataset, runner, options)
```

**Rationale**:
- Type safety for experiment configuration
- IDE autocomplete
- Can import other modules
- Flexible for complex setups

**Consequences**:
- ✅ Full TypeScript support
- ✅ Can use imports
- ✅ Type-checked configurations
- ❌ Requires jiti to load (slightly slower than JSON)

**Alternative considered**: YAML/JSON config files (too limited)

---

### AD-016: Filter Experiments by Name or Tags
**Date**: 2026-02-05  
**Status**: Accepted  

**Decision**: `cobalt run --filter` supports pattern matching on name or tags.

**Examples**:
```bash
cobalt run --filter "gpt-4*"     # Name pattern
cobalt run --filter "v2"         # Tag filter
```

**Rationale**:
- Useful for running subsets of experiments
- Common workflow in testing frameworks
- Simple implementation with glob patterns

**Consequences**:
- ✅ Flexible experiment selection
- ✅ Good DX
- ❌ Pattern syntax must be learned

---

## Infrastructure Decisions

### AD-017: Hono for Dashboard Server
**Date**: 2026-02-05  
**Status**: Accepted  
**Alternatives Considered**: Express, Fastify, Koa

**Decision**: Use Hono for dashboard HTTP server.

**Rationale**:
- Very fast (one of the fastest Node.js frameworks)
- Small bundle size
- Modern API (similar to Express)
- Edge runtime support (future-proof)
- TypeScript-native

**Consequences**:
- ✅ Fast API responses
- ✅ Lightweight
- ✅ Good TypeScript support
- ❌ Smaller ecosystem than Express

**Current status**: API backend complete, React UI not implemented (P4)

---

### AD-018: MCP Integration via stdio Transport
**Date**: 2026-02-05  
**Status**: Accepted  

**Decision**: MCP server uses stdio transport (not SSE).

**Rationale**:
- Recommended approach for CLI tools
- Simpler than HTTP + SSE
- Works well with Claude Code
- No port conflicts

**Consequences**:
- ✅ Simple integration
- ✅ No network setup
- ❌ Can't be accessed remotely (fine for local tool)

**Configuration**: Users add to `.mcp.json`:
```json
{
  "mcpServers": {
    "cobalt": {
      "command": "npx",
      "args": ["cobalt", "mcp"]
    }
  }
}
```

---

## Testing Decisions

### AD-019: Vitest Over Jest
**Date**: 2026-02-05  
**Status**: Accepted  

**Decision**: Use Vitest as test runner.

**Rationale**:
- Vite-based (very fast)
- ESM-native (no config hacks)
- Jest-compatible API
- Better TypeScript support
- Active development

**Consequences**:
- ✅ Fast test execution
- ✅ Great ESM support
- ✅ Similar API to Jest (easy learning)
- ❌ Smaller ecosystem than Jest

---

### AD-020: Mock LLM APIs in Tests
**Date**: 2026-02-05  
**Status**: Accepted  

**Decision**: All tests mock `openai` and `@anthropic-ai/sdk` modules, never make real API calls.

**Implementation**:
```typescript
vi.mock('openai', () => ({
  default: vi.fn().mockImplementation(() => ({
    chat: { completions: { create: mockCreate } }
  }))
}))
```

**Rationale**:
- Fast test execution
- No API costs
- Deterministic results
- Works offline

**Consequences**:
- ✅ Fast tests
- ✅ Free to run
- ✅ Consistent results
- ❌ Don't catch API contract changes (acceptable tradeoff)

---

## Cost Estimation Decisions

### AD-021: Hardcoded Pricing Table
**Date**: 2026-02-05  
**Status**: Accepted  
**Alternatives Considered**: Fetch from API, user-provided pricing

**Decision**: Maintain pricing table in code, updated manually.

**Pricing source**: Official provider pricing pages (as of February 2026)

**Rationale**:
- API pricing rarely changes
- No external dependencies
- Instant results
- Simple implementation

**Consequences**:
- ✅ Fast (no network calls)
- ✅ Works offline
- ❌ Requires manual updates when pricing changes
- ❌ May become outdated

**Fallback**: Unknown models use GPT-4o-mini pricing

---

### AD-022: Cost Estimation, Not Billing
**Date**: 2026-02-05  
**Status**: Accepted  

**Decision**: Cost estimates are approximate, not exact billing amounts.

**Rationale**:
- Exact billing depends on provider's metering
- Good enough for budgeting and comparison
- Users should check actual bills for precise costs

**Displayed as**: "Estimated cost: $0.15"

**Consequences**:
- ✅ Helpful for cost awareness
- ✅ Good for comparing experiments
- ❌ Not suitable for precise accounting

---

## Security Decisions

### AD-023: API Keys via Environment Variables
**Date**: 2026-02-05  
**Status**: Accepted  

**Decision**: API keys stored in environment variables or config file (user's choice).

**Priority**:
1. Config file: `cobalt.config.ts` (if specified)
2. Environment: `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`

**Rationale**:
- Standard practice for CLI tools
- Keeps secrets out of code
- Works with .env files
- Compatible with CI/CD

**Consequences**:
- ✅ Secure (not in version control)
- ✅ Standard approach
- ❌ User must set up (documented in README)

---

### AD-024: No Telemetry or Analytics
**Date**: 2026-02-05  
**Status**: Accepted  

**Decision**: No usage telemetry, analytics, or error reporting.

**Rationale**:
- Privacy-first approach
- No external services needed
- Aligns with CLI tool expectations
- No GDPR concerns

**Consequences**:
- ✅ User privacy protected
- ✅ Works offline
- ❌ No usage insights for development prioritization

**Future**: Could add opt-in telemetry later if needed

---

## Documentation Decisions

### AD-025: Memory System for Project Context
**Date**: 2026-02-05  
**Status**: Accepted  

**Decision**: Maintain `.memory/` folder with structured documentation.

**Files**:
- `decisions.md` - This file
- `analysis.md` - Codebase structure
- `progress.md` - Development history
- `documentation.md` - API reference
- `roadmap.md` - Future plans

**Rationale**:
- Helps AI assistants maintain context
- Good for onboarding
- Documents "why" not just "what"
- Low overhead to maintain

**Consequences**:
- ✅ Better AI collaboration
- ✅ Clear decision history
- ✅ Easier onboarding
- ❌ Requires discipline to keep updated

---

## Deferred Decisions

### AD-026: Dashboard Frontend — Vite + React SPA Inside src/dashboard/ui/
**Date**: 2026-02-10
**Status**: Accepted
**Alternatives Considered**: Next.js (static export), Next.js (full-stack), separate `packages/dashboard/`

**Decision**: Use Vite + React SPA colocated with the backend at `src/dashboard/ui/`, built to `dist/dashboard/`.

**Rationale**:
- Single npm package — `cobalt serve` serves everything from `dist/`
- No SSR needed — pure client SPA with API proxy in dev
- Cohesive: API (`src/dashboard/api/`) and UI (`src/dashboard/ui/`) are siblings
- Build pipeline: tsup (library) → Vite (dashboard), both output to `dist/`
- Next.js adds unnecessary complexity for a local dashboard
- Vite gives HMR in dev, optimized build in prod

**Architecture**:
- Dev: Vite dev server on :5173 proxies `/api` to Hono on :4000
- Prod: Hono serves `dist/dashboard/` static files + SPA fallback
- React Router v7 for client-side routing
- Typed API client layer mirrors backend types

**Consequences**:
- ✅ Single `dist/` folder, single npm package
- ✅ Clean dev workflow (Vite HMR + API proxy)
- ✅ No SSR complexity
- ✅ Future-ready for cloud version (same React codebase)
- ❌ Dashboard not functional without build step
- ❌ Adds React/Vite deps to the main package

---

### DD-002: Similarity Evaluator — Multi-Provider Support
**Status**: Deferred to P5
**Context**: OpenAI embeddings implemented in P2. Multi-provider (Cohere, local) deferred.

---

### DD-003: Remote Dataset Support
**Status**: Resolved ✅ (P3 complete)
**Resolution**: Implemented 5 platform loaders (HTTP, Langfuse, LangSmith, Braintrust, Basalt)

---

## Reversed Decisions

### RD-001: Monorepo with Multiple Packages
**Original decision**: Use Turborepo with multiple publishable packages  
**Reversed**: 2026-02-05  
**Reason**: Single package is simpler for v1  
**See**: AD-001

---

## Principles

These principles guide technical decisions:

1. **Simplicity over flexibility** - Choose simple solutions that work for 80% of use cases
2. **User privacy first** - No telemetry without explicit opt-in
3. **Offline-capable** - Should work without internet (except LLM calls)
4. **Fast by default** - Performance is a feature
5. **Type-safe** - Leverage TypeScript for safety and DX
6. **Zero config** - Sensible defaults, configuration optional
7. **Composable** - Small, focused components that work together
8. **Transparent** - Clear error messages, visible costs

---

## Decision-Making Process

When making technical decisions:

1. **Document the context** - Why is this decision needed?
2. **List alternatives** - What are 2-3 viable options?
3. **Present to user** - Get approval for impactful decisions
4. **Record here** - Document decision, rationale, and consequences
5. **Update affected docs** - Keep analysis.md, progress.md, etc. in sync

---

## P2 (Powerful) Feature Decisions

### AD-015: Similarity Evaluator - OpenAI-Only for v1
**Date**: 2026-02-06  
**Status**: Accepted  
**Alternatives Considered**: Multi-provider (Cohere, Voyage), OpenAI + local fallback

**Decision**: Use OpenAI embeddings API exclusively for similarity evaluator in v1.

**Rationale**:
- Simple, proven integration
- Consistent with existing LLM judge pattern (OpenAI + Anthropic)
- text-embedding-3-small is cost-effective ($0.02/1M tokens)
- Can add more providers in P3 without breaking changes
- Reduces complexity and testing burden

**Consequences**:
- ✅ Simple implementation (~120 LOC)
- ✅ Reliable, proven API
- ✅ Good pricing
- ✅ Easy to test with mocks
- ❌ Requires OpenAI API key
- ❌ No offline capability
- ⏭️ Can add Cohere, Voyage, local models in P3

**Implementation**: `src/evaluators/similarity.ts` using OpenAI SDK

---

### AD-016: Multiple Runs - Store All Individual Results
**Date**: 2026-02-06  
**Status**: Accepted  
**Alternatives Considered**: Store only aggregates, hybrid (configurable)

**Decision**: Store all individual run results in the `runs[]` array.

**Rationale**:
- Storage is cheap, transparency is valuable
- Enables debugging non-determinism
- Can re-analyze results later without re-running
- Users can see individual outliers
- Aggregated stats are computed and stored separately

**Consequences**:
- ✅ Full transparency into all runs
- ✅ Can debug outliers and failures
- ✅ Re-analyzable without re-running expensive LLM calls
- ✅ No information loss
- ❌ Larger result JSON files (N×items×runs)
- ❌ More data to parse in dashboard
- ⏭️ Dashboard can add "compact view" toggle in P4

**Implementation**: `ItemResult` type extended with `runs: SingleRun[]` array

---

### AD-017: Multiple Runs - Sequential Per Item, Parallel Across Items
**Date**: 2026-02-06  
**Status**: Accepted  
**Alternatives Considered**: Fully parallel (all runs), grouped rounds (run 1, then run 2)

**Decision**: Execute runs sequentially for each item, but process items in parallel.

**Pattern**:
```
Item 1: Run 1 → Run 2 → Run 3  (sequential)
Item 2: Run 1 → Run 2 → Run 3  (sequential)  } parallel
Item 3: Run 1 → Run 2 → Run 3  (sequential)
```

**Rationale**:
- Balanced parallelism (maximizes throughput)
- Simpler progress tracking
- Keeps each item's runs together (better for debugging)
- Intuitive: "Item 3/10 (run 2/5)"
- Respects concurrency setting

**Consequences**:
- ✅ Good throughput
- ✅ Clear progress reporting
- ✅ Each item's runs are temporally close
- ✅ Easy to implement and test
- ❌ Not maximum possible parallelism
- ℹ️ With concurrency=5, items=10, runs=3: up to 5 items executing simultaneously

**Implementation**: `runExperiment()` in `src/core/runner.ts`

---

### AD-018: Multiple Runs - Hybrid Progress Reporting
**Date**: 2026-02-06  
**Status**: Accepted  
**Alternatives Considered**: Total count only, per-item breakdown only

**Decision**: Show both total progress AND current item/run position.

**Format**:
- Single run: `Progress: 7/10 items completed`
- Multiple runs: `Progress: 15/50 completed | Item 3/10 (run 2/5)`

**Rationale**:
- Users need both perspectives for long experiments
- Total progress shows overall completion %
- Current position helps estimate time remaining
- Clear granularity for debugging
- Only ~10 chars longer than simple format

**Consequences**:
- ✅ Best visibility into progress
- ✅ Helps estimate remaining time
- ✅ Easy to track which item is currently running
- ❌ Slightly longer terminal output
- ℹ️ Progress logged max once per second (throttled)

**Implementation**: `onProgress` callback in `experiment.ts`

---

### AD-019: Multiple Runs - Comprehensive Statistics (mean, stddev, min, max, p50, p95)
**Date**: 2026-02-06  
**Status**: Accepted  
**Alternatives Considered**: Basic (mean, stddev only), with confidence intervals

**Decision**: Calculate comprehensive statistics matching existing `ScoreStats` structure.

**Metrics**: mean, stddev, min, max, p50 (median), p95

**Rationale**:
- Consistent with existing single-run score reporting
- Full picture of distribution
- Percentiles more robust than mean for skewed distributions
- Standard deviation shows variance (non-determinism level)
- P95 identifies outliers
- Sufficient for most use cases

**Consequences**:
- ✅ Comprehensive view of score distribution
- ✅ Consistent API across single/multiple runs
- ✅ Standard metrics familiar to users
- ✅ Identifies high-variance evaluators
- ⏭️ Can add confidence intervals in P3 (CI mode)
- ℹ️ When runs=5, items=10: stats aggregate 50 scores per evaluator

**Implementation**: `calculateRunStats()` in `src/utils/stats.ts`

---

