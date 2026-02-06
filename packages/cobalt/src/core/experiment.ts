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
import { HistoryDB } from '../storage/db.js'

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
  const onProgress = (info: import('./runner.js').ProgressInfo) => {
    const now = Date.now()
    if (now - lastProgressLog > 1000 || info.completedExecutions === info.totalExecutions) {
      if (runs > 1) {
        // Hybrid progress for multiple runs
        console.log(
          `Progress: ${info.completedExecutions}/${info.totalExecutions} completed | ` +
          `Item ${info.itemIndex + 1}/${info.totalItems} (run ${info.runIndex + 1}/${info.totalRuns})`
        )
      } else {
        // Simple progress for single run
        console.log(`Progress: ${info.completedExecutions}/${info.totalExecutions} items completed`)
      }
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
    runs,
    onProgress
  })

  const totalDurationMs = Date.now() - startTime

  // Calculate summary statistics
  const summary = await calculateSummary(results, totalDurationMs, config.judge.model, runs)

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

  // Display cost if available
  if (summary.estimatedCost !== undefined) {
    const { formatCost } = await import('../utils/cost.js')
    console.log(`Estimated cost: ${formatCost(summary.estimatedCost)}`)
  }

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

  // Save results to JSON file
  const resultPath = await saveResult(report, config.outputDir)
  console.log(`\nResults saved to: ${resultPath}`)
  console.log(`Run ID: ${runId}`)

  // Save to history database
  try {
    const db = new HistoryDB(`${config.outputDir}/history.db`)
    db.insertRun(report)
    db.close()
  } catch (error) {
    console.warn('Failed to save to history database:', error)
  }

  return report
}

/**
 * Calculate summary statistics from results
 */
async function calculateSummary(results: ItemResult[], totalDurationMs: number, model: string, runs: number = 1) {
  const totalItems = results.length
  const avgLatencyMs = results.reduce((sum, r) => sum + r.latencyMs, 0) / totalItems

  // Calculate scores per evaluator
  const scoresByEvaluator: Record<string, number[]> = {}

  for (const result of results) {
    if (runs === 1) {
      // Single run: use flat evaluations field (backward compatible)
      for (const [evaluatorName, evaluation] of Object.entries(result.evaluations)) {
        if (!scoresByEvaluator[evaluatorName]) {
          scoresByEvaluator[evaluatorName] = []
        }
        scoresByEvaluator[evaluatorName].push(evaluation.score)
      }
    } else {
      // Multiple runs: collect from all runs
      for (const run of result.runs) {
        for (const [evaluatorName, evaluation] of Object.entries(run.evaluations)) {
          if (!scoresByEvaluator[evaluatorName]) {
            scoresByEvaluator[evaluatorName] = []
          }
          scoresByEvaluator[evaluatorName].push(evaluation.score)
        }
      }
    }
  }

  const scores: Record<string, ReturnType<typeof calculateStats>> = {}
  for (const [evaluator, scoreList] of Object.entries(scoresByEvaluator)) {
    scores[evaluator] = calculateStats(scoreList)
  }

  // Calculate token usage and cost (if available in metadata)
  let totalInputTokens = 0
  let totalOutputTokens = 0
  let totalTokens = 0

  for (const result of results) {
    if (result.output.metadata?.tokens) {
      // Support both simple token count and detailed input/output breakdown
      if (typeof result.output.metadata.tokens === 'number') {
        totalTokens += result.output.metadata.tokens
      } else if (result.output.metadata.tokens.input && result.output.metadata.tokens.output) {
        totalInputTokens += result.output.metadata.tokens.input
        totalOutputTokens += result.output.metadata.tokens.output
        totalTokens += result.output.metadata.tokens.input + result.output.metadata.tokens.output
      }
    }
  }

  // Calculate estimated cost
  let estimatedCost: number | undefined
  if (totalInputTokens > 0 || totalOutputTokens > 0) {
    const { estimateCost } = await import('../utils/cost.js')
    estimatedCost = estimateCost(
      { input: totalInputTokens, output: totalOutputTokens },
      model
    )
  }

  return {
    totalItems,
    totalDurationMs,
    avgLatencyMs,
    totalTokens: totalTokens || undefined,
    estimatedCost,
    scores
  }
}

/**
 * Generate unique run ID
 */
function generateRunId(): string {
  return randomBytes(6).toString('hex')
}
