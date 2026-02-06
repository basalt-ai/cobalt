import { defineCommand } from 'citty'
import pc from 'picocolors'
import { HistoryDB } from '../../storage/db.js'
import { loadConfig } from '../../core/config.js'

export default defineCommand({
  meta: {
    name: 'history',
    description: 'List past experiment runs'
  },
  args: {
    experiment: {
      type: 'string',
      description: 'Filter by experiment name',
      alias: 'e'
    },
    limit: {
      type: 'string',
      description: 'Maximum number of runs to show',
      alias: 'n'
    }
  },
  async run({ args }) {
    try {
      const config = await loadConfig()
      const db = new HistoryDB(`${config.outputDir}/history.db`)

      const filter: any = {}
      if (args.experiment) filter.experiment = args.experiment

      let runs = db.getRuns(filter)
      db.close()

      if (runs.length === 0) {
        console.log(pc.yellow('\nNo runs found.\n'))
        console.log(pc.dim('Run experiments with: npx cobalt run\n'))
        return
      }

      // Apply limit
      if (args.limit) {
        const limit = parseInt(args.limit, 10)
        runs = runs.slice(0, limit)
      }

      console.log(pc.bold('\n🔷 Experiment History\n'))

      for (const run of runs) {
        const date = new Date(run.timestamp).toLocaleString()
        const avgScore = Object.values(run.avgScores).reduce((a, b) => a + b, 0) / Object.keys(run.avgScores).length

        console.log(pc.bold(`${run.name} (${run.id})`))
        console.log(pc.dim(`  Date: ${date}`))
        console.log(pc.dim(`  Items: ${run.totalItems} | Duration: ${(run.durationMs / 1000).toFixed(2)}s`))
        console.log(`  Avg Score: ${avgScore.toFixed(2)}`)

        if (run.tags.length > 0) {
          console.log(pc.dim(`  Tags: ${run.tags.join(', ')}`))
        }

        // Show individual evaluator scores
        const scores = Object.entries(run.avgScores)
          .map(([name, score]) => `${name}=${score.toFixed(2)}`)
          .join(' | ')
        console.log(pc.dim(`  Scores: ${scores}`))

        console.log('')
      }

      console.log(pc.dim(`Showing ${runs.length} run(s)\n`))
      console.log(pc.dim('View details: npx cobalt serve\n'))
    } catch (error) {
      console.error(pc.red('\n❌ Failed to load history:'), error)
      process.exit(1)
    }
  }
})
