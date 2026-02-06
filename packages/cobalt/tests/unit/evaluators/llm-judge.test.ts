import { describe, it, expect, vi, beforeEach } from 'vitest'
import { evaluateLLMJudge } from '../../../src/evaluators/llm-judge.js'
import type { LLMJudgeEvaluatorConfig } from '../../../src/types/index.js'
import { sampleEvalContext } from '../../helpers/fixtures.js'
import {
  createMockOpenAIResponse,
  createMockAnthropicResponse,
  mockLLMJudgeResponse
} from '../../helpers/mocks.js'

// Mock the OpenAI and Anthropic SDKs
vi.mock('openai', () => ({
  default: vi.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: vi.fn().mockResolvedValue(
          createMockOpenAIResponse(JSON.stringify(mockLLMJudgeResponse))
        )
      }
    }
  }))
}))

vi.mock('@anthropic-ai/sdk', () => ({
  default: vi.fn().mockImplementation(() => ({
    messages: {
      create: vi.fn().mockResolvedValue(
        createMockAnthropicResponse(JSON.stringify(mockLLMJudgeResponse))
      )
    }
  }))
}))

describe('evaluateLLMJudge', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('OpenAI provider', () => {
    it('should call OpenAI API and return parsed response', async () => {
      const config: LLMJudgeEvaluatorConfig = {
        name: 'relevance',
        type: 'llm-judge',
        prompt: 'Rate the relevance from 0 to 1',
        model: 'gpt-4o-mini',
        provider: 'openai'
      }

      const result = await evaluateLLMJudge(
        config,
        sampleEvalContext,
        'fake-api-key'
      )

      expect(result.score).toBe(0.85)
      expect(result.reason).toBe('The response is relevant and accurate.')
    })

    it('should replace template variables in prompt', async () => {
      const OpenAI = (await import('openai')).default
      const mockCreate = vi.fn().mockResolvedValue(
        createMockOpenAIResponse(JSON.stringify(mockLLMJudgeResponse))
      )

      vi.mocked(OpenAI).mockImplementation(() => ({
        chat: {
          completions: {
            create: mockCreate
          }
        }
      }) as any)

      const config: LLMJudgeEvaluatorConfig = {
        name: 'relevance',
        type: 'llm-judge',
        prompt: 'Input: {{input}}, Output: {{output}}',
        model: 'gpt-4o-mini',
        provider: 'openai'
      }

      await evaluateLLMJudge(config, sampleEvalContext, 'fake-api-key')

      expect(mockCreate).toHaveBeenCalled()
      const callArgs = mockCreate.mock.calls[0][0]
      // OpenAI has system message in [0] and user message in [1]
      expect(callArgs.messages[1].content).toContain('What is the capital of France?')
      expect(callArgs.messages[1].content).toContain('Paris')
    })

    it('should use specified model', async () => {
      const OpenAI = (await import('openai')).default
      const mockCreate = vi.fn().mockResolvedValue(
        createMockOpenAIResponse(JSON.stringify(mockLLMJudgeResponse))
      )

      vi.mocked(OpenAI).mockImplementation(() => ({
        chat: {
          completions: {
            create: mockCreate
          }
        }
      }) as any)

      const config: LLMJudgeEvaluatorConfig = {
        name: 'relevance',
        type: 'llm-judge',
        prompt: 'Rate this',
        model: 'gpt-4o',
        provider: 'openai'
      }

      await evaluateLLMJudge(config, sampleEvalContext, 'fake-api-key')

      expect(mockCreate).toHaveBeenCalled()
      const callArgs = mockCreate.mock.calls[0][0]
      expect(callArgs.model).toBe('gpt-4o')
    })
  })

  describe('Anthropic provider', () => {
    it('should call Anthropic API and return parsed response', async () => {
      const config: LLMJudgeEvaluatorConfig = {
        name: 'relevance',
        type: 'llm-judge',
        prompt: 'Rate the relevance from 0 to 1',
        model: 'claude-sonnet-4-5',
        provider: 'anthropic'
      }

      const result = await evaluateLLMJudge(
        config,
        sampleEvalContext,
        'fake-api-key'
      )

      expect(result.score).toBe(0.85)
      expect(result.reason).toBe('The response is relevant and accurate.')
    })

    it('should replace template variables for Anthropic', async () => {
      const Anthropic = (await import('@anthropic-ai/sdk')).default
      const mockCreate = vi.fn().mockResolvedValue(
        createMockAnthropicResponse(JSON.stringify(mockLLMJudgeResponse))
      )

      vi.mocked(Anthropic).mockImplementation(() => ({
        messages: {
          create: mockCreate
        }
      }) as any)

      const config: LLMJudgeEvaluatorConfig = {
        name: 'relevance',
        type: 'llm-judge',
        prompt: 'Input: {{input}}, Output: {{output}}',
        model: 'claude-sonnet-4-5',
        provider: 'anthropic'
      }

      await evaluateLLMJudge(config, sampleEvalContext, 'fake-api-key')

      expect(mockCreate).toHaveBeenCalled()
      const callArgs = mockCreate.mock.calls[0][0]
      expect(callArgs.messages[0].content).toContain('What is the capital of France?')
      expect(callArgs.messages[0].content).toContain('Paris')
    })
  })

  describe('JSON response parsing', () => {
    it('should parse valid JSON response', async () => {
      const OpenAI = (await import('openai')).default
      vi.mocked(OpenAI).mockImplementation(() => ({
        chat: {
          completions: {
            create: vi.fn().mockResolvedValue(
              createMockOpenAIResponse(
                JSON.stringify({ score: 0.75, reason: 'Good response' })
              )
            )
          }
        }
      }) as any)

      const config: LLMJudgeEvaluatorConfig = {
        name: 'test',
        type: 'llm-judge',
        prompt: 'Rate this',
        model: 'gpt-4o-mini',
        provider: 'openai'
      }

      const result = await evaluateLLMJudge(config, sampleEvalContext, 'fake-api-key')

      expect(result.score).toBe(0.75)
      expect(result.reason).toBe('Good response')
    })

    it('should handle JSON wrapped in markdown code blocks', async () => {
      const OpenAI = (await import('openai')).default
      vi.mocked(OpenAI).mockImplementation(() => ({
        chat: {
          completions: {
            create: vi.fn().mockResolvedValue(
              createMockOpenAIResponse(
                '```json\n{"score": 0.9, "reason": "Excellent"}\n```'
              )
            )
          }
        }
      }) as any)

      const config: LLMJudgeEvaluatorConfig = {
        name: 'test',
        type: 'llm-judge',
        prompt: 'Rate this',
        model: 'gpt-4o-mini',
        provider: 'openai'
      }

      const result = await evaluateLLMJudge(config, sampleEvalContext, 'fake-api-key')

      expect(result.score).toBe(0.9)
      expect(result.reason).toBe('Excellent')
    })

    it('should handle response with only score', async () => {
      const OpenAI = (await import('openai')).default
      vi.mocked(OpenAI).mockImplementation(() => ({
        chat: {
          completions: {
            create: vi.fn().mockResolvedValue(
              createMockOpenAIResponse(JSON.stringify({ score: 0.65 }))
            )
          }
        }
      }) as any)

      const config: LLMJudgeEvaluatorConfig = {
        name: 'test',
        type: 'llm-judge',
        prompt: 'Rate this',
        model: 'gpt-4o-mini',
        provider: 'openai'
      }

      const result = await evaluateLLMJudge(config, sampleEvalContext, 'fake-api-key')

      expect(result.score).toBe(0.65)
    })

    it('should throw error on invalid JSON', async () => {
      const OpenAI = (await import('openai')).default
      vi.mocked(OpenAI).mockImplementation(() => ({
        chat: {
          completions: {
            create: vi.fn().mockResolvedValue(
              createMockOpenAIResponse('This is not valid JSON')
            )
          }
        }
      }) as any)

      const config: LLMJudgeEvaluatorConfig = {
        name: 'test',
        type: 'llm-judge',
        prompt: 'Rate this',
        model: 'gpt-4o-mini',
        provider: 'openai'
      }

      // No retry logic exists - should throw immediately
      await expect(
        evaluateLLMJudge(config, sampleEvalContext, 'fake-api-key')
      ).rejects.toThrow(/invalid JSON/)
    })
  })

  describe('error handling', () => {
    it('should throw error when API call fails', async () => {
      const OpenAI = (await import('openai')).default
      vi.mocked(OpenAI).mockImplementation(() => ({
        chat: {
          completions: {
            create: vi.fn().mockRejectedValue(new Error('API Error'))
          }
        }
      }) as any)

      const config: LLMJudgeEvaluatorConfig = {
        name: 'test',
        type: 'llm-judge',
        prompt: 'Rate this',
        model: 'gpt-4o-mini',
        provider: 'openai'
      }

      await expect(
        evaluateLLMJudge(config, sampleEvalContext, 'fake-api-key')
      ).rejects.toThrow('API Error')
    })

    it('should throw error for missing API key', async () => {
      const config: LLMJudgeEvaluatorConfig = {
        name: 'test',
        type: 'llm-judge',
        prompt: 'Rate this',
        model: 'gpt-4o-mini',
        provider: 'openai'
      }

      await expect(
        evaluateLLMJudge(config, sampleEvalContext, '')
      ).rejects.toThrow()
    })
  })

  describe('template variables', () => {
    it('should replace top-level variables from item', async () => {
      const OpenAI = (await import('openai')).default
      const mockCreate = vi.fn().mockResolvedValue(
        createMockOpenAIResponse(JSON.stringify(mockLLMJudgeResponse))
      )

      vi.mocked(OpenAI).mockImplementation(() => ({
        chat: {
          completions: {
            create: mockCreate
          }
        }
      }) as any)

      const config: LLMJudgeEvaluatorConfig = {
        name: 'test',
        type: 'llm-judge',
        prompt: 'Expected: {{expectedOutput}}',
        model: 'gpt-4o-mini',
        provider: 'openai'
      }

      await evaluateLLMJudge(config, sampleEvalContext, 'fake-api-key')

      const callArgs = mockCreate.mock.calls[0][0]
      // OpenAI has system message in [0] and user message in [1]
      expect(callArgs.messages[1].content).toBe('Expected: Paris')
    })

    it('should not support nested properties like metadata.model', async () => {
      const OpenAI = (await import('openai')).default
      const mockCreate = vi.fn().mockResolvedValue(
        createMockOpenAIResponse(JSON.stringify(mockLLMJudgeResponse))
      )

      vi.mocked(OpenAI).mockImplementation(() => ({
        chat: {
          completions: {
            create: mockCreate
          }
        }
      }) as any)

      const config: LLMJudgeEvaluatorConfig = {
        name: 'test',
        type: 'llm-judge',
        prompt: 'Model: {{metadata.model}}',
        model: 'gpt-4o-mini',
        provider: 'openai'
      }

      await evaluateLLMJudge(config, sampleEvalContext, 'fake-api-key')

      const callArgs = mockCreate.mock.calls[0][0]
      // Template engine doesn't support nested paths, so it stays unreplaced
      expect(callArgs.messages[1].content).toBe('Model: {{metadata.model}}')
    })
  })
})
