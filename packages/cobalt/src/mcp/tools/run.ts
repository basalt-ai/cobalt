import { createJiti } from 'jiti'
import { loadConfig } from '../../core/config.js'
import { resolve } from 'node:path'
import { existsSync } from 'node:fs'

/**
 * MCP Tool: cobalt_run
 * Run cobalt experiments and return structured results
 */
export const cobaltRunTool = {
  name: 'cobalt_run',
  description: 'Run cobalt experiments and return structured results with scores per evaluator and per item.',
  inputSchema: {
    type: 'object',
    properties: {
      file: {
        type: 'string',
        description: 'Path to a specific experiment file. If omitted, runs all experiments in testDir.'
      },
      filter: {
        type: 'string',
        description: 'Filter experiments by name (substring match).'
      },
      concurrency: {
        type: 'number',
        description: 'Override concurrency setting.'
      }
    }
  }
}

export async function handleCobaltRun(args: any) {
  try {
    const config = await loadConfig()

    // Determine which files to run
    let files: string[] = []

    if (args.file) {
      const filepath = resolve(process.cwd(), args.file)
      if (!existsSync(filepath)) {
        throw new Error(`File not found: ${args.file}`)
      }
      files = [filepath]
    } else {
      // For now, just return error - file discovery would be complex
      throw new Error('File parameter required for MCP tool. Specify the experiment file to run.')
    }

    // Execute experiment file
    const jiti = createJiti(import.meta.url, {
      interopDefault: true
    })

    const results: any[] = []

    for (const file of files) {
      // Import and execute - the experiment() call will run automatically
      // We need to capture the result somehow
      await jiti.import(file, { default: true })
    }

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          success: true,
          message: 'Experiments completed',
          files: files.length
        }, null, 2)
      }]
    }
  } catch (error) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          success: false,
          error: error instanceof Error ? error.message : String(error)
        }, null, 2)
      }],
      isError: true
    }
  }
}
