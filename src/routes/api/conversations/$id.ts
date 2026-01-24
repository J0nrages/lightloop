import { createFileRoute } from '@tanstack/react-router'
import { db } from '@/lib/db'

interface DbMessage {
  id: number
  conversation_id: number
  role: string
  content: string
  metadata: string | null
  created_at: number
}

export const Route = createFileRoute('/api/conversations/$id')({
  server: {
    handlers: {
      // GET /api/conversations/:id - get conversation with messages
      GET: async ({ params }) => {
        const conversationId = parseInt(params.id, 10)

        if (isNaN(conversationId)) {
          return Response.json({ error: 'Invalid conversation ID' }, { status: 400 })
        }

        const messages = db.prepare(`
          SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC
        `).all(conversationId) as DbMessage[]

        // Convert to UI message format
        const uiMessages = messages.map((msg) => ({
          id: String(msg.id),
          role: msg.role as 'user' | 'assistant',
          parts: [{ type: 'text' as const, text: msg.content }],
        }))

        return Response.json({ messages: uiMessages, conversationId })
      },
    },
  },
})
