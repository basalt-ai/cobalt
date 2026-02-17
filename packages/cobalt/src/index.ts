/**
 * Cobalt - Unit testing for AI Agents
 * Test, evaluate, and track your AI experiments
 */

// Main experiment function
export { experiment } from './core/experiment';

// Core classes
export { Evaluator } from './core/Evaluator';
export { Dataset } from './datasets/Dataset';

// Configuration
export { defineConfig, loadConfig } from './core/config';

// Storage utilities
export { loadResult, listResults } from './storage/results';
export { HistoryDB } from './storage/db';

// Register built-in evaluators (side-effect imports)
import './evaluators/llm-judge';
import './evaluators/function';
import './evaluators/similarity';
import './evaluators/adapters/autoevals';

// Types
export type {
	// Config
	CobaltConfig,
	JudgeConfig,
	DashboardConfig,
	CacheConfig,
	// Dataset
	ExperimentItem,
	DatasetConfig,
	// Evaluator
	EvaluatorType,
	EvaluatorConfig,
	LLMJudgeEvaluatorConfig,
	FunctionEvaluatorConfig,
	SimilarityEvaluatorConfig,
	AutoevalsEvaluatorConfig,
	EvalContext,
	EvalResult,
	// Experiment
	ExperimentResult,
	ExperimentOptions,
	RunnerFunction,
	RunnerContext,
	// Report
	ExperimentReport,
	ExperimentSummary,
	ItemResult,
	ItemEvaluation,
	ScoreStats,
	// Storage
	ResultFilter,
	ResultSummary,
	// CI
	ThresholdConfig,
	ThresholdMetric,
	CIResult,
	ThresholdViolation,
} from './types/index';
