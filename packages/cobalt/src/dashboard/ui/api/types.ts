/**
 * Dashboard API response types
 * Mirrors the backend types from src/types/index.ts
 */

export interface ResultSummary {
	id: string;
	name: string;
	timestamp: string;
	tags: string[];
	avgScores: Record<string, number>;
	totalItems: number;
	durationMs: number;
}

export interface ScoreStats {
	avg: number;
	min: number;
	max: number;
	p50: number;
	p95: number;
}

export interface ItemEvaluation {
	score: number;
	reason?: string;
}

export interface ExperimentResult {
	output: string | Record<string, unknown>;
	metadata?: Record<string, unknown>;
}

export interface RunAggregation {
	mean: number;
	stddev: number;
	min: number;
	max: number;
	p50: number;
	p95: number;
	scores: number[];
}

export interface SingleRun {
	output: ExperimentResult;
	latencyMs: number;
	evaluations: Record<string, ItemEvaluation>;
	error?: string;
}

export interface ItemResult {
	index: number;
	input: Record<string, unknown>;
	output: ExperimentResult;
	latencyMs: number;
	evaluations: Record<string, ItemEvaluation>;
	error?: string;
	runs: SingleRun[];
	aggregated?: {
		avgLatencyMs: number;
		evaluations: Record<string, RunAggregation>;
	};
}

export interface ExperimentSummary {
	totalItems: number;
	totalDurationMs: number;
	avgLatencyMs: number;
	totalTokens?: number;
	estimatedCost?: number;
	scores: Record<string, ScoreStats>;
}

export interface ThresholdViolation {
	evaluator: string;
	metric: string;
	expected: number;
	actual: number;
	message: string;
}

export interface CIResult {
	passed: boolean;
	violations: ThresholdViolation[];
	summary: string;
}

export interface ExperimentReport {
	id: string;
	name: string;
	timestamp: string;
	tags: string[];
	config: {
		runs: number;
		concurrency: number;
		timeout: number;
		evaluators: string[];
	};
	summary: ExperimentSummary;
	items: ItemResult[];
	ciStatus?: CIResult;
}

// API response wrappers

export interface RunsResponse {
	runs: ResultSummary[];
}

export interface RunDetailResponse {
	run: ExperimentReport;
}

export interface CompareResponse {
	runA: { id: string; name: string; timestamp: string };
	runB: { id: string; name: string; timestamp: string };
	scoreDiffs: Record<
		string,
		{
			baseline: number;
			candidate: number;
			diff: number;
			percentChange: number;
		}
	>;
	topChanges: Array<{
		index: number;
		input: Record<string, unknown>;
		changes: Record<string, number>;
	}>;
}

export interface TrendsResponse {
	trends: Array<{
		id: string;
		timestamp: string;
		scores: Record<string, number>;
	}>;
}

export interface HealthResponse {
	status: 'ok';
}

export interface ErrorResponse {
	error: string;
}
