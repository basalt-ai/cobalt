import type { ProgressInfo } from '../../core/runner.js';
import type { CIResult, ExperimentReport } from '../../types/index.js';

/**
 * Reporter interface for outputting experiment results
 */
export interface Reporter {
	/**
	 * Called when experiment starts
	 */
	onStart(info: ExperimentStartInfo): void;

	/**
	 * Called during experiment execution to report progress
	 */
	onProgress(info: ProgressInfo): void;

	/**
	 * Called when CI validation completes
	 */
	onCIStatus(ciStatus: CIResult): void;

	/**
	 * Called when experiment completes successfully
	 */
	onComplete(report: ExperimentReport, resultPath: string): void;

	/**
	 * Called when an error occurs
	 */
	onError(error: Error, context?: string): void;
}

/**
 * Information about experiment start
 */
export interface ExperimentStartInfo {
	name: string;
	datasetSize: number;
	evaluators: string[];
	concurrency: number;
	timeout: number;
	runs: number;
	tags: string[];
}

/**
 * Base reporter implementation with no-op methods
 */
export class BaseReporter implements Reporter {
	onStart(_info: ExperimentStartInfo): void {
		// No-op
	}

	onProgress(_info: ProgressInfo): void {
		// No-op
	}

	onCIStatus(_ciStatus: CIResult): void {
		// No-op
	}

	onComplete(_report: ExperimentReport, _resultPath: string): void {
		// No-op
	}

	onError(_error: Error, _context?: string): void {
		// No-op
	}
}
