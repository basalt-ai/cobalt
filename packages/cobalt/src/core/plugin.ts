/**
 * Plugin system for custom evaluators
 *
 * Allows users to extend Cobalt with custom evaluator types.
 */

import type { EvalContext, EvalResult } from '../types/index.js';

/**
 * Evaluator handler function signature
 */
export type EvaluatorHandler = (
	config: any,
	context: EvalContext,
	apiKey?: string,
	model?: string,
) => Promise<EvalResult>;

/**
 * Single evaluator plugin
 */
export interface EvaluatorPlugin {
	/** Unique type identifier for this evaluator (e.g., 'custom-sentiment') */
	type: string;

	/** Human-readable name */
	name: string;

	/** Evaluation handler function */
	evaluate: EvaluatorHandler;
}

/**
 * Plugin definition with metadata
 */
export interface PluginDefinition {
	/** Plugin name */
	name: string;

	/** Plugin version (semver) */
	version: string;

	/** List of evaluators provided by this plugin */
	evaluators: EvaluatorPlugin[];
}

/**
 * Validate a plugin definition
 *
 * @param plugin - Plugin definition to validate
 * @throws Error if plugin is invalid
 */
export function validatePlugin(plugin: any): asserts plugin is PluginDefinition {
	if (!plugin || typeof plugin !== 'object') {
		throw new Error('Plugin must be an object');
	}

	if (typeof plugin.name !== 'string' || plugin.name.trim() === '') {
		throw new Error('Plugin must have a non-empty name');
	}

	if (typeof plugin.version !== 'string') {
		throw new Error('Plugin must have a version string');
	}

	if (!Array.isArray(plugin.evaluators)) {
		throw new Error('Plugin must have an evaluators array');
	}

	for (const evaluator of plugin.evaluators) {
		if (!evaluator || typeof evaluator !== 'object') {
			throw new Error(`Invalid evaluator in plugin "${plugin.name}"`);
		}

		if (typeof evaluator.type !== 'string' || evaluator.type.trim() === '') {
			throw new Error(`Evaluator in plugin "${plugin.name}" must have a non-empty type`);
		}

		if (typeof evaluator.name !== 'string') {
			throw new Error(`Evaluator "${evaluator.type}" must have a name`);
		}

		if (typeof evaluator.evaluate !== 'function') {
			throw new Error(`Evaluator "${evaluator.type}" must have an evaluate function`);
		}
	}
}
