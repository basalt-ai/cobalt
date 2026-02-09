# MCP Integration Overview

Cobalt provides native integration with Claude Code via the Model Context Protocol (MCP), enabling AI-assisted testing workflows.

## What is MCP?

The [Model Context Protocol](https://modelcontextprotocol.io) is an open protocol that lets AI assistants like Claude Code interact with external tools and data sources. Cobalt's MCP server exposes:

- **4 Tools** — Run experiments, view results, compare runs, auto-generate tests
- **3 Resources** — Access configuration, experiments, and results
- **3 Prompts** — Guided workflows for common tasks

## Quick Start

### 1. Start the MCP Server

```bash
npx cobalt mcp
```

The server runs in stdio mode, ready for Claude Code to connect.

### 2. Configure Claude Code

Add Cobalt to your MCP settings in `~/.mcp.json` or `.claude/mcp_settings.json`:

```json
{
  "mcpServers": {
    "cobalt": {
      "command": "npx",
      "args": ["cobalt", "mcp"],
      "env": {
        "OPENAI_API_KEY": "your-api-key-here"
      }
    }
  }
}
```

### 3. Use with Claude Code

Open Claude Code and ask:

```
"Run my Cobalt experiments and show me the results"
```

Claude will use the `cobalt_run` tool to execute experiments and analyze the output.

## Available Capabilities

### Tools

Interactive commands Claude can execute:

| Tool | Description |
|------|-------------|
| [cobalt_run](tools.md#cobalt_run) | Run experiments and return full results |
| [cobalt_results](tools.md#cobalt_results) | View detailed results for a run |
| [cobalt_compare](tools.md#cobalt_compare) | Compare two experiment runs |
| [cobalt_generate](tools.md#cobalt_generate) | Auto-generate experiment from agent code |

### Resources

Data sources Claude can read:

| Resource | Description |
|----------|-------------|
| [cobalt://config](resources.md#config) | Current configuration |
| [cobalt://experiments](resources.md#experiments) | List of all experiments |
| [cobalt://latest-results](resources.md#latest-results) | Most recent run results |

### Prompts

Guided workflows for common tasks:

| Prompt | Description |
|--------|-------------|
| [improve-agent](prompts.md#improve-agent) | Analyze failures and suggest improvements |
| [generate-tests](prompts.md#generate-tests) | Generate test cases for an agent |
| [regression-check](prompts.md#regression-check) | Check for performance regressions |

## Common Workflows

### Run Experiments

```
👤 "Run experiments/qa-agent.cobalt.ts and show me the scores"

🤖 *Uses cobalt_run tool*

   Results:
   - contains-answer: 1.00 (perfect)
   - conciseness: 0.95 (excellent)
   - factual-accuracy: 0.88 (good, but needs improvement)

   3 out of 20 items scored below 0.7 on factual-accuracy.
   Would you like me to analyze these failures?
```

### Analyze Failures

```
👤 "Yes, analyze the failures"

🤖 *Uses cobalt_results tool*

   Low-scoring items:
   1. "Explain quantum entanglement" - Score: 0.6
      Reason: "Too vague, missing key concepts"

   2. "What caused the 2008 financial crisis?" - Score: 0.55
      Reason: "Oversimplified, missing nuance"

   Pattern: Agent struggles with complex, multi-faceted questions.

   Suggestion: Add explicit instructions in the system prompt to
   break down complex questions into components.
```

### Improve Agent

```
👤 "Suggest specific code improvements"

🤖 *Uses improve-agent prompt*

   Top 3 improvements:

   1. [HIGH IMPACT] Enhanced System Prompt
      Current: "You are a helpful assistant"
      Improved: "You are an expert assistant. For complex topics,
                break down your answer into key points..."

   2. [MEDIUM IMPACT] Add Few-Shot Examples
      Add examples of good responses for complex questions

   3. [LOW IMPACT] Increase max_tokens
      Current: 100 tokens may be insufficient for detailed answers
      Suggested: 200 tokens
```

### Generate Tests

```
👤 "Generate tests for my new summarization agent"

🤖 *Uses cobalt_generate tool*

   Generated: summarizer.cobalt.ts

   - 10 test cases covering news, technical docs, narratives
   - 3 evaluators: faithfulness, conciseness, relevance
   - Dataset includes edge cases (short, long, technical content)

   Would you like me to run these tests now?
```

### Check Regressions

```
👤 "Compare my latest run to the baseline"

🤖 *Uses cobalt_compare tool*

   Comparing runs:
   - Baseline (abc123): 0.92 avg
   - Latest (def456): 0.88 avg

   ⚠️ REGRESSION DETECTED

   factual-accuracy dropped 6% (0.92 → 0.86)

   Affected items:
   - Science questions: -12%
   - Math questions: -8%

   Likely cause: Recent prompt change reduced specificity
```

## Configuration

### Environment Variables

The MCP server inherits environment variables from your shell. Set API keys before starting:

```bash
export OPENAI_API_KEY="sk-..."
export ANTHROPIC_API_KEY="sk-ant-..."
npx cobalt mcp
```

Or configure in your MCP settings:

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

### Working Directory

The MCP server runs in your project's root directory (where `cobalt.config.ts` is located). All paths are resolved relative to this directory.

### Server Options

The `cobalt mcp` command supports these options:

```bash
# Start MCP server (stdio mode)
npx cobalt mcp

# With debug logging
DEBUG=cobalt:mcp npx cobalt mcp
```

## Architecture

```
┌─────────────────┐
│   Claude Code   │
│   (MCP Client)  │
└────────┬────────┘
         │
         │ MCP Protocol
         │ (stdio)
         │
┌────────▼────────┐
│  Cobalt MCP     │
│     Server      │
├─────────────────┤
│ • Tools         │
│ • Resources     │
│ • Prompts       │
└────────┬────────┘
         │
         │ Direct Access
         │
┌────────▼────────┐
│  Cobalt Core    │
│ (experiment,    │
│  evaluators,    │
│  datasets)      │
└─────────────────┘
```

**Key Points:**
- MCP server is a thin wrapper around Cobalt's core functionality
- Tools execute experiments and return structured results
- Resources provide read-only access to config and results
- Prompts guide Claude through complex workflows

## Benefits

### For QA Engineers
- **Faster Debugging**: Claude analyzes failures and suggests fixes instantly
- **Automated Analysis**: No manual result inspection needed
- **Regression Detection**: Automated comparison between runs

### For AI Engineers
- **Rapid Iteration**: Generate tests automatically from agent code
- **Intelligent Optimization**: Claude suggests prompt and parameter improvements
- **Pattern Recognition**: Identifies failure patterns across test cases

### For Product Teams
- **Natural Language Interface**: No need to remember CLI commands
- **Contextual Analysis**: Claude understands your project and results
- **Actionable Insights**: Get specific improvement suggestions, not generic advice

## Troubleshooting

### "MCP server not responding"

**Solution**: Check that the server is running:
```bash
# Start in foreground for debugging
npx cobalt mcp
```

### "No experiments found"

**Solution**: Ensure you're in the project root with `cobalt.config.ts`:
```bash
cd /path/to/your/project
npx cobalt mcp
```

### "API key not found"

**Solution**: Set environment variables in MCP config:
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

### "Tool execution failed"

**Solution**: Check stderr output for detailed error messages. The server logs errors to stderr while keeping stdio for MCP communication.

## Examples

### Example 1: Run and Analyze

```
👤 "Run my QA agent tests and analyze any failures"

🤖 Running experiments/qa-agent.cobalt.ts...
   [Uses cobalt_run tool]

   Results: 18/20 passed (90%)

   Analyzing 2 failures:
   [Uses cobalt_results tool]

   Failure 1: "What is the capital of Burkina Faso?"
   Output: "I'm not sure about that"
   Expected: "Ouagadougou"
   Issue: Agent lacks knowledge of less common geography

   Failure 2: "Explain TCP 3-way handshake"
   Output: "It's a network protocol"
   Expected: Detailed explanation
   Issue: Answer too vague

   Recommendation: Add few-shot examples for geography and
   technical explanations.
```

### Example 2: Generate and Test

```
👤 "I wrote a new chatbot in src/chatbot.ts. Generate tests for it."

🤖 Analyzing src/chatbot.ts...
   [Uses cobalt_generate tool]

   Generated chatbot.cobalt.ts with:
   - 15 test conversations
   - 4 evaluators (relevance, coherence, helpfulness, safety)
   - Edge cases: greetings, clarifications, multi-turn, refusals

   Running tests...
   [Uses cobalt_run tool]

   Results:
   - relevance: 0.94 ✅
   - coherence: 0.89 ✅
   - helpfulness: 0.76 ⚠️ (below recommended 0.80)
   - safety: 1.00 ✅

   The agent is working well overall but could be more helpful.
   Would you like suggestions for improvement?
```

### Example 3: Monitor Production

```
👤 "Check if our latest deployment caused any regressions"

🤖 [Uses regression-check prompt]

   Comparing:
   - Production baseline: run_abc123 (deployed 2 days ago)
   - Latest run: run_def456 (just completed)

   ✅ No regressions detected

   Improvements:
   - response-time: -15ms (faster) ✅
   - accuracy: +0.02 (improved) ✅
   - cost-per-item: -$0.0003 (cheaper) ✅

   All metrics stable or improved. Deployment looks good!
```

## Next Steps

- **[Tools Reference](tools.md)** — Detailed tool documentation
- **[Resources Reference](resources.md)** — Available data sources
- **[Prompts Reference](prompts.md)** — Guided workflows
- **[Integration Guide](../guides/mcp-integration.md)** — Setup walkthrough

---

**Ready to start?** [Install and configure MCP](../guides/mcp-integration.md) in 5 minutes!
