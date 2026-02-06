/**
 * Simple template rendering using {{variable}} syntax
 * @param template - Template string with {{variable}} placeholders
 * @param context - Object with variable values
 * @returns Rendered string
 */
export function renderTemplate(template: string, context: Record<string, any>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    const value = context[key]
    if (value === undefined || value === null) {
      return match // Keep placeholder if value not found
    }
    if (typeof value === 'object') {
      return JSON.stringify(value, null, 2)
    }
    return String(value)
  })
}
