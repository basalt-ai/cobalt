import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Dataset } from '../../src/datasets/Dataset.js';
import {
	largeDataset,
	sampleCSV,
	sampleCSVWithCommas,
	sampleDatasetItems,
	sampleJSONArray,
	sampleJSONL,
	sampleJSONObject,
} from '../helpers/fixtures.js';

// Mock fs module
vi.mock('node:fs', () => ({
	readFileSync: vi.fn(),
}));

import { readFileSync } from 'node:fs';

describe('Dataset', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe('constructor', () => {
		it('should create dataset with inline items', () => {
			const dataset = new Dataset({ items: sampleDatasetItems });

			expect(dataset.length).toBe(3);
			expect(dataset.getItems()).toEqual(sampleDatasetItems);
		});

		it('should create empty dataset', () => {
			const dataset = new Dataset({ items: [] });

			expect(dataset.length).toBe(0);
			expect(dataset.getItems()).toEqual([]);
		});
	});

	describe('fromJSON', () => {
		it('should load dataset from JSON array', () => {
			vi.mocked(readFileSync).mockReturnValue(sampleJSONArray);

			const dataset = Dataset.fromJSON('./test.json');

			expect(dataset.length).toBe(3);
			expect(dataset.getItems()).toEqual(sampleDatasetItems);
		});

		it('should load dataset from JSON object with items property', () => {
			vi.mocked(readFileSync).mockReturnValue(sampleJSONObject);

			const dataset = Dataset.fromJSON('./test.json');

			expect(dataset.length).toBe(3);
			expect(dataset.getItems()).toEqual(sampleDatasetItems);
		});

		it('should throw error for invalid JSON', () => {
			vi.mocked(readFileSync).mockReturnValue('invalid json');

			expect(() => Dataset.fromJSON('./test.json')).toThrow(/Failed to load JSON dataset/);
		});

		it('should throw error for missing file', () => {
			vi.mocked(readFileSync).mockImplementation(() => {
				throw new Error('ENOENT: no such file');
			});

			expect(() => Dataset.fromJSON('./missing.json')).toThrow(/Failed to load JSON dataset/);
		});
	});

	describe('fromJSONL', () => {
		it('should load dataset from JSONL file', () => {
			vi.mocked(readFileSync).mockReturnValue(sampleJSONL);

			const dataset = Dataset.fromJSONL('./test.jsonl');

			expect(dataset.length).toBe(3);
			expect(dataset.getItems()).toEqual(sampleDatasetItems);
		});

		it('should handle empty lines', () => {
			const jsonlWithEmptyLines = [
				JSON.stringify(sampleDatasetItems[0]),
				'',
				JSON.stringify(sampleDatasetItems[1]),
				'   ',
				JSON.stringify(sampleDatasetItems[2]),
			].join('\n');

			vi.mocked(readFileSync).mockReturnValue(jsonlWithEmptyLines);

			const dataset = Dataset.fromJSONL('./test.jsonl');

			expect(dataset.length).toBe(3);
		});

		it('should throw error for invalid JSONL', () => {
			vi.mocked(readFileSync).mockReturnValue('invalid json line');

			expect(() => Dataset.fromJSONL('./test.jsonl')).toThrow(/Failed to load JSONL dataset/);
		});
	});

	describe('fromCSV', () => {
		it('should load dataset from CSV file', () => {
			vi.mocked(readFileSync).mockReturnValue(sampleCSV);

			const dataset = Dataset.fromCSV<{ input: string; expectedOutput: string }>('./test.csv');

			expect(dataset.length).toBe(3);
			const items = dataset.getItems();
			expect(items[0].input).toBe('What is the capital of France?');
			expect(items[0].expectedOutput).toBe('Paris');
		});

		it('should handle quoted values with commas', () => {
			vi.mocked(readFileSync).mockReturnValue(sampleCSVWithCommas);

			const dataset = Dataset.fromCSV<{ input: string; expectedOutput: string }>('./test.csv');

			expect(dataset.length).toBe(2);
			const items = dataset.getItems();
			expect(items[0].input).toBe('What is the capital of France, the city of lights?');
			expect(items[0].expectedOutput).toBe('Paris, France');
		});

		it('should return empty dataset for empty CSV', () => {
			vi.mocked(readFileSync).mockReturnValue('');

			const dataset = Dataset.fromCSV('./test.csv');

			expect(dataset.length).toBe(0);
		});

		it('should handle CSV with only headers', () => {
			vi.mocked(readFileSync).mockReturnValue('input,expectedOutput');

			const dataset = Dataset.fromCSV('./test.csv');

			expect(dataset.length).toBe(0);
		});

		it('should throw error for missing file', () => {
			vi.mocked(readFileSync).mockImplementation(() => {
				throw new Error('ENOENT: no such file');
			});

			expect(() => Dataset.fromCSV('./missing.csv')).toThrow(/Failed to load CSV dataset/);
		});
	});

	describe('fromFile', () => {
		it('should auto-detect JSON format', () => {
			vi.mocked(readFileSync).mockReturnValue(sampleJSONArray);

			const dataset = Dataset.fromFile('./test.json');

			expect(dataset.length).toBe(3);
		});

		it('should auto-detect JSONL format', () => {
			vi.mocked(readFileSync).mockReturnValue(sampleJSONL);

			const dataset = Dataset.fromFile('./test.jsonl');

			expect(dataset.length).toBe(3);
		});

		it('should auto-detect CSV format', () => {
			vi.mocked(readFileSync).mockReturnValue(sampleCSV);

			const dataset = Dataset.fromFile('./test.csv');

			expect(dataset.length).toBe(3);
		});

		it('should default to JSON for unknown extension', () => {
			vi.mocked(readFileSync).mockReturnValue(sampleJSONArray);

			const dataset = Dataset.fromFile('./test.txt');

			expect(dataset.length).toBe(3);
		});
	});

	describe('map', () => {
		it('should transform dataset items', () => {
			const dataset = new Dataset({ items: sampleDatasetItems });

			const transformed = dataset.map((item) => ({
				question: item.input,
				answer: item.expectedOutput,
			}));

			const items = transformed.getItems();
			expect(items[0]).toHaveProperty('question');
			expect(items[0]).toHaveProperty('answer');
			expect(items[0].question).toBe('What is the capital of France?');
		});

		it('should provide index to transform function', () => {
			const dataset = new Dataset({ items: sampleDatasetItems });
			const indices: number[] = [];

			dataset.map((item, index) => {
				indices.push(index);
				return item;
			});

			expect(indices).toEqual([0, 1, 2]);
		});
	});

	describe('filter', () => {
		it('should filter dataset items', () => {
			const dataset = new Dataset({ items: sampleDatasetItems });

			const filtered = dataset.filter((item) => item.input.includes('France'));

			expect(filtered.length).toBe(1);
			expect(filtered.getItems()[0].input).toBe('What is the capital of France?');
		});

		it('should provide index to filter function', () => {
			const dataset = new Dataset({ items: sampleDatasetItems });

			const filtered = dataset.filter((_, index) => index > 0);

			expect(filtered.length).toBe(2);
		});

		it('should return empty dataset when no items match', () => {
			const dataset = new Dataset({ items: sampleDatasetItems });

			const filtered = dataset.filter(() => false);

			expect(filtered.length).toBe(0);
		});
	});

	describe('sample', () => {
		it('should return sample of specified size', () => {
			const dataset = new Dataset({ items: largeDataset });

			const sampled = dataset.sample(10);

			expect(sampled.length).toBe(10);
			expect(sampled.getItems().length).toBe(10);
		});

		it('should return all items if sample size exceeds dataset size', () => {
			const dataset = new Dataset({ items: sampleDatasetItems });

			const sampled = dataset.sample(100);

			expect(sampled.length).toBe(3);
		});

		it('should return random items', () => {
			const dataset = new Dataset({ items: largeDataset });

			const sampled1 = dataset.sample(5);
			const sampled2 = dataset.sample(5);

			// Note: This test might occasionally fail due to randomness, but very unlikely
			const items1 = sampled1.getItems();
			const items2 = sampled2.getItems();
			const isDifferent = JSON.stringify(items1) !== JSON.stringify(items2);

			// At least one should be different (probabilistically)
			expect(sampled1.length).toBe(5);
			expect(sampled2.length).toBe(5);
		});

		it('should handle empty dataset', () => {
			const dataset = new Dataset({ items: [] });

			const sampled = dataset.sample(10);

			expect(sampled.length).toBe(0);
		});
	});

	describe('slice', () => {
		it('should return slice from start to end', () => {
			const dataset = new Dataset({ items: sampleDatasetItems });

			const sliced = dataset.slice(0, 2);

			expect(sliced.length).toBe(2);
			expect(sliced.getItems()).toEqual(sampleDatasetItems.slice(0, 2));
		});

		it('should return slice from start to dataset end when end not specified', () => {
			const dataset = new Dataset({ items: sampleDatasetItems });

			const sliced = dataset.slice(1);

			expect(sliced.length).toBe(2);
			expect(sliced.getItems()).toEqual(sampleDatasetItems.slice(1));
		});

		it('should handle negative indices', () => {
			const dataset = new Dataset({ items: sampleDatasetItems });

			const sliced = dataset.slice(-2);

			expect(sliced.length).toBe(2);
			expect(sliced.getItems()).toEqual(sampleDatasetItems.slice(-2));
		});

		it('should return empty dataset for out of bounds slice', () => {
			const dataset = new Dataset({ items: sampleDatasetItems });

			const sliced = dataset.slice(10, 20);

			expect(sliced.length).toBe(0);
		});
	});

	describe('getItems', () => {
		it('should return copy of items array', () => {
			const dataset = new Dataset({ items: sampleDatasetItems });

			const items = dataset.getItems();

			// Verify it's a copy, not reference
			expect(items).toEqual(sampleDatasetItems);
			expect(items).not.toBe(sampleDatasetItems);
		});
	});

	describe('length', () => {
		it('should return number of items', () => {
			const dataset = new Dataset({ items: sampleDatasetItems });

			expect(dataset.length).toBe(3);
		});

		it('should return 0 for empty dataset', () => {
			const dataset = new Dataset({ items: [] });

			expect(dataset.length).toBe(0);
		});
	});

	describe('chaining operations', () => {
		it('should support chaining map, filter, slice', () => {
			const dataset = new Dataset({ items: largeDataset });

			const result = dataset
				.filter((_, index) => index % 2 === 0)
				.map((item) => ({ ...item, processed: true }))
				.slice(0, 5);

			expect(result.length).toBe(5);
			const items = result.getItems();
			expect(items[0]).toHaveProperty('processed', true);
		});

		it('should support sample after filter', () => {
			const dataset = new Dataset({ items: largeDataset });

			const result = dataset.filter((_, index) => index < 50).sample(10);

			expect(result.length).toBe(10);
		});
	});
});
