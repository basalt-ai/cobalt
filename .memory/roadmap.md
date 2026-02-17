# Roadmap

## Current Status: P0–P3 Complete, P4 ~85%

Cobalt is a TypeScript CLI testing framework for AI agents ("Unit testing for AI Agents"). Core features are production-ready. Dashboard frontend has design system, styled pages, and all 4 views.

## Completed

### P0 — MVP ✅
- [x] `experiment()` runner with parallel execution
- [x] `Evaluator` types: `llm-judge`, `function`
- [x] `Dataset` inline and `fromFile` (JSON)
- [x] CLI `cobalt run` with terminal reporter
- [x] Save results as JSON in `.cobalt/results/`
- [x] `cobalt init` scaffolding
- [x] `defineConfig` with config file loading

### P1 — Usable ✅
- [x] LLM judge response cache
- [x] `Dataset.sample()` and `Dataset.slice()`
- [x] `--filter` for `cobalt run`
- [x] Cost estimation in reports
- [x] Dataset `fromFile` CSV and JSONL

### P2 — Powerful ✅
- [x] Evaluator type `similarity` (embeddings)
- [x] `runs > 1` with statistical aggregation
- [x] `cobalt compare` CLI
- [x] `cobalt history` CLI

### P3 — Connected ✅
- [x] Remote datasets (Langfuse, LangSmith, Braintrust, Basalt)
- [x] Built-in Autoevals integration (11 evaluator types)
- [x] MCP implementation (4 tools, 3 resources, 3 prompts)
- [x] CI mode (`cobalt run --ci` with thresholds)
- [x] GitHub Actions reporter
- [x] Plugin system for custom evaluators

## In Progress

### P4 — Dashboard 🔄
- [x] Hono backend API (`cobalt serve`)
- [x] SQLite history.db for dashboard queries
- [x] Dashboard frontend scaffolding (Vite + React SPA)
- [x] Design system: Tailwind CSS 4 + Radix colors + dark mode
- [x] Core UI components (Button, Badge, Card, Dialog, Select, Tabs, Tooltip, Popover, Switch, etc.)
- [x] Layout: TopBar with navigation + dark mode toggle
- [x] RunsListPage: sortable table, search, multi-select, filters, display options, score badges
- [x] RunDetailPage: metric cards, tabs (Scores/Latency/Tokens), AVG headers, items table with drill-down, filters, display options, compare selector
- [x] ComparePage: A/B/C stacked items, evolution rate diffs, stats tabs (Latency/Tokens with percentiles), filters, display options, tokens/metadata columns
- [x] TrendsPage: experiment selector, Recharts line chart, runs summary table
- [x] Code splitting (recharts, radix-ui as separate chunks)
- [x] P99 metric (backend + frontend)
- [x] FilterBar and DisplayOptions components (client-side)
- [x] Multi-run compare API (2 or 3 runs)
#### Remaining — Compare Page Gaps
- [ ] `GET /api/compare/items` backend endpoint (item-level comparison data with aligned items)
- [ ] Metric cards with Recharts bar charts (currently text-based cards, no chart visualization)
- [ ] Item comparison drawer (A vs B side-by-side in Dialog with full outputs + evaluator reasons)
- [ ] Letters column (A/B/C letter badges per row instead of color dots)

#### Remaining — Trends Page Gaps
- [ ] Evaluator filter dropdown (select specific evaluator or "All")
- [ ] Reusable Chart wrapper component with dark mode theming (currently Recharts used inline)

#### Remaining — AI Chat (Phase 6)
- [ ] Install Vercel AI SDK (`ai`, `@ai-sdk/react`, `@ai-sdk/openai`, `@ai-sdk/anthropic`)
- [ ] Add `dashboard.chat` config to `defineConfig` types and loading
- [ ] Create `POST /api/chat` endpoint using `streamText()`
- [ ] Create `GET /api/runs/:id/analysis` endpoint (cached AI analysis)
- [ ] Create `GET /api/compare/analysis` endpoint (cached AI comparison)
- [ ] Build ChatPanel component (full-height right panel, IDE-style, pushes content)
- [ ] Build ChatMessage and ChatInput components
- [ ] Implement `useChat()` hook integration with page context
- [ ] Add chat button to TopBar (toggle)
- [ ] Create InsightCard component for inline AI summaries
- [ ] Disabled state when `dashboard.chat` not configured

#### Remaining — Polish (Phase 7)
- [ ] Export results as CSV
- [ ] Export results as Markdown
- [ ] Cmd+K search shortcut
- [ ] React ErrorBoundary component
- [ ] React.lazy for page-level code splitting
- [ ] React.memo optimization for heavy components
- [ ] Responsive/mobile-friendly layout
- [ ] Tests for dashboard API endpoints

## Future

### P5 — Polish
- [ ] Similarity evaluator: multi-provider (Cohere, local)
- [ ] Dashboard real-time updates during experiment runs
- [ ] Plugin auto-discovery from npm packages
- [ ] More comprehensive integration tests
- [ ] CLI integration tests

## Technical Debt

- Fix pre-existing llm-judge.ts DTS warnings
- Add CLI command integration tests
- Consider whether `exact-match.ts` evaluator (listed in CLAUDE.md architecture) should be implemented or removed from docs
