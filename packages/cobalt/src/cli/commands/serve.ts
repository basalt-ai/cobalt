import { defineCommand } from 'citty';
import pc from 'picocolors';
import { loadConfig } from '../../core/config.js';
import { startDashboard } from '../../dashboard/server.js';

export default defineCommand({
	meta: {
		name: 'serve',
		description: 'Start the Cobalt dashboard server',
	},
	args: {
		port: {
			type: 'string',
			description: 'Port to listen on',
			alias: 'p',
		},
		'no-open': {
			type: 'boolean',
			description: 'Do not open browser automatically',
		},
	},
	async run({ args }) {
		try {
			const config = await loadConfig();

			const port = args.port ? Number.parseInt(args.port, 10) : config.dashboard.port;
			const open = !args['no-open'] && config.dashboard.open;

			await startDashboard(port, open);

			// Keep process alive
			await new Promise(() => {});
		} catch (error) {
			console.error(pc.red('\n❌ Failed to start dashboard:'), error);
			process.exit(1);
		}
	},
});
