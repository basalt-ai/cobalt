# Multi-Agent Example

Test coordinated multi-agent workflows with end-to-end evaluation.

## Overview

This example demonstrates:
- Multi-agent coordination
- Sequential workflow testing
- End-to-end evaluation
- Complex agent interactions
- Workflow orchestration

**Difficulty**: ⭐⭐⭐ Advanced

**Time to run**: ~30 seconds

**Cost**: ~$0.10

## What's Included

- `agents.ts` — Three coordinated agents (Researcher, Writer, Reviewer)
- `multi-agent.cobalt.ts` — End-to-end workflow testing
- `topics.json` — Research topics to process
- `package.json` — Dependencies

## Quick Start

```bash
pnpm install
export OPENAI_API_KEY="sk-..."
pnpm test
```

## The Workflow

**3-Agent Research Pipeline:**

1. **Researcher Agent**
   - Takes a topic
   - Generates key points and facts
   - Output: Research notes

2. **Writer Agent**
   - Takes research notes
   - Writes a coherent article
   - Output: Draft article

3. **Reviewer Agent**
   - Reviews the article
   - Checks quality and accuracy
   - Output: Final reviewed article

## The Evaluators

1. **completeness** (LLM Judge)
   - Does output cover the topic?
   - All key points addressed?

2. **quality** (LLM Judge)
   - Is writing clear and well-structured?
   - Professional quality?

3. **consistency** (LLM Judge)
   - Do all agents work together coherently?
   - No contradictions in workflow?

## Expected Results

**Typical scores:**
- `completeness`: 0.80-0.95
- `quality`: 0.85-0.95
- `consistency`: 0.85-0.95

**Cost**: ~$0.10 (multi-step workflow with 3 agents)

## Key Concepts

This example shows:
- **Agent Coordination**: Multiple agents working together
- **Sequential Processing**: Output of one agent feeds into next
- **End-to-End Testing**: Evaluate the entire workflow, not just individual agents
- **Complex Workflows**: Real-world multi-step AI systems

## Customization

Add more agents:
```typescript
// Add an Editor agent
const edited = await editAgent(reviewed)
```

Change the workflow:
```typescript
// Parallel instead of sequential
const [research1, research2] = await Promise.all([
  researchAgent(topic1),
  researchAgent(topic2)
])
```

## Next Steps

After completing all examples:
- [Create Your Own](../../getting-started/first-experiment.md)
- [Evaluator Guide](../../guides/evaluators/overview.md)
- [MCP Integration](../../guides/mcp-integration.md)
