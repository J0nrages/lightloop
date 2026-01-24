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

interface DbConversation {
  id: number
  user_id: number
  title: string
  created_at: number
  updated_at: number
}

export const Route = createFileRoute('/api/conversations')({
  server: {
    handlers: {
      // GET /api/conversations - list all conversations
      GET: async () => {
        const conversations = db.prepare(`
          SELECT * FROM conversations ORDER BY updated_at DESC
        `).all() as DbConversation[]

        return Response.json({ conversations })
      },
    },
  },
})
