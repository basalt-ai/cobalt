import type { ExperimentItem } from '../../types/index.js';

/**
 * Langfuse dataset item format (from their API)
 */
interface LangfuseDatasetItem {
	id: string;
	input: unknown;
	expectedOutput?: unknown;
	metadata?: Record<string, unknown>;
	[key: string]: unknown;
}

/**
 * Fetch dataset from Langfuse
 * @param datasetName - Name of the dataset in Langfuse
 * @param options - Configuration options
 * @returns Array of experiment items
 */
export async function fetchLangfuseDataset(
	datasetName: string,
	options?: {
		apiKey?: string;
		publicKey?: string;
		secretKey?: string;
		baseUrl?: string;
	},
): Promise<ExperimentItem[]> {
	const baseUrl = options?.baseUrl || 'https://cloud.langfuse.com';
	const apiKey = options?.apiKey || process.env.LANGFUSE_API_KEY;
	const publicKey = options?.publicKey || process.env.LANGFUSE_PUBLIC_KEY;
	const secretKey = options?.secretKey || process.env.LANGFUSE_SECRET_KEY;

	// Langfuse supports either API key or public/secret key pair
	if (!apiKey && (!publicKey || !secretKey)) {
		throw new Error(
			'Langfuse API key is required. Set LANGFUSE_API_KEY or LANGFUSE_PUBLIC_KEY/LANGFUSE_SECRET_KEY in environment or config.',
		);
	}

	try {
		// Construct API URL for fetching dataset items
		const url = `${baseUrl}/api/public/v1/datasets/${encodeURIComponent(datasetName)}/items`;

		// Prepare authorization header
		let authHeader: string;
		if (apiKey) {
			authHeader = `Bearer ${apiKey}`;
		} else {
			// Use basic auth with public:secret key pair
			const credentials = Buffer.from(`${publicKey}:${secretKey}`).toString('base64');
			authHeader = `Basic ${credentials}`;
		}

		// Fetch dataset from Langfuse API
		const response = await fetch(url, {
			headers: {
				Authorization: authHeader,
				'Content-Type': 'application/json',
			},
		});

		if (!response.ok) {
			const errorText = await response.text();
			throw new Error(`Langfuse API error ${response.status}: ${errorText}`);
		}

		const data = await response.json();

		// Langfuse returns { data: [...items] }
		const langfuseItems = (data.data || data.items || data) as LangfuseDatasetItem[];

		if (!Array.isArray(langfuseItems)) {
			throw new Error('Langfuse API response is not an array');
		}

		// Transform Langfuse format to Cobalt format
		const items: ExperimentItem[] = langfuseItems.map((item) => {
			const transformed: ExperimentItem = {};

			// Map Langfuse fields to Cobalt fields
			if (item.input !== undefined) {
				transformed.input =
					typeof item.input === 'string' ? item.input : JSON.stringify(item.input);
			}

			if (item.expectedOutput !== undefined) {
				transformed.expectedOutput =
					typeof item.expectedOutput === 'string'
						? item.expectedOutput
						: JSON.stringify(item.expectedOutput);
			}

			// Include metadata
			if (item.metadata) {
				transformed.metadata = item.metadata;
			}

			// Include Langfuse ID for traceability
			transformed.langfuseId = item.id;

			// Include any other fields from Langfuse item
			for (const [key, value] of Object.entries(item)) {
				if (!['id', 'input', 'expectedOutput', 'metadata'].includes(key)) {
					transformed[key] = value;
				}
			}

			return transformed;
		});

		return items;
	} catch (error) {
		if (error instanceof Error) {
			throw new Error(`Failed to fetch Langfuse dataset "${datasetName}": ${error.message}`);
		}
		throw new Error(`Failed to fetch Langfuse dataset "${datasetName}": Unknown error`);
	}
}
