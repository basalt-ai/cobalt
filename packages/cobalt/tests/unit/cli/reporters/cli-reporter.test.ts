import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CLIReporter } from '../../../../src/cli/reporters/cli-reporter.js';
import type { ExperimentReport } from '../../../../src/types/index.js';

describe('CLIReporter', () => {
	let reporter: CLIReporter;
	let consoleLogs: string[];
	let consoleErrors: string[];
	let consoleWarns: string[];

	beforeEach(() => {
		reporter = new CLIReporter();
		consoleLogs = [];
		consoleErrors = [];
		consoleWarns = [];

		vi.spyOn(console, 'log').mockImplementation((...args) => {
			consoleLogs.push(args.join(' '));
		});
		vi.spyOn(console, 'error').mockImplementation((...args) => {
			consoleErrors.push(args.join(' '));
		});
		vi.spyOn(console, 'warn').mockImplementation((...args) => {
			consoleWarns.push(args.join(' '));
		});
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe('onStart', () => {
		it('should output experiment start info', () => {
			reporter.onStart({
				name: 'Test Experiment',
				datasetSize: 10,
				evaluators: ['accuracy', 'relevance'],
				concurrency: 5,
				timeout: 30000,
				runs: 1,
			});

			expect(consoleLogs.some((log) => log.includes('Running experiment: Test Experiment'))).toBe(
				true,
			);
			expect(consoleLogs).toContain('Dataset: 10 items');
			expect(consoleLogs).toContain('Evaluators: accuracy, relevance');
			expect(consoleLogs.some((log) => log.includes('Concurrency: 5 | Timeout: 30000ms'))).toBe(
				true,
			);
		});
	});

	describe('onProgress', () => {
		it('should output progress for single run', () => {
			reporter.onProgress({
				itemIndex: 0,
				runIndex: 0,
				totalItems: 10,
				totalRuns: 1,
				completedExecutions: 5,
				totalExecutions: 10,
			});

			expect(consoleLogs.some((log) => log.includes('Progress: 5/10 items completed'))).toBe(true);
		});

		it('should output progress for multiple runs', () => {
			reporter.onProgress({
				itemIndex: 2,
				runIndex: 1,
				totalItems: 5,
				totalRuns: 3,
				completedExecutions: 8,
				totalExecutions: 15,
			});

			expect(
				consoleLogs.some(
					(log) =>
						log.includes('Progress: 8/15 completed') &&
						log.includes('Item 3/5') &&
						log.includes('run 2/3'),
				),
			).toBe(true);
		});

		it('should throttle progress updates', () => {
			vi.useFakeTimers();

			// First update
			reporter.onProgress({
				itemIndex: 0,
				runIndex: 0,
				totalItems: 10,
				totalRuns: 1,
				completedExecutions: 1,
				totalExecutions: 10,
			});

			expect(consoleLogs).toHaveLength(1);

			// Second update within 1 second - should be throttled
			reporter.onProgress({
				itemIndex: 1,
				runIndex: 0,
				totalItems: 10,
				totalRuns: 1,
				completedExecutions: 2,
				totalExecutions: 10,
			});

			expect(consoleLogs).toHaveLength(1);

			// Advance time by 1.1 seconds
			vi.advanceTimersByTime(1100);

			// Third update after 1 second - should output
			reporter.onProgress({
				itemIndex: 2,
				runIndex: 0,
				totalItems: 10,
				totalRuns: 1,
				completedExecutions: 3,
				totalExecutions: 10,
			});

			expect(consoleLogs).toHaveLength(2);

			vi.useRealTimers();
		});

		it('should always output final progress', () => {
			// Final progress update (completedExecutions === totalExecutions)
			reporter.onProgress({
				itemIndex: 9,
				runIndex: 0,
				totalItems: 10,
				totalRuns: 1,
				completedExecutions: 10,
				totalExecutions: 10,
			});

			expect(consoleLogs.some((log) => log.includes('Progress: 10/10'))).toBe(true);
		});
	});

	describe('onCIStatus', () => {
		it('should output passed CI status', () => {
			reporter.onCIStatus({
				passed: true,
				summary: 'All thresholds passed',
				violations: [],
			});

			expect(consoleLogs.some((log) => log.includes('CI Status: PASSED'))).toBe(true);
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
					{
						evaluator: 'relevance',
						threshold: 'p95',
						expected: '0.7',
						actual: '0.55',
						message: 'relevance p95 score 0.55 below threshold 0.7',
					},
				],
			});

			expect(consoleLogs.some((log) => log.includes('CI Status: FAILED'))).toBe(true);
			expect(consoleErrors.some((err) => err.includes('Threshold violations'))).toBe(true);
			expect(
				consoleErrors.some((err) => err.includes('accuracy average score 0.65 below threshold')),
			).toBe(true);
			expect(
				consoleErrors.some((err) => err.includes('relevance p95 score 0.55 below threshold')),
			).toBe(true);
		});
	});

	describe('onComplete', () => {
		it('should output completion summary', () => {
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

			expect(consoleLogs.some((log) => log.includes('Experiment completed in 5.50s'))).toBe(true);
			expect(consoleLogs.some((log) => log.includes('Average latency: 550ms'))).toBe(true);
			expect(
				consoleLogs.some((log) =>
					log.includes('accuracy: avg=0.85 min=0.65 max=0.95 p50=0.85 p95=0.92'),
				),
			).toBe(true);
			expect(
				consoleLogs.some((log) => log.includes('Results saved to: .cobalt/results/test-123.json')),
			).toBe(true);
			expect(consoleLogs.some((log) => log.includes('Run ID: test-123'))).toBe(true);
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

			expect(consoleLogs.some((log) => log.includes('Estimated cost:'))).toBe(true);
		});

		it('should warn about low scores', () => {
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

			expect(consoleWarns.some((warn) => warn.includes('1 item(s) scored below 0.5'))).toBe(true);
		});

		it('should warn about errors', () => {
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
					},
				],
			};

			reporter.onComplete(report, '.cobalt/results/test-123.json');

			expect(consoleErrors.some((err) => err.includes('1 item(s) had errors'))).toBe(true);
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
