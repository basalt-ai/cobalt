import * as core from '@actions/core'
import * as github from '@actions/github'

type Octokit = ReturnType<typeof github.getOctokit>

interface PullRequest {
	owner: string
	repo: string
	issue_number: number
}

/**
 * Create or update a comment on the associated PR(s).
 * Uses an HTML comment marker for deduplication (upsert pattern).
 */
export async function upsertComment(
	body: string,
	githubToken: string,
	stepKey: string,
): Promise<void> {
	const octokit = github.getOctokit(githubToken)
	const prs = await inferPullRequests(octokit)

	if (prs.length === 0) {
		core.info('No pull request found — skipping PR comment')
		return
	}

	const commentKey = `<!-- cobalt_eval_comment ${stepKey} -->`

	await Promise.all(prs.map(pr => createOrUpdateComment(octokit, pr, body, commentKey)))
}

/**
 * Delete an existing cobalt comment from the associated PR(s).
 */
export async function deleteComment(githubToken: string, stepKey: string): Promise<void> {
	const octokit = github.getOctokit(githubToken)
	const prs = await inferPullRequests(octokit)
	const commentKey = `<!-- cobalt_eval_comment ${stepKey} -->`

	for (const pr of prs) {
		const existing = await findComment(octokit, pr, commentKey)
		if (existing) {
			await octokit.rest.issues.deleteComment({
				owner: pr.owner,
				repo: pr.repo,
				comment_id: existing.id,
			})
			core.info(`Deleted PR comment (no experiments found)`)
		}
	}
}

async function createOrUpdateComment(
	octokit: Octokit,
	pr: PullRequest,
	body: string,
	commentKey: string,
): Promise<void> {
	const fullBody = `${body}\n${commentKey}`

	const existing = await findComment(octokit, pr, commentKey)

	if (existing) {
		const { data: updated } = await octokit.rest.issues.updateComment({
			owner: pr.owner,
			repo: pr.repo,
			comment_id: existing.id,
			body: fullBody,
		})
		core.info(`Updated PR comment: ${updated.html_url}`)
	} else {
		const { data: created } = await octokit.rest.issues.createComment({
			owner: pr.owner,
			repo: pr.repo,
			issue_number: pr.issue_number,
			body: fullBody,
		})
		core.info(`Created PR comment: ${created.html_url}`)
	}
}

async function findComment(
	octokit: Octokit,
	pr: PullRequest,
	commentKey: string,
): Promise<{ id: number } | undefined> {
	const { data: comments } = await octokit.rest.issues.listComments({
		owner: pr.owner,
		repo: pr.repo,
		issue_number: pr.issue_number,
		sort: 'created',
		direction: 'desc',
		per_page: 100,
	})

	const match = comments.find(c => c.body?.includes(commentKey))
	return match ? { id: match.id } : undefined
}

async function inferPullRequests(octokit: Octokit): Promise<PullRequest[]> {
	const { context } = github

	// If triggered by pull_request event, use the PR number directly
	if (
		context.payload.pull_request &&
		Number.isSafeInteger(context.issue.number) &&
		context.issue.number > 0
	) {
		return [
			{
				owner: context.repo.owner,
				repo: context.repo.repo,
				issue_number: context.issue.number,
			},
		]
	}

	// Otherwise, find PRs associated with this commit
	try {
		const { data: pulls } = await octokit.rest.repos.listPullRequestsAssociatedWithCommit({
			owner: context.repo.owner,
			repo: context.repo.repo,
			commit_sha: context.sha,
		})

		return pulls.map(p => ({
			owner: context.repo.owner,
			repo: context.repo.repo,
			issue_number: p.number,
		}))
	} catch (error) {
		core.warning(`Failed to find PRs for commit ${context.sha}: ${error}`)
		return []
	}
}
