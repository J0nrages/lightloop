import { describe, it, expect, mock, beforeEach, afterAll } from 'bun:test'

type QueryCall = { sql: string; params: unknown[] }

const runCalls: QueryCall[] = []
const allCalls: QueryCall[] = []

const mockAllResult = (rows: unknown[]) => rows

mock.module('@/lib/db', () => ({
  db: {
    exec: mock(() => {}),
    query: mock(() => ({ all: () => [] })),
    prepare: (sql: string) => ({
      run: (...params: unknown[]) => {
        runCalls.push({ sql, params })
        return { changes: 1 }
      },
      all: (...params: unknown[]) => {
        allCalls.push({ sql, params })
        return mockAllResult([])
      },
    }),
  },
}))

const { Route } = await import('@/routes/api/conversations')
const handler = (Route as any).options?.server?.handlers?.GET

describe('GET /api/conversations', () => {
  beforeEach(() => {
    runCalls.length = 0
    allCalls.length = 0
  })

  it('queries conversations ordered by updated_at desc', async () => {
    const request = new Request('http://localhost/api/conversations')
    const response = await handler({ request })
    const data = await response.json()

    expect(Array.isArray(data.conversations)).toBe(true)
    expect(allCalls[0]?.sql).toContain('ORDER BY updated_at DESC')
    expect(allCalls[0]?.params[0]).toBe(42)
    expect(allCalls[0]?.params[1]).toBe(42)
  })
})

afterAll(() => {
  mock.restore()
})
