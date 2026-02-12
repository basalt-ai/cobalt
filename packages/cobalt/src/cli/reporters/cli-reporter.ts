import pc from 'picocolors';
import type { ProgressInfo } from '../../core/runner.js';
import type { CIResult, ExperimentReport } from '../../types/index.js';
import { formatCost } from '../../utils/cost.js';
import { BaseReporter, type ExperimentStartInfo } from './base-reporter.js';

/**
 * CLI reporter for terminal output — pytest-inspired compact format
 */
export class CLIReporter extends BaseReporter {
	private experimentName = '';

	onStart(info: ExperimentStartInfo): void {
		this.experimentName = info.name;
		console.log(
			`\n  ${pc.bold(info.name)} ${pc.dim(`(${info.datasetSize} items, ${info.evaluators.length} evaluators)`)}`,
		);
		if (info.tags && info.tags.length > 0) {
			console.log(`  ${pc.dim(`Tags: ${info.tags.join(', ')}`)}`);
		}
		console.log('');
	}

	onProgress(info: ProgressInfo): void {
		if (!info.itemResult) return;

		const result = info.itemResult;
		const evals = Object.entries(result.evaluations);
		const hasFailure = evals.some(([, e]) => e.score < 0.5) || !!result.error;

		const icon = result.error ? pc.red('  ✗') : hasFailure ? pc.yellow('  ✗') : pc.green('  ✓');
		const label = `Item #${result.index + 1}`;
		const latency = pc.dim(`[${result.latencyMs.toFixed(0)}ms]`);

		if (result.error) {
			console.log(`${icon} ${label} ${pc.red('ERROR')} ${latency}`);
		} else {
			const scores = evals.map(([name, e]) => {
				const val = e.score.toFixed(2);
				return e.score < 0.5 ? pc.red(`${name}: ${val}`) : `${name}: ${val}`;
			});
			console.log(`${icon} ${label} — ${scores.join(', ')} ${latency}`);
		}
	}

	onCIStatus(ciStatus: CIResult): void {
		if (ciStatus.passed) {
			console.log(pc.green('\n  CI: PASSED'));
		} else {
			console.log(pc.red('\n  CI: FAILED'));
			for (const violation of ciStatus.violations) {
				console.log(pc.red(`    ✗ ${violation.message}`));
			}
		}
	}

	onComplete(report: ExperimentReport): void {
		const { summary } = report;

		// Failure details
		const failedItems = report.items.filter(
			(r) => r.error || Object.values(r.evaluations).some((e) => e.score < 0.5),
		);
		if (failedItems.length > 0) {
			console.log('');
			for (const item of failedItems) {
				if (item.error) {
					console.log(pc.red(`  ✗ Item #${item.index + 1} error: ${item.error}`));
				} else {
					const lowEvals = Object.entries(item.evaluations).filter(([, e]) => e.score < 0.5);
					for (const [name, e] of lowEvals) {
						console.log(
							pc.red(`  ✗ Item #${item.index + 1} ${name}: ${e.score.toFixed(2)}`) +
								(e.reason ? pc.dim(` — ${e.reason}`) : ''),
						);
					}
				}
			}
		}

		// Summary table
		const evaluatorNames = Object.keys(summary.scores);
		if (evaluatorNames.length > 0) {
			this.printScoreTable(summary.scores);
		}

		// Footer
		const passed = report.items.length - failedItems.length;
		const parts: string[] = [];
		if (passed > 0) parts.push(pc.green(`${passed} passed`));
		if (failedItems.length > 0) parts.push(pc.red(`${failedItems.length} failed`));
		parts.push(`${(summary.totalDurationMs / 1000).toFixed(2)}s`);
		if (summary.estimatedCost !== undefined) {
			parts.push(formatCost(summary.estimatedCost));
		}

		console.log(`\n  ${parts.join(pc.dim(' | '))}\n`);
	}

	onError(error: Error, context?: string): void {
		if (context) {
			console.error(pc.red(`\n  ✗ ${context}:`), error.message);
		} else {
			console.error(pc.red('\n  ✗ Error:'), error.message);
		}
	}

	private printScoreTable(
		scores: Record<string, { avg: number; min: number; max: number; p50: number; p95: number }>,
	): void {
		const names = Object.keys(scores);
		const nameWidth = Math.max(9, ...names.map((n) => n.length));
		const colWidth = 7;

		const pad = (s: string, w: number) => s.padStart(w);
		const padName = (s: string) => s.padEnd(nameWidth);

		const topBorder = `  ┌${'─'.repeat(nameWidth + 2)}┬${(`${'─'.repeat(colWidth)}┬`).repeat(3)}${'─'.repeat(colWidth)}┐`;
		const headerSep = `  ├${'─'.repeat(nameWidth + 2)}┼${(`${'─'.repeat(colWidth)}┼`).repeat(3)}${'─'.repeat(colWidth)}┤`;
		const bottomBorder = `  └${'─'.repeat(nameWidth + 2)}┴${(`${'─'.repeat(colWidth)}┴`).repeat(3)}${'─'.repeat(colWidth)}┘`;

		console.log(`\n${topBorder}`);
		console.log(
			`  │ ${pc.bold(padName('Evaluator'))} │${pad('Avg', colWidth)}│${pad('Min', colWidth)}│${pad('Max', colWidth)}│${pad('P95', colWidth)}│`,
		);
		console.log(headerSep);

		for (const [name, stats] of Object.entries(scores)) {
			const avg = pad(stats.avg.toFixed(2), colWidth);
			const min = pad(stats.min.toFixed(2), colWidth);
			const max = pad(stats.max.toFixed(2), colWidth);
			const p95 = pad(stats.p95.toFixed(2), colWidth);
			console.log(`  │ ${padName(name)} │${avg}│${min}│${max}│${p95}│`);
		}

		console.log(bottomBorder);
	}
}
