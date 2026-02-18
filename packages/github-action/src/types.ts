/**
 * Types for the Cobalt GitHub Action.
 * Re-declared subset of Cobalt types to avoid direct package dependency.
 * Source of truth: packages/cobalt/src/types/index.ts
 */

export interface ScoreStats {
	avg: number
	min: number
	max: number
	p50: number
	p95: number
	p99: number
}

export interface ExperimentSummary {
	totalItems: number
	totalDurationMs: number
	avgLatencyMs: number
	totalTokens?: number
	estimatedCost?: number
	scores: Record<string, ScoreStats>
}

export interface ItemEvaluation {
	score: number
	reason?: string
	chainOfThought?: string
}

export interface ItemResult {
	index: number
	input: Record<string, unknown>
	output: Record<string, unknown>
	latencyMs: number
	evaluations: Record<string, ItemEvaluation>
	error?: string
	runs: unknown[]
}

export interface ThresholdViolation {
	category: string
	metric: string
	expected: number
	actual: number
	message: string
}

export interface CIResult {
	passed: boolean
	violations: ThresholdViolation[]
	summary: string
}

export interface ExperimentReport {
	id: string
	name: string
	timestamp: string
	tags: string[]
	config: {
		runs: number
		concurrency: number
		timeout: number
		evaluators: string[]
	}
	summary: ExperimentSummary
	items: ItemResult[]
	ciStatus?: CIResult
}

// JSON reporter event types (from json-reporter.ts)
export type JsonEvent =
	| { type: 'experiment_start'; timestamp: string; data: unknown }
	| { type: 'progress'; timestamp: string; data: unknown }
	| { type: 'ci_status'; timestamp: string; data: CIResult }
	| {
			type: 'experiment_complete'
			timestamp: string
			data: { report: ExperimentReport; resultPath: string }
	  }
	| {
			type: 'error'
			timestamp: string
			data: { message: string; context?: string; stack?: string }
	  }

// Comparison types
export interface EvaluatorDiff {
	evaluator: string
	baselineAvg: number
	candidateAvg: number
	diff: number
	percentChange: number
	direction: 'improved' | 'regressed' | 'unchanged'
}

export interface ExperimentComparison {
	experimentName: string
	current: ExperimentReport
	previous?: ExperimentReport
	diffs: EvaluatorDiff[]
	improvements: number
	regressions: number
}
