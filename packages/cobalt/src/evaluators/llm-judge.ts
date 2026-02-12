import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import { registry } from '../core/EvaluatorRegistry.js';
import type { EvalContext, EvalResult, LLMJudgeEvaluatorConfig } from '../types/index.js';
import { renderTemplate } from '../utils/template.js';

/**
 * Evaluate using LLM as judge
 * Supports boolean (default) and scale scoring modes with optional chain of thought.
 */
export async function evaluateLLMJudge(
	config: LLMJudgeEvaluatorConfig,
	context: EvalContext,
	apiKey?: string,
	modelOverride?: string,
): Promise<EvalResult> {
	if (!apiKey) {
		throw new Error('API key is required for LLM judge evaluator');
	}
	const model = modelOverride || config.model || 'gpt-5-mini';

	// Apply context mapping if provided
	const evalContext = config.context ? config.context(context) : context;

	// Render prompt template
	const prompt = renderTemplate(config.prompt, {
		input: evalContext.item.input || evalContext.item,
		output: evalContext.output,
		expectedOutput: evalContext.item.expectedOutput,
		metadata: evalContext.metadata,
		...evalContext.item,
	});

	// Determine scoring mode and chain of thought
	const scoring = config.scoring ?? 'boolean';
	const chainOfThought = config.chainOfThought ?? scoring === 'boolean';

	// Build system prompt
	const systemPrompt = buildSystemPrompt(scoring, chainOfThought);

	// Determine provider from model name
	const provider = determineProvider(model);

	// Call appropriate LLM API
	if (provider === 'openai') {
		return await callOpenAI(prompt, systemPrompt, model, apiKey, scoring);
	}
	return await callAnthropic(prompt, systemPrompt, model, apiKey, scoring);
}

/**
 * Build system prompt based on scoring mode and chain of thought setting
 */
export function buildSystemPrompt(scoring: 'boolean' | 'scale', chainOfThought: boolean): string {
	const baseInstruction =
		'You are an AI evaluation judge. Your task is to evaluate AI agent outputs based on specific criteria.';

	const cotInstruction = chainOfThought
		? '\n\nThink step by step before making your judgment. Provide your reasoning in the "chainOfThought" field.'
		: '';

	if (scoring === 'boolean') {
		const cotField = chainOfThought ? '\n  "chainOfThought": "<your step-by-step reasoning>",' : '';
		return `${baseInstruction}${cotInstruction}

IMPORTANT: You must respond with a valid JSON object in this exact format:
{${cotField}
  "verdict": <true or false>,
  "reason": "<brief explanation of your verdict>"
}

- "verdict": true if the output meets the criteria, false if it does not
- "reason": a concise explanation
${chainOfThought ? '- "chainOfThought": your detailed step-by-step reasoning' : ''}
Do not include any text outside the JSON object.`;
	}

	// Scale mode
	const cotField = chainOfThought ? '\n  "chainOfThought": "<your step-by-step reasoning>",' : '';
	return `${baseInstruction}${cotInstruction}

IMPORTANT: You must respond with a valid JSON object in this exact format:
{${cotField}
  "score": <number between 0.0 and 1.0>,
  "reason": "<brief explanation>"
}

Do not include any text outside the JSON object.`;
}

/**
 * Determine LLM provider from model name
 */
function determineProvider(model: string): 'openai' | 'anthropic' {
	if (model.startsWith('claude')) {
		return 'anthropic';
	}
	return 'openai';
}

/**
 * Call OpenAI API for evaluation
 */
async function callOpenAI(
	prompt: string,
	systemPrompt: string,
	model: string,
	apiKey: string,
	scoring: 'boolean' | 'scale',
): Promise<EvalResult> {
	const client = new OpenAI({ apiKey });

	try {
		const response = await client.chat.completions.create({
			model,
			messages: [
				{ role: 'system', content: systemPrompt },
				{ role: 'user', content: prompt },
			],
			temperature: 0.2,
			response_format: { type: 'json_object' },
		});

		const content = response.choices[0]?.message?.content;

		if (!content) {
			throw new Error('Empty response from OpenAI');
		}

		return parseEvalResult(content, scoring);
	} catch (error) {
		console.error('OpenAI evaluation error:', error);
		throw error;
	}
}

/**
 * Call Anthropic API for evaluation
 */
async function callAnthropic(
	prompt: string,
	systemPrompt: string,
	model: string,
	apiKey: string,
	scoring: 'boolean' | 'scale',
): Promise<EvalResult> {
	const client = new Anthropic({ apiKey });

	try {
		const response = await client.messages.create({
			model,
			max_tokens: 1024,
			temperature: 0.2,
			system: systemPrompt,
			messages: [{ role: 'user', content: prompt }],
		});

		const content = response.content[0];

		if (!content) {
			throw new Error('No content in Anthropic response');
		}

		if (content.type !== 'text') {
			throw new Error('Unexpected response type from Anthropic');
		}

		return parseEvalResult(content.text, scoring);
	} catch (error) {
		console.error('Anthropic evaluation error:', error);
		throw error;
	}
}

/**
 * Parse evaluation result from LLM response
 * Handles both boolean ({ verdict }) and scale ({ score }) formats.
 */
function parseEvalResult(content: string, scoring: 'boolean' | 'scale'): EvalResult {
	try {
		// Try to extract JSON from response (handle cases where LLM adds extra text)
		const jsonMatch = content.match(/\{[\s\S]*\}/);
		const jsonStr = jsonMatch ? jsonMatch[0] : content;

		const parsed = JSON.parse(jsonStr);

		if (scoring === 'boolean') {
			// Boolean mode: expect { verdict: true/false }
			if (typeof parsed.verdict !== 'boolean') {
				// Fallback: try score-based format for robustness
				if (typeof parsed.score === 'number') {
					return {
						score: parsed.score >= 0.5 ? 1 : 0,
						reason: parsed.reason || 'No reason provided',
						chainOfThought: parsed.chainOfThought,
					};
				}
				throw new Error('Invalid boolean verdict format');
			}

			return {
				score: parsed.verdict ? 1 : 0,
				reason: parsed.reason || 'No reason provided',
				chainOfThought: parsed.chainOfThought,
			};
		}

		// Scale mode: expect { score: 0.0-1.0 }
		if (typeof parsed.score !== 'number' || parsed.score < 0 || parsed.score > 1) {
			throw new Error('Invalid score format');
		}

		return {
			score: Math.max(0, Math.min(1, parsed.score)), // Clamp to [0, 1]
			reason: parsed.reason || 'No reason provided',
			chainOfThought: parsed.chainOfThought,
		};
	} catch (error) {
		console.error('Failed to parse LLM evaluation response:', content);
		throw new Error('LLM returned invalid JSON format');
	}
}

// Register with global registry
registry.register('llm-judge', evaluateLLMJudge);
