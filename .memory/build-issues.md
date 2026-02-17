# Build and Runtime Issues

## Known Issues

### DTS Warning: llm-judge.ts
**Status**: Open (low priority)
**Issue**: tsup generates DTS warnings for `llm-judge.ts` due to complex conditional types with OpenAI/Anthropic SDK types.
**Impact**: No runtime impact. Type definitions still work correctly.
**Workaround**: None needed — warnings are cosmetic.

---

## Resolved Issues

*No resolved issues recorded yet.*

---

## Build Notes

- **tsup** builds library (SDK + CLI) to `dist/`
- **Vite** builds dashboard UI to `dist/dashboard/`
- Both outputs coexist in the same `dist/` folder
- Dashboard requires separate build step: `pnpm build:dashboard`
- Dev workflow: Vite on :5173 proxies `/api` to Hono on :4000
