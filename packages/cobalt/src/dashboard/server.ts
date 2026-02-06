import { Hono } from 'hono'
import { serve } from '@hono/node-server'
import { serveStatic } from '@hono/node-server/serve-static'
import { getRuns, getRunDetail } from './api/runs.js'
import { compareRuns } from './api/compare.js'
import { getTrends } from './api/trends.js'

/**
 * Start the Cobalt dashboard server
 * @param port - Port to listen on
 * @param open - Whether to open browser automatically
 */
export async function startDashboard(port: number = 4000, open: boolean = true): Promise<void> {
  const app = new Hono()

  // API routes
  app.get('/api/runs', getRuns)
  app.get('/api/runs/:id', getRunDetail)
  app.get('/api/compare', compareRuns)
  app.get('/api/trends', getTrends)

  // Health check
  app.get('/api/health', (c) => c.json({ status: 'ok' }))

  // Serve static dashboard files (will be added in dashboard frontend implementation)
  // For now, serve a simple HTML page
  app.get('/', (c) => {
    return c.html(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Cobalt Dashboard</title>
        <style>
          body {
            font-family: system-ui, -apple-system, sans-serif;
            max-width: 800px;
            margin: 50px auto;
            padding: 20px;
            line-height: 1.6;
          }
          h1 { color: #2563eb; }
          .endpoint {
            background: #f3f4f6;
            padding: 10px;
            margin: 10px 0;
            border-radius: 4px;
            font-family: monospace;
          }
          .status { color: #10b981; font-weight: bold; }
        </style>
      </head>
      <body>
        <h1>🔷 Cobalt Dashboard</h1>
        <p class="status">✓ Server Running</p>

        <h2>API Endpoints</h2>
        <div class="endpoint">GET /api/runs - List all runs</div>
        <div class="endpoint">GET /api/runs/:id - Get run details</div>
        <div class="endpoint">GET /api/compare?a=id1&b=id2 - Compare two runs</div>
        <div class="endpoint">GET /api/trends?experiment=name - Get trends</div>

        <h2>Next Steps</h2>
        <p>The React dashboard frontend will be added in the next implementation phase.</p>
        <p>For now, you can use the API endpoints above to query your experiment results.</p>

        <h3>Example Usage</h3>
        <pre style="background: #1f2937; color: #e5e7eb; padding: 15px; border-radius: 4px;">
# List all runs
curl http://localhost:${port}/api/runs

# Get specific run
curl http://localhost:${port}/api/runs/abc123

# Compare two runs
curl http://localhost:${port}/api/compare?a=abc123&b=def456
        </pre>
      </body>
      </html>
    `)
  })

  // Start server
  console.log(`\n🔷 Cobalt Dashboard`)
  console.log(`   Server: http://localhost:${port}`)
  console.log(`   API: http://localhost:${port}/api`)
  console.log('')

  serve({
    fetch: app.fetch,
    port
  })

  // Open browser if requested
  if (open) {
    const { exec } = await import('node:child_process')
    const command = process.platform === 'darwin' ? 'open' :
                   process.platform === 'win32' ? 'start' : 'xdg-open'
    exec(`${command} http://localhost:${port}`)
  }
}
