import { randomBytes } from 'node:crypto';
import { createReporters } from '../cli/reporters/index.js';
import type { Dataset } from '../datasets/Dataset.js';
import { HistoryDB } from '../storage/db.js';
import { saveResult } from '../storage/results.js';
import type {
	CIResult,
	ExperimentOptions,
	ExperimentReport,
	ItemResult,
	RunnerFunction,
} from '../types/index.js';
import { calculateStats } from '../utils/stats.js';
import { Evaluator } from './Evaluator.js';
import { validateThresholds } from './ci.js';
import { getApiKey, loadConfig } from './config.js';
import { loadPlugins } from './plugin-loader.js';
import { runExperiment } from './runner.js';

// Global array to track in-flight experiment promises.
// Used by run.ts and MCP tools to await experiments after jiti.import resolves.
const pendingExperiments: Promise<ExperimentReport>[] = [];

/**
 * Get all pending experiment promises and clear the tracking array.
 * Call this after jiti.import() to wait for experiments that were
 * called without `await` to finish.
 */
export function drainPendingExperiments(): Promise<ExperimentReport[]> {
	const promises = [...pendingExperiments];
	pendingExperiments.length = 0;
	return Promise.all(promises);
}

/**
 * Main experiment function
 * Run experiments on a dataset with specified evaluators
 *
 * @param name - Experiment name
 * @param dataset - Dataset to run experiments on
 * @param runner - Function that runs the agent
 * @param options - Experiment options (evaluators, concurrency, etc.)
 * @returns Experiment report with results
 */
export function experiment(
	name: string,
	dataset: Dataset,
	runner: RunnerFunction,
	options: ExperimentOptions,
): Promise<ExperimentReport> {
	const promise = _experimentImpl(name, dataset, runner, options);
	pendingExperiments.push(promise);
	return promise;
}

async function _experimentImpl(
	name: string,
	dataset: Dataset,
	runner: RunnerFunction,
	options: ExperimentOptions,
): Promise<ExperimentReport> {
	// Load configuration
	const config = await loadConfig();

	// Load custom evaluator plugins if configured
	if (config.plugins && config.plugins.length > 0) {
		await loadPlugins(config.plugins);
	}

	// Merge options with config defaults
	const runs = options.runs || 1;
	const concurrency =
		(global as any).__cobaltConcurrencyOverride || options.concurrency || config.concurrency;
	const timeout = options.timeout || config.timeout;
	const tags = options.tags || [];
	const experimentName = options.name || name;

	// Tag/name-level filtering: skip experiment if --filter is set and doesn't match
	const filterValue = (global as any).__cobaltFilter as string | undefined;
	if (filterValue) {
		const nameMatches = experimentName.toLowerCase().includes(filterValue.toLowerCase());
		const tagMatches = tags.some((t) => t.toLowerCase().includes(filterValue.toLowerCase()));
		if (!nameMatches && !tagMatches) {
			console.log(
				`Skipping experiment "${experimentName}" (does not match filter "${filterValue}")`,
			);
			const skippedReport: ExperimentReport = {
				id: generateRunId(),
				name: experimentName,
				timestamp: new Date().toISOString(),
				tags,
				config: { runs, concurrency, timeout, evaluators: [] },
				summary: {
					totalItems: 0,
					totalDurationMs: 0,
					avgLatencyMs: 0,
					scores: {},
				},
				items: [],
			};
			return skippedReport;
		}
	}

	// Create evaluator instances (handle both Evaluator instances and configs)
	const evaluators = options.evaluators.map((evalConfig) =>
		evalConfig instanceof Evaluator ? evalConfig : new Evaluator(evalConfig),
	);

	// Get API key only if needed (for LLM judge or similarity evaluators)
	const needsApiKey = evaluators.some((e) => e.type === 'llm-judge' || e.type === 'similarity');
	const apiKey = needsApiKey ? getApiKey(config) : undefined;

	// Generate unique run ID
	const runId = generateRunId();

	// Get dataset items
	const items = dataset.getItems();

	if (items.length === 0) {
		throw new Error('Dataset is empty');
	}

	// Create reporters from config
	const reporters = createReporters(config.reporters);

	// Notify reporters of experiment start
	const startInfo = {
		name: experimentName,
		datasetSize: items.length,
		evaluators: evaluators.map((e) => e.name),
		concurrency,
		timeout,
		runs,
		tags,
	};
	for (const reporter of reporters) {
		reporter.onStart(startInfo);
	}

	const startTime = Date.now();

	// Progress callback
	const onProgress = (info: import('./runner.js').ProgressInfo) => {
		for (const reporter of reporters) {
			reporter.onProgress(info);
		}
	};

	// Run experiment
	const results = await runExperiment(items, runner, {
		concurrency,
		timeout,
		evaluators,
		apiKey,
		model: config.judge.model,
		runs,
		onProgress,
	});

	const totalDurationMs = Date.now() - startTime;

	// Calculate summary statistics
	const summary = await calculateSummary(results, totalDurationMs, config.judge.model, runs);

	// Build report
	const report: ExperimentReport = {
		id: runId,
		name: experimentName,
		timestamp: new Date().toISOString(),
		tags,
		config: {
			runs,
			concurrency,
			timeout,
			evaluators: evaluators.map((e) => e.name),
		},
		summary,
		items: results,
	};

	// CI Mode: Validate thresholds if configured
	// Use experiment-level thresholds, or fall back to config-level thresholds when --ci is active
	let ciStatus: CIResult | undefined;
	const thresholds =
		options.thresholds ||
		((global as any).__cobaltCIThresholds as
			| import('../types/index.js').ThresholdConfig
			| undefined);
	if (thresholds) {
		ciStatus = validateThresholds(report, thresholds);
		report.ciStatus = ciStatus;

		for (const reporter of reporters) {
			reporter.onCIStatus(ciStatus);
		}
	}

	// Save results to JSON file
	const resultPath = await saveResult(report);

	// Notify reporters of completion
	for (const reporter of reporters) {
		reporter.onComplete(report, resultPath);
	}

	// Save to history database
	try {
		const db = new HistoryDB();
		db.insertRun(report);
		db.close();
	} catch (error) {
		// Silently fail for history database errors (not critical)
	}

	// CLI/MCP integration - allow result capture via global callback
	if (typeof (global as any).__cobaltCLIResultCallback === 'function') {
		(global as any).__cobaltCLIResultCallback(report);
	}
	if (typeof (global as any).__cobaltMCPResultCallback === 'function') {
		(global as any).__cobaltMCPResultCallback(report);
	}

	return report;
}

/**
 * Calculate summary statistics from results
 */
async function calculateSummary(
	results: ItemResult[],
	totalDurationMs: number,
	model: string,
	runs = 1,
) {
	const totalItems = results.length;
	const avgLatencyMs = results.reduce((sum, r) => sum + r.latencyMs, 0) / totalItems;

	// Calculate scores per evaluator
	const scoresByEvaluator: Record<string, number[]> = {};

	for (const result of results) {
		if (runs === 1) {
			// Single run: use flat evaluations field (backward compatible)
			for (const [evaluatorName, evaluation] of Object.entries(result.evaluations)) {
				if (!scoresByEvaluator[evaluatorName]) {
					scoresByEvaluator[evaluatorName] = [];
				}
				scoresByEvaluator[evaluatorName].push(evaluation.score);
			}
		} else {
			// Multiple runs: collect from all runs
			for (const run of result.runs) {
				for (const [evaluatorName, evaluation] of Object.entries(run.evaluations)) {
					if (!scoresByEvaluator[evaluatorName]) {
						scoresByEvaluator[evaluatorName] = [];
					}
					scoresByEvaluator[evaluatorName].push(evaluation.score);
				}
			}
		}
	}

	const scores: Record<string, ReturnType<typeof calculateStats>> = {};
	for (const [evaluator, scoreList] of Object.entries(scoresByEvaluator)) {
		scores[evaluator] = calculateStats(scoreList);
	}

	// Calculate token usage and cost (if available in metadata)
	let totalInputTokens = 0;
	let totalOutputTokens = 0;
	let totalTokens = 0;

	const addTokens = (tokens: number | { input: number; output: number }) => {
		if (typeof tokens === 'number') {
			totalTokens += tokens;
		} else if (tokens.input && tokens.output) {
			totalInputTokens += tokens.input;
			totalOutputTokens += tokens.output;
			totalTokens += tokens.input + tokens.output;
		}
	};

	for (const result of results) {
		if (runs === 1) {
			// Single run: use top-level output metadata
			if (result.output.metadata?.tokens) {
				addTokens(result.output.metadata.tokens);
			}
		} else {
			// Multiple runs: sum tokens from all individual runs
			for (const run of result.runs) {
				if (run.output.metadata?.tokens) {
					addTokens(run.output.metadata.tokens);
				}
			}
		}
	}

	// Calculate estimated cost
	let estimatedCost: number | undefined;
	if (totalInputTokens > 0 || totalOutputTokens > 0) {
		const { estimateCost } = await import('../utils/cost.js');
		estimatedCost = estimateCost({ input: totalInputTokens, output: totalOutputTokens }, model);
	}

	return {
		totalItems,
		totalDurationMs,
		avgLatencyMs,
		totalTokens: totalTokens || undefined,
		estimatedCost,
		scores,
	};
}

/**
 * Generate unique run ID
 */
function generateRunId(): string {
	return randomBytes(6).toString('hex');
}
