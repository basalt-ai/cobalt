# Next Steps

You've completed the getting started guides! Here's where to go next based on your goals.

## Quick Reference

| I want to... | Go to |
|-------------|--------|
| **Add more evaluators** | [Evaluator Guide](../evaluators.md) |
| **Load data from files** | [Dataset Guide](../datasets.md) |
| **Set up CI/CD** | [CI/CD Integration](../ci-mode.md) |
| **Reduce costs** | [Configuration](../configuration.md) |
| **Create custom evaluators** | [Plugin System](../plugins.md) |
| **Use with Claude Code** | [MCP Integration](../reference/mcp/overview.md) |
| **See working examples** | [Example Projects](../examples/README.md) |

## Learning Paths

### Path 1: Improve Your Tests

**Goal**: Write better evaluations with multiple evaluator types

1. **[Evaluator Guide](../evaluators.md)**
   - Understand evaluator types
   - Choose the right evaluator for your needs
   - LLM judges, function evaluators, autoevals

2. **[Plugin System](../plugins.md)**
   - Build custom evaluator plugins
   - Extend Cobalt with new evaluator types

**Time**: 1-2 hours

---

### Path 2: Organize Your Data

**Goal**: Manage test datasets effectively

1. **[Dataset Guide](../datasets.md)**
   - Dataset structure and formats
   - Load from JSON, JSONL, CSV
   - Filter, map, sample datasets

**Time**: 1 hour

---

### Path 3: Production Readiness

**Goal**: Deploy AI testing in CI/CD pipelines

1. **[CI/CD Integration](../ci-mode.md)**
   - Set up quality gates
   - Configure thresholds
   - Exit codes for pipelines

2. **[Configuration](../configuration.md)**
   - Enable caching
   - Reduce token usage
   - Monitor spending

3. **[Experiments Guide](../experiments.md)**
   - Run experiments multiple times
   - Statistical aggregation
   - Handle LLM variance

**Time**: 2 hours

---

### Path 4: Extend Cobalt

**Goal**: Build custom evaluators and integrations

1. **[Plugin System](../plugins.md)**
   - Plugin architecture
   - Creating plugins
   - Publishing plugins

2. **[Plugin Template](../examples/plugin-template/README.md)**
   - Working plugin template
   - Best practices
   - Testing plugins

**Time**: 2-3 hours

---

### Path 5: Use with Claude Code

**Goal**: Integrate Cobalt with Claude Code via MCP

1. **[MCP Overview](../reference/mcp/overview.md)**
   - What is MCP?
   - Setup and configuration

2. **[MCP Tools](../reference/mcp/tools.md)**
   - cobalt_run, cobalt_results, cobalt_compare
   - cobalt_generate for auto-generation

3. **[MCP Integration Guide](../guides/mcp-integration.md)**
   - Common workflows
   - Claude Code usage patterns

4. **[MCP Prompts](../reference/mcp/prompts.md)**
   - improve-agent workflow
   - generate-tests workflow
   - regression-check workflow

**Time**: 1 hour

---

## Example Projects

Real-world working examples you can run immediately:

### [Q&A Agent](../examples/qa-agent/README.md)
Test a question-answering system with multiple evaluators
- **What you'll learn**: Basic experiment structure, function evaluators
- **Time**: 10 minutes

### [Summarization](../examples/summarization/README.md)
Evaluate document summarization quality
- **What you'll learn**: LLM judges, faithfulness evaluation
- **Time**: 15 minutes

### [Classification](../examples/classification/README.md)
Test text classification accuracy
- **What you'll learn**: CSV loading, function evaluators
- **Time**: 10 minutes

### [RAG Pipeline](../examples/rag-pipeline/README.md)
Evaluate retrieval-augmented generation systems
- **What you'll learn**: Context precision/recall, complex evaluations
- **Time**: 20 minutes

### [Multi-Agent](../examples/multi-agent/README.md)
Test coordinated multi-agent workflows
- **What you'll learn**: End-to-end testing, agent orchestration
- **Time**: 25 minutes

### [Custom Plugin](../examples/plugin-template/README.md)
Build a custom evaluator plugin
- **What you'll learn**: Plugin development, evaluator patterns
- **Time**: 20 minutes

---

## Common Next Actions

### For QA Engineers

```typescript
// 1. Create comprehensive test suites
const dataset = Dataset.fromJSON('./tests/scenarios.json')
  .filter(item => item.priority === 'high')

// 2. Set up CI/CD thresholds
export default defineConfig({
  thresholds: {
    evaluators: {
      'accuracy': { avg: 0.85, p95: 0.70 }
    }
  }
})

// 3. Track regressions
npx cobalt compare baseline latest
```

**Next**: [CI/CD Integration](../ci-mode.md)

---

### For AI Engineers

```typescript
// 1. Test multiple model variants
const models = ['gpt-4o', 'gpt-5-mini', 'claude-3-5-sonnet']
for (const model of models) {
  await experiment(`agent-${model}`, dataset, runner, {
    evaluators,
    tags: [model]
  })
}

// 2. Use LLM judges for subjective metrics
new Evaluator({
  type: 'llm-judge',
  prompt: 'Rate creativity from 0-1...'
})

// 3. Optimize costs with caching
export default defineConfig({
  cache: { enabled: true, ttl: '24h' }
})
```

**Next**: [Configuration](../configuration.md)

---

### For Product Teams

```typescript
// 1. Define success criteria
const evaluators = [
  new Evaluator({
    name: 'user-satisfaction',
    type: 'llm-judge',
    prompt: 'Rate user satisfaction 0-1...'
  }),
  new Evaluator({
    name: 'response-time',
    type: 'function',
    fn: ({ metadata }) => ({
      score: metadata.duration < 3000 ? 1 : 0,
      reason: `Response time: ${metadata.duration}ms`
    })
  })
]

// 2. Track metrics over time
npx cobalt history --experiment "chatbot-v2"

// 3. Compare releases
npx cobalt compare v1.0 v1.1
```

**Next**: [Understanding Results](understanding-results.md)

---

### For Researchers

```typescript
// 1. Run experiments with multiple iterations
experiment('study-001', dataset, runner, {
  evaluators,
  runs: 10  // Statistical significance
})

// 2. Export data for analysis
import { loadResult } from '@basalt-ai/cobalt'
const results = await loadResult('abc123')
// Analyze in Python, R, etc.

// 3. Test hypotheses
const baselineScores = await loadResult('baseline')
const treatmentScores = await loadResult('treatment')
// Statistical testing
```

**Next**: [Experiments Guide](../experiments.md)

---

## Resources

### Documentation

- **[Documentation Index](../README.md)** — All documentation
- **[Evaluators](../evaluators.md)** — Evaluator guide
- **[Datasets](../datasets.md)** — Dataset guide
- **[Configuration](../configuration.md)** — Config reference

### Examples

- **[Example Projects](../examples/README.md)** — Working code examples
- **[Plugin Template](../examples/plugin-template/README.md)** — Plugin starter

---

## Quick Tips

### Performance
```typescript
// Use concurrency for faster execution
{ concurrency: 5 }

// Enable caching for repeated experiments
{ cache: { enabled: true } }
```

### Cost Savings
```typescript
// Use cheaper models for evaluators
new Evaluator({
  type: 'llm-judge',
  model: 'gpt-5-mini'  // vs gpt-4o
})

// Use function evaluators when possible
new Evaluator({
  type: 'function',
  fn: ({ output }) => { /* deterministic logic */ }
})
```

### Organization
```typescript
// Tag experiments for filtering
{ tags: ['v2', 'production', 'gpt-4o'] }

// Use descriptive names
experiment('chatbot-response-quality-v2', ...)

// Keep datasets versioned
./datasets/v1/questions.json
./datasets/v2/questions.json
```

---

**Ready to dive deeper?** Choose a learning path above or explore the [full documentation](../README.md)!
