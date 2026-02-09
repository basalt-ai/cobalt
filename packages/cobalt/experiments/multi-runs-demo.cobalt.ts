/**
 * Multiple Runs Demo - No API Key Required
 *
 * This experiment demonstrates the Multiple Runs feature
 * without requiring any external API keys.
 *
 * To run: pnpm cobalt run experiments/multi-runs-demo.cobalt.ts
 */

import { experiment, Evaluator, Dataset } from '../src/index.js'

// ============================================================================
// Mock Agent: Random Number Generator (Non-Deterministic)
// ============================================================================

/**
 * Simulates a non-deterministic agent
 * Each run produces different output
 */
async function randomAgent(input: string): Promise<number> {
  // Simulate processing time
  await new Promise(resolve => setTimeout(resolve, 50 + Math.random() * 100))

  // Generate random number in range based on input
  const ranges: Record<string, [number, number]> = {
    'low': [0, 30],
    'medium': [40, 60],
    'high': [70, 100]
  }

  const [min, max] = ranges[input] || [0, 100]
  return Math.floor(Math.random() * (max - min + 1)) + min
}

// ============================================================================
// Dataset: Random Number Requests
// ============================================================================

const dataset = new Dataset({
  items: [
    { input: 'low', expectedOutput: '15', targetRange: [0, 30] },
    { input: 'medium', expectedOutput: '50', targetRange: [40, 60] },
    { input: 'high', expectedOutput: '85', targetRange: [70, 100] }
  ]
})

// ============================================================================
// Evaluators
// ============================================================================

const evaluators = [
  new Evaluator({
    name: 'in-range',
    type: 'function',
    fn: ({ item, output }) => {
      const value = Number(output)
      const [min, max] = item.targetRange

      const inRange = value >= min && value <= max
      return {
        score: inRange ? 1 : 0,
        reason: inRange
          ? `Value ${value} is in range [${min}, ${max}]`
          : `Value ${value} is outside range [${min}, ${max}]`
      }
    }
  }),

  new Evaluator({
    name: 'distance-from-target',
    type: 'function',
    fn: ({ item, output }) => {
      const value = Number(output)
      const target = Number(item.expectedOutput)
      const distance = Math.abs(value - target)

      // Score based on distance (closer = higher score)
      const score = Math.max(0, 1 - distance / 100)

      return {
        score,
        reason: `Distance from target ${target}: ${distance}`
      }
    }
  })
]

// ============================================================================
// Run Experiment with Multiple Runs
// ============================================================================

console.log('\n🎲 Multiple Runs Demo: Non-Deterministic Agent\n')
console.log('This experiment will:')
console.log('  • Run each item 10 times')
console.log('  • Show variance in results (standard deviation)')
console.log('  • Demonstrate statistical aggregation\n')

experiment(
  'multi-runs-demo',
  dataset,
  async ({ item, runIndex }) => {
    const result = await randomAgent(item.input)

    return {
      output: String(result),
      metadata: {
        runIndex,
        timestamp: Date.now()
      }
    }
  },
  {
    evaluators,
    runs: 10,  // Run each item 10 times
    concurrency: 5,
    timeout: 5000,
    tags: ['demo', 'no-api-key']
  }
)
  .then((report) => {
    console.log('\n✅ Experiment completed!\n')
    console.log('==================================================')
    console.log('Multiple Runs Analysis:')
    console.log('==================================================\n')

    for (const item of report.items) {
      console.log(`📊 Item: "${item.input.input}" (target: ${item.input.expectedOutput})`)

      if (item.aggregated) {
        console.log(`\n   All ${item.runs.length} Results:`)
        const outputs = item.runs.map(r => r.output.output)
        console.log(`   ${outputs.join(', ')}`)

        console.log('\n   Evaluator Statistics:')
        for (const [name, stats] of Object.entries(item.aggregated.evaluations)) {
          console.log(`\n     ${name}:`)
          console.log(`       Mean:       ${stats.mean.toFixed(3)}`)
          console.log(`       Std Dev:    ${stats.stddev.toFixed(3)}`)
          console.log(`       Min:        ${stats.min.toFixed(3)}`)
          console.log(`       Max:        ${stats.max.toFixed(3)}`)
          console.log(`       Median:     ${stats.p50.toFixed(3)}`)
          console.log(`       95th %ile:  ${stats.p95.toFixed(3)}`)

          // Variance interpretation
          if (stats.stddev < 0.1) {
            console.log('       Variance:   LOW (very consistent)')
          } else if (stats.stddev < 0.3) {
            console.log('       Variance:   MEDIUM (somewhat variable)')
          } else {
            console.log('       Variance:   HIGH (very variable)')
          }
        }
      }
      console.log('\n' + '─'.repeat(50) + '\n')
    }

    console.log('==================================================')
    console.log('Key Insights:')
    console.log('==================================================\n')

    console.log('✓ Standard deviation shows consistency of results')
    console.log('✓ Multiple runs reveal true performance (not just lucky/unlucky)')
    console.log('✓ P50 (median) is more robust than mean for skewed distributions')
    console.log('✓ P95 helps identify worst-case scenarios\n')

    console.log(`📁 Results saved to: .cobalt/results/\n`)
  })
  .catch((error) => {
    console.error('\n❌ Experiment failed:', error.message)
    process.exit(1)
  })
