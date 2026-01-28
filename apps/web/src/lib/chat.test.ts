import { describe, it, expect, mock } from 'bun:test'
import { MockLanguageModelV3, simulateReadableStream } from 'ai/test'
import { streamText, convertToModelMessages, type UIMessage } from 'ai'
import { createOpenRouterClient } from './chat'

// Mock the @ai-sdk/openai module using Bun's mock.module()
mock.module('@ai-sdk/openai', () => ({
  createOpenAI: mock(() => ({
    chat: mock((modelId: string) => ({
      modelId,
      provider: 'openrouter',
      specificationVersion: 'v1',
    })),
  })),
}))

describe('OpenRouter Client Configuration', () => {
  it('creates a client with correct configuration', () => {
    const client = createOpenRouterClient({
      apiKey: 'test-key',
      baseURL: 'https://openrouter.ai/api/v1',
    })

    expect(client).toBeDefined()
    expect(client.getModel).toBeDefined()
    expect(typeof client.getModel).toBe('function')
  })

  it('getModel returns a model instance using .chat() method', () => {
    const client = createOpenRouterClient({
      apiKey: 'test-key',
    })

    const model = client.getModel('anthropic/claude-sonnet-4.5')

    // The mock verifies .chat() was called (not the default method)
    expect(model).toBeDefined()
    expect(model.modelId).toBe('anthropic/claude-sonnet-4.5')
  })
})

describe('streamText with MockLanguageModelV3', () => {
  it('streams text responses correctly', async () => {
    const usage = {
      inputTokens: { total: 10, noCache: 10, cacheRead: 0, cacheWrite: 0 },
      outputTokens: { total: 5, text: 5, reasoning: 0 },
    }

    const mockModel = new MockLanguageModelV3({
      doStream: async () => ({
        stream: simulateReadableStream({
          chunks: [
            { type: 'text-start', id: 'text-1' },
            { type: 'text-delta', id: 'text-1', delta: 'Hello' },
            { type: 'text-delta', id: 'text-1', delta: ' from' },
            { type: 'text-delta', id: 'text-1', delta: ' OpenRouter!' },
            { type: 'text-end', id: 'text-1' },
            {
              type: 'finish',
              finishReason: { unified: 'stop', raw: undefined },
              logprobs: undefined,
              usage,
            },
          ],
        }),
      }),
    })

    const messages: UIMessage[] = [
      {
        id: '1',
        role: 'user',
        parts: [{ type: 'text', text: 'Hello' }],
      },
    ]

    const result = streamText({
      model: mockModel,
      messages: await convertToModelMessages(messages),
    })

    // Collect the streamed text
    let fullText = ''
    for await (const chunk of result.textStream) {
      fullText += chunk
    }

    expect(fullText).toBe('Hello from OpenRouter!')
  })

  it('handles onFinish callback', async () => {
    const onFinishMock = mock(() => {})

    const usage = {
      inputTokens: { total: 5, noCache: 5, cacheRead: 0, cacheWrite: 0 },
      outputTokens: { total: 2, text: 2, reasoning: 0 },
    }

    const mockModel = new MockLanguageModelV3({
      doStream: async () => ({
        stream: simulateReadableStream({
          chunks: [
            { type: 'text-start', id: 'text-1' },
            { type: 'text-delta', id: 'text-1', delta: 'Test response' },
            { type: 'text-end', id: 'text-1' },
            {
              type: 'finish',
              finishReason: { unified: 'stop', raw: undefined },
              logprobs: undefined,
              usage,
            },
          ],
        }),
      }),
    })

    const messages: UIMessage[] = [
      {
        id: '1',
        role: 'user',
        parts: [{ type: 'text', text: 'Test' }],
      },
    ]

    const result = streamText({
      model: mockModel,
      messages: await convertToModelMessages(messages),
      onFinish: onFinishMock,
    })

    // Consume the stream to trigger onFinish
    for await (const _ of result.textStream) {
      // consume
    }

    // Wait for onFinish to be called
    await new Promise((resolve) => setTimeout(resolve, 100))

    expect(onFinishMock).toHaveBeenCalled()
  })
})

describe('UIMessage format conversion', () => {
  it('converts UIMessage parts to model messages', async () => {
    const uiMessages: UIMessage[] = [
      {
        id: '1',
        role: 'user',
        parts: [
          { type: 'text', text: 'Hello, ' },
          { type: 'text', text: 'how are you?' },
        ],
      },
      {
        id: '2',
        role: 'assistant',
        parts: [{ type: 'text', text: 'I am doing well!' }],
      },
    ]

    const modelMessages = await convertToModelMessages(uiMessages)

    expect(modelMessages).toHaveLength(2)
    expect(modelMessages[0].role).toBe('user')
    expect(modelMessages[1].role).toBe('assistant')
  })
})
