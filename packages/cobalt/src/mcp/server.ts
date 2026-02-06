import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import {
  CallToolRequestSchema,
  ListToolsRequestSchema
} from '@modelcontextprotocol/sdk/types.js'

import { cobaltRunTool, handleCobaltRun } from './tools/run.js'
import { cobaltResultsTool, handleCobaltResults } from './tools/results.js'
import { cobaltCompareTool, handleCobaltCompare } from './tools/compare.js'

/**
 * Start the Cobalt MCP server
 * Provides tools for Claude Code to run experiments and analyze results
 */
export async function startMCPServer() {
  const server = new Server(
    {
      name: 'cobalt',
      version: '0.1.0'
    },
    {
      capabilities: {
        tools: {}
      }
    }
  )

  // Register tool list handler
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: [
        cobaltRunTool,
        cobaltResultsTool,
        cobaltCompareTool
      ]
    }
  })

  // Register tool call handler
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params

    try {
      switch (name) {
        case 'cobalt_run':
          return await handleCobaltRun(args)

        case 'cobalt_results':
          return await handleCobaltResults(args)

        case 'cobalt_compare':
          return await handleCobaltCompare(args)

        default:
          throw new Error(`Unknown tool: ${name}`)
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
  })

  // Connect via stdio
  const transport = new StdioServerTransport()
  await server.connect(transport)

  console.error('Cobalt MCP server started')
}
