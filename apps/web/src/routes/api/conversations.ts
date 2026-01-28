import { createFileRoute } from '@tanstack/react-router'
import { db } from '@/lib/db'
import { requireAuthUser } from '@/lib/auth/guards'

interface DbConversation {
  id: number
  user_id: number
  title: string
  scope: string
  org_id: number | null
  project_id: number | null
  created_at: number
  updated_at: number
  last_active_at: number
}

export const Route = createFileRoute('/api/conversations')({
  server: {
    handlers: {
      // GET /api/conversations - list all conversations
      GET: async ({ request }) => {
        const authUser = await requireAuthUser(request)
        const conversations = db.prepare(`
          SELECT c.* FROM conversations c
          WHERE c.user_id = ? AND c.scope IN ('personal', 'org_personal')
          UNION
          SELECT c.* FROM conversations c
          JOIN conversation_participants p ON p.conversation_id = c.id
          WHERE c.scope = 'org_group' AND p.user_id = ?
          ORDER BY updated_at DESC
        `).all(authUser.id, authUser.id) as DbConversation[]

        return Response.json({ conversations })
      },
    },
  },
})
