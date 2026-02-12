/**
 * Core types for Cobalt AI testing framework
 */

import type { Evaluator } from '../core/Evaluator.js';

// ============================================================================
// Dataset Types
// ============================================================================

export type ExperimentItem = Record<string, any>;

export interface DatasetConfig<T = ExperimentItem> {
	items: T[];
}

// ============================================================================
// Evaluator Types
// ============================================================================

export type EvaluatorType = 'llm-judge' | 'function' | 'similarity' | 'exact-match' | 'autoevals';

export interface EvalContext {
	item: ExperimentItem;
	output: string | Record<string, any>;
	metadata?: Record<string, any>;
}

export interface EvalResult {
	score: number; // 0.0 to 1.0
	reason?: string;
}

export interface BaseEvaluatorConfig {
	name: string;
	type?: EvaluatorType;
}

export interface LLMJudgeEvaluatorConfig extends BaseEvaluatorConfig {
	type: 'llm-judge';
	prompt: string;
	model?: string;
}

export interface FunctionEvaluatorConfig extends BaseEvaluatorConfig {
	type: 'function';
	fn: (context: EvalContext) => EvalResult | Promise<EvalResult>;
}

export interface SimilarityEvaluatorConfig extends BaseEvaluatorConfig {
	type: 'similarity';
	field: string;
	threshold?: number;
}

export interface ExactMatchEvaluatorConfig extends BaseEvaluatorConfig {
	type: 'exact-match';
	field: string;
	caseSensitive?: boolean;
}

export interface AutoevalsEvaluatorConfig extends BaseEvaluatorConfig {
	type: 'autoevals';
	evaluatorType:
		| 'Levenshtein'
		| 'Factuality'
		| 'ContextRecall'
		| 'ContextPrecision'
		| 'AnswerRelevancy'
		| 'Json'
		| 'Battle'
		| 'Humor'
		| 'Embedding'
		| 'ClosedQA'
		| 'Security';
	options?: Record<string, any>;
	expectedField?: string;
}

export type EvaluatorConfig =
	| LLMJudgeEvaluatorConfig
	| FunctionEvaluatorConfig
	| SimilarityEvaluatorConfig
	| ExactMatchEvaluatorConfig
	| AutoevalsEvaluatorConfig;

// ============================================================================
// Experiment Types
// ============================================================================

export interface ExperimentResult {
	output: string | Record<string, any>;
	metadata?: Record<string, any>;
}

export interface RunnerContext {
	item: ExperimentItem;
	index: number;
	runIndex: number;
}

export type RunnerFunction = (context: RunnerContext) => Promise<ExperimentResult>;

export interface ExperimentOptions {
	evaluators: (EvaluatorConfig | Evaluator)[];
	runs?: number; // default: 1
	concurrency?: number; // default: 5
	timeout?: number; // default: 30_000
	tags?: string[];
	name?: string; // override experiment name
	thresholds?: ThresholdConfig; // CI mode thresholds
}

// ============================================================================
// Report Types
// ============================================================================

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
	input: ExperimentItem;
	// Flat fields for backward compatibility (when runs=1) and easy access
	output: ExperimentResult;
	latencyMs: number;
	evaluations: Record<string, ItemEvaluation>;
	error?: string;
	// Multiple runs support (NEW)
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
	ciStatus?: CIResult; // CI mode threshold validation result
}

// ============================================================================
// Config Types
// ============================================================================

export interface JudgeConfig {
	model: string;
	provider: 'openai' | 'anthropic';
	apiKey?: string;
}

export interface DashboardConfig {
	port: number;
	open: boolean;
}

export interface CacheConfig {
	enabled: boolean;
	ttl: string;
}

export type ReporterType = 'cli' | 'json' | 'github-actions';

export interface LangfuseConfig {
	apiKey?: string;
	publicKey?: string;
	secretKey?: string;
	baseUrl?: string;
}

export interface LangSmithConfig {
	apiKey?: string;
	baseUrl?: string;
}

export interface BraintrustConfig {
	apiKey?: string;
	baseUrl?: string;
}

export interface BasaltConfig {
	apiKey?: string;
	baseUrl?: string;
}

export interface CobaltConfig {
	testDir: string;
	testMatch: string[];
	judge: JudgeConfig;
	concurrency: number;
	timeout: number;
	reporters: ReporterType[];
	dashboard: DashboardConfig;
	cache: CacheConfig;
	env?: Record<string, string>;
	ciMode?: boolean; // Enable CI mode with threshold checking
	thresholds?: ThresholdConfig; // Default thresholds for CI mode
	plugins?: string[]; // Paths to custom evaluator plugins
	// Remote dataset platform configurations
	langfuse?: LangfuseConfig;
	langsmith?: LangSmithConfig;
	braintrust?: BraintrustConfig;
	basalt?: BasaltConfig;
}

// ============================================================================
// Storage Types
// ============================================================================

export interface ResultFilter {
	experiment?: string;
	tags?: string[];
	since?: Date;
	until?: Date;
}

export interface ResultSummary {
	id: string;
	name: string;
	timestamp: string;
	tags: string[];
	avgScores: Record<string, number>;
	totalItems: number;
	durationMs: number;
}

// ============================================================================
// CI Mode Types
// ============================================================================

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

export interface ThresholdMetric {
	avg?: number;
	min?: number;
	max?: number;
	p50?: number;
	p95?: number;
	passRate?: number; // Percentage of items that must pass (0-1)
	minScore?: number; // Minimum score required (used with passRate)
}

export type ThresholdConfig = Record<string, ThresholdMetric>;
