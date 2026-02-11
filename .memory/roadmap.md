# Roadmap

## Current Status: P0–P3 Complete, P4 In Progress

Cobalt is a TypeScript CLI testing framework for AI agents ("Jest for AI Agents"). Core features are production-ready. Dashboard frontend is being scaffolded.

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
- [x] Runs list page (with data fetching)
- [x] Run detail page (summary, scores, items table)
- [ ] UI library integration + styled pages
- [ ] Compare page (2 runs side-by-side)
- [ ] Trends page (evolution graphs)
- [ ] Tags and filtering in dashboard
- [ ] Export results (CSV, Markdown)

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
- Dashboard pages need UI library styling (user will provide)
