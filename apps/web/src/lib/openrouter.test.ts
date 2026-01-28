import { describe, it, expect, afterEach } from 'bun:test'

const originalFetch = globalThis.fetch
const originalWindow = (globalThis as { window?: unknown }).window

const jsonResponse = (data: unknown, init?: ResponseInit) =>
  new Response(JSON.stringify(data), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
    ...init,
  })

const withFetchPreconnect = (
  fn: (...args: Parameters<typeof fetch>) => ReturnType<typeof fetch>
) => Object.assign(fn, { preconnect: () => {} }) as typeof fetch

const makeModel = (id: string) => ({
  id,
  canonical_slug: id,
  hugging_face_id: null,
  name: id,
  created: Date.now(),
  description: 'test model',
  pricing: { prompt: '0', completion: '0' },
  context_length: null,
  architecture: {
    tokenizer: 'test',
    instruct_type: null,
    modality: null,
    input_modalities: ['text'],
    output_modalities: ['text'],
  },
  top_provider: {
    context_length: null,
    max_completion_tokens: null,
    is_moderated: false,
  },
  per_request_limits: {
    prompt_tokens: 0,
    completion_tokens: 0,
  },
  supported_parameters: [],
  default_parameters: {},
  expiration_date: null,
})

afterEach(() => {
  globalThis.fetch = originalFetch
  if (originalWindow === undefined) {
    delete (globalThis as { window?: unknown }).window
  } else {
    ;(globalThis as { window?: unknown }).window = originalWindow
  }
})

describe('OpenRouter model validation', () => {
  it('validates model IDs server-side against the models list', async () => {
    delete (globalThis as { window?: unknown }).window

    const { validateModelId } = await import('@/lib/openrouter')

    const models = [makeModel('openai/o4-mini'), makeModel('openai/o4-max')]
    globalThis.fetch = withFetchPreconnect(async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url.includes('/models')) {
        return jsonResponse({ data: models })
      }
      throw new Error(`Unexpected fetch URL: ${url}`)
    })

    const result = await validateModelId('openai/o4-mini')
    expect(result.valid).toBe(true)
    expect(result.model?.id).toBe('openai/o4-mini')
  })

  it('returns a suggestion for invalid model IDs', async () => {
    delete (globalThis as { window?: unknown }).window

    const { validateModelId } = await import('@/lib/openrouter')

    const models = [makeModel('openai/o4-mini'), makeModel('openai/o4-max')]
    globalThis.fetch = withFetchPreconnect(async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url.includes('/models')) {
        return jsonResponse({ data: models })
      }
      throw new Error(`Unexpected fetch URL: ${url}`)
    })

    const result = await validateModelId('openai/o4-unknown')
    expect(result.valid).toBe(false)
    expect(result.suggestion).toBe('openai/o4-mini')
  })

  it('routes browser validation through the internal API', async () => {
    ;(globalThis as { window?: unknown }).window = {}

    const { validateModelId } = await import('@/lib/openrouter')

    globalThis.fetch = withFetchPreconnect(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)
      if (url.endsWith('/api/openrouter/validate')) {
        expect(init?.method).toBe('POST')
        return jsonResponse({ valid: true, probe: { ok: true } })
      }
      throw new Error(`Unexpected fetch URL: ${url}`)
    })

    const result = await validateModelId('openai/o4-mini')
    expect(result.valid).toBe(true)
    expect(result.probe?.ok).toBe(true)
  })
})

describe('OpenRouter validation API', () => {
  it('includes probe results when model is valid', async () => {
    delete (globalThis as { window?: unknown }).window
    process.env.OPENROUTER_API_KEY = 'test-key'

    const { Route: ValidateRoute } = await import('@/routes/api/openrouter/validate')

    globalThis.fetch = withFetchPreconnect(async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url.includes('/models')) {
        return jsonResponse({ data: [makeModel('openai/o4-mini')] })
      }
      if (url.includes('/chat/completions')) {
        return new Response('rate limited', { status: 429 })
      }
      throw new Error(`Unexpected fetch URL: ${url}`)
    })

    const handler = (ValidateRoute as any).options?.server?.handlers?.POST
    expect(handler).toBeDefined()

    const request = new Request('http://localhost/api/openrouter/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ modelId: 'openai/o4-mini' }),
    })

    const response = await handler({ request })
    const json = await response.json()

    expect(json.valid).toBe(true)
    expect(json.probe?.ok).toBe(false)
  })
})
