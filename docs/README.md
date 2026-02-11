<div align="center">

<img src="../assets/logo.png" alt="Cobalt" width="150" />

# Cobalt Documentation

> **Unit Testing for AI** — A TypeScript testing framework for AI agents and LLM applications

</div>

Welcome to the Cobalt documentation! This guide will help you test, evaluate, and improve your AI agents with confidence.

## 🚀 Quick Links

- **New to Cobalt?** Start with the [5-Minute Quickstart](getting-started/quickstart.md)
- **Need Help?** Check [Troubleshooting](troubleshooting/common-errors.md)
- **Working Examples?** Browse [Example Projects](examples/README.md)
- **API Reference?** See [API Documentation](reference/api/experiment.md)
- **Using Claude Code?** Read the [MCP Integration Guide](reference/mcp/overview.md)

## 📚 Documentation Sections

### Getting Started

Perfect for beginners — get your first experiment running in minutes.

- [Installation](getting-started/installation.md) — Set up Cobalt in your project
- [Quickstart](getting-started/quickstart.md) — 5-minute tutorial
- [Your First Experiment](getting-started/first-experiment.md) — Detailed walkthrough
- [Understanding Results](getting-started/understanding-results.md) — Interpret scores and metrics
- [Next Steps](getting-started/next-steps.md) — Where to go from here

### Core Guides

Learn the core concepts and features.

**Evaluators:**
- [Evaluator Overview](guides/evaluators/overview.md) — How evaluation works
- [LLM Judge](guides/evaluators/llm-judge.md) — LLM-based evaluation
- [Function Evaluators](guides/evaluators/function-evaluators.md) — Custom JavaScript functions
- [Exact Match](guides/evaluators/exact-match.md) — String comparison
- [Similarity](guides/evaluators/similarity.md) — Semantic similarity with embeddings
- [Autoevals](guides/evaluators/autoevals.md) — Braintrust Autoevals integration

**Datasets:**
- [Dataset Overview](guides/datasets/overview.md) — Working with test data
- [Loading Data](guides/datasets/loading-data.md) — JSON, JSONL, CSV loaders
- [Transformations](guides/datasets/transformations.md) — map, filter, sample, slice
- [Best Practices](guides/datasets/best-practices.md) — Organizing datasets

**Advanced Features:**
- [Multiple Runs](guides/multiple-runs.md) — Statistical aggregation
- [Cost Optimization](guides/cost-optimization.md) — Caching and cost management
- [CI/CD Integration](guides/ci-mode.md) — Threshold-based quality gates
- [Plugin System](guides/plugins.md) — Custom evaluators
- [MCP Integration](guides/mcp-integration.md) — Claude Code integration

### Example Projects

Real-world examples with complete working code.

- [Examples Index](examples/README.md) — Overview of all examples
- [Q&A Agent](examples/qa-agent/README.md) — Question answering system
- [Summarization](examples/summarization/README.md) — Document summarization
- [Classification](examples/classification/README.md) — Text classification
- [RAG Pipeline](examples/rag-pipeline/README.md) — Retrieval augmented generation
- [Multi-Agent](examples/multi-agent/README.md) — Coordinated agents
- [Custom Plugin](examples/custom-plugin/README.md) — Building evaluator plugins

### Reference Documentation

Complete API and CLI reference.

**API:**
- [experiment()](reference/api/experiment.md) — Main experiment function
- [Evaluator](reference/api/evaluator.md) — Evaluator class
- [Dataset](reference/api/dataset.md) — Dataset class
- [Configuration](reference/api/config.md) — Config API
- [Utilities](reference/api/utilities.md) — Helper functions

**CLI:**
- [CLI Overview](reference/cli/overview.md) — Command-line interface
- [cobalt run](reference/cli/run.md) — Run experiments
- [cobalt init](reference/cli/init.md) — Initialize project
- [cobalt history](reference/cli/history.md) — View past runs
- [cobalt compare](reference/cli/compare.md) — Compare results
- [cobalt serve](reference/cli/serve.md) — Start dashboard
- [cobalt clean](reference/cli/clean.md) — Clean cache/results
- [cobalt mcp](reference/cli/mcp.md) — MCP server

**MCP (Model Context Protocol):**
- [MCP Overview](reference/mcp/overview.md) — Setup and configuration
- [MCP Tools](reference/mcp/tools.md) — cobalt_run, cobalt_results, etc.
- [MCP Resources](reference/mcp/resources.md) — cobalt://config, etc.
- [MCP Prompts](reference/mcp/prompts.md) — improve-agent, generate-tests, etc.

**Other:**
- [Configuration](reference/configuration.md) — cobalt.config.ts reference
- [Environment Variables](reference/environment-variables.md) — All env vars
- [TypeScript Types](reference/typescript-types.md) — Type definitions

### Tutorials

Step-by-step guides for common tasks.

- [Testing a Chatbot](tutorials/testing-chatbot.md) — End-to-end chatbot testing
- [Evaluating RAG Systems](tutorials/evaluating-rag.md) — RAG evaluation strategies
- [Custom Evaluators](tutorials/custom-evaluators.md) — Building custom evaluators
- [CI/CD Setup](tutorials/ci-cd-setup.md) — Automating AI tests
- [Plugin Development](tutorials/plugin-development.md) — Creating evaluator plugins

### Best Practices

Learn effective patterns and strategies.

- [Evaluator Design](best-practices/evaluator-design.md) — Designing good evaluators
- [Dataset Organization](best-practices/dataset-organization.md) — Structuring test data
- [Performance](best-practices/performance.md) — Optimization strategies
- [Cost Management](best-practices/cost-management.md) — Minimizing API costs
- [Testing Strategies](best-practices/testing-strategies.md) — AI testing patterns

### Troubleshooting

Common issues and solutions.

- [Common Errors](troubleshooting/common-errors.md) — Frequent problems
- [API Issues](troubleshooting/api-issues.md) — API keys and rate limits
- [Performance Issues](troubleshooting/performance-issues.md) — Slow execution
- [Debugging](troubleshooting/debugging.md) — Debugging experiments

### Migration Guides

Moving to Cobalt from other tools.

- [From pytest](migration/from-pytest.md) — Migrating from pytest
- [From Braintrust](migration/from-braintrust.md) — Migrating from Braintrust
- [Version Upgrades](migration/version-upgrades.md) — Upgrading Cobalt versions

### Contributing

Help improve Cobalt.

- [Development Setup](contributing/development-setup.md) — Setting up dev environment
- [Architecture](contributing/architecture.md) — System design
- [Adding Evaluators](contributing/adding-evaluators.md) — New evaluator types
- [Testing Guidelines](contributing/testing.md) — Writing tests

## 🎯 Common Workflows

### I want to...

**Get Started:**
- [Install Cobalt](getting-started/installation.md) → [Run my first experiment](getting-started/quickstart.md)

**Test My Agent:**
- [Create a dataset](guides/datasets/overview.md) → [Choose evaluators](guides/evaluators/overview.md) → [Run experiments](reference/cli/run.md)

**Integrate with CI/CD:**
- [Set up thresholds](guides/ci-mode.md) → [Configure GitHub Actions](tutorials/ci-cd-setup.md)

**Use with Claude Code:**
- [Install MCP server](reference/mcp/overview.md) → [Use Cobalt tools](reference/mcp/tools.md)

**Customize Evaluators:**
- [Write a function evaluator](guides/evaluators/function-evaluators.md) → [Create a plugin](guides/plugins.md)

**Reduce Costs:**
- [Enable caching](guides/cost-optimization.md) → [Optimize runs](best-practices/cost-management.md)

## 💡 Need Help?

- **Documentation**: You're in the right place!
- **Examples**: Check [example projects](examples/README.md)
- **Issues**: [GitHub Issues](https://github.com/yourusername/cobalt/issues)
- **Discussions**: [GitHub Discussions](https://github.com/yourusername/cobalt/discussions)

## 🔍 What is Cobalt?

Cobalt is a TypeScript testing framework specifically designed for AI agents and LLM-powered applications. It provides:

- **Experiment Runner**: Test agents against datasets with reproducible results
- **Evaluators**: LLM-based judges, similarity, exact match, autoevals, custom functions
- **Dataset Management**: Load from JSON/JSONL/CSV with transformations
- **Result Tracking**: SQLite history, cost tracking, comparison tools
- **CI/CD Integration**: Threshold-based quality gates with exit codes
- **MCP Integration**: Native Claude Code integration via Model Context Protocol
- **Plugin System**: Extend with custom evaluators

### Who is Cobalt for?

- **AI Engineers** building LLM applications
- **ML Engineers** evaluating model outputs
- **Product Teams** ensuring AI quality
- **Researchers** running experiments
- **DevOps** integrating AI tests into CI/CD

### Why Cobalt?

| Feature | Cobalt | pytest | Braintrust |
|---------|--------|--------|------------|
| TypeScript-first | ✅ | ❌ | ✅ |
| LLM Evaluators | ✅ | ❌ | ✅ |
| Local-first | ✅ | ✅ | ❌ |
| Plugin System | ✅ | ✅ | ❌ |
| MCP Integration | ✅ | ❌ | ❌ |
| CI/CD Ready | ✅ | ✅ | ✅ |
| Cost Tracking | ✅ | ❌ | ✅ |

---

**Ready to start?** → [Install Cobalt](getting-started/installation.md) and run your [first experiment](getting-started/quickstart.md) in 5 minutes!
