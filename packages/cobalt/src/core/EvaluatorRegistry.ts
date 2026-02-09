/**
 * Evaluator Registry
 *
 * Central registry for evaluator types, supporting both built-in and plugin evaluators.
 */

import type { EvaluatorHandler } from './plugin.js'

/**
 * Registry for evaluator type handlers
 */
export class EvaluatorRegistry {
  private evaluators: Map<string, EvaluatorHandler> = new Map()

  /**
   * Register an evaluator type handler
   *
   * @param type - Unique evaluator type identifier
   * @param handler - Handler function for this evaluator type
   */
  register(type: string, handler: EvaluatorHandler): void {
    if (this.evaluators.has(type)) {
      console.warn(`Evaluator type "${type}" is already registered. Overwriting.`)
    }

    this.evaluators.set(type, handler)
  }

  /**
   * Get an evaluator handler by type
   *
   * @param type - Evaluator type identifier
   * @returns Handler function or undefined if not found
   */
  get(type: string): EvaluatorHandler | undefined {
    return this.evaluators.get(type)
  }

  /**
   * Check if an evaluator type is registered
   *
   * @param type - Evaluator type identifier
   * @returns True if registered, false otherwise
   */
  has(type: string): boolean {
    return this.evaluators.has(type)
  }

  /**
   * List all registered evaluator types
   *
   * @returns Array of registered type identifiers
   */
  list(): string[] {
    return Array.from(this.evaluators.keys())
  }

  /**
   * Unregister an evaluator type
   *
   * @param type - Evaluator type identifier
   * @returns True if unregistered, false if not found
   */
  unregister(type: string): boolean {
    return this.evaluators.delete(type)
  }

  /**
   * Clear all registered evaluators
   */
  clear(): void {
    this.evaluators.clear()
  }
}

/**
 * Global evaluator registry instance
 */
export const registry = new EvaluatorRegistry()
