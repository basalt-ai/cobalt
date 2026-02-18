import { describe, expect, it } from 'vitest'
import { CLIReporter } from '../../../../src/cli/reporters/cli-reporter.js'
import { GitHubActionsReporter } from '../../../../src/cli/reporters/github-actions-reporter.js'
import { createReporters } from '../../../../src/cli/reporters/index.js'
import { JSONReporter } from '../../../../src/cli/reporters/json-reporter.js'

describe('createReporters', () => {
	it('should create CLIReporter for "cli" type', () => {
		const reporters = createReporters(['cli'])

		expect(reporters).toHaveLength(1)
		expect(reporters[0]).toBeInstanceOf(CLIReporter)
	})

	it('should create JSONReporter for "json" type', () => {
		const reporters = createReporters(['json'])

		expect(reporters).toHaveLength(1)
		expect(reporters[0]).toBeInstanceOf(JSONReporter)
	})

	it('should create GitHubActionsReporter for "github-actions" type', () => {
		const reporters = createReporters(['github-actions'])

		expect(reporters).toHaveLength(1)
		expect(reporters[0]).toBeInstanceOf(GitHubActionsReporter)
	})

	it('should create multiple reporters', () => {
		const reporters = createReporters(['cli', 'json', 'github-actions'])

		expect(reporters).toHaveLength(3)
		expect(reporters[0]).toBeInstanceOf(CLIReporter)
		expect(reporters[1]).toBeInstanceOf(JSONReporter)
		expect(reporters[2]).toBeInstanceOf(GitHubActionsReporter)
	})

	it('should default to CLI reporter when no types provided', () => {
		const reporters = createReporters()

		expect(reporters).toHaveLength(1)
		expect(reporters[0]).toBeInstanceOf(CLIReporter)
	})

	it('should throw for unknown reporter type', () => {
		expect(() => createReporters(['unknown' as ReporterType])).toThrow(
			'Unknown reporter type: unknown',
		)
	})
})
