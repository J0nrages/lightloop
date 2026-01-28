// Server-side Langfuse OpenTelemetry initialization
// Initializes once per process; safe to import in API routes.

import { LangfuseSpanProcessor } from '@langfuse/otel'
import { NodeSDK } from '@opentelemetry/sdk-node'

declare global {
  // eslint-disable-next-line no-var
  var __langfuseOtelInitialized: boolean | undefined
}

const isServer = typeof window === 'undefined'
const hasLangfuseKeys = Boolean(process.env.LANGFUSE_SECRET_KEY && process.env.LANGFUSE_PUBLIC_KEY)

function maskSensitive({ data }: { data: string }): string {
  // Basic masking for emails, phone numbers, and credit card-like sequences
  return data
    .replace(/\b[\w.-]+@[\w.-]+\.[A-Za-z]{2,}\b/g, '[REDACTED_EMAIL]')
    .replace(/\b\+?\d[\d\s().-]{7,}\d\b/g, '[REDACTED_PHONE]')
    .replace(/\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{3,4}\b/g, '[REDACTED_CARD]')
}

export function initLangfuseOtel() {
  if (!isServer) return
  if (!hasLangfuseKeys) return
  if (globalThis.__langfuseOtelInitialized) return

  const spanProcessor = new LangfuseSpanProcessor({
    mask: ({ data }) => maskSensitive({ data }),
  })

  const sdk = new NodeSDK({
    spanProcessors: [spanProcessor],
  })

  ;(async () => {
    try {
      await sdk.start()
      globalThis.__langfuseOtelInitialized = true
    } catch (err: unknown) {
      console.error('[Langfuse OTEL] failed to start', err)
    }
  })()
}

// Initialize on import for server-only modules
initLangfuseOtel()
