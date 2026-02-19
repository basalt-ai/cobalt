/**
 * Shared mock ExperimentReport fixtures for dogfood experiments.
 *
 * These provide realistic test data for evaluating the quality of
 * Cobalt's AI chat and analysis features.
 */

import type { ExperimentReport } from '../src/types/index.js'

// ============================================================================
// Report A: High-Quality Run — "customer-support-agent"
// Strong scores overall, one notable outlier on helpfulness (item #2).
// ============================================================================

export const highQualityReport: ExperimentReport = {
	id: 'rpt-hq-20260215-a1b2c3',
	name: 'customer-support-agent',
	timestamp: '2026-02-15T10:30:00.000Z',
	tags: ['production', 'v2.1'],
	config: {
		runs: 1,
		concurrency: 5,
		timeout: 30000,
		evaluators: ['relevance', 'helpfulness', 'format-check'],
	},
	summary: {
		totalItems: 6,
		totalDurationMs: 9200,
		avgLatencyMs: 1533,
		totalTokens: 3600,
		estimatedCost: 0.0054,
		scores: {
			relevance: { avg: 0.912, min: 0.75, max: 1.0, p50: 0.95, p95: 1.0, p99: 1.0 },
			helpfulness: { avg: 0.783, min: 0.3, max: 1.0, p50: 0.85, p95: 1.0, p99: 1.0 },
			'format-check': { avg: 0.95, min: 0.8, max: 1.0, p50: 1.0, p95: 1.0, p99: 1.0 },
		},
	},
	items: [
		{
			index: 0,
			input: {
				input: 'How do I reset my password?',
				expectedOutput: 'Step-by-step password reset instructions',
			},
			output: {
				output:
					'To reset your password: 1) Go to Settings > Account. 2) Click "Reset Password". 3) Enter your email and follow the link sent to your inbox. 4) Create a new password with at least 8 characters.',
			},
			latencyMs: 1200,
			evaluations: {
				relevance: {
					score: 0.95,
					reason: 'Directly addresses the password reset question with clear steps',
				},
				helpfulness: { score: 0.9, reason: 'Provides actionable step-by-step instructions' },
				'format-check': { score: 1.0, reason: 'Well-structured numbered list' },
			},
			runs: [],
		},
		{
			index: 1,
			input: {
				input: 'Can I get a refund for my subscription?',
				expectedOutput: 'Refund policy explanation with clear next steps',
			},
			output: {
				output:
					'Refunds depend on your plan type. Please check our terms of service for more details.',
			},
			latencyMs: 980,
			evaluations: {
				relevance: { score: 0.75, reason: 'Mentions refunds but is vague' },
				helpfulness: {
					score: 0.3,
					reason: 'Does not provide actionable steps for getting a refund',
				},
				'format-check': { score: 0.8, reason: 'Response is too brief and lacks structure' },
			},
			runs: [],
		},
		{
			index: 2,
			input: {
				input: 'Why is my app running slowly?',
				expectedOutput: 'Troubleshooting steps for performance issues',
			},
			output: {
				output:
					'Performance issues can be caused by several factors. Try: 1) Clearing your cache. 2) Checking your internet connection. 3) Updating to the latest version. 4) Closing background applications. If the issue persists, contact support with your device details.',
			},
			latencyMs: 1450,
			evaluations: {
				relevance: { score: 0.95, reason: 'Covers multiple common causes of slow performance' },
				helpfulness: { score: 0.95, reason: 'Provides multiple concrete troubleshooting steps' },
				'format-check': { score: 1.0, reason: 'Clear numbered list with escalation path' },
			},
			runs: [],
		},
		{
			index: 3,
			input: {
				input: 'How do I cancel my account?',
				expectedOutput: 'Account cancellation process',
			},
			output: {
				output:
					'To cancel your account: Go to Settings > Account > Subscription, then click "Cancel Subscription". Your access will continue until the end of the current billing period. You can reactivate at any time.',
			},
			latencyMs: 1100,
			evaluations: {
				relevance: { score: 1.0, reason: 'Directly explains the cancellation process' },
				helpfulness: {
					score: 0.9,
					reason: 'Clear steps with additional context about billing period',
				},
				'format-check': { score: 1.0, reason: 'Concise and well-organized' },
			},
			runs: [],
		},
		{
			index: 4,
			input: {
				input: 'What integrations do you support?',
				expectedOutput: 'List of supported integrations',
			},
			output: {
				output:
					'We support integrations with: Slack, Microsoft Teams, Jira, GitHub, GitLab, Notion, Linear, and Zapier. You can configure them in Settings > Integrations. Each integration has setup documentation available in our docs.',
			},
			latencyMs: 1800,
			evaluations: {
				relevance: { score: 0.9, reason: 'Lists integrations and where to configure them' },
				helpfulness: { score: 0.85, reason: 'Comprehensive list with setup guidance' },
				'format-check': { score: 0.9, reason: 'Good structure, could use bullet points' },
			},
			runs: [],
		},
		{
			index: 5,
			input: { input: 'Is my data encrypted?', expectedOutput: 'Security and encryption details' },
			output: {
				output:
					'Yes, all data is encrypted at rest (AES-256) and in transit (TLS 1.3). We also support SSO and SOC 2 compliance. For detailed security documentation, visit our Trust Center page.',
			},
			latencyMs: 2670,
			evaluations: {
				relevance: { score: 0.92, reason: 'Addresses encryption and security comprehensively' },
				helpfulness: {
					score: 0.8,
					reason: 'Specific encryption standards mentioned with reference to more info',
				},
				'format-check': { score: 1.0, reason: 'Concise with specific details' },
			},
			runs: [],
		},
	],
}

// ============================================================================
// Report B: Problematic Run — "customer-support-agent" (earlier version)
// Same experiment, worse scores. Multiple items below 0.5.
// ============================================================================

export const problematicReport: ExperimentReport = {
	id: 'rpt-prob-20260210-d4e5f6',
	name: 'customer-support-agent',
	timestamp: '2026-02-10T14:00:00.000Z',
	tags: ['staging', 'v1.0'],
	config: {
		runs: 1,
		concurrency: 5,
		timeout: 30000,
		evaluators: ['relevance', 'helpfulness', 'format-check'],
	},
	summary: {
		totalItems: 6,
		totalDurationMs: 11400,
		avgLatencyMs: 1900,
		totalTokens: 4800,
		estimatedCost: 0.0072,
		scores: {
			relevance: { avg: 0.583, min: 0.3, max: 0.85, p50: 0.575, p95: 0.85, p99: 0.85 },
			helpfulness: { avg: 0.45, min: 0.2, max: 0.7, p50: 0.45, p95: 0.7, p99: 0.7 },
			'format-check': { avg: 0.617, min: 0.3, max: 0.9, p50: 0.6, p95: 0.9, p99: 0.9 },
		},
	},
	items: [
		{
			index: 0,
			input: {
				input: 'How do I reset my password?',
				expectedOutput: 'Step-by-step password reset instructions',
			},
			output: {
				output:
					'You can reset your password in the settings somewhere. Look around in the account section.',
			},
			latencyMs: 1500,
			evaluations: {
				relevance: { score: 0.6, reason: 'Vaguely addresses the topic but lacks specifics' },
				helpfulness: { score: 0.4, reason: 'No concrete steps provided' },
				'format-check': { score: 0.5, reason: 'Unstructured and vague' },
			},
			runs: [],
		},
		{
			index: 1,
			input: {
				input: 'Can I get a refund for my subscription?',
				expectedOutput: 'Refund policy explanation with clear next steps',
			},
			output: { output: 'I think we have a refund policy. You might want to check the website.' },
			latencyMs: 2100,
			evaluations: {
				relevance: { score: 0.4, reason: 'Barely addresses the refund question' },
				helpfulness: { score: 0.2, reason: 'Provides no useful information or next steps' },
				'format-check': { score: 0.3, reason: 'Too brief and unhelpful' },
			},
			runs: [],
		},
		{
			index: 2,
			input: {
				input: 'Why is my app running slowly?',
				expectedOutput: 'Troubleshooting steps for performance issues',
			},
			output: {
				output:
					'Performance issues could be on your end. Try restarting your device. If that does not work, it might be a server issue on our side.',
			},
			latencyMs: 1800,
			evaluations: {
				relevance: {
					score: 0.55,
					reason: 'Mentions performance but offers minimal troubleshooting',
				},
				helpfulness: { score: 0.45, reason: 'Only one concrete suggestion (restart)' },
				'format-check': { score: 0.6, reason: 'No structured format' },
			},
			runs: [],
		},
		{
			index: 3,
			input: {
				input: 'How do I cancel my account?',
				expectedOutput: 'Account cancellation process',
			},
			output: {
				output:
					'To cancel, go to your account settings and look for the cancellation option. It should be there somewhere in the subscription area.',
			},
			latencyMs: 1650,
			evaluations: {
				relevance: { score: 0.7, reason: 'Points in the right direction but is imprecise' },
				helpfulness: { score: 0.5, reason: 'Vague directions without exact steps' },
				'format-check': { score: 0.7, reason: 'Acceptable but could be more structured' },
			},
			runs: [],
		},
		{
			index: 4,
			input: {
				input: 'What integrations do you support?',
				expectedOutput: 'List of supported integrations',
			},
			output: {
				output:
					'We support a bunch of integrations including Slack and some project management tools. Check our docs for the full list.',
			},
			latencyMs: 2200,
			evaluations: {
				relevance: { score: 0.85, reason: 'Mentions integrations and points to docs' },
				helpfulness: { score: 0.7, reason: 'Mentions Slack but incomplete list; defers to docs' },
				'format-check': { score: 0.9, reason: 'Reasonable structure' },
			},
			runs: [],
		},
		{
			index: 5,
			input: { input: 'Is my data encrypted?', expectedOutput: 'Security and encryption details' },
			output: { output: 'Yes, we take security seriously. Your data is safe with us.' },
			latencyMs: 2150,
			evaluations: {
				relevance: { score: 0.3, reason: 'Mentions security but provides no technical details' },
				helpfulness: { score: 0.35, reason: 'No specific encryption standards or compliance info' },
				'format-check': { score: 0.7, reason: 'Concise but lacks substance' },
			},
			runs: [],
		},
	],
}

// ============================================================================
// Report C: Code Review Agent — different experiment
// Decent accuracy, thoroughness needs improvement.
// ============================================================================

export const codeReviewReport: ExperimentReport = {
	id: 'rpt-cr-20260214-g7h8i9',
	name: 'code-review-agent',
	timestamp: '2026-02-14T09:15:00.000Z',
	tags: ['dev', 'v1.2'],
	config: {
		runs: 1,
		concurrency: 3,
		timeout: 45000,
		evaluators: ['accuracy', 'thoroughness'],
	},
	summary: {
		totalItems: 4,
		totalDurationMs: 18600,
		avgLatencyMs: 4650,
		totalTokens: 8200,
		estimatedCost: 0.0123,
		scores: {
			accuracy: { avg: 0.825, min: 0.7, max: 0.95, p50: 0.825, p95: 0.95, p99: 0.95 },
			thoroughness: { avg: 0.688, min: 0.5, max: 0.9, p50: 0.675, p95: 0.9, p99: 0.9 },
		},
	},
	items: [
		{
			index: 0,
			input: {
				input: 'Review this function for SQL injection vulnerabilities',
				expectedOutput: 'Identify parameterized query issues',
			},
			output: {
				output:
					'The function uses string concatenation for SQL queries which is vulnerable to SQL injection. Use parameterized queries instead. Replace `query = "SELECT * FROM users WHERE id = " + userId` with a prepared statement.',
			},
			latencyMs: 3800,
			evaluations: {
				accuracy: {
					score: 0.95,
					reason: 'Correctly identifies SQL injection vulnerability and suggests fix',
				},
				thoroughness: {
					score: 0.9,
					reason: 'Identifies root cause and provides specific code fix',
				},
			},
			runs: [],
		},
		{
			index: 1,
			input: {
				input: 'Review this React component for performance issues',
				expectedOutput: 'Identify unnecessary re-renders and missing memoization',
			},
			output: {
				output:
					'The component re-renders on every parent update. Consider wrapping it with React.memo and using useMemo for the expensive computation in the render body.',
			},
			latencyMs: 4200,
			evaluations: {
				accuracy: { score: 0.85, reason: 'Correctly identifies re-render issue' },
				thoroughness: {
					score: 0.65,
					reason: 'Mentions memo but misses useCallback for event handlers',
				},
			},
			runs: [],
		},
		{
			index: 2,
			input: {
				input: 'Review this API endpoint for error handling',
				expectedOutput: 'Identify missing error cases and validation',
			},
			output: {
				output:
					'The endpoint lacks input validation for required fields and does not handle database connection errors gracefully. Add try-catch blocks and validate request body with a schema.',
			},
			latencyMs: 5100,
			evaluations: {
				accuracy: { score: 0.8, reason: 'Identifies missing validation and error handling' },
				thoroughness: {
					score: 0.7,
					reason: 'Good coverage but misses rate limiting and auth checks',
				},
			},
			runs: [],
		},
		{
			index: 3,
			input: {
				input: 'Review this authentication middleware',
				expectedOutput: 'Identify token validation and session management issues',
			},
			output: {
				output:
					'The middleware checks token presence but does not validate the signature. This could allow forged tokens. Use a proper JWT verification library.',
			},
			latencyMs: 5500,
			evaluations: {
				accuracy: {
					score: 0.7,
					reason: 'Identifies signature issue but misses token expiration check',
				},
				thoroughness: {
					score: 0.5,
					reason:
						'Only covers one of several security concerns (signature, expiry, refresh, revocation)',
				},
			},
			runs: [],
		},
	],
}
