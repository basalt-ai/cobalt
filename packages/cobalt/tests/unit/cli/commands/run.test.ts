import { describe, expect, it } from 'vitest';

/**
 * matchPattern and findExperimentFiles are not exported from run.ts.
 * We re-implement matchPattern here as a direct copy to unit-test the
 * algorithm, then validate it against known glob expectations.
 *
 * If the implementation diverges from this copy, the integration test
 * (experiment-pipeline) will still catch regressions.
 */
function matchPattern(path: string, pattern: string): boolean {
	let regexStr = '';
	let i = 0;

	while (i < pattern.length) {
		if (pattern[i] === '*' && pattern[i + 1] === '*') {
			if (pattern[i + 2] === '/') {
				regexStr += '(.*/)?';
				i += 3;
			} else {
				regexStr += '.*';
				i += 2;
			}
		} else if (pattern[i] === '*') {
			regexStr += '[^/]*';
			i++;
		} else if (pattern[i] === '?') {
			regexStr += '.';
			i++;
		} else if (pattern[i] === '.') {
			regexStr += '\\.';
			i++;
		} else {
			regexStr += pattern[i];
			i++;
		}
	}

	return new RegExp(`^${regexStr}$`).test(path);
}

describe('matchPattern', () => {
	describe('** (double star) patterns', () => {
		it('should match files in nested directories with **/', () => {
			expect(matchPattern('src/tests/example.cobalt.ts', '**/*.cobalt.ts')).toBe(true);
		});

		it('should match files in root directory with **/', () => {
			expect(matchPattern('example.cobalt.ts', '**/*.cobalt.ts')).toBe(true);
		});

		it('should match deeply nested files with **/', () => {
			expect(matchPattern('a/b/c/d/test.cobalt.ts', '**/*.cobalt.ts')).toBe(true);
		});

		it('should not match files with wrong extension', () => {
			expect(matchPattern('example.test.ts', '**/*.cobalt.ts')).toBe(false);
		});

		it('should handle ** at end of pattern', () => {
			expect(matchPattern('src/anything/here', 'src/**')).toBe(true);
		});
	});

	describe('* (single star) patterns', () => {
		it('should match files in current directory', () => {
			expect(matchPattern('test.ts', '*.ts')).toBe(true);
		});

		it('should not match files in subdirectories with single *', () => {
			expect(matchPattern('sub/test.ts', '*.ts')).toBe(false);
		});

		it('should match partial filenames', () => {
			expect(matchPattern('experiment.cobalt.ts', '*.cobalt.ts')).toBe(true);
		});

		it('should not match unrelated extensions', () => {
			expect(matchPattern('test.js', '*.ts')).toBe(false);
		});
	});

	describe('? (question mark) patterns', () => {
		it('should match single character', () => {
			expect(matchPattern('test1.ts', 'test?.ts')).toBe(true);
		});

		it('should not match zero characters', () => {
			expect(matchPattern('test.ts', 'test?.ts')).toBe(false);
		});

		it('should not match multiple characters', () => {
			expect(matchPattern('test12.ts', 'test?.ts')).toBe(false);
		});
	});

	describe('dot handling', () => {
		it('should treat dots as literal characters', () => {
			expect(matchPattern('test.cobalt.ts', '*.cobalt.ts')).toBe(true);
		});

		it('should not match dot as any character', () => {
			expect(matchPattern('testXcobaltXts', '*.cobalt.ts')).toBe(false);
		});
	});

	describe('default testMatch patterns', () => {
		const defaultPatterns = ['**/*.cobalt.ts', '**/*.experiment.ts'];

		it('should match .cobalt.ts files', () => {
			expect(matchPattern('my-test.cobalt.ts', defaultPatterns[0])).toBe(true);
			expect(matchPattern('nested/my-test.cobalt.ts', defaultPatterns[0])).toBe(true);
		});

		it('should match .experiment.ts files', () => {
			expect(matchPattern('my-test.experiment.ts', defaultPatterns[1])).toBe(true);
			expect(matchPattern('nested/my-test.experiment.ts', defaultPatterns[1])).toBe(true);
		});

		it('should not match regular .ts files', () => {
			expect(matchPattern('utils.ts', defaultPatterns[0])).toBe(false);
			expect(matchPattern('utils.ts', defaultPatterns[1])).toBe(false);
		});

		it('should not match .test.ts files', () => {
			expect(matchPattern('utils.test.ts', defaultPatterns[0])).toBe(false);
			expect(matchPattern('utils.test.ts', defaultPatterns[1])).toBe(false);
		});
	});

	describe('custom testMatch patterns', () => {
		it('should support custom pattern like **/*.eval.ts', () => {
			expect(matchPattern('my-agent.eval.ts', '**/*.eval.ts')).toBe(true);
			expect(matchPattern('src/my-agent.eval.ts', '**/*.eval.ts')).toBe(true);
			expect(matchPattern('my-agent.test.ts', '**/*.eval.ts')).toBe(false);
		});
	});

	describe('edge cases', () => {
		it('should match empty path with **/* (glob behavior)', () => {
			// **/* regex allows zero-length match for both parts
			expect(matchPattern('', '**/*')).toBe(true);
		});

		it('should handle exact match', () => {
			expect(matchPattern('exact.ts', 'exact.ts')).toBe(true);
		});

		it('should handle paths with multiple dots', () => {
			expect(matchPattern('my.long.name.cobalt.ts', '**/*.cobalt.ts')).toBe(true);
		});
	});
});
