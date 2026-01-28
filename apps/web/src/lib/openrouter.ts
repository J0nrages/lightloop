/**
 * OpenRouter API utilities
 * Based on: https://openrouter.ai/docs/api/api-reference/models/get-models
 */

import type { 
  OpenRouterModel, 
  OpenRouterPricing,
  ModelArchitecture,
  TopProviderInfo,
  PerRequestLimits,
  DefaultParameters,
  ModelValidationResult
} from '@lightloop/core';

export type { 
  OpenRouterModel, 
  OpenRouterPricing,
  ModelArchitecture,
  TopProviderInfo,
  PerRequestLimits,
  DefaultParameters,
  ModelValidationResult
};

interface OpenRouterModelsResponse {
  data: OpenRouterModel[]
}

// Cache for model validation
let cachedModels: OpenRouterModel[] | null = null
let cacheTimestamp = 0
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

/**
 * Fetch available models from OpenRouter API
 * Requires OPENROUTER_API_KEY environment variable
 */
export async function fetchOpenRouterModels(): Promise<OpenRouterModel[]> {
  // Return cached if valid
  if (cachedModels && Date.now() - cacheTimestamp < CACHE_TTL) {
    return cachedModels
  }

  try {
    const apiKey = typeof window === 'undefined'
      ? process.env.OPENROUTER_API_KEY
      : undefined // Don't expose API key client-side

    const headers: HeadersInit = {
      'HTTP-Referer': 'https://lightloop.app',
      'X-Title': 'Lightloop',
    }

    // Only add Authorization on server-side
    if (apiKey) {
      headers['Authorization'] = `Bearer ${apiKey}`
    }

    const response = await fetch('https://openrouter.ai/api/v1/models', {
      headers,
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`OpenRouter API error ${response.status}: ${errorText}`)
    }

    const data: OpenRouterModelsResponse = await response.json()
    cachedModels = data.data
    cacheTimestamp = Date.now()
    return cachedModels
  } catch (error) {
    console.error('Failed to fetch OpenRouter models:', error)
    // Return stale cache if available, otherwise empty array
    return cachedModels || []
  }
}

async function validateModelIdServer(modelId: string): Promise<ModelValidationResult> {
  try {
    const models = await fetchOpenRouterModels()

    if (models.length === 0) {
      return {
        valid: false,
        error: 'Could not fetch models from OpenRouter'
      }
    }

    // Direct match by ID
    const exactMatch = models.find((m) => m.id === modelId)
    if (exactMatch) {
      return { valid: true, model: exactMatch }
    }

    // Try to find a similar model for suggestion
    const [provider] = modelId.split('/')
    const providerModels = models.filter((m) => m.id.startsWith(`${provider}/`))

    if (providerModels.length > 0) {
      // Sort by similarity to original model name
      const modelName = modelId.split('/')[1] || ''
      const sortedByRelevance = providerModels.sort((a, b) => {
        const aName = a.id.split('/')[1] || ''
        const bName = b.id.split('/')[1] || ''
        // Prefer models with similar prefix
        const aScore = aName.startsWith(modelName.split('-')[0]) ? 1 : 0
        const bScore = bName.startsWith(modelName.split('-')[0]) ? 1 : 0
        return bScore - aScore
      })

      return {
        valid: false,
        suggestion: sortedByRelevance[0].id,
      }
    }

    return { valid: false }
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Validation failed'
    }
  }
}

/**
 * Validate a model ID via server API when running in the browser.
 */
async function validateModelIdClient(modelId: string): Promise<ModelValidationResult> {
  try {
    const response = await fetch('/api/openrouter/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ modelId }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      return {
        valid: false,
        error: `Validation API error ${response.status}: ${errorText}`,
      }
    }

    const data: ModelValidationResult = await response.json()
    return data
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Validation failed'
    }
  }
}

/**
 * Validate a model ID against OpenRouter's available models
 * - Browser: calls internal API (keeps secrets server-side)
 * - Server: queries OpenRouter directly
 */
export async function validateModelId(modelId: string): Promise<ModelValidationResult> {
  if (typeof window !== 'undefined') {
    return validateModelIdClient(modelId)
  }
  return validateModelIdServer(modelId)
}

/**
 * Get all valid model IDs as a Set for quick lookup
 */
export async function getValidModelIds(): Promise<Set<string>> {
  const models = await fetchOpenRouterModels()
  return new Set(models.map((m) => m.id))
}

/**
 * Find a model by ID
 */
export async function findModelById(modelId: string): Promise<OpenRouterModel | undefined> {
  const models = await fetchOpenRouterModels()
  return models.find((m) => m.id === modelId)
}
