import { describe, it, expect, mock, beforeEach, afterAll } from 'bun:test'

type RunCall = { sql: string; params: unknown[] }

const runCalls: RunCall[] = []
const allCalls: RunCall[] = []
const getCalls: RunCall[] = []

const runResultFor = (sql: string) => {
  if (sql.includes('INSERT INTO conversations')) {
    return { lastInsertRowid: 123 }
  }
  return { changes: 1 }
}

const allResultFor = (_sql: string) => []
const getResultFor = (sql: string, params: unknown[]) => {
  if (sql.includes('FROM conversations WHERE id = ?')) {
    return {
      id: params[0],
      user_id: 42,
      scope: 'personal',
      org_id: null,
      project_id: null,
      updated_at: 1_700_000_000,
      last_active_at: 1_700_000_000,
    }
  }
  return null
}

mock.module('@/lib/db', () => ({
  db: {
    exec: mock(() => {}),
    query: mock(() => ({ all: () => [] })),
    prepare: (sql: string) => ({
      run: (...params: unknown[]) => {
        runCalls.push({ sql, params })
        return runResultFor(sql)
      },
      all: (...params: unknown[]) => {
        allCalls.push({ sql, params })
        return allResultFor(sql)
      },
      get: (...params: unknown[]) => {
        getCalls.push({ sql, params })
        return getResultFor(sql, params)
      },
    }),
  },
}))

const convertToModelMessagesMock = mock(async (messages: unknown) => messages)
const streamTextMock = mock(() => ({
  toUIMessageStreamResponse: ({
    headers,
    onFinish,
  }: {
    headers?: HeadersInit
    onFinish?: (payload: { responseMessage: { parts: Array<{ type: 'text'; text: string }> } }) => void
  }) => {
    onFinish?.({ responseMessage: { parts: [{ type: 'text', text: 'assistant reply' }] } })
    return new Response('ok', { headers })
  },
}))

mock.module('ai', () => ({
  streamText: streamTextMock,
  convertToModelMessages: convertToModelMessagesMock,
  tool: mock((definition: unknown) => definition),
}))

mock.module('@ai-sdk/openai', () => ({
  createOpenAI: mock(() => ({
    chat: (modelId: string) => ({ modelId, provider: 'openrouter' }),
  })),
}))

const { Route } = await import('@/routes/api/chat')
const handler = (Route as any).options?.server?.handlers?.POST

describe('POST /api/chat', () => {
  beforeEach(() => {
    runCalls.length = 0
    allCalls.length = 0
    getCalls.length = 0
    streamTextMock.mockClear()
    convertToModelMessagesMock.mockClear()
  })

  it('creates a conversation, stores user and assistant messages, and returns conversation header', async () => {
    const request = new Request('http://localhost/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [
          { id: '1', role: 'user', parts: [{ type: 'text', text: 'Hello' }] },
        ],
      }),
    })

    const response = await handler({ request })

    expect(response.headers.get('X-Conversation-Id')).toBe('123')
    expect(convertToModelMessagesMock).toHaveBeenCalled()
    expect(streamTextMock).toHaveBeenCalled()

    const conversationInsert = runCalls.find((call) => call.sql.includes('INSERT INTO conversations'))
    expect(conversationInsert).toBeDefined()
    expect(conversationInsert?.params[2]).toBe('personal')

    const userInsert = runCalls.find(
      (call) => call.sql.includes('INSERT INTO messages') && call.params[1] === 'user'
    )
    expect(userInsert?.params[0]).toBe(123)
    expect(userInsert?.params[2]).toBe('Hello')

    const assistantInsert = runCalls.find(
      (call) => call.sql.includes('INSERT INTO messages') && call.params[1] === 'assistant'
    )
    expect(assistantInsert?.params[0]).toBe(123)
    expect(assistantInsert?.params[2]).toBe('assistant reply')

    const updateConversation = runCalls.find((call) => call.sql.includes('UPDATE conversations'))
    expect(updateConversation).toBeDefined()
  })

  it('reuses existing conversation when conversationId is provided', async () => {
    const request = new Request('http://localhost/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        conversationId: 77,
        messages: [
          { id: '1', role: 'user', parts: [{ type: 'text', text: 'Hi again' }] },
        ],
      }),
    })

    const response = await handler({ request })
    expect(response.headers.get('X-Conversation-Id')).toBe('77')

    const conversationInsert = runCalls.find((call) => call.sql.includes('INSERT INTO conversations'))
    expect(conversationInsert).toBeUndefined()

    const userInsert = runCalls.find(
      (call) => call.sql.includes('INSERT INTO messages') && call.params[1] === 'user'
    )
    expect(userInsert?.params[0]).toBe(77)
  })
})

afterAll(() => {
  mock.restore()
})
