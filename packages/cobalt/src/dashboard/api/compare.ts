import { Context } from 'hono'
import { loadResult } from '../../storage/results.js'

/**
 * GET /api/compare?a=runId1&b=runId2
 * Compare two experiment runs
 */
export async function compareRuns(c: Context) {
  try {
    const { a, b } = c.req.query()

    if (!a || !b) {
      return c.json({ error: 'Missing run IDs (a and b query params required)' }, 400)
    }

    // Load both runs
    const runA = await loadResult(a)
    const runB = await loadResult(b)

    // Calculate differences
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

      return {
        index,
        input: itemA.input,
        changes
      }
    }).filter(Boolean)

    // Sort by biggest absolute change
    itemChanges.sort((a: any, b: any) => {
      const maxChangeA = Math.max(...Object.values(a.changes).map(Math.abs))
      const maxChangeB = Math.max(...Object.values(b.changes).map(Math.abs))
      return maxChangeB - maxChangeA
    })

    return c.json({
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
      topChanges: itemChanges.slice(0, 10)
    })
  } catch (error) {
    console.error('Failed to compare runs:', error)
    return c.json({ error: 'Failed to compare runs' }, 500)
  }
}
