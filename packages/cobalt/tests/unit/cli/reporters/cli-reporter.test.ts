import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CLIReporter } from '../../../../src/cli/reporters/cli-reporter.js';
import type { ExperimentReport } from '../../../../src/types/index.js';

describe('CLIReporter', () => {
	let reporter: CLIReporter;
	let consoleLogs: string[];
	let consoleErrors: string[];

	beforeEach(() => {
		reporter = new CLIReporter();
		consoleLogs = [];
		consoleErrors = [];

		vi.spyOn(console, 'log').mockImplementation((...args) => {
			consoleLogs.push(args.join(' '));
		});
		vi.spyOn(console, 'error').mockImplementation((...args) => {
			consoleErrors.push(args.join(' '));
		});
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe('onStart', () => {
		it('should output compact experiment header', () => {
			reporter.onStart({
				name: 'Test Experiment',
				datasetSize: 10,
				evaluators: ['accuracy', 'relevance'],
				concurrency: 5,
				timeout: 30000,
				runs: 1,
			});

			expect(consoleLogs.some((log) => log.includes('Test Experiment'))).toBe(true);
			expect(consoleLogs.some((log) => log.includes('10 items'))).toBe(true);
			expect(consoleLogs.some((log) => log.includes('2 evaluators'))).toBe(true);
		});
	});

	describe('onProgress', () => {
		it('should output per-item result with scores', () => {
			reporter.onProgress({
				itemIndex: 0,
				runIndex: 0,
				totalItems: 10,
				totalRuns: 1,
				completedExecutions: 1,
				totalExecutions: 10,
				itemResult: {
					index: 0,
					input: {},
					output: {},
					latencyMs: 120,
					evaluations: { accuracy: { score: 0.9 }, relevance: { score: 0.85 } },
					runs: [],
				},
			});

			expect(consoleLogs.some((log) => log.includes('Item #1'))).toBe(true);
			expect(consoleLogs.some((log) => log.includes('accuracy: 0.90'))).toBe(true);
			expect(consoleLogs.some((log) => log.includes('relevance: 0.85'))).toBe(true);
			expect(consoleLogs.some((log) => log.includes('120ms'))).toBe(true);
		});

		it('should show error items', () => {
			reporter.onProgress({
				itemIndex: 0,
				runIndex: 0,
				totalItems: 10,
				totalRuns: 1,
				completedExecutions: 1,
				totalExecutions: 10,
				itemResult: {
					index: 0,
					input: {},
					output: {},
					latencyMs: 100,
					evaluations: {},
					runs: [],
					error: 'Timeout',
				},
			});

			expect(consoleLogs.some((log) => log.includes('ERROR'))).toBe(true);
		});

		it('should skip when no itemResult', () => {
			reporter.onProgress({
				itemIndex: 0,
				runIndex: 0,
				totalItems: 10,
				totalRuns: 1,
				completedExecutions: 1,
				totalExecutions: 10,
			});

			expect(consoleLogs).toHaveLength(0);
		});
	});

	describe('onCIStatus', () => {
		it('should output passed CI status', () => {
			reporter.onCIStatus({
				passed: true,
				summary: 'All thresholds passed',
				violations: [],
			});

			expect(consoleLogs.some((log) => log.includes('CI: PASSED'))).toBe(true);
		});

		it('should output failed CI status with violations', () => {
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
				],
			});

			expect(consoleLogs.some((log) => log.includes('CI: FAILED'))).toBe(true);
			expect(
				consoleLogs.some((log) => log.includes('accuracy average score 0.65 below threshold')),
			).toBe(true);
		});
	});

	describe('onComplete', () => {
		it('should output summary table and footer', () => {
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
				items: [
					{
						index: 0,
						input: {},
						output: {},
						latencyMs: 500,
						evaluations: { accuracy: { score: 0.85 } },
						runs: [],
					},
				],
			};

			reporter.onComplete(report, '.cobalt/results/test-123.json');

			// Should have score table
			expect(consoleLogs.some((log) => log.includes('Evaluator'))).toBe(true);
			expect(consoleLogs.some((log) => log.includes('0.85'))).toBe(true);
			// Should have footer with passed count and duration
			expect(consoleLogs.some((log) => log.includes('1 passed'))).toBe(true);
			expect(consoleLogs.some((log) => log.includes('5.50s'))).toBe(true);
			// Should NOT have old verbose output
			expect(consoleLogs.some((log) => log.includes('Results saved to:'))).toBe(false);
			expect(consoleLogs.some((log) => log.includes('Run ID:'))).toBe(false);
		});

		it('should display cost if available', () => {
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

			expect(consoleLogs.some((log) => log.includes('$'))).toBe(true);
		});

		it('should show failure details for low scores', () => {
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
					totalItems: 2,
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

			expect(consoleLogs.some((log) => log.includes('Item #1') && log.includes('0.30'))).toBe(true);
			expect(consoleLogs.some((log) => log.includes('1 failed'))).toBe(true);
			expect(consoleLogs.some((log) => log.includes('1 passed'))).toBe(true);
		});

		it('should show error items in failure details', () => {
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
					totalItems: 2,
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
					},
				],
			};

			reporter.onComplete(report, '.cobalt/results/test-123.json');

			expect(consoleLogs.some((log) => log.includes('Timeout error'))).toBe(true);
			expect(consoleLogs.some((log) => log.includes('1 failed'))).toBe(true);
		});
	});

	describe('onError', () => {
		it('should output error with context', () => {
			reporter.onError(new Error('Test error'), 'Loading dataset');

			expect(consoleErrors.some((err) => err.includes('Loading dataset:'))).toBe(true);
			expect(consoleErrors.some((err) => err.includes('Test error'))).toBe(true);
		});

		it('should output error without context', () => {
			reporter.onError(new Error('Generic error'));

			expect(consoleErrors.some((err) => err.includes('Error:'))).toBe(true);
			expect(consoleErrors.some((err) => err.includes('Generic error'))).toBe(true);
		});
	});
});
