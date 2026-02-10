/**
 * Plugin Loader
 *
 * Loads custom evaluator plugins from TypeScript/JavaScript files.
 */

import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { createJiti } from 'jiti';
import { registry } from './EvaluatorRegistry.js';
import type { PluginDefinition } from './plugin.js';
import { validatePlugin } from './plugin.js';

/**
 * Load a single plugin from a file path
 *
 * @param path - Path to plugin file (relative or absolute)
 * @param cwd - Current working directory (default: process.cwd())
 * @returns Loaded and validated plugin definition
 * @throws Error if plugin file not found or invalid
 */
export async function loadPlugin(
	path: string,
	cwd: string = process.cwd(),
): Promise<PluginDefinition> {
	// Resolve path relative to cwd
	const resolvedPath = resolve(cwd, path);

	if (!existsSync(resolvedPath)) {
		throw new Error(`Plugin file not found: ${path} (resolved to: ${resolvedPath})`);
	}

	try {
		// Use jiti to load TypeScript/JavaScript files
		const jiti = createJiti(import.meta.url, {
			interopDefault: true,
		});

		const pluginModule = jiti(resolvedPath);
		const plugin = pluginModule.default || pluginModule;

		// Validate plugin structure
		validatePlugin(plugin);

		console.log(`Loaded plugin "${plugin.name}" v${plugin.version} from ${path}`);
		console.log(
			`  Provides ${plugin.evaluators.length} evaluator(s): ${plugin.evaluators.map((e) => e.type).join(', ')}`,
		);

		return plugin;
	} catch (error) {
		throw new Error(
			`Failed to load plugin from ${path}: ${error instanceof Error ? error.message : String(error)}`,
		);
	}
}

/**
 * Load multiple plugins from file paths
 *
 * @param paths - Array of plugin file paths
 * @param cwd - Current working directory (default: process.cwd())
 * @returns Array of loaded plugin definitions
 */
export async function loadPlugins(
	paths: string[],
	cwd: string = process.cwd(),
): Promise<PluginDefinition[]> {
	const plugins: PluginDefinition[] = [];

	for (const path of paths) {
		try {
			const plugin = await loadPlugin(path, cwd);
			registerPluginEvaluators(plugin);
			plugins.push(plugin);
		} catch (error) {
			console.error(`Failed to load plugin from ${path}:`, error);
			console.warn(`Skipping plugin: ${path}`);
		}
	}

	return plugins;
}

/**
 * Register all evaluators from a plugin into the global registry
 *
 * @param plugin - Plugin definition with evaluators
 */
export function registerPluginEvaluators(plugin: PluginDefinition): void {
	for (const evaluator of plugin.evaluators) {
		registry.register(evaluator.type, evaluator.evaluate);
	}
}
