import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { registry as globalRegistry } from '../../../src/core/EvaluatorRegistry.js';
import {
	loadPlugin,
	loadPlugins,
	registerPluginEvaluators,
} from '../../../src/core/plugin-loader.js';
import type { EvaluatorPlugin, PluginDefinition } from '../../../src/core/plugin.js';
import type { EvaluatorHandler } from '../../../src/core/plugin.js';

describe('Plugin Loader', () => {
	let testDir: string;
	const originalList = globalRegistry.list();

	beforeEach(() => {
		// Create temporary directory for test plugins
		testDir = join(tmpdir(), `cobalt-test-${Date.now()}`);
		mkdirSync(testDir, { recursive: true });

		// Clear global registry
		globalRegistry.clear();
	});

	afterEach(() => {
		// Clean up test directory
		try {
			rmSync(testDir, { recursive: true, force: true });
		} catch (error) {
			// Ignore cleanup errors
		}

		// Restore original registry state
		globalRegistry.clear();
	});

	describe('loadPlugin()', () => {
		it('should load a valid plugin from file', async () => {
			const pluginContent = `
        export default {
          name: 'test-plugin',
          version: '1.0.0',
          evaluators: [
            {
              type: 'custom-eval',
              name: 'Custom Evaluator',
              evaluate: async () => ({ score: 1, reason: 'test' })
            }
          ]
        }
      `;

			const pluginPath = join(testDir, 'test-plugin.ts');
			writeFileSync(pluginPath, pluginContent);

			const plugin = await loadPlugin(pluginPath);

			expect(plugin.name).toBe('test-plugin');
			expect(plugin.version).toBe('1.0.0');
			expect(plugin.evaluators).toHaveLength(1);
			expect(plugin.evaluators[0].type).toBe('custom-eval');
		});

		it('should load plugin with multiple evaluators', async () => {
			const pluginContent = `
        export default {
          name: 'multi-eval-plugin',
          version: '2.0.0',
          evaluators: [
            {
              type: 'eval-1',
              name: 'First Eval',
              evaluate: async () => ({ score: 0.8 })
            },
            {
              type: 'eval-2',
              name: 'Second Eval',
              evaluate: async () => ({ score: 0.9 })
            },
            {
              type: 'eval-3',
              name: 'Third Eval',
              evaluate: async () => ({ score: 0.7 })
            }
          ]
        }
      `;

			const pluginPath = join(testDir, 'multi.ts');
			writeFileSync(pluginPath, pluginContent);

			const plugin = await loadPlugin(pluginPath);

			expect(plugin.evaluators).toHaveLength(3);
			expect(plugin.evaluators.map((e) => e.type)).toEqual(['eval-1', 'eval-2', 'eval-3']);
		});

		it('should load plugin from JavaScript file', async () => {
			const pluginContent = `
        module.exports = {
          name: 'js-plugin',
          version: '1.0.0',
          evaluators: [{
            type: 'js-eval',
            name: 'JS Eval',
            evaluate: async () => ({ score: 0.5, reason: 'js' })
          }]
        }
      `;

			const pluginPath = join(testDir, 'js-plugin.js');
			writeFileSync(pluginPath, pluginContent);

			const plugin = await loadPlugin(pluginPath);

			expect(plugin.name).toBe('js-plugin');
			expect(plugin.evaluators[0].type).toBe('js-eval');
		});

		it('should throw error for nonexistent file', async () => {
			const nonexistentPath = join(testDir, 'does-not-exist.ts');

			await expect(loadPlugin(nonexistentPath)).rejects.toThrow('Plugin file not found');
		});

		it('should throw error for invalid plugin structure', async () => {
			const invalidContent = `
        export default {
          name: 'invalid-plugin'
          // Missing version and evaluators
        }
      `;

			const pluginPath = join(testDir, 'invalid.ts');
			writeFileSync(pluginPath, invalidContent);

			await expect(loadPlugin(pluginPath)).rejects.toThrow();
		});

		it('should throw error for plugin without name', async () => {
			const pluginContent = `
        export default {
          version: '1.0.0',
          evaluators: []
        }
      `;

			const pluginPath = join(testDir, 'no-name.ts');
			writeFileSync(pluginPath, pluginContent);

			await expect(loadPlugin(pluginPath)).rejects.toThrow('must have a non-empty name');
		});

		it('should throw error for plugin without version', async () => {
			const pluginContent = `
        export default {
          name: 'no-version',
          evaluators: []
        }
      `;

			const pluginPath = join(testDir, 'no-version.ts');
			writeFileSync(pluginPath, pluginContent);

			await expect(loadPlugin(pluginPath)).rejects.toThrow('must have a version string');
		});

		it('should throw error for plugin without evaluators array', async () => {
			const pluginContent = `
        export default {
          name: 'no-evals',
          version: '1.0.0'
        }
      `;

			const pluginPath = join(testDir, 'no-evals.ts');
			writeFileSync(pluginPath, pluginContent);

			await expect(loadPlugin(pluginPath)).rejects.toThrow('must have an evaluators array');
		});

		it('should throw error for evaluator without type', async () => {
			const pluginContent = `
        export default {
          name: 'bad-eval',
          version: '1.0.0',
          evaluators: [{
            name: 'No Type',
            evaluate: async () => ({ score: 1 })
          }]
        }
      `;

			const pluginPath = join(testDir, 'bad-eval.ts');
			writeFileSync(pluginPath, pluginContent);

			await expect(loadPlugin(pluginPath)).rejects.toThrow('must have a non-empty type');
		});

		it('should throw error for evaluator without evaluate function', async () => {
			const pluginContent = `
        export default {
          name: 'no-fn',
          version: '1.0.0',
          evaluators: [{
            type: 'broken',
            name: 'Broken Eval'
            // Missing evaluate function
          }]
        }
      `;

			const pluginPath = join(testDir, 'no-fn.ts');
			writeFileSync(pluginPath, pluginContent);

			await expect(loadPlugin(pluginPath)).rejects.toThrow('must have an evaluate function');
		});

		it('should resolve relative paths correctly', async () => {
			const pluginContent = `
        export default {
          name: 'relative-test',
          version: '1.0.0',
          evaluators: [{
            type: 'rel-eval',
            name: 'Relative',
            evaluate: async () => ({ score: 1 })
          }]
        }
      `;

			const pluginPath = join(testDir, 'relative.ts');
			writeFileSync(pluginPath, pluginContent);

			// Load with relative path
			const plugin = await loadPlugin('relative.ts', testDir);

			expect(plugin.name).toBe('relative-test');
		});
	});

	describe('loadPlugins()', () => {
		it('should load multiple plugins', async () => {
			const plugin1 = `
        export default {
          name: 'plugin-1',
          version: '1.0.0',
          evaluators: [{
            type: 'eval-1',
            name: 'Eval 1',
            evaluate: async () => ({ score: 1 })
          }]
        }
      `;

			const plugin2 = `
        export default {
          name: 'plugin-2',
          version: '1.0.0',
          evaluators: [{
            type: 'eval-2',
            name: 'Eval 2',
            evaluate: async () => ({ score: 0.5 })
          }]
        }
      `;

			const path1 = join(testDir, 'plugin1.ts');
			const path2 = join(testDir, 'plugin2.ts');

			writeFileSync(path1, plugin1);
			writeFileSync(path2, plugin2);

			const plugins = await loadPlugins([path1, path2]);

			expect(plugins).toHaveLength(2);
			expect(plugins[0].name).toBe('plugin-1');
			expect(plugins[1].name).toBe('plugin-2');
		});

		it('should automatically register evaluators from loaded plugins', async () => {
			const pluginContent = `
        export default {
          name: 'auto-register',
          version: '1.0.0',
          evaluators: [{
            type: 'auto-eval',
            name: 'Auto Eval',
            evaluate: async () => ({ score: 0.9, reason: 'auto' })
          }]
        }
      `;

			const pluginPath = join(testDir, 'auto.ts');
			writeFileSync(pluginPath, pluginContent);

			await loadPlugins([pluginPath]);

			expect(globalRegistry.has('auto-eval')).toBe(true);
		});

		it('should continue loading after one plugin fails', async () => {
			const validPlugin = `
        export default {
          name: 'valid',
          version: '1.0.0',
          evaluators: [{
            type: 'valid-eval',
            name: 'Valid',
            evaluate: async () => ({ score: 1 })
          }]
        }
      `;

			const invalidPlugin = `
        export default {
          name: 'invalid'
          // Missing required fields
        }
      `;

			const validPath = join(testDir, 'valid.ts');
			const invalidPath = join(testDir, 'invalid.ts');

			writeFileSync(validPath, validPlugin);
			writeFileSync(invalidPath, invalidPlugin);

			const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
			const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

			const plugins = await loadPlugins([invalidPath, validPath]);

			expect(plugins).toHaveLength(1);
			expect(plugins[0].name).toBe('valid');
			expect(consoleErrorSpy).toHaveBeenCalled();
			expect(consoleWarnSpy).toHaveBeenCalledWith(expect.stringContaining('Skipping plugin'));

			consoleErrorSpy.mockRestore();
			consoleWarnSpy.mockRestore();
		});

		it('should return empty array for empty plugin list', async () => {
			const plugins = await loadPlugins([]);
			expect(plugins).toEqual([]);
		});

		it('should handle nonexistent files gracefully', async () => {
			const nonexistentPath = join(testDir, 'ghost.ts');

			const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
			const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

			const plugins = await loadPlugins([nonexistentPath]);

			expect(plugins).toEqual([]);
			expect(consoleErrorSpy).toHaveBeenCalled();

			consoleErrorSpy.mockRestore();
			consoleWarnSpy.mockRestore();
		});
	});

	describe('registerPluginEvaluators()', () => {
		it('should register all evaluators from plugin', () => {
			const plugin: PluginDefinition = {
				name: 'register-test',
				version: '1.0.0',
				evaluators: [
					{
						type: 'reg-eval-1',
						name: 'First',
						evaluate: async () => ({ score: 1 }),
					},
					{
						type: 'reg-eval-2',
						name: 'Second',
						evaluate: async () => ({ score: 0.5 }),
					},
				],
			};

			registerPluginEvaluators(plugin);

			expect(globalRegistry.has('reg-eval-1')).toBe(true);
			expect(globalRegistry.has('reg-eval-2')).toBe(true);
		});

		it('should make evaluators callable after registration', async () => {
			const mockEvaluate: EvaluatorHandler = async (config, context) => ({
				score: 0.75,
				reason: `Context: ${context.output}`,
			});

			const plugin: PluginDefinition = {
				name: 'callable-test',
				version: '1.0.0',
				evaluators: [
					{
						type: 'callable-eval',
						name: 'Callable',
						evaluate: mockEvaluate,
					},
				],
			};

			registerPluginEvaluators(plugin);

			const handler = globalRegistry.get('callable-eval')!;
			const result = await handler({}, { item: {}, output: 'test output' });

			expect(result.score).toBe(0.75);
			expect(result.reason).toContain('Context: test output');
		});

		it('should handle plugin with no evaluators', () => {
			const plugin: PluginDefinition = {
				name: 'empty-plugin',
				version: '1.0.0',
				evaluators: [],
			};

			expect(() => registerPluginEvaluators(plugin)).not.toThrow();
		});
	});

	describe('Integration Tests', () => {
		it('should support end-to-end plugin workflow', async () => {
			const pluginContent = `
        export default {
          name: 'e2e-plugin',
          version: '1.0.0',
          evaluators: [{
            type: 'e2e-eval',
            name: 'End-to-End Evaluator',
            evaluate: async (config, context) => ({
              score: context.output === 'success' ? 1 : 0,
              reason: context.output === 'success' ? 'passed' : 'failed'
            })
          }]
        }
      `;

			const pluginPath = join(testDir, 'e2e.ts');
			writeFileSync(pluginPath, pluginContent);

			// Load plugin
			await loadPlugins([pluginPath]);

			// Verify registration
			expect(globalRegistry.has('e2e-eval')).toBe(true);

			// Use evaluator
			const handler = globalRegistry.get('e2e-eval')!;
			const successResult = await handler({}, { item: {}, output: 'success' });
			const failResult = await handler({}, { item: {}, output: 'fail' });

			expect(successResult.score).toBe(1);
			expect(failResult.score).toBe(0);
		});

		it('should allow plugins to access config and apiKey parameters', async () => {
			const pluginContent = `
        export default {
          name: 'config-plugin',
          version: '1.0.0',
          evaluators: [{
            type: 'config-eval',
            name: 'Config-Aware',
            evaluate: async (config, context, apiKey) => ({
              score: config.threshold || 0.5,
              reason: apiKey ? 'authenticated' : 'no auth'
            })
          }]
        }
      `;

			const pluginPath = join(testDir, 'config.ts');
			writeFileSync(pluginPath, pluginContent);

			await loadPlugins([pluginPath]);

			const handler = globalRegistry.get('config-eval')!;

			const resultWithConfig = await handler({ threshold: 0.9 }, { item: {}, output: '' });
			expect(resultWithConfig.score).toBe(0.9);

			const resultWithAuth = await handler({}, { item: {}, output: '' }, 'test-api-key');
			expect(resultWithAuth.reason).toBe('authenticated');
		});
	});
});
