# Lightloop

AI-powered hiring assistant built with TanStack Start, Vercel AI SDK v6, and OpenRouter.

## Tech Stack

- **Runtime**: Bun
- **Framework**: TanStack Start (React, file-based routing, server functions)
- **AI**: Vercel AI SDK v6 (`ai`, `@ai-sdk/react`, `@ai-sdk/openai`)
- **LLM Provider**: OpenRouter (multi-model access)
- **Database**: Bun SQLite (`bun:sqlite`)
- **Auth**: Clerk
- **Styling**: Tailwind CSS v3, Radix UI primitives
- **State**: Zustand

## Project Structure

```
src/
├── components/       # React components
│   ├── ui/          # Base UI components (shadcn-style)
│   ├── ai-elements/ # AI-specific components (prompt input, etc.)
│   ├── chat/        # Chat UI components
│   └── gen-ui/      # Generative UI components
├── lib/             # Utilities and business logic
│   ├── chat.ts      # OpenRouter client & streaming logic
│   ├── db.ts        # SQLite database setup
│   └── utils.ts     # General utilities
├── routes/          # TanStack Start file-based routes
│   ├── __root.tsx   # Root layout
│   ├── index.tsx    # Home page with chat
│   └── api/         # API routes
│       └── chat.ts  # Chat streaming endpoint
├── stores/          # Zustand stores
│   ├── model.ts     # Model selection state
│   ├── layout.ts    # UI layout state
│   └── theme.ts     # Theme state
└── test/            # Test setup
    └── setup.ts     # Bun test preload
```

## Testing

Uses **Bun's native test runner** (not Vitest).

```bash
bun test              # Run all tests
bun test --watch      # Watch mode
```

### Test Conventions

- Import from `bun:test`: `describe`, `it`, `expect`, `mock`, `spyOn`
- Use `mock.module()` for module mocking
- AI SDK mocking: `MockLanguageModelV3`, `simulateReadableStream` from `ai/test`
- Test files: `*.test.ts` or `*.test.tsx`
- Config: `bunfig.toml`

### AI SDK v6 Mock Format

```typescript
import { MockLanguageModelV3, simulateReadableStream } from 'ai/test'

const mockModel = new MockLanguageModelV3({
  doStream: async () => ({
    stream: simulateReadableStream({
      chunks: [
        { type: 'text-start', id: 'text-1' },
        { type: 'text-delta', id: 'text-1', delta: 'Hello' },
        { type: 'text-end', id: 'text-1' },
        {
          type: 'finish',
          finishReason: { unified: 'stop', raw: undefined },
          usage: { inputTokens: 10, outputTokens: 5 },
        },
      ],
    }),
  }),
})
```

## OpenRouter Integration

**Critical**: Use `.chat()` method for Chat Completions API compatibility.

```typescript
import { createOpenAI } from '@ai-sdk/openai'

const openrouter = createOpenAI({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: 'https://openrouter.ai/api/v1',
})

// CORRECT - Chat Completions API
const model = openrouter.chat('anthropic/claude-sonnet-4.5')

// WRONG - Responses API (not supported by OpenRouter)
const model = openrouter('anthropic/claude-sonnet-4.5')
```

## TanStack Start Patterns

### API Routes

Server routes use `createFileRoute` with a `server` property:

```typescript
// src/routes/api/chat.ts
export const Route = createFileRoute('/api/chat')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        // Handle request
        return new Response(...)
      },
    },
  },
})
```

### Client-Side Chat

Use `useChat` from `@ai-sdk/react` with `DefaultChatTransport`:

```typescript
import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport } from 'ai'

const transport = new DefaultChatTransport({ api: '/api/chat' })
const { messages, sendMessage, status } = useChat({ transport })
```

## Database

Uses Bun's native SQLite with WAL mode:

```typescript
import { Database } from 'bun:sqlite'
const db = new Database('lightloop.db', { strict: true, create: true })
```

Tables: `users`, `conversations`, `messages`, `agents`

## Environment Variables

```
OPENROUTER_API_KEY=     # Required for AI
CLERK_PUBLISHABLE_KEY=  # Auth
CLERK_SECRET_KEY=       # Auth
```

## Commands

```bash
bun dev          # Start dev server (port 3000)
bun run build    # Production build
bun test         # Run tests
bun test --watch # Watch mode
```
