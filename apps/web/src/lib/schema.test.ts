import { describe, it, expect, mock, beforeEach, afterAll } from 'bun:test'

type PrepareCall = { sql: string; params: unknown[] }

const execCalls: string[] = []
const runCalls: PrepareCall[] = []
const allCalls: PrepareCall[] = []

const prepare = (sql: string) => ({
  run: (...params: unknown[]) => {
    runCalls.push({ sql, params })
    return { changes: 1 }
  },
  all: (...params: unknown[]) => {
    allCalls.push({ sql, params })
    return []
  },
  get: (...params: unknown[]) => {
    allCalls.push({ sql, params })
    return null
  },
})

mock.module('./db', () => ({
  db: {
    exec: (sql: string) => {
      execCalls.push(sql)
    },
    prepare,
    query: () => ({ all: () => [] }),
  },
}))

const { dbOps } = await import('./schema')

describe('dbOps', () => {
  beforeEach(() => {
    execCalls.length = 0
    runCalls.length = 0
    allCalls.length = 0
  })

  it('creates conversations with timestamps', () => {
    const now = 1_700_000_000
    const originalNow = Date.now
    Date.now = () => now

    dbOps.createConversation({ userId: 5, title: 'Test chat' })

    Date.now = originalNow

    const call = runCalls.find((entry) => entry.sql.includes('INSERT INTO conversations'))
    expect(call).toBeDefined()
    expect(call?.params[0]).toBe(5)
    expect(call?.params[1]).toBe('Test chat')
    expect(call?.params[2]).toBe('personal')
    expect(call?.params[3]).toBeNull()
    expect(call?.params[4]).toBeNull()
    expect(call?.params[5]).toBe(now)
    expect(call?.params[6]).toBe(now)
    expect(call?.params[7]).toBe(now)
  })

  it('creates messages with null metadata when omitted', () => {
    const now = 1_700_000_123
    const originalNow = Date.now
    Date.now = () => now

    dbOps.createMessage({ conversationId: 9, role: 'user', content: 'Hello' })

    Date.now = originalNow

    const call = runCalls.find((entry) => entry.sql.includes('INSERT INTO messages'))
    expect(call).toBeDefined()
    expect(call?.params[0]).toBe(9)
    expect(call?.params[1]).toBe('user')
    expect(call?.params[2]).toBe('Hello')
    expect(call?.params[3]).toBeNull()
    expect(call?.params[4]).toBe(now)
  })

  it('queries conversation messages in ascending order', () => {
    dbOps.getConversationMessages(12)
    const call = allCalls.find((entry) => entry.sql.includes('SELECT * FROM messages'))
    expect(call?.sql).toContain('ORDER BY created_at ASC')
    expect(call?.params[0]).toBe(12)
  })
})

afterAll(() => {
  mock.restore()
})
