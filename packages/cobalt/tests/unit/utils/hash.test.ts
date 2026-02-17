import { describe, expect, it } from 'vitest';
import { generateHash } from '../../../src/utils/hash.js';

describe('generateHash', () => {
	it('should produce deterministic output for same input', () => {
		const hash1 = generateHash('test input');
		const hash2 = generateHash('test input');

		expect(hash1).toBe(hash2);
	});

	it('should produce different hashes for different inputs', () => {
		const hash1 = generateHash('input A');
		const hash2 = generateHash('input B');

		expect(hash1).not.toBe(hash2);
	});

	it('should return a 64-character hex string (SHA-256)', () => {
		const hash = generateHash('test');

		expect(hash).toMatch(/^[0-9a-f]{64}$/);
	});

	it('should handle multiple arguments', () => {
		const hash1 = generateHash('a', 'b', 'c');
		const hash2 = generateHash('a', 'b', 'c');
		const hash3 = generateHash('a', 'b', 'd');

		expect(hash1).toBe(hash2);
		expect(hash1).not.toBe(hash3);
	});

	it('should stringify objects', () => {
		const hash1 = generateHash({ key: 'value' });
		const hash2 = generateHash({ key: 'value' });

		expect(hash1).toBe(hash2);
	});

	it('should produce different hashes for different objects', () => {
		const hash1 = generateHash({ key: 'value1' });
		const hash2 = generateHash({ key: 'value2' });

		expect(hash1).not.toBe(hash2);
	});

	it('should handle mixed types', () => {
		const hash = generateHash('string', 42, { key: true });

		expect(hash).toMatch(/^[0-9a-f]{64}$/);
	});
});
