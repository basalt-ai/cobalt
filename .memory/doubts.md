# Open Questions and Doubts

## Dashboard — Open Questions

### 1. Real-Time Updates
Should the dashboard auto-refresh when new experiment runs complete?
- **Option A**: WebSocket connection from Hono server (push updates)
- **Option B**: Polling (frontend polls `/api/runs` every N seconds)
- **Option C**: Manual refresh only (current behavior)
- **Context**: Local-only tool, so complexity of WebSocket may not be justified

### 2. Virtual Scrolling
Should we add `@tanstack/react-virtual` for tables with 100+ runs?
- Currently using native HTML tables with TanStack Table for sorting/selection
- Virtual scrolling would improve performance for large datasets
- Adds dependency and implementation complexity
- **Decision**: Deferred — monitor if users report performance issues

### 3. AI Chat Conversation Persistence
When AI chat is implemented (Phase 6), should conversations persist across page navigations?
- In-memory persistence (lost on page refresh) vs localStorage/sessionStorage
- Context changes when user navigates (different run, compare view, etc.)

### 4. Shareable Reports
Should the dashboard support exporting a shareable HTML report (static, self-contained)?
- Useful for sharing results with team members who don't have Cobalt installed
- Would require bundling data + minimal viewer into a single HTML file

### 5. Plugin Dashboard Extensions
Should the plugin system extend the dashboard UI?
- Custom evaluator visualizations (e.g., a specialized chart for a specific evaluator type)
- Would require a plugin UI registration API
- Significant architecture investment

### 6. Exact-Match Evaluator
The CLAUDE.md architecture lists `src/evaluators/exact-match.ts` but it was never implemented.
- Function evaluator can achieve the same result with a simple equality check
- Should we add it as a convenience evaluator or update CLAUDE.md to remove it?

---

## Resolved Questions

*Questions that have been answered are moved here with their resolution.*
