import { existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import * as core from '@actions/core'
import * as github from '@actions/github'
import { z } from 'zod'

export type PackageManager = 'npm' | 'pnpm' | 'yarn'

const inputSchema = z.object({
	experimentFiles: z.string(),
	filter: z.string(),
	concurrency: z.string(),
	workingDirectory: z.string(),
	ci: z.boolean(),
	apiKey: z.string(),
	aiSummary: z.boolean(),
	githubToken: z.string(),
	commentOnPr: z.boolean(),
	packageManager: z.enum(['npm', 'pnpm', 'yarn', 'auto']),
	installDeps: z.boolean(),
	stepKey: z.string(),
})

export type ActionInputs = z.infer<typeof inputSchema>

export function parseInputs(): ActionInputs {
	return inputSchema.parse({
		experimentFiles: core.getInput('experiment_files'),
		filter: core.getInput('filter'),
		concurrency: core.getInput('concurrency'),
		workingDirectory: core.getInput('working_directory') || '.',
		ci: core.getBooleanInput('ci'),
		apiKey: core.getInput('api_key'),
		aiSummary: core.getBooleanInput('ai_summary'),
		githubToken: core.getInput('github_token'),
		commentOnPr: core.getBooleanInput('comment_on_pr'),
		packageManager: core.getInput('package_manager') || 'auto',
		installDeps: core.getBooleanInput('install_deps'),
		stepKey: core.getInput('step_key') || `${github.context.workflow}-${github.context.action}`,
	})
}

export function detectPackageManager(cwd: string): PackageManager {
	// Walk up from cwd to find a lockfile (handles monorepos where lockfile is at root)
	let dir = resolve(cwd)
	const root = dirname(dir) === dir ? dir : undefined
	while (dir) {
		if (existsSync(resolve(dir, 'pnpm-lock.yaml'))) return 'pnpm'
		if (existsSync(resolve(dir, 'yarn.lock'))) return 'yarn'
		if (existsSync(resolve(dir, 'package-lock.json'))) return 'npm'
		const parent = dirname(dir)
		if (parent === dir || parent === root) break
		dir = parent
	}
	return 'npm'
}

export function resolvePackageManager(inputs: ActionInputs, cwd: string): PackageManager {
	if (inputs.packageManager === 'auto') {
		return detectPackageManager(cwd)
	}
	return inputs.packageManager
}

export type AIProvider = 'openai' | 'anthropic'

/**
 * Detect the AI provider from the API key prefix.
 * Anthropic keys start with "sk-ant-", everything else is treated as OpenAI.
 */
export function detectAIProvider(apiKey: string): AIProvider {
	return apiKey.startsWith('sk-ant-') ? 'anthropic' : 'openai'
}
