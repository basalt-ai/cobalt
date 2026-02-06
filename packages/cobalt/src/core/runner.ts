import pMap from 'p-map'
import type {
  ExperimentItem,
  ExperimentResult,
  RunnerFunction,
  ItemResult,
  EvaluatorConfig
} from '../types/index.js'
import { Evaluator } from './Evaluator.js'

export interface RunnerOptions {
  concurrency: number
  timeout: number
  evaluators: Evaluator[]
  apiKey?: string
  model?: string
  onProgress?: (completed: number, total: number) => void
}

export interface RunItemOptions {
  item: ExperimentItem
  index: number
  runIndex: number
  runner: RunnerFunction
  evaluators: Evaluator[]
  timeout: number
  apiKey?: string
  model?: string
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
  options: RunnerOptions
): Promise<ItemResult[]> {
  let completedCount = 0

  const results = await pMap(
    items,
    async (item, index) => {
      const result = await runItem({
        item,
        index,
        runIndex: 0,
        runner,
        evaluators: options.evaluators,
        timeout: options.timeout,
        apiKey: options.apiKey,
        model: options.model
      })

      completedCount++
      if (options.onProgress) {
        options.onProgress(completedCount, items.length)
      }

      return result
    },
    { concurrency: options.concurrency }
  )

  return results
}

/**
 * Run agent on single item and evaluate results
 * @param options - Run item options
 * @returns Item result with evaluations
 */
async function runItem(options: RunItemOptions): Promise<ItemResult> {
  const { item, index, runIndex, runner, evaluators, timeout, apiKey, model } = options

  const startTime = Date.now()
  let output: ExperimentResult | null = null
  let error: string | undefined

  try {
    // Run the agent with timeout
    output = await withTimeout(
      runner({ item, index, runIndex }),
      timeout,
      `Item #${index} timed out after ${timeout}ms`
    )
  } catch (err) {
    error = err instanceof Error ? err.message : String(err)
    console.error(`Error running item #${index}:`, error)

    // Return early if agent failed
    return {
      index,
      input: item,
      output: { output: '', metadata: {} },
      latencyMs: Date.now() - startTime,
      evaluations: {},
      error
    }
  }

  const latencyMs = Date.now() - startTime

  // Evaluate output
  const evaluations: Record<string, { score: number; reason?: string }> = {}

  for (const evaluator of evaluators) {
    try {
      const evalResult = await evaluator.evaluate(
        {
          item,
          output: output.output,
          metadata: output.metadata
        },
        apiKey,
        model
      )

      evaluations[evaluator.name] = evalResult
    } catch (evalError) {
      console.error(`Evaluator "${evaluator.name}" failed for item #${index}:`, evalError)
      evaluations[evaluator.name] = {
        score: 0,
        reason: `Evaluation error: ${evalError instanceof Error ? evalError.message : String(evalError)}`
      }
    }
  }

  return {
    index,
    input: item,
    output,
    latencyMs,
    evaluations,
    error
  }
}

/**
 * Run a promise with timeout
 * @param promise - Promise to run
 * @param timeoutMs - Timeout in milliseconds
 * @param timeoutError - Error message on timeout
 * @returns Promise result
 */
function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  timeoutError: string
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(timeoutError)), timeoutMs)
    )
  ])
}
