import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { defineConfig, getApiKey, loadConfig } from '../../../src/core/config.js';
import type { CobaltConfig } from '../../../src/types/index.js';

// Mock node:fs for existsSync
vi.mock('node:fs', () => ({
	existsSync: vi.fn().mockReturnValue(false),
	readFileSync: vi.fn(),
}));

// Mock jiti
vi.mock('jiti', () => ({
	createJiti: vi.fn().mockReturnValue(
		vi.fn().mockReturnValue({ default: {} }),
	),
}));

describe('defineConfig', () => {
	it('should return defaults when given empty object', () => {
		const config = defineConfig({});

		expect(config.testDir).toBe('./experiments');
		expect(config.concurrency).toBe(5);
		expect(config.timeout).toBe(30_000);
		expect(config.judge.model).toBe('gpt-4o-mini');
		expect(config.judge.provider).toBe('openai');
		expect(config.outputDir).toBe('.cobalt');
		expect(config.cache.enabled).toBe(true);
		expect(config.cache.ttl).toBe('7d');
	});

	it('should merge partial config with defaults', () => {
		const config = defineConfig({
			concurrency: 10,
			timeout: 60_000,
		});

		expect(config.concurrency).toBe(10);
		expect(config.timeout).toBe(60_000);
		// Defaults preserved
		expect(config.testDir).toBe('./experiments');
		expect(config.judge.model).toBe('gpt-4o-mini');
	});

	it('should override nested config fields', () => {
		const config = defineConfig({
			judge: {
				model: 'claude-sonnet-4-5-20250929',
				provider: 'anthropic',
			},
		});

		expect(config.judge.model).toBe('claude-sonnet-4-5-20250929');
		expect(config.judge.provider).toBe('anthropic');
	});

	it('should merge reporters with defaults (defu array merge)', () => {
		const config = defineConfig({
			reporters: ['github-actions'],
		});

		// defu merges arrays, so custom reporters are added to defaults
		expect(config.reporters).toContain('github-actions');
		expect(config.reporters).toContain('cli');
	});

	it('should support plugins array', () => {
		const config = defineConfig({
			plugins: ['./my-plugin.ts'],
		});

		expect(config.plugins).toEqual(['./my-plugin.ts']);
	});
});

describe('loadConfig', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('should return defaults when no config file found', async () => {
		const { existsSync } = await import('node:fs');
		vi.mocked(existsSync).mockReturnValue(false);

		const config = await loadConfig('/tmp/no-config');

		expect(config.testDir).toBe('./experiments');
		expect(config.concurrency).toBe(5);
	});

	it('should find and load JSON config', async () => {
		const { existsSync, readFileSync } = await import('node:fs');
		vi.mocked(existsSync).mockImplementation((path) => {
			return String(path).endsWith('cobalt.config.json');
		});
		vi.mocked(readFileSync).mockReturnValue(
			JSON.stringify({ concurrency: 20, testDir: './tests' }),
		);

		const config = await loadConfig('/tmp/test-project');

		expect(config.concurrency).toBe(20);
		expect(config.testDir).toBe('./tests');
		// Defaults preserved
		expect(config.timeout).toBe(30_000);
	});

	it('should handle invalid JSON config gracefully', async () => {
		const { existsSync, readFileSync } = await import('node:fs');
		vi.mocked(existsSync).mockImplementation((path) => {
			return String(path).endsWith('cobalt.config.json');
		});
		vi.mocked(readFileSync).mockReturnValue('{ invalid json }');

		const config = await loadConfig('/tmp/bad-json');

		// Falls back to defaults
		expect(config.testDir).toBe('./experiments');
		expect(config.concurrency).toBe(5);
	});

	it('should load TypeScript config via jiti', async () => {
		const { existsSync } = await import('node:fs');
		const { createJiti } = await import('jiti');

		vi.mocked(existsSync).mockImplementation((path) => {
			return String(path).endsWith('cobalt.config.ts');
		});

		const mockJiti = vi.fn().mockReturnValue({
			default: { concurrency: 15 },
		});
		vi.mocked(createJiti).mockReturnValue(mockJiti as any);

		const config = await loadConfig('/tmp/ts-config');

		expect(config.concurrency).toBe(15);
	});

	it('should handle jiti load errors gracefully', async () => {
		const { existsSync } = await import('node:fs');
		const { createJiti } = await import('jiti');

		vi.mocked(existsSync).mockImplementation((path) => {
			return String(path).endsWith('cobalt.config.ts');
		});

		const mockJiti = vi.fn().mockImplementation(() => {
			throw new Error('Syntax error in config');
		});
		vi.mocked(createJiti).mockReturnValue(mockJiti as any);

		const config = await loadConfig('/tmp/broken-ts');

		// Falls back to defaults
		expect(config.testDir).toBe('./experiments');
	});
});

describe('getApiKey', () => {
	const originalEnv = process.env;

	beforeEach(() => {
		vi.clearAllMocks();
		process.env = { ...originalEnv };
		delete process.env.OPENAI_API_KEY;
		delete process.env.ANTHROPIC_API_KEY;
	});

	afterEach(() => {
		process.env = originalEnv;
	});

	it('should return key from config', () => {
		const config = defineConfig({
			judge: { model: 'gpt-4o', provider: 'openai', apiKey: 'sk-config-key' },
		});

		expect(getApiKey(config)).toBe('sk-config-key');
	});

	it('should fall back to OPENAI_API_KEY env var for openai provider', () => {
		process.env.OPENAI_API_KEY = 'sk-env-key';
		const config = defineConfig({
			judge: { model: 'gpt-4o', provider: 'openai' },
		});

		expect(getApiKey(config)).toBe('sk-env-key');
	});

	it('should fall back to ANTHROPIC_API_KEY for anthropic provider', () => {
		process.env.ANTHROPIC_API_KEY = 'ant-env-key';
		const config = defineConfig({
			judge: { model: 'claude-sonnet-4-5-20250929', provider: 'anthropic' },
		});

		expect(getApiKey(config)).toBe('ant-env-key');
	});

	it('should throw when no key available', () => {
		const config = defineConfig({
			judge: { model: 'gpt-4o', provider: 'openai' },
		});

		expect(() => getApiKey(config)).toThrow('API key for openai not found');
	});

	it('should throw with provider-specific env var hint', () => {
		const config = defineConfig({
			judge: { model: 'claude-sonnet-4-5-20250929', provider: 'anthropic' },
		});

		expect(() => getApiKey(config)).toThrow('ANTHROPIC_API_KEY');
	});

	it('should prefer config key over env var', () => {
		process.env.OPENAI_API_KEY = 'sk-env-key';
		const config = defineConfig({
			judge: { model: 'gpt-4o', provider: 'openai', apiKey: 'sk-config-key' },
		});

		expect(getApiKey(config)).toBe('sk-config-key');
	});
});
