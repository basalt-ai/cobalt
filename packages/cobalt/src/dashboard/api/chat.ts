import { createAnthropic } from '@ai-sdk/anthropic'
import { createOpenAI } from '@ai-sdk/openai'
import { streamText } from 'ai'
import type { Context } from 'hono'
import { loadResult } from '../../storage/results'
import { listResults } from '../../storage/results'
import type { DashboardChatConfig, ExperimentReport } from '../../types'

interface UIMessagePart {
	type: string
	text?: string
}

interface UIMessage {
	id: string
	role: 'user' | 'assistant' | 'system'
	parts?: UIMessagePart[]
	content?: string
}

interface ChatContext {
	page: 'runs' | 'run-detail' | 'compare' | 'trends'
	runId?: string
	compareIds?: string[]
	experiment?: string
}

interface ChatRequest {
	messages: UIMessage[]
	context?: ChatContext
}

function extractText(msg: UIMessage): string {
	if (msg.parts?.length) {
		return msg.parts
			.filter(p => p.type === 'text' && p.text)
			.map(p => p.text)
			.join('')
	}
	return msg.content ?? ''
}

function getModel(config: DashboardChatConfig) {
	if (config.provider === 'anthropic') {
		const anthropic = createAnthropic({ apiKey: config.apiKey ?? process.env.ANTHROPIC_API_KEY })
		return anthropic(config.model ?? 'claude-sonnet-4-20250514')
	}
	const openai = createOpenAI({ apiKey: config.apiKey ?? process.env.OPENAI_API_KEY })
	return openai(config.model ?? 'gpt-4o-mini')
}

async function buildSystemPrompt(context?: ChatContext): Promise<string> {
	const base = `You are an AI assistant for Cobalt, an AI agent testing framework.
You help developers analyze experiment results, identify patterns, and suggest improvements.

IMPORTANT: Keep responses short and concise (3-5 sentences max). Use bullet points for lists. Only elaborate if the user explicitly asks for more detail.`

	if (!context) return base

	let pageData = ''
	let runsInventory = ''

	// Always load the runs inventory for reference
	try {
		const results = await listResults()
		if (results.length > 0) {
			runsInventory = '\nAvailable runs:\n'
			for (const r of results.slice(0, 20)) {
				const scores = Object.entries(r.avgScores)
					.map(([k, v]) => `${k}=${v.toFixed(2)}`)
					.join(', ')
				runsInventory += `  - ${r.id.slice(0, 12)} "${r.name}" (${new Date(r.timestamp).toLocaleDateString()}) [${scores}]\n`
			}
		}
	} catch {
		// runs inventory loading failed
	}

	// Load page-specific data
	try {
		if (context.page === 'run-detail' && context.runId) {
			const report = await loadResult(context.runId)
			pageData = formatRunContext(report)
		} else if (context.page === 'compare' && context.compareIds?.length) {
			const reports = await Promise.all(context.compareIds.map(id => loadResult(id)))
			pageData = formatCompareContext(reports)
		} else if (context.page === 'trends' && context.experiment) {
			pageData = `Viewing score trends for experiment "${context.experiment}".`
		}
	} catch {
		// page data loading failed
	}

	return `${base}\n\nCurrent page: ${context.page}\n${pageData}\n${runsInventory}`
}

function formatRunContext(report: ExperimentReport): string {
	const scoresSummary = Object.entries(report.summary.scores)
		.map(
			([name, stats]) =>
				`  ${name}: avg=${stats.avg.toFixed(3)}, min=${stats.min.toFixed(3)}, max=${stats.max.toFixed(3)}`,
		)
		.join('\n')

	const lowItems = report.items
		.filter(item => {
			return Object.values(item.evaluations).some(ev => ev.score < 0.5)
		})
		.slice(0, 5)
		.map(item => {
			const lowEvals = Object.entries(item.evaluations)
				.filter(([, ev]) => ev.score < 0.5)
				.map(([name, ev]) => `${name}=${ev.score.toFixed(2)}${ev.reason ? ` (${ev.reason})` : ''}`)
				.join(', ')
			return `  Item #${item.index + 1}: ${lowEvals}`
		})
		.join('\n')

	return `Run: "${report.name}" (${report.id})
Date: ${report.timestamp}
Items: ${report.summary.totalItems}, Duration: ${report.summary.totalDurationMs}ms
Scores:
${scoresSummary}
${lowItems ? `\nLow-scoring items:\n${lowItems}` : ''}`
}

function formatCompareContext(reports: ExperimentReport[]): string {
	const labels = ['A', 'B', 'C']
	const runsSummary = reports.map((r, i) => `Run ${labels[i]}: "${r.name}" (${r.id})`).join('\n')

	const allEvaluators = new Set<string>()
	for (const r of reports) {
		for (const name of Object.keys(r.summary.scores)) {
			allEvaluators.add(name)
		}
	}

	const diffs = Array.from(allEvaluators)
		.map(name => {
			const scores = reports.map(r => r.summary.scores[name]?.avg ?? 0)
			return `  ${name}: ${scores.map((s, i) => `${labels[i]}=${s.toFixed(3)}`).join(', ')}`
		})
		.join('\n')

	return `Comparing ${reports.length} runs:\n${runsSummary}\n\nScores:\n${diffs}`
}

export function createChatHandler(chatConfig?: DashboardChatConfig) {
	return async (c: Context) => {
		if (!chatConfig) {
			return c.json({ error: 'Chat not configured. Add dashboard.chat to cobalt.config.ts' }, 400)
		}

		try {
			const body = await c.req.json<ChatRequest>()
			const systemPrompt = await buildSystemPrompt(body.context)
			const model = getModel(chatConfig)

			const result = streamText({
				model,
				system: systemPrompt,
				messages: body.messages.map(m => ({ role: m.role, content: extractText(m) })),
			})

			return result.toUIMessageStreamResponse()
		} catch (error) {
			console.error('Chat error:', error)
			return c.json(
				{ error: `Chat error: ${error instanceof Error ? error.message : 'Unknown error'}` },
				500,
			)
		}
	}
}

export { buildSystemPrompt, formatRunContext, formatCompareContext }
