import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { resolveChatConfig } from '../../../../src/cli/commands/serve'

describe('resolveChatConfig', () => {
	const originalEnv = process.env

	beforeEach(() => {
		process.env = { ...originalEnv }
	})

	afterEach(() => {
		process.env = originalEnv
	})

	it('should return explicit config when provided', () => {
		process.env.OPENAI_API_KEY = 'sk-test'
		const explicit = { provider: 'anthropic' as const, model: 'claude-sonnet-4-20250514' }
		expect(resolveChatConfig(explicit)).toBe(explicit)
	})

	it('should auto-enable openai chat when OPENAI_API_KEY is set', () => {
		process.env.OPENAI_API_KEY = 'sk-test'
		expect(resolveChatConfig(undefined)).toEqual({
			provider: 'openai',
			model: 'gpt-5-mini',
		})
	})

	it('should return undefined when no key and no explicit config', () => {
		process.env.OPENAI_API_KEY = undefined
		expect(resolveChatConfig(undefined)).toBeUndefined()
	})
})
