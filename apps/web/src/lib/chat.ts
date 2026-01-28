import { streamText, convertToModelMessages, type UIMessage } from 'ai'
import { createOpenAI } from '@ai-sdk/openai'

export interface ChatRequest {
  messages: UIMessage[]
  conversationId?: number
  model?: string
}

export interface ChatConfig {
  apiKey: string
  baseURL?: string
  defaultModel?: string
}

/**
 * Creates an OpenRouter client configured for Chat Completions API
 * Uses .chat() method which is required for OpenRouter compatibility with AI SDK v6
 */
export function createOpenRouterClient(config: ChatConfig) {
  const openrouter = createOpenAI({
    apiKey: config.apiKey,
    baseURL: config.baseURL || 'https://openrouter.ai/api/v1',
    headers: {
      'HTTP-Referer': 'https://lightloop.app',
      'X-Title': 'Lightloop',
    },
  })

  return {
    /**
     * Get a chat model instance for the given model ID
     * IMPORTANT: Uses .chat() for Chat Completions API (not Responses API)
     */
    getModel: (modelId: string) => openrouter.chat(modelId),
  }
}

export interface StreamChatOptions {
  messages: UIMessage[]
  modelId: string
  openrouterApiKey: string
  onFinish?: (result: { text: string }) => void | Promise<void>
}

/**
 * Streams a chat response using OpenRouter via AI SDK v6
 */
export async function streamChat(options: StreamChatOptions) {
  const { messages, modelId, openrouterApiKey, onFinish } = options

  const client = createOpenRouterClient({ apiKey: openrouterApiKey })

  const result = streamText({
    model: client.getModel(modelId),
    messages: await convertToModelMessages(messages),
    onFinish,
  })

  return result
}
