# Roadmap

## Current Status: P0–P3 Complete, P4 ~85%

Cobalt is a TypeScript CLI testing framework for AI agents ("Jest for AI Agents"). Core features are production-ready. Dashboard frontend has design system, styled pages, and all 4 views.

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
- [x] Evaluator type `exact-match`
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
- [x] Built-in RAGAS-style evaluators (Autoevals — 11 types)
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
- [x] Core UI components (Button, Badge, Card, Dialog, Select, Tabs, Tooltip, etc.)
- [x] Layout: TopBar with navigation + dark mode toggle
- [x] RunsListPage: sortable table, search, multi-select for comparison, score badges
- [x] RunDetailPage: metric cards, scores table, items table with drill-down dialog, CI status
- [x] ComparePage: run labels, score comparison cards with bars, delta indicators, top changes table
- [x] TrendsPage: experiment selector, Recharts line chart, runs summary table
- [x] Code splitting (recharts, radix-ui as separate chunks)
- [ ] AI chat integration (Phase 6 of DASHBOARD_PLAN)
- [ ] Export results (CSV, Markdown)
- [ ] Tags filtering in dashboard

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
