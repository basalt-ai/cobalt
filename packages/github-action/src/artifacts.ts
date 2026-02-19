import { mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { DefaultArtifactClient } from '@actions/artifact'
import * as core from '@actions/core'
import * as github from '@actions/github'
import AdmZip from 'adm-zip'
import type { ExperimentReport } from './types'

const ARTIFACT_NAME = 'cobalt-experiment-results'

/**
 * Upload experiment results as a GitHub Actions artifact.
 */
export async function uploadResults(reports: ExperimentReport[]): Promise<void> {
	const client = new DefaultArtifactClient()
	const tmpDir = join(tmpdir(), `cobalt-results-${Date.now()}`)
	mkdirSync(tmpDir, { recursive: true })

	const filePath = join(tmpDir, 'results.json')
	writeFileSync(filePath, JSON.stringify(reports, null, 2), 'utf-8')

	try {
		await client.uploadArtifact(ARTIFACT_NAME, [filePath], tmpDir)
		core.info(`Uploaded experiment results as artifact: ${ARTIFACT_NAME}`)
	} finally {
		try {
			rmSync(tmpDir, { recursive: true, force: true })
		} catch {
			// Non-critical: temp dirs are cleaned up by the OS eventually
		}
	}
}

/**
 * Download previous experiment results from the base branch.
 * Uses the GitHub API to find the most recent successful workflow run
 * on the base branch, then downloads its artifact.
 */
export async function downloadPreviousResults(
	githubToken: string,
	baseBranch: string,
): Promise<ExperimentReport[] | null> {
	const octokit = github.getOctokit(githubToken)
	const { owner, repo } = github.context.repo

	// Find the most recent successful workflow run on the base branch
	const { data: runs } = await octokit.rest.actions.listWorkflowRunsForRepo({
		owner,
		repo,
		branch: baseBranch,
		status: 'success',
		per_page: 10,
	})

	if (runs.workflow_runs.length === 0) {
		core.info(`No successful workflow runs found on ${baseBranch}`)
		return null
	}

	// Search for the cobalt results artifact in recent runs
	for (const run of runs.workflow_runs) {
		const { data: artifacts } = await octokit.rest.actions.listWorkflowRunArtifacts({
			owner,
			repo,
			run_id: run.id,
		})

		const cobaltArtifact = artifacts.artifacts.find(a => a.name === ARTIFACT_NAME)

		if (cobaltArtifact) {
			core.info(`Found previous results in run #${run.run_number} (${run.head_sha.slice(0, 7)})`)

			// Download the artifact
			const { data: download } = await octokit.rest.actions.downloadArtifact({
				owner,
				repo,
				artifact_id: cobaltArtifact.id,
				archive_format: 'zip',
			})

			// The download returns a zip file as an ArrayBuffer
			const zipBuffer = Buffer.from(download as ArrayBuffer)
			return extractResultsFromZip(zipBuffer)
		}
	}

	core.info(`No previous cobalt results found on ${baseBranch}`)
	return null
}

function extractResultsFromZip(zipBuffer: Buffer): ExperimentReport[] | null {
	try {
		const zip = new AdmZip(zipBuffer)
		const entry = zip.getEntry('results.json')

		if (!entry) {
			core.warning('Artifact downloaded but results.json not found inside')
			return null
		}

		const content = entry.getData().toString('utf-8')
		return JSON.parse(content) as ExperimentReport[]
	} catch (error) {
		core.warning(`Failed to extract previous results: ${error}`)
		return null
	}
}
