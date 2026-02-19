import { spawn } from 'node:child_process'
import * as core from '@actions/core'
import type { PackageManager } from './inputs'
import type { ExperimentReport, JsonEvent } from './types'

interface RunOptions {
	experimentFiles: string
	filter: string
	concurrency: string
	ci: boolean
	cwd: string
	packageManager: PackageManager
}

export async function installDependencies(
	packageManager: PackageManager,
	cwd: string,
): Promise<void> {
	const commands: Record<PackageManager, string[]> = {
		npm: ['npm', 'install'],
		pnpm: ['pnpm', 'install'],
		yarn: ['yarn', 'install'],
	}

	const [cmd, ...args] = commands[packageManager]
	if (!cmd) {
		throw new Error(`Unknown package manager: ${packageManager}`)
	}

	core.info(`Installing dependencies with ${packageManager}...`)

	await execCommand(cmd, args, cwd)
}

export async function runCobalt(options: RunOptions): Promise<ExperimentReport[]> {
	const { experimentFiles, ci, cwd, packageManager } = options

	const runnerArgs = buildRunnerArgs(packageManager)
	const cobaltArgs = ['run', '--reporter', 'json']

	if (ci) {
		cobaltArgs.push('--ci')
	}

	if (options.filter) {
		cobaltArgs.push('--filter', options.filter)
	}

	if (options.concurrency) {
		const value = Number.parseInt(options.concurrency, 10)
		if (!Number.isNaN(value) && value > 0) {
			cobaltArgs.push('--concurrency', options.concurrency)
		} else {
			core.warning(`Invalid concurrency value "${options.concurrency}", ignoring`)
		}
	}

	if (experimentFiles) {
		for (const file of experimentFiles.split(',')) {
			const trimmed = file.trim()
			if (trimmed) {
				cobaltArgs.push('--file', trimmed)
			}
		}
	}

	const [cmd, ...baseArgs] = runnerArgs
	if (!cmd) {
		throw new Error('Failed to build runner command')
	}
	const allArgs = [...baseArgs, ...cobaltArgs]

	core.info(`Running: ${cmd} ${allArgs.join(' ')}`)

	return parseExperimentOutput(cmd, allArgs, cwd)
}

function buildRunnerArgs(_packageManager: PackageManager): string[] {
	// Always use npx to run cobalt — it resolves binaries from node_modules/.bin/
	// up the directory tree, which works universally regardless of package manager
	// and even when running from within the cobalt package itself (dogfood case).
	return ['npx', 'cobalt']
}

function parseExperimentOutput(
	cmd: string,
	args: string[],
	cwd: string,
): Promise<ExperimentReport[]> {
	return new Promise((resolve, reject) => {
		const reports: ExperimentReport[] = []
		const errors: string[] = []
		let buffer = ''

		const child = spawn(cmd, args, {
			cwd,
			shell: true,
			env: { ...process.env },
			stdio: ['ignore', 'pipe', 'pipe'],
		})

		child.stdout.on('data', (data: Buffer) => {
			buffer += data.toString()
			const lines = buffer.split('\n')
			// Keep the last incomplete line in the buffer
			buffer = lines.pop() ?? ''

			for (const line of lines) {
				const trimmed = line.trim()
				if (!trimmed) continue

				const event = tryParseJsonEvent(trimmed)
				if (!event) {
					// Non-JSON output (e.g. "🔷 Cobalt" header) — forward as info
					core.info(trimmed)
					continue
				}

				switch (event.type) {
					case 'experiment_complete':
						reports.push(event.data.report)
						core.info(`Experiment completed: ${event.data.report.name}`)
						break
					case 'error':
						errors.push(event.data.message)
						core.error(`Experiment error: ${event.data.message}`)
						break
					case 'experiment_start':
						core.info('Starting experiment...')
						break
					case 'ci_status':
						if (!event.data.passed) {
							core.warning(`CI threshold check failed: ${event.data.summary}`)
						}
						break
					case 'progress':
						// Silently consumed
						break
				}
			}
		})

		child.stderr.on('data', (data: Buffer) => {
			const text = data.toString().trim()
			if (text) {
				core.warning(`stderr: ${text}`)
			}
		})

		child.on('close', code => {
			// Process any remaining buffered data
			if (buffer.trim()) {
				const event = tryParseJsonEvent(buffer.trim())
				if (event?.type === 'experiment_complete') {
					reports.push(event.data.report)
				}
			}

			if (code !== 0 && reports.length === 0) {
				reject(
					new Error(
						`Cobalt exited with code ${code}. ${errors.length > 0 ? errors.join('; ') : 'No experiment results produced.'}`,
					),
				)
			} else {
				resolve(reports)
			}
		})

		child.on('error', err => {
			reject(new Error(`Failed to spawn cobalt: ${err.message}`))
		})
	})
}

function tryParseJsonEvent(line: string): JsonEvent | null {
	try {
		const parsed = JSON.parse(line) as Record<string, unknown>
		if (typeof parsed.type === 'string' && 'data' in parsed) {
			return parsed as unknown as JsonEvent
		}
		return null
	} catch {
		return null
	}
}

function execCommand(cmd: string, args: string[], cwd: string): Promise<void> {
	return new Promise((resolve, reject) => {
		const child = spawn(cmd, args, {
			cwd,
			shell: true,
			env: { ...process.env },
			stdio: ['ignore', 'pipe', 'pipe'],
		})

		child.stdout.on('data', (data: Buffer) => {
			core.info(data.toString().trim())
		})

		child.stderr.on('data', (data: Buffer) => {
			const text = data.toString().trim()
			if (text) core.info(text)
		})

		child.on('close', code => {
			if (code !== 0) {
				reject(new Error(`Command "${cmd} ${args.join(' ')}" exited with code ${code}`))
			} else {
				resolve()
			}
		})

		child.on('error', err => {
			reject(new Error(`Failed to run "${cmd}": ${err.message}`))
		})
	})
}
