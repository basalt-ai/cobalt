import { HistoryDB } from '../../storage/db.js'
import { loadResult } from '../../storage/results.js'
import { loadConfig } from '../../core/config.js'

/**
 * MCP Tool: cobalt_results
 * List past runs or get specific run details
 */
export const cobaltResultsTool = {
  name: 'cobalt_results',
  description: 'List past experiment runs or get detailed results for a specific run.',
  inputSchema: {
    type: 'object',
    properties: {
      runId: {
        type: 'string',
        description: 'Get results for a specific run ID. If omitted, returns list of recent runs.'
      },
      limit: {
        type: 'number',
        description: 'Number of recent runs to list (default: 10).'
      },
      experiment: {
        type: 'string',
        description: 'Filter runs by experiment name.'
      }
    }
  }
}

export async function handleCobaltResults(args: any) {
  try {
    const config = await loadConfig()

    if (args.runId) {
      // Get specific run details
      const report = await loadResult(args.runId, config.outputDir)

      return {
        content: [{
          type: 'text',
          text: JSON.stringify(report, null, 2)
        }]
      }
    } else {
      // List recent runs
      const db = new HistoryDB(`${config.outputDir}/history.db`)

      const filter: any = {}
      if (args.experiment) filter.experiment = args.experiment

      let runs = db.getRuns(filter)
      db.close()

      // Apply limit
      const limit = args.limit || 10
      runs = runs.slice(0, limit)

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            runs,
            total: runs.length
          }, null, 2)
        }]
      }
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
