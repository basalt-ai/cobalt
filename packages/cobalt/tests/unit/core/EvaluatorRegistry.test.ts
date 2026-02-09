import { describe, it, expect, beforeEach } from 'vitest'
import { EvaluatorRegistry } from '../../../src/core/EvaluatorRegistry.js'
import type { EvaluatorHandler } from '../../../src/core/plugin.js'
import type { EvalContext, EvalResult } from '../../../src/types/index.js'

describe('EvaluatorRegistry', () => {
  let registry: EvaluatorRegistry

  beforeEach(() => {
    registry = new EvaluatorRegistry()
  })

  describe('register()', () => {
    it('should register an evaluator handler', () => {
      const handler: EvaluatorHandler = async () => ({ score: 1, reason: 'test' })

      registry.register('test-type', handler)

      expect(registry.has('test-type')).toBe(true)
    })

    it('should allow registering multiple different types', () => {
      const handler1: EvaluatorHandler = async () => ({ score: 1, reason: 'test1' })
      const handler2: EvaluatorHandler = async () => ({ score: 0.5, reason: 'test2' })

      registry.register('type1', handler1)
      registry.register('type2', handler2)

      expect(registry.has('type1')).toBe(true)
      expect(registry.has('type2')).toBe(true)
      expect(registry.list()).toContain('type1')
      expect(registry.list()).toContain('type2')
    })

    it('should overwrite existing evaluator when registering same type', () => {
      const handler1: EvaluatorHandler = async () => ({ score: 1, reason: 'original' })
      const handler2: EvaluatorHandler = async () => ({ score: 0.5, reason: 'replacement' })

      registry.register('overwrite-test', handler1)
      registry.register('overwrite-test', handler2)

      const retrievedHandler = registry.get('overwrite-test')
      expect(retrievedHandler).toBe(handler2)
    })

    it('should warn when overwriting existing evaluator', () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      const handler1: EvaluatorHandler = async () => ({ score: 1 })
      const handler2: EvaluatorHandler = async () => ({ score: 0.5 })

      registry.register('warn-test', handler1)
      registry.register('warn-test', handler2)

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('already registered')
      )

      consoleWarnSpy.mockRestore()
    })
  })

  describe('get()', () => {
    it('should retrieve registered evaluator handler', () => {
      const handler: EvaluatorHandler = async () => ({ score: 0.8, reason: 'retrieved' })

      registry.register('get-test', handler)

      const retrieved = registry.get('get-test')
      expect(retrieved).toBe(handler)
    })

    it('should return undefined for unregistered type', () => {
      const retrieved = registry.get('nonexistent')
      expect(retrieved).toBeUndefined()
    })

    it('should allow calling retrieved handler', async () => {
      const mockContext: EvalContext = {
        item: { input: 'test' },
        output: 'test output'
      }

      const handler: EvaluatorHandler = async (config, context) => ({
        score: 0.9,
        reason: `Evaluated: ${context.output}`
      })

      registry.register('callable-test', handler)

      const retrieved = registry.get('callable-test')!
      const result = await retrieved({}, mockContext)

      expect(result.score).toBe(0.9)
      expect(result.reason).toContain('Evaluated: test output')
    })
  })

  describe('has()', () => {
    it('should return true for registered evaluator', () => {
      const handler: EvaluatorHandler = async () => ({ score: 1 })

      registry.register('exists', handler)

      expect(registry.has('exists')).toBe(true)
    })

    it('should return false for unregistered evaluator', () => {
      expect(registry.has('does-not-exist')).toBe(false)
    })

    it('should return false after unregistering', () => {
      const handler: EvaluatorHandler = async () => ({ score: 1 })

      registry.register('temporary', handler)
      expect(registry.has('temporary')).toBe(true)

      registry.unregister('temporary')
      expect(registry.has('temporary')).toBe(false)
    })
  })

  describe('list()', () => {
    it('should return empty array for empty registry', () => {
      expect(registry.list()).toEqual([])
    })

    it('should list all registered evaluator types', () => {
      const handler: EvaluatorHandler = async () => ({ score: 1 })

      registry.register('type-a', handler)
      registry.register('type-b', handler)
      registry.register('type-c', handler)

      const types = registry.list()

      expect(types).toHaveLength(3)
      expect(types).toContain('type-a')
      expect(types).toContain('type-b')
      expect(types).toContain('type-c')
    })

    it('should not include unregistered types', () => {
      const handler: EvaluatorHandler = async () => ({ score: 1 })

      registry.register('included', handler)

      const types = registry.list()

      expect(types).toContain('included')
      expect(types).not.toContain('not-included')
    })
  })

  describe('unregister()', () => {
    it('should remove registered evaluator', () => {
      const handler: EvaluatorHandler = async () => ({ score: 1 })

      registry.register('remove-me', handler)
      expect(registry.has('remove-me')).toBe(true)

      const removed = registry.unregister('remove-me')

      expect(removed).toBe(true)
      expect(registry.has('remove-me')).toBe(false)
    })

    it('should return false when unregistering nonexistent type', () => {
      const removed = registry.unregister('never-existed')
      expect(removed).toBe(false)
    })

    it('should not affect other registered evaluators', () => {
      const handler: EvaluatorHandler = async () => ({ score: 1 })

      registry.register('keep-1', handler)
      registry.register('remove', handler)
      registry.register('keep-2', handler)

      registry.unregister('remove')

      expect(registry.has('keep-1')).toBe(true)
      expect(registry.has('keep-2')).toBe(true)
      expect(registry.has('remove')).toBe(false)
    })
  })

  describe('clear()', () => {
    it('should remove all registered evaluators', () => {
      const handler: EvaluatorHandler = async () => ({ score: 1 })

      registry.register('eval-1', handler)
      registry.register('eval-2', handler)
      registry.register('eval-3', handler)

      expect(registry.list()).toHaveLength(3)

      registry.clear()

      expect(registry.list()).toHaveLength(0)
      expect(registry.has('eval-1')).toBe(false)
      expect(registry.has('eval-2')).toBe(false)
      expect(registry.has('eval-3')).toBe(false)
    })

    it('should handle clearing empty registry', () => {
      expect(() => registry.clear()).not.toThrow()
      expect(registry.list()).toHaveLength(0)
    })
  })

  describe('Integration Tests', () => {
    it('should handle complete evaluator lifecycle', async () => {
      const mockContext: EvalContext = {
        item: { input: 'test input' },
        output: 'test output'
      }

      // Register
      const handler: EvaluatorHandler = async (config, context) => ({
        score: 0.75,
        reason: `Processed: ${context.item.input}`
      })

      registry.register('lifecycle-test', handler)

      // Verify registration
      expect(registry.has('lifecycle-test')).toBe(true)
      expect(registry.list()).toContain('lifecycle-test')

      // Use
      const retrieved = registry.get('lifecycle-test')!
      const result = await retrieved({}, mockContext)

      expect(result.score).toBe(0.75)
      expect(result.reason).toContain('Processed: test input')

      // Unregister
      registry.unregister('lifecycle-test')
      expect(registry.has('lifecycle-test')).toBe(false)
    })

    it('should support multiple concurrent evaluators', async () => {
      const context: EvalContext = {
        item: { input: 'concurrent test' },
        output: 'result'
      }

      const handler1: EvaluatorHandler = async () => ({ score: 0.9, reason: 'eval1' })
      const handler2: EvaluatorHandler = async () => ({ score: 0.8, reason: 'eval2' })
      const handler3: EvaluatorHandler = async () => ({ score: 0.7, reason: 'eval3' })

      registry.register('concurrent-1', handler1)
      registry.register('concurrent-2', handler2)
      registry.register('concurrent-3', handler3)

      const results = await Promise.all([
        registry.get('concurrent-1')!({}, context),
        registry.get('concurrent-2')!({}, context),
        registry.get('concurrent-3')!({}, context)
      ])

      expect(results[0].score).toBe(0.9)
      expect(results[1].score).toBe(0.8)
      expect(results[2].score).toBe(0.7)
    })

    it('should maintain handler state correctly', async () => {
      let callCount = 0

      const statefulHandler: EvaluatorHandler = async () => {
        callCount++
        return { score: 0.5, reason: `Call ${callCount}` }
      }

      registry.register('stateful', statefulHandler)

      const handler = registry.get('stateful')!
      await handler({}, { item: {}, output: '' })
      await handler({}, { item: {}, output: '' })
      await handler({}, { item: {}, output: '' })

      expect(callCount).toBe(3)
    })
  })

  describe('Type Safety', () => {
    it('should accept async handler functions', async () => {
      const asyncHandler: EvaluatorHandler = async (config, context) => {
        await new Promise(resolve => setTimeout(resolve, 10))
        return { score: 1, reason: 'async' }
      }

      registry.register('async-test', asyncHandler)

      const result = await registry.get('async-test')!({}, { item: {}, output: '' })
      expect(result.score).toBe(1)
    })

    it('should accept handlers that use config parameter', async () => {
      const configHandler: EvaluatorHandler = async (config) => ({
        score: config.threshold || 0.5,
        reason: 'config-based'
      })

      registry.register('config-test', configHandler)

      const result = await registry.get('config-test')!({ threshold: 0.9 }, { item: {}, output: '' })
      expect(result.score).toBe(0.9)
    })

    it('should accept handlers that use apiKey parameter', async () => {
      const apiKeyHandler: EvaluatorHandler = async (config, context, apiKey) => ({
        score: apiKey ? 1 : 0,
        reason: apiKey ? 'authenticated' : 'no auth'
      })

      registry.register('auth-test', apiKeyHandler)

      const resultWithKey = await registry.get('auth-test')!({}, { item: {}, output: '' }, 'test-key')
      expect(resultWithKey.score).toBe(1)

      const resultWithoutKey = await registry.get('auth-test')!({}, { item: {}, output: '' })
      expect(resultWithoutKey.score).toBe(0)
    })
  })
})
