# MCP Integration Guide

Learn how to use Cobalt with Claude Code via the Model Context Protocol (MCP) for AI-assisted testing workflows.

## What is MCP?

The [Model Context Protocol](https://modelcontextprotocol.io) is an open protocol that lets AI assistants like Claude Code interact with external tools and data. Cobalt's MCP integration gives Claude:

- **4 Tools** to run experiments and analyze results
- **3 Resources** to read configuration and results
- **3 Prompts** for guided improvement workflows

**Result**: Claude becomes your AI testing assistant, helping you write tests, analyze failures, and improve your agents.

## Prerequisites

- **Cobalt installed**: `pnpm add @basalt-ai/cobalt`
- **Claude Code**: Install from [claude.ai/code](https://claude.ai/code)
- **OpenAI API key**: For LLM evaluators (optional but recommended)

## Setup

### Step 1: Configure MCP Server

Add Cobalt to your MCP configuration file.

**macOS/Linux**: `~/.claude/mcp_settings.json` or `.claude/mcp_settings.json`

**Windows**: `%APPDATA%\.claude\mcp_settings.json`

```json
{
  "mcpServers": {
    "cobalt": {
      "command": "npx",
      "args": ["cobalt", "mcp"],
      "env": {
        "OPENAI_API_KEY": "sk-...",
        "ANTHROPIC_API_KEY": "sk-ant-..."
      }
    }
  }
}
```

**Important**: Replace `sk-...` with your actual API keys, or use environment variable references:

```json
{
  "mcpServers": {
    "cobalt": {
      "command": "npx",
      "args": ["cobalt", "mcp"],
      "env": {
        "OPENAI_API_KEY": "${OPENAI_API_KEY}",
        "ANTHROPIC_API_KEY": "${ANTHROPIC_API_KEY}"
      }
    }
  }
}
```

### Step 2: Start Claude Code

Open Claude Code in your Cobalt project directory:

```bash
cd /path/to/your/cobalt/project
code .  # or open your IDE
# Open Claude Code extension
```

Claude Code will automatically connect to the Cobalt MCP server.

### Step 3: Verify Connection

Ask Claude:

```
"List my Cobalt experiments"
```

If connected, Claude will use the `cobalt://experiments` resource and show your experiment files.

## Common Workflows

### Workflow 1: Run and Analyze Tests

**Goal**: Execute experiments and get AI analysis of results

```
👤 "Run experiments/qa-agent.cobalt.ts and analyze the results"

🤖 Running experiment...
   [Uses cobalt_run tool]

   **Results for qa-agent-test:**
   - Total: 20 items
   - Completed: 20 (100%)
   - Cost: $0.02

   **Scores:**
   - contains-answer: 1.00 (perfect ✅)
   - conciseness: 0.95 (excellent ✅)
   - factual-accuracy: 0.88 (good, but improvable ⚠️)

   **Analysis:**
   3 out of 20 items scored below 0.7 on factual-accuracy.
   These are all complex, multi-part questions.

   Would you like me to suggest improvements?
```

### Workflow 2: Improve Failing Tests

**Goal**: Get specific code suggestions to fix failures

```
👤 "Yes, suggest improvements for the low-scoring items"

🤖 [Uses improve-agent prompt]

   **Improvements for qa-agent:**

   **Issue**: Agent responses are too brief for complex questions

   **Solution 1** [HIGH IMPACT]: Enhanced System Prompt
   ```typescript
   // Current
   { role: 'system', content: 'You are a helpful assistant' }

   // Improved
   { role: 'system', content: `You are an expert assistant.
   For complex questions:
   1. Break down into components
   2. Address each thoroughly
   3. Provide examples when helpful` }
   ```
   Expected improvement: +15% factual-accuracy

   **Solution 2** [MEDIUM]: Increase max_tokens
   Change from 100 to 200 tokens
   Expected improvement: +8%

   Would you like me to apply these changes to your agent file?
```

### Workflow 3: Generate Tests for New Agent

**Goal**: Auto-create experiments for a new agent

```
👤 "I wrote a new summarization agent in src/summarizer.ts. Generate tests for it."

🤖 Analyzing src/summarizer.ts...
   [Uses cobalt_generate tool]

   **Generated: experiments/summarizer.cobalt.ts**

   **Test Coverage:**
   - 10 test articles (news, technical, narrative)
   - 3 evaluators:
     1. faithfulness (LLM judge)
     2. conciseness (LLM judge)
     3. length-check (function)

   **Sample Test Cases:**
   - News article (300 words) → 50-word summary
   - Technical doc (1000 words) → 100-word summary
   - Story (500 words) → 75-word summary

   Run tests with:
   ```bash
   npx cobalt run experiments/summarizer.cobalt.ts
   ```

   Should I run these tests now?
```

### Workflow 4: Check for Regressions

**Goal**: Compare runs before deploying

```
👤 "I made some changes. Compare my latest run to the baseline."

🤖 [Reads cobalt://latest-results to find runs]

   Comparing:
   - Baseline: run abc123 (yesterday)
   - Latest: run def456 (just now)

   [Uses cobalt_compare and regression-check]

   **Regression Check: WARN ⚠️**

   **Changes:**
   - factual-accuracy: -6% (0.92 → 0.86)
   - conciseness: +10% (0.85 → 0.94)

   **Analysis:**
   Your changes improved conciseness but reduced
   factual accuracy for complex questions.

   **Recommendation:**
   Consider adjusting the prompt to maintain thoroughness
   while being concise. The trade-off might not be worth it.

   Would you like suggestions for balancing both metrics?
```

### Workflow 5: Expand Test Coverage

**Goal**: Add more edge cases to existing tests

```
👤 "Generate adversarial test cases for my content moderation agent"

🤖 [Uses generate-tests prompt with focus: adversarial]

   **Generated 10 adversarial test cases:**

   ```json
   [
     {
       "input": "This product is sh1t",
       "expectedOutput": "FLAGGED",
       "category": "adversarial",
       "description": "Obfuscated profanity"
     },
     {
       "input": "Great job! You're the best!",
       "expectedOutput": "CLEAN",
       "category": "adversarial",
       "description": "Sarcasm that could be toxic in context"
     },
     ...
   ]
   ```

   **Rationale:**
   These tests challenge your moderator with:
   - Obfuscated toxicity
   - Context-dependent meaning
   - Borderline cases

   Add to experiments/moderation.cobalt.ts dataset?
```

## Available Capabilities

### Tools (Actions Claude Can Take)

| Tool | What It Does |
|------|--------------|
| `cobalt_run` | Executes experiments and returns full results |
| `cobalt_results` | Views past run results (list or detail) |
| `cobalt_compare` | Compares two runs, shows diffs |
| `cobalt_generate` | Auto-generates experiments from agent code |

[Full Tools Reference →](../reference/mcp/tools.md)

### Resources (Data Claude Can Read)

| Resource | What It Provides |
|----------|------------------|
| `cobalt://config` | Current configuration |
| `cobalt://experiments` | List of all experiment files |
| `cobalt://latest-results` | Most recent run for each experiment |

[Full Resources Reference →](../reference/mcp/resources.md)

### Prompts (Guided Workflows)

| Prompt | What It Does |
|--------|--------------|
| `improve-agent` | Analyzes failures, suggests code fixes |
| `generate-tests` | Creates additional test cases |
| `regression-check` | Detects performance regressions |

[Full Prompts Reference →](../reference/mcp/prompts.md)

## Example Conversations

### Example 1: Complete Testing Session

```
👤 "Help me test my Q&A agent"

🤖 I'll help you test your Q&A agent. First, let me check what experiments you have.
   [Reads cobalt://experiments]

   I found experiments/qa-agent.cobalt.ts. Let me run it.
   [Uses cobalt_run]

   Results: 18/20 passed (90%)

   Two items failed:
   1. "Explain quantum entanglement" - Score: 0.60
   2. "What is GDP?" - Score: 0.55

   Both are complex questions where the agent was too brief.

👤 "How can I fix this?"

🤖 [Uses improve-agent prompt]

   I recommend enhancing your system prompt to handle complex questions better:

   ```typescript
   { role: 'system', content: `You are an expert assistant.
   For complex topics, provide thorough explanations with:
   - Key concepts clearly defined
   - Examples when helpful
   - Complete answers, not summaries` }
   ```

   This should improve scores by ~15-20%.

   Would you like me to apply this change?

👤 "Yes, apply it"

🤖 [Modifies agent file]
   ✅ Applied changes to src/qa-agent.ts

   Now let's re-run the tests to verify:
   [Uses cobalt_run]

   Results: 20/20 passed (100%) ✅

   Scores improved:
   - "Explain quantum entanglement": 0.60 → 0.95
   - "What is GDP?": 0.55 → 0.90

   Your agent is now performing excellently!
```

### Example 2: CI/CD Integration

```
👤 "Check if my pull request causes any regressions"

🤖 I'll compare your current branch to the baseline.

   [Reads cobalt://latest-results]
   Found baseline: run abc123 (main branch)

   [Uses cobalt_run to run current code]
   Current run: run def456

   [Uses regression-check prompt]

   **Regression Check: PASS ✅**

   No regressions detected. All metrics stable or improved:
   - factual-accuracy: 0.92 → 0.94 (+2%)
   - response-time: 1.2s → 1.0s (-17%)

   Your PR is safe to merge! 🚀
```

### Example 3: Iterative Improvement

```
👤 "Help me improve my chatbot to be more helpful"

🤖 Let me analyze your latest chatbot results.
   [Reads cobalt://latest-results]

   Current helpfulness score: 0.76

   [Uses improve-agent]

   Suggestions:
   1. Add few-shot examples of helpful responses
   2. Instruct to ask clarifying questions
   3. Increase response detail for complex topics

   Estimated improvement: 0.76 → 0.88

👤 "Generate some adversarial test cases too"

🤖 [Uses generate-tests with focus: adversarial]

   Created 10 adversarial cases:
   - Ambiguous questions
   - Follow-up questions
   - Requests for clarification
   - Edge cases (empty input, very long input)

   Added to experiments/chatbot.cobalt.ts

👤 "Run the tests with the new cases"

🤖 [Uses cobalt_run]

   Results with new test cases:
   - Original 15 items: 0.76 avg (unchanged)
   - New 10 adversarial: 0.68 avg (needs work)

   The adversarial cases revealed weaknesses in:
   - Handling ambiguous questions
   - Managing context in follow-ups

   Would you like suggestions for these specific issues?
```

## Tips & Best Practices

### ✅ DO

- **Use resources first** — Check `cobalt://latest-results` before re-running (saves cost)
- **Be specific** — Mention run IDs or experiment names explicitly
- **Iterate** — improve → test → check → repeat
- **Ask for explanations** — Claude can explain why scores changed
- **Use prompts** — They guide Claude through complex workflows

### ❌ DON'T

- **Don't re-run unnecessarily** — Check latest results first
- **Don't ignore warnings** — WARN verdicts compound over time
- **Don't skip regression checks** — Always check before deploying
- **Don't apply changes blindly** — Understand suggestions first

## Troubleshooting

### "MCP server not responding"

**Cause**: Server not started or wrong working directory

**Solution**:
```bash
# Check server manually
cd /path/to/your/cobalt/project
npx cobalt mcp

# If works manually, check MCP config working directory
```

### "No experiments found"

**Cause**: Wrong project directory or empty `experiments/` folder

**Solution**:
```bash
# Verify you're in the right project
ls experiments/

# If empty, create an experiment
npx cobalt init
```

### "API key not found"

**Cause**: API keys not set in MCP config

**Solution**: Add to `mcp_settings.json`:
```json
{
  "mcpServers": {
    "cobalt": {
      "env": {
        "OPENAI_API_KEY": "sk-..."
      }
    }
  }
}
```

### Claude doesn't use Cobalt tools

**Cause**: Not asking for Cobalt-related tasks

**Solution**: Be explicit:
```
❌ "Run my tests"
✅ "Run my Cobalt experiments"
✅ "Use cobalt_run to execute experiments/qa-agent.cobalt.ts"
```

## Advanced Usage

### Custom Workflows

You can chain multiple tools and prompts:

```
👤 "Full quality check workflow:
     1. Run all experiments
     2. Check for regressions vs baseline
     3. Suggest improvements for any failures
     4. Generate new edge cases"

🤖 [Executes multi-step workflow]
   Step 1: Running all 3 experiments...
   Step 2: Comparing to baseline...
   Step 3: Analyzing failures...
   Step 4: Generating edge cases...

   [Complete report with all results]
```

### Scheduling

Integrate with cron/schedulers:

```bash
# Daily regression check
0 9 * * * cd /project && npx cobalt run experiments/ && \
  echo "Check for regressions" | claude-code
```

### CI/CD Integration

Use in GitHub Actions:

```yaml
- name: Run Cobalt Tests
  run: npx cobalt run experiments/

- name: Check Regressions
  run: |
    # Use Claude Code to analyze
    echo "regression-check baseline=$BASELINE current=$CURRENT" | claude-code
```

## Next Steps

- **[Tools Reference](../reference/mcp/tools.md)** — Learn all available tools
- **[Resources Reference](../reference/mcp/resources.md)** — Understand data access
- **[Prompts Reference](../reference/mcp/prompts.md)** — Master guided workflows
- **[Example Projects](../examples/README.md)** — See complete examples

## Getting Help

- **Documentation**: [Full MCP Overview](../reference/mcp/overview.md)
- **Issues**: [GitHub Issues](https://github.com/yourusername/cobalt/issues)
- **Community**: [GitHub Discussions](https://github.com/yourusername/cobalt/discussions)

---

**Ready to start?** Open Claude Code in your Cobalt project and say: *"Help me test my AI agent"*
