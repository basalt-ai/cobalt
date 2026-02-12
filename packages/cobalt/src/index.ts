/**
 * Cobalt - Unit testing for AI Agents
 * Test, evaluate, and track your AI experiments
 */

// Main experiment function
export { experiment } from './core/experiment.js';

// Core classes
export { Evaluator } from './core/Evaluator.js';
export { Dataset } from './datasets/Dataset.js';

// Configuration
export { defineConfig, loadConfig } from './core/config.js';

// Storage utilities
export { loadResult, listResults } from './storage/results.js';
export { HistoryDB } from './storage/db.js';

// Register built-in evaluators (side-effect imports)
import './evaluators/llm-judge.js';
import './evaluators/function.js';
import './evaluators/similarity.js';
import './evaluators/adapters/autoevals.js';

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
} from './types/index.js';
