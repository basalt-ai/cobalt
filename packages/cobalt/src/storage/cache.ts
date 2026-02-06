import { mkdir, writeFile, readFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { resolve, join } from 'node:path'
import type { EvalResult } from '../types/index.js'
import { generateHash } from '../utils/hash.js'

interface CacheEntry {
  result: EvalResult
  timestamp: number
}

/**
 * LLM Judge Cache
 * Caches LLM evaluation responses to reduce API calls and costs
 */
export class LLMJudgeCache {
  private cache: Map<string, CacheEntry> = new Map()
  private cachePath: string
  private enabled: boolean
  private ttlMs: number

  constructor(outputDir: string = '.cobalt', enabled: boolean = true, ttl: string = '7d') {
    const cacheDir = resolve(process.cwd(), outputDir, 'cache')
    this.cachePath = join(cacheDir, 'llm-judge-cache.json')
    this.enabled = enabled
    this.ttlMs = parseTTL(ttl)

    // Load cache from disk
    if (enabled) {
      this.loadCache().catch(err => {
        console.warn('Failed to load cache, starting fresh:', err)
      })
    }
  }

  /**
   * Get cached evaluation result
   * @param prompt - Evaluator prompt
   * @param input - Input data
   * @param output - Output data
   * @returns Cached result or null if not found/expired
   */
  async get(prompt: string, input: any, output: any): Promise<EvalResult | null> {
    if (!this.enabled) return null

    const key = this.generateKey(prompt, input, output)
    const entry = this.cache.get(key)

    if (!entry) return null

    // Check if expired
    const age = Date.now() - entry.timestamp
    if (age > this.ttlMs) {
      this.cache.delete(key)
      return null
    }

    return entry.result
  }

  /**
   * Set cached evaluation result
   * @param prompt - Evaluator prompt
   * @param input - Input data
   * @param output - Output data
   * @param result - Evaluation result to cache
   */
  async set(prompt: string, input: any, output: any, result: EvalResult): Promise<void> {
    if (!this.enabled) return

    const key = this.generateKey(prompt, input, output)

    this.cache.set(key, {
      result,
      timestamp: Date.now()
    })

    // Periodically flush to disk (every 10 entries)
    if (this.cache.size % 10 === 0) {
      await this.flushCache().catch(err => {
        console.warn('Failed to flush cache:', err)
      })
    }
  }

  /**
   * Generate cache key from prompt, input, and output
   */
  generateKey(prompt: string, input: any, output: any): string {
    return generateHash(prompt, input, output)
  }

  /**
   * Load cache from disk
   */
  private async loadCache(): Promise<void> {
    if (!existsSync(this.cachePath)) {
      return
    }

    try {
      const content = await readFile(this.cachePath, 'utf-8')
      const data = JSON.parse(content)

      // Convert to Map
      for (const [key, entry] of Object.entries(data)) {
        this.cache.set(key, entry as CacheEntry)
      }

      // Clean expired entries
      this.cleanExpired()

      console.log(`Loaded ${this.cache.size} cached evaluations`)
    } catch (error) {
      console.warn('Failed to load cache file:', error)
    }
  }

  /**
   * Flush cache to disk
   */
  async flushCache(): Promise<void> {
    const cacheDir = resolve(process.cwd(), '.cobalt', 'cache')

    // Ensure directory exists
    if (!existsSync(cacheDir)) {
      await mkdir(cacheDir, { recursive: true })
    }

    // Convert Map to plain object
    const data: Record<string, CacheEntry> = {}
    for (const [key, entry] of this.cache.entries()) {
      data[key] = entry
    }

    await writeFile(this.cachePath, JSON.stringify(data, null, 2), 'utf-8')
  }

  /**
   * Clean expired cache entries
   */
  private cleanExpired(): void {
    const now = Date.now()
    let removed = 0

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.ttlMs) {
        this.cache.delete(key)
        removed++
      }
    }

    if (removed > 0) {
      console.log(`Cleaned ${removed} expired cache entries`)
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): { size: number; oldestEntry: number | null } {
    let oldest: number | null = null

    for (const entry of this.cache.values()) {
      if (oldest === null || entry.timestamp < oldest) {
        oldest = entry.timestamp
      }
    }

    return {
      size: this.cache.size,
      oldestEntry: oldest
    }
  }
}

/**
 * Parse TTL string (e.g., "7d", "2h", "30m")
 * @param ttl - TTL string
 * @returns TTL in milliseconds
 */
function parseTTL(ttl: string): number {
  const match = ttl.match(/^(\d+)([dhms])$/)

  if (!match) {
    console.warn(`Invalid TTL format: ${ttl}, using default 7d`)
    return 7 * 24 * 60 * 60 * 1000 // 7 days
  }

  const value = parseInt(match[1], 10)
  const unit = match[2]

  switch (unit) {
    case 'd':
      return value * 24 * 60 * 60 * 1000
    case 'h':
      return value * 60 * 60 * 1000
    case 'm':
      return value * 60 * 1000
    case 's':
      return value * 1000
    default:
      return 7 * 24 * 60 * 60 * 1000
  }
}
