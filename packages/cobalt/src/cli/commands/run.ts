import { readdir } from 'node:fs/promises'
import { resolve, join } from 'node:path'
import { existsSync } from 'node:fs'
import { defineCommand } from 'citty'
import { createJiti } from 'jiti'
import pc from 'picocolors'
import { loadConfig } from '../../core/config.js'

export default defineCommand({
  meta: {
    name: 'run',
    description: 'Run cobalt experiments'
  },
  args: {
    file: {
      type: 'string',
      description: 'Specific experiment file to run',
      alias: 'f'
    },
    filter: {
      type: 'string',
      description: 'Filter experiments by name',
      alias: 'n'
    },
    concurrency: {
      type: 'string',
      description: 'Override concurrency setting',
      alias: 'c'
    }
  },
  async run({ args }) {
    console.log(pc.bold('\n🔷 Cobalt v0.1.0\n'))

    try {
      // Load configuration
      const config = await loadConfig()

      // Determine which files to run
      let files: string[] = []

      if (args.file) {
        // Run specific file
        const filepath = resolve(process.cwd(), args.file)
        if (!existsSync(filepath)) {
          console.error(pc.red(`\n❌ File not found: ${args.file}\n`))
          process.exit(1)
        }
        files = [filepath]
      } else {
        // Find all experiment files
        const testDir = resolve(process.cwd(), config.testDir)

        if (!existsSync(testDir)) {
          console.error(pc.red(`\n❌ Test directory not found: ${testDir}`))
          console.log(pc.dim('Run "npx cobalt init" to create the project structure\n'))
          process.exit(1)
        }

        files = await findExperimentFiles(testDir, config.testMatch)

        if (files.length === 0) {
          console.error(pc.red(`\n❌ No experiment files found in ${testDir}`))
          console.log(pc.dim('Create files matching patterns:'), config.testMatch.join(', '))
          console.log(pc.dim('Or run "npx cobalt init" to create an example\n'))
          process.exit(1)
        }
      }

      console.log(pc.dim(`Found ${files.length} experiment file(s)\n`))

      // Execute each experiment file
      const jiti = createJiti(import.meta.url, {
        interopDefault: true
      })

      for (const file of files) {
        try {
          console.log(pc.bold(`Running: ${file}\n`))

          // Import and execute the file
          // The experiment() call inside the file will execute automatically
          await jiti.import(file, { default: true })

          console.log('')
        } catch (error) {
          console.error(pc.red(`\n❌ Error running ${file}:`), error)
          console.log('')
        }
      }

      console.log(pc.green(pc.bold('\n✅ All experiments completed!\n')))
      console.log(pc.dim('View results: ls .cobalt/results/'))
      console.log(pc.dim('Run dashboard: npx cobalt serve (coming in P1)\n'))
    } catch (error) {
      console.error(pc.red('\n❌ Failed to run experiments:'), error)
      process.exit(1)
    }
  }
})

/**
 * Find experiment files matching patterns
 */
async function findExperimentFiles(dir: string, patterns: string[]): Promise<string[]> {
  const files: string[] = []

  async function scan(currentDir: string) {
    const entries = await readdir(currentDir, { withFileTypes: true })

    for (const entry of entries) {
      const fullPath = join(currentDir, entry.name)

      if (entry.isDirectory()) {
        // Skip node_modules and hidden directories
        if (entry.name === 'node_modules' || entry.name.startsWith('.')) {
          continue
        }
        await scan(fullPath)
      } else if (entry.isFile()) {
        // Check if file matches any pattern
        const relativePath = fullPath.replace(dir + '/', '')
        for (const pattern of patterns) {
          if (matchPattern(relativePath, pattern)) {
            files.push(fullPath)
            break
          }
        }
      }
    }
  }

  await scan(dir)
  return files
}

/**
 * Simple pattern matching (supports ** and *)
 */
function matchPattern(path: string, pattern: string): boolean {
  // Convert glob pattern to regex
  const regexPattern = pattern
    .replace(/\./g, '\\.')
    .replace(/\*\*/g, '.*')
    .replace(/\*/g, '[^/]*')
    .replace(/\?/g, '.')

  const regex = new RegExp(`^${regexPattern}$`)
  return regex.test(path)
}
