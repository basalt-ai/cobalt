import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
	CallToolRequestSchema,
	GetPromptRequestSchema,
	ListPromptsRequestSchema,
	ListResourcesRequestSchema,
	ListToolsRequestSchema,
	ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

import { cobaltCompareTool, handleCobaltCompare } from './tools/compare.js';
import { cobaltGenerateTool, handleCobaltGenerate } from './tools/generate.js';
import { cobaltResultsTool, handleCobaltResults } from './tools/results.js';
import { cobaltRunTool, handleCobaltRun } from './tools/run.js';

import { cobaltConfigResource, handleCobaltConfig } from './resources/config.js';
import { cobaltExperimentsResource, handleCobaltExperiments } from './resources/experiments.js';
import {
	cobaltLatestResultsResource,
	handleCobaltLatestResults,
} from './resources/latest-results.js';

import {
	cobaltGenerateTestsPrompt,
	cobaltImproveAgentPrompt,
	cobaltRegressionCheckPrompt,
	getCobaltGenerateTestsPrompt,
	getCobaltImproveAgentPrompt,
	getCobaltRegressionCheckPrompt,
} from './prompts/index.js';

/**
 * Start the Cobalt MCP server
 * Provides tools for Claude Code to run experiments and analyze results
 */
export async function startMCPServer() {
	const server = new Server(
		{
			name: 'cobalt',
			version: '0.2.0',
		},
		{
			capabilities: {
				tools: {},
				resources: {},
				prompts: {},
			},
		},
	);

	// Register tool list handler
	server.setRequestHandler(ListToolsRequestSchema, async () => {
		return {
			tools: [cobaltRunTool, cobaltResultsTool, cobaltCompareTool, cobaltGenerateTool],
		};
	});

	// Register tool call handler
	server.setRequestHandler(CallToolRequestSchema, async (request) => {
		const { name, arguments: args } = request.params;

		try {
			switch (name) {
				case 'cobalt_run':
					return await handleCobaltRun(args);

				case 'cobalt_results':
					return await handleCobaltResults(args);

				case 'cobalt_compare':
					return await handleCobaltCompare(args);

				case 'cobalt_generate':
					return await handleCobaltGenerate(args);

				default:
					throw new Error(`Unknown tool: ${name}`);
			}
		} catch (error) {
			return {
				content: [
					{
						type: 'text',
						text: JSON.stringify(
							{
								error: error instanceof Error ? error.message : String(error),
							},
							null,
							2,
						),
					},
				],
				isError: true,
			};
		}
	});

	// Register resource list handler
	server.setRequestHandler(ListResourcesRequestSchema, async () => {
		return {
			resources: [cobaltConfigResource, cobaltExperimentsResource, cobaltLatestResultsResource],
		};
	});

	// Register resource read handler
	server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
		const { uri } = request.params;

		switch (uri) {
			case 'cobalt://config':
				return await handleCobaltConfig();

			case 'cobalt://experiments':
				return await handleCobaltExperiments();

			case 'cobalt://latest-results':
				return await handleCobaltLatestResults();

			default:
				throw new Error(`Unknown resource: ${uri}`);
		}
	});

	// Register prompt list handler
	server.setRequestHandler(ListPromptsRequestSchema, async () => {
		return {
			prompts: [cobaltImproveAgentPrompt, cobaltGenerateTestsPrompt, cobaltRegressionCheckPrompt],
		};
	});

	// Register prompt get handler
	server.setRequestHandler(GetPromptRequestSchema, async (request) => {
		const { name, arguments: args } = request.params;

		switch (name) {
			case 'improve-agent':
				return getCobaltImproveAgentPrompt(args || {});

			case 'generate-tests':
				return getCobaltGenerateTestsPrompt(args || {});

			case 'regression-check':
				return getCobaltRegressionCheckPrompt(args || {});

			default:
				throw new Error(`Unknown prompt: ${name}`);
		}
	});

	// Connect via stdio
	const transport = new StdioServerTransport();
	await server.connect(transport);

	console.error('Cobalt MCP server started');
}
