import OpenAI from 'openai'
import Anthropic from '@anthropic-ai/sdk'
import type { LLMJudgeEvaluatorConfig, EvalContext, EvalResult } from '../types/index.js'
import { renderTemplate } from '../utils/template.js'

/**
 * Evaluate using LLM as judge
 * @param config - LLM judge evaluator configuration
 * @param context - Evaluation context
 * @param apiKey - API key for the LLM provider
 * @param modelOverride - Optional model override
 * @returns Evaluation result
 */
export async function evaluateLLMJudge(
  config: LLMJudgeEvaluatorConfig,
  context: EvalContext,
  apiKey: string,
  modelOverride?: string
): Promise<EvalResult> {
  const model = modelOverride || config.model || 'gpt-4o-mini'

  // Render prompt template
  const prompt = renderTemplate(config.prompt, {
    input: context.item.input || context.item,
    output: context.output,
    expectedOutput: context.item.expectedOutput,
    metadata: context.metadata,
    ...context.item
  })

  // Determine provider from model name
  const provider = determineProvider(model)

  // Call appropriate LLM API
  if (provider === 'openai') {
    return await callOpenAI(prompt, model, apiKey)
  } else {
    return await callAnthropic(prompt, model, apiKey)
  }
}

/**
 * Determine LLM provider from model name
 */
function determineProvider(model: string): 'openai' | 'anthropic' {
  if (model.startsWith('claude')) {
    return 'anthropic'
  }
  return 'openai'
}

/**
 * Call OpenAI API for evaluation
 */
async function callOpenAI(
  prompt: string,
  model: string,
  apiKey: string
): Promise<EvalResult> {
  const client = new OpenAI({ apiKey })

  const systemPrompt = `You are an AI evaluation judge. Your task is to evaluate AI agent outputs based on specific criteria.

IMPORTANT: You must respond with a valid JSON object in this exact format:
{
  "score": <number between 0.0 and 1.0>,
  "reason": "<brief explanation>"
}

Do not include any text outside the JSON object.`

  try {
    const response = await client.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt }
      ],
      temperature: 0.2,
      response_format: { type: 'json_object' }
    })

    const content = response.choices[0]?.message?.content

    if (!content) {
      throw new Error('Empty response from OpenAI')
    }

    return parseEvalResult(content)
  } catch (error) {
    console.error('OpenAI evaluation error:', error)
    throw error
  }
}

/**
 * Call Anthropic API for evaluation
 */
async function callAnthropic(
  prompt: string,
  model: string,
  apiKey: string
): Promise<EvalResult> {
  const client = new Anthropic({ apiKey })

  const systemPrompt = `You are an AI evaluation judge. Your task is to evaluate AI agent outputs based on specific criteria.

IMPORTANT: You must respond with a valid JSON object in this exact format:
{
  "score": <number between 0.0 and 1.0>,
  "reason": "<brief explanation>"
}

Do not include any text outside the JSON object.`

  try {
    const response = await client.messages.create({
      model,
      max_tokens: 1024,
      temperature: 0.2,
      system: systemPrompt,
      messages: [
        { role: 'user', content: prompt }
      ]
    })

    const content = response.content[0]

    if (content.type !== 'text') {
      throw new Error('Unexpected response type from Anthropic')
    }

    return parseEvalResult(content.text)
  } catch (error) {
    console.error('Anthropic evaluation error:', error)
    throw error
  }
}

/**
 * Parse evaluation result from LLM response
 */
function parseEvalResult(content: string): EvalResult {
  try {
    // Try to extract JSON from response (handle cases where LLM adds extra text)
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    const jsonStr = jsonMatch ? jsonMatch[0] : content

    const parsed = JSON.parse(jsonStr)

    // Validate format
    if (typeof parsed.score !== 'number' || parsed.score < 0 || parsed.score > 1) {
      throw new Error('Invalid score format')
    }

    return {
      score: Math.max(0, Math.min(1, parsed.score)), // Clamp to [0, 1]
      reason: parsed.reason || 'No reason provided'
    }
  } catch (error) {
    console.error('Failed to parse LLM evaluation response:', content)
    throw new Error('LLM returned invalid JSON format')
  }
}
