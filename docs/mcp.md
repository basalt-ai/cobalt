# MCP Server

Cobalt includes a built-in [Model Context Protocol](https://modelcontextprotocol.io/) (MCP) server that lets AI assistants like Claude Code run experiments, analyze results, and improve your agents directly.

## Setup

### Claude Code / Claude Desktop

Add to your `claude_desktop_config.json`:

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

### Start Manually

```bash
npx cobalt mcp
```

The server communicates over stdio using the MCP protocol.

---

## Tools

### `cobalt_run`

Run experiments and return structured results with scores per evaluator and per item.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `file` | `string` | Yes | Path to experiment file |
| `filter` | `string` | No | Filter experiments by name (substring match) |
| `concurrency` | `number` | No | Override concurrency setting |

**Example prompt:** "Run my QA experiment at `experiments/qa-agent.cobalt.ts`"

### `cobalt_results`

List past experiment runs or get detailed results for a specific run.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `runId` | `string` | No | Get results for a specific run ID |
| `limit` | `number` | No | Number of recent runs to list (default: 10) |
| `experiment` | `string` | No | Filter runs by experiment name |

**Example prompt:** "Show me the results from my last experiment run"

### `cobalt_compare`

Compare two experiment runs and return a structured diff showing regressions and improvements.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `runA` | `string` | Yes | First run ID (baseline) |
| `runB` | `string` | Yes | Second run ID (candidate) |

Returns score differences per evaluator, regressions (>5% drop), improvements (>5% gain), and the top 10 items with the biggest changes.

**Example prompt:** "Compare runs abc123 and def456 to check for regressions"

### `cobalt_generate`

Analyze agent source code and auto-generate a Cobalt experiment file with dataset and evaluators.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `agentFile` | `string` | Yes | Path to agent source code |
| `outputFile` | `string` | No | Output path (default: `<agentFile>.cobalt.ts`) |
| `datasetSize` | `number` | No | Number of test cases to generate (default: 10) |

Uses LLM to analyze your agent code, generate appropriate test cases, and create evaluators.

**Example prompt:** "Generate tests for my agent at `src/agents/qa.ts`"

---

## Resources

Resources provide read-only context that AI assistants can access.

| Resource URI | Description |
|-------------|-------------|
| `cobalt://config` | Current `cobalt.config.ts` parsed configuration |
| `cobalt://experiments` | List of all experiment files in `testDir` |
| `cobalt://latest-results` | Latest experiment results for each experiment |

---

## Prompts

Pre-built prompts that guide AI assistants through common workflows.

### `improve-agent`

Analyzes experiment failures and suggests specific code improvements.

| Argument | Required | Description |
|----------|----------|-------------|
| `runId` | Yes | Run ID to analyze |

Identifies low-performing test cases (score < 0.7), analyzes failure patterns, and provides prioritized code-level improvement suggestions.

### `generate-tests`

Generates additional test cases to improve coverage.

| Argument | Required | Description |
|----------|----------|-------------|
| `experimentFile` | Yes | Path to experiment file |
| `focus` | No | `"edge-cases"`, `"adversarial"`, or `"coverage"` |

Analyzes existing dataset coverage and generates 5-10 new test cases targeting gaps.

### `regression-check`

Compares two runs and provides a regression verdict (PASS/WARN/FAIL).

| Argument | Required | Description |
|----------|----------|-------------|
| `baselineRunId` | Yes | Baseline run ID |
| `currentRunId` | Yes | Current run ID to compare |

Reports score changes, identifies regressions and improvements, and provides root cause hypotheses.
