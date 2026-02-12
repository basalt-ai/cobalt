/**
 * Resolve a dot-notation path (e.g. "metadata.model", "tags[0]") on an object.
 * Returns undefined if the path doesn't resolve.
 */
function resolveNestedPath(obj: Record<string, any>, path: string): unknown {
	const segments = path.replace(/\[(\d+)\]/g, '.$1').split('.');
	let current: unknown = obj;
	for (const segment of segments) {
		if (current === null || current === undefined) return undefined;
		current = (current as Record<string, any>)[segment];
	}
	return current;
}

/**
 * Template rendering using {{variable}} syntax with nested property support.
 * Supports dot-notation ({{metadata.model}}) and bracket notation ({{tags[0]}}).
 * @param template - Template string with {{variable}} placeholders
 * @param context - Object with variable values
 * @returns Rendered string
 */
export function renderTemplate(template: string, context: Record<string, any>): string {
	return template.replace(/\{\{([\w.[\]]+)\}\}/g, (match, path: string) => {
		const value = resolveNestedPath(context, path);
		if (value === undefined || value === null) {
			return match; // Keep placeholder if value not found
		}
		if (typeof value === 'object') {
			return JSON.stringify(value, null, 2);
		}
		return String(value);
	});
}
