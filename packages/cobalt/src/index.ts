/**
 * Cobalt - Cypress for AI agents
 * Test, evaluate, and track your AI experiments
 */

// Main experiment function
export { experiment } from './core/experiment.js'

// Core classes
export { Evaluator } from './core/Evaluator.js'
export { Dataset } from './datasets/Dataset.js'

// Configuration
export { defineConfig, loadConfig } from './core/config.js'

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
  ExactMatchEvaluatorConfig,
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
  ResultSummary
} from './types/index.js'
