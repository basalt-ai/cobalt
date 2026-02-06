import { loadResult } from '../../storage/results.js'
import { loadConfig } from '../../core/config.js'

/**
 * MCP Tool: cobalt_compare
 * Compare two experiment runs
 */
export const cobaltCompareTool = {
  name: 'cobalt_compare',
  description: 'Compare two experiment runs and return a structured diff showing regressions and improvements per item and per evaluator.',
  inputSchema: {
    type: 'object',
    properties: {
      runA: {
        type: 'string',
        description: 'First run ID (baseline).'
      },
      runB: {
        type: 'string',
        description: 'Second run ID (candidate).'
      }
    },
    required: ['runA', 'runB']
  }
}

export async function handleCobaltCompare(args: any) {
  try {
    const config = await loadConfig()

    // Load both runs
    const runA = await loadResult(args.runA, config.outputDir)
    const runB = await loadResult(args.runB, config.outputDir)

    // Calculate score differences
    const scoreDiffs: Record<string, {
      baseline: number
      candidate: number
      diff: number
      percentChange: number
    }> = {}

    for (const evaluator in runA.summary.scores) {
      const baselineScore = runA.summary.scores[evaluator].avg
      const candidateScore = runB.summary.scores[evaluator]?.avg || 0

      const diff = candidateScore - baselineScore
      const percentChange = baselineScore !== 0 ? (diff / baselineScore) * 100 : 0

      scoreDiffs[evaluator] = {
        baseline: baselineScore,
        candidate: candidateScore,
        diff,
        percentChange
      }
    }

    // Find regressions and improvements
    const regressions = Object.entries(scoreDiffs)
      .filter(([_, stats]) => stats.diff < -0.05) // Threshold: 5% drop
      .map(([name, stats]) => ({ evaluator: name, ...stats }))

    const improvements = Object.entries(scoreDiffs)
      .filter(([_, stats]) => stats.diff > 0.05) // Threshold: 5% gain
      .map(([name, stats]) => ({ evaluator: name, ...stats }))

    // Find items with biggest changes
    const itemChanges = runA.items.map((itemA, index) => {
      const itemB = runB.items[index]
      if (!itemB) return null

      const changes: Record<string, number> = {}
      for (const evaluator in itemA.evaluations) {
        const scoreA = itemA.evaluations[evaluator].score
        const scoreB = itemB.evaluations[evaluator]?.score || 0
        changes[evaluator] = scoreB - scoreA
      }

      const maxChange = Math.max(...Object.values(changes).map(Math.abs))

      return {
        index,
        input: itemA.input,
        changes,
        maxChange
      }
    }).filter(Boolean)

    // Sort by biggest change
    itemChanges.sort((a: any, b: any) => b.maxChange - a.maxChange)

    const comparison = {
      runA: {
        id: runA.id,
        name: runA.name,
        timestamp: runA.timestamp
      },
      runB: {
        id: runB.id,
        name: runB.name,
        timestamp: runB.timestamp
      },
      scoreDiffs,
      regressions,
      improvements,
      topChanges: itemChanges.slice(0, 10)
    }

    return {
      content: [{
        type: 'text',
        text: JSON.stringify(comparison, null, 2)
      }]
    }
  } catch (error) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          error: error instanceof Error ? error.message : String(error)
        }, null, 2)
      }],
      isError: true
    }
  }
}
