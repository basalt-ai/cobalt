import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GitHubActionsReporter } from '../../../../src/cli/reporters/github-actions-reporter.js';
import type { ExperimentReport } from '../../../../src/types/index.js';

describe('GitHubActionsReporter', () => {
	let reporter: GitHubActionsReporter;
	let consoleLogs: string[];
	let tempDir: string;
	let summaryFile: string;
	let originalEnv: NodeJS.ProcessEnv;

	beforeEach(() => {
		originalEnv = { ...process.env };
		tempDir = mkdtempSync(join(tmpdir(), 'cobalt-test-gh-'));
		summaryFile = join(tempDir, 'summary.md');
		process.env.GITHUB_ACTIONS = 'true';
		process.env.GITHUB_STEP_SUMMARY = summaryFile;

		consoleLogs = [];
		vi.spyOn(console, 'log').mockImplementation((...args) => {
			consoleLogs.push(args.join(' '));
		});
	});

	afterEach(() => {
		vi.restoreAllMocks();
		process.env = originalEnv;
		try {
			rmSync(tempDir, { recursive: true, force: true });
		} catch {
			// Ignore cleanup errors
		}
	});

	describe('when GITHUB_ACTIONS is not set', () => {
		beforeEach(() => {
			process.env.GITHUB_ACTIONS = 'false';
			reporter = new GitHubActionsReporter();
		});

		it('should not output anything', () => {
			reporter.onStart({
				name: 'Test Experiment',
				datasetSize: 10,
				evaluators: ['accuracy'],
				concurrency: 5,
				timeout: 30000,
				runs: 1,
			});

			expect(consoleLogs).toHaveLength(0);
		});
	});

	describe('when GITHUB_ACTIONS is set', () => {
		beforeEach(() => {
			reporter = new GitHubActionsReporter();
		});

		describe('onStart', () => {
			it('should output group start and add to summary', () => {
				reporter.onStart({
					name: 'Test Experiment',
					datasetSize: 10,
					evaluators: ['accuracy', 'relevance'],
					concurrency: 5,
					timeout: 30000,
					runs: 1,
				});

				expect(consoleLogs.some((log) => log.includes('::group::Cobalt Experiment:'))).toBe(
					true,
				);
			});
		});

		describe('onProgress', () => {
			it('should output notice when complete', () => {
				reporter.onProgress({
					itemIndex: 9,
					runIndex: 0,
					totalItems: 10,
					totalRuns: 1,
					completedExecutions: 10,
					totalExecutions: 10,
				});

				expect(consoleLogs.some((log) => log.includes('::notice::Completed 10 executions'))).toBe(
					true,
				);
			});

			it('should not output notice for partial progress', () => {
				reporter.onProgress({
					itemIndex: 5,
					runIndex: 0,
					totalItems: 10,
					totalRuns: 1,
					completedExecutions: 5,
					totalExecutions: 10,
				});

				expect(consoleLogs).toHaveLength(0);
			});
		});

		describe('onCIStatus', () => {
			it('should output notice for passed CI', () => {
				reporter.onCIStatus({
					passed: true,
					summary: 'All thresholds passed',
					violations: [],
				});

				expect(
					consoleLogs.some((log) => log.includes('::notice title=CI Validation::All thresholds')),
				).toBe(true);
			});

			it('should output errors for failed CI with violations', () => {
				reporter.onCIStatus({
					passed: false,
					summary: 'Threshold violations detected',
					violations: [
						{
							evaluator: 'accuracy',
							threshold: 'avg',
							expected: '0.8',
							actual: '0.65',
							message: 'accuracy average score 0.65 below threshold 0.8',
						},
						{
							evaluator: 'relevance',
							threshold: 'p95',
							expected: '0.7',
							actual: '0.55',
							message: 'relevance p95 score 0.55 below threshold 0.7',
						},
					],
				});

				expect(
					consoleLogs.some((log) =>
						log.includes('::error title=Threshold Violation::accuracy:'),
					),
				).toBe(true);
				expect(
					consoleLogs.some((log) =>
						log.includes('::error title=Threshold Violation::relevance:'),
					),
				).toBe(true);
			});
		});

		describe('onComplete', () => {
			it('should close group and write summary', () => {
				// Call onStart first to initialize summary content
				reporter.onStart({
					name: 'Test Experiment',
					datasetSize: 10,
					evaluators: ['accuracy'],
					concurrency: 5,
					timeout: 30000,
					runs: 1,
				});

				const report: ExperimentReport = {
					id: 'test-123',
					name: 'Test Experiment',
					timestamp: '2025-01-01T00:00:00.000Z',
					tags: [],
					config: {
						runs: 1,
						concurrency: 5,
						timeout: 30000,
						evaluators: ['accuracy'],
					},
					summary: {
						totalItems: 10,
						totalDurationMs: 5500,
						avgLatencyMs: 550,
						scores: {
							accuracy: {
								avg: 0.85,
								min: 0.65,
								max: 0.95,
								p50: 0.85,
								p95: 0.92,
								passRate: 0.9,
							},
						},
					},
					items: [],
				};

				reporter.onComplete(report, '.cobalt/results/test-123.json');

				expect(consoleLogs.some((log) => log.includes('::endgroup::'))).toBe(true);

				const summary = readFileSync(summaryFile, 'utf-8');
				expect(summary).toContain('## 🔷 Cobalt Experiment');
				expect(summary).toContain('**Experiment:** Test Experiment');
				expect(summary).toContain('### 📊 Results');
				expect(summary).toContain('5.50s');
				expect(summary).toContain('550ms');
				expect(summary).toContain('### Scores');
				expect(summary).toContain('accuracy');
				expect(summary).toContain('0.85');
				expect(summary).toContain('test-123');
			});

			it('should output warning for low average scores', () => {
				const report: ExperimentReport = {
					id: 'test-123',
					name: 'Test Experiment',
					timestamp: '2025-01-01T00:00:00.000Z',
					tags: [],
					config: {
						runs: 1,
						concurrency: 5,
						timeout: 30000,
						evaluators: ['accuracy'],
					},
					summary: {
						totalItems: 10,
						totalDurationMs: 5500,
						avgLatencyMs: 550,
						scores: {
							accuracy: {
								avg: 0.35,
								min: 0.1,
								max: 0.6,
								p50: 0.3,
								p95: 0.5,
								passRate: 0.4,
							},
						},
					},
					items: [],
				};

				reporter.onComplete(report, '.cobalt/results/test-123.json');

				expect(
					consoleLogs.some((log) =>
						log.includes('::warning title=Low Score::accuracy average score is 0.35'),
					),
				).toBe(true);
			});

			it('should output warning for low score items', () => {
				const report: ExperimentReport = {
					id: 'test-123',
					name: 'Test Experiment',
					timestamp: '2025-01-01T00:00:00.000Z',
					tags: [],
					config: {
						runs: 1,
						concurrency: 5,
						timeout: 30000,
						evaluators: ['accuracy'],
					},
					summary: {
						totalItems: 10,
						totalDurationMs: 5500,
						avgLatencyMs: 550,
						scores: {},
					},
					items: [
						{
							index: 0,
							input: {},
							output: {},
							latencyMs: 500,
							evaluations: {
								accuracy: { score: 0.3, reason: 'Low score' },
							},
							runs: [],
						},
						{
							index: 1,
							input: {},
							output: {},
							latencyMs: 500,
							evaluations: {
								accuracy: { score: 0.8, reason: 'Good score' },
							},
							runs: [],
						},
					],
				};

				reporter.onComplete(report, '.cobalt/results/test-123.json');

				expect(
					consoleLogs.some((log) => log.includes('::warning title=Low Scores::1 items scored')),
				).toBe(true);

				const summary = readFileSync(summaryFile, 'utf-8');
				expect(summary).toContain('⚠️ 1 item(s) scored below 0.5');
			});

			it('should output errors for execution errors', () => {
				const report: ExperimentReport = {
					id: 'test-123',
					name: 'Test Experiment',
					timestamp: '2025-01-01T00:00:00.000Z',
					tags: [],
					config: {
						runs: 1,
						concurrency: 5,
						timeout: 30000,
						evaluators: ['accuracy'],
					},
					summary: {
						totalItems: 10,
						totalDurationMs: 5500,
						avgLatencyMs: 550,
						scores: {},
					},
					items: [
						{
							index: 0,
							input: {},
							output: {},
							latencyMs: 500,
							evaluations: {},
							runs: [],
							error: 'Timeout error',
						},
						{
							index: 1,
							input: {},
							output: {},
							latencyMs: 500,
							evaluations: {},
							runs: [],
							error: 'Network error',
						},
					],
				};

				reporter.onComplete(report, '.cobalt/results/test-123.json');

				expect(
					consoleLogs.some((log) => log.includes('::error title=Execution Error::Item 0')),
				).toBe(true);
				expect(
					consoleLogs.some((log) => log.includes('::error title=Execution Error::Item 1')),
				).toBe(true);

				const summary = readFileSync(summaryFile, 'utf-8');
				expect(summary).toContain('❌ 2 item(s) had errors');
			});

			it('should limit error output to 5 items', () => {
				const items = Array.from({ length: 10 }, (_, i) => ({
					index: i,
					input: {},
					output: {},
					latencyMs: 500,
					evaluations: {},
					runs: [],
					error: `Error ${i}`,
				}));

				const report: ExperimentReport = {
					id: 'test-123',
					name: 'Test Experiment',
					timestamp: '2025-01-01T00:00:00.000Z',
					tags: [],
					config: {
						runs: 1,
						concurrency: 5,
						timeout: 30000,
						evaluators: ['accuracy'],
					},
					summary: {
						totalItems: 10,
						totalDurationMs: 5500,
						avgLatencyMs: 550,
						scores: {},
					},
					items,
				};

				reporter.onComplete(report, '.cobalt/results/test-123.json');

				const errorLogs = consoleLogs.filter((log) => log.includes('::error title=Execution'));
				expect(errorLogs).toHaveLength(5);

				expect(consoleLogs.some((log) => log.includes('::warning::5 more errors'))).toBe(true);
			});

			it('should include cost if available', () => {
				reporter.onStart({
					name: 'Test Experiment',
					datasetSize: 10,
					evaluators: ['accuracy'],
					concurrency: 5,
					timeout: 30000,
					runs: 1,
				});

				const report: ExperimentReport = {
					id: 'test-123',
					name: 'Test Experiment',
					timestamp: '2025-01-01T00:00:00.000Z',
					tags: [],
					config: {
						runs: 1,
						concurrency: 5,
						timeout: 30000,
						evaluators: ['accuracy'],
					},
					summary: {
						totalItems: 10,
						totalDurationMs: 5500,
						avgLatencyMs: 550,
						estimatedCost: 0.0025,
						scores: {},
					},
					items: [],
				};

				reporter.onComplete(report, '.cobalt/results/test-123.json');

				const summary = readFileSync(summaryFile, 'utf-8');
				expect(summary).toContain('**Estimated Cost:**');
			});

			it('should include token count if available', () => {
				const report: ExperimentReport = {
					id: 'test-123',
					name: 'Test Experiment',
					timestamp: '2025-01-01T00:00:00.000Z',
					tags: [],
					config: {
						runs: 1,
						concurrency: 5,
						timeout: 30000,
						evaluators: ['accuracy'],
					},
					summary: {
						totalItems: 10,
						totalDurationMs: 5500,
						avgLatencyMs: 550,
						totalTokens: 15000,
						scores: {},
					},
					items: [],
				};

				reporter.onComplete(report, '.cobalt/results/test-123.json');

				const summary = readFileSync(summaryFile, 'utf-8');
				expect(summary).toContain('**Total Tokens:** 15,000');
			});
		});

		describe('onError', () => {
			it('should output error annotation and write to summary', () => {
				reporter.onError(new Error('Test error'), 'Loading dataset');

				expect(
					consoleLogs.some((log) =>
						log.includes('::error title=Loading dataset::Test error'),
					),
				).toBe(true);

				const summary = readFileSync(summaryFile, 'utf-8');
				expect(summary).toContain('### ❌ Error');
				expect(summary).toContain('**Context:** Loading dataset');
				expect(summary).toContain('Test error');
			});

			it('should output error without context', () => {
				reporter.onError(new Error('Generic error'));

				expect(
					consoleLogs.some((log) => log.includes('::error title=Experiment Error::Generic error')),
				).toBe(true);
			});
		});
	});
});
