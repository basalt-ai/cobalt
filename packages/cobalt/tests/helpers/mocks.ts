import { vi } from 'vitest';
import type { EvalResult } from '../../src/types/index.js';

/**
 * Mock LLM response for testing evaluators
 */
export const mockLLMJudgeResponse = {
	score: 0.85,
	reason: 'The response is relevant and accurate.',
};

/**
 * Mock OpenAI completion response
 */
export function createMockOpenAIResponse(content: string) {
	return {
		choices: [
			{
				message: {
					content,
					role: 'assistant',
				},
			},
		],
		usage: {
			prompt_tokens: 100,
			completion_tokens: 50,
			total_tokens: 150,
		},
	};
}

/**
 * Mock Anthropic message response
 */
export function createMockAnthropicResponse(content: string) {
	return {
		content: [
			{
				type: 'text',
				text: content,
			},
		],
		usage: {
			input_tokens: 100,
			output_tokens: 50,
		},
	};
}

/**
 * Create mock OpenAI client
 */
export function createMockOpenAIClient() {
	return {
		chat: {
			completions: {
				create: vi
					.fn()
					.mockResolvedValue(createMockOpenAIResponse(JSON.stringify(mockLLMJudgeResponse))),
			},
		},
	};
}

/**
 * Create mock Anthropic client
 */
export function createMockAnthropicClient() {
	return {
		messages: {
			create: vi
				.fn()
				.mockResolvedValue(createMockAnthropicResponse(JSON.stringify(mockLLMJudgeResponse))),
		},
	};
}

/**
 * Mock file system operations
 */
export function mockFileSystem(files: Record<string, string>) {
	const fs = {
		readFileSync: vi.fn((path: string) => {
			const normalizedPath = path.toString();
			const file = Object.keys(files).find((key) => normalizedPath.includes(key));
			if (!file) {
				throw new Error(`ENOENT: no such file or directory, open '${path}'`);
			}
			return files[file];
		}),
	};

	return fs;
}

/**
 * Mock OpenAI embeddings response
 */
export function createMockEmbeddingResponse(embedding: number[]) {
	return {
		data: [
			{
				embedding,
				index: 0,
				object: 'embedding',
			},
		],
		model: 'text-embedding-3-small',
		usage: {
			prompt_tokens: 10,
			total_tokens: 10,
		},
	};
}

/**
 * Create a temporary test directory path
 */
export function getTempTestDir() {
	return `/tmp/cobalt-test-${Date.now()}-${Math.random().toString(36).substring(7)}`;
}

/**
 * Mock evaluator that always returns a specific score
 */
export function createMockEvaluator(
	name: string,
	score: number,
): { evaluate: () => Promise<EvalResult>; name: string } {
	return {
		name,
		evaluate: vi.fn().mockResolvedValue({ score, reason: `Mock evaluation for ${name}` }),
	};
}
