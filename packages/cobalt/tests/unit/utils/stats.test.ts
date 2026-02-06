import { describe, it, expect } from 'vitest'
import { calculateStats } from '../../../src/utils/stats.js'

describe('calculateStats', () => {
  it('should calculate basic statistics', () => {
    const values = [0.5, 0.7, 0.8, 0.9, 0.95]

    const stats = calculateStats(values)

    expect(stats.avg).toBeCloseTo(0.77, 2)
    expect(stats.min).toBe(0.5)
    expect(stats.max).toBe(0.95)
  })

  it('should calculate p50 percentile (median)', () => {
    const values = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9]

    const stats = calculateStats(values)

    expect(stats.p50).toBe(0.5)
  })

  it('should calculate p95 percentile', () => {
    const values = Array.from({ length: 100 }, (_, i) => (i + 1) / 100)

    const stats = calculateStats(values)

    expect(stats.p95).toBeCloseTo(0.95, 2)
  })

  it('should handle single value', () => {
    const values = [0.75]

    const stats = calculateStats(values)

    expect(stats.avg).toBe(0.75)
    expect(stats.min).toBe(0.75)
    expect(stats.max).toBe(0.75)
    expect(stats.p50).toBe(0.75)
    expect(stats.p95).toBe(0.75)
  })

  it('should handle two values', () => {
    const values = [0.5, 0.9]

    const stats = calculateStats(values)

    expect(stats.avg).toBe(0.7)
    expect(stats.min).toBe(0.5)
    expect(stats.max).toBe(0.9)
    expect(stats.p50).toBe(0.7) // Interpolated median (50% between 0.5 and 0.9)
  })

  it('should handle empty array', () => {
    const values: number[] = []

    const stats = calculateStats(values)

    expect(stats.avg).toBe(0)
    expect(stats.min).toBe(0)
    expect(stats.max).toBe(0)
    expect(stats.p50).toBe(0)
    expect(stats.p95).toBe(0)
  })

  it('should handle all zeros', () => {
    const values = [0, 0, 0, 0, 0]

    const stats = calculateStats(values)

    expect(stats.avg).toBe(0)
    expect(stats.min).toBe(0)
    expect(stats.max).toBe(0)
    expect(stats.p50).toBe(0)
    expect(stats.p95).toBe(0)
  })

  it('should handle all ones', () => {
    const values = [1, 1, 1, 1, 1]

    const stats = calculateStats(values)

    expect(stats.avg).toBe(1)
    expect(stats.min).toBe(1)
    expect(stats.max).toBe(1)
    expect(stats.p50).toBe(1)
    expect(stats.p95).toBe(1)
  })

  it('should calculate average correctly with decimals', () => {
    const values = [0.333, 0.666, 0.999]

    const stats = calculateStats(values)

    expect(stats.avg).toBeCloseTo(0.666, 2)
  })

  it('should handle negative values', () => {
    const values = [-0.5, 0, 0.5, 1]

    const stats = calculateStats(values)

    expect(stats.avg).toBe(0.25)
    expect(stats.min).toBe(-0.5)
    expect(stats.max).toBe(1)
  })

  it('should sort values for percentile calculation', () => {
    const values = [0.9, 0.1, 0.5, 0.3, 0.7]

    const stats = calculateStats(values)

    expect(stats.min).toBe(0.1)
    expect(stats.max).toBe(0.9)
    expect(stats.p50).toBe(0.5)
  })

  it('should handle large datasets', () => {
    const values = Array.from({ length: 10000 }, (_, i) => Math.random())

    const stats = calculateStats(values)

    expect(stats.avg).toBeGreaterThan(0)
    expect(stats.avg).toBeLessThan(1)
    expect(stats.min).toBeGreaterThanOrEqual(0)
    expect(stats.max).toBeLessThanOrEqual(1)
    expect(stats.p50).toBeGreaterThan(0)
    expect(stats.p50).toBeLessThan(1)
    expect(stats.p95).toBeGreaterThan(stats.p50)
  })
})
