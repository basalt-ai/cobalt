import { defineCommand } from 'citty';
import { startMCPServer } from '../../mcp/server.js';

export default defineCommand({
	meta: {
		name: 'mcp',
		description: 'Start the MCP server for Claude Code integration',
	},
	async run() {
		try {
			await startMCPServer();
			// Keep process alive
			await new Promise(() => {});
		} catch (error) {
			console.error('Failed to start MCP server:', error);
			process.exit(1);
		}
	},
});
