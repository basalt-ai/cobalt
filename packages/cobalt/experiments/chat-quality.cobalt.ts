/**
 * Cobalt Chat Quality Experiment
 *
 * Tests the quality of the interactive AI chat assistant that helps
 * developers analyze experiment results in the Cobalt dashboard.
 *
 * Evaluates: conciseness, topic coverage, context awareness, and actionability.
 *
 * To run: pnpm cobalt run experiments/chat-quality.cobalt.ts
 * Requires: OPENAI_API_KEY environment variable
 */

import { createOpenAI } from '@ai-sdk/openai'
import { generateText } from 'ai'
import { formatCompareContext, formatRunContext } from '../src/dashboard/api/chat.js'
import { Dataset, Evaluator, experiment } from '../src/index.js'
import { highQualityReport, problematicReport } from './_fixtures.js'

// ============================================================================
// Dataset: Chat scenarios across different dashboard pages
// ============================================================================

const dataset = new Dataset({
	items: [
		// --- Run Detail Page ---
		{
			input: 'What are the main takeaways from this run?',
			pageContext: 'run-detail',
			reportKey: 'high',
			expectedTopics: ['relevance', 'helpfulness', 'format', 'score'],
		},
		{
			input: 'Which items need the most improvement?',
			pageContext: 'run-detail',
			reportKey: 'high',
			expectedTopics: ['refund', 'helpfulness', 'item', 'low'],
		},
		{
			input: 'Why are the scores so low?',
			pageContext: 'run-detail',
			reportKey: 'problematic',
			expectedTopics: ['helpfulness', 'relevance', 'low', 'vague'],
		},
		{
			input: 'What should I fix first to improve quality?',
			pageContext: 'run-detail',
			reportKey: 'problematic',
			expectedTopics: ['helpfulness', 'improve', 'priority'],
		},
		// --- Compare Page ---
		{
			input: 'How has quality changed between these runs?',
			pageContext: 'compare',
			reportKey: 'compare-improvement',
			expectedTopics: ['improve', 'relevance', 'helpfulness'],
		},
		{
			input: 'Which evaluator improved the most?',
			pageContext: 'compare',
			reportKey: 'compare-improvement',
			expectedTopics: ['helpfulness', 'relevance', 'improve'],
		},
		// --- More Run Detail ---
		{
			input: 'How does the cost compare to the quality?',
			pageContext: 'run-detail',
			reportKey: 'high',
			expectedTopics: ['cost', 'token', 'quality'],
		},
		{
			input: 'Suggest specific changes to improve these results.',
			pageContext: 'run-detail',
			reportKey: 'problematic',
			expectedTopics: ['prompt', 'improve', 'specific'],
		},
	],
})

// ============================================================================
// Runner: Replicate the production chat flow
// ============================================================================

const SYSTEM_PROMPT = `You are an AI assistant for Cobalt, an AI agent testing framework.
You help developers analyze experiment results, identify patterns, and suggest improvements.

IMPORTANT: Keep responses short and concise (3-5 sentences max). Use bullet points for lists. Only elaborate if the user explicitly asks for more detail.`

const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY })
const model = openai('gpt-5-mini')

async function chatRunner({ item }: { item: Record<string, unknown> }) {
	const pageContext = item.pageContext as string
	const reportKey = item.reportKey as string
	const question = item.input as string

	// Build page-specific context using the same formatters as production
	let contextData = ''
	if (pageContext === 'run-detail') {
		const report = reportKey === 'high' ? highQualityReport : problematicReport
		contextData = formatRunContext(report)
	} else if (pageContext === 'compare') {
		contextData = formatCompareContext([problematicReport, highQualityReport])
	}

	const systemPrompt = `${SYSTEM_PROMPT}\n\nCurrent page: ${pageContext}\n${contextData}`

	const result = await generateText({
		model,
		system: systemPrompt,
		prompt: question,
	})

	return {
		output: result.text,
		metadata: {
			model: 'gpt-5-mini',
			pageContext,
			reportKey,
			inputTokens: result.usage?.promptTokens,
			outputTokens: result.usage?.completionTokens,
		},
	}
}

// ============================================================================
// Evaluators
// ============================================================================

const evaluators = [
	// 1. Conciseness (function) — checks the "3-5 sentences max" system prompt instruction
	new Evaluator({
		name: 'conciseness',
		type: 'function',
		fn: ({ output }) => {
			const text = String(output)
			// Split on sentence-ending punctuation, filter empty
			const sentences = text
				.split(/[.!?]+/)
				.map(s => s.trim())
				.filter(s => s.length > 5)
			const count = sentences.length
			const words = text.split(/\s+/).length

			if (count <= 5 && words <= 150) {
				return { score: 1.0, reason: `${count} sentences, ${words} words — within limits` }
			}
			if (count <= 8 && words <= 250) {
				return { score: 0.5, reason: `${count} sentences, ${words} words — slightly over limit` }
			}
			return { score: 0.2, reason: `${count} sentences, ${words} words — too verbose` }
		},
	}),

	// 2. Topic Coverage (function) — checks if expected topics appear in the response
	new Evaluator({
		name: 'topic-coverage',
		type: 'function',
		fn: ({ item, output }) => {
			const topics = item.expectedTopics as string[]
			const text = String(output).toLowerCase()
			const found = topics.filter(topic => text.includes(topic.toLowerCase()))
			const score = topics.length > 0 ? found.length / topics.length : 0

			return {
				score,
				reason: `Found ${found.length}/${topics.length} topics: [${found.join(', ')}]`,
			}
		},
	}),

	// 3. Context Awareness (llm-judge, scale) — does it reference specific data?
	new Evaluator({
		name: 'context-awareness',
		type: 'llm-judge',
		scoring: 'scale',
		prompt: `You are evaluating whether an AI assistant's response references specific data from experiment results rather than giving generic advice.

The user asked: {{input}}
The assistant responded: {{output}}

Rate from 0.0 to 1.0:
- 1.0: References specific scores, evaluator names, item numbers, or metrics from the data
- 0.7: References the general scenario with some specifics but could be more precise
- 0.4: Mostly generic advice with minimal reference to the actual data
- 0.0: Completely generic response that ignores the experiment context

Respond with JSON: { "score": <number>, "reason": "<brief explanation>" }`,
	}),

	// 4. Actionability (llm-judge, boolean + chainOfThought)
	new Evaluator({
		name: 'actionability',
		type: 'llm-judge',
		scoring: 'boolean',
		chainOfThought: true,
		prompt: `You are evaluating whether an AI assistant provides actionable advice.

The user asked: {{input}}
The assistant responded: {{output}}

Does the response include at least one concrete, actionable suggestion or next step that the user could follow?
A simple description of results without a recommendation does NOT count.
An actionable suggestion means something the user can DO (e.g., "review item #2", "improve the prompt to include X", "add more training data for Y").

Answer true if there is at least one actionable suggestion, false otherwise.`,
	}),
]

// ============================================================================
// Run Experiment
// ============================================================================

experiment('cobalt-chat-quality', dataset, chatRunner, {
	evaluators,
	concurrency: 3,
	timeout: 30_000,
	tags: ['dogfood', 'chat', 'ai-features'],
	thresholds: {
		evaluators: {
			conciseness: { avg: 0.7 },
			'topic-coverage': { avg: 0.4 },
			'context-awareness': { avg: 0.55 },
			actionability: { avg: 0.6 },
		},
	},
})
