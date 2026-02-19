# GitHub Action

The Cobalt GitHub Action runs your experiments on every pull request and posts a rich comment with score tables, automatic comparison against the base branch, and optional AI-powered analysis. It handles dependency installation, experiment execution, result storage, and PR commenting — all in a single step.

## Quick Start

```yaml
# .github/workflows/cobalt.yml
name: Cobalt Experiments
on: [pull_request]

jobs:
  eval:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "20"
      - uses: basalt-ai/cobalt@v1
        with:
          api_key: ${{ secrets.OPENAI_API_KEY }}
```

That's it. On every PR, Cobalt will install dependencies, run all experiments, and post a comment with the results.

## What You Get

The action posts a PR comment with:

- **Score table** per experiment — Avg, P50, P95, Min, Max for each evaluator
- **Comparison column** — shows improvement/regression vs the base branch (e.g. `+0.050 (+6.3%)`)
- **Summary line** — total items, duration, improvements, regressions
- **CI status** — pass/fail details when `ci: true` is enabled
- **AI analysis** (optional) — a brief LLM-generated summary highlighting key changes

The comment is upserted (created once, then updated on subsequent pushes) so your PR stays clean with a single Cobalt comment.

## Inputs

| Input | Default | Description |
|-------|---------|-------------|
| `experiment_files` | `""` | Experiment file(s) to run (glob pattern or comma-separated). Uses `cobalt.config` defaults if empty. |
| `filter` | `""` | Filter experiments by name (case-insensitive substring match on filenames). Maps to CLI `--filter` flag. |
| `concurrency` | `""` | Override concurrency setting (number of parallel experiment items). Maps to CLI `--concurrency` flag. |
| `working_directory` | `"."` | Working directory for running experiments. |
| `ci` | `"false"` | Enable CI mode with threshold validation. Fails the action if thresholds are violated. |
| `api_key` | `""` | API key for LLM judges and AI summary. Supports both OpenAI and Anthropic (auto-detected from key prefix). |
| `ai_summary` | `"false"` | Generate an AI-powered analysis of results. Requires `api_key`. |
| `github_token` | `${{ github.token }}` | GitHub token for posting PR comments and accessing artifacts. |
| `comment_on_pr` | `"true"` | Whether to post a comment on the PR. |
| `package_manager` | `"auto"` | Package manager to use: `npm`, `pnpm`, `yarn`, or `auto` (detect from lockfile). |
| `install_deps` | `"true"` | Whether to install dependencies before running experiments. |
| `step_key` | `""` | Unique key for comment deduplication. Only change this if running multiple Cobalt steps in one workflow. |

### API Key

The `api_key` input supports both OpenAI and Anthropic keys. The provider is auto-detected from the key prefix:

- Keys starting with `sk-ant-` are detected as **Anthropic** (exported as `ANTHROPIC_API_KEY`)
- All other keys are treated as **OpenAI** (exported as `OPENAI_API_KEY`)

If no API key is provided and `ai_summary` is enabled, AI summaries are skipped gracefully without error.

```yaml
# OpenAI key
- uses: basalt-ai/cobalt@v1
  with:
    api_key: ${{ secrets.OPENAI_API_KEY }}

# Anthropic key (auto-detected from sk-ant- prefix)
- uses: basalt-ai/cobalt@v1
  with:
    api_key: ${{ secrets.ANTHROPIC_API_KEY }}
```

## Outputs

| Output | Description |
|--------|-------------|
| `passed` | Whether all experiments passed CI thresholds (`"true"` or `"false"`). |
| `total_experiments` | Number of experiments that ran. |
| `summary_json` | JSON string of all experiment summaries (names, scores, CI status). |

### Using outputs

```yaml
- uses: basalt-ai/cobalt@v1
  id: cobalt
  with:
    ci: "true"
    api_key: ${{ secrets.OPENAI_API_KEY }}

- name: Check results
  if: steps.cobalt.outputs.passed == 'false'
  run: echo "Experiments failed CI thresholds"
```

## Auto-Comparison

The action automatically compares results against the base branch:

1. After each run, results are uploaded as a GitHub Artifact (`cobalt-experiment-results`)
2. On subsequent PRs, the action downloads the most recent artifact from the base branch
3. Experiments are matched by name — if `qa-agent` ran on `main` and on your PR, they're compared
4. The comparison column shows the diff: `+0.050 (+6.3%)` for improvements, `-0.030 (-4.0%)` for regressions

This happens automatically with no configuration. The first run on a branch won't have a comparison (no previous results yet).

## AI Summary

Enable AI-powered analysis of your experiment results:

```yaml
- uses: basalt-ai/cobalt@v1
  with:
    api_key: ${{ secrets.OPENAI_API_KEY }}
    ai_summary: "true"
```

The AI summary appears in a collapsible section in the PR comment. It highlights key improvements, regressions, and provides actionable insights about your experiment results.

Requires `api_key` to be set. Uses `gpt-4o-mini` with an OpenAI key or `claude-haiku-4-5-20251001` with an Anthropic key.

## CI Threshold Validation

Combine the action with CI mode to enforce quality gates:

```yaml
- uses: basalt-ai/cobalt@v1
  with:
    ci: "true"
    api_key: ${{ secrets.OPENAI_API_KEY }}
```

When `ci: true`, the action reads thresholds from your `cobalt.config.ts` and fails if any are violated. The PR comment includes a detailed CI status section showing which thresholds passed or failed.

See the [CI/CD docs](ci-mode.md) for how to define thresholds in your config.

## Filtering Experiments

Use the `filter` input to run only experiments matching a pattern:

```yaml
- uses: basalt-ai/cobalt@v1
  with:
    filter: "qa-agent"
    api_key: ${{ secrets.OPENAI_API_KEY }}
```

This performs a case-insensitive substring match on experiment filenames — the same behavior as the CLI `--filter` flag. Useful for large test suites where you only want to run a subset on each PR.

## Comment Deduplication

By default, the action posts a single comment per PR and updates it on each push. If you run multiple Cobalt steps in one workflow, use `step_key` to keep them separate:

```yaml
- uses: basalt-ai/cobalt@v1
  with:
    experiment_files: "experiments/fast/*.cobalt.ts"
    step_key: "fast-tests"
    api_key: ${{ secrets.OPENAI_API_KEY }}

- uses: basalt-ai/cobalt@v1
  with:
    experiment_files: "experiments/slow/*.cobalt.ts"
    step_key: "slow-tests"
    api_key: ${{ secrets.OPENAI_API_KEY }}
```

Each `step_key` produces its own PR comment.

## Advanced Usage

### Run specific experiments

```yaml
- uses: basalt-ai/cobalt@v1
  with:
    experiment_files: "experiments/qa-agent.cobalt.ts"
    api_key: ${{ secrets.OPENAI_API_KEY }}
```

### Custom working directory

For monorepos where Cobalt lives in a subdirectory:

```yaml
- uses: basalt-ai/cobalt@v1
  with:
    working_directory: "packages/my-agent"
    api_key: ${{ secrets.OPENAI_API_KEY }}
```

### Override concurrency

Control how many experiment items run in parallel:

```yaml
- uses: basalt-ai/cobalt@v1
  with:
    concurrency: "10"
    api_key: ${{ secrets.OPENAI_API_KEY }}
```

### Skip PR comment

Run experiments and set outputs without posting a comment:

```yaml
- uses: basalt-ai/cobalt@v1
  id: cobalt
  with:
    comment_on_pr: "false"
    api_key: ${{ secrets.OPENAI_API_KEY }}

- run: echo "Ran ${{ steps.cobalt.outputs.total_experiments }} experiments"
```

### Skip dependency installation

If dependencies are already installed in a previous step:

```yaml
- run: pnpm install
- uses: basalt-ai/cobalt@v1
  with:
    install_deps: "false"
    api_key: ${{ secrets.OPENAI_API_KEY }}
```

### Only run on agent changes

```yaml
on:
  pull_request:
    paths:
      - "agents/**"
      - "experiments/**"
      - "cobalt.config.ts"
```

## Package Manager Detection

When `package_manager` is set to `"auto"` (the default), the action detects your package manager by checking for lockfiles in this order:

1. `pnpm-lock.yaml` → uses `pnpm`
2. `yarn.lock` → uses `yarn`
3. `package-lock.json` → uses `npm`
4. Fallback → uses `npm`

To override, set it explicitly:

```yaml
- uses: basalt-ai/cobalt@v1
  with:
    package_manager: "pnpm"
    api_key: ${{ secrets.OPENAI_API_KEY }}
```

## Full Workflow Example

```yaml
name: Cobalt Experiments

on:
  pull_request:
    paths:
      - "agents/**"
      - "experiments/**"
      - "cobalt.config.ts"

permissions:
  contents: read
  pull-requests: write
  actions: read

jobs:
  eval:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: "20"

      - uses: basalt-ai/cobalt@v1
        id: cobalt
        with:
          ci: "true"
          ai_summary: "true"
          api_key: ${{ secrets.OPENAI_API_KEY }}

      - name: Summary
        if: always()
        run: |
          echo "Passed: ${{ steps.cobalt.outputs.passed }}"
          echo "Experiments: ${{ steps.cobalt.outputs.total_experiments }}"
```

## Troubleshooting

### No experiments found

The action warns and posts a "no experiments found" comment. Check that:
- Your experiment files match the `testDir` in `cobalt.config.ts` (or the `experiment_files` input)
- The `working_directory` is correct
- Dependencies are installed (the action installs them by default)

### No previous results for comparison

This is normal on the first run. The action uploads results as an artifact after each run. Once the base branch has at least one successful run, comparisons will appear automatically.

### API key errors

If LLM judges fail, ensure `api_key` is set and the secret exists in your repository settings (Settings > Secrets and variables > Actions). The provider is auto-detected from the key prefix:
- OpenAI keys are exported as `OPENAI_API_KEY`
- Anthropic keys (starting with `sk-ant-`) are exported as `ANTHROPIC_API_KEY`

### Permission errors on PR comments

The default `github.token` needs `pull-requests: write` permission. Add it to your workflow:

```yaml
permissions:
  contents: read
  pull-requests: write
  actions: read
```

### Action fails with CI thresholds

When `ci: true` and thresholds are violated, the action fails intentionally. Check the PR comment for details on which thresholds failed. See the [CI/CD docs](ci-mode.md) to adjust your thresholds.
