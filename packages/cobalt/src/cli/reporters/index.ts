export { BaseReporter, type Reporter, type ExperimentStartInfo } from './base-reporter.js';
export { CLIReporter } from './cli-reporter.js';
export { JSONReporter } from './json-reporter.js';
export { GitHubActionsReporter } from './github-actions-reporter.js';

import type { Reporter } from './base-reporter.js';
import { CLIReporter } from './cli-reporter.js';
import { GitHubActionsReporter } from './github-actions-reporter.js';
import { JSONReporter } from './json-reporter.js';

export type ReporterType = 'cli' | 'json' | 'github-actions';

/**
 * Create reporters from configuration
 * @param types - Array of reporter types to create
 * @returns Array of reporter instances
 */
export function createReporters(types: ReporterType[] = ['cli']): Reporter[] {
	return types.map((type) => {
		switch (type) {
			case 'cli':
				return new CLIReporter();
			case 'json':
				return new JSONReporter();
			case 'github-actions':
				return new GitHubActionsReporter();
			default:
				throw new Error(`Unknown reporter type: ${type}`);
		}
	});
}
