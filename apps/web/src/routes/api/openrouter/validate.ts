import { createFileRoute } from '@tanstack/react-router'
import { validateModelId, type ModelValidationResult } from '@/lib/openrouter'
import { requireAuth } from '@/lib/auth/guards'

type ValidateRequestBody = {
  modelId?: string
}

type ProbeResult = {
  ok: boolean
  error?: string
}

const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1'
const PROBE_TIMEOUT_MS = 8000

const truncate = (value: string, max = 500) => {
  if (value.length <= max) return value
  return value.slice(0, max) + '…'
}

async function probeModel(modelId: string): Promise<ProbeResult> {
  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) {
    return { ok: false, error: 'Missing OPENROUTER_API_KEY' }
  }

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS)

  try {
    const response = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://lightloop.app',
        'X-Title': 'Lightloop',
      },
      body: JSON.stringify({
        model: modelId,
        messages: [{ role: 'user', content: 'ping' }],
        max_tokens: 1,
        temperature: 0,
      }),
    })

    if (!response.ok) {
      const errorText = truncate(await response.text())
      return {
        ok: false,
        error: `Probe failed (${response.status}): ${errorText || response.statusText}`,
      }
    }

    return { ok: true }
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Probe failed',
    }
  } finally {
    clearTimeout(timeoutId)
  }
}

export const Route = createFileRoute('/api/openrouter/validate')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        await requireAuth(request)
        let body: ValidateRequestBody = {}
        try {
          body = await request.json()
        } catch {
          body = {}
        }

        if (!body.modelId || typeof body.modelId !== 'string') {
          return new Response(
            JSON.stringify({ valid: false, error: 'modelId is required' }),
            {
              status: 400,
              headers: { 'Content-Type': 'application/json' },
            }
          )
        }

        try {
          const result = await validateModelId(body.modelId)

          if (result.valid) {
            const probe = await probeModel(body.modelId)
            const withProbe: ModelValidationResult = { ...result, probe }
            return Response.json(withProbe)
          }

          return Response.json(result)
        } catch (error) {
          return new Response(
            JSON.stringify({
              valid: false,
              error: error instanceof Error ? error.message : 'Validation failed',
            }),
            {
              status: 500,
              headers: { 'Content-Type': 'application/json' },
            }
          )
        }
      },
    },
  },
})
