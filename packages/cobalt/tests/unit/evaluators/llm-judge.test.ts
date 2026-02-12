import { beforeEach, describe, expect, it, vi } from 'vitest';
import { buildSystemPrompt, evaluateLLMJudge } from '../../../src/evaluators/llm-judge.js';
import type { EvalContext, LLMJudgeEvaluatorConfig } from '../../../src/types/index.js';
import { sampleEvalContext } from '../../helpers/fixtures.js';
import {
	createMockAnthropicResponse,
	createMockOpenAIResponse,
	mockLLMJudgeResponse,
} from '../../helpers/mocks.js';

// Mock boolean response
const mockBooleanResponse = { verdict: true, reason: 'Output meets criteria' };
const mockBooleanWithCoT = {
	chainOfThought: 'Step 1: Check relevance. Step 2: Verify accuracy.',
	verdict: true,
	reason: 'Output meets criteria',
};

// Mock the OpenAI and Anthropic SDKs
vi.mock('openai', () => ({
	default: vi.fn().mockImplementation(() => ({
		chat: {
			completions: {
				create: vi
					.fn()
					.mockResolvedValue(createMockOpenAIResponse(JSON.stringify(mockBooleanResponse))),
			},
		},
	})),
}));

vi.mock('@anthropic-ai/sdk', () => ({
	default: vi.fn().mockImplementation(() => ({
		messages: {
			create: vi
				.fn()
				.mockResolvedValue(createMockAnthropicResponse(JSON.stringify(mockBooleanResponse))),
		},
	})),
}));

describe('evaluateLLMJudge', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('Boolean scoring (default)', () => {
		it('should return score 1 for verdict true', async () => {
			const config: LLMJudgeEvaluatorConfig = {
				name: 'relevance',
				type: 'llm-judge',
				prompt: 'Is this relevant?',
				model: 'gpt-4o-mini',
				provider: 'openai',
			};

			const result = await evaluateLLMJudge(config, sampleEvalContext, 'fake-api-key');

			expect(result.score).toBe(1);
			expect(result.reason).toBe('Output meets criteria');
		});

		it('should return score 0 for verdict false', async () => {
			const OpenAI = (await import('openai')).default;
			vi.mocked(OpenAI).mockImplementation(
				() =>
					({
						chat: {
							completions: {
								create: vi
									.fn()
									.mockResolvedValue(
										createMockOpenAIResponse(
											JSON.stringify({ verdict: false, reason: 'Does not meet criteria' }),
										),
									),
							},
						},
					}) as any,
			);

			const config: LLMJudgeEvaluatorConfig = {
				name: 'relevance',
				type: 'llm-judge',
				prompt: 'Is this relevant?',
				model: 'gpt-4o-mini',
				provider: 'openai',
			};

			const result = await evaluateLLMJudge(config, sampleEvalContext, 'fake-api-key');

			expect(result.score).toBe(0);
			expect(result.reason).toBe('Does not meet criteria');
		});

		it('should include system prompt with verdict format', async () => {
			const OpenAI = (await import('openai')).default;
			const mockCreate = vi
				.fn()
				.mockResolvedValue(createMockOpenAIResponse(JSON.stringify(mockBooleanResponse)));

			vi.mocked(OpenAI).mockImplementation(
				() =>
					({
						chat: {
							completions: {
								create: mockCreate,
							},
						},
					}) as any,
			);

			const config: LLMJudgeEvaluatorConfig = {
				name: 'test',
				type: 'llm-judge',
				prompt: 'Rate this',
				model: 'gpt-4o-mini',
				provider: 'openai',
			};

			await evaluateLLMJudge(config, sampleEvalContext, 'fake-api-key');

			const callArgs = mockCreate.mock.calls[0][0];
			expect(callArgs.messages[0].content).toContain('"verdict"');
			expect(callArgs.messages[0].content).toContain('true or false');
			// Boolean default should include CoT
			expect(callArgs.messages[0].content).toContain('chainOfThought');
		});

		it('should fallback to score-based format in boolean mode', async () => {
			const OpenAI = (await import('openai')).default;
			vi.mocked(OpenAI).mockImplementation(
				() =>
					({
						chat: {
							completions: {
								create: vi
									.fn()
									.mockResolvedValue(
										createMockOpenAIResponse(
											JSON.stringify({ score: 0.85, reason: 'Good response' }),
										),
									),
							},
						},
					}) as any,
			);

			const config: LLMJudgeEvaluatorConfig = {
				name: 'test',
				type: 'llm-judge',
				prompt: 'Rate this',
				model: 'gpt-4o-mini',
				provider: 'openai',
			};

			const result = await evaluateLLMJudge(config, sampleEvalContext, 'fake-api-key');

			// score >= 0.5 maps to 1
			expect(result.score).toBe(1);
		});
	});

	describe('Scale scoring', () => {
		it('should call OpenAI API and return parsed response', async () => {
			const OpenAI = (await import('openai')).default;
			vi.mocked(OpenAI).mockImplementation(
				() =>
					({
						chat: {
							completions: {
								create: vi
									.fn()
									.mockResolvedValue(
										createMockOpenAIResponse(JSON.stringify(mockLLMJudgeResponse)),
									),
							},
						},
					}) as any,
			);

			const config: LLMJudgeEvaluatorConfig = {
				name: 'relevance',
				type: 'llm-judge',
				prompt: 'Rate the relevance from 0 to 1',
				model: 'gpt-4o-mini',
				provider: 'openai',
				scoring: 'scale',
			};

			const result = await evaluateLLMJudge(config, sampleEvalContext, 'fake-api-key');

			expect(result.score).toBe(0.85);
			expect(result.reason).toBe('The response is relevant and accurate.');
		});

		it('should call Anthropic API and return parsed response', async () => {
			const Anthropic = (await import('@anthropic-ai/sdk')).default;
			vi.mocked(Anthropic).mockImplementation(
				() =>
					({
						messages: {
							create: vi
								.fn()
								.mockResolvedValue(
									createMockAnthropicResponse(JSON.stringify(mockLLMJudgeResponse)),
								),
						},
					}) as any,
			);

			const config: LLMJudgeEvaluatorConfig = {
				name: 'relevance',
				type: 'llm-judge',
				prompt: 'Rate the relevance from 0 to 1',
				model: 'claude-sonnet-4-5',
				provider: 'anthropic',
				scoring: 'scale',
			};

			const result = await evaluateLLMJudge(config, sampleEvalContext, 'fake-api-key');

			expect(result.score).toBe(0.85);
			expect(result.reason).toBe('The response is relevant and accurate.');
		});

		it('should include system prompt with score format', async () => {
			const OpenAI = (await import('openai')).default;
			const mockCreate = vi
				.fn()
				.mockResolvedValue(createMockOpenAIResponse(JSON.stringify(mockLLMJudgeResponse)));

			vi.mocked(OpenAI).mockImplementation(
				() =>
					({
						chat: {
							completions: {
								create: mockCreate,
							},
						},
					}) as any,
			);

			const config: LLMJudgeEvaluatorConfig = {
				name: 'test',
				type: 'llm-judge',
				prompt: 'Rate this',
				model: 'gpt-4o-mini',
				provider: 'openai',
				scoring: 'scale',
			};

			await evaluateLLMJudge(config, sampleEvalContext, 'fake-api-key');

			const callArgs = mockCreate.mock.calls[0][0];
			expect(callArgs.messages[0].content).toContain('"score"');
			expect(callArgs.messages[0].content).toContain('0.0 and 1.0');
			// Scale mode default: no CoT
			expect(callArgs.messages[0].content).not.toContain('chainOfThought');
		});
	});

	describe('Chain of thought', () => {
		it('should include CoT in result when enabled', async () => {
			const OpenAI = (await import('openai')).default;
			vi.mocked(OpenAI).mockImplementation(
				() =>
					({
						chat: {
							completions: {
								create: vi
									.fn()
									.mockResolvedValue(createMockOpenAIResponse(JSON.stringify(mockBooleanWithCoT))),
							},
						},
					}) as any,
			);

			const config: LLMJudgeEvaluatorConfig = {
				name: 'test',
				type: 'llm-judge',
				prompt: 'Evaluate this',
				model: 'gpt-4o-mini',
				provider: 'openai',
				// boolean default has CoT enabled
			};

			const result = await evaluateLLMJudge(config, sampleEvalContext, 'fake-api-key');

			expect(result.score).toBe(1);
			expect(result.chainOfThought).toBe('Step 1: Check relevance. Step 2: Verify accuracy.');
		});

		it('should enable CoT for scale mode when explicitly set', async () => {
			const OpenAI = (await import('openai')).default;
			const mockCreate = vi.fn().mockResolvedValue(
				createMockOpenAIResponse(
					JSON.stringify({
						chainOfThought: 'Detailed reasoning here',
						score: 0.9,
						reason: 'Good',
					}),
				),
			);

			vi.mocked(OpenAI).mockImplementation(
				() =>
					({
						chat: {
							completions: {
								create: mockCreate,
							},
						},
					}) as any,
			);

			const config: LLMJudgeEvaluatorConfig = {
				name: 'test',
				type: 'llm-judge',
				prompt: 'Rate this',
				model: 'gpt-4o-mini',
				provider: 'openai',
				scoring: 'scale',
				chainOfThought: true,
			};

			const result = await evaluateLLMJudge(config, sampleEvalContext, 'fake-api-key');

			expect(result.score).toBe(0.9);
			expect(result.chainOfThought).toBe('Detailed reasoning here');

			// System prompt should include CoT instructions
			const callArgs = mockCreate.mock.calls[0][0];
			expect(callArgs.messages[0].content).toContain('Think step by step');
			expect(callArgs.messages[0].content).toContain('chainOfThought');
		});

		it('should disable CoT for boolean when explicitly set', async () => {
			const OpenAI = (await import('openai')).default;
			const mockCreate = vi
				.fn()
				.mockResolvedValue(createMockOpenAIResponse(JSON.stringify(mockBooleanResponse)));

			vi.mocked(OpenAI).mockImplementation(
				() =>
					({
						chat: {
							completions: {
								create: mockCreate,
							},
						},
					}) as any,
			);

			const config: LLMJudgeEvaluatorConfig = {
				name: 'test',
				type: 'llm-judge',
				prompt: 'Is this relevant?',
				model: 'gpt-4o-mini',
				provider: 'openai',
				chainOfThought: false,
			};

			await evaluateLLMJudge(config, sampleEvalContext, 'fake-api-key');

			const callArgs = mockCreate.mock.calls[0][0];
			expect(callArgs.messages[0].content).not.toContain('Think step by step');
			expect(callArgs.messages[0].content).not.toContain('chainOfThought');
		});
	});

	describe('Context mapping', () => {
		it('should apply context mapping before template rendering', async () => {
			const OpenAI = (await import('openai')).default;
			const mockCreate = vi
				.fn()
				.mockResolvedValue(createMockOpenAIResponse(JSON.stringify(mockBooleanResponse)));

			vi.mocked(OpenAI).mockImplementation(
				() =>
					({
						chat: {
							completions: {
								create: mockCreate,
							},
						},
					}) as any,
			);

			const config: LLMJudgeEvaluatorConfig = {
				name: 'test',
				type: 'llm-judge',
				prompt: 'Criteria: {{criteria}}, Input: {{input}}',
				model: 'gpt-4o-mini',
				provider: 'openai',
				context: (ctx) => ({
					...ctx,
					item: { ...ctx.item, criteria: 'Must be factual' },
				}),
			};

			await evaluateLLMJudge(config, sampleEvalContext, 'fake-api-key');

			const callArgs = mockCreate.mock.calls[0][0];
			expect(callArgs.messages[1].content).toContain('Criteria: Must be factual');
		});

		it('should work without context mapping', async () => {
			const OpenAI = (await import('openai')).default;
			const mockCreate = vi
				.fn()
				.mockResolvedValue(createMockOpenAIResponse(JSON.stringify(mockBooleanResponse)));

			vi.mocked(OpenAI).mockImplementation(
				() =>
					({
						chat: {
							completions: {
								create: mockCreate,
							},
						},
					}) as any,
			);

			const config: LLMJudgeEvaluatorConfig = {
				name: 'test',
				type: 'llm-judge',
				prompt: 'Input: {{input}}, Output: {{output}}',
				model: 'gpt-4o-mini',
				provider: 'openai',
			};

			await evaluateLLMJudge(config, sampleEvalContext, 'fake-api-key');

			const callArgs = mockCreate.mock.calls[0][0];
			expect(callArgs.messages[1].content).toContain('What is the capital of France?');
			expect(callArgs.messages[1].content).toContain('Paris');
		});
	});

	describe('Template variables', () => {
		it('should replace template variables in prompt', async () => {
			const OpenAI = (await import('openai')).default;
			const mockCreate = vi
				.fn()
				.mockResolvedValue(createMockOpenAIResponse(JSON.stringify(mockBooleanResponse)));

			vi.mocked(OpenAI).mockImplementation(
				() =>
					({
						chat: {
							completions: {
								create: mockCreate,
							},
						},
					}) as any,
			);

			const config: LLMJudgeEvaluatorConfig = {
				name: 'relevance',
				type: 'llm-judge',
				prompt: 'Input: {{input}}, Output: {{output}}',
				model: 'gpt-4o-mini',
				provider: 'openai',
			};

			await evaluateLLMJudge(config, sampleEvalContext, 'fake-api-key');

			expect(mockCreate).toHaveBeenCalled();
			const callArgs = mockCreate.mock.calls[0][0];
			expect(callArgs.messages[1].content).toContain('What is the capital of France?');
			expect(callArgs.messages[1].content).toContain('Paris');
		});

		it('should replace top-level variables from item', async () => {
			const OpenAI = (await import('openai')).default;
			const mockCreate = vi
				.fn()
				.mockResolvedValue(createMockOpenAIResponse(JSON.stringify(mockBooleanResponse)));

			vi.mocked(OpenAI).mockImplementation(
				() =>
					({
						chat: {
							completions: {
								create: mockCreate,
							},
						},
					}) as any,
			);

			const config: LLMJudgeEvaluatorConfig = {
				name: 'test',
				type: 'llm-judge',
				prompt: 'Expected: {{expectedOutput}}',
				model: 'gpt-4o-mini',
				provider: 'openai',
			};

			await evaluateLLMJudge(config, sampleEvalContext, 'fake-api-key');

			const callArgs = mockCreate.mock.calls[0][0];
			expect(callArgs.messages[1].content).toBe('Expected: Paris');
		});

		it('should resolve nested properties like metadata.model', async () => {
			const OpenAI = (await import('openai')).default;
			const mockCreate = vi
				.fn()
				.mockResolvedValue(createMockOpenAIResponse(JSON.stringify(mockBooleanResponse)));

			vi.mocked(OpenAI).mockImplementation(
				() =>
					({
						chat: {
							completions: {
								create: mockCreate,
							},
						},
					}) as any,
			);

			const config: LLMJudgeEvaluatorConfig = {
				name: 'test',
				type: 'llm-judge',
				prompt: 'Model: {{metadata.model}}',
				model: 'gpt-4o-mini',
				provider: 'openai',
			};

			await evaluateLLMJudge(config, sampleEvalContext, 'fake-api-key');

			const callArgs = mockCreate.mock.calls[0][0];
			expect(callArgs.messages[1].content).toBe('Model: gpt-4o');
		});

		it('should use specified model', async () => {
			const OpenAI = (await import('openai')).default;
			const mockCreate = vi
				.fn()
				.mockResolvedValue(createMockOpenAIResponse(JSON.stringify(mockBooleanResponse)));

			vi.mocked(OpenAI).mockImplementation(
				() =>
					({
						chat: {
							completions: {
								create: mockCreate,
							},
						},
					}) as any,
			);

			const config: LLMJudgeEvaluatorConfig = {
				name: 'relevance',
				type: 'llm-judge',
				prompt: 'Rate this',
				model: 'gpt-4o',
				provider: 'openai',
			};

			await evaluateLLMJudge(config, sampleEvalContext, 'fake-api-key');

			expect(mockCreate).toHaveBeenCalled();
			const callArgs = mockCreate.mock.calls[0][0];
			expect(callArgs.model).toBe('gpt-4o');
		});
	});

	describe('Anthropic provider', () => {
		it('should call Anthropic API for boolean mode', async () => {
			const Anthropic = (await import('@anthropic-ai/sdk')).default;
			vi.mocked(Anthropic).mockImplementation(
				() =>
					({
						messages: {
							create: vi
								.fn()
								.mockResolvedValue(
									createMockAnthropicResponse(JSON.stringify(mockBooleanResponse)),
								),
						},
					}) as any,
			);

			const config: LLMJudgeEvaluatorConfig = {
				name: 'relevance',
				type: 'llm-judge',
				prompt: 'Is this relevant?',
				model: 'claude-sonnet-4-5',
				provider: 'anthropic',
			};

			const result = await evaluateLLMJudge(config, sampleEvalContext, 'fake-api-key');

			expect(result.score).toBe(1);
			expect(result.reason).toBe('Output meets criteria');
		});

		it('should replace template variables for Anthropic', async () => {
			const Anthropic = (await import('@anthropic-ai/sdk')).default;
			const mockCreate = vi
				.fn()
				.mockResolvedValue(createMockAnthropicResponse(JSON.stringify(mockBooleanResponse)));

			vi.mocked(Anthropic).mockImplementation(
				() =>
					({
						messages: {
							create: mockCreate,
						},
					}) as any,
			);

			const config: LLMJudgeEvaluatorConfig = {
				name: 'relevance',
				type: 'llm-judge',
				prompt: 'Input: {{input}}, Output: {{output}}',
				model: 'claude-sonnet-4-5',
				provider: 'anthropic',
			};

			await evaluateLLMJudge(config, sampleEvalContext, 'fake-api-key');

			expect(mockCreate).toHaveBeenCalled();
			const callArgs = mockCreate.mock.calls[0][0];
			expect(callArgs.messages[0].content).toContain('What is the capital of France?');
			expect(callArgs.messages[0].content).toContain('Paris');
		});
	});

	describe('JSON response parsing', () => {
		it('should parse valid JSON response in scale mode', async () => {
			const OpenAI = (await import('openai')).default;
			vi.mocked(OpenAI).mockImplementation(
				() =>
					({
						chat: {
							completions: {
								create: vi
									.fn()
									.mockResolvedValue(
										createMockOpenAIResponse(
											JSON.stringify({ score: 0.75, reason: 'Good response' }),
										),
									),
							},
						},
					}) as any,
			);

			const config: LLMJudgeEvaluatorConfig = {
				name: 'test',
				type: 'llm-judge',
				prompt: 'Rate this',
				model: 'gpt-4o-mini',
				provider: 'openai',
				scoring: 'scale',
			};

			const result = await evaluateLLMJudge(config, sampleEvalContext, 'fake-api-key');

			expect(result.score).toBe(0.75);
			expect(result.reason).toBe('Good response');
		});

		it('should handle JSON wrapped in markdown code blocks', async () => {
			const OpenAI = (await import('openai')).default;
			vi.mocked(OpenAI).mockImplementation(
				() =>
					({
						chat: {
							completions: {
								create: vi
									.fn()
									.mockResolvedValue(
										createMockOpenAIResponse(
											'```json\n{"verdict": true, "reason": "Excellent"}\n```',
										),
									),
							},
						},
					}) as any,
			);

			const config: LLMJudgeEvaluatorConfig = {
				name: 'test',
				type: 'llm-judge',
				prompt: 'Rate this',
				model: 'gpt-4o-mini',
				provider: 'openai',
			};

			const result = await evaluateLLMJudge(config, sampleEvalContext, 'fake-api-key');

			expect(result.score).toBe(1);
			expect(result.reason).toBe('Excellent');
		});

		it('should handle response with only verdict', async () => {
			const OpenAI = (await import('openai')).default;
			vi.mocked(OpenAI).mockImplementation(
				() =>
					({
						chat: {
							completions: {
								create: vi
									.fn()
									.mockResolvedValue(createMockOpenAIResponse(JSON.stringify({ verdict: false }))),
							},
						},
					}) as any,
			);

			const config: LLMJudgeEvaluatorConfig = {
				name: 'test',
				type: 'llm-judge',
				prompt: 'Rate this',
				model: 'gpt-4o-mini',
				provider: 'openai',
			};

			const result = await evaluateLLMJudge(config, sampleEvalContext, 'fake-api-key');

			expect(result.score).toBe(0);
		});

		it('should throw error on invalid JSON', async () => {
			const OpenAI = (await import('openai')).default;
			vi.mocked(OpenAI).mockImplementation(
				() =>
					({
						chat: {
							completions: {
								create: vi
									.fn()
									.mockResolvedValue(createMockOpenAIResponse('This is not valid JSON')),
							},
						},
					}) as any,
			);

			const config: LLMJudgeEvaluatorConfig = {
				name: 'test',
				type: 'llm-judge',
				prompt: 'Rate this',
				model: 'gpt-4o-mini',
				provider: 'openai',
				scoring: 'scale',
			};

			await expect(evaluateLLMJudge(config, sampleEvalContext, 'fake-api-key')).rejects.toThrow(
				/invalid JSON/,
			);
		});
	});

	describe('Error handling', () => {
		it('should throw error when API call fails', async () => {
			const OpenAI = (await import('openai')).default;
			vi.mocked(OpenAI).mockImplementation(
				() =>
					({
						chat: {
							completions: {
								create: vi.fn().mockRejectedValue(new Error('API Error')),
							},
						},
					}) as any,
			);

			const config: LLMJudgeEvaluatorConfig = {
				name: 'test',
				type: 'llm-judge',
				prompt: 'Rate this',
				model: 'gpt-4o-mini',
				provider: 'openai',
			};

			await expect(evaluateLLMJudge(config, sampleEvalContext, 'fake-api-key')).rejects.toThrow(
				'API Error',
			);
		});

		it('should throw error for missing API key', async () => {
			const config: LLMJudgeEvaluatorConfig = {
				name: 'test',
				type: 'llm-judge',
				prompt: 'Rate this',
				model: 'gpt-4o-mini',
				provider: 'openai',
			};

			await expect(evaluateLLMJudge(config, sampleEvalContext, '')).rejects.toThrow();
		});
	});
});

describe('buildSystemPrompt', () => {
	it('should build boolean prompt with CoT', () => {
		const prompt = buildSystemPrompt('boolean', true);

		expect(prompt).toContain('"verdict"');
		expect(prompt).toContain('true or false');
		expect(prompt).toContain('Think step by step');
		expect(prompt).toContain('chainOfThought');
	});

	it('should build boolean prompt without CoT', () => {
		const prompt = buildSystemPrompt('boolean', false);

		expect(prompt).toContain('"verdict"');
		expect(prompt).toContain('true or false');
		expect(prompt).not.toContain('Think step by step');
		expect(prompt).not.toContain('chainOfThought');
	});

	it('should build scale prompt with CoT', () => {
		const prompt = buildSystemPrompt('scale', true);

		expect(prompt).toContain('"score"');
		expect(prompt).toContain('0.0 and 1.0');
		expect(prompt).toContain('Think step by step');
		expect(prompt).toContain('chainOfThought');
	});

	it('should build scale prompt without CoT', () => {
		const prompt = buildSystemPrompt('scale', false);

		expect(prompt).toContain('"score"');
		expect(prompt).toContain('0.0 and 1.0');
		expect(prompt).not.toContain('Think step by step');
		expect(prompt).not.toContain('chainOfThought');
	});
});
