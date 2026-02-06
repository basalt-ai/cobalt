import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { createJiti } from 'jiti'
import { defu } from 'defu'
import type { CobaltConfig } from '../types/index.js'

/**
 * Default configuration values
 */
const DEFAULT_CONFIG: CobaltConfig = {
  testDir: './experiments',
  testMatch: ['**/*.cobalt.ts', '**/*.experiment.ts'],
  judge: {
    model: 'gpt-4o-mini',
    provider: 'openai',
    apiKey: process.env.OPENAI_API_KEY
  },
  outputDir: '.cobalt',
  concurrency: 5,
  timeout: 30_000,
  reporters: ['cli', 'json'],
  dashboard: {
    port: 4000,
    open: true
  },
  cache: {
    enabled: true,
    ttl: '7d'
  }
}

/**
 * Define a Cobalt configuration
 * @param config - Partial configuration object
 * @returns Merged configuration with defaults
 */
export function defineConfig(config: Partial<CobaltConfig>): CobaltConfig {
  return defu(config, DEFAULT_CONFIG) as CobaltConfig
}

/**
 * Load configuration from file
 * Searches for cobalt.config.{ts,js,mjs,json} in current directory and parent directories
 * @param cwd - Current working directory (default: process.cwd())
 * @returns Loaded configuration or default config
 */
export async function loadConfig(cwd: string = process.cwd()): Promise<CobaltConfig> {
  const configFiles = [
    'cobalt.config.ts',
    'cobalt.config.js',
    'cobalt.config.mjs',
    'cobalt.config.json'
  ]

  // Search for config file in cwd and parent directories
  let currentDir = resolve(cwd)
  let configPath: string | null = null

  while (true) {
    for (const file of configFiles) {
      const path = resolve(currentDir, file)
      if (existsSync(path)) {
        configPath = path
        break
      }
    }

    if (configPath) break

    const parentDir = resolve(currentDir, '..')
    if (parentDir === currentDir) break // Reached root
    currentDir = parentDir
  }

  // If no config file found, return defaults
  if (!configPath) {
    console.warn('No cobalt.config.{ts,js,mjs,json} found, using defaults')
    return DEFAULT_CONFIG
  }

  try {
    // Use jiti to load TypeScript/JavaScript files
    if (configPath.endsWith('.json')) {
      const { readFileSync } = await import('node:fs')
      const configContent = readFileSync(configPath, 'utf-8')
      const config = JSON.parse(configContent)
      return defu(config, DEFAULT_CONFIG) as CobaltConfig
    } else {
      const jiti = createJiti(import.meta.url, {
        interopDefault: true
      })
      const configModule = jiti(configPath)
      const config = configModule.default || configModule
      return defu(config, DEFAULT_CONFIG) as CobaltConfig
    }
  } catch (error) {
    console.error(`Failed to load config from ${configPath}:`, error)
    console.warn('Using default configuration')
    return DEFAULT_CONFIG
  }
}

/**
 * Get API key for LLM provider
 * @param config - Cobalt configuration
 * @returns API key or throws error if not found
 */
export function getApiKey(config: CobaltConfig): string {
  const apiKey = config.judge.apiKey ||
                 (config.judge.provider === 'openai' ? process.env.OPENAI_API_KEY : process.env.ANTHROPIC_API_KEY)

  if (!apiKey) {
    throw new Error(
      `API key for ${config.judge.provider} not found. ` +
      `Set ${config.judge.provider === 'openai' ? 'OPENAI_API_KEY' : 'ANTHROPIC_API_KEY'} ` +
      `environment variable or configure it in cobalt.config.ts`
    )
  }

  return apiKey
}
