import type { ExperimentItem } from '../../types/index.js';

/**
 * Fetch dataset from remote URL
 * Supports JSON and JSONL formats
 * @param url - HTTP/HTTPS URL to fetch dataset from
 * @returns Array of experiment items
 */
export async function fetchRemoteDataset(url: string): Promise<ExperimentItem[]> {
	try {
		// Validate URL
		const parsedUrl = new URL(url);
		if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
			throw new Error(`Unsupported protocol: ${parsedUrl.protocol}. Only HTTP and HTTPS are supported.`);
		}

		// Fetch dataset
		const response = await fetch(url);

		if (!response.ok) {
			throw new Error(`HTTP error ${response.status}: ${response.statusText}`);
		}

		const contentType = response.headers.get('content-type') || '';
		const text = await response.text();

		// Detect format by content-type or URL extension
		const isJSONL =
			contentType.includes('application/jsonl') ||
			contentType.includes('application/x-jsonl') ||
			url.endsWith('.jsonl');

		if (isJSONL) {
			// Parse JSONL (one JSON object per line)
			const lines = text.split('\n').filter((line) => line.trim());
			const items = lines.map((line, index) => {
				try {
					return JSON.parse(line);
				} catch (error) {
					throw new Error(`Failed to parse JSONL line ${index + 1}: ${error}`);
				}
			});
			return items;
		}

		// Parse JSON (default)
		try {
			const data = JSON.parse(text);

			// Support both array and object with items property
			let items: unknown;
			if (Array.isArray(data)) {
				items = data;
			} else if (data && typeof data === 'object' && 'items' in data) {
				items = data.items;
			} else {
				throw new Error('Dataset must be an array or object with "items" array property');
			}

			if (!Array.isArray(items)) {
				throw new Error('Dataset must be an array or object with "items" array property');
			}

			return items;
		} catch (error) {
			throw new Error(`Failed to parse JSON response: ${error}`);
		}
	} catch (error) {
		if (error instanceof Error) {
			throw new Error(`Failed to fetch remote dataset from ${url}: ${error.message}`);
		}
		throw new Error(`Failed to fetch remote dataset from ${url}: Unknown error`);
	}
}
