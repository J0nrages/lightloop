/**
 * OpenRouter API Types
 */

export interface OpenRouterPricing {
  prompt: string
  completion: string
  request?: string
  image?: string
  image_token?: string
  audio?: string
  audio_output?: string
  input_audio_cache?: string
  web_search?: string
  internal_reasoning?: string
  input_cache_read?: string
  input_cache_write?: string
  discount?: number
}

export interface ModelArchitecture {
  tokenizer: string
  instruct_type: string | null
  modality: string | null
  input_modalities: Array<'text' | 'image' | 'file' | 'audio' | 'video'>
  output_modalities: Array<'text' | 'image' | 'embeddings' | 'audio'>
}

export interface TopProviderInfo {
  context_length: number | null
  max_completion_tokens: number | null
  is_moderated: boolean
}

export interface PerRequestLimits {
  prompt_tokens: number
  completion_tokens: number
}

export interface DefaultParameters {
  temperature?: number | null
  top_p?: number | null
  frequency_penalty?: number | null
}

export interface OpenRouterModel {
  id: string
  canonical_slug: string
  hugging_face_id: string | null
  name: string
  created: number
  description: string
  pricing: OpenRouterPricing
  context_length: number | null
  architecture: ModelArchitecture
  top_provider: TopProviderInfo
  per_request_limits: PerRequestLimits
  supported_parameters: string[]
  default_parameters: DefaultParameters
  expiration_date: string | null
}

export interface ModelValidationResult {
  valid: boolean
  model?: OpenRouterModel
  suggestion?: string
  probe?: {
    ok: boolean
    error?: string
  }
  error?: string
}
