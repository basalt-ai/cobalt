import { loadConfig } from '../../core/config.js'
import { readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

/**
 * MCP Resource: cobalt://experiments
 * Lists all experiment files in testDir
 */
export const cobaltExperimentsResource = {
	uri: 'cobalt://experiments',
	name: 'Cobalt Experiments',
	description: 'List of all experiment files in testDir',
	mimeType: 'application/json'
}

/**
 * Recursively find all .cobalt.ts files in a directory
 */
function findExperimentFiles(dir: string): string[] {
	const results: string[] = []

	try {
		const entries = readdirSync(dir, { withFileTypes: true })

		for (const entry of entries) {
			const fullPath = join(dir, entry.name)

			if (entry.isDirectory()) {
				// Skip node_modules and hidden directories
				if (
					!entry.name.startsWith('.') &&
					entry.name !== 'node_modules'
				) {
					results.push(...findExperimentFiles(fullPath))
				}
			} else if (entry.isFile() && entry.name.endsWith('.cobalt.ts')) {
				results.push(fullPath)
			}
		}
	} catch (error) {
		// Ignore errors (e.g., permission denied)
	}

	return results
}

/**
 * Handle cobalt://experiments resource request
 */
export async function handleCobaltExperiments() {
	try {
		const config = await loadConfig()
		const testDir = join(process.cwd(), config.testDir)

		// Find all experiment files
		const files = findExperimentFiles(testDir)

		// Build result with relative paths
		const experiments = files.map((file) => ({
			path: relative(process.cwd(), file),
			name: file.split('/').pop()?.replace('.cobalt.ts', '') || 'unknown'
		}))

		return {
			contents: [
				{
					uri: 'cobalt://experiments',
					mimeType: 'application/json',
					text: JSON.stringify(
						{
							testDir: config.testDir,
							count: experiments.length,
							experiments
						},
						null,
						2
					)
				}
			]
		}
	} catch (error) {
		return {
			contents: [
				{
					uri: 'cobalt://experiments',
					mimeType: 'application/json',
					text: JSON.stringify(
						{
							error:
								error instanceof Error
									? error.message
									: 'Failed to list experiments'
						},
						null,
						2
					)
				}
			]
		}
	}
}
