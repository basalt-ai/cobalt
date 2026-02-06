import type { ExperimentItem } from '../../src/types/index.js'

/**
 * Sample dataset items for testing
 */
export const sampleDatasetItems: ExperimentItem[] = [
  {
    input: 'What is the capital of France?',
    expectedOutput: 'Paris'
  },
  {
    input: 'What is 2 + 2?',
    expectedOutput: '4'
  },
  {
    input: 'Who wrote Romeo and Juliet?',
    expectedOutput: 'William Shakespeare'
  }
]

/**
 * Sample JSON dataset (array format)
 */
export const sampleJSONArray = JSON.stringify(sampleDatasetItems)

/**
 * Sample JSON dataset (object with items property)
 */
export const sampleJSONObject = JSON.stringify({
  items: sampleDatasetItems,
  metadata: {
    name: 'Test Dataset',
    version: '1.0'
  }
})

/**
 * Sample JSONL dataset (one JSON per line)
 */
export const sampleJSONL = sampleDatasetItems
  .map(item => JSON.stringify(item))
  .join('\n')

/**
 * Sample CSV dataset
 */
export const sampleCSV = [
  'input,expectedOutput',
  '"What is the capital of France?","Paris"',
  '"What is 2 + 2?","4"',
  '"Who wrote Romeo and Juliet?","William Shakespeare"'
].join('\n')

/**
 * Sample CSV with quoted values containing commas
 */
export const sampleCSVWithCommas = [
  'input,expectedOutput',
  '"What is the capital of France, the city of lights?","Paris, France"',
  '"Calculate 2 + 2, then multiply by 3","12"'
].join('\n')

/**
 * Empty dataset
 */
export const emptyDataset: ExperimentItem[] = []

/**
 * Large dataset for testing sampling
 */
export const largeDataset: ExperimentItem[] = Array.from({ length: 100 }, (_, i) => ({
  input: `Question ${i + 1}`,
  expectedOutput: `Answer ${i + 1}`
}))

/**
 * Sample experiment result
 */
export const sampleExperimentResult = {
  output: 'Paris',
  metadata: {
    model: 'gpt-4o',
    tokens: 150,
    latencyMs: 420
  }
}

/**
 * Sample evaluation context
 */
export const sampleEvalContext = {
  item: sampleDatasetItems[0],
  output: 'Paris',
  metadata: {
    model: 'gpt-4o',
    tokens: 150
  }
}

/**
 * Sample experiment report structure
 */
export const sampleExperimentReport = {
  id: 'test-run-123',
  name: 'test-experiment',
  timestamp: '2025-02-05T14:30:00.000Z',
  tags: ['test'],
  config: {
    runs: 1,
    concurrency: 5,
    timeout: 30000,
    evaluators: ['relevance']
  },
  summary: {
    totalItems: 3,
    totalDurationMs: 1260,
    avgLatencyMs: 420,
    totalTokens: 450,
    estimatedCost: 0.01,
    scores: {
      relevance: {
        avg: 0.85,
        min: 0.75,
        max: 0.95,
        p50: 0.85,
        p95: 0.93
      }
    }
  },
  items: []
}
