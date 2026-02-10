import { loadConfig } from '../../core/config.js';

/**
 * MCP Resource: cobalt://config
 * Provides current Cobalt configuration
 */
export const cobaltConfigResource = {
	uri: 'cobalt://config',
	name: 'Cobalt Configuration',
	description: 'Current cobalt.config.ts parsed configuration',
	mimeType: 'application/json',
};

/**
 * Handle cobalt://config resource request
 */
export async function handleCobaltConfig() {
	try {
		const config = await loadConfig();

		return {
			contents: [
				{
					uri: 'cobalt://config',
					mimeType: 'application/json',
					text: JSON.stringify(config, null, 2),
				},
			],
		};
	} catch (error) {
		return {
			contents: [
				{
					uri: 'cobalt://config',
					mimeType: 'application/json',
					text: JSON.stringify(
						{
							error: error instanceof Error ? error.message : 'Failed to load config',
						},
						null,
						2,
					),
				},
			],
		};
	}
}
