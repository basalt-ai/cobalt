import { describe, expect, it } from 'vitest';
import { renderTemplate } from '../../../src/utils/template.js';

describe('renderTemplate', () => {
	it('should replace single variable', () => {
		const template = 'Hello {{name}}!';
		const variables = { name: 'World' };

		const result = renderTemplate(template, variables);

		expect(result).toBe('Hello World!');
	});

	it('should replace multiple variables', () => {
		const template = 'Input: {{input}}, Output: {{output}}';
		const variables = {
			input: 'What is 2+2?',
			output: '4',
		};

		const result = renderTemplate(template, variables);

		expect(result).toBe('Input: What is 2+2?, Output: 4');
	});

	it('should replace same variable multiple times', () => {
		const template = '{{name}} likes {{name}}';
		const variables = { name: 'Alice' };

		const result = renderTemplate(template, variables);

		expect(result).toBe('Alice likes Alice');
	});

	it('should resolve nested object properties', () => {
		const template = 'Model: {{metadata.model}}, Tokens: {{metadata.tokens}}';
		const variables = {
			metadata: {
				model: 'gpt-4o',
				tokens: 150,
			},
		};

		const result = renderTemplate(template, variables);

		expect(result).toBe('Model: gpt-4o, Tokens: 150');
	});

	it('should resolve deeply nested properties', () => {
		const template = 'Value: {{a.b.c.d}}';
		const variables = {
			a: {
				b: {
					c: {
						d: 'deep value',
					},
				},
			},
		};

		const result = renderTemplate(template, variables);

		expect(result).toBe('Value: deep value');
	});

	it('should resolve bracket notation for arrays', () => {
		const template = 'First: {{tags[0]}}, Second: {{tags[1]}}';
		const variables = {
			tags: ['alpha', 'beta', 'gamma'],
		};

		const result = renderTemplate(template, variables);

		expect(result).toBe('First: alpha, Second: beta');
	});

	it('should resolve mixed dot and bracket notation', () => {
		const template = 'Value: {{items[0].name}}';
		const variables = {
			items: [{ name: 'first' }, { name: 'second' }],
		};

		const result = renderTemplate(template, variables);

		expect(result).toBe('Value: first');
	});

	it('should keep placeholder for missing nested path', () => {
		const template = 'Value: {{metadata.nonexistent}}';
		const variables = {
			metadata: { model: 'gpt-4o' },
		};

		const result = renderTemplate(template, variables);

		expect(result).toBe('Value: {{metadata.nonexistent}}');
	});

	it('should handle missing variables gracefully', () => {
		const template = 'Hello {{name}}, you are {{age}} years old';
		const variables = { name: 'Alice' };

		const result = renderTemplate(template, variables);

		expect(result).toBe('Hello Alice, you are {{age}} years old');
	});

	it('should handle empty template', () => {
		const template = '';
		const variables = { name: 'World' };

		const result = renderTemplate(template, variables);

		expect(result).toBe('');
	});

	it('should handle template with no variables', () => {
		const template = 'Hello World!';
		const variables = { name: 'Alice' };

		const result = renderTemplate(template, variables);

		expect(result).toBe('Hello World!');
	});

	it('should handle empty variables object', () => {
		const template = 'Hello {{name}}!';
		const variables = {};

		const result = renderTemplate(template, variables);

		expect(result).toBe('Hello {{name}}!');
	});

	it('should preserve whitespace', () => {
		const template = 'Hello   {{name}}  !';
		const variables = { name: 'World' };

		const result = renderTemplate(template, variables);

		expect(result).toBe('Hello   World  !');
	});

	it('should handle number values', () => {
		const template = 'Score: {{score}}';
		const variables = { score: 0.95 };

		const result = renderTemplate(template, variables);

		expect(result).toBe('Score: 0.95');
	});

	it('should handle boolean values', () => {
		const template = 'Success: {{success}}';
		const variables = { success: true };

		const result = renderTemplate(template, variables);

		expect(result).toBe('Success: true');
	});

	it('should handle null and undefined', () => {
		const template = 'Value: {{value}}, Other: {{other}}';
		const variables = { value: null, other: undefined };

		const result = renderTemplate(template, variables);

		expect(result).toContain('Value:');
		expect(result).toContain('Other:');
	});

	it('should handle special characters in values', () => {
		const template = 'Message: {{message}}';
		const variables = { message: 'Hello & "goodbye" <world>' };

		const result = renderTemplate(template, variables);

		expect(result).toBe('Message: Hello & "goodbye" <world>');
	});

	it('should handle multiline templates', () => {
		const template = `Input: {{input}}
Output: {{output}}
Expected: {{expectedOutput}}`;

		const variables = {
			input: 'Question',
			output: 'Answer',
			expectedOutput: 'Expected Answer',
		};

		const result = renderTemplate(template, variables);

		expect(result).toContain('Input: Question');
		expect(result).toContain('Output: Answer');
		expect(result).toContain('Expected: Expected Answer');
	});

	it('should handle array values', () => {
		const template = 'Items: {{items}}';
		const variables = { items: ['a', 'b', 'c'] };

		const result = renderTemplate(template, variables);

		expect(result).toContain('Items:');
		expect(result).toContain('a');
	});

	it('should handle object values by JSON stringifying them', () => {
		const template = 'Data: {{data}}';
		const variables = { data: { key: 'value' } };

		const result = renderTemplate(template, variables);

		expect(result).toContain('Data:');
		expect(result).toContain('"key"');
		expect(result).toContain('"value"');
	});

	it('should mix top-level and nested variables in same template', () => {
		const template = 'Name: {{name}}, Model: {{config.model}}, Tag: {{tags[0]}}';
		const variables = {
			name: 'test',
			config: { model: 'gpt-4o' },
			tags: ['v1'],
		};

		const result = renderTemplate(template, variables);

		expect(result).toBe('Name: test, Model: gpt-4o, Tag: v1');
	});

	it('should keep placeholder when intermediate path is null', () => {
		const template = 'Value: {{a.b.c}}';
		const variables = { a: null };

		const result = renderTemplate(template, variables);

		expect(result).toBe('Value: {{a.b.c}}');
	});
});
