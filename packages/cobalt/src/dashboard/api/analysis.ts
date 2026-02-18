import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createOpenAI } from '@ai-sdk/openai';
import { generateText } from 'ai';
import type { Context } from 'hono';
import { loadResult } from '../../storage/results';
import type { DashboardChatConfig, ExperimentReport } from '../../types';
import { formatCompareContext, formatRunContext } from './chat';

const CACHE_DIR = resolve(process.cwd(), '.cobalt/data/cache/analysis');
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

interface CachedAnalysis {
	analysis: string;
	timestamp: number;
}

function getModel(config: DashboardChatConfig) {
	if (config.provider === 'anthropic') {
		const anthropic = createAnthropic({ apiKey: config.apiKey ?? process.env.ANTHROPIC_API_KEY });
		return anthropic(config.model ?? 'claude-sonnet-4-20250514');
	}
	const openai = createOpenAI({ apiKey: config.apiKey ?? process.env.OPENAI_API_KEY });
	return openai(config.model ?? 'gpt-4o-mini');
}

async function getCachedAnalysis(key: string): Promise<string | null> {
	const path = join(CACHE_DIR, `${key}.json`);
	if (!existsSync(path)) return null;
	try {
		const raw = await readFile(path, 'utf-8');
		const data: CachedAnalysis = JSON.parse(raw);
		if (Date.now() - data.timestamp > CACHE_TTL_MS) return null;
		return data.analysis;
	} catch {
		return null;
	}
}

async function setCachedAnalysis(key: string, analysis: string): Promise<void> {
	if (!existsSync(CACHE_DIR)) {
		await mkdir(CACHE_DIR, { recursive: true });
	}
	const data: CachedAnalysis = { analysis, timestamp: Date.now() };
	await writeFile(join(CACHE_DIR, `${key}.json`), JSON.stringify(data), 'utf-8');
}

export function createRunAnalysisHandler(chatConfig?: DashboardChatConfig) {
	return async (c: Context) => {
		if (!chatConfig) {
			return c.json({ error: 'Chat not configured' }, 400);
		}

		const runId = c.req.param('id');

		// Check cache
		const cacheKey = `run-${runId}`;
		const cached = await getCachedAnalysis(cacheKey);
		if (cached) {
			return c.json({ analysis: cached });
		}

		try {
			const report = await loadResult(runId);
			const context = formatRunContext(report);

			const result = await generateText({
				model: getModel(chatConfig),
				system: `You are an AI assistant analyzing experiment results for Cobalt, an AI testing framework.
Provide a concise analysis (2-4 sentences) highlighting key findings, low-scoring items, and actionable recommendations.`,
				prompt: `Analyze this experiment run:\n\n${context}`,
			});

			await setCachedAnalysis(cacheKey, result.text);
			return c.json({ analysis: result.text });
		} catch (error) {
			console.error('Analysis error:', error);
			return c.json(
				{ error: `Analysis error: ${error instanceof Error ? error.message : 'Unknown error'}` },
				500,
			);
		}
	};
}

export function createCompareAnalysisHandler(chatConfig?: DashboardChatConfig) {
	return async (c: Context) => {
		if (!chatConfig) {
			return c.json({ error: 'Chat not configured' }, 400);
		}

		const { a, b, c: cId } = c.req.query();
		if (!a || !b) {
			return c.json({ error: 'Missing run IDs (a and b required)' }, 400);
		}

		const ids = [a, b];
		if (cId) ids.push(cId);

		const cacheKey = `compare-${ids.sort().join('-')}`;
		const cached = await getCachedAnalysis(cacheKey);
		if (cached) {
			return c.json({ analysis: cached });
		}

		try {
			const reports = await Promise.all(ids.map((id) => loadResult(id)));
			const context = formatCompareContext(reports);

			const result = await generateText({
				model: getModel(chatConfig),
				system: `You are an AI assistant comparing experiment runs for Cobalt, an AI testing framework.
Provide a concise comparison analysis (2-4 sentences) highlighting improvements, regressions, and recommendations.`,
				prompt: `Compare these experiment runs:\n\n${context}`,
			});

			await setCachedAnalysis(cacheKey, result.text);
			return c.json({ analysis: result.text });
		} catch (error) {
			console.error('Compare analysis error:', error);
			return c.json(
				{
					error: `Compare analysis error: ${error instanceof Error ? error.message : 'Unknown error'}`,
				},
				500,
			);
		}
	};
}

export { getCachedAnalysis, setCachedAnalysis };
