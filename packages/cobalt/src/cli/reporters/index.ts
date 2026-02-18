export { BaseReporter, type Reporter, type ExperimentStartInfo } from './base-reporter'
export { CLIReporter } from './cli-reporter'
export { JSONReporter } from './json-reporter'
export { GitHubActionsReporter } from './github-actions-reporter'

import type { Reporter } from './base-reporter'
import { CLIReporter } from './cli-reporter'
import { GitHubActionsReporter } from './github-actions-reporter'
import { JSONReporter } from './json-reporter'

export type ReporterType = 'cli' | 'json' | 'github-actions'

/**
 * Create reporters from configuration
 * @param types - Array of reporter types to create
 * @returns Array of reporter instances
 */
export function createReporters(types: ReporterType[] = ['cli']): Reporter[] {
	return types.map(type => {
		switch (type) {
			case 'cli':
				return new CLIReporter()
			case 'json':
				return new JSONReporter()
			case 'github-actions':
				return new GitHubActionsReporter()
			default:
				throw new Error(`Unknown reporter type: ${type}`)
		}
	})
}
