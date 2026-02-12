# Next Steps

You've completed the getting started guides! Here's where to go next based on your goals.

## Quick Reference

| I want to... | Go to |
|-------------|--------|
| **Add more evaluators** | [Evaluator Guide](../guides/evaluators/overview.md) |
| **Load data from files** | [Dataset Loading](../guides/datasets/loading-data.md) |
| **Set up CI/CD** | [CI/CD Integration](../guides/ci-mode.md) |
| **Reduce costs** | [Cost Optimization](../guides/cost-optimization.md) |
| **Create custom evaluators** | [Plugin System](../guides/plugins.md) |
| **Use with Claude Code** | [MCP Integration](../reference/mcp/overview.md) |
| **See working examples** | [Example Projects](../examples/README.md) |

## Learning Paths

### 🎯 Path 1: Improve Your Tests

**Goal**: Write better evaluations with multiple evaluator types

1. **[Evaluator Overview](../guides/evaluators/overview.md)**
   - Understand evaluator types
   - Choose the right evaluator for your needs

2. **[LLM Judge](../guides/evaluators/llm-judge.md)**
   - Create AI-powered evaluations
   - Write effective prompts

3. **[Function Evaluators](../guides/evaluators/function-evaluators.md)**
   - Write custom JavaScript evaluators
   - Implement deterministic checks

4. **[Autoevals Integration](../guides/evaluators/autoevals.md)**
   - Use Braintrust's battle-tested evaluators
   - Access 11+ evaluation types

**Time**: 1-2 hours

---

### 📊 Path 2: Organize Your Data

**Goal**: Manage test datasets effectively

1. **[Dataset Overview](../guides/datasets/overview.md)**
   - Dataset structure and formats
   - Best practices

2. **[Loading Data](../guides/datasets/loading-data.md)**
   - Load from JSON, JSONL, CSV
   - Handle different formats

3. **[Transformations](../guides/datasets/transformations.md)**
   - Filter, map, sample datasets
   - Build data pipelines

4. **[Best Practices](../guides/datasets/best-practices.md)**
   - Organize test data
   - Version datasets

**Time**: 1 hour

---

### 🚀 Path 3: Production Readiness

**Goal**: Deploy AI testing in CI/CD pipelines

1. **[CI/CD Integration](../guides/ci-mode.md)**
   - Set up quality gates
   - Configure thresholds
   - Exit codes for pipelines

2. **[Cost Optimization](../guides/cost-optimization.md)**
   - Enable caching
   - Reduce token usage
   - Monitor spending

3. **[Multiple Runs](../guides/multiple-runs.md)**
   - Run experiments multiple times
   - Statistical aggregation
   - Handle LLM variance

4. **[CI/CD Setup Tutorial](../tutorials/ci-cd-setup.md)**
   - GitHub Actions example
   - GitLab CI example
   - Jenkins example

**Time**: 2 hours

---

### 🔧 Path 4: Extend Cobalt

**Goal**: Build custom evaluators and integrations

1. **[Plugin System](../guides/plugins.md)**
   - Plugin architecture
   - Creating plugins
   - Publishing plugins

2. **[Custom Evaluators Tutorial](../tutorials/custom-evaluators.md)**
   - Step-by-step plugin development
   - Real-world examples

3. **[Plugin Template](../../examples/plugin-template/README.md)**
   - Working plugin template
   - Best practices
   - Testing plugins

**Time**: 2-3 hours

---

### 🤖 Path 5: Use with Claude Code

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

### [Custom Plugin](../examples/custom-plugin/README.md)
Build a custom evaluator plugin
- **What you'll learn**: Plugin development, evaluator patterns
- **Time**: 20 minutes

---

## Advanced Topics

Once you're comfortable with the basics:

### Tutorials

- **[Testing a Chatbot](../tutorials/testing-chatbot.md)** — End-to-end chatbot evaluation
- **[Evaluating RAG Systems](../tutorials/evaluating-rag.md)** — RAG-specific metrics
- **[Custom Evaluators](../tutorials/custom-evaluators.md)** — Build your own evaluators
- **[CI/CD Setup](../tutorials/ci-cd-setup.md)** — Automate AI testing
- **[Plugin Development](../tutorials/plugin-development.md)** — Create reusable plugins

### Best Practices

- **[Evaluator Design](../best-practices/evaluator-design.md)** — Designing effective evaluators
- **[Dataset Organization](../best-practices/dataset-organization.md)** — Structuring test data
- **[Performance](../best-practices/performance.md)** — Optimization techniques
- **[Cost Management](../best-practices/cost-management.md)** — Controlling expenses
- **[Testing Strategies](../best-practices/testing-strategies.md)** — AI testing patterns

### Reference

- **[API Documentation](../reference/api/experiment.md)** — Complete API reference
- **[CLI Commands](../reference/cli/overview.md)** — All CLI commands
- **[Configuration](../reference/configuration.md)** — Config file reference
- **[TypeScript Types](../reference/typescript-types.md)** — Type definitions

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

**Next**: [CI/CD Integration](../guides/ci-mode.md)

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
  cache: { enabled: true, ttl: 86400000 }
})
```

**Next**: [Cost Optimization](../guides/cost-optimization.md)

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

**Next**: [Multiple Runs](../guides/multiple-runs.md)

---

## Community & Support

### Get Help

- **[Troubleshooting Guide](../troubleshooting/common-errors.md)** — Common issues
- **[API Issues](../troubleshooting/api-issues.md)** — API keys, rate limits
- **[GitHub Issues](https://github.com/yourusername/cobalt/issues)** — Report bugs
- **[Discussions](https://github.com/yourusername/cobalt/discussions)** — Ask questions

### Contribute

- **[Development Setup](../contributing/development-setup.md)** — Set up dev environment
- **[Architecture](../contributing/architecture.md)** — Understand the codebase
- **[Adding Evaluators](../contributing/adding-evaluators.md)** — Contribute evaluators
- **[Testing Guidelines](../contributing/testing.md)** — Write tests

### Stay Updated

- Watch the GitHub repository for releases
- Follow development discussions
- Check the roadmap for upcoming features

---

## Resources

### Documentation

- **[Full Documentation Index](../index.md)** — All documentation
- **[API Reference](../reference/api/experiment.md)** — Complete API docs
- **[CLI Reference](../reference/cli/overview.md)** — All commands

### Examples

- **[Example Projects](../examples/README.md)** — Working code examples
- **[Plugin Template](../../examples/plugin-template/README.md)** — Plugin starter

### Guides

- **[Core Guides](../guides/evaluators/overview.md)** — Essential concepts
- **[Tutorials](../tutorials/testing-chatbot.md)** — Step-by-step guides
- **[Best Practices](../best-practices/evaluator-design.md)** — Proven patterns

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

**Ready to dive deeper?** Choose a learning path above or explore the [full documentation](../index.md)!
