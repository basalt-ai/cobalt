import { resolve } from 'node:path'
import * as core from '@actions/core'
import * as github from '@actions/github'
import { generateAISummaries } from './ai-summary'
import { downloadPreviousResults, uploadResults } from './artifacts'
import { installDependencies, runCobalt } from './cobalt'
import { deleteComment, upsertComment } from './comment'
import { buildComparisons } from './compare'
import { parseInputs, resolvePackageManager } from './inputs'
import { generateCommentBody } from './markdown'

export async function run(): Promise<void> {
	try {
		const inputs = parseInputs()
		const cwd = resolve(process.cwd(), inputs.workingDirectory)
		const packageManager = resolvePackageManager(inputs, cwd)

		core.info(`Working directory: ${cwd}`)
		core.info(`Package manager: ${packageManager}`)

		// Set API key in environment if provided
		if (inputs.apiKey) {
			core.exportVariable('OPENAI_API_KEY', inputs.apiKey)
		}

		// Post initial "in progress" comment
		if (inputs.commentOnPr) {
			await upsertComment(
				'## Cobalt Experiment Results\n\nExperiments in progress... \u231B',
				inputs.githubToken,
				inputs.stepKey,
			)
		}

		// Install dependencies
		if (inputs.installDeps) {
			await installDependencies(packageManager, cwd)
		}

		// Run cobalt and collect reports
		const reports = await runCobalt({
			experimentFiles: inputs.experimentFiles,
			ci: inputs.ci,
			cwd,
			packageManager,
		})

		if (reports.length === 0) {
			core.warning('No experiment reports were produced')
			if (inputs.commentOnPr) {
				await deleteComment(inputs.githubToken, inputs.stepKey)
			}
			return
		}

		core.info(`Collected ${reports.length} experiment report(s)`)

		// Download previous results for comparison
		let previousReports = null
		try {
			const baseBranch = github.context.payload.pull_request?.base?.ref ?? 'main'
			previousReports = await downloadPreviousResults(inputs.githubToken, baseBranch)
			if (previousReports) {
				core.info(`Found ${previousReports.length} previous report(s) for comparison`)
			}
		} catch (error) {
			core.info(`No previous results for comparison: ${error}`)
		}

		// Build comparisons
		const comparisons = buildComparisons(reports, previousReports)

		// Generate AI summaries (if enabled)
		let aiSummaries: Map<string, string> | undefined
		if (inputs.aiSummary && inputs.apiKey) {
			core.info('Generating AI summaries...')
			aiSummaries = await generateAISummaries(comparisons, inputs.apiKey)
			core.info(`Generated ${aiSummaries.size} AI summary(ies)`)
		}

		// Generate and post comment
		if (inputs.commentOnPr) {
			const body = generateCommentBody(comparisons, {
				showCIStatus: inputs.ci,
				aiSummaries,
			})
			await upsertComment(body, inputs.githubToken, inputs.stepKey)
		}

		// Upload results as artifact for future comparison
		await uploadResults(reports)

		// Set outputs
		const allPassed = reports.every(r => !r.ciStatus || r.ciStatus.passed)
		core.setOutput('passed', allPassed.toString())
		core.setOutput('total_experiments', reports.length.toString())
		core.setOutput(
			'summary_json',
			JSON.stringify(
				reports.map(r => ({
					name: r.name,
					scores: r.summary.scores,
					ciStatus: r.ciStatus,
				})),
			),
		)

		// Fail the action if CI mode and thresholds failed
		if (inputs.ci && !allPassed) {
			const failedExperiments = reports.filter(r => r.ciStatus && !r.ciStatus.passed)
			core.setFailed(`${failedExperiments.length} experiment(s) failed CI threshold checks`)
		}
	} catch (error) {
		const message = error instanceof Error ? error.message : `Unexpected error: ${error}`
		core.setFailed(message)

		// Clean up the "in progress" comment — replace it with the error
		try {
			const inputs = parseInputs()
			if (inputs.commentOnPr) {
				await upsertComment(
					`## Cobalt Experiment Results\n\n:x: **Failed:** ${message}`,
					inputs.githubToken,
					inputs.stepKey,
				)
			}
		} catch {
			// Best-effort — don't mask the original error
		}
	}
}
