import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import * as core from '@actions/core'
import * as github from '@actions/github'
import { z } from 'zod'

export type PackageManager = 'npm' | 'pnpm' | 'yarn'

const inputSchema = z.object({
	experimentFiles: z.string(),
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
	if (existsSync(resolve(cwd, 'pnpm-lock.yaml'))) return 'pnpm'
	if (existsSync(resolve(cwd, 'yarn.lock'))) return 'yarn'
	return 'npm'
}

export function resolvePackageManager(inputs: ActionInputs): PackageManager {
	if (inputs.packageManager === 'auto') {
		return detectPackageManager(inputs.workingDirectory)
	}
	return inputs.packageManager
}
