# Cleanup Log

Tracks maintenance, refactoring, and cleanup work performed on the codebase.

---

## 2026-02-05: Initial Bootstrap
- Created project from scratch (not from a template)
- Chose Biome over ESLint+Prettier
- Chose Vitest over Jest
- Single package structure in `packages/cobalt/`

## 2026-02-05: Documentation Overhaul
- All `.memory/` files were inherited from an earlier web-app bootstrap (Prisma/Next.js/PostgreSQL)
- Complete rewrite of all documentation to match the actual AI testing CLI framework
- Files rewritten: README.md, CLAUDE.md, analysis.md, decisions.md, documentation.md, progress.md

## 2026-02-06: P2 Feature Implementation
- Added similarity evaluator (`src/evaluators/similarity.ts`)
- Added multiple runs support (runner.ts rewrite)
- Extended stats.ts with standardDeviation() and calculateRunStats()

## 2026-02-10: P4 Dashboard Frontend Build
- Created Vite + React SPA in `src/dashboard/ui/`
- Added design system (Tailwind 4 + Radix Colors + CVA)
- Built 14+ UI components (Button, Badge, Card, Dialog, Select, etc.)
- Implemented 4 pages (RunsList, RunDetail, Compare, Trends)
- Added dark mode, filtering, display options, score badges, metric cards

## 2026-02-10: Import Path Cleanup
- Removed `/index` suffixes from import paths
- Removed `.js` extensions from imports

## 2026-02-10: Test Suite Improvements
- Added comprehensive test coverage (138 → 231+ tests)
- Enforced coverage thresholds (lines 75%, functions 80%, branches 70%)

## 2026-02-17: Memory Files Audit
- Deleted stale content from `build-issues.md` (was describing Prisma/PostgreSQL)
- Rewrote `doubts.md` (was describing web-app concerns)
- Rewrote `cleanup-log.md` (this file — was describing Turborepo/Next.js bootstrap)
- Updated `progress.md`, `documentation.md`, `analysis.md`, `decisions.md`, `roadmap.md`

---

## Future Cleanup Items

- Fix pre-existing llm-judge.ts DTS warnings in tsup build
- Consider removing `exact-match.ts` reference from CLAUDE.md (never implemented)
