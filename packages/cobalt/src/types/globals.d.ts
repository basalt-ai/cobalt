import type { ReporterType } from '../cli/reporters'
import type { ExperimentReport, ThresholdConfig } from './index'

/**
 * Global cobalt properties used for cross-bundle communication
 * between CLI/MCP and the experiment runner.
 */
declare global {
	var __cobaltPendingExperiments: Promise<ExperimentReport>[] | undefined
	var __cobaltCLIResultCallback: ((report: ExperimentReport) => void) | undefined
	var __cobaltMCPResultCallback: ((report: ExperimentReport) => void) | undefined
	var __cobaltCIThresholds: ThresholdConfig | undefined
	var __cobaltConcurrencyOverride: number | undefined
	var __cobaltFilter: string | undefined
	var __cobaltReportersOverride: ReporterType[] | undefined
}
