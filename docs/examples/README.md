# Cobalt Examples

Complete working examples demonstrating how to test different types of AI agents with Cobalt.

## Available Examples

| Example | Description | Difficulty | Key Concepts |
|---------|-------------|------------|--------------|
| [plugin-template](plugin-template/) | Custom evaluator plugin | ⭐⭐⭐ | Plugins, TypeScript, Custom evaluation |
| [qa-agent](qa-agent/) | Question answering agent | ⭐ | Basic evaluation, Exact match, LLM judge |
| [summarization](summarization/) | Document summarization | ⭐⭐ | Faithfulness, Conciseness, JSONL |
| [classification](classification/) | Text classification | ⭐ | CSV loading, Accuracy metrics |
| [rag-pipeline](rag-pipeline/) | RAG system testing | ⭐⭐⭐ | Context evaluation, Multi-step agents |
| [multi-agent](multi-agent/) | Coordinated agents | ⭐⭐⭐ | End-to-end testing, Multiple agents |

## Quick Start

Each example is a complete, runnable project. To use any example:

```bash
# 1. Navigate to the example
cd docs/examples/qa-agent

# 2. Install dependencies
pnpm install

# 3. Set your API key
export OPENAI_API_KEY="sk-..."

# 4. Run the experiment
pnpm test
# or
npx cobalt run qa-agent.cobalt.ts
```

## Example Structure

Each example follows this structure:

```
example-name/
├── README.md              # Overview and usage instructions
├── package.json           # Dependencies and scripts
├── agent.ts              # Agent implementation
├── example.cobalt.ts     # Cobalt experiment
└── dataset.{json,jsonl,csv}  # Test data
```

## Learning Path

**Beginner** (Start here):
1. [qa-agent](qa-agent/) - Learn basic evaluation
2. [classification](classification/) - CSV loading and metrics

**Intermediate**:
3. [summarization](summarization/) - LLM judges for quality
4. [plugin-template](plugin-template/) - Custom evaluators

**Advanced**:
5. [rag-pipeline](rag-pipeline/) - Complex evaluation strategies
6. [multi-agent](multi-agent/) - End-to-end workflows

## Concepts Demonstrated

### Evaluators

| Type | Used In | Purpose |
|------|---------|---------|
| **Function** | qa-agent, classification | Deterministic checks (exact match, length) |
| **LLM Judge** | qa-agent, summarization, rag-pipeline | Subjective quality (relevance, faithfulness) |
| **Custom Plugin** | plugin-template | Extend with new evaluator types |
| **Autoevals** | (optional in any) | Pre-built evaluation suite |

### Datasets

| Format | Used In | Best For |
|--------|---------|----------|
| **JSON** | qa-agent, rag-pipeline | Structured data, nested objects |
| **JSONL** | summarization, multi-agent | Large datasets, streaming |
| **CSV** | classification | Tabular data, spreadsheet exports |

### Patterns

- **Basic Testing**: qa-agent, classification
- **Quality Assessment**: summarization
- **Context Evaluation**: rag-pipeline
- **Multi-Step Workflows**: multi-agent
- **Custom Evaluation Logic**: plugin-template

## Use Cases

### Test a Chatbot
→ Start with [qa-agent](qa-agent/), adapt for your chatbot

### Test a Summarizer
→ Use [summarization](summarization/) template

### Test a Classifier
→ Follow [classification](classification/) example

### Test RAG/Search
→ Build on [rag-pipeline](rag-pipeline/)

### Test Agent Workflows
→ Extend [multi-agent](multi-agent/)

### Create Custom Evaluators
→ Use [plugin-template](plugin-template/)

## Prerequisites

All examples require:
- **Node.js** 18+
- **pnpm** or npm
- **OpenAI API key** (for LLM judges)

Some examples may need:
- **Anthropic API key** (if using Claude)
- **Custom dependencies** (listed in each README)

## Common Commands

```bash
# Run an example
npx cobalt run example.cobalt.ts

# Run with custom concurrency
npx cobalt run example.cobalt.ts --concurrency 10

# View results
npx cobalt history

# Compare runs
npx cobalt compare run1 run2

# Clean cache and results
npx cobalt clean
```

## Customizing Examples

Each example is designed to be easily customized:

**1. Change the Agent**
- Edit `agent.ts` with your own implementation
- Keep the same function signature

**2. Modify the Dataset**
- Add/remove test cases in the dataset file
- Keep the same structure

**3. Adjust Evaluators**
- Change thresholds and prompts
- Add/remove evaluators
- See [Evaluator Guide](../guides/evaluators/overview.md)

**4. Configure Options**
- Adjust `concurrency`, `timeout`, `runs`
- See [Configuration Reference](../reference/configuration.md)

## Running All Examples

To run all examples at once:

```bash
# From docs/examples/
for dir in qa-agent summarization classification rag-pipeline multi-agent; do
  echo "Running $dir..."
  cd $dir
  pnpm install --silent
  pnpm test
  cd ..
done
```

## Example Output

When you run an example, you'll see:

```
Running experiment: qa-agent-test
Items: 20/20 completed (100%)
Duration: 12.4s

Scores:
  contains-answer:    1.00 (min: 1.00, max: 1.00)
  conciseness:        0.95 (min: 0.90, max: 1.00)
  factual-accuracy:   0.92 (min: 0.85, max: 1.0)

Total Cost: $0.02
Results saved to: .cobalt/results/20250209_161522_qa-agent-test_abc123.json
```

## Troubleshooting

### "Module not found"

Install dependencies:
```bash
cd docs/examples/example-name
pnpm install
```

### "API key not found"

Set your API key:
```bash
export OPENAI_API_KEY="sk-..."
```

### "Experiment failed"

Check the agent implementation:
```bash
# Run agent directly to debug
node --loader tsx agent.ts
```

## Next Steps

After trying these examples:

1. **[Create Your Own](../getting-started/first-experiment.md)** — Build a custom experiment
2. **[Learn Evaluators](../guides/evaluators/overview.md)** — Master evaluation strategies
3. **[Explore MCP](../guides/mcp-integration.md)** — Use with Claude Code
4. **[CI/CD Integration](../guides/ci-mode.md)** — Automate testing

## Contributing

Have a great example to share? See our [Contributing Guide](../contributing/development-setup.md) to add it!

---

**Ready to dive in?** Start with the [qa-agent example](qa-agent/) — it's the simplest and demonstrates core concepts.
