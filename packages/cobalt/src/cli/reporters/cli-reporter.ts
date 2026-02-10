import pc from 'picocolors';
import type { ProgressInfo } from '../../core/runner.js';
import type { CIResult, ExperimentReport } from '../../types/index.js';
import { formatCost } from '../../utils/cost.js';
import { BaseReporter, type ExperimentStartInfo } from './base-reporter.js';

/**
 * CLI reporter for terminal output with colors
 */
export class CLIReporter extends BaseReporter {
	private lastProgressLog = 0;

	onStart(info: ExperimentStartInfo): void {
		console.log(`\nRunning experiment: ${info.name}`);
		console.log(`Dataset: ${info.datasetSize} items`);
		console.log(`Evaluators: ${info.evaluators.join(', ')}`);
		console.log(`Concurrency: ${info.concurrency} | Timeout: ${info.timeout}ms\n`);
	}

	onProgress(info: ProgressInfo): void {
		const now = Date.now();
		if (now - this.lastProgressLog > 1000 || info.completedExecutions === info.totalExecutions) {
			if (info.totalRuns > 1) {
				// Hybrid progress for multiple runs
				console.log(
					`Progress: ${info.completedExecutions}/${info.totalExecutions} completed | ` +
						`Item ${info.itemIndex + 1}/${info.totalItems} (run ${info.runIndex + 1}/${info.totalRuns})`,
				);
			} else {
				// Simple progress for single run
				console.log(
					`Progress: ${info.completedExecutions}/${info.totalExecutions} items completed`,
				);
			}
			this.lastProgressLog = now;
		}
	}

	onCIStatus(ciStatus: CIResult): void {
		console.log(`\nCI Status: ${ciStatus.passed ? 'PASSED ✓' : 'FAILED ✗'}`);
		if (!ciStatus.passed) {
			console.error('Threshold violations:');
			for (const violation of ciStatus.violations) {
				console.error(`  ✗ ${violation.message}`);
			}
		}
	}

	onComplete(report: ExperimentReport, resultPath: string): void {
		const { summary } = report;

		console.log(`\nExperiment completed in ${(summary.totalDurationMs / 1000).toFixed(2)}s`);
		console.log(`Average latency: ${summary.avgLatencyMs.toFixed(0)}ms`);

		// Display cost if available
		if (summary.estimatedCost !== undefined) {
			console.log(`Estimated cost: ${formatCost(summary.estimatedCost)}`);
		}

		// Display summary scores
		console.log('\nScores:');
		for (const [evaluator, stats] of Object.entries(summary.scores)) {
			console.log(
				`  ${evaluator}: avg=${stats.avg.toFixed(2)} min=${stats.min.toFixed(2)} ` +
					`max=${stats.max.toFixed(2)} p50=${stats.p50.toFixed(2)} p95=${stats.p95.toFixed(2)}`,
			);
		}

		// Warn about low scores
		const lowScoreItems = report.items.filter((r) =>
			Object.values(r.evaluations).some((e) => e.score < 0.5),
		);
		if (lowScoreItems.length > 0) {
			console.warn(`\n⚠ ${lowScoreItems.length} item(s) scored below 0.5`);
		}

		// Warn about errors
		const errorItems = report.items.filter((r) => r.error);
		if (errorItems.length > 0) {
			console.error(`\n❌ ${errorItems.length} item(s) had errors`);
		}

		console.log(`\nResults saved to: ${resultPath}`);
		console.log(`Run ID: ${report.id}`);
	}

	onError(error: Error, context?: string): void {
		if (context) {
			console.error(pc.red(`\n❌ ${context}:`), error.message);
		} else {
			console.error(pc.red('\n❌ Error:'), error.message);
		}
	}
}
