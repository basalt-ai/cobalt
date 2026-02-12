# CI/CD Integration

Cobalt integrates seamlessly into CI/CD pipelines with threshold-based quality gates and exit codes.

## Overview

CI Mode enables:
- **Automated Quality Gates**: Fail builds if experiments don't meet quality thresholds
- **Regression Detection**: Catch performance degradations before deployment
- **Continuous Monitoring**: Track AI quality metrics over time
- **Team Alignment**: Enforce minimum quality standards across the team

## Quick Start

### 1. Define Thresholds

In `cobalt.config.ts`:

```typescript
export default defineConfig({
  thresholds: {
    // Global thresholds (across all evaluators)
    score: { avg: 0.7 },
    latency: { avg: 5000 },
    cost: { max: 1.0 },

    // Per-evaluator thresholds
    evaluators: {
      'relevance': { avg: 0.8, passRate: 0.9 },
      'accuracy': { avg: 0.85 }
    }
  }
})
```

### 2. Run in CI

Use the `--ci` flag to enable threshold validation and exit codes:

```bash
# Exit code 0 if all thresholds pass
# Exit code 1 if any threshold fails
pnpm cobalt run experiments/ --ci
```

### 3. Add to CI Pipeline

```yaml
# GitHub Actions
name: AI Quality Check
on: [pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: pnpm/action-setup@v2
      - run: pnpm install
      - run: pnpm cobalt run experiments/ --ci
        env:
          OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
```

## Threshold Configuration

Thresholds support both **global** metrics (across all evaluators) and **per-evaluator** metrics.

### Global Thresholds

Set quality gates across your entire experiment:

```typescript
thresholds: {
  score: {             // Average score across ALL evaluators
    avg: 0.7,
    min: 0.3
  },
  latency: {           // Response latency (ms)
    avg: 5000,
    max: 15000
  },
  tokens: {            // Total token usage
    max: 50000
  },
  cost: {              // Estimated cost (USD)
    max: 1.0
  }
}
```

### Per-Evaluator Thresholds

Set thresholds for specific evaluators:

```typescript
thresholds: {
  evaluators: {
    'relevance': {
      avg: 0.8,       // Average relevance >= 0.8
      min: 0.5,       // No scores below 0.5
      p50: 0.85,      // Median >= 0.85
      p95: 0.75       // 95% of scores >= 0.75
    },
    'accuracy': {
      passRate: 0.9,  // 90% of items must pass
      avg: 0.85
    }
  }
}
```

### Combined Thresholds

Use both global and per-evaluator thresholds:

```typescript
thresholds: {
  score: { avg: 0.7 },          // Global quality bar
  cost: { max: 0.50 },          // Budget limit
  evaluators: {
    'quality': {
      avg: 0.8,                 // Per-evaluator average
      passRate: 0.95            // AND 95% of items must pass
    }
  }
}
```

## CI Mode Behavior

CI mode is activated by the `--ci` flag. Without the flag, thresholds are ignored even if defined in config.

### Exit Codes

```bash
# Success (exit 0)
pnpm cobalt run experiments/ --ci
# ✓ All thresholds passed

# Failure (exit 1)
pnpm cobalt run experiments/ --ci
# ✗ CI Mode: 2 threshold(s) failed
#   score: avg score 0.650 < threshold 0.700
#   evaluators.accuracy: pass rate 85.0% (17/20) < threshold 90.0%
```

### Output Format

**Passing Run:**

```
Experiment: my-agent-test
Items: 20/20 completed
Duration: 15.3s

Scores:
  relevance: 0.85 (min: 0.70, max: 0.95)
  accuracy: 0.92 (min: 0.80, max: 1.00)

CI Status: PASSED ✓
```

**Failing Run:**

```
Experiment: my-agent-test
Items: 20/20 completed
Duration: 15.3s

Scores:
  relevance: 0.65 (min: 0.40, max: 0.85)
  accuracy: 0.92 (min: 0.80, max: 1.00)

CI Status: FAILED ✗
  ✗ relevance: avg score 0.650 < threshold 0.700
```

## CI Pipeline Examples

### GitHub Actions

```yaml
name: AI Quality Gates

on:
  pull_request:
    paths:
      - 'agents/**'
      - 'experiments/**'

jobs:
  quality-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - uses: pnpm/action-setup@v2
        with:
          version: 8

      - uses: actions/setup-node@v3
        with:
          node-version: '20'
          cache: 'pnpm'

      - run: pnpm install

      - name: Run AI Tests
        run: pnpm cobalt run experiments/ --ci
        env:
          OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}

      - name: Upload Results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: cobalt-results
          path: .cobalt/results/
```

### GitLab CI

```yaml
ai-quality-check:
  image: node:20
  before_script:
    - npm install -g pnpm
    - pnpm install
  script:
    - pnpm cobalt run experiments/ --ci
  artifacts:
    when: always
    paths:
      - .cobalt/results/
  only:
    - merge_requests
```

### CircleCI

```yaml
version: 2.1

jobs:
  quality-check:
    docker:
      - image: cimg/node:20.0
    steps:
      - checkout
      - run: npm install -g pnpm
      - run: pnpm install
      - run: pnpm cobalt run experiments/ --ci
      - store_artifacts:
          path: .cobalt/results

workflows:
  test:
    jobs:
      - quality-check
```

### Jenkins

```groovy
pipeline {
  agent any

  environment {
    OPENAI_API_KEY = credentials('openai-api-key')
  }

  stages {
    stage('Install') {
      steps {
        sh 'npm install -g pnpm'
        sh 'pnpm install'
      }
    }

    stage('AI Quality Check') {
      steps {
        sh 'pnpm cobalt run experiments/ --ci'
      }
    }

    stage('Archive Results') {
      steps {
        archiveArtifacts artifacts: '.cobalt/results/**'
      }
    }
  }
}
```

## GitHub Actions Reporter

Cobalt includes a specialized reporter for GitHub Actions that provides rich, actionable output in your CI runs.

### Features

**Automatic Activation**: The reporter activates when `GITHUB_ACTIONS=true` is detected (set automatically by GitHub Actions).

**Annotations**: Errors and warnings appear inline in your PR:
- `::error::` for threshold violations and execution errors
- `::warning::` for low scores and quality concerns
- `::notice::` for progress and completion messages

**Step Summary**: Rich markdown summary appears in your workflow run:
- Experiment configuration and duration
- Score tables with statistical metrics
- Cost estimation and token usage
- Warnings for low-scoring items
- Links to detailed result files

### Configuration

Enable the GitHub Actions reporter in your config:

```typescript
// cobalt.config.ts
export default defineConfig({
  reporters: ['cli', 'github-actions']  // Enable both CLI and GitHub Actions output
})
```

Or use it exclusively in CI:

```typescript
export default defineConfig({
  reporters: process.env.CI
    ? ['github-actions']  // GitHub Actions only in CI
    : ['cli']             // CLI for local development
})
```

### Example Workflow with Reporter

```yaml
name: AI Quality Check

on:
  pull_request:
    paths:
      - 'agents/**'
      - 'experiments/**'

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - uses: actions/setup-node@v3
        with:
          node-version: '20'

      - run: npm install

      - name: Run Cobalt experiments
        env:
          OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
        run: npx cobalt run

      - name: Upload results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: cobalt-results
          path: .cobalt/results/
```

### Output Examples

**Threshold Violation Annotation**:
```
::error title=Threshold Violation::accuracy: average score 0.65 below threshold 0.80
```

**Low Score Warning**:
```
::warning title=Low Scores::5 items scored below 0.5
```

**Step Summary Markdown**:
```markdown
## 🔷 Cobalt Experiment

**Experiment:** my-agent-test
**Dataset:** 50 items
**Evaluators:** relevance, accuracy

### 📊 Results

- **Duration:** 45.2s
- **Average Latency:** 904ms
- **Estimated Cost:** $0.15
- **Total Tokens:** 12,500

### Scores

| Evaluator | Avg | Min | Max | P50 | P95 |
|-----------|-----|-----|-----|-----|-----|
| relevance | 0.85 | 0.65 | 0.98 | 0.87 | 0.92 |
| accuracy  | 0.78 | 0.45 | 0.95 | 0.80 | 0.90 |

⚠️ 3 item(s) scored below 0.5

**Results:** `.cobalt/results/abc123.json`
**Run ID:** `abc123`

---
🤖 Generated with [Cobalt](https://github.com/basalt-ai/cobalt)
```

### Benefits

1. **Inline Feedback**: Errors and warnings appear directly in PR files view
2. **Quick Triage**: Step summary provides at-a-glance quality metrics
3. **Historical Tracking**: Workflow run history shows quality trends
4. **Team Visibility**: Non-technical team members can understand AI quality
5. **Artifact Links**: Easy access to detailed result files

## Advanced Patterns

### Environment-Specific Thresholds

```typescript
// cobalt.config.ts
export default defineConfig({
  thresholds: process.env.CI
    ? {
        // Strict thresholds for CI
        score: { avg: 0.8 },
        evaluators: {
          relevance: { avg: 0.8, min: 0.6 },
          accuracy: { avg: 0.85, passRate: 0.95 }
        }
      }
    : {
        // Looser thresholds for local dev
        evaluators: {
          relevance: { avg: 0.6 },
          accuracy: { avg: 0.7 }
        }
      }
})
```

### Per-Branch Thresholds

```typescript
// Different standards for main vs feature branches
const isMainBranch = process.env.GITHUB_REF === 'refs/heads/main'

export default defineConfig({
  thresholds: {
    evaluators: isMainBranch
      ? { quality: { avg: 0.9 } }  // High bar for main
      : { quality: { avg: 0.7 } }  // Lower for features
  }
})
```

### Selective CI Mode

Run specific experiments in CI:

```bash
# Only run critical experiments
pnpm cobalt run experiments/critical/*.cobalt.ts --ci
```

```typescript
// cobalt.config.ts
export default defineConfig({
  testDir: process.env.CI
    ? 'experiments/critical'  // CI: only critical tests
    : 'experiments'            // Local: all tests
})
```

### Progressive Rollout

Gradually increase thresholds:

```typescript
const currentWeek = Math.floor(Date.now() / (7 * 24 * 60 * 60 * 1000))
const baseThreshold = 0.7
const weeklyIncrease = 0.02

export default defineConfig({
  thresholds: {
    evaluators: {
      quality: {
        avg: baseThreshold + (currentWeek * weeklyIncrease)
      }
    }
  }
})
```

## Monitoring and Alerts

### Store Results in Database

```typescript
// After experiment runs
import { HistoryDB } from '@basalt-ai/cobalt'

const db = new HistoryDB('.cobalt/history.db')
const runs = db.getRuns({ since: new Date(Date.now() - 86400000) })

// Check for declining trends
const avgScores = runs.map(r => r.avgScores.quality)
const trend = calculateTrend(avgScores)

if (trend < -0.05) {
  // Alert: quality declining
  sendSlackAlert('Quality scores declining!')
}
```

### Integration with Monitoring Tools

```typescript
// Send metrics to Datadog, New Relic, etc.
import { experiment } from '@basalt-ai/cobalt'

const report = await experiment(/* ... */)

await fetch('https://api.datadoghq.com/api/v1/metrics', {
  method: 'POST',
  headers: { 'DD-API-KEY': process.env.DATADOG_API_KEY },
  body: JSON.stringify({
    series: [{
      metric: 'cobalt.quality.score',
      points: [[Date.now() / 1000, report.summary.scores.quality.avg]]
    }]
  })
})
```

### Slack Notifications

```bash
# .github/workflows/ai-tests.yml
- name: Notify Slack on Failure
  if: failure()
  run: |
    curl -X POST ${{ secrets.SLACK_WEBHOOK }} \
      -H 'Content-Type: application/json' \
      -d '{"text":"AI quality check failed! Check the logs."}'
```

## Best Practices

### ✅ DO

- **Start conservative**: Begin with achievable thresholds and tighten gradually
- **Use p95 for consistency**: Catch outliers while allowing some variance
- **Monitor trends**: Track scores over time, not just pass/fail
- **Test thresholds locally**: Validate thresholds work before enforcing in CI
- **Document reasoning**: Explain why each threshold matters

### ❌ DON'T

- **Don't set thresholds too high**: 0.9+ is very strict, hard to maintain
- **Don't use max thresholds**: Rarely useful, can block legitimate improvements
- **Don't ignore failures**: Investigate why thresholds fail
- **Don't change thresholds for every failure**: Fix the agent, not the threshold
- **Don't block on flaky evaluators**: Some metrics have natural variance

## Troubleshooting

### Flaky Tests

**Problem**: Tests occasionally fail in CI but pass locally

**Solutions**:

1. **Use pass rate thresholds** instead of min thresholds
   ```typescript
   thresholds: {
     evaluators: { quality: { passRate: 0.9 } } // Allow 10% variance
   }
   ```

2. **Increase test coverage** to reduce variance
   ```typescript
   runs: 3  // Run each item 3 times and aggregate
   ```

3. **Use percentiles** instead of min/max
   ```typescript
   thresholds: {
     evaluators: { quality: { p95: 0.7 } }  // 95% of scores above 0.7
   }
   ```

### Threshold Too Strict

**Problem**: Agent quality is good but fails CI

**Solution**: Analyze actual scores and adjust:

```bash
# Check recent scores
pnpm cobalt history --limit 10

# View detailed results
pnpm cobalt results <run-id>

# Adjust threshold based on data
thresholds: {
  evaluators: { quality: { avg: 0.75 } }  # Was 0.8, now 0.75
}
```

### API Rate Limits in CI

**Problem**: Hitting OpenAI rate limits during CI runs

**Solutions**:

1. **Reduce concurrency**:
   ```typescript
   concurrency: process.env.CI ? 2 : 5
   ```

2. **Use caching**:
   ```typescript
   cache: {
     enabled: true,
     ttl: 86400000  // 24 hours
   }
   ```

3. **Split test runs**:
   ```bash
   pnpm cobalt run experiments/batch1/
   pnpm cobalt run experiments/batch2/
   ```

## Resources

- **Example Configs**: `examples/ci-config/`
- **API Reference**: `docs/api.md`
- **Dashboard**: Use `pnpm cobalt serve` to visualize trends
