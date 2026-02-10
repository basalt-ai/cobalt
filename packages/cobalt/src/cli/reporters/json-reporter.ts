import type { ProgressInfo } from '../../core/runner.js';
import type { CIResult, ExperimentReport } from '../../types/index.js';
import { BaseReporter, type ExperimentStartInfo } from './base-reporter.js';

/**
 * JSON reporter for structured output
 */
export class JSONReporter extends BaseReporter {
	onStart(info: ExperimentStartInfo): void {
		console.log(
			JSON.stringify({
				type: 'experiment_start',
				timestamp: new Date().toISOString(),
				data: info,
			}),
		);
	}

	onProgress(info: ProgressInfo): void {
		console.log(
			JSON.stringify({
				type: 'progress',
				timestamp: new Date().toISOString(),
				data: {
					completedExecutions: info.completedExecutions,
					totalExecutions: info.totalExecutions,
					progress: info.completedExecutions / info.totalExecutions,
					currentItem: info.itemIndex + 1,
					totalItems: info.totalItems,
					currentRun: info.runIndex + 1,
					totalRuns: info.totalRuns,
				},
			}),
		);
	}

	onCIStatus(ciStatus: CIResult): void {
		console.log(
			JSON.stringify({
				type: 'ci_status',
				timestamp: new Date().toISOString(),
				data: ciStatus,
			}),
		);
	}

	onComplete(report: ExperimentReport, resultPath: string): void {
		console.log(
			JSON.stringify({
				type: 'experiment_complete',
				timestamp: new Date().toISOString(),
				data: {
					report,
					resultPath,
				},
			}),
		);
	}

	onError(error: Error, context?: string): void {
		console.error(
			JSON.stringify({
				type: 'error',
				timestamp: new Date().toISOString(),
				data: {
					message: error.message,
					context,
					stack: error.stack,
				},
			}),
		);
	}
}
