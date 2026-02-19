import { defineCommand } from 'citty'
import pc from 'picocolors'
import { loadConfig } from '../../core/config'
import { startDashboard } from '../../dashboard/server'
import type { DashboardChatConfig } from '../../types'

/**
 * Resolve the dashboard chat config.
 * If the user didn't configure chat explicitly, auto-enable it when OPENAI_API_KEY is available.
 */
export function resolveChatConfig(
	explicit: DashboardChatConfig | undefined,
): DashboardChatConfig | undefined {
	return (
		explicit ??
		(process.env.OPENAI_API_KEY ? { provider: 'openai' as const, model: 'gpt-5-mini' } : undefined)
	)
}

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
		// Auto-load .env file if present
		try {
			const dotenv = await import('dotenv')
			dotenv.config()
		} catch {
			// dotenv not available, skip
		}

		try {
			const config = await loadConfig()

			const port = args.port ? Number.parseInt(args.port, 10) : config.dashboard.port
			const open = !args['no-open'] && config.dashboard.open

			const chatConfig = resolveChatConfig(config.dashboard.chat)
			await startDashboard(port, open, chatConfig)

			// Keep process alive
			await new Promise(() => {})
		} catch (error) {
			console.error(pc.red('\n❌ Failed to start dashboard:'), error)
			process.exit(1)
		}
	},
})
