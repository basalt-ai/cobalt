<div align="center">

<img src="assets/logo.png" alt="Cobalt" width="200" />

# Cobalt

**Unit testing for AI Agents** — Test, evaluate, and improve your AI systems.

![Build Status](https://github.com/basalt-ai/cobalt/actions/workflows/test.yml/badge.svg)
[![npm version](https://img.shields.io/npm/v/@basalt-ai/cobalt.svg)](https://www.npmjs.com/package/@basalt-ai/cobalt)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue.svg)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18%2B-green.svg)](https://nodejs.org/)
[![Discord](https://img.shields.io/discord/1234567890?color=7289da&label=Discord&logo=discord&logoColor=white)](https://discord.gg/yW2RyZKY)

<br />

<p>
  <img src="assets/langfuse.png" alt="Langfuse" height="28" />&nbsp;&nbsp;
  <img src="assets/langsmith.png" alt="LangSmith" height="28" />&nbsp;&nbsp;
  <img src="assets/braintrust.png" alt="Braintrust" height="28" />&nbsp;&nbsp;
  <img src="assets/basalt.png" alt="Basalt" height="28" />
</p>

<!-- TODO: Add demo GIF -->

</div>

---

## Table of Contents

- [Why Cobalt](#why-cobalt)
- [Quickstart](#quickstart)
- [Core Concepts](#core-concepts)
- [AI-First](#ai-first)
- [CI/CD](#cicd)
- [Integrations](#integrations)
- [Configuration](#configuration)
- [CLI](#cli)
- [Roadmap](#roadmap)
- [Contributing](#contributing)
- [License](#license)

## Why Cobalt

Cobalt is a TypeScript testing framework built for AI agents and LLM-powered applications. Define datasets, run your agent, and evaluate outputs with LLM judges, custom functions, or pre-built evaluators — all from the command line. Results are tracked in SQLite with built-in comparison tools, cost estimation, and CI/CD quality gates. Cobalt ships with an MCP server so AI coding assistants can run experiments and improve your agents directly.

## Quickstart

```bash
npm install @basalt-ai/cobalt
npx cobalt init
npx cobalt run
```

That's it — `cobalt init` creates an example experiment and runs it out of the box.

Now write your own. Create `experiments/my-agent.cobalt.ts`:

```typescript
import { experiment, Dataset, Evaluator } from '@basalt-ai/cobalt'

// Define your test data
const dataset = new Dataset({
  items: [
    { input: 'What is 2+2?', expectedOutput: '4' },
    { input: 'Capital of France?', expectedOutput: 'Paris' },
  ],
})

// Run your agent and evaluate
experiment('qa-agent', dataset, async ({ item }) => {
  const result = await myAgent(item.input)
  return { output: result }
}, {
  evaluators: [
    new Evaluator({
      name: 'Correctness',
      type: 'llm-judge',
      prompt: 'Is the output correct?\nExpected: {{expectedOutput}}\nActual: {{output}}',
    }),
  ],
})
```

```bash
npx cobalt run experiments/my-agent.cobalt.ts
```

## Core Concepts

### Dataset

Your test data. Load from JSON, JSONL, CSV, inline objects, or pull directly from platforms like Langfuse, LangSmith, Braintrust, and Basalt. Datasets are immutable and chainable — transform them with `filter()`, `map()`, `sample()`, and `slice()`.

[Read the Dataset docs →](docs/datasets.md)

### Evaluator

Scores your agent's output. Four built-in types: **LLM judge** (boolean pass/fail or 0-1 scale), **custom functions** (write your own logic), **semantic similarity** (cosine/dot product), and **Autoevals** (11 battle-tested evaluators from Braintrust). Extend with plugins for domain-specific evaluators.

[Read the Evaluator docs →](docs/evaluators.md)

### Experiment

The core loop. An experiment runs your agent against every item in a dataset, evaluates each output, and produces a structured report with per-evaluator statistics (avg, min, max, p50, p95, p99). Supports parallel execution, multiple runs with aggregation, timeouts, and CI thresholds.

[Read the Experiment docs →](docs/experiments.md)

## AI-First

Cobalt is built for AI-assisted development. Connect the MCP server, and your AI coding assistant can run experiments, analyze failures, and iterate on your agent — all from a single conversation.

**Get started in 30 seconds:**

1. Add the Cobalt MCP server to your assistant config
2. Ask it to run your experiments
3. Let it analyze failures and suggest improvements

### Example Prompts

> **"Run my QA experiment and tell me which test cases are failing"**

> **"Generate a Cobalt experiment for my agent at `src/agents/summarizer.ts`"**

> **"Compare my last two runs and check for regressions"**

> **"My agent is scoring 60% on correctness — analyze the failures and suggest code fixes"**

### MCP Server

The built-in [MCP](https://modelcontextprotocol.io/) server gives Claude Code (and other MCP clients) direct access to your experiments:

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

| Tools | Resources | Prompts |
|-------|-----------|---------|
| `cobalt_run` — Run experiments | `cobalt://config` — Current config | `improve-agent` — Analyze failures |
| `cobalt_results` — View results | `cobalt://experiments` — List experiments | `generate-tests` — Add test cases |
| `cobalt_compare` — Diff two runs | `cobalt://latest-results` — Latest results | `regression-check` — Detect regressions |
| `cobalt_generate` — Generate experiments | | |

[Read the MCP docs →](docs/mcp.md)

### Skills

`cobalt init` generates a `.cobalt/SKILLS.md` file and integrates with your AI instruction files (`CLAUDE.md`, `AGENTS.md`, `.github/copilot-instructions.md`) so your assistant knows how to use Cobalt from day one.

[Read the Skills docs →](docs/skills.md)

## CI/CD

Cobalt is built to run in your CI pipeline. Define quality thresholds for your agents, and Cobalt will enforce them on every commit — ensuring your AI systems stay reliable over time, not just at launch.

```bash
npx cobalt run experiments/ --ci
# Exit code 1 if any threshold is violated
```

```yaml
# .github/workflows/test-agent.yml
- name: Run AI Agent Tests
  run: npx cobalt run experiments/ --ci
  env:
    OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
```

Define thresholds per evaluator, latency, cost, or overall score — Cobalt catches regressions before they reach production.

[Read the CI/CD docs →](docs/ci-mode.md)

## Integrations

Load datasets from your existing evaluation platforms:

| Platform | Loader | Docs |
|----------|--------|------|
| **Langfuse** | `Dataset.fromLangfuse('dataset-name')` | [Setup →](docs/integrations/langfuse.md) |
| **LangSmith** | `Dataset.fromLangsmith('dataset-name')` | [Setup →](docs/integrations/langsmith.md) |
| **Braintrust** | `Dataset.fromBraintrust('project', 'dataset')` | [Setup →](docs/integrations/braintrust.md) |
| **Basalt** | `Dataset.fromBasalt('dataset-id')` | [Setup →](docs/integrations/basalt.md) |

File formats: JSON, JSONL, CSV, HTTP/HTTPS remote URLs.

LLM providers: [OpenAI and Anthropic](docs/providers.md) (auto-detected from model name).

## Configuration

```typescript
// cobalt.config.ts
import { defineConfig } from '@basalt-ai/cobalt'

export default defineConfig({
  testDir: './experiments',
  judge: { model: 'gpt-4o-mini', provider: 'openai' },
  concurrency: 5,
  timeout: 30_000,
  cache: { enabled: true, ttl: '7d' },
})
```

| Option | Default | Description |
|--------|---------|-------------|
| `testDir` | `'./experiments'` | Experiment file directory |
| `judge.model` | `'gpt-4o-mini'` | Default LLM judge model |
| `concurrency` | `5` | Max parallel executions |
| `timeout` | `30000` | Per-item timeout (ms) |
| `reporters` | `['cli', 'json']` | Output reporters |
| `cache.ttl` | `'7d'` | LLM response cache TTL |
| `plugins` | `[]` | Custom evaluator plugins |
| `thresholds` | -- | CI quality gates |

[Full Configuration Reference →](docs/configuration.md)

## CLI

```bash
cobalt run <file|dir>          # Run experiments
cobalt init                    # Initialize project
cobalt history                 # View past runs
cobalt compare <id1> <id2>     # Compare two runs
cobalt serve                   # Start dashboard
cobalt clean                   # Clean cache/results
cobalt mcp                     # Start MCP server
```

## Roadmap

Cobalt is open source and community-driven. The roadmap is shaped by what you need — [tell us what matters to you](https://github.com/basalt-ai/cobalt/discussions).

| Status | Feature |
|--------|---------|
| :white_check_mark: | Core experiment runner, evaluators, datasets, CLI |
| :white_check_mark: | MCP server for AI-assisted testing |
| :white_check_mark: | CI mode with quality thresholds |
| :white_check_mark: | Plugin system & Autoevals integration |
| :construction: | **Vibe code your test reports** — Interactive dashboard UI |
| :construction: | **GitHub Action** — First-class CI integration |
| :crystal_ball: | **Python version** — Bring Cobalt to the Python ecosystem |
| :crystal_ball: | **VS Code extension** — Run experiments from your editor |
| :crystal_ball: | **Multi-platform export** — Push results to Langfuse, LangSmith, Braintrust |

## Contributing

We welcome contributions! See our **[Contributing Guide](CONTRIBUTING.md)** for development setup, code standards, and PR process.

- **Report bugs**: [Open an issue](https://github.com/basalt-ai/cobalt/issues)
- **Suggest features**: [GitHub Issues](https://github.com/basalt-ai/cobalt/issues)
- **Create plugins**: Extend Cobalt with custom evaluators ([Plugin docs](docs/plugins.md))

## License

MIT — see [LICENSE](LICENSE) for details.
