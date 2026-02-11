import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import { Hono } from 'hono';
import { compareRuns } from './api/compare.js';
import { getRunDetail, getRuns } from './api/runs.js';
import { getTrends } from './api/trends.js';

function getDashboardRoot(): string {
	const currentDir = dirname(fileURLToPath(import.meta.url));
	// In built package: server runs from dist/, dashboard is at dist/dashboard/
	const fromDist = resolve(currentDir, 'dashboard');
	if (existsSync(fromDist)) return fromDist;
	// Fallback: try one level up (e.g., running from source via tsx)
	return resolve(currentDir, '../../dist/dashboard');
}

/**
 * Start the Cobalt dashboard server
 * @param port - Port to listen on
 * @param open - Whether to open browser automatically
 */
export async function startDashboard(port = 4000, open = true): Promise<void> {
	const app = new Hono();

	// API routes
	app.get('/api/runs', getRuns);
	app.get('/api/runs/:id', getRunDetail);
	app.get('/api/compare', compareRuns);
	app.get('/api/trends', getTrends);

	// API index
	app.get('/api', (c) =>
		c.json({
			name: 'Cobalt Dashboard API',
			endpoints: ['/api/runs', '/api/runs/:id', '/api/compare', '/api/trends', '/api/health'],
		}),
	);

	// Health check
	app.get('/api/health', (c) => c.json({ status: 'ok' }));

	// Serve dashboard static files
	const dashboardRoot = getDashboardRoot();
	const hasDashboard = existsSync(resolve(dashboardRoot, 'index.html'));

	if (hasDashboard) {
		app.use('/*', serveStatic({ root: dashboardRoot }));
		// SPA fallback: serve index.html for non-API routes
		app.get('*', serveStatic({ root: dashboardRoot, path: 'index.html' }));
	} else {
		app.get('*', (c) =>
			c.json({
				message: 'Dashboard not built. Run `pnpm build:dashboard` first.',
				api: `http://localhost:${port}/api`,
			}),
		);
	}

	// Start server
	console.log('\n🔷 Cobalt Dashboard');
	console.log(`   Server: http://localhost:${port}`);
	console.log(`   API: http://localhost:${port}/api`);
	console.log('');

	serve({
		fetch: app.fetch,
		port,
	});

	// Open browser if requested
	if (open) {
		const { exec } = await import('node:child_process');
		const command =
			process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'start' : 'xdg-open';
		exec(`${command} http://localhost:${port}`);
	}
}
