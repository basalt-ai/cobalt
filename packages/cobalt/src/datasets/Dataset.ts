import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { DatasetConfig, ExperimentItem } from '../types/index.js';
import { fetchBasaltDataset } from './loaders/basalt.js';
import { fetchBraintrustDataset } from './loaders/braintrust.js';
import { fetchLangfuseDataset } from './loaders/langfuse.js';
import { fetchLangSmithDataset } from './loaders/langsmith.js';
import { fetchRemoteDataset } from './loaders/remote.js';

/**
 * Dataset class for managing experiment data
 * Supports inline items, file loading (JSON, CSV, JSONL), and transformations
 */
export class Dataset<T = ExperimentItem> {
	private items: T[];

	constructor(config: DatasetConfig<T>) {
		this.items = config.items;
	}

	/**
	 * Create dataset from file (auto-detects format by extension)
	 * @param path - Path to dataset file
	 * @returns Dataset instance
	 */
	static fromFile<T = ExperimentItem>(path: string): Dataset<T> {
		const resolvedPath = resolve(process.cwd(), path);

		if (path.endsWith('.json')) {
			return Dataset.fromJSON<T>(resolvedPath);
		}
		if (path.endsWith('.jsonl')) {
			return Dataset.fromJSONL<T>(resolvedPath);
		}
		if (path.endsWith('.csv')) {
			return Dataset.fromCSV<T>(resolvedPath);
		}
		// Try JSON by default
		return Dataset.fromJSON<T>(resolvedPath);
	}

	/**
	 * Load dataset from JSON file
	 * @param path - Path to JSON file
	 * @returns Dataset instance
	 */
	static fromJSON<T = ExperimentItem>(path: string): Dataset<T> {
		try {
			const content = readFileSync(path, 'utf-8');
			const data = JSON.parse(content);

			// Support both array and object with items property
			const items = Array.isArray(data) ? data : data.items || [];

			return new Dataset<T>({ items });
		} catch (error) {
			throw new Error(`Failed to load JSON dataset from ${path}: ${error}`);
		}
	}

	/**
	 * Load dataset from JSONL file (one JSON object per line)
	 * @param path - Path to JSONL file
	 * @returns Dataset instance
	 */
	static fromJSONL<T = ExperimentItem>(path: string): Dataset<T> {
		try {
			const content = readFileSync(path, 'utf-8');
			const lines = content.split('\n').filter((line) => line.trim());
			const items = lines.map((line) => JSON.parse(line));

			return new Dataset<T>({ items });
		} catch (error) {
			throw new Error(`Failed to load JSONL dataset from ${path}: ${error}`);
		}
	}

	/**
	 * Load dataset from CSV file
	 * Note: Basic CSV parsing, may need enhancement for complex CSVs
	 * @param path - Path to CSV file
	 * @returns Dataset instance
	 */
	static fromCSV<T = ExperimentItem>(path: string): Dataset<T> {
		try {
			const content = readFileSync(path, 'utf-8');
			const lines = content.split('\n').filter((line) => line.trim());

			if (lines.length === 0) {
				return new Dataset<T>({ items: [] });
			}

			// Parse header
			const headerLine = lines[0];
			if (!headerLine) {
				return new Dataset<T>({ items: [] });
			}
			const headers = parseCSVLine(headerLine);

			// Parse rows
			const items = lines.slice(1).map((line) => {
				const values = parseCSVLine(line);
				const item: Record<string, string> = {};

				headers.forEach((header, index) => {
					const value = values[index];
					item[header] = value !== undefined ? value : '';
				});

				return item as T;
			});

			return new Dataset<T>({ items });
		} catch (error) {
			throw new Error(`Failed to load CSV dataset from ${path}: ${error}`);
		}
	}

	/**
	 * Load dataset from remote URL (HTTP/HTTPS)
	 * Supports JSON and JSONL formats
	 * @param url - HTTP/HTTPS URL to fetch dataset from
	 * @returns Promise resolving to Dataset instance
	 * @example
	 * ```ts
	 * const dataset = await Dataset.fromRemote('https://example.com/datasets/qa.json')
	 * ```
	 */
	static async fromRemote<T = ExperimentItem>(url: string): Promise<Dataset<T>> {
		const items = await fetchRemoteDataset(url);
		return new Dataset<T>({ items: items as T[] });
	}

	/**
	 * Load dataset from Langfuse
	 * @param datasetName - Name of the dataset in Langfuse
	 * @param options - Configuration options (apiKey, publicKey, secretKey, baseUrl)
	 * @returns Promise resolving to Dataset instance
	 * @example
	 * ```ts
	 * const dataset = await Dataset.fromLangfuse('my-dataset', {
	 *   apiKey: process.env.LANGFUSE_API_KEY
	 * })
	 * ```
	 */
	static async fromLangfuse<T = ExperimentItem>(
		datasetName: string,
		options?: {
			apiKey?: string;
			publicKey?: string;
			secretKey?: string;
			baseUrl?: string;
		},
	): Promise<Dataset<T>> {
		const items = await fetchLangfuseDataset(datasetName, options);
		return new Dataset<T>({ items: items as T[] });
	}

	/**
	 * Load dataset from LangSmith
	 * @param datasetName - Name of the dataset in LangSmith
	 * @param options - Configuration options (apiKey, baseUrl)
	 * @returns Promise resolving to Dataset instance
	 * @example
	 * ```ts
	 * const dataset = await Dataset.fromLangsmith('my-dataset', {
	 *   apiKey: process.env.LANGSMITH_API_KEY
	 * })
	 * ```
	 */
	static async fromLangsmith<T = ExperimentItem>(
		datasetName: string,
		options?: {
			apiKey?: string;
			baseUrl?: string;
		},
	): Promise<Dataset<T>> {
		const items = await fetchLangSmithDataset(datasetName, options);
		return new Dataset<T>({ items: items as T[] });
	}

	/**
	 * Load dataset from Braintrust
	 * @param projectName - Name of the project in Braintrust
	 * @param datasetName - Name of the dataset in Braintrust
	 * @param options - Configuration options (apiKey, baseUrl)
	 * @returns Promise resolving to Dataset instance
	 * @example
	 * ```ts
	 * const dataset = await Dataset.fromBraintrust('my-project', 'my-dataset', {
	 *   apiKey: process.env.BRAINTRUST_API_KEY
	 * })
	 * ```
	 */
	static async fromBraintrust<T = ExperimentItem>(
		projectName: string,
		datasetName: string,
		options?: {
			apiKey?: string;
			baseUrl?: string;
		},
	): Promise<Dataset<T>> {
		const items = await fetchBraintrustDataset(projectName, datasetName, options);
		return new Dataset<T>({ items: items as T[] });
	}

	/**
	 * Load dataset from Basalt
	 * @param datasetId - ID of the dataset in Basalt
	 * @param options - Configuration options (apiKey, baseUrl)
	 * @returns Promise resolving to Dataset instance
	 * @example
	 * ```ts
	 * const dataset = await Dataset.fromBasalt('dataset-123', {
	 *   apiKey: process.env.BASALT_API_KEY
	 * })
	 * ```
	 */
	static async fromBasalt<T = ExperimentItem>(
		datasetId: string,
		options?: {
			apiKey?: string;
			baseUrl?: string;
		},
	): Promise<Dataset<T>> {
		const items = await fetchBasaltDataset(datasetId, options);
		return new Dataset<T>({ items: items as T[] });
	}

	/**
	 * Transform dataset items
	 * @param fn - Transformation function
	 * @returns New dataset with transformed items
	 */
	map<U>(fn: (item: T, index: number) => U): Dataset<U> {
		const transformedItems = this.items.map(fn);
		return new Dataset<U>({ items: transformedItems });
	}

	/**
	 * Get random sample of items
	 * @param n - Number of items to sample
	 * @returns New dataset with sampled items
	 */
	sample(n: number): Dataset<T> {
		const shuffled = [...this.items].sort(() => Math.random() - 0.5);
		const sampled = shuffled.slice(0, Math.min(n, this.items.length));
		return new Dataset<T>({ items: sampled });
	}

	/**
	 * Get slice of items
	 * @param start - Start index
	 * @param end - End index (optional)
	 * @returns New dataset with sliced items
	 */
	slice(start: number, end?: number): Dataset<T> {
		const sliced = this.items.slice(start, end);
		return new Dataset<T>({ items: sliced });
	}

	/**
	 * Filter dataset items
	 * @param predicate - Filter function
	 * @returns New dataset with filtered items
	 */
	filter(predicate: (item: T, index: number) => boolean): Dataset<T> {
		const filtered = this.items.filter(predicate);
		return new Dataset<T>({ items: filtered });
	}

	/**
	 * Get all items
	 * @returns Array of items
	 */
	getItems(): T[] {
		return [...this.items];
	}

	/**
	 * Get number of items
	 * @returns Number of items
	 */
	get length(): number {
		return this.items.length;
	}
}

/**
 * Parse a CSV line (handles quoted values)
 * @param line - CSV line to parse
 * @returns Array of values
 */
function parseCSVLine(line: string): string[] {
	const result: string[] = [];
	let current = '';
	let inQuotes = false;

	for (let i = 0; i < line.length; i++) {
		const char = line[i];

		if (char === '"') {
			inQuotes = !inQuotes;
		} else if (char === ',' && !inQuotes) {
			result.push(current.trim());
			current = '';
		} else {
			current += char;
		}
	}

	result.push(current.trim());
	return result;
}
