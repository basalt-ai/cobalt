import OpenAI from 'openai'
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { resolve, dirname, basename, join } from 'node:path'
import { loadConfig, getApiKey } from '../../core/config.js'
import { renderTemplate } from '../../utils/template.js'
import { getAnalyzeAgentPrompt } from './prompts/analyze-agent.js'
import { getGenerateDatasetPrompt } from './prompts/generate-dataset.js'
import { getGenerateEvaluatorsPrompt } from './prompts/generate-evaluators.js'

/**
 * MCP Tool: cobalt_generate
 * Analyze agent source code and auto-generate experiment file
 */
export const cobaltGenerateTool = {
	name: 'cobalt_generate',
	description:
		'Analyze agent source code and auto-generate a Cobalt experiment file with dataset and evaluators',
	inputSchema: {
		type: 'object',
		properties: {
			agentFile: {
				type: 'string',
				description: 'Path to agent source code file (TypeScript or JavaScript)'
			},
			outputFile: {
				type: 'string',
				description:
					'Output path for generated experiment file (optional, defaults to <agentFile>.cobalt.ts)'
			},
			datasetSize: {
				type: 'number',
				description: 'Number of test cases to generate (default: 10)'
			}
		},
		required: ['agentFile']
	}
}

interface AgentAnalysis {
	purpose: string
	inputSchema: any
	outputSchema: any
	keyBehaviors: string[]
	edgeCases: string[]
	dependencies: string[]
}

interface DatasetItem {
	input: any
	expectedOutput: any
	category: string
	description: string
}

interface EvaluatorSpec {
	name: string
	type: string
	config: any
	reasoning: string
}

/**
 * Handle cobalt_generate tool call
 */
export async function handleCobaltGenerate(args: any) {
	try {
		const config = await loadConfig()
		const apiKey = getApiKey(config)

		// Resolve file paths
		const agentFilePath = resolve(process.cwd(), args.agentFile)
		if (!existsSync(agentFilePath)) {
			throw new Error(`Agent file not found: ${args.agentFile}`)
		}

		const datasetSize = args.datasetSize || 10

		// Determine output path
		const outputFile =
			args.outputFile ||
			join(
				dirname(agentFilePath),
				`${basename(agentFilePath, '.ts')}.cobalt.ts`
			)
		const outputPath = resolve(process.cwd(), outputFile)

		// Read agent source code
		const sourceCode = readFileSync(agentFilePath, 'utf-8')

		// Initialize OpenAI client (using judge config for consistency)
		const model = config.judge?.model || 'gpt-4o-mini'
		const client = new OpenAI({ apiKey })

		// Step 1: Analyze agent code
		console.error('Analyzing agent code...')
		const analysisPrompt = getAnalyzeAgentPrompt(sourceCode)
		const analysisResponse = await client.chat.completions.create({
			model,
			messages: [
				{
					role: 'system',
					content:
						'You are an expert at analyzing code. Always respond with valid JSON.'
				},
				{ role: 'user', content: analysisPrompt }
			],
			response_format: { type: 'json_object' },
			temperature: 0.3
		})

		const analysis: AgentAnalysis = JSON.parse(
			analysisResponse.choices[0].message.content || '{}'
		)

		// Step 2: Generate dataset
		console.error(`Generating ${datasetSize} test cases...`)
		const datasetPrompt = getGenerateDatasetPrompt(analysis, datasetSize)
		const datasetResponse = await client.chat.completions.create({
			model,
			messages: [
				{
					role: 'system',
					content:
						'You are an expert at creating test datasets. Always respond with valid JSON arrays.'
				},
				{ role: 'user', content: datasetPrompt }
			],
			response_format: { type: 'json_object' },
			temperature: 0.7
		})

		const datasetResult = JSON.parse(
			datasetResponse.choices[0].message.content || '{"items": []}'
		)
		const dataset: DatasetItem[] = datasetResult.items || datasetResult

		// Step 3: Generate evaluators
		console.error('Generating appropriate evaluators...')
		const evaluatorsPrompt = getGenerateEvaluatorsPrompt(analysis)
		const evaluatorsResponse = await client.chat.completions.create({
			model,
			messages: [
				{
					role: 'system',
					content:
						'You are an expert at testing strategies. Always respond with valid JSON arrays.'
				},
				{ role: 'user', content: evaluatorsPrompt }
			],
			response_format: { type: 'json_object' },
			temperature: 0.5
		})

		const evaluatorsResult = JSON.parse(
			evaluatorsResponse.choices[0].message.content || '{"evaluators": []}'
		)
		const evaluators: EvaluatorSpec[] =
			evaluatorsResult.evaluators || evaluatorsResult

		// Step 4: Generate experiment file
		console.error('Generating experiment file...')
		const experimentContent = generateExperimentFile({
			agentFilePath,
			analysis,
			dataset,
			evaluators,
			datasetSize
		})

		// Step 5: Write to disk
		writeFileSync(outputPath, experimentContent, 'utf-8')

		// Step 6: Return result with preview
		return {
			content: [
				{
					type: 'text',
					text: JSON.stringify(
						{
							success: true,
							outputFile: outputPath,
							summary: {
								purpose: analysis.purpose,
								testCases: dataset.length,
								evaluators: evaluators.map((e) => ({
									name: e.name,
									type: e.type,
									reasoning: e.reasoning
								}))
							},
							preview: experimentContent.split('\n').slice(0, 50).join('\n')
						},
						null,
						2
					)
				}
			]
		}
	} catch (error) {
		return {
			content: [
				{
					type: 'text',
					text: JSON.stringify(
						{
							success: false,
							error: error instanceof Error ? error.message : String(error)
						},
						null,
						2
					)
				}
			],
			isError: true
		}
	}
}

/**
 * Generate experiment file content from template
 */
function generateExperimentFile(params: {
	agentFilePath: string
	analysis: AgentAnalysis
	dataset: DatasetItem[]
	evaluators: EvaluatorSpec[]
	datasetSize: number
}): string {
	const { agentFilePath, analysis, dataset, evaluators } = params

	// Build evaluator imports and instances
	const evaluatorCode = evaluators
		.map((ev, i) => {
			const configStr = JSON.stringify(
				{ name: ev.name, type: ev.type, ...ev.config },
				null,
				2
			)
				.split('\n')
				.map((line, idx) => (idx === 0 ? line : `  ${line}`))
				.join('\n')

			return `  new Evaluator(${configStr})`
		})
		.join(',\n')

	// Build dataset items
	const datasetItems = dataset
		.map((item) => {
			const itemStr = JSON.stringify(item, null, 2)
				.split('\n')
				.map((line, idx) => (idx === 0 ? line : '    ' + line))
				.join('\n')
			return `    ${itemStr}`
		})
		.join(',\n')

	// Generate experiment file
	return `/**
 * Auto-generated Cobalt experiment
 * Agent: ${basename(agentFilePath)}
 * Purpose: ${analysis.purpose}
 * Generated: ${new Date().toISOString()}
 */

import { experiment, Dataset, Evaluator } from 'cobalt'

// Import your agent
// TODO: Update this import path to match your agent's export
import { yourAgentFunction } from '${agentFilePath.replace(/\.ts$/, '.js')}'

// Generated test dataset
const dataset = new Dataset({
  items: [
${datasetItems}
  ]
})

// Run experiment
await experiment(
  '${basename(agentFilePath, '.ts')}-test',
  dataset,
  async ({ item }) => {
    // TODO: Adapt this to call your agent correctly
    // The agent analysis suggests input schema: ${JSON.stringify(analysis.inputSchema.description)}
    const result = await yourAgentFunction(item.input)
    return { output: result }
  },
  {
    evaluators: [
${evaluatorCode}
    ],
    runs: 1,
    concurrency: 5
  }
)
`
}
