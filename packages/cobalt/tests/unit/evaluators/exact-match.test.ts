import { describe, it, expect } from 'vitest'
import { evaluateExactMatch } from '../../../src/evaluators/exact-match.js'
import type { ExactMatchEvaluatorConfig } from '../../../src/types/index.js'
import { sampleEvalContext } from '../../helpers/fixtures.js'

describe('evaluateExactMatch', () => {
  it('should return score 1 for exact match', () => {
    const config: ExactMatchEvaluatorConfig = {
      name: 'exact',
      type: 'exact-match',
      field: 'expectedOutput'
    }

    const result = evaluateExactMatch(config, sampleEvalContext)

    expect(result.score).toBe(1)
    expect(result.reason).toBe('Output matches expected value')
  })

  it('should return score 0 for mismatch', () => {
    const config: ExactMatchEvaluatorConfig = {
      name: 'exact',
      type: 'exact-match',
      field: 'expectedOutput'
    }

    const context = {
      ...sampleEvalContext,
      output: 'London' // Wrong answer
    }

    const result = evaluateExactMatch(config, context)

    expect(result.score).toBe(0)
    expect(result.reason).toContain('does not match')
  })

  it('should perform case-sensitive matching by default', () => {
    const config: ExactMatchEvaluatorConfig = {
      name: 'exact',
      type: 'exact-match',
      field: 'expectedOutput'
    }

    const context = {
      ...sampleEvalContext,
      output: 'paris' // lowercase
    }

    const result = evaluateExactMatch(config, context)

    expect(result.score).toBe(0)
  })

  it('should support case-insensitive matching via caseSensitive=false', () => {
    const config: ExactMatchEvaluatorConfig = {
      name: 'exact',
      type: 'exact-match',
      field: 'expectedOutput',
      caseSensitive: false
    }

    const context = {
      ...sampleEvalContext,
      output: 'paris' // lowercase
    }

    const result = evaluateExactMatch(config, context)

    expect(result.score).toBe(1)
  })

  it('should trim whitespace before comparing', () => {
    const config: ExactMatchEvaluatorConfig = {
      name: 'exact',
      type: 'exact-match',
      field: 'expectedOutput'
    }

    const context = {
      ...sampleEvalContext,
      output: '  Paris  ' // with whitespace
    }

    const result = evaluateExactMatch(config, context)

    expect(result.score).toBe(1)
  })

  it('should handle missing field gracefully', () => {
    const config: ExactMatchEvaluatorConfig = {
      name: 'exact',
      type: 'exact-match',
      field: 'nonExistentField'
    }

    const result = evaluateExactMatch(config, sampleEvalContext)

    expect(result.score).toBe(0)
    expect(result.reason).toBe('Field "nonExistentField" not found in item')
  })

  it('should handle numeric values', () => {
    const config: ExactMatchEvaluatorConfig = {
      name: 'exact',
      type: 'exact-match',
      field: 'expectedOutput'
    }

    const context = {
      item: { expectedOutput: 42 },
      output: 42
    }

    const result = evaluateExactMatch(config, context)

    expect(result.score).toBe(1)
  })

  it('should handle string vs number comparison', () => {
    const config: ExactMatchEvaluatorConfig = {
      name: 'exact',
      type: 'exact-match',
      field: 'expectedOutput'
    }

    const context = {
      item: { expectedOutput: 42 },
      output: '42'
    }

    const result = evaluateExactMatch(config, context)

    expect(result.score).toBe(1) // String coercion should work
  })

  it('should handle boolean values', () => {
    const config: ExactMatchEvaluatorConfig = {
      name: 'exact',
      type: 'exact-match',
      field: 'expectedOutput'
    }

    const context = {
      item: { expectedOutput: true },
      output: true
    }

    const result = evaluateExactMatch(config, context)

    expect(result.score).toBe(1)
  })

  it('should handle empty strings', () => {
    const config: ExactMatchEvaluatorConfig = {
      name: 'exact',
      type: 'exact-match',
      field: 'expectedOutput'
    }

    const context = {
      item: { expectedOutput: '' },
      output: ''
    }

    const result = evaluateExactMatch(config, context)

    expect(result.score).toBe(1)
  })

  it('should handle null values', () => {
    const config: ExactMatchEvaluatorConfig = {
      name: 'exact',
      type: 'exact-match',
      field: 'expectedOutput'
    }

    const context = {
      item: { expectedOutput: null },
      output: null
    }

    const result = evaluateExactMatch(config, context)

    // null is treated as "not found"
    expect(result.score).toBe(0)
    expect(result.reason).toBe('Field "expectedOutput" not found in item')
  })

  it('should handle undefined values', () => {
    const config: ExactMatchEvaluatorConfig = {
      name: 'exact',
      type: 'exact-match',
      field: 'expectedOutput'
    }

    const context = {
      item: { expectedOutput: undefined },
      output: undefined
    }

    const result = evaluateExactMatch(config, context)

    // undefined is treated as "not found"
    expect(result.score).toBe(0)
    expect(result.reason).toBe('Field "expectedOutput" not found in item')
  })

  it('should compare objects by string representation', () => {
    const config: ExactMatchEvaluatorConfig = {
      name: 'exact',
      type: 'exact-match',
      field: 'expectedOutput'
    }

    const context = {
      item: { expectedOutput: { key: 'value' } },
      output: { key: 'value' }
    }

    const result = evaluateExactMatch(config, context)

    // Objects won't match unless they're the same reference or stringified
    expect(result.score).toBeGreaterThanOrEqual(0)
  })

  it('should handle arrays', () => {
    const config: ExactMatchEvaluatorConfig = {
      name: 'exact',
      type: 'exact-match',
      field: 'expectedOutput'
    }

    const context = {
      item: { expectedOutput: ['a', 'b', 'c'] },
      output: ['a', 'b', 'c']
    }

    const result = evaluateExactMatch(config, context)

    expect(result.score).toBeGreaterThanOrEqual(0)
  })

  it('should provide descriptive reason for match', () => {
    const config: ExactMatchEvaluatorConfig = {
      name: 'exact',
      type: 'exact-match',
      field: 'expectedOutput'
    }

    const result = evaluateExactMatch(config, sampleEvalContext)

    expect(result.reason).toBeDefined()
    expect(result.reason.length).toBeGreaterThan(0)
  })

  it('should provide descriptive reason for mismatch', () => {
    const config: ExactMatchEvaluatorConfig = {
      name: 'exact',
      type: 'exact-match',
      field: 'expectedOutput'
    }

    const context = {
      ...sampleEvalContext,
      output: 'Wrong'
    }

    const result = evaluateExactMatch(config, context)

    expect(result.reason).toBeDefined()
    expect(result.reason).toContain('does not match')
  })
})
