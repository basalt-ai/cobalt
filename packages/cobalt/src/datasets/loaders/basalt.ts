import type { ExperimentItem } from '../../types/index.js';

/**
 * Basalt dataset item format (from their API)
 */
interface BasaltDatasetItem {
	id: string;
	input: unknown;
	output?: unknown;
	metadata?: Record<string, unknown>;
	[key: string]: unknown;
}

/**
 * Fetch dataset from Basalt
 * @param datasetId - ID of the dataset in Basalt
 * @param options - Configuration options
 * @returns Array of experiment items
 */
export async function fetchBasaltDataset(
	datasetId: string,
	options?: {
		apiKey?: string;
		baseUrl?: string;
	},
): Promise<ExperimentItem[]> {
	const baseUrl = options?.baseUrl || 'https://api.basalt.ai';
	const apiKey = options?.apiKey || process.env.BASALT_API_KEY;

	if (!apiKey) {
		throw new Error('Basalt API key is required. Set BASALT_API_KEY in environment or config.');
	}

	try {
		// Construct API URL for fetching dataset
		const url = `${baseUrl}/v1/datasets/${encodeURIComponent(datasetId)}/items`;

		// Fetch dataset from Basalt API
		const response = await fetch(url, {
			headers: {
				Authorization: `Bearer ${apiKey}`,
				'Content-Type': 'application/json',
			},
		});

		if (!response.ok) {
			const errorText = await response.text();
			throw new Error(`Basalt API error ${response.status}: ${errorText}`);
		}

		const data = await response.json();

		// Basalt returns { items: [...] } or direct array
		const basaltItems = (data.items || data.data || data) as BasaltDatasetItem[];

		if (!Array.isArray(basaltItems)) {
			throw new Error('Basalt API response is not an array');
		}

		// Transform Basalt format to Cobalt format
		const items: ExperimentItem[] = basaltItems.map((item) => {
			const transformed: ExperimentItem = {};

			// Map input
			if (item.input !== undefined) {
				transformed.input =
					typeof item.input === 'string' ? item.input : JSON.stringify(item.input);
			}

			// Map output (Basalt uses "output" field)
			if (item.output !== undefined) {
				transformed.expectedOutput =
					typeof item.output === 'string' ? item.output : JSON.stringify(item.output);
			}

			// Include metadata
			if (item.metadata) {
				transformed.metadata = item.metadata;
			}

			// Include Basalt ID for traceability
			transformed.basaltId = item.id;

			// Include any other fields from Basalt item
			for (const [key, value] of Object.entries(item)) {
				if (!['id', 'input', 'output', 'metadata'].includes(key)) {
					transformed[key] = value;
				}
			}

			return transformed;
		});

		return items;
	} catch (error) {
		if (error instanceof Error) {
			throw new Error(`Failed to fetch Basalt dataset "${datasetId}": ${error.message}`);
		}
		throw new Error(`Failed to fetch Basalt dataset "${datasetId}": Unknown error`);
	}
}
