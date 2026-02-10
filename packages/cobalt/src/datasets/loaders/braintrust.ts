import type { ExperimentItem } from '../../types/index.js';

/**
 * Braintrust dataset record format (from their API)
 */
interface BraintrustDatasetRecord {
	id: string;
	input: unknown;
	expected?: unknown;
	metadata?: Record<string, unknown>;
	tags?: string[];
	[key: string]: unknown;
}

/**
 * Fetch dataset from Braintrust
 * @param projectName - Name of the project in Braintrust
 * @param datasetName - Name of the dataset in Braintrust
 * @param options - Configuration options
 * @returns Array of experiment items
 */
export async function fetchBraintrustDataset(
	projectName: string,
	datasetName: string,
	options?: {
		apiKey?: string;
		baseUrl?: string;
	},
): Promise<ExperimentItem[]> {
	const baseUrl = options?.baseUrl || 'https://api.braintrust.dev';
	const apiKey = options?.apiKey || process.env.BRAINTRUST_API_KEY;

	if (!apiKey) {
		throw new Error(
			'Braintrust API key is required. Set BRAINTRUST_API_KEY in environment or config.',
		);
	}

	try {
		// Construct API URL for fetching dataset records
		const url = `${baseUrl}/v1/dataset/${encodeURIComponent(projectName)}/${encodeURIComponent(datasetName)}/fetch`;

		// Fetch dataset from Braintrust API
		const response = await fetch(url, {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${apiKey}`,
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				limit: 1000, // Fetch up to 1000 records (adjust as needed)
			}),
		});

		if (!response.ok) {
			const errorText = await response.text();
			throw new Error(`Braintrust API error ${response.status}: ${errorText}`);
		}

		const data = await response.json();

		// Braintrust returns { events: [...records] } or { records: [...] }
		const records = (data.events || data.records || data) as BraintrustDatasetRecord[];

		if (!Array.isArray(records)) {
			throw new Error('Braintrust API response is not an array');
		}

		// Transform Braintrust format to Cobalt format
		const items: ExperimentItem[] = records.map((record) => {
			const transformed: ExperimentItem = {};

			// Map input
			if (record.input !== undefined) {
				transformed.input =
					typeof record.input === 'string' ? record.input : JSON.stringify(record.input);
			}

			// Map expected output (Braintrust uses "expected" field)
			if (record.expected !== undefined) {
				transformed.expectedOutput =
					typeof record.expected === 'string' ? record.expected : JSON.stringify(record.expected);
			}

			// Include metadata
			if (record.metadata) {
				transformed.metadata = record.metadata;
			}

			// Include tags
			if (record.tags && record.tags.length > 0) {
				if (!transformed.metadata) {
					transformed.metadata = {};
				}
				transformed.metadata.tags = record.tags;
			}

			// Include Braintrust ID for traceability
			transformed.braintrustId = record.id;

			// Include any other fields from Braintrust record
			for (const [key, value] of Object.entries(record)) {
				if (!['id', 'input', 'expected', 'metadata', 'tags'].includes(key)) {
					transformed[key] = value;
				}
			}

			return transformed;
		});

		return items;
	} catch (error) {
		if (error instanceof Error) {
			throw new Error(
				`Failed to fetch Braintrust dataset "${projectName}/${datasetName}": ${error.message}`,
			);
		}
		throw new Error(
			`Failed to fetch Braintrust dataset "${projectName}/${datasetName}": Unknown error`,
		);
	}
}
