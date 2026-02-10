# MCP Prompts Reference

Complete reference for all Cobalt MCP prompts that guide Claude through complex workflows.

## Overview

Cobalt provides 3 MCP prompts for guided AI workflows:

| Prompt | Purpose | Use When |
|--------|---------|----------|
| [improve-agent](#improve-agent) | Analyze failures, suggest fixes | Tests are failing |
| [generate-tests](#generate-tests) | Create additional test cases | Need better coverage |
| [regression-check](#regression-check) | Detect performance regressions | Before deploying changes |

**Prompts are workflows** — they guide Claude through multi-step analysis and decision-making.

## improve-agent

Analyze experiment failures and suggest specific improvements to the agent code.

### Signature

```typescript
improve-agent(args: {
  runId: string  // Run ID to analyze
})
```

### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `runId` | string | ✅ Yes | Run ID from experiment results to analyze |

### Workflow

When invoked, Claude follows this workflow:

**Step 1: Load Results**
- Uses `cobalt_results` to load the specified run
- Or uses `cobalt://latest-results` if no runId provided

**Step 2: Identify Failures**
- Filters items with scores < 0.7 (low-performing cases)
- Groups failures by evaluator type

**Step 3: Analyze Patterns**
- What types of inputs are causing failures?
- Which evaluators are scoring lowest?
- Are there common themes in failure reasons?

**Step 4: Suggest Improvements**
- Quotes exact function/logic that needs improvement
- Provides improved code with explanations
- Explains why each change will improve scores

**Step 5: Prioritize**
- Ranks suggestions by impact (high/medium/low)
- Provides expected impact on scores

### Example Usage

```
👤 "Analyze my latest run and suggest improvements"

🤖 *Uses improve-agent prompt*

   **Analysis of run abc123 (qa-agent-test)**

   Failure Pattern Detected:
   - 3/20 items scored below 0.7 on factual-accuracy
   - All failures are complex, multi-part questions
   - Agent responses are too brief

   **Top 3 Improvements:**

   1. [HIGH IMPACT] Enhanced System Prompt
      Current:
      ```typescript
      { role: 'system', content: 'You are a helpful assistant' }
      ```

      Improved:
      ```typescript
      { role: 'system', content: `You are an expert assistant.
      For complex questions:
      1. Break down into key components
      2. Address each component thoroughly
      3. Provide complete explanations with examples` }
      ```

      Expected impact: +15% on factual-accuracy

   2. [MEDIUM IMPACT] Increase max_tokens
      Current: 100 tokens (too limiting for complex answers)
      Suggested: 200 tokens

      Expected impact: +8% on factual-accuracy

   3. [LOW IMPACT] Add Few-Shot Examples
      Add 2-3 examples of good responses for complex questions

      Expected impact: +5% on factual-accuracy

   **Combined Expected Improvement**: 0.70 → 0.88 (+26%)
```

### Output Format

Claude provides a structured analysis with:
- Summary of failure patterns
- Top 3 improvement suggestions with code examples
- Expected impact on scores
- Specific, actionable changes (not high-level advice)

### Best For

- **Low scores** — When evaluators score below 0.7
- **Inconsistent performance** — High variance between items
- **After changes** — When scores unexpectedly dropped
- **Optimization** — Improving already-passing tests

---

## generate-tests

Generate additional test cases to improve coverage based on existing experiment results.

### Signature

```typescript
generate-tests(args: {
  experimentFile: string
  focus?: 'edge-cases' | 'adversarial' | 'coverage'
})
```

### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `experimentFile` | string | ✅ Yes | Path to the experiment file to enhance |
| `focus` | string | ❌ No | Focus area: edge-cases, adversarial, or coverage (balanced) |

### Workflow

When invoked, Claude follows this workflow:

**Step 1: Read Experiment**
- Reads the specified experiment file
- Analyzes existing dataset structure

**Step 2: Coverage Analysis**
- What input patterns are already covered?
- What edge cases might be missing?
- What adversarial cases could challenge the agent?

**Step 3: Generate Cases**
- Creates 5-10 new test cases
- Focuses on specified area (or balanced mix)
- Includes expected outputs
- Adds clear descriptions

**Step 4: Format Output**
- Returns JSON array ready to add to dataset
- Explains rationale for each test

### Example Usage

**Basic Usage:**

```
👤 "Generate more test cases for my chatbot experiment"

🤖 *Uses generate-tests prompt*

   **Generated 8 new test cases for chatbot.cobalt.ts**

   Coverage gaps identified:
   - Missing: multi-turn conversations
   - Missing: ambiguous questions
   - Missing: edge cases (empty input, very long input)

   New test cases:
   ```json
   [
     {
       "input": "",
       "expectedOutput": "I'm not sure what you're asking. Could you please provide more details?",
       "category": "edge",
       "description": "Empty input handling"
     },
     {
       "input": "Tell me about... actually, never mind",
       "expectedOutput": "<polite acknowledgment>",
       "category": "edge",
       "description": "Interrupted or unclear intent"
     },
     ...
   ]
   ```

   Rationale:
   - Empty input: Tests error handling
   - Interrupted query: Tests context understanding
   - Multi-turn: Tests conversation state management
```

**Focused Generation:**

```
👤 "Generate adversarial test cases for my content moderation agent"

🤖 *Uses generate-tests with focus: "adversarial"*

   **Generated 10 adversarial test cases**

   Focus: Adversarial cases to stress-test content moderation

   New tests include:
   - Encoded/obfuscated harmful content
   - Context-dependent toxicity
   - Borderline cases
   - Multi-language edge cases

   These tests will help ensure robust moderation even
   for sophisticated attempts to bypass filters.
```

### Focus Options

**`edge-cases`**:
- Boundary conditions
- Empty/null inputs
- Very long/short inputs
- Malformed data
- Unusual formatting

**`adversarial`**:
- Attempts to trick the agent
- Prompt injection attempts
- Jailbreak attempts
- Stress tests
- Security edge cases

**`coverage` (default)**:
- Balanced mix of all types
- Fills gaps in existing coverage
- Normal + edge + adversarial

### Output Format

Returns JSON array:

```json
[
  {
    "input": { /* test input */ },
    "expectedOutput": "...",
    "category": "normal|edge|adversarial",
    "description": "why this test is important"
  }
]
```

### Best For

- **Expanding coverage** — After initial test creation
- **Finding gaps** — When certain scenarios aren't tested
- **Stress testing** — Need adversarial cases
- **Continuous improvement** — Regular test enhancement

---

## regression-check

Compare two experiment runs and identify regressions or improvements.

### Signature

```typescript
regression-check(args: {
  baselineRunId: string
  currentRunId: string
})
```

### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `baselineRunId` | string | ✅ Yes | Run ID of the baseline (earlier) run |
| `currentRunId` | string | ✅ Yes | Run ID of the current (later) run |

### Workflow

When invoked, Claude follows this workflow:

**Step 1: Load Runs**
- Uses `cobalt_compare` to load both runs
- Calculates score differences

**Step 2: Analyze Changes**
- Overall score trends (improved/degraded/unchanged)
- Per-evaluator score changes
- Per-item score changes (identifies specific regressions)

**Step 3: Identify Regressions**
- Evaluators with >5% score drop
- Individual items with >0.2 score drop
- New failure cases (previously passing, now failing)

**Step 4: Identify Improvements**
- Evaluators with >5% score increase
- Previously failing cases that now pass

**Step 5: Verdict**
- **PASS**: No significant regressions
- **WARN**: Minor regressions (5-10% drop)
- **FAIL**: Major regressions (>10% drop or new failures)

### Example Usage

**Passing Check:**

```
👤 "Check if my latest deployment caused any regressions"

🤖 *Uses regression-check prompt*

   **Regression Check: PASS ✅**

   Comparing:
   - Baseline: run_abc123 (v1.0, deployed 2 days ago)
   - Current: run_def456 (v1.1, just completed)

   **Summary:**
   - Overall score: 0.92 → 0.94 (+2%)
   - 0 regressions
   - 2 improvements

   **Improvements:**
   - conciseness: +8% (0.90 → 0.97)
   - response-time: -15ms faster

   **Verdict: Safe to deploy** 🚀
   All metrics stable or improved.
```

**Warning Check:**

```
👤 "Compare my feature branch to main"

🤖 *Uses regression-check prompt*

   **Regression Check: WARN ⚠️**

   Comparing:
   - Baseline: main branch (abc123)
   - Current: feature/new-prompt (def456)

   **Summary:**
   - Overall score: 0.92 → 0.88 (-4%)
   - 1 minor regression
   - 1 improvement

   **Regressions:**
   1. factual-accuracy: -6% (0.92 → 0.86)
      - 3 items regressed significantly:
        - "Explain quantum entanglement" -0.25
        - "What is GDP?" -0.15
        - "Describe photosynthesis" -0.18

   **Improvements:**
   - conciseness: +10% (0.85 → 0.94)

   **Root Cause Hypothesis:**
   The new prompt optimizes for brevity but sacrifices
   completeness for complex topics.

   **Recommendation:**
   Adjust prompt to maintain thoroughness while being concise.
```

**Failing Check:**

```
👤 "Regression check for production deploy"

🤖 *Uses regression-check prompt*

   **Regression Check: FAIL ❌**

   Comparing:
   - Baseline: production (v2.0)
   - Current: candidate (v2.1)

   **Summary:**
   - Overall score: 0.94 → 0.79 (-16%)
   - 2 major regressions
   - 0 improvements

   **Major Regressions:**
   1. factual-accuracy: -18% (0.92 → 0.75)
      - 8/20 items now failing (was 0/20)
   2. coherence: -12% (0.96 → 0.84)

   **New Failures:**
   - All science-related questions now failing
   - Multi-part questions severely impacted

   **Root Cause:**
   Likely caused by model change or system prompt regression.

   **Verdict: DO NOT DEPLOY ⛔**
   Critical regression detected. Investigate before proceeding.
```

### Regression Thresholds

| Threshold | Type | Severity |
|-----------|------|----------|
| >5% drop | Per-evaluator | Minor regression (WARN) |
| >10% drop | Per-evaluator | Major regression (FAIL) |
| >0.2 drop | Per-item | Individual regression |
| New failures | Any | Major regression (FAIL) |

### Output Format

Claude provides:
- **Verdict**: PASS/WARN/FAIL
- **Summary statistics**: avg score change, # regressions, # improvements
- **Detailed regression list**: which items/evaluators regressed
- **Root cause hypotheses**: why regressions occurred
- **Recommendations**: what to do next

### Best For

- **Before deployment** — Catch regressions early
- **After changes** — Verify improvements don't hurt other metrics
- **CI/CD gates** — Automated regression detection
- **Performance monitoring** — Track trends over time

---

## Prompt Comparison

| Feature | improve-agent | generate-tests | regression-check |
|---------|---------------|----------------|------------------|
| **Input** | Run ID | Experiment file | 2 Run IDs |
| **Output** | Code suggestions | New test cases | Pass/Warn/Fail verdict |
| **Focus** | Fix failures | Expand coverage | Detect regressions |
| **When** | After failures | Need more tests | Before deploy |
| **Complexity** | Medium | Low-Medium | Medium-High |

## Combining Prompts

Prompts work great together in workflows:

### Workflow 1: Fix → Verify

```
1. improve-agent (run abc123)
   → Get code improvements

2. *Apply improvements*

3. *Run experiment again* → run def456

4. regression-check (abc123, def456)
   → Verify improvements worked
```

### Workflow 2: Enhance → Test → Deploy

```
1. generate-tests (chatbot.cobalt.ts)
   → Add adversarial cases

2. *Run with new cases* → run xyz789

3. improve-agent (run xyz789)
   → Fix any new failures

4. regression-check (baseline, xyz789)
   → Confirm no regressions
```

### Workflow 3: Continuous Improvement

```
Weekly:
1. generate-tests (focus: edge-cases)
   → Expand coverage

2. *Run all experiments*

3. improve-agent (latest runs)
   → Optimize performance

4. regression-check (last week, this week)
   → Track progress
```

## Best Practices

### ✅ DO

- **Use improve-agent** when scores drop unexpectedly
- **Use generate-tests** regularly to expand coverage
- **Use regression-check** before every deployment
- **Iterate** — improve, test, check, repeat
- **Track trends** — run regression-check weekly

### ❌ DON'T

- Don't skip regression-check before deploying
- Don't ignore WARN verdicts (they compound)
- Don't generate tests without running them
- Don't apply improvements without verifying

## Common Workflows

### New Feature Development

```
Day 1: Implement feature
Day 2: generate-tests → expand coverage
Day 3: improve-agent → fix failures
Day 4: regression-check → verify no regressions
Day 5: Deploy ✅
```

### Production Monitoring

```
Weekly:
- regression-check (last week vs this week)
- If WARN/FAIL: improve-agent
- generate-tests (adversarial) monthly
```

### Optimization Sprint

```
1. improve-agent (all experiments)
2. *Apply top improvements*
3. *Re-run all experiments*
4. regression-check (before vs after)
5. If PASS: Deploy ✅
```

## Troubleshooting

### "No run found for ID"

**Solution**: Check run ID with `cobalt_results`:
```
cobalt_results({ limit: 10 })  // Find valid IDs
```

### "Not enough failures to analyze"

**Situation**: All tests passing (good problem!)

**Solution**: Use `generate-tests` to expand coverage instead

### "Can't determine root cause"

**Solution**: provide more context:
```
👤 "Check regression between abc123 and def456.
    I changed the system prompt between these runs."

🤖 *Can now correlate regression with prompt change*
```

## See Also

- [MCP Tools](tools.md) — cobalt_run, cobalt_results, cobalt_compare, cobalt_generate
- [MCP Resources](resources.md) — cobalt://config, cobalt://experiments, cobalt://latest-results
- [MCP Overview](overview.md) — Setup and configuration
- [Integration Guide](../guides/mcp-integration.md) — Complete workflows

---

**Need help?** Check the [MCP Integration Guide](../guides/mcp-integration.md) for complete examples of using prompts in real workflows.
