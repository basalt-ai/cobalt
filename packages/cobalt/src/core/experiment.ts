import { randomBytes } from 'node:crypto'
import type {
  ExperimentOptions,
  ExperimentReport,
  RunnerFunction,
  ItemResult
} from '../types/index.js'
import { Dataset } from '../datasets/Dataset.js'
import { Evaluator } from './Evaluator.js'
import { runExperiment } from './runner.js'
import { calculateStats } from '../utils/stats.js'
import { loadConfig, getApiKey } from './config.js'
import { saveResult } from '../storage/results.js'

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
export async function experiment(
  name: string,
  dataset: Dataset,
  runner: RunnerFunction,
  options: ExperimentOptions
): Promise<ExperimentReport> {
  // Load configuration
  const config = await loadConfig()

  // Get API key for LLM judge evaluators
  const apiKey = getApiKey(config)

  // Merge options with config defaults
  const runs = options.runs || 1
  const concurrency = options.concurrency || config.concurrency
  const timeout = options.timeout || config.timeout
  const tags = options.tags || []
  const experimentName = options.name || name

  // Create evaluator instances
  const evaluators = options.evaluators.map(evalConfig => new Evaluator(evalConfig))

  // Generate unique run ID
  const runId = generateRunId()

  // Get dataset items
  const items = dataset.getItems()

  if (items.length === 0) {
    throw new Error('Dataset is empty')
  }

  console.log(`\nRunning experiment: ${experimentName}`)
  console.log(`Dataset: ${items.length} items`)
  console.log(`Evaluators: ${evaluators.map(e => e.name).join(', ')}`)
  console.log(`Concurrency: ${concurrency} | Timeout: ${timeout}ms\n`)

  const startTime = Date.now()

  // Progress callback
  let lastProgressLog = 0
  const onProgress = (completed: number, total: number) => {
    const now = Date.now()
    if (now - lastProgressLog > 1000 || completed === total) {
      console.log(`Progress: ${completed}/${total} items completed`)
      lastProgressLog = now
    }
  }

  // Run experiment
  const results = await runExperiment(items, runner, {
    concurrency,
    timeout,
    evaluators,
    apiKey,
    model: config.judge.model,
    onProgress
  })

  const totalDurationMs = Date.now() - startTime

  // Calculate summary statistics
  const summary = calculateSummary(results, totalDurationMs)

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
      evaluators: evaluators.map(e => e.name)
    },
    summary,
    items: results
  }

  console.log(`\nExperiment completed in ${(totalDurationMs / 1000).toFixed(2)}s`)
  console.log(`Average latency: ${summary.avgLatencyMs.toFixed(0)}ms`)

  // Display summary scores
  console.log('\nScores:')
  for (const [evaluator, stats] of Object.entries(summary.scores)) {
    console.log(
      `  ${evaluator}: avg=${stats.avg.toFixed(2)} min=${stats.min.toFixed(2)} ` +
      `max=${stats.max.toFixed(2)} p50=${stats.p50.toFixed(2)} p95=${stats.p95.toFixed(2)}`
    )
  }

  // Warn about low scores
  const lowScoreItems = results.filter(r =>
    Object.values(r.evaluations).some(e => e.score < 0.5)
  )
  if (lowScoreItems.length > 0) {
    console.warn(`\n⚠ ${lowScoreItems.length} item(s) scored below 0.5`)
  }

  // Warn about errors
  const errorItems = results.filter(r => r.error)
  if (errorItems.length > 0) {
    console.error(`\n❌ ${errorItems.length} item(s) had errors`)
  }

  // Save results
  const resultPath = await saveResult(report, config.outputDir)
  console.log(`\nResults saved to: ${resultPath}`)
  console.log(`Run ID: ${runId}`)

  return report
}

/**
 * Calculate summary statistics from results
 */
function calculateSummary(results: ItemResult[], totalDurationMs: number) {
  const totalItems = results.length
  const avgLatencyMs = results.reduce((sum, r) => sum + r.latencyMs, 0) / totalItems

  // Calculate scores per evaluator
  const scoresByEvaluator: Record<string, number[]> = {}

  for (const result of results) {
    for (const [evaluatorName, evaluation] of Object.entries(result.evaluations)) {
      if (!scoresByEvaluator[evaluatorName]) {
        scoresByEvaluator[evaluatorName] = []
      }
      scoresByEvaluator[evaluatorName].push(evaluation.score)
    }
  }

  const scores: Record<string, ReturnType<typeof calculateStats>> = {}
  for (const [evaluator, scoreList] of Object.entries(scoresByEvaluator)) {
    scores[evaluator] = calculateStats(scoreList)
  }

  // Calculate token usage (if available in metadata)
  let totalTokens = 0
  for (const result of results) {
    if (result.output.metadata?.tokens) {
      totalTokens += result.output.metadata.tokens
    }
  }

  return {
    totalItems,
    totalDurationMs,
    avgLatencyMs,
    totalTokens: totalTokens || undefined,
    estimatedCost: undefined, // TODO: Calculate cost based on model and tokens
    scores
  }
}

/**
 * Generate unique run ID
 */
function generateRunId(): string {
  return randomBytes(6).toString('hex')
}
