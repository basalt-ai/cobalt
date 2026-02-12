import pMap from 'p-map';
import type {
	ExperimentItem,
	ExperimentResult,
	ItemResult,
	RunnerFunction,
	SingleRun,
} from '../types/index.js';
import { calculateRunStats } from '../utils/stats.js';
import type { Evaluator } from './Evaluator.js';

export interface RunnerOptions {
	concurrency: number;
	timeout: number;
	evaluators: Evaluator[];
	apiKey?: string;
	model?: string;
	runs?: number; // Number of times to run each item (default: 1)
	onProgress?: (info: ProgressInfo) => void;
}

export interface ProgressInfo {
	itemIndex: number;
	runIndex: number;
	totalItems: number;
	totalRuns: number;
	completedExecutions: number;
	totalExecutions: number;
}

export interface RunItemOptions {
	item: ExperimentItem;
	index: number;
	runIndex: number;
	runner: RunnerFunction;
	evaluators: Evaluator[];
	timeout: number;
	apiKey?: string;
	model?: string;
}

/**
 * Run experiment on all items in parallel
 * @param items - Dataset items
 * @param runner - User's agent runner function
 * @param options - Runner options
 * @returns Array of item results
 */
export async function runExperiment(
	items: ExperimentItem[],
	runner: RunnerFunction,
	options: RunnerOptions,
): Promise<ItemResult[]> {
	const runs = options.runs || 1;

	// Fast path for single run (backward compatible)
	if (runs === 1) {
		let completedCount = 0;

		const results = await pMap(
			items,
			async (item, index) => {
				const singleRun = await runItem({
					item,
					index,
					runIndex: 0,
					runner,
					evaluators: options.evaluators,
					timeout: options.timeout,
					apiKey: options.apiKey,
					model: options.model,
				});

				completedCount++;
				if (options.onProgress) {
					options.onProgress({
						itemIndex: index,
						runIndex: 0,
						totalItems: items.length,
						totalRuns: 1,
						completedExecutions: completedCount,
						totalExecutions: items.length,
					});
				}

				// Convert SingleRun to ItemResult for backward compatibility
				return {
					index,
					input: item,
					output: singleRun.output,
					latencyMs: singleRun.latencyMs,
					evaluations: singleRun.evaluations,
					error: singleRun.error,
					runs: [singleRun],
				};
			},
			{ concurrency: options.concurrency },
		);

		return results;
	}

	// Multiple runs: sequential per item, parallel across items
	let totalCompletedExecutions = 0;
	const totalExecutions = items.length * runs;

	const results = await pMap(
		items,
		async (item, index) => {
			const runResults: SingleRun[] = [];

			// Execute N runs sequentially for this item
			for (let runIndex = 0; runIndex < runs; runIndex++) {
				const singleRun = await runItem({
					item,
					index,
					runIndex,
					runner,
					evaluators: options.evaluators,
					timeout: options.timeout,
					apiKey: options.apiKey,
					model: options.model,
				});

				runResults.push(singleRun);

				totalCompletedExecutions++;
				if (options.onProgress) {
					options.onProgress({
						itemIndex: index,
						runIndex,
						totalItems: items.length,
						totalRuns: runs,
						completedExecutions: totalCompletedExecutions,
						totalExecutions,
					});
				}
			}

			// Aggregate the runs
			return aggregateRuns(item, index, runResults);
		},
		{ concurrency: options.concurrency },
	);

	return results;
}

/**
 * Run agent on single item and evaluate results
 * @param options - Run item options
 * @returns Single run result
 */
async function runItem(options: RunItemOptions): Promise<SingleRun> {
	const { item, index, runIndex, runner, evaluators, timeout, apiKey, model } = options;

	const startTime = Date.now();
	let output: ExperimentResult | null = null;
	let error: string | undefined;

	try {
		// Run the agent with timeout
		output = await withTimeout(
			runner({ item, index, runIndex }),
			timeout,
			`Item #${index} (run ${runIndex}) timed out after ${timeout}ms`,
		);
	} catch (err) {
		error = err instanceof Error ? err.message : String(err);
		console.error(`Error running item #${index} (run ${runIndex}):`, error);

		// Return early if agent failed
		return {
			output: { output: '', metadata: {} },
			latencyMs: Date.now() - startTime,
			evaluations: {},
			error,
		};
	}

	const latencyMs = Date.now() - startTime;

	// Evaluate output
	const evaluations: Record<string, { score: number; reason?: string }> = {};

	for (const evaluator of evaluators) {
		try {
			const evalResult = await evaluator.evaluate(
				{
					item,
					output: output.output,
					metadata: output.metadata,
				},
				apiKey,
				model,
			);

			evaluations[evaluator.name] = evalResult;
		} catch (evalError) {
			console.error(
				`Evaluator "${evaluator.name}" failed for item #${index} (run ${runIndex}):`,
				evalError,
			);
			evaluations[evaluator.name] = {
				score: 0,
				reason: `Evaluation error: ${evalError instanceof Error ? evalError.message : String(evalError)}`,
			};
		}
	}

	return {
		output,
		latencyMs,
		evaluations,
		error,
	};
}

/**
 * Aggregate multiple runs into a single ItemResult
 * @param item - Dataset item
 * @param index - Item index
 * @param runResults - Array of single run results
 * @returns Aggregated item result
 */
function aggregateRuns(item: ExperimentItem, index: number, runResults: SingleRun[]): ItemResult {
	if (runResults.length === 0) {
		throw new Error('Cannot aggregate empty run results');
	}

	// Collect scores by evaluator
	const scoresByEvaluator: Record<string, number[]> = {};
	const latencies: number[] = [];

	for (const run of runResults) {
		latencies.push(run.latencyMs);

		for (const [evaluatorName, evaluation] of Object.entries(run.evaluations)) {
			if (!scoresByEvaluator[evaluatorName]) {
				scoresByEvaluator[evaluatorName] = [];
			}
			scoresByEvaluator[evaluatorName].push(evaluation.score);
		}
	}

	// Calculate aggregated statistics
	const avgLatencyMs = latencies.reduce((acc, lat) => acc + lat, 0) / latencies.length;

	const aggregatedEvaluations: Record<string, import('../types/index.js').RunAggregation> = {};
	for (const [evaluatorName, scores] of Object.entries(scoresByEvaluator)) {
		aggregatedEvaluations[evaluatorName] = calculateRunStats(scores);
	}

	// Use first run or median run as representative for flat fields (backward compatibility)
	const representativeRun = runResults[0];

	return {
		index,
		input: item,
		// Flat fields for backward compatibility (use first run)
		output: representativeRun.output,
		latencyMs: avgLatencyMs,
		evaluations: representativeRun.evaluations,
		error: representativeRun.error,
		// Multiple runs data
		runs: runResults,
		aggregated: {
			avgLatencyMs,
			evaluations: aggregatedEvaluations,
		},
	};
}

/**
 * Run a promise with timeout
 * @param promise - Promise to run
 * @param timeoutMs - Timeout in milliseconds
 * @param timeoutError - Error message on timeout
 * @returns Promise result
 */
function withTimeout<T>(promise: Promise<T>, timeoutMs: number, timeoutError: string): Promise<T> {
	return Promise.race([
		promise,
		new Promise<never>((_, reject) => setTimeout(() => reject(new Error(timeoutError)), timeoutMs)),
	]);
}
