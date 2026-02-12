import { readFileSync } from 'node:fs';
import { Dataset, Evaluator, experiment } from '@basalt-ai/cobalt';
import { type Document, answerWithRAG } from './rag-agent.js';

// Load knowledge base
const knowledgeBase: Document[] = JSON.parse(readFileSync('./knowledge-base.json', 'utf-8'));

// Load queries
const dataset = Dataset.fromJSON('./queries.json');

const evaluators = [
	// Evaluator 1: Context Relevance
	new Evaluator({
		name: 'context-relevance',
		type: 'llm-judge',
		prompt: `Evaluate if the retrieved documents are relevant to the query.

Query: {{input}}

Retrieved Documents:
{{metadata.context}}

Rate relevance from 0.0 to 1.0:
- 1.0 = Highly relevant, contains needed information
- 0.5 = Partially relevant
- 0.0 = Not relevant

Respond with JSON: {"score": <number>, "reason": "<explanation>"}`,
		model: 'gpt-4o-mini',
		provider: 'openai',
	}),

	// Evaluator 2: Answer Faithfulness
	new Evaluator({
		name: 'answer-faithfulness',
		type: 'llm-judge',
		prompt: `Evaluate if the answer is faithful to the provided context.

Context:
{{metadata.context}}

Answer: {{output}}

Rate faithfulness from 0.0 to 1.0:
- 1.0 = Fully grounded in context, no hallucinations
- 0.5 = Some unsupported claims
- 0.0 = Major hallucinations or contradictions

Respond with JSON: {"score": <number>, "reason": "<explanation>"}`,
		model: 'gpt-4o-mini',
		provider: 'openai',
	}),

	// Evaluator 3: Answer Relevance
	new Evaluator({
		name: 'answer-relevance',
		type: 'llm-judge',
		prompt: `Evaluate if the answer addresses the query.

Query: {{input}}
Answer: {{output}}

Rate relevance from 0.0 to 1.0:
- 1.0 = Directly answers the query
- 0.5 = Partially answers
- 0.0 = Doesn't address query

Respond with JSON: {"score": <number>, "reason": "<explanation>"}`,
		model: 'gpt-4o-mini',
		provider: 'openai',
	}),
];

experiment(
	'rag-test',
	dataset,
	async ({ item }) => {
		const response = await answerWithRAG(item.query, knowledgeBase);

		return {
			output: response.answer,
			metadata: {
				context: response.retrievedDocs.map((d) => d.content).join('\n---\n'),
				numDocs: response.retrievedDocs.length,
				tokens: response.tokens,
			},
		};
	},
	{
		evaluators,
		concurrency: 2,
		timeout: 45000,
		tags: ['rag', 'retrieval', 'example'],
	},
);
