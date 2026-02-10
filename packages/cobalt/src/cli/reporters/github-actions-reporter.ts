import { appendFileSync, existsSync } from 'node:fs';
import type { ProgressInfo } from '../../core/runner.js';
import type { CIResult, ExperimentReport } from '../../types/index.js';
import { formatCost } from '../../utils/cost.js';
import { BaseReporter, type ExperimentStartInfo } from './base-reporter.js';

/**
 * GitHub Actions reporter for CI/CD output with annotations and step summary
 */
export class GitHubActionsReporter extends BaseReporter {
	private summaryContent: string[] = [];
	private isGitHubActions = process.env.GITHUB_ACTIONS === 'true';
	private summaryFile = process.env.GITHUB_STEP_SUMMARY;

	onStart(info: ExperimentStartInfo): void {
		if (!this.isGitHubActions) return;

		// Add to step summary
		this.summaryContent.push('## 🔷 Cobalt Experiment\n');
		this.summaryContent.push(`**Experiment:** ${info.name}\n`);
		this.summaryContent.push(`**Dataset:** ${info.datasetSize} items\n`);
		this.summaryContent.push(`**Evaluators:** ${info.evaluators.join(', ')}\n`);
		this.summaryContent.push(
			`**Config:** Concurrency ${info.concurrency} | Timeout ${info.timeout}ms | Runs ${info.runs}\n`,
		);
		this.summaryContent.push('\n');

		console.log(`::group::Cobalt Experiment: ${info.name}`);
	}

	onProgress(info: ProgressInfo): void {
		// GitHub Actions doesn't need frequent progress updates
		if (info.completedExecutions === info.totalExecutions) {
			console.log(
				`::notice::Completed ${info.totalExecutions} executions (${info.totalItems} items × ${info.totalRuns} runs)`,
			);
		}
	}

	onCIStatus(ciStatus: CIResult): void {
		if (!this.isGitHubActions) return;

		// Add CI status to summary
		this.summaryContent.push(`### CI Status: ${ciStatus.passed ? '✅ PASSED' : '❌ FAILED'}\n\n`);

		if (!ciStatus.passed) {
			// Output violations as errors
			for (const violation of ciStatus.violations) {
				console.log(
					`::error title=Threshold Violation::${violation.evaluator}: ${violation.message}`,
				);
			}

			// Add violations table to summary
			this.summaryContent.push('**Threshold Violations:**\n\n');
			this.summaryContent.push('| Evaluator | Metric | Threshold | Actual |\n');
			this.summaryContent.push('|-----------|--------|-----------|--------|\n');

			for (const violation of ciStatus.violations) {
				this.summaryContent.push(
					`| ${violation.evaluator} | ${violation.threshold} | ${violation.expected} | ${violation.actual} |\n`,
				);
			}
			this.summaryContent.push('\n');
		} else {
			console.log('::notice title=CI Validation::All thresholds passed ✓');
		}
	}

	onComplete(report: ExperimentReport, resultPath: string): void {
		if (!this.isGitHubActions) return;

		const { summary } = report;

		// Close the group started in onStart
		console.log('::endgroup::');

		// Summary statistics
		this.summaryContent.push('### 📊 Results\n\n');
		this.summaryContent.push(`- **Duration:** ${(summary.totalDurationMs / 1000).toFixed(2)}s\n`);
		this.summaryContent.push(`- **Average Latency:** ${summary.avgLatencyMs.toFixed(0)}ms\n`);

		if (summary.estimatedCost !== undefined) {
			this.summaryContent.push(`- **Estimated Cost:** ${formatCost(summary.estimatedCost)}\n`);
		}

		if (summary.totalTokens !== undefined) {
			this.summaryContent.push(`- **Total Tokens:** ${summary.totalTokens.toLocaleString()}\n`);
		}

		this.summaryContent.push('\n');

		// Scores table
		this.summaryContent.push('### Scores\n\n');
		this.summaryContent.push('| Evaluator | Avg | Min | Max | P50 | P95 |\n');
		this.summaryContent.push('|-----------|-----|-----|-----|-----|-----|\n');

		for (const [evaluator, stats] of Object.entries(summary.scores)) {
			this.summaryContent.push(
				`| ${evaluator} | ${stats.avg.toFixed(2)} | ${stats.min.toFixed(2)} | ${stats.max.toFixed(2)} | ${stats.p50.toFixed(2)} | ${stats.p95.toFixed(2)} |\n`,
			);

			// Warn about low scores
			if (stats.avg < 0.5) {
				console.log(
					`::warning title=Low Score::${evaluator} average score is ${stats.avg.toFixed(2)} (below 0.5)`,
				);
			}
		}

		this.summaryContent.push('\n');

		// Warnings section
		const lowScoreItems = report.items.filter((r) =>
			Object.values(r.evaluations).some((e) => e.score < 0.5),
		);

		if (lowScoreItems.length > 0) {
			this.summaryContent.push(`⚠️ ${lowScoreItems.length} item(s) scored below 0.5\n\n`);
			console.log(`::warning title=Low Scores::${lowScoreItems.length} items scored below 0.5`);
		}

		// Errors section
		const errorItems = report.items.filter((r) => r.error);
		if (errorItems.length > 0) {
			this.summaryContent.push(`❌ ${errorItems.length} item(s) had errors\n\n`);

			for (const item of errorItems.slice(0, 5)) {
				// Limit to first 5 errors
				console.log(`::error title=Execution Error::Item ${item.index}: ${item.error}`);
			}

			if (errorItems.length > 5) {
				console.log(`::warning::${errorItems.length - 5} more errors (see full report)`);
			}
		}

		// Result file
		this.summaryContent.push(`**Results:** \`${resultPath}\`\n\n`);
		this.summaryContent.push(`**Run ID:** \`${report.id}\`\n\n`);

		// Footer
		this.summaryContent.push('---\n\n');
		this.summaryContent.push('🤖 Generated with [Cobalt](https://github.com/basalt-ai/cobalt)\n');

		// Write to GITHUB_STEP_SUMMARY if available
		if (this.summaryFile && existsSync(this.summaryFile)) {
			try {
				appendFileSync(this.summaryFile, this.summaryContent.join(''));
			} catch (error) {
				console.log('::warning::Failed to write step summary:', error);
			}
		}
	}

	onError(error: Error, context?: string): void {
		if (!this.isGitHubActions) return;

		const title = context || 'Experiment Error';
		console.log(`::error title=${title}::${error.message}`);

		// Add to summary
		this.summaryContent.push('### ❌ Error\n\n');
		if (context) {
			this.summaryContent.push(`**Context:** ${context}\n\n`);
		}
		this.summaryContent.push(`\`\`\`\n${error.message}\n\`\`\`\n\n`);

		if (this.summaryFile && existsSync(this.summaryFile)) {
			try {
				appendFileSync(this.summaryFile, this.summaryContent.join(''));
			} catch (err) {
				// Ignore if we can't write summary
			}
		}
	}
}
