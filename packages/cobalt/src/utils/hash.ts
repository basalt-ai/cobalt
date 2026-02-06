import { createHash } from 'node:crypto'

/**
 * Generate SHA-256 hash for cache key
 * @param data - Data to hash (will be stringified if object)
 * @returns SHA-256 hash as hex string
 */
export function generateHash(...data: any[]): string {
  const hash = createHash('sha256')

  for (const item of data) {
    const str = typeof item === 'object' ? JSON.stringify(item) : String(item)
    hash.update(str)
  }

  return hash.digest('hex')
}
