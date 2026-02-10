import type { ExperimentItem } from '../../types/index.js';

/**
 * LangSmith dataset example format (from their API)
 */
interface LangSmithExample {
	id: string;
	inputs: Record<string, unknown>;
	outputs?: Record<string, unknown>;
	metadata?: Record<string, unknown>;
	[key: string]: unknown;
}

/**
 * Fetch dataset from LangSmith
 * @param datasetName - Name of the dataset in LangSmith
 * @param options - Configuration options
 * @returns Array of experiment items
 */
export async function fetchLangSmithDataset(
	datasetName: string,
	options?: {
		apiKey?: string;
		baseUrl?: string;
	},
): Promise<ExperimentItem[]> {
	const baseUrl = options?.baseUrl || 'https://api.smith.langchain.com';
	const apiKey = options?.apiKey || process.env.LANGSMITH_API_KEY;

	if (!apiKey) {
		throw new Error(
			'LangSmith API key is required. Set LANGSMITH_API_KEY in environment or config.',
		);
	}

	try {
		// First, get the dataset ID by name
		const datasetsUrl = `${baseUrl}/datasets?name=${encodeURIComponent(datasetName)}`;

		const datasetsResponse = await fetch(datasetsUrl, {
			headers: {
				'X-API-Key': apiKey,
				'Content-Type': 'application/json',
			},
		});

		if (!datasetsResponse.ok) {
			const errorText = await datasetsResponse.text();
			throw new Error(`LangSmith API error ${datasetsResponse.status}: ${errorText}`);
		}

		const datasetsData = await datasetsResponse.json();
		const datasets = Array.isArray(datasetsData) ? datasetsData : [];

		if (datasets.length === 0) {
			throw new Error(`Dataset "${datasetName}" not found in LangSmith`);
		}

		const datasetId = datasets[0].id;

		// Fetch examples for this dataset
		const examplesUrl = `${baseUrl}/examples?dataset=${datasetId}`;

		const examplesResponse = await fetch(examplesUrl, {
			headers: {
				'X-API-Key': apiKey,
				'Content-Type': 'application/json',
			},
		});

		if (!examplesResponse.ok) {
			const errorText = await examplesResponse.text();
			throw new Error(`LangSmith API error ${examplesResponse.status}: ${errorText}`);
		}

		const examples = (await examplesResponse.json()) as LangSmithExample[];

		if (!Array.isArray(examples)) {
			throw new Error('LangSmith API response is not an array');
		}

		// Transform LangSmith format to Cobalt format
		const items: ExperimentItem[] = examples.map((example) => {
			const transformed: ExperimentItem = {};

			// Map inputs - LangSmith uses "inputs" object
			if (example.inputs) {
				// If inputs has a single field, use it directly
				const inputKeys = Object.keys(example.inputs);
				if (inputKeys.length === 1) {
					const value = example.inputs[inputKeys[0]];
					transformed.input = typeof value === 'string' ? value : JSON.stringify(value);
				} else {
					// Multiple input fields - stringify the whole object
					transformed.input = JSON.stringify(example.inputs);
				}

				// Also include raw inputs for reference
				transformed.inputs = example.inputs;
			}

			// Map outputs - LangSmith uses "outputs" object
			if (example.outputs) {
				const outputKeys = Object.keys(example.outputs);
				if (outputKeys.length === 1) {
					const value = example.outputs[outputKeys[0]];
					transformed.expectedOutput = typeof value === 'string' ? value : JSON.stringify(value);
				} else {
					transformed.expectedOutput = JSON.stringify(example.outputs);
				}

				// Also include raw outputs for reference
				transformed.outputs = example.outputs;
			}

			// Include metadata
			if (example.metadata) {
				transformed.metadata = example.metadata;
			}

			// Include LangSmith ID for traceability
			transformed.langsmithId = example.id;

			// Include any other fields from LangSmith example
			for (const [key, value] of Object.entries(example)) {
				if (!['id', 'inputs', 'outputs', 'metadata'].includes(key)) {
					transformed[key] = value;
				}
			}

			return transformed;
		});

		return items;
	} catch (error) {
		if (error instanceof Error) {
			throw new Error(`Failed to fetch LangSmith dataset "${datasetName}": ${error.message}`);
		}
		throw new Error(`Failed to fetch LangSmith dataset "${datasetName}": Unknown error`);
	}
}
