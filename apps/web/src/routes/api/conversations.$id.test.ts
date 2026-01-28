import { describe, it, expect, mock, beforeEach, afterAll } from 'bun:test'

type QueryCall = { sql: string; params: unknown[] }

const allCalls: QueryCall[] = []
let mockRows: Array<{
  id: number
  conversation_id: number
  role: string
  content: string
  metadata: string | null
  created_at: number
}> = []
let mockConversation: {
  id: number
  user_id: number
  scope: 'personal' | 'org_personal' | 'org_group'
  org_id: number | null
  project_id: number | null
} | null = null

mock.module('@/lib/db', () => ({
  db: {
    exec: mock(() => {}),
    query: mock(() => ({ all: () => [] })),
    prepare: (sql: string) => ({
      get: (...params: unknown[]) => {
        allCalls.push({ sql, params })
        return mockConversation
      },
      all: (...params: unknown[]) => {
        allCalls.push({ sql, params })
        return mockRows
      },
    }),
  },
}))

const { Route } = await import('@/routes/api/conversations/$id')
const handler = (Route as any).options?.server?.handlers?.GET

describe('GET /api/conversations/:id', () => {
  beforeEach(() => {
    allCalls.length = 0
    mockRows = []
    mockConversation = null
  })

  it('returns 400 for invalid conversation id', async () => {
    const response = await handler({ params: { id: 'not-a-number' } })
    expect(response.status).toBe(400)
    const data = await response.json()
    expect(data.error).toBe('Invalid conversation ID')
  })

  it('returns UIMessage-formatted messages in order', async () => {
    mockConversation = {
      id: 42,
      user_id: 42,
      scope: 'personal',
      org_id: null,
      project_id: null,
    }
    mockRows = [
      {
        id: 1,
        conversation_id: 42,
        role: 'user',
        content: 'Hello',
        metadata: null,
        created_at: 10,
      },
      {
        id: 2,
        conversation_id: 42,
        role: 'assistant',
        content: 'Hi!',
        metadata: null,
        created_at: 11,
      },
    ]

    const response = await handler({ params: { id: '42' } })
    expect(response.status).toBe(200)
    const data = await response.json()

    expect(data.conversationId).toBe(42)
    expect(data.messages).toHaveLength(2)
    expect(data.messages[0].role).toBe('user')
    expect(data.messages[0].parts[0].text).toBe('Hello')
    expect(data.messages[1].role).toBe('assistant')
    expect(data.messages[1].parts[0].text).toBe('Hi!')
    const messageQuery = allCalls.find((call) => call.sql.includes('SELECT * FROM messages'))
    expect(messageQuery?.sql).toContain('ORDER BY created_at ASC')
  })
})

afterAll(() => {
  mock.restore()
})
