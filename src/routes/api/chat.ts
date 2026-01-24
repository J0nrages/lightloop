import { streamText, convertToModelMessages, type UIMessage } from 'ai'
import { createOpenAI } from '@ai-sdk/openai'
import { createFileRoute } from '@tanstack/react-router'
import { db } from '@/lib/db'

export const Route = createFileRoute('/api/chat')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { messages, conversationId }: { messages: UIMessage[]; conversationId?: number } = await request.json()

        // Get or create conversation
        let activeConversationId = conversationId
        if (!activeConversationId) {
          // Create a new conversation (userId 1 is placeholder - integrate with Clerk later)
          const result = db.prepare(`
            INSERT INTO conversations (user_id, title, created_at, updated_at)
            VALUES (?, ?, ?, ?)
          `).run(1, 'New Chat', Date.now(), Date.now())
          activeConversationId = Number(result.lastInsertRowid)
        }

        // Save the user's message (last message in array)
        const lastUserMessage = messages[messages.length - 1]
        if (lastUserMessage && lastUserMessage.role === 'user') {
          const userContent = lastUserMessage.parts
            .filter((p): p is { type: 'text'; text: string } => p.type === 'text')
            .map(p => p.text)
            .join('')

          db.prepare(`
            INSERT INTO messages (conversation_id, role, content, metadata, created_at)
            VALUES (?, ?, ?, ?, ?)
          `).run(activeConversationId, 'user', userContent, null, Date.now())
        }

        // Configure OpenAI adapter to use OpenRouter
        const openrouter = createOpenAI({
          apiKey: process.env.OPENROUTER_API_KEY,
          baseURL: 'https://openrouter.ai/api/v1',
          headers: {
            'HTTP-Referer': 'https://lightloop.app',
            'X-Title': 'Lightloop',
          },
        })

        const result = streamText({
          model: openrouter('anthropic/claude-3.5-sonnet'),
          messages: await convertToModelMessages(messages),
          onFinish: async ({ text }) => {
            // Save assistant response to database
            db.prepare(`
              INSERT INTO messages (conversation_id, role, content, metadata, created_at)
              VALUES (?, ?, ?, ?, ?)
            `).run(activeConversationId, 'assistant', text, null, Date.now())

            // Update conversation timestamp
            db.prepare(`
              UPDATE conversations SET updated_at = ? WHERE id = ?
            `).run(Date.now(), activeConversationId)
          },
        })

        return result.toUIMessageStreamResponse({
          headers: {
            'X-Conversation-Id': String(activeConversationId),
          },
        })
      },
    },
  },
})
